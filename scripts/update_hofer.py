#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import html
import json
import math
import re
import sys
import time
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "hofer.json"
STATUS = ROOT / "data" / "update-status.json"

BASE_URL = "https://www.hofer.at/produkte"
MAX_PAGES = 20
MIN_EXPECTED_PRODUCTS = 1000
FETCH_TIMEOUT = 90
USER_AGENT = "Mozilla/5.0 PreisPilot-Osttirol-GitHubAction/1.0"

EURO_RE = re.compile(r"€\s*(\d{1,4}(?:[,.]\d{2}))")
STRIKE_RE = re.compile(r"~~(.*?)~~")
AVAILABLE_RE = re.compile(r"\bVerfügbar\s+(?:seit|ab)\s+(\d{2}\.\d{2}\.\d{4})\b", re.I)
ONLINE_RE = re.compile(r"\bONLINESHOP\b|shop\.hofer\.at", re.I)
UNIT_PRICE_RE = re.compile(
    r"€\s*(\d{1,4}(?:[,.]\d{2}))\s*/\s*"
    r"(?:(\d+(?:[,.]\d+)?)\s*)?(KG/ATG|kg|g|l|ml|Stk\.?|Stück)\b",
    re.I,
)
MULTIPACK_RE = re.compile(
    r"\b(\d{1,3})\s*[x×]\s*(\d+(?:[,.]\d+)?)\s*(KG/ATG|kg|g|l|ml)\b",
    re.I,
)
AMOUNT_RE = re.compile(
    r"\b(?:ca\.?\s*)?(\d+(?:[,.]\d+)?)\s*(KG/ATG|kg|g|l|ml)\b",
    re.I,
)
COUNT_RE = re.compile(r"\b(\d{1,3})\s*er\b", re.I)


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def number(value):
    try:
        if value is None or value == "":
            return None
        n = float(str(value).replace("€", "").replace(" ", "").replace("\xa0", "").replace(",", "."))
        return n if math.isfinite(n) else None
    except (TypeError, ValueError):
        return None


def normalize_space(value) -> str:
    text = html.unescape(str(value or "")).replace("\xa0", " ")
    return re.sub(r"\s+", " ", text).strip()


def fetch_text(url: str, attempts: int = 4) -> str:
    headers = {
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "de-AT,de;q=0.9,en;q=0.7",
        "Cache-Control": "no-cache",
        "Accept-Encoding": "identity",
        "User-Agent": USER_AGENT,
    }
    last_error = None
    for attempt in range(attempts):
        try:
            req = Request(url, headers=headers)
            with urlopen(req, timeout=FETCH_TIMEOUT) as response:
                data = response.read()
                charset = response.headers.get_content_charset() or "utf-8"
                text = data.decode(charset, errors="replace")
                if len(text) < 10_000:
                    raise RuntimeError(f"HOFER-Seite ist unplausibel klein ({len(text)} Zeichen)")
                return text
        except Exception as exc:
            last_error = exc
            if attempt + 1 < attempts:
                time.sleep(2 ** attempt)
    raise RuntimeError(f"HOFER-Seite konnte nicht abgerufen werden: {last_error}")


class Node:
    __slots__ = ("tag", "attrs", "parent", "children", "text_parts", "text_cache")

    def __init__(self, tag="document", attrs=None, parent=None):
        self.tag = tag
        self.attrs = dict(attrs or [])
        self.parent = parent
        self.children = []
        self.text_parts = []
        self.text_cache = None

    def add_child(self, node):
        self.children.append(node)
        self.text_cache = None

    def text(self):
        if self.text_cache is not None:
            return self.text_cache
        parts = list(self.text_parts)
        for child in self.children:
            parts.append(child.text())
        self.text_cache = normalize_space(" ".join(parts))
        return self.text_cache


class HoferHtmlParser(HTMLParser):
    VOID_TAGS = {"area","base","br","col","embed","hr","img","input","link","meta","param","source","track","wbr"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node()
        self.stack = [self.root]

    def _add_node(self, tag, attrs):
        node = Node(tag, attrs, self.stack[-1])
        for key in ("alt", "aria-label", "title"):
            value = node.attrs.get(key)
            if value:
                node.text_parts.append(str(value))
        self.stack[-1].add_child(node)
        if tag.lower() not in self.VOID_TAGS:
            self.stack.append(node)

    def handle_starttag(self, tag, attrs):
        self._add_node(tag, attrs)

    def handle_startendtag(self, tag, attrs):
        self._add_node(tag, attrs)
        if self.stack[-1].tag.lower() == tag.lower():
            self.stack.pop()

    def handle_endtag(self, tag):
        wanted = tag.lower()
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag.lower() == wanted:
                del self.stack[i:]
                return

    def handle_data(self, data):
        if data:
            self.stack[-1].text_parts.append(data)
            self.stack[-1].text_cache = None


def iter_nodes(node):
    for child in node.children:
        yield child
        yield from iter_nodes(child)


def absolute_product_url(href):
    if not href:
        return None
    absolute = urljoin(BASE_URL, html.unescape(str(href).strip()))
    parsed = urlparse(absolute)
    if parsed.netloc not in {"www.hofer.at", "hofer.at"}:
        return None
    if "/produkt/" not in parsed.path.lower():
        return None
    return absolute.split("#", 1)[0].split("?", 1)[0]


def extract_identifier(url):
    segment = urlparse(url).path.rsplit("/", 1)[-1]
    values = re.findall(r"\d{8,}", segment)
    return values[-1] if values else None


def normalize_unit(raw_unit):
    value = str(raw_unit or "").strip().lower()
    if value in {"kg", "kg/atg"}:
        return "kg"
    if value == "g":
        return "g"
    if value == "l":
        return "l"
    if value == "ml":
        return "ml"
    if value in {"stk", "stk.", "stück"}:
        return "Stk"
    return None


def canonical_amount(amount, unit):
    amount = number(amount)
    unit = normalize_unit(unit)
    if amount is None or amount <= 0 or not unit:
        return None, None
    if unit == "g" and amount >= 1000:
        return round(amount / 1000, 6), "kg"
    if unit == "ml" and amount >= 1000:
        return round(amount / 1000, 6), "l"
    return round(amount, 6), unit


def calc_unit_price(price, amount, unit):
    price = number(price)
    amount = number(amount)
    unit = normalize_unit(unit)
    if price is None or amount is None or amount <= 0 or not unit:
        return None, None
    if unit == "g":
        return round(price / (amount / 1000), 2), "kg"
    if unit == "kg":
        return round(price / amount, 2), "kg"
    if unit == "ml":
        return round(price / (amount / 1000), 2), "l"
    if unit == "l":
        return round(price / amount, 2), "l"
    if unit == "Stk":
        return round(price / amount, 2), "Stk"
    return None, None


def parse_unit_price(text):
    for match in UNIT_PRICE_RE.finditer(text):
        price = number(match.group(1))
        denominator = number(match.group(2)) if match.group(2) else 1.0
        unit = normalize_unit(match.group(3))
        if price is None or denominator is None or denominator <= 0 or not unit:
            continue
        if unit == "g":
            return round(price / (denominator / 1000.0), 2), "kg"
        if unit == "kg":
            return round(price / denominator, 2), "kg"
        if unit == "ml":
            return round(price / (denominator / 1000.0), 2), "l"
        if unit == "l":
            return round(price / denominator, 2), "l"
        if unit == "Stk":
            return round(price / denominator, 2), "Stk"
    return None, None


def parse_amount(text):
    cleaned = STRIKE_RE.sub(" ", text)
    cleaned = re.sub(r"\([^)]*€[^)]*\)", " ", cleaned)

    multi = MULTIPACK_RE.search(cleaned)
    if multi:
        count = number(multi.group(1))
        amount = number(multi.group(2))
        unit = normalize_unit(multi.group(3))
        if count and amount and unit:
            return canonical_amount(count * amount, unit)

    amount_match = AMOUNT_RE.search(cleaned)
    if amount_match:
        return canonical_amount(amount_match.group(1), amount_match.group(2))

    count_match = COUNT_RE.search(cleaned)
    if count_match:
        count = number(count_match.group(1))
        if count:
            return count, "Stk"

    lowered = cleaned.lower()
    if re.search(r"\b(?:per|pro|je)\s*kg\b", lowered):
        return 1.0, "kg"
    if re.search(r"\b(?:per|pro|je)\s*stück\b", lowered):
        return 1.0, "Stk"

    return None, None


def extract_prices(text):
    strike_ranges = [(m.start(), m.end(), m.group(1)) for m in STRIKE_RE.finditer(text)]
    strikes = []
    normal = []

    for start, end, inner in strike_ranges:
        strikes.extend(v for v in (number(m.group(1)) for m in EURO_RE.finditer(inner)) if v is not None)

    for match in EURO_RE.finditer(text):
        pos = match.start()
        if any(start <= pos < end for start, end, _ in strike_ranges):
            continue
        left_open = text.rfind("(", 0, pos)
        left_close = text.rfind(")", 0, pos)
        if left_open > left_close:
            continue
        value = number(match.group(1))
        if value is not None:
            normal.append(value)

    current = normal[-1] if normal else None
    regular = strikes[-1] if strikes else None

    return current, regular


def clean_product_name(text):
    cleaned = STRIKE_RE.sub(" ", text)
    cleaned = re.sub(r"\([^)]*€[^)]*\)", " ", cleaned)
    cleaned = AVAILABLE_RE.sub(" ", cleaned)
    cleaned = EURO_RE.sub(" ", cleaned)
    cleaned = re.sub(r"[¹²³⁴⁵⁶⁷⁸⁹]+", " ", cleaned)
    cleaned = re.sub(r"\s*/\s*(?:1\s*)?(?:kg|g|l|ml)\b", " ", cleaned, flags=re.I)
    cleaned = re.sub(r"^\s*(?:Vegan|Regional|Kühlung|Neu|Tiefpreisaktion)\s+", "", cleaned, flags=re.I)
    return normalize_space(cleaned).strip(" -·|:")


def parse_product_anchor(anchor):
    href = absolute_product_url(anchor.attrs.get("href"))
    if not href:
        return None

    text = anchor.text()
    if not text or ONLINE_RE.search(text):
        return None

    current, regular = extract_prices(text)
    if current is None or current <= 0:
        return None

    name = clean_product_name(text)
    if not name:
        return None

    amount, unit = parse_amount(text)
    optimizer_eligible = amount is not None and unit is not None

    # Products without a clear pack dimension stay visible in the catalog,
    # but are deliberately excluded from automatic price calculation.
    if not optimizer_eligible:
        amount, unit = 1.0, "Stk"

    unit_price, unit_price_unit = parse_unit_price(text)
    if unit_price is None:
        unit_price, unit_price_unit = calc_unit_price(current, amount, unit)

    article_id = extract_identifier(href)
    if not article_id:
        return None

    available_match = AVAILABLE_RE.search(text)
    available_from = None
    if available_match:
        try:
            available_from = datetime.strptime(available_match.group(1), "%d.%m.%Y").date().isoformat()
        except ValueError:
            available_from = None

    return {
        "store": "hofer",
        "remoteObjectId": article_id,
        "retailerProductId": article_id,
        "name": name,
        "description": "",
        "amount": round(amount, 6),
        "unit": unit,
        "amountKnown": optimizer_eligible,
        "optimizerEligible": optimizer_eligible,
        "currentPrice": round(current, 2),
        "regularPrice": round(regular, 2) if regular is not None and regular > current else round(current, 2),
        "salePrice": round(current, 2) if regular is not None and regular > current else None,
        "unitPrice": unit_price,
        "unitPriceUnit": unit_price_unit,
        "weighted": unit == "kg",
        "availableFrom": available_from,
        "productUrl": href,
        "source": "hofer.at/produkte",
    }


def parse_products_page(html_text):
    parser = HoferHtmlParser()
    parser.feed(html_text)
    parser.close()

    rows = {}
    for node in iter_nodes(parser.root):
        if node.tag.lower() != "a":
            continue
        item = parse_product_anchor(node)
        if not item:
            continue
        key = str(item["retailerProductId"])
        rows.setdefault(key, item)

    return rows


def normalize_history(raw_history):
    result = []
    seen = set()
    for entry in raw_history or []:
        if not isinstance(entry, dict):
            continue
        date = str(entry.get("date") or "")[:10]
        price = number(entry.get("price"))
        if not date or price is None:
            continue
        key = (date, round(price, 2))
        if key in seen:
            continue
        seen.add(key)
        result.append({"date": date, "price": round(price, 2)})
    return sorted(result, key=lambda row: row["date"])[-250:]


def update_history(previous, current_price, updated_at):
    history = normalize_history(previous.get("history") if isinstance(previous, dict) else [])
    previous_price = number(previous.get("currentPrice")) if isinstance(previous, dict) else None

    if previous_price is not None and current_price is not None and abs(previous_price - current_price) >= 0.005:
        history.append({
            "date": str(previous.get("updatedAt") or updated_at)[:10],
            "price": round(previous_price, 2),
        })

    history.append({"date": updated_at[:10], "price": round(current_price, 2)})

    dedup = {}
    for entry in history:
        dedup[(entry["date"], entry["price"])] = entry

    return sorted(dedup.values(), key=lambda row: row["date"])[-250:]


def build_existing_product_map(payload):
    result = {}
    if not isinstance(payload, dict):
        return result
    for item in payload.get("products") or []:
        if not isinstance(item, dict):
            continue
        for key in (item.get("retailerProductId"), item.get("remoteObjectId")):
            if key:
                result[str(key)] = item
    return result


def load_existing_payload():
    if not OUT.exists():
        return None
    try:
        payload = json.loads(OUT.read_text(encoding="utf-8"))
        return payload if isinstance(payload, dict) else None
    except Exception:
        return None


def carry_forward_verified_promotion(product, previous):
    if not isinstance(previous, dict) or previous.get("promotionVerified") is not True:
        return

    for field in (
        "regularPrice", "salePrice", "promotion", "promotionVerified",
        "promotionObservedAt", "validFrom", "validUntil",
        "promotionProductUrl", "promotionSource", "promotionOfficialLabel",
    ):
        if field in previous:
            product[field] = previous[field]

    if previous.get("salePrice") is not None:
        price = number(previous.get("salePrice"))
        calculated, calculated_unit = calc_unit_price(price, product.get("amount"), product.get("unit"))
        if calculated is not None:
            product["unitPrice"] = calculated
            product["unitPriceUnit"] = calculated_unit


def write_status(status, updated_at, product_count, error=None, stale=False):
    payload = {}
    try:
        if STATUS.exists():
            loaded = json.loads(STATUS.read_text(encoding="utf-8"))
            if isinstance(loaded, dict):
                payload = loaded
    except Exception:
        pass

    payload["schemaVersion"] = 1
    payload["updatedAt"] = updated_at
    payload.setdefault("stores", {})
    payload["stores"]["hofer"] = {
        "status": status,
        "productCount": int(product_count),
        "stale": bool(stale),
        "error": error,
        "provider": "hofer.at",
    }
    STATUS.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def fetch_all_products():
    found = {}
    for page in range(1, MAX_PAGES + 1):
        url = BASE_URL if page == 1 else f"{BASE_URL}?page={page}"
        print(f"HOFER: lade Produktkatalog {url}")
        text = fetch_text(url)
        rows = parse_products_page(text)

        new_rows = 0
        for key, item in rows.items():
            if key not in found:
                found[key] = item
                new_rows += 1

        print(
            f"HOFER: Seite {page} → {len(rows)} Produktlinks, "
            f"{new_rows} neu, insgesamt {len(found)}"
        )

        if not rows or new_rows == 0:
            break

    return found


def main() -> int:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    updated_at = now_iso()
    existing_payload = load_existing_payload()
    existing_products = build_existing_product_map(existing_payload)
    existing_count = len(existing_products)

    try:
        found = fetch_all_products()
        if len(found) < MIN_EXPECTED_PRODUCTS:
            raise RuntimeError(
                f"Unplausibel wenige HOFER-Produkte ({len(found)}). "
                "Vorhandene Daten werden nicht überschrieben."
            )

        products = []
        for item in found.values():
            previous = existing_products.get(str(item["retailerProductId"]))
            item["history"] = update_history(previous or {}, item["currentPrice"], updated_at)
            carry_forward_verified_promotion(item, previous)
            item["updatedAt"] = updated_at
            products.append(item)

        products.sort(key=lambda row: (
            str(row.get("name") or "").casefold(),
            str(row.get("retailerProductId") or ""),
        ))

        payload = {
            "schemaVersion": 1,
            "importerVersion": 3,
            "store": "hofer",
            "scope": "HOFER-Produktkatalog aus offizieller HOFER-Website",
            "provider": "hofer.at",
            "providerUrl": BASE_URL,
            "updatedAt": updated_at,
            "productCount": len(products),
            "skippedCount": 0,
            "products": products,
        }

        if isinstance(existing_payload, dict):
            for key in (
                "promotionCount", "promotionUpdatedAt", "promotionSource",
                "promotionStale", "promotionLastError",
            ):
                if key in existing_payload:
                    payload[key] = existing_payload[key]

        temp = OUT.with_suffix(".json.tmp")
        temp.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
        temp.replace(OUT)

        write_status("ok", updated_at, len(products))

        eligible = sum(1 for item in products if item.get("optimizerEligible"))
        print(
            f"HOFER: {len(products)} Produkte importiert; "
            f"{eligible} mit sicher erkannter Gebindemenge."
        )
        return 0

    except Exception as exc:
        if existing_count >= MIN_EXPECTED_PRODUCTS:
            write_status("stale", updated_at, existing_count, error=str(exc), stale=True)
            print(
                f"WARNUNG: HOFER konnte nicht aktualisiert werden. "
                f"Vorhandene {existing_count} Produkte bleiben bestehen. Fehler: {exc}",
                file=sys.stderr,
            )
            return 0

        write_status("error", updated_at, existing_count, error=str(exc), stale=False)
        print(f"FEHLER: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
