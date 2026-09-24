import importlib.util
from pathlib import Path

path = Path(__file__).with_name("update_hofer.py")
spec = importlib.util.spec_from_file_location("update_hofer", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

fixture = """
<html><body>
<a href="/produkt/milsani-butter-laktosefrei-000000000000107104">
Kühlung MILSANI Butter, laktosefrei 0,25 kg(€ 7,96/1 kg)€ 1,99
</a>
<a href="/produkt/milsani-milch-000000000000107105">
Kühlung MILSANI Vollmilch Länger frisch 1 l(€ 1,32/1 l)€ 1,32² ~~€ 1,39~~
</a>
<a href="/produkt/backbox-laugenstangerl-000000000000107106">
Vegan BACKBOX Laugenstangerl€ 0,49
</a>
<a href="/produkt/mehl-000000000000107107">
Verfügbar seit 04.09.2026 FINI'S FEINSTES Universalmehl 1,2 kg(€ 1,50/1 kg)€ 1,80¹
</a>
<a href="https://shop.hofer.at/produkt/000000000000999999">
Verfügbar seit 22.09.2026 ONLINESHOP Produkt 1 kg(€ 9,99/1 kg)€ 9,99
</a>
</body></html>
"""

rows = mod.parse_products_page(fixture)
assert len(rows) == 4, rows

butter = rows["000000000000107104"]
assert butter["name"] == "MILSANI Butter, laktosefrei"
assert butter["amount"] == 0.25
assert butter["unit"] == "kg"
assert butter["currentPrice"] == 1.99
assert butter["salePrice"] is None
assert butter["unitPrice"] == 7.96
assert butter["unitPriceUnit"] == "kg"
assert butter["optimizerEligible"] is True

milk = rows["000000000000107105"]
assert milk["name"] == "MILSANI Vollmilch Länger frisch"
assert milk["amount"] == 1
assert milk["unit"] == "l"
assert milk["currentPrice"] == 1.32
assert milk["regularPrice"] == 1.39
assert milk["salePrice"] == 1.32

bread = rows["000000000000107106"]
assert bread["name"] == "BACKBOX Laugenstangerl"
assert bread["amount"] == 1
assert bread["unit"] == "Stk"
assert bread["optimizerEligible"] is False

flour = rows["000000000000107107"]
assert flour["availableFrom"] == "2026-09-04"
assert flour["amount"] == 1.2
assert flour["unit"] == "kg"
assert flour["currentPrice"] == 1.80
assert flour["unitPrice"] == 1.50
assert flour["unitPriceUnit"] == "kg"

assert "999999" not in rows

previous = {
    "currentPrice": 2.49,
    "updatedAt": "2026-09-20T08:00:00Z",
    "history": [{"date": "2026-09-18", "price": 2.49}],
}
history = mod.update_history(previous, 1.99, "2026-09-23T08:00:00Z")
assert history[-2]["price"] == 2.49
assert history[-1]["price"] == 1.99

verified = {
    "promotionVerified": True,
    "salePrice": 1.59,
    "regularPrice": 2.49,
    "promotion": {"type": "quantity", "requiredQuantity": 2},
}
product = {"amount": 0.25, "unit": "kg", "currentPrice": 1.99}
mod.carry_forward_verified_promotion(product, verified)
assert product["salePrice"] == 1.59
assert product["regularPrice"] == 2.49
assert product["unitPrice"] == 6.36

print("HOFER official catalog importer tests OK")
