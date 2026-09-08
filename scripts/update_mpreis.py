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
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "mpreis.json"
STATUS = ROOT / "data" / "update-status.json"

MPREIS_BASE = "https://uzxors8tl2-dsn.algolia.net/1/indexes/prod_mpreis_8450/browse"
MPREIS_API_KEY = "6d27574257fd3a92542ff880585333f1"
MPREIS_APP_ID = "UZXORS8TL2"

UNITS = {
    "grm": ("g", 1.0),
    "kgm": ("g", 1000.0),
    "ltr": ("ml", 1000.0),
    "mlt": ("ml", 1.0),
    "mtr": ("m", 1.0),
    "anw": ("Stk", 1.0),
    "bl.": ("Stk", 1.0),
    "pkg": ("Stk", 1.0),
    "gr": ("g", 1.0),
    "er": ("Stk", 1.0),
}
FALLBACK_PACKAGING_CODES = {"xro", "h87", "hlt"}


def now_iso():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def today_vienna():
    return datetime.now(ZoneInfo("Europe/Vienna")).date().isoformat()


def number(value):
    try:
        n = float(value)
        return n if math.isfinite(n) else None
    except (TypeError, ValueError):
        return None


def deep_get(obj, *path, default=None):
    cur = obj
    for key in path:
        if not isinstance(cur, dict):
            return default
        cur = cur.get(key)
        if cur is None:
            return default
    return cur


def request_json(url, attempts=4):
    headers = {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 PreisPilot-Osttirol-GitHubAction/1.0",
    }
    error = None

    for attempt in range(attempts):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=60) as response:
                return json.load(response)
        except Exception as exc:
            error = exc
            if attempt + 1 < attempts:
                time.sleep(2 ** attempt)

    raise RuntimeError(f"MPREIS-Abruf fehlgeschlagen: {error}")


def fetch_all_hits():
    hits = []
    cursor = None
    page = 0

    while True:
        params = {
            "X-Algolia-API-Key": MPREIS_API_KEY,
            "X-Algolia-Application-Id": MPREIS_APP_ID,
            "X-Algolia-Agent": "Vue.js",
        }
        if cursor:
            params["cursor"] = cursor

        url = MPREIS_BASE + "?" + urllib.parse.urlencode(params)
        payload = request_json(url)
        page_hits = payload.get("hits") or []

        if not isinstance(page_hits, list):
            raise RuntimeError("Ungültige MPREIS-Trefferliste.")

        hits.extend(page_hits)
        cursor = payload.get("cursor")
        page += 1
        print(f"MPREIS Seite {page}: +{len(page_hits)}")

        if not cursor:
            break
        if page > 120:
            raise RuntimeError("MPREIS-Import nach 120 Seiten abgebrochen.")

    return hits


def first_name(raw):
    name = raw.get("name")
    if isinstance(name, list):
        return str(name[0]).strip() if name else ""
    return str(name or "").strip()


def parse_packaging(value):
    text = str(value or "").replace(",", ".")
    match = re.search(r"(\d+(?:\.\d+)?)\s*(kg|g|l|ml|stk|stück)\b", text, re.I)
    if not match:
        return None

    amount = float(match.group(1))
    unit = match.group(2).lower()
    if unit in {"stk", "stück"}:
        unit = "Stk"
    return amount, unit


def base_unit(unit):
    if unit in {"g", "kg"}:
        return "kg"
    if unit in {"ml", "l"}:
        return "l"
    return "Stk"


def calc_unit_price(price, amount, unit):
    if price is None or amount is None or amount <= 0:
        return None
    if unit == "g":
        return round(price / (amount / 1000.0), 2)
    if unit == "ml":
        return round(price / (amount / 1000.0), 2)
    if unit in {"kg", "l", "Stk"}:
        return round(price / amount, 2)
    return None


def normalize_hit(raw):
    name = first_name(raw)
    prices = raw.get("prices") or []
    if not name or not prices or not isinstance(prices[0], dict):
        return None

    price_record = prices[0]
    presentation = price_record.get("presentationPrice") or {}
    measurement = presentation.get("measurementUnit") or {}

    quantity = number(measurement.get("quantity"))
    unit_code = str(measurement.get("unitCode") or "").lower()
    unit, factor = UNITS.get(unit_code, ("Stk", 1.0))

    if unit_code in FALLBACK_PACKAGING_CODES:
        parsed = parse_packaging(deep_get(raw, "mixins", "productCustomAttributes", "packagingUnit"))
        if parsed:
            quantity, unit = parsed
            factor = 1.0

    if quantity is None:
        quantity = 1.0

    amount = quantity * factor
    weighted = str(
        deep_get(raw, "mixins", "productCustomAttributes", "packagingDescription", default="") or ""
    ).startswith("Gewichtsware")

    price = number(price_record.get("effectiveAmount") if weighted else presentation.get("effectiveAmount"))
    if price is None:
        price = number(presentation.get("effectiveAmount") or price_record.get("effectiveAmount"))
    if price is None:
        return None

    remote_id = str(raw.get("objectID") or raw.get("code") or "").strip()
    retailer_id = str(raw.get("code") or raw.get("objectID") or "").strip()
    if not remote_id or not retailer_id:
        return None

    properties = deep_get(raw, "mixins", "mpreisAttributes", "properties", default=[]) or []
    bio = isinstance(properties, list) and "BIO" in properties

    description = str(
        deep_get(raw, "mixins", "productCustomAttributes", "longDescription", default="") or ""
    ).strip()

    return {
        "store": "mpreis",
        "remoteObjectId": remote_id,
        "retailerProductId": retailer_id,
        "name": name,
        "description": description,
        "amount": int(amount) if float(amount).is_integer() else round(amount, 3),
        "unit": unit,
        "currentPrice": round(price, 2),
        "unitPrice": calc_unit_price(price, amount, unit),
        "unitPriceUnit": base_unit(unit),
        "weighted": bool(weighted),
        "bio": bool(bio),
        "source": "mpreis.at",
        "productUrl": f"https://www.mpreis.at/shop/p/{retailer_id}",
    }


def load_previous():
    if not OUT.exists():
        return {}
    try:
        payload = json.loads(OUT.read_text(encoding="utf-8"))
    except Exception:
        return {}

    result = {}
    for item in payload.get("products", []):
        key = str(item.get("remoteObjectId") or item.get("retailerProductId") or "")
        if key:
            result[key] = item
    return result


def merge_history(item, previous, today):
    history = []
    if previous and isinstance(previous.get("history"), list):
        for entry in previous["history"]:
            p = number(entry.get("price"))
            date = entry.get("date")
            if date and p is not None:
                history.append({"date": str(date), "price": round(p, 2)})

    history.sort(key=lambda x: x["date"])
    current = item["currentPrice"]

    if not history:
        history.append({"date": today, "price": current})
    elif history[-1]["date"] == today:
        history[-1]["price"] = current
    elif history[-1]["price"] != current:
        history.append({"date": today, "price": current})

    item["history"] = history[-250:]


def write_status(ok, updated_at, product_count=0, error=None):
    STATUS.write_text(
        json.dumps({
            "schemaVersion": 1,
            "updatedAt": updated_at,
            "stores": {
                "mpreis": {
                    "status": "ok" if ok else "error",
                    "productCount": product_count,
                    "error": error,
                }
            },
        }, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    updated_at = now_iso()
    today = today_vienna()

    try:
        raw_hits = fetch_all_hits()
        previous = load_previous()

        products = []
        skipped = 0

        for raw in raw_hits:
            item = normalize_hit(raw)
            if not item:
                skipped += 1
                continue
            merge_history(item, previous.get(item["remoteObjectId"]), today)
            products.append(item)

        products.sort(key=lambda p: (p["name"].casefold(), p["retailerProductId"]))

        if len(products) < 100:
            raise RuntimeError(f"Unplausibel wenige MPREIS-Produkte: {len(products)}")

        payload = {
            "schemaVersion": 1,
            "importerVersion": 1,
            "store": "mpreis",
            "scope": "MPREIS Online-Produktindex",
            "updatedAt": updated_at,
            "productCount": len(products),
            "skippedCount": skipped,
            "products": products,
        }

        temp = OUT.with_suffix(".json.tmp")
        temp.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        temp.replace(OUT)

        write_status(True, updated_at, len(products))
        print(f"MPREIS: {len(products)} Produkte gespeichert; {skipped} übersprungen.")
        return 0

    except Exception as exc:
        write_status(False, updated_at, 0, str(exc))
        print(f"FEHLER: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
