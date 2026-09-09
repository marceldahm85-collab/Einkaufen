import importlib.util
from pathlib import Path

path = Path(__file__).with_name("update_tg_flyer.py")
spec = importlib.util.spec_from_file_location("update_tg_flyer", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

sample = """
Example Cola
330 ml,
versch. Sorten,
2.39 €/l
Other Drink
20 x 0.5 l, exkl. Pfand, 0.75 € /0.5 l
0.79
1.39
14.90
29.80
1+1
14.90
1 KISTE 29.80
BEI 2 KISTEN JE
"""

blocks = mod.extract_product_blocks(sample)
assert len(blocks) == 2

name, desc = mod.split_name_description(blocks[0])
assert name == "Example Cola"
assert mod.derive_display_price(desc) == 0.79

name2, desc2 = mod.split_name_description(blocks[1])
assert name2 == "Other Drink"
assert mod.derive_display_price(desc2) == 15.0

prices = mod.extract_standalone_prices(sample)
assert mod.snap_display_price(15.0, prices) == 14.90

products, matched, spatial = mod.build_page_products(
    sample,
    1,
    "https://example.invalid/viewer",
    "https://example.invalid/flyer.pdf",
    "2026-09-01",
    "2026-09-09",
)

assert len(products) == 2
assert matched == 1
assert spatial == 0

drink = next(item for item in products if item["name"] == "Other Drink")
assert drink["displayPrice"] == 14.90
assert drink["salePrice"] == 14.90
assert drink["regularPrice"] == 29.80
assert drink["optimizerEligible"] is True
assert drink["promotion"]["type"] == "bundle"
assert drink["promotion"]["paidQuantity"] == 1
assert drink["promotion"]["freeQuantity"] == 1
assert drink["promotion"]["requiredQuantity"] == 2

cola = next(item for item in products if item["name"] == "Example Cola")
assert cola["displayPrice"] == 0.79
assert cola["salePrice"] is None
assert cola["optimizerEligible"] is False

range_desc = "160 – 411 ml, versch. Sorten, 7.27 – 18.69 €/l"
assert mod.derive_display_price(range_desc) == 2.99

roll_desc = "8 x 45 Blatt, 2-lagig, 0.62 €/Rolle"
assert mod.derive_display_price(roll_desc) == 4.96

meter_desc = "300 m x 29 cm, 0.08 €/m"
assert mod.derive_display_price(meter_desc) == 24.0

valid = [
    "Angebote gültig ab Donnerstag, 27.08.2026 bis Mittwoch, 09.09.2026."
]
assert mod.extract_validity(valid) == ("2026-08-27", "2026-09-09")

print("OK")


# Synthetic positioned-text test: the plain text has no BEI/regular-price record,
# but the PDF layout places an "AB 2 PKG." marker in the same card.
layout_sample = """
Test Pasta
500 g, 3.98 €/kg
1.99
AB 2 PKG.
"""
layout = [
    {"text": "Test Pasta", "x": 50.0, "y": 700.0, "fontSize": 10.0, "width": 55.0},
    {"text": "500 g, 3.98 €/kg", "x": 50.0, "y": 680.0, "fontSize": 8.0, "width": 80.0},
    {"text": "AB 2 PKG.", "x": 52.0, "y": 635.0, "fontSize": 9.0, "width": 55.0},
]
spatial_products, text_count, spatial_count = mod.build_page_products(
    layout_sample,
    1,
    "https://example.invalid/viewer",
    "https://example.invalid/flyer.pdf",
    "2026-09-01",
    "2026-09-09",
    page_layout=layout,
)
assert text_count == 0
assert spatial_count == 1
assert len(spatial_products) == 1
sp = spatial_products[0]
assert sp["displayPrice"] == 1.99
assert sp["salePrice"] == 1.99
assert sp["optimizerEligible"] is True
assert sp["promotion"]["type"] == "quantity"
assert sp["promotion"]["requiredQuantity"] == 2
assert sp["promotionMatchMethod"] == "pdf-position"

print("Spatial condition assignment OK")
