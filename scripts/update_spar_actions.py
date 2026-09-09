#!/usr/bin/env python3
from __future__ import annotations

import json
import math
import re
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "spar.json"
STATUS_PATH = ROOT / "data" / "update-status.json"

SEARCH_URL = "https://search-spar.spar-ics.com/fact-finder/rest/v4/search/products_lmos_at"
PAGE_SIZE = 5000
MAX_PAGES = 20
MIN_PROMOTIONS_FOR_SUCCESS = 5


def now_iso():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def today_iso():
    return datetime.now(timezone.utc).date().isoformat()


def number(value):
    try:
        if value is None or value == "":
            return None
        n = float(str(value).replace("€", "").replace(",", ".").strip())
        return n if math.isfinite(n) else None
    except (TypeError, ValueError):
        return None


def truthy(value):
    if value is True:
        return True
    text = str(value or "").strip().casefold()
    return text in {"1", "true", "yes", "ja", "y", "on"}


def fetch_json(url, params, attempts=4):
    query = urllib.parse.urlencode(params, doseq=True)
    full_url = f"{url}?{query}"

    headers = {
        "Accept": "application/json",
        "Accept-Language": "de-AT,de;q=0.9",
        "User-Agent": "Mozilla/5.0 PreisPilot-Osttirol-GitHubAction/1.0",
        "Referer": "https://www.spar.at/produktwelt/",
    }

    last_error = None
    for attempt in range(attempts):
        try:
            req = urllib.request.Request(full_url, headers=headers)
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
        inner = hits.get("hits")
        return inner if isinstance(inner, list) else []
    return hits if isinstance(hits, list) else []


def fetch_all_hits():
    result = []
    seen_hit_ids = set()

    for page in range(1, MAX_PAGES + 1):
        response = fetch_json(
            SEARCH_URL,
            {
                "query": "*",
                "q": "*",
                "page": page,
                "hitsPerPage": PAGE_SIZE,
                "showPermutedSearchParams": "true",
            },
        )

        hits = extract_hits(response)
        if not hits:
            break

        new_count = 0
        for hit in hits:
            if not isinstance(hit, dict):
                continue
            hit_id = str(hit.get("id") or "")
            values = hit.get("masterValues") or {}
            product_no = str(values.get("product-number") or "")
            key = hit_id or product_no
            if not key:
                key = json.dumps(values, sort_keys=True, ensure_ascii=False)[:500]
            if key in seen_hit_ids:
                continue
            seen_hit_ids.add(key)
            result.append(hit)
            new_count += 1

        print(f"SPAR FactFinder Seite {page}: {len(hits)} Treffer, {new_count} neu")

        paging = response.get("paging") if isinstance(response, dict) else None
        page_count = None
        if isinstance(paging, dict):
            try:
                page_count = int(paging.get("pageCount") or 0)
            except (TypeError, ValueError):
                page_count = None
        if page_count and page >= page_count:
            break
        if len(hits) < PAGE_SIZE:
            break

    return result


def structured_promotion_text(values):
    """Use only semantic promotion fields proven by the live diagnosis."""
    for key in ("promotion-most-likely-text", "promotion-text"):
        value = values.get(key)
        if isinstance(value, list):
            parts = [str(v).strip() for v in value if str(v).strip()]
            if parts:
                return " · ".join(parts)
        elif value not in (None, ""):
            text = str(value).strip()
            if text:
                return text
    return ""


def parse_structured_promotion(text, sale_price, regular_price):
    folded = str(text or "").casefold()
    promotion = {
        "type": "price_drop",
        "verified": True,
        "source": "spar.at / FactFinder",
        "loyaltyRequired": False,
    }

    bundle = re.search(r"\b(\d+)\s*\+\s*(\d+)\s*(?:gratis|free)\b", folded)
    quantity = re.search(
        r"\b(?:mengenvorteil\s+)?(?:ab|bei)\s+(\d+)\s*(?:stk\.?|stück)\b",
        folded,
    )
    percent = re.search(r"-(\d{1,2})\s*%", folded)

    if bundle:
        paid = int(bundle.group(1))
        free = int(bundle.group(2))
        promotion.update({
            "type": "bundle",
            "paidQuantity": paid,
            "freeQuantity": free,
            "requiredQuantity": paid + free,
            "label": f"{paid}+{free} gratis",
        })
    elif quantity:
        required = int(quantity.group(1))
        promotion.update({
            "type": "quantity",
            "requiredQuantity": required,
            "label": f"ab {required} Stück",
        })
    elif "monatssparer" in folded:
        promotion.update({"type": "monthly", "label": "Monatssparer"})
    elif percent:
        pct = int(percent.group(1))
        promotion.update({
            "type": "percentage",
            "discountPercent": pct,
            "label": f"-{pct} %",
        })
    else:
        promotion["label"] = str(text or "Aktion").strip() or "Aktion"

    if regular_price and regular_price > 0 and sale_price is not None and sale_price < regular_price:
        calculated = round((1 - sale_price / regular_price) * 100)
        promotion.setdefault("discountPercent", calculated)

    if text:
        promotion["officialLabel"] = str(text).strip()
    return promotion


def generic_promotion(sale_price, regular_price):
    """Never infer 1+1 or another semantic action from a calculated percentage."""
    promotion = {
        "type": "price_drop",
        "verified": True,
        "source": "spar.at / FactFinder",
        "loyaltyRequired": False,
        "label": "Aktion",
    }
    if regular_price and regular_price > 0 and sale_price is not None and sale_price < regular_price:
        promotion["discountPercent"] = round((1 - sale_price / regular_price) * 100)
    return promotion


def normalize_product_url(value):
    text = str(value or "").strip()
    if not text:
        return None
    if text.startswith("//"):
        return "https:" + text
    if text.startswith("/"):
        return "https://www.spar.at" + text
    if text.startswith("http://") or text.startswith("https://"):
        return text
    return "https://www.spar.at/" + text.lstrip("/")


def extract_action(hit):
    if not isinstance(hit, dict):
        return None
    values = hit.get("masterValues")
    if not isinstance(values, dict):
        return None

    # Live diagnosis: this is the reliable current-offer selector.
    if not truthy(values.get("is-on-promotion")):
        return None

    product_id = str(values.get("product-number") or "").strip()
    if not product_id:
        return None

    price = number(values.get("price"))
    regular_price = number(values.get("regular-price"))
    actual_price = number(values.get("actual-price"))
    if price is None and actual_price is None:
        return None

    sale_price = price if price is not None else actual_price
    if regular_price is None:
        regular_price = sale_price

    text = structured_promotion_text(values)
    promotion = (
        parse_structured_promotion(text, sale_price, regular_price)
        if text else generic_promotion(sale_price, regular_price)
    )

    return {
        "productId": product_id,
        "salePrice": round(sale_price, 2),
        "regularPrice": round(regular_price, 2),
        "promotion": promotion,
        "productUrl": normalize_product_url(values.get("url")),
        "structuredPromotionText": text or None,
    }


def update_unit_price(product):
    price = number(product.get("salePrice") if product.get("salePrice") is not None else product.get("currentPrice"))
    amount = number(product.get("amount"))
    unit = product.get("unit")
    if price is None or amount is None or amount <= 0:
        return
    if unit == "g":
        product["unitPrice"] = round(price / (amount / 1000), 2)
        product["unitPriceUnit"] = "kg"
    elif unit == "kg":
        product["unitPrice"] = round(price / amount, 2)
        product["unitPriceUnit"] = "kg"
    elif unit == "ml":
        product["unitPrice"] = round(price / (amount / 1000), 2)
        product["unitPriceUnit"] = "l"
    elif unit == "l":
        product["unitPrice"] = round(price / amount, 2)
        product["unitPriceUnit"] = "l"
    elif unit == "Stk":
        product["unitPrice"] = round(price / amount, 2)
        product["unitPriceUnit"] = "Stk"


def merge_history_today(product, price):
    if price is None:
        return
    history = product.get("history")
    if not isinstance(history, list):
        history = []
    date = today_iso()
    cleaned = []
    seen_dates = set()
    for entry in history:
        if not isinstance(entry, dict):
            continue
        d = str(entry.get("date") or "")
        p = number(entry.get("price"))
        if not d or p is None or d in seen_dates:
            continue
        cleaned.append({"date": d, "price": round(p, 2)})
        seen_dates.add(d)
    cleaned.sort(key=lambda x: x["date"])
    if cleaned and cleaned[-1]["date"] == date:
        cleaned[-1]["price"] = round(price, 2)
    elif not cleaned or cleaned[-1]["price"] != round(price, 2):
        cleaned.append({"date": date, "price": round(price, 2)})
    product["history"] = cleaned[-250:]


def load_status():
    try:
        payload = json.loads(STATUS_PATH.read_text(encoding="utf-8"))
        if isinstance(payload, dict):
            return payload
    except Exception:
        pass
    return {"schemaVersion": 1, "updatedAt": None, "stores": {}}


def set_promo_status(state, count=0, error=None, scanned=0, breakdown=None):
    status = load_status()
    status.setdefault("stores", {}).setdefault("spar", {})
    status["stores"]["spar"]["promotions"] = {
        "status": state,
        "verifiedCount": count,
        "rawProductsScanned": scanned,
        "updatedAt": now_iso(),
        "error": error,
        "source": "spar.at / FactFinder",
        "breakdown": breakdown or {},
    }
    STATUS_PATH.write_text(json.dumps(status, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def promotion_breakdown(actions):
    result = {}
    for action in actions.values():
        label = str((action.get("promotion") or {}).get("label") or "Unbekannt")
        result[label] = result.get(label, 0) + 1
    return dict(sorted(result.items(), key=lambda item: (-item[1], item[0].casefold())))


def main():
    if not DATA_PATH.exists():
        print("WARNUNG: data/spar.json fehlt; Aktionsimport übersprungen.", file=sys.stderr)
        set_promo_status("error", error="data/spar.json fehlt")
        return 0

    payload = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    products = payload.get("products") or []
    if not products:
        print("WARNUNG: Keine SPAR-Produkte; Aktionsimport übersprungen.", file=sys.stderr)
        set_promo_status("error", error="Keine SPAR-Produkte")
        return 0

    product_map = {}
    for product in products:
        for key in (product.get("retailerProductId"), product.get("remoteObjectId")):
            if key:
                product_map[str(key)] = product

    try:
        raw_hits = fetch_all_hits()
        actions = {}
        for hit in raw_hits:
            action = extract_action(hit)
            if action:
                actions[action["productId"]] = action

        matched = {pid: action for pid, action in actions.items() if pid in product_map}
        if len(matched) < MIN_PROMOTIONS_FOR_SUCCESS:
            raise RuntimeError(
                f"Zu wenige eindeutig zuordenbare SPAR-Aktionen ({len(matched)}). "
                "Vorhandene Aktionsdaten bleiben erhalten."
            )

        breakdown = promotion_breakdown(matched)
        structured_count = sum(1 for action in matched.values() if action.get("structuredPromotionText"))

        print("SPAR Aktionsarten: " + " | ".join(f"{label}: {count}" for label, count in breakdown.items()))
        print(
            f"SPAR: {structured_count} Aktionen mit strukturierter Bedingung; "
            f"{len(matched) - structured_count} weitere sicher als Aktion erkannt, "
            "aber ohne erfundene Aktionsart."
        )

        verified = 0
        for product in products:
            product_id = str(product.get("retailerProductId") or product.get("remoteObjectId") or "")
            action = matched.get(product_id)

            product.pop("regularPrice", None)
            product.pop("salePrice", None)
            product.pop("promotion", None)
            product.pop("promotionVerified", None)
            product.pop("promotionObservedAt", None)
            product.pop("productUrl", None)

            if not action:
                product["regularPrice"] = product.get("currentPrice")
                product["salePrice"] = None
                continue

            sale = action["salePrice"]
            regular = action["regularPrice"]
            product["currentPrice"] = sale
            product["regularPrice"] = regular
            product["salePrice"] = sale
            product["promotion"] = action["promotion"]
            product["promotionVerified"] = True
            product["promotionObservedAt"] = now_iso()
            if action.get("productUrl"):
                product["productUrl"] = action["productUrl"]
            update_unit_price(product)
            merge_history_today(product, sale)
            verified += 1

        payload["promotionCount"] = verified
        payload["promotionUpdatedAt"] = now_iso()
        payload["promotionSource"] = "spar.at / FactFinder"
        payload["promotionBreakdown"] = breakdown
        payload["promotionStructuredCount"] = structured_count
        payload["promotionStale"] = False
        payload.pop("promotionLastError", None)
        payload.pop("promotionDetailEnrichedCount", None)

        temp = DATA_PATH.with_suffix(".json.tmp")
        temp.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
        temp.replace(DATA_PATH)

        set_promo_status("ok", count=verified, scanned=len(raw_hits), breakdown=breakdown)
        print(f"SPAR: {verified} aktuelle Aktionen verifiziert ({len(raw_hits)} Produkte geprüft).")
        return 0

    except Exception as exc:
        preserved = sum(
            1 for product in products
            if isinstance(product, dict) and product.get("promotionVerified") is True
        )
        payload["promotionCount"] = preserved
        payload["promotionStale"] = True
        payload["promotionLastError"] = str(exc)

        temp = DATA_PATH.with_suffix(".json.tmp")
        temp.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
        temp.replace(DATA_PATH)

        set_promo_status(
            "stale",
            count=preserved,
            error=str(exc),
            scanned=0,
            breakdown=payload.get("promotionBreakdown") or {},
        )
        print(
            f"WARNUNG: SPAR-Aktionen konnten nicht aktualisiert werden. "
            f"{preserved} zuletzt verifizierte Aktionen bleiben erhalten. Fehler: {exc}",
            file=sys.stderr,
        )
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
