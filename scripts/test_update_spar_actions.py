import importlib.util
from pathlib import Path

path = Path(__file__).with_name("update_spar_actions.py")
spec = importlib.util.spec_from_file_location("update_spar_actions", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

hit = {
    "id": "x",
    "masterValues": {
        "product-number": "4898153",
        "is-on-promotion": "true",
        "price": 1.24,
        "regular-price": 2.49,
        "badge-short-name": "1 + 1 GRATIS",
        "url": "https://www.spar.at/produktwelt/loidl-kantwurst-p4898153",
    }
}

action = mod.extract_action(hit)
assert action is not None
assert action["productId"] == "4898153"
assert action["salePrice"] == 1.24
assert action["regularPrice"] == 2.49
assert action["promotion"]["type"] == "bundle"
assert action["promotion"]["paidQuantity"] == 1
assert action["promotion"]["freeQuantity"] == 1
assert action["promotion"]["requiredQuantity"] == 2
assert action["promotion"]["label"] == "1+1 gratis"

month = mod.extract_action({
    "masterValues": {
        "product-number": "abc",
        "is-on-promotion": True,
        "price": 1.99,
        "regular-price": 2.49,
        "badge-names": "Monatssparer",
    }
})
assert month["promotion"]["type"] == "monthly"
assert month["promotion"]["label"] == "Monatssparer"

reduced = mod.extract_action({
    "masterValues": {
        "product-number": "def",
        "is-on-promotion": "1",
        "price": 2.85,
        "regular-price": 3.19,
        "badge-short-name": "Preisgesenkt",
    }
})
assert reduced["promotion"]["type"] == "price_drop"
assert reduced["promotion"]["label"] == "Preisgesenkt"

not_offer = mod.extract_action({
    "masterValues": {
        "product-number": "zzz",
        "is-on-promotion": "false",
        "price": 2.99,
        "regular-price": 2.99,
    }
})
assert not_offer is None

print("OK")
