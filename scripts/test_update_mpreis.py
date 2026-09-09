import importlib.util
from pathlib import Path

path = Path(__file__).with_name("update_mpreis.py")
spec = importlib.util.spec_from_file_location("update_mpreis", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

raw = {
    "store": "mpreis",
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

assert item is not None
assert item["retailerProductId"] == "12345"
assert item["currentPrice"] == 1.49
assert item["amount"] == 1
assert item["unit"] == "l"
assert item["unitPrice"] == 1.49
assert item["unitPriceUnit"] == "l"
assert item["bio"] is True
assert item["history"][0]["date"] == "2026-08-01"
assert item["history"][-1]["date"] == "2026-09-08"

fallback = {
    "store": "mpreis",
    "name": "Produkt ohne ID",
    "price": 2.99,
    "quantity": 500,
    "unit": "g",
}
fallback_item = mod.normalize_item(fallback)
assert fallback_item["retailerProductId"].startswith("hp-")
assert fallback_item["unitPrice"] == 5.98

assert mod.normalize_item({"store": "spar", "name": "X", "price": 1}) is None

print("OK")


previous = {
    "retailerProductId": "12345",
    "promotionVerified": True,
    "regularPrice": 2.49,
    "salePrice": 1.49,
    "promotionObservedAt": "2026-09-08T12:00:00Z",
    "promotion": {
        "type": "quantity",
        "requiredQuantity": 2,
        "label": "ab 2 Stück",
        "verified": True,
    },
    "unitPrice": 1.49,
    "unitPriceUnit": "l",
}

fresh = {
    "retailerProductId": "12345",
    "remoteObjectId": "12345",
    "currentPrice": 2.49,
    "unitPrice": 2.49,
    "unitPriceUnit": "l",
}

mod.carry_forward_promotion(fresh, previous)
assert fresh["promotionVerified"] is True
assert fresh["regularPrice"] == 2.49
assert fresh["salePrice"] == 1.49
assert fresh["promotion"]["requiredQuantity"] == 2
assert fresh["unitPrice"] == 1.49

plain = {
    "retailerProductId": "999",
    "currentPrice": 3.0,
}
mod.carry_forward_promotion(plain, {"promotionVerified": False, "salePrice": 1.0})
assert "salePrice" not in plain

print("Promotion carry-forward OK")
