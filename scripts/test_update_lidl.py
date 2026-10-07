import json
import runpy
from pathlib import Path

ns = runpy.run_path("scripts/update_lidl.py", run_name="test")
assert ns["normalize_unit"]("kg") == "kg"
item = ns["normalize_item"]({
  "store":"lidl","id":"12345","name":"Test Milch","price":1.29,
  "quantity":1,"unit":"l","description":"Vollmilch",
  "priceHistory":[{"date":"2026-09-24","price":1.29}],"bio":False
})
assert item["retailerProductId"] == "12345"
assert item["unitPrice"] == 1.29
assert item["history"][0]["price"] == 1.29
assert ns["normalize_item"]({"store":"spar","name":"Falsch","price":1}) is None
print("Lidl importer tests OK")

fixture = {
  "gridbox": {"data": {
    "productId": "10045677",
    "fullTitle": "Test Vollmilch",
    "price": {"price": 1.29, "basePrice": {"text": "Je 1 l"}},
    "keyfacts": {"description": "Test"},
    "canonicalPath": "/p/test/p10045677"
  }, "meta": {}}
}
parsed = ns["normalize_lidl_search_item"](fixture)
assert parsed["id"] == "10045677"
assert parsed["price"] == 1.29
assert parsed["unit"] == "l"
print("Lidl search API parser test OK")
