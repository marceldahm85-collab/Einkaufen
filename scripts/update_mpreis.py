#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import math
import sys
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "mpreis.json"
STATUS = ROOT / "data" / "update-status.json"

SOURCE_URL = "https://heisse-preise.io/data/latest-canonical.json"
MIN_EXPECTED_PRODUCTS = 100


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def number(value):
    try:
        n = float(value)
        return n if math.isfinite(n) else None
    except (TypeError, ValueError):
        return None


def fetch_json(url: str, attempts: int = 4):
    headers = {
        "Accept": "application/json",
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

    raise RuntimeError(f"Rohdaten-Abruf fehlgeschlagen: {last_error}")


def stable_fallback_id(item: dict) -> str:
    material = "|".join([
        str(item.get("store") or ""),
        str(item.get("name") or ""),
        str(item.get("quantity") or ""),
        str(item.get("unit") or ""),
        str(item.get("description") or ""),
    ])
    return "hp-" + hashlib.sha256(material.encode("utf-8")).hexdigest()[:20]


def normalize_unit(raw_unit):
    unit = str(raw_unit or "stk").strip().lower()

    mapping = {
        "stk": "Stk",
        "st": "Stk",
        "stück": "Stk",
        "pcs": "Stk",
        "pc": "Stk",
        "g": "g",
        "kg": "kg",
        "ml": "ml",
        "l": "l",
    }

    return mapping.get(unit, unit or "Stk")


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


def normalize_history(raw_history, current_price):
    result = []
    seen = set()

    for entry in raw_history or []:
        if not isinstance(entry, dict):
            continue

        date = str(entry.get("date") or "").strip()
        price = number(entry.get("price"))

        if not date or price is None:
            continue

        key = (date, round(price, 2))
        if key in seen:
            continue

        seen.add(key)
        result.append({"date": date, "price": round(price, 2)})

    # Heisse Preise documents newest-first. We normalize to oldest -> newest
    # inside the published file; the app can sort it as needed.
    result.sort(key=lambda x: x["date"])

    if not result and current_price is not None:
        result.append({
            "date": datetime.now(timezone.utc).date().isoformat(),
            "price": round(current_price, 2)
        })

    return result[-250:]


def normalize_item(item: dict):
    if str(item.get("store") or "").lower() != "mpreis":
        return None

    name = str(item.get("name") or "").strip()
    price = number(item.get("price"))

    if not name or price is None:
        return None

    quantity = number(item.get("quantity"))
    if quantity is None or quantity <= 0:
        quantity = 1.0

    unit = normalize_unit(item.get("unit"))

    raw_id = (
        item.get("id")
        or item.get("productId")
        or item.get("code")
        or item.get("sku")
    )

    product_id = str(raw_id).strip() if raw_id is not None else ""
    if not product_id:
        product_id = stable_fallback_id(item)

    description = str(item.get("description") or "").strip()

    history = normalize_history(item.get("priceHistory"), price)

    amount = int(quantity) if float(quantity).is_integer() else round(quantity, 3)

    return {
        "store": "mpreis",
        "remoteObjectId": product_id,
        "retailerProductId": product_id,
        "name": name,
        "description": description,
        "amount": amount,
        "unit": unit,
        "currentPrice": round(price, 2),
        "unitPrice": calc_unit_price(price, quantity, unit),
        "unitPriceUnit": base_unit(unit),
        "weighted": bool(item.get("isWeighted", False)),
        "bio": bool(item.get("bio", False)),
        "source": "heisse-preise.io (MPREIS)",
        "history": history,
    }


PROMOTION_FIELDS = (
    "regularPrice",
    "salePrice",
    "promotion",
    "promotionVerified",
    "promotionObservedAt",
    "validUntil",
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
    """Keep the last verified action until a fresh action pass can replace it."""
    if not isinstance(previous, dict) or previous.get("promotionVerified") is not True:
        return product

    for field in PROMOTION_FIELDS:
        if field in previous:
            product[field] = previous[field]

    # The previous unit price was calculated from the action price.
    if previous.get("salePrice") is not None:
        if previous.get("unitPrice") is not None:
            product["unitPrice"] = previous["unitPrice"]
        if previous.get("unitPriceUnit") is not None:
            product["unitPriceUnit"] = previous["unitPriceUnit"]

    return product


def load_existing_count() -> int:
    if not OUT.exists():
        return 0

    try:
        payload = json.loads(OUT.read_text(encoding="utf-8"))
        products = payload.get("products") or []
        return len(products) if isinstance(products, list) else 0
    except Exception:
        return 0


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
    payload["stores"]["mpreis"] = {
        "status": status,
        "productCount": product_count,
        "stale": bool(stale),
        "error": error,
        "provider": "heisse-preise.io",
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
            raise RuntimeError("Rohdaten haben nicht das erwartete Array-Format.")

        products = []
        skipped = 0

        for item in raw:
            if not isinstance(item, dict):
                continue

            if str(item.get("store") or "").lower() != "mpreis":
                continue

            normalized = normalize_item(item)

            if normalized is None:
                skipped += 1
                continue

            previous = None
            for key in (normalized.get("retailerProductId"), normalized.get("remoteObjectId")):
                if key and str(key) in existing_products:
                    previous = existing_products[str(key)]
                    break

            carry_forward_promotion(normalized, previous)
            products.append(normalized)

        products.sort(key=lambda p: (
            str(p["name"]).casefold(),
            str(p["retailerProductId"])
        ))

        if len(products) < MIN_EXPECTED_PRODUCTS:
            raise RuntimeError(
                f"Unplausibel wenige MPREIS-Produkte ({len(products)}). "
                "Vorhandene Daten werden nicht überschrieben."
            )

        payload = {
            "schemaVersion": 1,
            "importerVersion": 2,
            "store": "mpreis",
            "scope": "MPREIS-Daten aus Heisse Preise",
            "provider": "heisse-preise.io",
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

        print(
            f"MPREIS: {len(products)} Produkte importiert; "
            f"{skipped} MPREIS-Einträge übersprungen."
        )
        return 0

    except Exception as exc:
        # Sobald ein gültiger Datenbestand existiert, bleibt er bei einem
        # temporären Quellenfehler erhalten. Das ist für die App robuster.
        if existing_count >= MIN_EXPECTED_PRODUCTS:
            write_status(
                "stale",
                updated_at,
                existing_count,
                error=str(exc),
                stale=True,
            )
            print(
                f"WARNUNG: MPREIS konnte nicht aktualisiert werden. "
                f"Vorhandene {existing_count} Produkte bleiben aktiv. Fehler: {exc}",
                file=sys.stderr,
            )
            return 0

        # Beim allerersten Import darf der Workflow NICHT grün werden,
        # solange die öffentliche MPREIS-Datei noch leer ist.
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
