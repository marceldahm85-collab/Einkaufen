#!/usr/bin/env python3
from __future__ import annotations

import collections
import json
import math
import re
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "spar-promotion-diagnostics.json"

SEARCH_URL = "https://search-spar.spar-ics.com/fact-finder/rest/v4/search/products_lmos_at"
PAGE_SIZE = 5000
MAX_PAGES = 20

RELEVANT_FIELD_RX = re.compile(
    r"(promo|badge|offer|aktion|action|discount|price|best|campaign|save|joker|special)",
    re.I,
)


def now_iso():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def number(value):
    try:
        if value is None or value == "":
            return None
        n = float(str(value).replace("€", "").replace(",", ".").strip())
        return n if math.isfinite(n) else None
    except (TypeError, ValueError):
        return None


def fetch_json(params, attempts=4):
    query = urllib.parse.urlencode(params, doseq=True)
    url = f"{SEARCH_URL}?{query}"

    headers = {
        "Accept": "application/json",
        "Accept-Language": "de-AT,de;q=0.9",
        "User-Agent": "Mozilla/5.0 PreisPilot-Osttirol-GitHubAction/1.0",
        "Referer": "https://www.spar.at/produktwelt/",
    }

    last_error = None

    for attempt in range(attempts):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=90) as response:
                return json.load(response)
        except Exception as exc:
            last_error = exc
            if attempt + 1 < attempts:
                time.sleep(2 ** attempt)

    raise RuntimeError(f"SPAR FactFinder-Abruf fehlgeschlagen: {last_error}")


def extract_hits(response):
    hits = response.get("hits") if isinstance(response, dict) else None
    if isinstance(hits, dict):
        nested = hits.get("hits")
        return nested if isinstance(nested, list) else []
    return hits if isinstance(hits, list) else []


def fetch_all():
    all_hits = []
    first_response = None
    seen = set()

    for page in range(1, MAX_PAGES + 1):
        response = fetch_json({
            "query": "*",
            "q": "*",
            "page": page,
            "hitsPerPage": PAGE_SIZE,
            "showPermutedSearchParams": "true",
        })

        if first_response is None:
            first_response = response

        hits = extract_hits(response)
        if not hits:
            break

        fresh = 0
        for hit in hits:
            if not isinstance(hit, dict):
                continue
            values = hit.get("masterValues") or {}
            key = str(
                values.get("product-number")
                or hit.get("id")
                or json.dumps(values, sort_keys=True, ensure_ascii=False)[:500]
            )
            if key in seen:
                continue
            seen.add(key)
            all_hits.append(hit)
            fresh += 1

        print(f"SPAR Diagnose Seite {page}: {len(hits)} Treffer, {fresh} neu")

        paging = response.get("paging") if isinstance(response, dict) else None
        if isinstance(paging, dict):
            try:
                page_count = int(paging.get("pageCount") or 0)
            except (TypeError, ValueError):
                page_count = 0
            if page_count and page >= page_count:
                break

        if len(hits) < PAGE_SIZE:
            break

    return all_hits, first_response or {}


def value_key(value):
    if isinstance(value, list):
        return " | ".join(str(v) for v in value)
    if isinstance(value, dict):
        return json.dumps(value, sort_keys=True, ensure_ascii=False)
    return str(value)


def top_values(counter, limit=30):
    return [
        {"value": value, "count": count}
        for value, count in counter.most_common(limit)
    ]


def sample_product(hit):
    values = hit.get("masterValues") or {}
    return {
        "productNumber": values.get("product-number"),
        "title": values.get("title"),
        "name": values.get("name"),
        "price": values.get("price"),
        "regularPrice": values.get("regular-price"),
        "bestPrice": values.get("best-price"),
        "isOnPromotion": values.get("is-on-promotion"),
        "badgeShortName": values.get("badge-short-name"),
        "badgeNames": values.get("badge-names"),
        "badgeIcon": values.get("badge-icon"),
        "url": values.get("url"),
    }


def analyze_facets(response):
    facets = response.get("facets") if isinstance(response, dict) else None
    if not isinstance(facets, list):
        return []

    result = []
    for facet in facets:
        if not isinstance(facet, dict):
            continue

        name = str(facet.get("name") or "")
        associated = str(facet.get("associatedFieldName") or "")
        if not (
            RELEVANT_FIELD_RX.search(name)
            or RELEVANT_FIELD_RX.search(associated)
            or "angebot" in name.casefold()
        ):
            continue

        elements = []
        for element in facet.get("elements") or []:
            if not isinstance(element, dict):
                continue
            elements.append({
                "text": element.get("text"),
                "totalHits": element.get("totalHits"),
                "selected": element.get("selected"),
                "searchParams": element.get("searchParams"),
            })

        result.append({
            "name": name,
            "associatedFieldName": associated,
            "type": facet.get("type"),
            "selectionType": facet.get("selectionType"),
            "elements": elements[:100],
        })

    return result


def main():
    hits, first_response = fetch_all()

    key_counts = collections.Counter()
    relevant_values = collections.defaultdict(collections.Counter)
    relevant_samples = collections.defaultdict(list)

    relation_counts = collections.Counter()
    combo_counts = collections.Counter()
    combo_samples = collections.defaultdict(list)

    promo_true = 0
    promo_false = 0

    for hit in hits:
        values = hit.get("masterValues") or {}
        if not isinstance(values, dict):
            continue

        for key, value in values.items():
            key_counts[key] += 1
            if RELEVANT_FIELD_RX.search(str(key)):
                relevant_values[key][value_key(value)] += 1
                if len(relevant_samples[key]) < 8:
                    relevant_samples[key].append(sample_product(hit))

        is_promo = str(values.get("is-on-promotion") or "").strip().casefold()
        if is_promo in {"1", "true", "yes", "ja", "on"}:
            promo_true += 1
        else:
            promo_false += 1

        price = number(values.get("price"))
        regular = number(values.get("regular-price"))
        best = number(values.get("best-price"))

        if price is None:
            relation_counts["price_missing"] += 1
        elif regular is None:
            relation_counts["regular_missing"] += 1
        elif price < regular:
            relation_counts["price_lt_regular"] += 1
        elif price == regular:
            relation_counts["price_eq_regular"] += 1
        else:
            relation_counts["price_gt_regular"] += 1

        if best is None:
            relation_counts["best_missing"] += 1
        elif price is not None and best < price:
            relation_counts["best_lt_price"] += 1
        elif price is not None and best == price:
            relation_counts["best_eq_price"] += 1
        elif price is not None:
            relation_counts["best_gt_price"] += 1

        combo = (
            value_key(values.get("is-on-promotion")),
            value_key(values.get("badge-short-name")),
            value_key(values.get("badge-names")),
            value_key(values.get("badge-icon")),
        )
        combo_counts[combo] += 1
        if len(combo_samples[combo]) < 4:
            combo_samples[combo].append(sample_product(hit))

    relevant_fields = {}
    for key in sorted(relevant_values, key=str.casefold):
        relevant_fields[key] = {
            "presentOn": key_counts[key],
            "topValues": top_values(relevant_values[key], 40),
            "samples": relevant_samples[key],
        }

    top_combinations = []
    for combo, count in combo_counts.most_common(60):
        top_combinations.append({
            "count": count,
            "isOnPromotion": combo[0],
            "badgeShortName": combo[1],
            "badgeNames": combo[2],
            "badgeIcon": combo[3],
            "samples": combo_samples[combo],
        })

    diagnostics = {
        "generatedAt": now_iso(),
        "totalHits": len(hits),
        "isOnPromotion": {
            "truthyCount": promo_true,
            "otherCount": promo_false,
        },
        "priceRelations": dict(relation_counts),
        "relevantFields": relevant_fields,
        "facets": analyze_facets(first_response),
        "topPromotionFieldCombinations": top_combinations,
    }

    OUT.write_text(
        json.dumps(diagnostics, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print()
    print("=== SPAR AKTIONS-DIAGNOSE ===")
    print(f"Gesamtprodukte: {len(hits)}")
    print(f"is-on-promotion = wahr: {promo_true}")
    print(f"sonstige Werte: {promo_false}")

    print("\nPreisbeziehungen:")
    for key, count in relation_counts.most_common():
        print(f"  {key}: {count}")

    print("\nRelevante Felder und häufigste Werte:")
    for key in sorted(relevant_fields, key=str.casefold):
        values = relevant_fields[key]["topValues"][:12]
        rendered = " | ".join(
            f"{entry['value']!r}: {entry['count']}"
            for entry in values
        )
        print(f"  {key} ({key_counts[key]} Produkte): {rendered}")

    facets = diagnostics["facets"]
    print("\nRelevante Facetten:")
    if not facets:
        print("  keine passende FactFinder-Facette geliefert")
    else:
        for facet in facets:
            values = " | ".join(
                f"{e.get('text')!r}: {e.get('totalHits')}"
                for e in facet.get("elements", [])[:20]
            )
            print(
                f"  {facet.get('name')!r} / {facet.get('associatedFieldName')!r}: "
                f"{values}"
            )

    print("\nHäufigste Kombinationen aus Promotion/Badge-Feldern:")
    for row in top_combinations[:25]:
        print(
            "  "
            f"{row['count']:>5}x | promo={row['isOnPromotion']!r} | "
            f"short={row['badgeShortName']!r} | "
            f"names={row['badgeNames']!r} | icon={row['badgeIcon']!r}"
        )

    print()
    print(f"Diagnosedatei geschrieben: {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
