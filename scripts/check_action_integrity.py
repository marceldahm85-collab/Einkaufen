#!/usr/bin/env python3
from __future__ import annotations

import json
import math
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
TODAY = datetime.now(ZoneInfo("Europe/Vienna")).date().isoformat()

FILES = {
    "mpreis": DATA_DIR / "mpreis.json",
    "spar": DATA_DIR / "spar.json",
    "tg": DATA_DIR / "tg.json",
}


def finite_number(value):
    if value is None:
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def current_by_date(item):
    valid_from = str(item.get("validFrom") or "")[:10]
    valid_until = str(item.get("validUntil") or "")[:10]
    if valid_from and TODAY < valid_from:
        return False
    if valid_until and TODAY > valid_until:
        return False
    return True


def check_store(store, path):
    errors = []
    warnings = []

    if not path.exists():
        return [f"{store}: Datei fehlt: {path}"], warnings, None

    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        return [f"{store}: JSON kann nicht gelesen werden: {exc}"], warnings, None

    products = payload.get("products") or []
    if not isinstance(products, list):
        return [f"{store}: products ist keine Liste"], warnings, payload

    promotion_types = Counter()
    current_types = Counter()
    active_fixed_price = 0
    optimizer_eligible = 0

    for index, item in enumerate(products):
        if not isinstance(item, dict):
            errors.append(f"{store}[{index}]: Produkt ist kein Objekt")
            continue

        name = str(item.get("name") or "").strip()
        label = name or f"#{index}"

        for field in ("regularPrice", "salePrice", "displayPrice", "unitPrice"):
            value = item.get(field)
            if value is None:
                continue
            number = finite_number(value)
            if number is None:
                errors.append(f"{store} {label}: {field} ist keine endliche Zahl")
            elif number < 0:
                errors.append(f"{store} {label}: {field} ist negativ")

        valid_from = str(item.get("validFrom") or "")[:10]
        valid_until = str(item.get("validUntil") or "")[:10]
        if valid_from and valid_until and valid_from > valid_until:
            errors.append(
                f"{store} {label}: validFrom {valid_from} liegt nach validUntil {valid_until}"
            )

        promotion = item.get("promotion")
        if not isinstance(promotion, dict):
            promotion = None

        if promotion:
            ptype = str(promotion.get("type") or "unknown")
            promotion_types[ptype] += 1
            if current_by_date(item):
                current_types[ptype] += 1

            required = promotion.get("requiredQuantity")
            if ptype in {"quantity", "bundle"}:
                try:
                    required_num = int(required)
                except (TypeError, ValueError):
                    required_num = 0
                if required_num < 2:
                    errors.append(
                        f"{store} {label}: {ptype} benötigt requiredQuantity >= 2"
                    )

            if ptype == "bundle":
                paid = promotion.get("paidQuantity")
                free = promotion.get("freeQuantity")
                if paid is not None or free is not None:
                    try:
                        paid_num = int(paid)
                        free_num = int(free)
                        required_num = int(required)
                    except (TypeError, ValueError):
                        errors.append(
                            f"{store} {label}: Bundle-Mengen sind nicht ganzzahlig"
                        )
                    else:
                        if paid_num < 1 or free_num < 1:
                            errors.append(
                                f"{store} {label}: Bundle benötigt positive paid/freeQuantity"
                            )
                        if paid_num + free_num != required_num:
                            errors.append(
                                f"{store} {label}: paidQuantity + freeQuantity != requiredQuantity"
                            )

            if ptype == "percentage" and promotion.get("discountPercent") is not None:
                discount = finite_number(promotion.get("discountPercent"))
                if discount is None or not (0 < discount < 100):
                    errors.append(
                        f"{store} {label}: ungültiger discountPercent"
                    )

        sale = finite_number(item.get("salePrice"))
        if (
            item.get("promotionVerified") is True
            and sale is not None
            and current_by_date(item)
        ):
            active_fixed_price += 1

        if item.get("optimizerEligible") is True:
            optimizer_eligible += 1
            if sale is None:
                errors.append(
                    f"{store} {label}: optimizerEligible=true ohne salePrice"
                )
            if promotion and promotion.get("type") in {"flyer", "category"}:
                errors.append(
                    f"{store} {label}: unsicherer Aktionstyp darf nicht optimizerEligible sein"
                )

    if payload.get("promotionStale") is True:
        warnings.append(
            f"{store}: promotionStale=true – Frontend muss die Aktionspreise deaktivieren"
        )

    summary = {
        "products": len(products),
        "promotionTypes": dict(promotion_types),
        "currentPromotionTypes": dict(current_types),
        "activeFixedPricePromotions": active_fixed_price,
        "optimizerEligible": optimizer_eligible,
        "promotionStale": bool(payload.get("promotionStale")),
    }

    return errors, warnings, summary


def main():
    all_errors = []
    all_warnings = []

    print(f"=== AKTIONSDATEN-INTEGRITÄT ({TODAY}, Europe/Vienna) ===")

    for store, path in FILES.items():
        errors, warnings, summary = check_store(store, path)
        all_errors.extend(errors)
        all_warnings.extend(warnings)

        if summary:
            print(
                f"{store.upper()}: {summary['products']} Produkte | "
                f"Aktionsarten={summary['promotionTypes']} | "
                f"heute={summary['currentPromotionTypes']} | "
                f"aktive Fixpreis-Aktionen={summary['activeFixedPricePromotions']} | "
                f"optimizerEligible={summary['optimizerEligible']}"
            )

    for warning in all_warnings:
        print(f"WARNUNG: {warning}")

    if all_errors:
        print("\nFEHLER IN AKTIONSDATEN:", file=sys.stderr)
        for error in all_errors[:100]:
            print(f"- {error}", file=sys.stderr)
        if len(all_errors) > 100:
            print(f"- … {len(all_errors) - 100} weitere Fehler", file=sys.stderr)
        return 1

    print("Aktionsdaten-Integrität: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
