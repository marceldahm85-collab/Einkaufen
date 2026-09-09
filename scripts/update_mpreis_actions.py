#!/usr/bin/env python3
from __future__ import annotations

import html
import json
import math
import re
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "mpreis.json"
STATUS_PATH = ROOT / "data" / "update-status.json"

ACTION_URL = "https://www.mpreis.at/aktionen/aktuell/alle-produkte-in-aktion"
MAX_PAGES = 40
MIN_PROMOTIONS_FOR_SUCCESS = 10


def now_iso():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def today_iso():
    return datetime.now(timezone.utc).date().isoformat()


def number(value):
    try:
        n = float(str(value).replace(",", "."))
        return n if math.isfinite(n) else None
    except (TypeError, ValueError):
        return None


def norm(value):
    value = html.unescape(str(value or ""))
    value = value.casefold()
    value = re.sub(r"\s+", " ", value)
    value = re.sub(r"[^\wäöüß]+", " ", value, flags=re.UNICODE)
    return value.strip()


def fetch_text(url, attempts=4):
    headers = {
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "de-AT,de;q=0.9",
        "User-Agent": "Mozilla/5.0 PreisPilot-Osttirol-GitHubAction/1.0",
    }

    last_error = None

    for attempt in range(attempts):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=60) as response:
                raw = response.read()
                charset = response.headers.get_content_charset() or "utf-8"
                return raw.decode(charset, errors="replace")
        except Exception as exc:
            last_error = exc
            if attempt + 1 < attempts:
                time.sleep(2 ** attempt)

    raise RuntimeError(f"MPREIS-Aktionsseite nicht abrufbar: {last_error}")


class Node:
    __slots__ = ("tag", "attrs", "parent", "children", "text_parts")

    def __init__(self, tag="", attrs=None, parent=None):
        self.tag = tag
        self.attrs = dict(attrs or [])
        self.parent = parent
        self.children = []
        self.text_parts = []

    def full_text(self):
        parts = []
        self._collect(parts)
        return " ".join(" ".join(parts).split())

    def _collect(self, parts):
        parts.extend(self.text_parts)
        for child in self.children:
            child._collect(parts)


class MiniDOMParser(HTMLParser):
    VOID = {
        "area", "base", "br", "col", "embed", "hr", "img", "input",
        "link", "meta", "param", "source", "track", "wbr"
    }

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node("root")
        self.stack = [self.root]
        self.anchors = []

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        node = Node(tag, attrs, self.stack[-1])
        self.stack[-1].children.append(node)

        if tag == "a":
            self.anchors.append(node)

        if tag not in self.VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if self.stack[-1].tag == tag.lower() and tag.lower() not in self.VOID:
            self.stack.pop()

    def handle_endtag(self, tag):
        tag = tag.lower()
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                del self.stack[i:]
                return

    def handle_data(self, data):
        text = " ".join(str(data).split())
        if text:
            self.stack[-1].text_parts.append(text)


def parse_card_text(text):
    # Example:
    # "Aktueller Preis 1,49 €, statt 2,49 € Ab 2 Stk. je 1,49 ... ab 2 billiger NUR MIT APP"
    price_match = re.search(
        r"Aktueller\s+Preis\s+(\d+(?:[.,]\d+)?)\s*€\s*,?\s*statt\s+(\d+(?:[.,]\d+)?)\s*€",
        text,
        flags=re.I,
    )

    if not price_match:
        return None

    sale_price = number(price_match.group(1))
    regular_price = number(price_match.group(2))

    if sale_price is None or regular_price is None:
        return None

    quantity_match = re.search(r"\b(Ab|Bei)\s+(\d+)\s*Stk\.?", text, flags=re.I)
    bundle_match = re.search(r"\b(\d+)\s*\+\s*(\d+)\s*gratis\b", text, flags=re.I)
    percent_match = re.search(r"-(\d{1,2})\s*%", text)
    app_only = bool(re.search(r"\bNUR\s+MIT\s+APP\b", text, flags=re.I))

    discount_percent = None
    if percent_match:
        discount_percent = int(percent_match.group(1))
    elif regular_price > 0 and sale_price < regular_price:
        discount_percent = round((1 - sale_price / regular_price) * 100)

    promotion = {
        "type": "price_drop",
        "verified": True,
        "source": "mpreis.at",
        "loyaltyRequired": app_only,
        "loyaltyProgram": "MPREIS App" if app_only else None,
        "discountPercent": discount_percent,
    }

    if bundle_match:
        paid = int(bundle_match.group(1))
        free = int(bundle_match.group(2))
        promotion.update({
            "type": "bundle",
            "paidQuantity": paid,
            "freeQuantity": free,
            "requiredQuantity": paid + free,
            "label": f"{paid}+{free} gratis",
        })
    elif quantity_match:
        required = int(quantity_match.group(2))
        word = quantity_match.group(1).casefold()
        promotion.update({
            "type": "quantity",
            "requiredQuantity": required,
            "label": f"{'ab' if word == 'ab' else 'bei'} {required} Stück",
        })
    elif discount_percent is not None:
        promotion.update({
            "type": "percentage",
            "label": f"-{discount_percent} %",
        })
    else:
        promotion["label"] = "Preis gesenkt"

    # Keep JSON clean.
    promotion = {k: v for k, v in promotion.items() if v is not None}

    return {
        "regularPrice": round(regular_price, 2),
        "salePrice": round(sale_price, 2),
        "promotion": promotion,
        "rawText": text,
    }


def extract_candidate_id(href):
    href = str(href or "")
    match = re.search(r"/shop/p/([^/?#]+)", href)
    if not match:
        return None

    segment = urllib.parse.unquote(match.group(1)).strip()
    if not segment:
        return None

    return segment


def find_smallest_promo_ancestor(anchor):
    node = anchor
    best = None

    for _ in range(10):
        if node is None:
            break

        text = node.full_text()

        if "Aktueller Preis" in text and "statt" in text:
            count = len(re.findall(r"Aktueller\s+Preis", text, flags=re.I))
            if count == 1:
                best = (node, text)
                break

        node = node.parent

    return best


def extract_promotions(page_html, products_by_id, products_by_name):
    parser = MiniDOMParser()
    parser.feed(page_html)

    found = {}

    for anchor in parser.anchors:
        href = anchor.attrs.get("href")
        candidate_id = extract_candidate_id(href)

        ancestor = find_smallest_promo_ancestor(anchor)
        if not ancestor:
            continue

        _, card_text = ancestor
        promo = parse_card_text(card_text)
        if not promo:
            continue

        product = None

        if candidate_id:
            product = products_by_id.get(candidate_id)

            # Some URLs may append a slug or other text. Prefer a unique
            # canonical ID found inside the last path segment.
            if product is None:
                id_matches = [
                    p for pid, p in products_by_id.items()
                    if pid and pid in candidate_id
                ]
                if len(id_matches) == 1:
                    product = id_matches[0]

        if product is None:
            anchor_name = norm(anchor.full_text())
            if anchor_name:
                candidates = products_by_name.get(anchor_name) or []
                if len(candidates) == 1:
                    product = candidates[0]

        if product is None:
            continue

        product_id = str(product.get("retailerProductId") or product.get("remoteObjectId") or "")
        if not product_id:
            continue

        found[product_id] = promo

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
        return json.loads(STATUS_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {"schemaVersion": 1, "updatedAt": None, "stores": {}}


def save_status(status):
    STATUS_PATH.write_text(
        json.dumps(status, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def set_promo_status(state, count=0, error=None, pages=0):
    status = load_status()
    status.setdefault("stores", {}).setdefault("mpreis", {})
    status["stores"]["mpreis"]["promotions"] = {
        "status": state,
        "verifiedCount": count,
        "pagesChecked": pages,
        "updatedAt": now_iso(),
        "error": error,
        "source": "mpreis.at",
    }
    save_status(status)


def main():
    if not DATA_PATH.exists():
        print("WARNUNG: data/mpreis.json fehlt; Aktionsimport übersprungen.", file=sys.stderr)
        set_promo_status("error", error="data/mpreis.json fehlt")
        return 0

    payload = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    products = payload.get("products") or []

    if not products:
        print("WARNUNG: Keine MPREIS-Produkte; Aktionsimport übersprungen.", file=sys.stderr)
        set_promo_status("error", error="Keine MPREIS-Produkte")
        return 0

    products_by_id = {}
    products_by_name = {}

    for product in products:
        for key in (product.get("retailerProductId"), product.get("remoteObjectId")):
            if key:
                products_by_id[str(key)] = product

        name_key = norm(product.get("name"))
        if name_key:
            products_by_name.setdefault(name_key, []).append(product)

    all_promotions = {}
    pages_checked = 0
    empty_pages = 0

    try:
        for page in range(MAX_PAGES):
            url = ACTION_URL if page == 0 else f"{ACTION_URL}?currentPage={page}&step=0"
            source = fetch_text(url)
            page_promos = extract_promotions(source, products_by_id, products_by_name)

            before = len(all_promotions)
            all_promotions.update(page_promos)
            added = len(all_promotions) - before
            pages_checked += 1

            print(f"MPREIS Aktionen Seite {page}: {len(page_promos)} erkannt, {added} neu")

            if added == 0:
                empty_pages += 1
            else:
                empty_pages = 0

            # The page is lazy-loaded/paginated. Two consecutive pages with no
            # new products are enough to stop without hammering the site.
            if page >= 1 and empty_pages >= 2:
                break

            time.sleep(0.2)

        if len(all_promotions) < MIN_PROMOTIONS_FOR_SUCCESS:
            raise RuntimeError(
                f"Zu wenige eindeutig erkannte Aktionen ({len(all_promotions)}). "
                "Grundpreise bleiben unverändert."
            )

        verified = 0

        for product in products:
            pid = str(product.get("retailerProductId") or product.get("remoteObjectId") or "")
            promo = all_promotions.get(pid)

            # Base import creates a fresh file every run, but explicitly clear
            # these keys before enrichment for deterministic output.
            product.pop("regularPrice", None)
            product.pop("salePrice", None)
            product.pop("promotion", None)
            product.pop("promotionVerified", None)
            product.pop("promotionObservedAt", None)

            if not promo:
                product["regularPrice"] = product.get("currentPrice")
                product["salePrice"] = None
                continue

            sale = promo["salePrice"]
            regular = promo["regularPrice"]

            # Official action page wins for the current promoted price.
            product["currentPrice"] = sale
            product["regularPrice"] = regular
            product["salePrice"] = sale
            product["promotion"] = promo["promotion"]
            product["promotionVerified"] = True
            product["promotionObservedAt"] = now_iso()

            update_unit_price(product)
            merge_history_today(product, sale)
            verified += 1

        payload["promotionCount"] = verified
        payload["promotionUpdatedAt"] = now_iso()
        payload["promotionSource"] = "mpreis.at"
        payload["promotionStale"] = False
        payload.pop("promotionLastError", None)

        temp = DATA_PATH.with_suffix(".json.tmp")
        temp.write_text(
            json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n",
            encoding="utf-8",
        )
        temp.replace(DATA_PATH)

        set_promo_status("ok", count=verified, pages=pages_checked)
        print(f"MPREIS: {verified} offizielle Aktionen verifiziert.")
        return 0

    except Exception as exc:
        # Promotions are supplementary. The base importer deliberately carries
        # the last verified action fields forward. If this refresh fails, keep
        # those actions instead of silently deleting them.
        preserved = sum(
            1 for product in products
            if isinstance(product, dict) and product.get("promotionVerified") is True
        )

        payload["promotionCount"] = preserved
        payload["promotionStale"] = True
        payload["promotionLastError"] = str(exc)

        temp = DATA_PATH.with_suffix(".json.tmp")
        temp.write_text(
            json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n",
            encoding="utf-8",
        )
        temp.replace(DATA_PATH)

        set_promo_status(
            "stale",
            count=preserved,
            error=str(exc),
            pages=pages_checked,
        )
        print(
            f"WARNUNG: MPREIS-Aktionen konnten nicht aktualisiert werden. "
            f"{preserved} zuletzt verifizierte Aktionen bleiben erhalten. Fehler: {exc}",
            file=sys.stderr,
        )
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
