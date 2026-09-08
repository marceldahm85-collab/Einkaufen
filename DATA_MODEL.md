# PreisPilot Osttirol – Datenmodell V2

Version 4 erweitert die lokale Datenstruktur so, dass die späteren Händler-Importer
ohne Umbau der mobilen Oberfläche angebunden werden können.

## Produkt

```js
{
  id: "p_butter",
  name: "Butter",
  brand: "Schärdinger / vergleichbar",
  category: "Milchprodukte",
  amount: 250,
  unit: "g",
  offers: [...]
}
```

## Händlerangebot / Preisdatensatz

```js
{
  retailerProductId: "billa_p_butter",
  store: "billa",

  regularPrice: 2.69,
  salePrice: 1.59,

  unitPrice: 6.36,
  unitPriceUnit: "kg",

  validUntil: "2026-09-10",

  source: "billa.at",
  retrievedAt: "2026-09-08T08:00:00",
  updatedAt: "2026-09-08",

  promotion: {
    type: "quantity",
    requiredQuantity: 2,
    label: "ab 2 Stück"
  },

  history: [
    { date: "2026-08-11", price: 2.80 },
    { date: "2026-08-25", price: 2.69 },
    { date: "2026-09-08", price: 1.59 }
  ]
}
```

## Unterstützte Aktionsarten

- `quantity` – z. B. ab 2 Stück
- `loyalty` – z. B. nur mit Lidl Plus / jö
- `percentage` – prozentuelle Aktion
- freie `label`-Angabe für Händler-Sonderfälle

## Preisstatus

Jeder Preis kann über `retrievedAt` bzw. `updatedAt` auf Aktualität geprüft werden.
Abgelaufene `salePrice`-Werte werden automatisch ignoriert, der bekannte Normalpreis
bleibt jedoch erhalten.

## Einkaufsoptimierung

Drei Strategien:

1. `cheapest` – jeder Artikel beim günstigsten bekannten Markt
2. `max2` – beste Kombination aus maximal zwei Märkten
3. `one` – bester einzelner Markt

Bei `max2` werden alle Einzelmärkte und alle möglichen Marktpaare geprüft.
Zuerst wird maximale Artikelabdeckung priorisiert, danach der niedrigste Gesamtpreis.

## Migration

Bestehende lokale Daten aus Version 1–3 werden beim Start automatisch auf Schema V2
ergänzt. Einkaufsliste und selbst angelegte Produkte bleiben dadurch erhalten.

## Hinweis zu Demo-Daten

Die aktuell mitgelieferten Preise und Preisverläufe sind Testdaten. Zwei
Aktionsbedingungen werden absichtlich als Demo erzeugt, damit die neue Logik bereits
vor dem echten Internet-Import sichtbar getestet werden kann.
