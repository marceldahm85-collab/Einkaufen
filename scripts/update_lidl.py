#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import math
import re
import sys
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "lidl.json"
STATUS = ROOT / "data" / "update-status.json"

# Lidl Austria's current public product endpoint is also the source used by
# the upstream Heisse-Preise Lidl adapter.
SOURCE_BASE_URL = "https://www.lidl.at/p/api/gridboxes/AT/de/"
SOURCE_URL = SOURCE_BASE_URL + "?max=31000"
MIN_EXPECTED_PRODUCTS = 100


def now_iso() -> str:
    return (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )


def number(value):
    try:
        n = float(value)
        return n if math.isfinite(n) else None
    except (TypeError, ValueError):
        return None


def fetch_json(url: str, attempts: int = 4):
    headers = {
        "Accept": "application/json",
        "Accept-Language": "de-AT,de;q=0.9",
        "User-Agent": "Mozilla/5.0 PreisPilot-Osttirol-GitHubAction/1.0",
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

    raise RuntimeError(f"LIDL-Rohdaten-Abruf fehlgeschlagen: {last_error}")


GLOBAL_UNITS = {
    "stk.": ("Stk", 1),
    "stk": ("Stk", 1),
    "st": ("Stk", 1),
    "stück": ("Stk", 1),
    "pcs": ("Stk", 1),
    "pc": ("Stk", 1),
    "dosen": ("Stk", 1),
    "dose": ("Stk", 1),
    "flasche": ("Stk", 1),
    "flaschen": ("Stk", 1),
    "pkg.": ("Stk", 1),
    "pkg": ("Stk", 1),
    "g": ("g", 1),
    "gr": ("g", 1),
    "gramm": ("g", 1),
    "dag": ("g", 10),
    "kg": ("g", 1000),
    "kilogramm": ("g", 1000),
    "ml": ("ml", 1),
    "milliliter": ("ml", 1),
    "dl": ("ml", 10),
    "cl": ("ml", 100),
    "l": ("ml", 1000),
    "lt": ("ml", 1000),
    "liter": ("ml", 1000),
}

STORE_UNITS = {
    "": ("Stk", 1),
}


def parse_base_price_text(base_price_text):
    """
    Mirrors the current upstream Heisse-Preise Lidl parser:
    - 'per kg' is treated as 1 kg weighted goods
    - quantity multipliers such as 6x500ml are multiplied
    - 'bei N je ...' and 'ab N ...' prefixes are removed before parsing
    """
    text = str(base_price_text or "").strip().split("(")[0]
    text = text.replace(",", ".").strip().lower()

    if text == "per kg":
        return 1.0, "kg", True

    if text.startswith("bei") and "je " in text:
        text = text[text.find("je "):]

    for prefix in ("ab ", "je ", "ca. ", "z.b.: ", "z.b. "):
        text = text.replace(prefix, "", 1).strip()

    match = re.match(r"^([0-9.x ]+)(.*)$", text)
    if not match:
        return 1.0, "", False

    quantity = 1.0
    for part in match.group(1).split("x"):
        value = number(part.split("/")[0].strip())
        if value is None or value <= 0:
            return 1.0, "", False
        quantity *= value

    unit = match.group(2).split("/")[0].strip().split(" ")[0]
    unit = unit.split("-")[0].strip()

    return quantity, unit, False


def convert_unit(quantity, unit):
    key = str(unit or "").strip().lower()
    if key in GLOBAL_UNITS:
        canonical, factor = GLOBAL_UNITS[key]
        return quantity * factor, canonical

    if key in STORE_UNITS:
        canonical, factor = STORE_UNITS[key]
        return quantity * factor, canonical

    return quantity, str(unit or "").strip()


def base_unit(unit: str) -> str:
    if unit in {"g", "kg"}:
        return "kg"
    if unit in {"ml", "l"}:
        return "l"
    return "Stk"


def calc_unit_price(price, quantity, unit):
    price = number(price)
    quantity = number(quantity)
    if price is None or quantity is None or quantity <= 0:
        return None

    if unit == "g":
        return round(price / (quantity / 1000.0), 2)
    if unit == "kg":
        return round(price / quantity, 2)
    if unit == "ml":
        return round(price / (quantity / 1000.0), 2)
    if unit == "l":
        return round(price / quantity, 2)
    if unit == "Stk":
        return round(price / quantity, 2)
    return None


def stable_fallback_id(item: dict) -> str:
    material = "|".join(
        [
            str(item.get("productId") or ""),
            str(item.get("fullTitle") or ""),
            str(item.get("canonicalUrl") or ""),
            str(item.get("price", {}).get("price") if isinstance(item.get("price"), dict) else ""),
        ]
    )
    return "lidl-" + hashlib.sha256(material.encode("utf-8")).hexdigest()[:20]


def normalize_history(raw_history):
    result = []
    seen = set()

    for entry in raw_history or []:
        if not isinstance(entry, dict):
            continue
        date = str(entry.get("date") or "").strip()[:10]
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
    history = normalize_history(
        previous.get("history") if isinstance(previous, dict) else []
    )
    previous_price = (
        number(previous.get("currentPrice")) if isinstance(previous, dict) else None
    )

    if previous_price is not None and current_price is not None:
        if abs(previous_price - current_price) >= 0.005:
            history.append(
                {
                    "date": str(previous.get("updatedAt") or updated_at)[:10],
                    "price": round(previous_price, 2),
                }
            )

    if current_price is not None:
        history.append(
            {"date": updated_at[:10], "price": round(current_price, 2)}
        )

    dedup = {(row["date"], row["price"]): row for row in history}
    return sorted(dedup.values(), key=lambda row: row["date"])[-250:]


def normalize_official_item(item: dict, today: str):
    if not isinstance(item, dict):
        return None

    price_obj = item.get("price")
    if not isinstance(price_obj, dict):
        return None

    current_price = number(price_obj.get("price"))
    if current_price is None or current_price < 0:
        return None

    full_title = str(item.get("fullTitle") or "").strip()
    keyfacts = item.get("keyfacts")
    if not isinstance(keyfacts, dict):
        keyfacts = {}

    supplemental = str(keyfacts.get("supplementalDescription") or "").strip()
    description = str(keyfacts.get("description") or "").strip()

    if supplemental:
        name = f"{supplemental} {full_title}".strip()
    else:
        name = full_title

    if not name:
        return None

    base_text = ""
    base_price_obj = price_obj.get("basePrice")
    if isinstance(base_price_obj, dict):
        base_text = base_price_obj.get("text") or ""

    raw_quantity, raw_unit, weighted = parse_base_price_text(base_text)
    quantity, unit = convert_unit(raw_quantity, raw_unit)

    product_id = str(item.get("productId") or "").strip()
    if not product_id:
        product_id = stable_fallback_id(item)

    known_measure = (
        number(quantity) is not None
        and quantity > 0
        and unit in {"Stk", "g", "kg", "ml", "l"}
    )

    return {
        "store": "lidl",
        "remoteObjectId": product_id,
        "retailerProductId": product_id,
        "name": name,
        "description": description,
        "amount": (
            int(quantity) if float(quantity).is_integer() else round(quantity, 6)
        ),
        "unit": unit,
        "amountKnown": known_measure,
        "optimizerEligible": known_measure,
        "currentPrice": round(current_price, 2),
        "unitPrice": calc_unit_price(current_price, quantity, unit),
        "unitPriceUnit": base_unit(unit),
        "weighted": bool(weighted),
        "bio": "bio" in name.lower(),
        "productUrl": str(item.get("canonicalUrl") or "").strip() or None,
        "source": "lidl.at/p/api/gridboxes",
        "history": [{"date": today, "price": round(current_price, 2)}],
    }


# Backward-compatible test helper.
def normalize_item(item: dict):
    return normalize_official_item(item, datetime.now(timezone.utc).date().isoformat())


PROMOTION_FIELDS = (
    "regularPrice",
    "salePrice",
    "promotion",
    "promotionVerified",
    "promotionObservedAt",
    "validUntil",
    "validFrom",
    "promotionProductUrl",
    "promotionSource",
    "promotionOfficialLabel",
)


def load_existing_payload():
    if not OUT.exists():
        return None

    try:
        payload = json.loads(OUT.read_text(encoding="utf-8"))
        return payload if isinstance(payload, dict) else None
    except Exception:
        return None


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


def carry_forward_promotion(product, previous):
    if not isinstance(previous, dict) or previous.get("promotionVerified") is not True:
        return product

    for field in PROMOTION_FIELDS:
        if field in previous:
            product[field] = previous[field]

    if previous.get("salePrice") is not None:
        price = number(previous.get("salePrice"))
        if price is not None:
            calculated = calc_unit_price(
                price, product.get("amount"), product.get("unit")
            )
            if calculated is not None:
                product["unitPrice"] = calculated
                product["unitPriceUnit"] = base_unit(product.get("unit"))

    return product


def load_existing_count() -> int:
    payload = load_existing_payload()
    if not payload:
        return 0
    products = payload.get("products") or []
    return len(products) if isinstance(products, list) else 0


def load_status():
    try:
        payload = json.loads(STATUS.read_text(encoding="utf-8"))
        if isinstance(payload, dict):
            return payload
    except Exception:
        pass

    return {"schemaVersion": 1, "updatedAt": None, "stores": {}}


def write_status(status: str, updated_at: str, product_count: int, error=None, stale=False):
    payload = load_status()
    payload["schemaVersion"] = 1
    payload["updatedAt"] = updated_at
    payload.setdefault("stores", {})
    payload["stores"]["lidl"] = {
        "status": status,
        "productCount": int(product_count),
        "stale": bool(stale),
        "error": error,
        "provider": "lidl.at",
    }

    STATUS.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def main() -> int:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    updated_at = now_iso()
    existing_payload = load_existing_payload()
    existing_products = build_existing_product_map(existing_payload)
    existing_count = load_existing_count()

    try:
        raw = fetch_json(SOURCE_URL)

        if not isinstance(raw, list):
            raise RuntimeError("LIDL-Rohdaten haben nicht das erwartete Array-Format.")

        products = []
        skipped = 0

        for item in raw:
            normalized = normalize_official_item(
                item, updated_at[:10]
            )
            if normalized is None:
                skipped += 1
                continue

            previous = None
            for key in (
                normalized.get("retailerProductId"),
                normalized.get("remoteObjectId"),
            ):
                if key and str(key) in existing_products:
                    previous = existing_products[str(key)]
                    break

            normalized["history"] = update_history(
                previous or {},
                normalized["currentPrice"],
                updated_at,
            )
            carry_forward_promotion(normalized, previous)
            normalized["updatedAt"] = updated_at
            products.append(normalized)

        products.sort(
            key=lambda p: (
                str(p["name"]).casefold(),
                str(p["retailerProductId"]),
            )
        )

        if len(products) < MIN_EXPECTED_PRODUCTS:
            raise RuntimeError(
                f"Unplausibel wenige LIDL-Produkte ({len(products)}). "
                "Vorhandene Daten werden nicht überschrieben."
            )

        payload = {
            "schemaVersion": 1,
            "importerVersion": 3,
            "store": "lidl",
            "scope": "LIDL-Produktkatalog aus offizieller Lidl-API",
            "provider": "lidl.at",
            "providerUrl": SOURCE_URL,
            "updatedAt": updated_at,
            "productCount": len(products),
            "skippedCount": skipped,
            "products": products,
        }

        if isinstance(existing_payload, dict):
            for key in (
                "promotionCount",
                "promotionUpdatedAt",
                "promotionSource",
                "promotionStale",
                "promotionLastError",
            ):
                if key in existing_payload:
                    payload[key] = existing_payload[key]

        temp = OUT.with_suffix(".json.tmp")
        temp.write_text(
            json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n",
            encoding="utf-8",
        )
        temp.replace(OUT)

        write_status("ok", updated_at, len(products))

        eligible = sum(
            1 for item in products if item.get("optimizerEligible") is True
        )
        print(
            f"LIDL: {len(products)} Produkte importiert; "
            f"{eligible} mit sicher erkannter Gebindemenge; "
            f"{skipped} Einträge übersprungen."
        )
        return 0

    except Exception as exc:
        if existing_count >= MIN_EXPECTED_PRODUCTS:
            write_status(
                "stale",
                updated_at,
                existing_count,
                error=str(exc),
                stale=True,
            )
            print(
                f"WARNUNG: LIDL konnte nicht aktualisiert werden. "
                f"Vorhandene {existing_count} Produkte bleiben bestehen. Fehler: {exc}",
                file=sys.stderr,
            )
            return 0

        write_status(
            "error",
            updated_at,
            existing_count,
            error=str(exc),
            stale=False,
        )
        print(f"FEHLER: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
