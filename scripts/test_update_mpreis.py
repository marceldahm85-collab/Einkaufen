import importlib.util
from pathlib import Path

path = Path(__file__).with_name("update_mpreis.py")
spec = importlib.util.spec_from_file_location("update_mpreis", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

hit = {
    "objectID": "obj-1",
    "code": "4711",
    "name": ["Test Milch 1l"],
    "prices": [{
        "presentationPrice": {
            "effectiveAmount": 1.49,
            "measurementUnit": {"quantity": 1, "unitCode": "ltr"}
        },
        "effectiveAmount": 1.49
    }],
    "mixins": {
        "productCustomAttributes": {
            "packagingUnit": "1 l",
            "packagingDescription": "",
            "longDescription": "Test"
        },
        "mpreisAttributes": {"properties": ["BIO"]}
    }
}

item = mod.normalize_hit(hit)
assert item["currentPrice"] == 1.49
assert item["amount"] == 1000
assert item["unit"] == "ml"
assert item["unitPrice"] == 1.49
assert item["bio"] is True

mod.merge_history(item, {"history": [{"date": "2026-09-01", "price": 1.69}]}, "2026-09-08")
assert item["history"][-1] == {"date": "2026-09-08", "price": 1.49}
print("OK")
