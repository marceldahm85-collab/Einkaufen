import importlib.util
from pathlib import Path

path = Path(__file__).with_name("update_tg.py")
spec = importlib.util.spec_from_file_location("update_tg", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

sample = [
    "Aktionen",
    "Spezialaktionen",
    "Do 03.09. bis Mi 09.09.",
    "-25% auf Mehl",
    "Lorenz Crunchips",
    "130 – 150 g, versch. Sorten",
    "2.89",
    "1.79",
    "11.93 – 13.77 €/kg",
    "Monster Energydrink",
    "0.5 l, versch. Sorten, exkl. Einwegpfand",
    "1.69",
    "0.99",
    "0.99 €/l",
    "Weihenstephan alkoholfrei Kiste",
    "20 x 0.5 l, exkl. Pfand",
    "26.99",
    "19.99",
    "0.99 €/0.5 l",
    "Die besten Deals im Abo.",
]

items, valid_from, valid_until = mod.parse_special_actions(sample)

assert valid_from.endswith("-09-03")
assert valid_until.endswith("-09-09")
assert len(items) == 4

by_name = {x["name"]: x for x in items}

chips = by_name["Lorenz Crunchips"]
assert chips["regularPrice"] == 2.89
assert chips["salePrice"] == 1.79
assert chips["unitPrice"] is None
assert chips["promotionVerified"] is True

monster = by_name["Monster Energydrink"]
assert monster["amount"] == 0.5
assert monster["unit"] == "l"
assert monster["unitPrice"] == 0.99

crate = by_name["Weihenstephan alkoholfrei Kiste"]
assert crate["amount"] == 10
assert crate["unit"] == "l"
assert crate["salePrice"] == 19.99

flour = by_name["Mehl"]
assert flour["kind"] == "category"
assert flour["salePrice"] is None
assert flour["promotion"]["discountPercent"] == 25

assert mod.resolve_period("27.08. - 09.09.2026") == ("2026-08-27", "2026-09-09")

print("OK")
