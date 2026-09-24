import importlib.util
from pathlib import Path

path = Path(__file__).with_name("update_hofer.py")
spec = importlib.util.spec_from_file_location("update_hofer", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

raw = {
    "store": "hofer",
    "id": "000000000000107104",
    "name": "MILSANI Butter, laktosefrei",
    "price": 1.99,
    "priceHistory": [
        {"date": "2026-09-23", "price": 1.99},
        {"date": "2026-09-01", "price": 2.49},
    ],
    "unit": "kg",
    "quantity": 0.25,
    "bio": False,
}

item = mod.normalize_item(raw)
assert item is not None
assert item["store"] == "hofer"
assert item["retailerProductId"] == "000000000000107104"
assert item["currentPrice"] == 1.99
assert item["amount"] == 0.25
assert item["unit"] == "kg"
assert item["unitPrice"] == 7.96
assert item["unitPriceUnit"] == "kg"
assert item["history"][0]["date"] == "2026-09-01"
assert item["history"][-1]["date"] == "2026-09-23"

fallback = {
    "store": "hofer",
    "name": "Produkt ohne ID",
    "price": 2.49,
    "quantity": 500,
    "unit": "g",
}
fallback_item = mod.normalize_item(fallback)
assert fallback_item["retailerProductId"].startswith("hp-")
assert fallback_item["unitPrice"] == 4.98

assert mod.normalize_item({"store": "billa", "name": "X", "price": 1.0}) is None

print("HOFER base importer tests OK")
