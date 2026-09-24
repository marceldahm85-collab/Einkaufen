import importlib.util
from pathlib import Path
from datetime import date

path = Path(__file__).with_name("update_hofer_actions.py")
spec = importlib.util.spec_from_file_location("update_hofer_actions", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

today = mod.today_date().strftime("%d.%m.%Y")
fixture = f"""
<html><body>
  <section>
    <a href="/produkt/milsani-butter-laktosefrei-000000000000107104">
      Verfügbar seit {today} Tiefpreisaktion MILSANI Butter, laktosefrei
      0,25 kg (€ 7,96/1 kg) € 1,99 ~~€ 2,49~~
    </a>
  </section>
  <section>
    <a href="/produkt/milsani-schlagobers-000000000000107105">
      Verfügbar ab 25.09.2026 MILSANI Schlagobers 0,25 l € 1,79
    </a>
  </section>
  <section>
    <a href="/produkt/old-item-000000000000107106">
      Verfügbar seit 01.08.2026 Tiefpreisaktion Altes Produkt € 1,00 ~~€ 2,00~~
    </a>
  </section>
  <section>
    <a href="https://shop.hofer.at/produkt/000000000000999999">
      Verfügbar seit {today} ONLINESHOP Produkt € 399,00
    </a>
  </section>
  <section>
    <a href="/produkt/plain-000000000000107107">Normales Produkt € 2,99</a>
  </section>
</body></html>
"""

cards = mod.extract_action_cards(fixture)
assert len(cards) == 2, cards

butter = next(v for v in cards.values() if "Butter" in v["name"])
assert butter["articleNumber"] == "000000000000107104"
assert butter["regularPrice"] == 2.49
assert butter["salePrice"] == 1.99
assert butter["promotion"]["type"] == "price_drop"
assert butter["promotion"]["label"] == "Tiefpreisaktion"
assert butter["validFrom"] == mod.today_date().isoformat()

future = next(v for v in cards.values() if "Schlagobers" in v["name"])
assert future["promotion"]["type"] == "action_article"
assert future["salePrice"] is None
assert future["regularPrice"] == 1.79

parsed = mod.parse_card_text("Verfügbar seit " + today + " Tiefpreisaktion Testprodukt 1 kg € 4,00 ~~€ 5,00~~")
assert parsed["promotion"]["type"] == "price_drop"
assert parsed["salePrice"] == 4.00
assert parsed["regularPrice"] == 5.00

print("HOFER action parser/mapping/date tests OK")
