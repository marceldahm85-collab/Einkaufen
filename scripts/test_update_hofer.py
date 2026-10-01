import importlib.util
from datetime import date
from pathlib import Path

path = Path(__file__).with_name("update_hofer.py")
spec = importlib.util.spec_from_file_location("update_hofer", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

raw = {
    "store": "hofer",
    "id": "12345",
    "name": "Test Milch",
    "price": 1.49,
    "priceHistory": [
        {"date": "2026-09-08", "price": 1.49},
        {"date": "2026-08-01", "price": 1.69},
    ],
    "unit": "l",
    "quantity": 1,
    "bio": True,
}

item = mod.normalize_item(raw)
assert item["retailerProductId"] == "12345"
assert item["currentPrice"] == 1.49
assert item["unitPrice"] == 1.49
assert item["history"][0]["date"] == "2026-08-01"
assert item["history"][-1]["date"] == "2026-09-08"

fallback = mod.normalize_item({
    "store": "hofer",
    "name": "Produkt ohne ID",
    "price": 2.99,
    "quantity": 500,
    "unit": "g",
})
assert fallback["retailerProductId"].startswith("hp-")
assert fallback["unitPrice"] == 5.98

assert mod.normalize_item({"store": "spar", "name": "X", "price": 1}) is None

previous = {
    "retailerProductId": "12345",
    "promotionVerified": True,
    "regularPrice": 2.49,
    "salePrice": 1.49,
    "promotion": {"type": "quantity", "requiredQuantity": 2},
    "validFrom": "2026-09-20",
    "validUntil": "2026-09-30",
}
fresh = {
    "retailerProductId": "12345",
    "remoteObjectId": "12345",
    "currentPrice": 2.49,
}
mod.carry_forward_promotion(fresh, previous)
assert fresh["promotionVerified"] is True
assert fresh["salePrice"] == 1.49
assert fresh["promotion"]["requiredQuantity"] == 2

print("HOFER importer tests OK")
