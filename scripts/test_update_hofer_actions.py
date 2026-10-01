import importlib.util
from datetime import date
from pathlib import Path

path = Path(__file__).with_name("update_hofer_actions.py")
spec = importlib.util.spec_from_file_location("update_hofer_actions", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

card = mod.parse_action_card(
    "Verfügbar seit 01.10.2026 Tiefpreisaktion TEST Produkt 0,5 kg(€ 4,00/1 kg)€ 2,00¹",
    today=date(2026, 10, 1),
)
assert card is not None
assert card["name"] == "TEST Produkt"
assert card["salePrice"] == 2.0
assert card["unitPrice"] == 4.0
assert card["unitPriceUnit"] == "kg"
assert card["promotion"]["type"] == "price_drop"
assert card["promotion"]["label"] == "Tiefpreisaktion"

future = mod.parse_action_card(
    "Verfügbar ab 02.10.2026 TEST Produkt 1 kg€ 3,00",
    today=date(2026, 10, 1),
)
assert future is None

expired = mod.parse_action_card(
    "Verfügbar seit 01.08.2026 TEST Produkt € 1,00",
    today=date(2026, 10, 1),
)
assert expired is None

bundle = mod.parse_action_card(
    "Verfügbar seit 01.10.2026 TEST 2+1 Produkt 500 g€ 3,00",
    today=date(2026, 10, 1),
)
assert bundle is not None
assert bundle["promotion"]["type"] == "bundle"
assert bundle["promotion"]["paidQuantity"] == 2
assert bundle["promotion"]["freeQuantity"] == 1
assert bundle["promotion"]["requiredQuantity"] == 3

print("HOFER action parser tests OK")
