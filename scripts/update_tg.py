#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import html
import json
import math
import re
import sys
import time
import urllib.parse
import urllib.request
from datetime import date, datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "tg.json"
STATUS = ROOT / "data" / "update-status.json"

SOURCE_URL = "https://www.tundg.at/aktionen/"
MIN_EXPECTED_ACTIONS = 1


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


def fetch_text(url: str, attempts: int = 4):
    headers = {
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "de-AT,de;q=0.9",
        "User-Agent": "Mozilla/5.0 PreisPilot-Osttirol-GitHubAction/1.0",
    }

    last_error = None

    for attempt in range(attempts):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=90) as response:
                raw = response.read()
                charset = response.headers.get_content_charset() or "utf-8"
                return raw.decode(charset, errors="replace")
        except Exception as exc:
            last_error = exc
            if attempt + 1 < attempts:
                time.sleep(2 ** attempt)

    raise RuntimeError(f"T&G-Aktionsseite nicht abrufbar: {last_error}")


class VisibleTextParser(HTMLParser):
    SKIP_TAGS = {"script", "style", "noscript", "svg"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.skip_depth = 0
        self.lines = []

    def handle_starttag(self, tag, attrs):
        if tag.lower() in self.SKIP_TAGS:
            self.skip_depth += 1

    def handle_endtag(self, tag):
        if tag.lower() in self.SKIP_TAGS and self.skip_depth:
            self.skip_depth -= 1

    def handle_data(self, data):
        if self.skip_depth:
            return

        text = " ".join(html.unescape(str(data or "")).split())
        if text:
            self.lines.append(text)


def visible_lines(source):
    parser = VisibleTextParser()
    parser.feed(source)

    result = []
    for line in parser.lines:
        line = " ".join(line.split()).strip()
        if not line:
            continue
        if result and result[-1] == line:
            continue
        result.append(line)

    return result


def stable_id(name, description):
    material = f"{name}|{description}".casefold()
    return "tg-" + hashlib.sha256(material.encode("utf-8")).hexdigest()[:20]


def resolve_period(text, today=None):
    today = today or date.today()

    m = re.search(
        r"(\d{1,2})\.(\d{1,2})\.\s*(?:bis|[-–—])\s*"
        r"(?:Mo|Di|Mi|Do|Fr|Sa|So)?\s*(\d{1,2})\.(\d{1,2})\.(\d{4})?",
        text,
        flags=re.I,
    )
    if not m:
        return None, None

    d1, m1, d2, m2 = map(int, m.group(1, 2, 3, 4))
    explicit_year = int(m.group(5)) if m.group(5) else None

    end_year = explicit_year or today.year
    start_year = end_year - 1 if m1 > m2 else end_year

    start = date(start_year, m1, d1)
    end = date(end_year, m2, d2)

    if explicit_year is None:
        candidates = []
        for shift in (-1, 0, 1):
            ey = today.year + shift
            sy = ey - 1 if m1 > m2 else ey
            try:
                s = date(sy, m1, d1)
                e = date(ey, m2, d2)
            except ValueError:
                continue
            distance = min(abs((today - s).days), abs((today - e).days))
            candidates.append((distance, s, e))
        if candidates:
            _, start, end = min(candidates, key=lambda x: x[0])

    return start.isoformat(), end.isoformat()


PRICE_RX = re.compile(r"^\d{1,4}(?:[.,]\d{2})$")
PERCENT_ONLY_RX = re.compile(r"^-\s*(\d{1,2})\s*%\s+auf\s+(.+)$", re.I)


def parse_amount(description):
    text = str(description or "")

    pack = re.search(
        r"(\d+)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(kg|g|l|ml)\b",
        text,
        flags=re.I,
    )
    if pack:
        count = int(pack.group(1))
        each = float(pack.group(2).replace(",", "."))
        unit = pack.group(3).lower()
        amount = count * each
        return int(amount) if float(amount).is_integer() else round(amount, 3), unit

    simple = re.search(
        r"(\d+(?:[.,]\d+)?)\s*(kg|g|l|ml)\b",
        text,
        flags=re.I,
    )
    if simple:
        amount = float(simple.group(1).replace(",", "."))
        unit = simple.group(2).lower()
        return int(amount) if float(amount).is_integer() else round(amount, 3), unit

    if re.search(r"\bper\s+kg\b", text, flags=re.I):
        return 1, "kg"

    if re.search(r"\bper\s+stück\b|\bstk\.?\b", text, flags=re.I):
        return 1, "Stk"

    return 1, "Stk"


def parse_unit_price(text):
    raw = str(text or "").strip()
    values = [float(x.replace(",", ".")) for x in re.findall(r"\d+(?:[.,]\d+)?", raw)]

    unit = None
    unit_match = re.search(r"€\s*/\s*([^\s]+)", raw)
    if unit_match:
        unit = unit_match.group(1)

    if not values:
        return None, unit, raw

    if len(values) > 1 and re.search(r"[-–—]", raw):
        return None, unit, raw

    return round(values[0], 2), unit, raw


def cleanup_product_tokens(tokens):
    return [t for t in tokens if t.casefold() != "image" and not t.casefold().startswith("image ")]


def parse_special_actions(lines):
    try:
        start_idx = next(i for i, line in enumerate(lines) if line.casefold() == "spezialaktionen")
    except StopIteration:
        raise RuntimeError("Abschnitt 'Spezialaktionen' wurde auf tundg.at nicht gefunden.")

    end_idx = len(lines)
    for i in range(start_idx + 1, len(lines)):
        folded = lines[i].casefold()
        if "die besten deals im abo" in folded or folded == "t&g flugblatt":
            end_idx = i
            break

    block = cleanup_product_tokens(lines[start_idx + 1:end_idx])

    valid_from = None
    valid_until = None
    period_idx = None

    for i, line in enumerate(block[:10]):
        vf, vu = resolve_period(line)
        if vf and vu:
            valid_from, valid_until = vf, vu
            period_idx = i
            break

    if period_idx is not None:
        block = block[period_idx + 1:]

    actions = []
    consumed = set()

    for i in range(len(block) - 2):
        if not PRICE_RX.fullmatch(block[i]):
            continue
        if not PRICE_RX.fullmatch(block[i + 1]):
            continue
        if "€" not in block[i + 2] or "/" not in block[i + 2]:
            continue

        j = i - 1
        while j >= 0:
            if j in consumed:
                break
            if PRICE_RX.fullmatch(block[j]):
                break
            if PERCENT_ONLY_RX.fullmatch(block[j]):
                break
            j -= 1

        card_tokens = block[j + 1:i]
        if not card_tokens:
            continue

        name = card_tokens[0].strip()
        description = " · ".join(t.strip() for t in card_tokens[1:] if t.strip())

        regular_price = number(block[i])
        sale_price = number(block[i + 1])
        unit_price, unit_price_unit, unit_price_text = parse_unit_price(block[i + 2])

        amount, unit = parse_amount(description)

        discount_percent = None
        if regular_price and sale_price is not None and sale_price < regular_price:
            discount_percent = round((1 - sale_price / regular_price) * 100)

        product_id = stable_id(name, description)

        actions.append({
            "store": "tg",
            "remoteObjectId": product_id,
            "retailerProductId": product_id,
            "sourceKind": "special",
            "kind": "product",
            "optimizerEligible": True,
            "name": name,
            "description": description,
            "amountText": description or None,
            "amount": amount,
            "unit": unit,
            "currentPrice": round(sale_price, 2) if sale_price is not None else None,
            "regularPrice": round(regular_price, 2) if regular_price is not None else None,
            "salePrice": round(sale_price, 2) if sale_price is not None else None,
            "unitPrice": unit_price,
            "unitPriceUnit": unit_price_unit,
            "unitPriceText": unit_price_text or None,
            "validFrom": valid_from,
            "validUntil": valid_until,
            "promotionVerified": True,
            "promotion": {
                "type": "price_drop",
                "label": "Spezialaktion",
                "verified": True,
                "source": "tundg.at",
                **({"discountPercent": discount_percent} if discount_percent is not None else {}),
            },
            "source": "tundg.at Spezialaktionen",
            "sourceUrl": SOURCE_URL,
        })

        for k in range(j + 1, i + 3):
            consumed.add(k)

    for i, line in enumerate(block):
        if i in consumed:
            continue

        m = PERCENT_ONLY_RX.fullmatch(line)
        if not m:
            continue

        pct = int(m.group(1))
        category = m.group(2).strip()
        product_id = stable_id(line, "category-action")

        actions.append({
            "store": "tg",
            "remoteObjectId": product_id,
            "retailerProductId": product_id,
            "sourceKind": "special",
            "kind": "category",
            "optimizerEligible": False,
            "name": category,
            "description": line,
            "amountText": None,
            "amount": 1,
            "unit": "Stk",
            "currentPrice": None,
            "regularPrice": None,
            "salePrice": None,
            "unitPrice": None,
            "unitPriceUnit": None,
            "unitPriceText": None,
            "validFrom": valid_from,
            "validUntil": valid_until,
            "promotionVerified": True,
            "promotion": {
                "type": "percentage",
                "label": f"-{pct} % auf {category}",
                "discountPercent": pct,
                "verified": True,
                "source": "tundg.at",
            },
            "source": "tundg.at Spezialaktionen",
            "sourceUrl": SOURCE_URL,
        })

    unique = []
    seen = set()
    for item in actions:
        key = item["retailerProductId"]
        if key in seen:
            continue
        seen.add(key)
        unique.append(item)

    return unique, valid_from, valid_until


def extract_flyer_metadata(source, lines):
    flyer_url = None

    hrefs = re.findall(r'href\s*=\s*["\']([^"\']+)["\']', source, flags=re.I)
    for href in hrefs:
        decoded = html.unescape(href)
        if "/flugblatt/tundg/osttirol/" in decoded.casefold():
            flyer_url = urllib.parse.urljoin(SOURCE_URL, decoded)
            break

    period_text = None
    current_period_start = None
    current_period_end = None

    for line in lines:
        m = re.search(
            r"Aktuelle\s+Ausgabe\s+(.+?)(?:\s+Kommende\s+Ausgabe|$)",
            line,
            flags=re.I,
        )
        if m:
            period_text = m.group(1).strip()
            current_period_start, current_period_end = resolve_period(period_text)
            break

    return {
        "region": "Osttirol",
        "url": flyer_url,
        "periodText": period_text,
        "validFrom": current_period_start,
        "validUntil": current_period_end,
    }


def load_existing():
    if not OUT.exists():
        return None
    try:
        payload = json.loads(OUT.read_text(encoding="utf-8"))
        return payload if isinstance(payload, dict) else None
    except Exception:
        return None


def merge_history(item, previous):
    history = []
    seen = set()

    if isinstance(previous, dict):
        for entry in previous.get("history") or []:
            if not isinstance(entry, dict):
                continue
            d = str(entry.get("date") or "")
            p = number(entry.get("price"))
            if d and p is not None and (d, round(p, 2)) not in seen:
                history.append({"date": d, "price": round(p, 2)})
                seen.add((d, round(p, 2)))

    if item.get("salePrice") is not None:
        d = date.today().isoformat()
        p = round(float(item["salePrice"]), 2)
        if (d, p) not in seen:
            history.append({"date": d, "price": p})

    history.sort(key=lambda x: x["date"])
    item["history"] = history[-250:]


def load_status():
    try:
        payload = json.loads(STATUS.read_text(encoding="utf-8"))
        if isinstance(payload, dict):
            return payload
    except Exception:
        pass
    return {"schemaVersion": 1, "updatedAt": None, "stores": {}}


def write_status(state, updated_at, product_count, action_count, error=None, stale=False):
    payload = load_status()
    payload["schemaVersion"] = 1
    payload["updatedAt"] = updated_at
    payload.setdefault("stores", {})
    payload["stores"]["tg"] = {
        "status": state,
        "productCount": product_count,
        "promotionCount": action_count,
        "stale": bool(stale),
        "error": error,
        "provider": "tundg.at",
        "scope": "Spezialaktionen + Osttirol-Flugblatt",
    }

    STATUS.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    updated_at = now_iso()
    previous_payload = load_existing()

    try:
        source = fetch_text(SOURCE_URL)
        lines = visible_lines(source)

        actions, valid_from, valid_until = parse_special_actions(lines)
        flyer = extract_flyer_metadata(source, lines)

        if len(actions) < MIN_EXPECTED_ACTIONS:
            raise RuntimeError(
                f"Unplausibel wenige T&G-Aktionen ({len(actions)}). "
                "Vorhandene Daten werden nicht überschrieben."
            )

        previous_map = {}
        if isinstance(previous_payload, dict):
            for item in previous_payload.get("products") or []:
                if isinstance(item, dict) and item.get("retailerProductId"):
                    previous_map[str(item["retailerProductId"])] = item

        for item in actions:
            merge_history(
                item,
                previous_map.get(str(item.get("retailerProductId")))
            )

        preserved_flyer = []
        if isinstance(previous_payload, dict):
            preserved_flyer = [
                item for item in (previous_payload.get("products") or [])
                if isinstance(item, dict) and item.get("sourceKind") == "flyer"
            ]

        combined_products = actions + preserved_flyer

        priced_count = sum(
            1 for x in combined_products
            if x.get("salePrice") is not None or x.get("displayPrice") is not None
        )

        payload = {
            "schemaVersion": 1,
            "importerVersion": 1,
            "store": "tg",
            "scope": "T&G Spezialaktionen; kein vollständiger Sortimentskatalog",
            "region": "Osttirol",
            "provider": "tundg.at",
            "providerUrl": SOURCE_URL,
            "updatedAt": updated_at,
            "productCount": priced_count,
            "promotionCount": len(combined_products),
            "validFrom": valid_from,
            "validUntil": valid_until,
            "flyer": flyer,
            "products": combined_products,
        }

        if isinstance(previous_payload, dict):
            for key in (
                "linkableCount",
                "flyerProductCount",
                "flyerLinkableCount",
                "flyerUpdatedAt",
                "flyerStale",
                "flyerLastError",
            ):
                if key in previous_payload:
                    payload[key] = previous_payload[key]

            previous_flyer_meta = previous_payload.get("flyer") or {}
            if isinstance(previous_flyer_meta, dict):
                for key in ("pdfUrl", "pageCount"):
                    if key in previous_flyer_meta:
                        payload["flyer"][key] = previous_flyer_meta[key]

        temp = OUT.with_suffix(".json.tmp")
        temp.write_text(
            json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n",
            encoding="utf-8",
        )
        temp.replace(OUT)

        write_status("ok", updated_at, priced_count, len(actions))

        print(
            f"T&G: {len(actions)} Spezialaktionen erkannt; "
            f"davon {priced_count} mit konkretem Aktionspreis."
        )
        print(f"T&G Gültigkeit: {valid_from or '—'} bis {valid_until or '—'}")
        print(f"T&G Osttirol-Flugblatt: {flyer.get('url') or 'Link nicht erkannt'}")
        return 0

    except Exception as exc:
        existing_count = 0
        existing_actions = 0

        if isinstance(previous_payload, dict):
            existing_count = int(previous_payload.get("productCount") or 0)
            existing_actions = int(previous_payload.get("promotionCount") or 0)

        if existing_actions >= MIN_EXPECTED_ACTIONS:
            write_status(
                "stale",
                updated_at,
                existing_count,
                existing_actions,
                error=str(exc),
                stale=True,
            )
            print(
                f"WARNUNG: T&G konnte nicht aktualisiert werden. "
                f"Vorhandene {existing_actions} Aktionen bleiben aktiv. Fehler: {exc}",
                file=sys.stderr,
            )
            return 0

        write_status(
            "error",
            updated_at,
            existing_count,
            existing_actions,
            error=str(exc),
            stale=False,
        )
        print(f"FEHLER: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
