import importlib.util
from pathlib import Path

path = Path(__file__).with_name("update_lidl.py")
spec = importlib.util.spec_from_file_location("update_lidl", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

today = "2026-09-24"

# Official Lidl API shape from the current upstream Lidl adapter.
one_litre = {
    "productId": "10001",
    "fullTitle": "Vollmilch",
    "keyfacts": {
        "supplementalDescription": "Milbona",
        "description": "Frische Vollmilch"
    },
    "price": {
        "price": 1.49,
        "basePrice": {"text": "1 l"}
    },
    "canonicalUrl": "https://www.lidl.at/p/test-vollmilch/10001"
}

item = mod.normalize_official_item(one_litre, today)
assert item is not None
assert item["store"] == "lidl"
assert item["retailerProductId"] == "10001"
assert item["name"] == "Milbona Vollmilch"
assert item["amount"] == 1000
assert item["unit"] == "ml"
assert item["optimizerEligible"] is True
assert item["currentPrice"] == 1.49
assert item["unitPrice"] == 1.49
assert item["unitPriceUnit"] == "l"
assert item["productUrl"].endswith("/10001")
assert item["bio"] is False

multipack = {
    "productId": "10002",
    "fullTitle": "Mineralwasser",
    "price": {
        "price": 2.99,
        "basePrice": {"text": "6x0.5 l"}
    }
}
item = mod.normalize_official_item(multipack, today)
assert item["amount"] == 3000
assert item["unit"] == "ml"
assert item["unitPrice"] == 1.0

weighted = {
    "productId": "10003",
    "fullTitle": "Bananen",
    "price": {
        "price": 1.99,
        "basePrice": {"text": "per kg"}
    }
}
item = mod.normalize_official_item(weighted, today)
assert item["amount"] == 1000
assert item["unit"] == "g"
assert item["weighted"] is True
assert item["unitPrice"] == 1.99
assert item["unitPriceUnit"] == "kg"

quantity_text = {
    "productId": "10004",
    "fullTitle": "Joghurt",
    "price": {
        "price": 0.89,
        "basePrice": {"text": "bei 2 je 180 g"}
    }
}
item = mod.normalize_official_item(quantity_text, today)
assert item["amount"] == 180
assert item["unit"] == "g"
assert item["unitPrice"] == round(0.89 / 0.18, 2)

fallback_id = {
    "fullTitle": "Produkt ohne Produkt-ID",
    "price": {
        "price": 2.99,
        "basePrice": {"text": "500 g"}
    }
}
item = mod.normalize_official_item(fallback_id, today)
assert item["retailerProductId"].startswith("lidl-")
assert item["unitPrice"] == 5.98

invalid = {"productId": "x", "fullTitle": "Ohne Preis", "price": {}}
assert mod.normalize_official_item(invalid, today) is None

print("LIDL official API normalization tests OK")

previous = {
    "retailerProductId": "10001",
    "promotionVerified": True,
    "regularPrice": 1.79,
    "salePrice": 1.49,
    "promotionObservedAt": "2026-09-23T12:00:00Z",
    "promotion": {
        "type": "price_drop",
        "label": "Aktion",
        "verified": True,
    }
}
fresh = {
    "retailerProductId": "10001",
    "remoteObjectId": "10001",
    "amount": 1000,
    "unit": "ml",
    "currentPrice": 1.79,
    "unitPrice": 1.79,
    "unitPriceUnit": "l",
}
mod.carry_forward_promotion(fresh, previous)
assert fresh["promotionVerified"] is True
assert fresh["salePrice"] == 1.49
assert fresh["regularPrice"] == 1.79
assert fresh["unitPrice"] == 1.49
assert fresh["unitPriceUnit"] == "l"

print("LIDL promotion carry-forward tests OK")
