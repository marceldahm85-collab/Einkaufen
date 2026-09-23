import importlib.util
from pathlib import Path

path = Path(__file__).with_name("update_billa_actions.py")
spec = importlib.util.spec_from_file_location("update_billa_actions", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

fixture = r'''
<html><body>
  <section class="product-card">
    <a href="/produkte/coca-cola-00770015"><span>Coca Cola</span></a>
    <div>aus Österreich</div>
    <div>4+2 Aktion</div>
    <div>Einzelpreis 2,49 € 1 Liter 1,66 €</div>
    <div>Bei 6 Flaschen je 1,66 € 1 Liter 1,11 €</div>
  </section>
  <section class="product-card">
    <a href="/produkte/ja-natuerlich-butter-00765432">Ja! Natürlich Butter</a>
    <div>2+1 Aktion</div>
    <div>Einzelpreis 2,99 € 1 kg 11,96 €</div>
    <div>Bei 3 Packungen je 1,99 € 1 kg 7,96 €</div>
  </section>
  <section class="product-card">
    <a href="/produkte/maroni-gegart-00761234">Ja! Natürlich Maroni gegart</a>
    <div>in Aktion</div>
    <div>Einzelpreis 2,19 € 1 kg 21,90 €</div>
    <div>ab 2 Packungen 1,89 € 1 kg 18,90 €</div>
  </section>
  <section class="product-card">
    <a href="/produkte/finish-klarspueler-00760001">Finish Klarspüler Brilliant</a>
    <div>in Aktion</div>
    <div>3,52 € 1 Liter 4,40 €</div>
  </section>
  <section class="product-card">
    <a href="/produkte/test-kein-bundle-00760002">Testprodukt</a>
    <div>-50% Aktion</div>
    <div>2,00 € 1 kg 4,00 €</div>
  </section>
  <section class="product-card">
    <a href="/produkte/irrelevant-00760003">Irrelevant</a>
    <div>1,99 €</div>
  </section>
</body></html>
'''

cards = mod.extract_action_cards(fixture)
assert len(cards) == 5, cards

coca = next(v for v in cards.values() if v["name"] == "Coca Cola")
assert coca["articleNumber"] == "00-770015"
assert coca["regularPrice"] == 2.49
assert coca["salePrice"] == 1.66
assert coca["promotion"]["type"] == "bundle"
assert coca["promotion"]["paidQuantity"] == 4
assert coca["promotion"]["freeQuantity"] == 2
assert coca["promotion"]["requiredQuantity"] == 6

butter = next(v for v in cards.values() if v["name"] == "Ja! Natürlich Butter")
assert butter["regularPrice"] == 2.99
assert butter["salePrice"] == 1.99
assert butter["promotion"]["type"] == "bundle"
assert butter["promotion"]["paidQuantity"] == 2
assert butter["promotion"]["freeQuantity"] == 1
assert butter["promotion"]["requiredQuantity"] == 3

maroni = next(v for v in cards.values() if "Maroni" in v["name"])
assert maroni["regularPrice"] == 2.19
assert maroni["salePrice"] == 1.89
assert maroni["promotion"]["type"] == "quantity"
assert maroni["promotion"]["requiredQuantity"] == 2

finish = next(v for v in cards.values() if v["name"].startswith("Finish"))
assert finish["salePrice"] == 3.52
assert finish["regularPrice"] is None
assert finish["promotion"]["type"] == "price_drop"

plain = next(v for v in cards.values() if v["name"] == "Testprodukt")
assert plain["salePrice"] == 2.00
assert plain["promotion"]["type"] == "price_drop"
assert "paidQuantity" not in plain["promotion"]

products = [
    {"retailerProductId": "00-770015", "name": "Coca Cola"},
    {"retailerProductId": "00-765432", "name": "Ja! Natürlich Butter"},
]

lookup = {}
for product in products:
    for key in mod.product_map_key_variants(product):
        lookup[key] = product

assert lookup["00770015"]["name"] == "Coca Cola"
assert lookup["770015"]["name"] == "Coca Cola"
assert lookup["00-770015"]["name"] == "Coca Cola"
assert lookup["00-765432"]["name"] == "Ja! Natürlich Butter"

print("BILLA action parser/mapping tests OK")
