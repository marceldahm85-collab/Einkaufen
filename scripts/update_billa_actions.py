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
DATA_PATH = ROOT / "data" / "billa.json"
STATUS_PATH = ROOT / "data" / "update-status.json"

ACTION_URL = "https://shop.billa.at/aktionen"
ACTION_EXTRA_URLS = ["https://shop.billa.at/aktionen/multipacks"]
SOURCE_HOST = "shop.billa.at"
MIN_EXPECTED_PRODUCTS = 100
MIN_EXPECTED_PROMOTIONS = 10
MAX_PAGES = 30
MAX_PAGE_NO_PROGRESS = 2
FETCH_TIMEOUT = 90
USER_AGENT = "Mozilla/5.0 PreisPilot-Osttirol-GitHubAction/1.0"

PRICE_RE = re.compile(r"(?<!\d)(\d{1,4}(?:[,.]\d{2}))(?:\s*)€")
BUNDLE_RE = re.compile(r"\b(\d+)\s*\+\s*(\d+)\s*aktion\b", re.I)
TRIGGER_RE = re.compile(r"\b(ab|bei)\s+(\d+)\b([^€]{0,140})?(?:je\s*)?(\d{1,4}(?:[,.]\d{2}))\s*€", re.I | re.S)
REGULAR_RE = re.compile(r"\beinzelpreis\b([^€]{0,90}?)(\d{1,4}(?:[,.]\d{2}))\s*€", re.I | re.S)
ACTION_RE = re.compile(r"\bin\s+aktion\b|\baktion\b", re.I)


def now_iso():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def today_iso():
    return datetime.now(timezone.utc).date().isoformat()


def number(value):
    try:
        if value is None or value == "":
            return None
        n = float(str(value).replace("€", "").replace(" ", "").replace("\xa0", "").replace(",", "."))
        return n if math.isfinite(n) else None
    except (TypeError, ValueError):
        return None


def normalize_identifier(value):
    text = str(value or "").strip().lower()
    if not text:
        return []

    variants = {text}
    digits = re.sub(r"\D+", "", text)
    if digits:
        variants.add(digits)
        variants.add(digits.lstrip("0") or "0")
        if len(digits) >= 7:
            variants.add(digits[-7:])

    if text.startswith("00-"):
        variants.add(text[3:])
    elif digits and len(digits) >= 6:
        # BILLA article URLs commonly use the 00-prefixed numeric article number.
        variants.add(f"00-{digits[-6:]}")

    return [v for v in variants if v]


def extract_article_number(value):
    text = str(value or "").strip()
    if not text:
        return None

    if re.fullmatch(r"\d{2}-\d{4,8}", text):
        return text

    path = urlparse(text).path if ("/" in text or text.startswith("http")) else text
    matches = re.findall(r"(?:^|[-_/])(\d{5,10})(?:$|[-_/])", path)
    if matches:
        digits = matches[-1]
        if len(digits) >= 8 and digits.startswith("00"):
            return f"00-{digits[-6:]}"
        if len(digits) >= 6:
            return f"00-{digits[-6:]}"
        return digits

    digits = re.sub(r"\D+", "", text)
    if len(digits) >= 6:
        return f"00-{digits[-6:]}"
    return None


def fetch_text(url, attempts=4):
    headers = {
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "de-AT,de;q=0.9,en;q=0.7",
        "Cache-Control": "no-cache",
        "Accept-Encoding": "identity",
        "User-Agent": USER_AGENT,
        "Referer": "https://shop.billa.at/",
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
                    raise RuntimeError(f"Antwort für BILLA-Aktionsseite ist unplausibel klein ({len(text)} Zeichen)")
                return text
        except Exception as exc:
            last_error = exc
            if attempt + 1 < attempts:
                time.sleep(2 ** attempt)

    raise RuntimeError(f"BILLA-Aktionsseite konnte nicht abgerufen werden: {last_error}")


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


def normalize_space(value):
    text = html.unescape(str(value or ""))
    text = text.replace("\xa0", " ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


class BillaHtmlParser(HTMLParser):
    VOID_TAGS = {
        "area", "base", "br", "col", "embed", "hr", "img", "input", "link",
        "meta", "param", "source", "track", "wbr"
    }

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node()
        self.stack = [self.root]

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs, self.stack[-1])
        # BILLA renders action badges as images whose alt text contains the
        # complete promotion label, e.g. "2+1 Aktion" / "4+2 Aktion".
        # Keep meaningful accessibility labels in the card text so the parser
        # can distinguish a true bundle from a generic "bei N" quantity price.
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


def absolute_url(href):
    if not href:
        return None
    return urljoin(ACTION_URL, html.unescape(str(href).strip()))


def action_label(text):
    bundle = BUNDLE_RE.search(text)
    if bundle:
        return f"{bundle.group(1)}+{bundle.group(2)} Aktion"
    if ACTION_RE.search(text):
        return "in Aktion"
    if re.search(r"\b(ab|bei)\s+\d+\b", text, re.I):
        return "Aktion"
    return "Aktion"


def parse_card_text(text):
    text = normalize_space(text)
    if not text:
        return None

    # The official page can contain promotional copy around the product card.
    # Only cards with an explicit action marker are accepted.
    bundle = BUNDLE_RE.search(text)
    has_trigger = bool(re.search(r"\b(?:ab|bei)\s+\d+\b", text, re.I))
    has_generic_action = bool(ACTION_RE.search(text))
    if not (bundle or has_trigger or has_generic_action):
        return None

    prices = [number(m.group(1)) for m in PRICE_RE.finditer(text)]
    prices = [p for p in prices if p is not None]
    if not prices:
        return None

    regular = None
    sale = None

    regular_match = REGULAR_RE.search(text)
    if regular_match:
        regular = number(regular_match.group(2))

    trigger_match = TRIGGER_RE.search(text)
    if trigger_match:
        required = int(trigger_match.group(2))
        sale = number(trigger_match.group(4))
        if sale is None or sale <= 0:
            return None

        # BILLA can expose a current action card with wording such as
        # "ab 1 Stück/Packung". This is not a conditional quantity action:
        # buying one item is the normal case. Never store it as a quantity
        # promotion because requiredQuantity=1 violates the shared action
        # schema and would make the workflow fail its integrity gate.
        if required < 2 and not bundle:
            promotion = {
                "type": "price_drop",
                "verified": True,
                "source": ACTION_URL,
                "loyaltyRequired": False,
                "label": "Aktion",
                "officialLabel": action_label(text),
            }
            if regular is not None and regular > sale:
                promotion["discountPercent"] = round((1 - sale / regular) * 100)
            return {
                "regularPrice": regular,
                "salePrice": sale,
                "promotion": promotion,
                "actionLabel": action_label(text),
            }

        if bundle:
            paid = int(bundle.group(1))
            free = int(bundle.group(2))
            if paid < 1 or free < 1 or paid + free != required:
                # The official text is inconsistent; do not guess the semantics.
                return None
            promotion = {
                "type": "bundle",
                "paidQuantity": paid,
                "freeQuantity": free,
                "requiredQuantity": required,
                "label": f"{paid}+{free} gratis",
                "officialLabel": action_label(text),
                "verified": True,
                "source": ACTION_URL,
                "loyaltyRequired": False,
            }
        else:
            promotion = {
                "type": "quantity",
                "requiredQuantity": required,
                "label": f"ab {required} Stück",
                "officialLabel": action_label(text),
                "verified": True,
                "source": ACTION_URL,
                "loyaltyRequired": False,
            }

        if regular is None:
            # No explicit Einzelpreis: do not invent a regular price. The sale
            # price itself is still safe because it is stated after the action threshold.
            regular = None

        if regular is not None and sale >= regular:
            # Quantity/bundle action without an actual monetary advantage may
            # still be a legitimate campaign, but the action price remains the
            # explicit price supplied by BILLA. Keep the semantics.
            pass

        return {
            "regularPrice": regular,
            "salePrice": sale,
            "promotion": promotion,
            "actionLabel": action_label(text),
        }

    if regular_match:
        sale = regular
    elif has_generic_action:
        sale = prices[0]
    else:
        return None

    if sale is None or sale <= 0:
        return None

    promotion = {
        "type": "price_drop",
        "verified": True,
        "source": ACTION_URL,
        "loyaltyRequired": False,
        "label": "Aktion",
        "officialLabel": "in Aktion",
    }

    # Do not invent a percentage from a page-wide promotional label.
    # If an explicit regular price is present, a calculated discount is only an
    # informational field; it does not create a semantic bundle/quantity action.
    if regular is not None and regular > sale:
        promotion["discountPercent"] = round((1 - sale / regular) * 100)

    return {
        "regularPrice": regular,
        "salePrice": sale,
        "promotion": promotion,
        "actionLabel": "in Aktion",
    }


def candidate_ancestors(node, max_depth=10):
    ancestors = []
    current = node.parent
    depth = 0
    while current is not None and depth < max_depth:
        ancestors.append(current)
        current = current.parent
        depth += 1
    return ancestors


def unique_product_hrefs(node):
    hrefs = set()
    for descendant in iter_nodes(node):
        if descendant.tag.lower() != "a":
            continue
        href = str(descendant.attrs.get("href") or "").strip()
        if "/produkte/" not in href.lower():
            continue
        absolute = absolute_url(href)
        if absolute:
            hrefs.add(absolute.split("#", 1)[0].split("?", 1)[0])
    return hrefs


def extract_action_cards(html_text):
    parser = BillaHtmlParser()
    parser.feed(html_text)
    parser.close()

    results = {}
    anchors = [node for node in iter_nodes(parser.root) if node.tag.lower() == "a" and node.attrs.get("href")]
    product_anchors = [a for a in anchors if "/produkte/" in str(a.attrs.get("href") or "").lower()]

    for anchor in product_anchors:
        href = absolute_url(anchor.attrs.get("href"))
        if not href or "shop.billa.at" not in urlparse(href).netloc:
            continue

        article_number = extract_article_number(href)
        if not article_number:
            continue

        chosen_text = None
        chosen_node = None
        for ancestor in candidate_ancestors(anchor, 24):
            if len(unique_product_hrefs(ancestor)) != 1:
                continue
            text = ancestor.text()
            if len(text) < 30 or len(text) > 4000:
                continue
            if not PRICE_RE.search(text):
                continue
            if not (ACTION_RE.search(text) or re.search(r"\b(?:ab|bei)\s+\d+\b", text, re.I) or BUNDLE_RE.search(text)):
                continue
            chosen_text = text
            chosen_node = ancestor
            # Prefer the smallest matching ancestor; once found, walk no further.
            break

        if not chosen_text or chosen_node is None:
            continue

        parsed = parse_card_text(chosen_text)
        if not parsed:
            continue

        name = normalize_space(anchor.text())
        if not name:
            path_name = urlparse(href).path.rsplit("/", 1)[-1]
            path_name = re.sub(r"[-_]?\d{5,10}$", "", path_name)
            name = re.sub(r"[-_]+", " ", path_name).strip().title()

        key = normalize_identifier(article_number)[0]
        row = {
            "articleNumber": article_number,
            "productUrl": href,
            "name": name,
            **parsed,
            "cardTextHash": hashlib.sha256(chosen_text.encode("utf-8")).hexdigest()[:16],
        }

        # Keep the strongest parsed card when the same product appears twice.
        existing = results.get(key)
        if existing is None or len(chosen_text) < len(str(existing.get("_cardText") or "")):
            row["_cardText"] = chosen_text
            results[key] = row

    for row in results.values():
        row.pop("_cardText", None)
    return results


def fetch_all_actions():
    found = {}

    source_urls = [(ACTION_URL, "Aktionen")]
    source_urls.extend((url, "Multipack-Aktionen") for url in ACTION_EXTRA_URLS)

    for base_url, label in source_urls:
        no_progress = 0
        for page in range(MAX_PAGES + 1):
            url = base_url if page == 0 else f"{base_url}?page={page}"
            print(f"BILLA-{label}: lade Seite {page}: {url}")
            text = fetch_text(url)
            page_rows = extract_action_cards(text)

            new_count = 0
            for key, row in page_rows.items():
                if key not in found:
                    found[key] = row
                    new_count += 1

            print(f"BILLA-{label} Seite {page}: {len(page_rows)} eindeutige Produktkarten, {new_count} neu")

            if new_count == 0:
                no_progress += 1
            else:
                no_progress = 0

            if no_progress >= MAX_PAGE_NO_PROGRESS:
                break

    return found


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
    store = payload["stores"].setdefault("billa", {})
    store["promotionStale"] = bool(stale)
    store["promotionSource"] = ACTION_URL
    if promotion_count is not None:
        store["promotionCount"] = int(promotion_count)
    store["promotionError"] = error
    STATUS_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def product_map_key_variants(product):
    values = [
        product.get("retailerProductId"),
        product.get("remoteObjectId"),
        product.get("sku"),
        product.get("articleNumber"),
    ]
    variants = set()
    for value in values:
        variants.update(normalize_identifier(value))
    return variants


def load_payload():
    if not DATA_PATH.exists():
        raise RuntimeError("data/billa.json fehlt. Zuerst scripts/update_billa.py ausführen.")
    try:
        payload = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    except Exception as exc:
        raise RuntimeError(f"data/billa.json ist ungültig: {exc}") from exc
    if not isinstance(payload, dict) or not isinstance(payload.get("products"), list):
        raise RuntimeError("data/billa.json hat nicht das erwartete Format.")
    if len(payload["products"]) < MIN_EXPECTED_PRODUCTS:
        raise RuntimeError(f"Unplausibel wenige BILLA-Produkte: {len(payload['products'])}")
    return payload


def clear_previous_actions(product):
    for field in (
        "regularPrice", "salePrice", "promotion", "promotionVerified",
        "promotionObservedAt", "validFrom", "validUntil", "promotionProductUrl",
        "promotionSource", "promotionOfficialLabel"
    ):
        product.pop(field, None)
    update_unit_price(product)


def apply_action(product, action, observed_at):
    product["regularPrice"] = action.get("regularPrice")
    product["salePrice"] = action.get("salePrice")
    product["promotion"] = action.get("promotion")
    product["promotionVerified"] = True
    product["promotionObservedAt"] = observed_at
    product["promotionProductUrl"] = action.get("productUrl")
    product["promotionSource"] = ACTION_URL
    product["promotionOfficialLabel"] = action.get("actionLabel")
    update_unit_price(product)


def write_payload(payload):
    temp = DATA_PATH.with_suffix(".json.tmp")
    temp.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    temp.replace(DATA_PATH)


def main():
    payload = load_payload()
    found = fetch_all_actions()
    observed_at = now_iso()

    if len(found) < MIN_EXPECTED_PROMOTIONS:
        old_count = int(payload.get("promotionCount") or 0)
        payload["promotionStale"] = True
        payload["promotionLastError"] = (
            f"BILLA-Aktionsimport lieferte nur {len(found)} sichere Produkte; "
            f"Mindestwert für einen erfolgreichen Lauf ist {MIN_EXPECTED_PROMOTIONS}."
        )
        write_payload(payload)
        write_status(True, payload["promotionLastError"], old_count)
        if old_count:
            print(
                f"WARNUNG: BILLA-Aktionsimport zu klein ({len(found)}); "
                f"alter Bestand ({old_count}) bleibt erhalten, wird aber als stale behandelt.",
                file=sys.stderr,
            )
            return 0
        print(payload["promotionLastError"], file=sys.stderr)
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
        clear_previous_actions(product)

    applied = 0
    unmapped = 0
    used_product_ids = set()

    for action in found.values():
        product = None
        for key in normalize_identifier(action.get("articleNumber")):
            if key in lookup:
                product = lookup[key]
                break

        if product is None:
            name = normalize_space(action.get("name"))
            candidates = name_lookup.get(name.casefold(), []) if name else []
            if len(candidates) == 1:
                product = candidates[0]

        if product is None:
            unmapped += 1
            continue

        product_id = str(product.get("retailerProductId") or product.get("remoteObjectId") or id(product))
        if product_id in used_product_ids:
            # Never overwrite a previously matched action for the same base product.
            continue
        used_product_ids.add(product_id)

        apply_action(product, action, observed_at)
        applied += 1

    if applied < MIN_EXPECTED_PROMOTIONS:
        payload["promotionStale"] = True
        payload["promotionLastError"] = (
            f"BILLA-Aktionsimport fand {len(found)} Karten, konnte aber nur {applied} Produkte "
            "sicher dem aktuellen BILLA-Bestand zuordnen."
        )
        write_payload(payload)
        write_status(True, payload["promotionLastError"], int(payload.get("promotionCount") or 0))
        print(payload["promotionLastError"], file=sys.stderr)
        return 1

    payload["promotionCount"] = applied
    payload["promotionUpdatedAt"] = observed_at
    payload["promotionSource"] = ACTION_URL
    payload["promotionStale"] = False
    payload["promotionLastError"] = None
    payload["promotionObservedAt"] = observed_at
    payload["promotionParserVersion"] = 3
    payload["promotionPageLimit"] = MAX_PAGES

    write_payload(payload)
    write_status(False, None, applied)

    print(
        f"BILLA-Aktionen: {applied} aktuelle Produkte sicher zugeordnet; "
        f"{unmapped} Aktionskarten konnten nicht sicher gemappt werden."
    )
    print(f"BILLA-Aktionsquelle: {ACTION_URL}")
    print(f"BILLA-Aktionsstand: {observed_at}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
