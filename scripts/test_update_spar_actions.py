import importlib.util
from pathlib import Path

path = Path(__file__).with_name("update_spar_actions.py")
spec = importlib.util.spec_from_file_location("update_spar_actions", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

plain_50 = mod.extract_action({
    "masterValues": {
        "product-number": "100",
        "is-on-promotion": "true",
        "price": 1.00,
        "regular-price": 2.00,
        "badge-names": "Bio|Immer Billig",
        "badge-short-name": "Bio|IB",
    }
})
assert plain_50 is not None
assert plain_50["promotion"]["label"] == "Aktion"
assert plain_50["promotion"]["type"] == "price_drop"
assert plain_50["promotion"]["discountPercent"] == 50

not_promo = mod.extract_action({
    "masterValues": {
        "product-number": "101",
        "is-on-promotion": "false",
        "price": 2.99,
        "regular-price": 2.99,
        "badge-names": "Immer Billig",
        "badge-short-name": "IB",
    }
})
assert not_promo is None

quantity = mod.extract_action({
    "masterValues": {
        "product-number": "102",
        "is-on-promotion": True,
        "price": 2.49,
        "regular-price": 2.49,
        "promotion-text": "Mengenvorteil ab 2 Stk. je",
    }
})
assert quantity is not None
assert quantity["promotion"]["type"] == "quantity"
assert quantity["promotion"]["requiredQuantity"] == 2
assert quantity["promotion"]["label"] == "ab 2 Stück"

bundle = mod.extract_action({
    "masterValues": {
        "product-number": "103",
        "is-on-promotion": True,
        "price": 1.24,
        "regular-price": 2.49,
        "promotion-most-likely-text": "1 + 1 GRATIS - ab 2 Stk. je",
    }
})
assert bundle is not None
assert bundle["promotion"]["type"] == "bundle"
assert bundle["promotion"]["paidQuantity"] == 1
assert bundle["promotion"]["freeQuantity"] == 1
assert bundle["promotion"]["requiredQuantity"] == 2
assert bundle["promotion"]["label"] == "1+1 gratis"

wine = mod.extract_action({
    "masterValues": {
        "product-number": "104",
        "is-on-promotion": "false",
        "price": 9.99,
        "regular-price": 9.99,
        "badge-names": "5% Rabatt ab 6 Flaschen",
        "badge-short-name": "5%",
    }
})
assert wine is None

print("OK")
