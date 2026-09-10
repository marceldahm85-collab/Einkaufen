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

# v11.4: Wenn die Webseite am ersten Tag der neuen Ausgabe noch die alte
# Ausgabe als "aktuell" markiert, muss der offizielle Osttirol-Viewer aus der
# Kalenderwoche der kommenden Ausgabe ableitbar sein.
source = '''
<a href="https://brochures.mpreis.at/flugblatt/tundg/osttirol/2026/kw35/index.html">Osttirol</a>
'''
lines = [
    "T&G Flugblatt",
    "Aktuelle Ausgabe 27.08.–09.09. Kommende Ausgabe 10.09.–23.09.",
    "Tirol Salzburg Kärnten Osttirol Steiermark",
]
meta = mod.extract_flyer_metadata(source, lines)
assert meta["currentValidFrom"] == "2026-08-27"
assert meta["currentValidUntil"] == "2026-09-09"
assert meta["upcomingValidFrom"] == "2026-09-10"
assert meta["upcomingValidUntil"] == "2026-09-23"

candidates = mod._viewer_candidates_for_period(
    meta["url"],
    meta["upcomingValidFrom"],
)
assert candidates[0].endswith("/2026/kw37/index.html")

original_probe = mod._viewer_looks_valid
try:
    mod._viewer_looks_valid = lambda url: url.endswith("/2026/kw37/index.html")
    from datetime import date
    selected = mod.select_active_flyer(meta, today=date(2026, 9, 10))
finally:
    mod._viewer_looks_valid = original_probe

assert selected["selectedPeriod"] == "upcoming-now-active"
assert selected["url"].endswith("/2026/kw37/index.html")
assert selected["validFrom"] == "2026-09-10"
assert selected["validUntil"] == "2026-09-23"


# Wenn die neue Ausgabe laut Datum aktiv ist, der neue Viewer aber noch nicht
# erreichbar ist, darf nicht still das abgelaufene Flugblatt neu importiert werden.
original_probe = mod._viewer_looks_valid
try:
    mod._viewer_looks_valid = lambda url: False
    waiting = mod.select_active_flyer(meta, date(2026, 9, 10))
finally:
    mod._viewer_looks_valid = original_probe
assert waiting["url"] is None
assert waiting["selectedPeriod"] == "upcoming-waiting-for-viewer"
assert waiting.get("selectionWarning")

print("T&G current-period rollover OK")
