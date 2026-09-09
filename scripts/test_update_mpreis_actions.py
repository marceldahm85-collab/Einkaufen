import importlib.util
from pathlib import Path

path = Path(__file__).with_name("update_mpreis_actions.py")
spec = importlib.util.spec_from_file_location("update_mpreis_actions", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

p = mod.parse_card_text(
    "Coca-Cola Original 1,0 Liter Aktueller Preis 1,32 €, statt 1,99 € "
    "Bei 6 Stk. je 1,32 1,32 € /l 4+2 gratis NUR MIT APP"
)
assert p is not None
assert p["salePrice"] == 1.32
assert p["regularPrice"] == 1.99
assert p["promotion"]["type"] == "bundle"
assert p["promotion"]["paidQuantity"] == 4
assert p["promotion"]["freeQuantity"] == 2
assert p["promotion"]["requiredQuantity"] == 6
assert p["promotion"]["label"] == "4+2 gratis"
assert p["promotion"]["loyaltyRequired"] is True

q = mod.parse_card_text(
    "M Trauben hell kernlos 500g Aktueller Preis 1,49 €, statt 2,49 € "
    "Ab 2 Stk. je 1,49 2,98 € /kg ab 2 billiger NUR MIT APP"
)
assert q["promotion"]["type"] == "quantity"
assert q["promotion"]["requiredQuantity"] == 2
assert q["promotion"]["label"] == "ab 2 Stück"

r = mod.parse_card_text(
    "M Sonnenblumenwecken 500g Aktueller Preis 1,99 €, statt 2,49 € "
    "2,49 1,99 3,98 € /kg -20% NUR MIT APP"
)
assert r["promotion"]["type"] == "percentage"
assert r["promotion"]["discountPercent"] == 20
assert r["promotion"]["label"] == "-20 %"

html = """
<div class="card">
  <a href="/shop/p/4711">Test Produkt</a>
  <div>Aktueller Preis 1,49 €, statt 2,49 €</div>
  <div>Ab 2 Stk. je 1,49 € ab 2 billiger NUR MIT APP</div>
</div>
"""
product = {"retailerProductId": "4711", "remoteObjectId": "4711", "name": "Test Produkt"}
found = mod.extract_promotions(
    html,
    {"4711": product},
    {mod.norm("Test Produkt"): [product]}
)
assert "4711" in found
assert found["4711"]["promotion"]["requiredQuantity"] == 2

print("OK")
