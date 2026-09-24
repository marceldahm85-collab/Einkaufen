#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import html
import json
import math
import re
import sys
import time
from datetime import datetime, timedelta
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "hofer.json"
STATUS_PATH = ROOT / "data" / "update-status.json"

# Official HOFER pages. The current offers page is the primary source;
# the products page catches current seasonal/offer cards that are also
# rendered in the public assortment.
ACTION_URLS = [
    "https://www.hofer.at/angebote",
    "https://www.hofer.at/produkte",
]
MIN_EXPECTED_PRODUCTS = 100
MIN_EXPECTED_PROMOTIONS = 10
ACTION_WINDOW_DAYS = 7
FETCH_TIMEOUT = 90
USER_AGENT = "Mozilla/5.0 PreisPilot-Osttirol-GitHubAction/1.0"

EURO_PRICE_RE = re.compile(r"(?:€\s*(\d{1,4}(?:[,.]\d{2}))|(\d{1,4}(?:[,.]\d{2}))\s*€)")
AVAILABLE_RE = re.compile(r"\bVerfügbar\s+(?:seit|ab)\s+(\d{2}\.\d{2}\.\d{4})\b", re.I)
ACTION_LABEL_RE = re.compile(r"\bTiefpreisaktion\b", re.I)
DATE_MARKER_RE = re.compile(r"\bVerfügbar\s+(?:seit|ab)\b", re.I)
ONLINE_RE = re.compile(r"\bONLINESHOP\b|shop\.hofer\.at", re.I)


def now_iso() -> str:
    return datetime.now(ZoneInfo("Europe/Vienna")).replace(microsecond=0).isoformat()


def today_date():
    return datetime.now(ZoneInfo("Europe/Vienna")).date()


def number(value):
    try:
        if value is None or value == "":
            return None
        n = float(
            str(value)
            .replace("€", "")
            .replace(" ", "")
            .replace("\xa0", "")
            .replace(",", ".")
        )
        return n if math.isfinite(n) else None
    except (TypeError, ValueError):
        return None


def normalize_space(value):
    text = html.unescape(str(value or "")).replace("\xa0", " ")
    return re.sub(r"\s+", " ", text).strip()


def fetch_text(url, attempts=4):
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
            request = Request(url, headers=headers)
            with urlopen(request, timeout=FETCH_TIMEOUT) as response:
                data = response.read()
                charset = response.headers.get_content_charset() or "utf-8"
                text = data.decode(charset, errors="replace")
                if len(text) < 10_000:
                    raise RuntimeError(
                        f"HOFER-Seite ist unplausibel klein ({len(text)} Zeichen)"
                    )
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
    VOID_TAGS = {
        "area", "base", "br", "col", "embed", "hr", "img", "input",
        "link", "meta", "param", "source", "track", "wbr"
    }

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node()
        self.stack = [self.root]

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs, self.stack[-1])
        for key in ("alt", "aria-label", "title"):
            value = node.attrs.get(key)
            if value:
                node.text_parts.append(str(value))
        self.stack[-1].add_child(node)
        if tag.lower() not in self.VOID_TAGS:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        node = Node(tag, attrs, self.stack[-1])
        for key in ("alt", "aria-label", "title"):
            value = node.attrs.get(key)
            if value:
                node.text_parts.append(str(value))
        self.stack[-1].add_child(node)

    def handle_endtag(self, tag):
        tag = tag.lower()
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag.lower() == tag:
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
    absolute = urljoin(
        "https://www.hofer.at/angebote",
        html.unescape(str(href).strip())
    )
    parsed = urlparse(absolute)
    if parsed.netloc not in {"www.hofer.at", "hofer.at"}:
        return None
    if "/produkt/" not in parsed.path.lower():
        return None
    return absolute.split("#", 1)[0].split("?", 1)[0]


def unique_product_hrefs(node):
    hrefs = set()
    for descendant in iter_nodes(node):
        if descendant.tag.lower() != "a":
            continue
        absolute = absolute_product_url(descendant.attrs.get("href"))
        if absolute:
            hrefs.add(absolute)
    return hrefs


def extract_identifier(url):
    segment = urlparse(url).path.rsplit("/", 1)[-1]
    matches = re.findall(r"\d{8,}", segment)
    return matches[-1] if matches else None


def normalize_identifier(value):
    text = str(value or "").strip().lower()
    if not text:
        return set()
    variants = {text}
    digits = re.sub(r"\D+", "", text)
    if digits:
        variants.add(digits)
        variants.add(digits.lstrip("0") or "0")
    return variants


def strip_unit_price_parentheses(text):
    # e.g. "(€ 6,04/1 kg)" must not be mistaken for the selling price.
    return re.sub(r"\([^)]*€[^)]*\)", " ", text)


def extract_euro_prices(text):
    prices = []
    for match in EURO_PRICE_RE.finditer(text):
        value = number(match.group(1) or match.group(2))
        if value is not None:
            prices.append(value)
    return prices


def extract_name(text):
    cleaned = strip_unit_price_parentheses(text)
    cleaned = AVAILABLE_RE.sub(" ", cleaned)
    cleaned = ACTION_LABEL_RE.sub(" ", cleaned)

    # Only an explicitly marked euro price ends the visible product name.
    # Dates and package amounts must never be treated as selling prices.
    price = EURO_PRICE_RE.search(cleaned)
    if price:
        cleaned = cleaned[:price.start()]

    cleaned = re.sub(r"\b(?:ONLINESHOP|Kühlung|Vegan|Regional)\b", " ", cleaned, flags=re.I)
    cleaned = re.sub(r"\b(?:nur|jetzt)\b\s*$", " ", cleaned, flags=re.I)
    cleaned = re.sub(r"[¹²³*~]+", " ", cleaned)
    return normalize_space(cleaned).strip(" -·|:")
def parse_card_text(text):
    text = normalize_space(text)
    if not text or ONLINE_RE.search(text) or not DATE_MARKER_RE.search(text):
        return None

    date_match = AVAILABLE_RE.search(text)
    valid_from = None
    if date_match:
        try:
            valid_from = datetime.strptime(
                date_match.group(1), "%d.%m.%Y"
            ).date().isoformat()
        except ValueError:
            valid_from = None

    price_text = strip_unit_price_parentheses(text)
    prices = [
        p for p in extract_euro_prices(price_text)
        if p is not None and p > 0
    ]

    current = prices[0]
    regular = None
    sale = None

    # HOFER uses the current price first and the struck-through "statt" price
    # second on current product/offer pages.
    if len(prices) >= 2 and prices[1] > current:
        regular = prices[1]
        sale = current

    label = "Tiefpreisaktion" if ACTION_LABEL_RE.search(text) else "Aktionsartikel"

    if sale is not None:
        promotion = {
            "type": "price_drop",
            "label": label,
            "officialLabel": label,
            "verified": True,
            "source": ACTION_URLS[0],
            "loyaltyRequired": False,
            "discountPercent": round((1 - sale / regular) * 100),
        }
    else:
        promotion = {
            "type": "action_article",
            "label": label,
            "officialLabel": label,
            "verified": True,
            "source": ACTION_URLS[0],
            "loyaltyRequired": False,
        }

    return {
        "name": extract_name(text),
        "regularPrice": regular if regular is not None else current,
        "salePrice": sale,
        "promotion": promotion,
        "actionLabel": label,
        "validFrom": valid_from,
    }


def extract_action_cards(html_text):
    parser = HoferHtmlParser()
    parser.feed(html_text)
    parser.close()

    anchors = [
        node for node in iter_nodes(parser.root)
        if node.tag.lower() == "a" and node.attrs.get("href")
    ]

    results = {}

    for anchor in anchors:
        href = absolute_product_url(anchor.attrs.get("href"))
        if not href:
            continue

        text = anchor.text()
        if (
            not text
            or len(text) < 25
            or not DATE_MARKER_RE.search(text)
        ):
            current = anchor.parent
            depth = 0
            while current is not None and depth < 20:
                if len(unique_product_hrefs(current)) == 1:
                    candidate = current.text()
                    if (
                        len(candidate) >= 25
                        and DATE_MARKER_RE.search(candidate)
                    ):
                        text = candidate
                        break
                current = current.parent
                depth += 1

        parsed = parse_card_text(text)
        if not parsed:
            continue

        valid_from = parsed.get("validFrom")
        if valid_from:
            try:
                start = datetime.strptime(valid_from, "%Y-%m-%d").date()
            except ValueError:
                continue

            today = today_date()
            if (
                start < today - timedelta(days=ACTION_WINDOW_DAYS)
                or start > today + timedelta(days=ACTION_WINDOW_DAYS)
            ):
                continue

        article_id = extract_identifier(href)
        if not article_id:
            continue

        parsed["articleNumber"] = article_id
        parsed["productUrl"] = href
        parsed["cardTextHash"] = hashlib.sha256(
            text.encode("utf-8")
        ).hexdigest()[:16]

        key = next(iter(normalize_identifier(article_id)))
        existing = results.get(key)
        if existing is None:
            results[key] = parsed

    return results


def fetch_all_actions():
    found = {}
    for url in ACTION_URLS:
        print(f"HOFER: lade {url}")
        text = fetch_text(url)
        rows = extract_action_cards(text)
        print(
            f"HOFER: {url} → {len(rows)} sichere Aktionskarten"
        )
        for key, row in rows.items():
            found.setdefault(key, row)
    return found


def load_payload():
    if not DATA_PATH.exists():
        raise RuntimeError(
            "data/hofer.json fehlt. Zuerst scripts/update_hofer.py ausführen."
        )

    try:
        payload = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    except Exception as exc:
        raise RuntimeError(f"data/hofer.json ist ungültig: {exc}") from exc

    if (
        not isinstance(payload, dict)
        or not isinstance(payload.get("products"), list)
    ):
        raise RuntimeError("data/hofer.json hat nicht das erwartete Format.")

    if len(payload["products"]) < MIN_EXPECTED_PRODUCTS:
        raise RuntimeError(
            f"Unplausibel wenige HOFER-Produkte: {len(payload['products'])}"
        )

    return payload


def load_status():
    try:
        payload = json.loads(STATUS_PATH.read_text(encoding="utf-8"))
        if isinstance(payload, dict):
            return payload
    except Exception:
        pass
    return {"schemaVersion": 1, "updatedAt": None, "stores": {}}


def write_status(stale, error=None, promotion_count=None):
    payload = load_status()
    payload["schemaVersion"] = 1
    payload["updatedAt"] = now_iso()
    payload.setdefault("stores", {})
    store = payload["stores"].setdefault("hofer", {})
    store["promotionStale"] = bool(stale)
    store["promotionSource"] = ", ".join(ACTION_URLS)

    if promotion_count is not None:
        store["promotionCount"] = int(promotion_count)

    store["promotionError"] = error
    STATUS_PATH.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def product_map_key_variants(product):
    values = [
        product.get("retailerProductId"),
        product.get("remoteObjectId"),
        product.get("sku"),
        product.get("productId"),
        product.get("articleNumber"),
    ]

    variants = set()
    for value in values:
        variants.update(normalize_identifier(value))
    return variants


def clear_previous_actions(product):
    for field in (
        "regularPrice",
        "salePrice",
        "promotion",
        "promotionVerified",
        "promotionObservedAt",
        "validFrom",
        "validUntil",
        "promotionProductUrl",
        "promotionSource",
        "promotionOfficialLabel",
    ):
        product.pop(field, None)


def update_unit_price(product):
    price = number(
        product.get("salePrice")
        if product.get("salePrice") is not None
        else product.get("currentPrice") or product.get("regularPrice")
    )
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


def apply_action(product, action, observed_at):
    product["regularPrice"] = action.get("regularPrice")
    product["salePrice"] = action.get("salePrice")
    product["promotion"] = action.get("promotion")
    product["promotionVerified"] = True
    product["promotionObservedAt"] = observed_at
    product["promotionProductUrl"] = action.get("productUrl")
    product["promotionSource"] = ", ".join(ACTION_URLS)
    product["promotionOfficialLabel"] = action.get("actionLabel")
    product["validFrom"] = action.get("validFrom")
    product["validUntil"] = None
    update_unit_price(product)


def action_is_current(action):
    valid_from = str(action.get("validFrom") or "")[:10]
    return not valid_from or valid_from <= today_date().isoformat()


def write_payload(payload):
    temp = DATA_PATH.with_suffix(".json.tmp")
    temp.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )
    temp.replace(DATA_PATH)


def main():
    payload = load_payload()

    try:
        found = fetch_all_actions()
    except Exception as exc:
        old_count = int(payload.get("promotionCount") or 0)
        payload["promotionStale"] = True
        payload["promotionLastError"] = str(exc)
        write_payload(payload)
        write_status(True, str(exc), old_count)

        if old_count:
            print(
                f"WARNUNG: HOFER-Aktionsquelle nicht erreichbar; "
                f"alter Bestand ({old_count}) bleibt stale.",
                file=sys.stderr,
            )
            return 0

        print(f"FEHLER: {exc}", file=sys.stderr)
        return 1

    if len(found) < MIN_EXPECTED_PROMOTIONS:
        error = (
            f"HOFER-Aktionsimport lieferte nur {len(found)} sichere Produkte; "
            f"Mindestwert für einen erfolgreichen Lauf ist "
            f"{MIN_EXPECTED_PROMOTIONS}."
        )
        old_count = int(payload.get("promotionCount") or 0)
        payload["promotionStale"] = True
        payload["promotionLastError"] = error
        write_payload(payload)
        write_status(True, error, old_count)

        if old_count:
            print(
                f"WARNUNG: {error} Alter Bestand bleibt stale.",
                file=sys.stderr,
            )
            return 0

        print(f"FEHLER: {error}", file=sys.stderr)
        return 1

    lookup = {}
    name_lookup = {}

    for product in payload["products"]:
        if not isinstance(product, dict):
            continue

        for key in product_map_key_variants(product):
            lookup.setdefault(key, product)

        name = normalize_space(product.get("name"))
        if name:
            name_lookup.setdefault(name.casefold(), []).append(product)

    matches = []

    for action in found.values():
        product = None

        for key in normalize_identifier(action.get("articleNumber")):
            product = lookup.get(key)
            if product is not None:
                break

        if product is None:
            exact = name_lookup.get(
                normalize_space(action.get("name")).casefold(), []
            )
            if len(exact) == 1:
                product = exact[0]

        if product is not None:
            matches.append((product, action))

    if len(matches) < MIN_EXPECTED_PROMOTIONS:
        error = (
            f"HOFER-Aktionsimport konnte nur {len(matches)} sichere Produkte "
            f"mit dem öffentlichen Bestand verknüpfen."
        )
        old_count = int(payload.get("promotionCount") or 0)
        payload["promotionStale"] = True
        payload["promotionLastError"] = error
        write_payload(payload)
        write_status(True, error, old_count)

        if old_count:
            print(
                f"WARNUNG: {error} Alter Bestand bleibt stale.",
                file=sys.stderr,
            )
            return 0

        print(f"FEHLER: {error}", file=sys.stderr)
        return 1

    for product in payload["products"]:
        clear_previous_actions(product)

    observed_at = now_iso()
    current_count = 0
    seen_product_ids = set()

    for product, action in matches:
        product_id = str(
            product.get("retailerProductId")
            or product.get("remoteObjectId")
            or id(product)
        )

        if product_id in seen_product_ids:
            continue

        seen_product_ids.add(product_id)
        apply_action(product, action, observed_at)

        if action_is_current(action):
            current_count += 1

    payload["promotionCount"] = current_count
    payload["promotionUpdatedAt"] = observed_at
    payload["promotionSource"] = ", ".join(ACTION_URLS)
    payload["promotionStale"] = False
    payload["promotionLastError"] = None
    write_payload(payload)
    write_status(False, None, current_count)

    print(
        f"HOFER: {len(found)} Aktionskarten gefunden; "
        f"{len(matches)} sicher verknüpft; "
        f"{current_count} aktuell."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
