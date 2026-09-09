import importlib.util
from pathlib import Path

path = Path(__file__).with_name("update_spar.py")
spec = importlib.util.spec_from_file_location("update_spar", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

raw = {
    "store": "spar",
    "id": "spar-123",
    "name": "SPAR Test Milch",
    "price": 1.59,
    "priceHistory": [
        {"date": "2026-09-09", "price": 1.59},
        {"date": "2026-08-01", "price": 1.69},
    ],
    "unit": "l",
    "quantity": 1,
    "bio": False,
}

item = mod.normalize_item(raw)
assert item is not None
assert item["store"] == "spar"
assert item["retailerProductId"] == "spar-123"
assert item["currentPrice"] == 1.59
assert item["unitPrice"] == 1.59
assert item["unitPriceUnit"] == "l"
assert item["history"][0]["date"] == "2026-08-01"
assert item["history"][-1]["date"] == "2026-09-09"

assert mod.normalize_item({"store": "mpreis", "name": "X", "price": 1}) is None

fallback = mod.normalize_item({
    "store": "spar",
    "name": "Produkt ohne ID",
    "price": 2.99,
    "quantity": 500,
    "unit": "g",
})
assert fallback["retailerProductId"].startswith("hp-")
assert fallback["unitPrice"] == 5.98

print("OK")


previous = {
    "retailerProductId": "spar-123",
    "promotionVerified": True,
    "regularPrice": 2.49,
    "salePrice": 1.24,
    "promotionObservedAt": "2026-09-09T06:00:00Z",
    "promotion": {
        "type": "bundle",
        "paidQuantity": 1,
        "freeQuantity": 1,
        "requiredQuantity": 2,
        "label": "1+1 gratis",
    },
    "unitPrice": 1.24,
    "unitPriceUnit": "l",
}
fresh = {
    "retailerProductId": "spar-123",
    "remoteObjectId": "spar-123",
    "currentPrice": 2.49,
    "unitPrice": 2.49,
    "unitPriceUnit": "l",
}
mod.carry_forward_promotion(fresh, previous)
assert fresh["promotionVerified"] is True
assert fresh["salePrice"] == 1.24
assert fresh["promotion"]["requiredQuantity"] == 2
assert fresh["unitPrice"] == 1.24

print("Promotion carry-forward OK")
