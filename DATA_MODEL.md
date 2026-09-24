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


## Version 11.2 – Vergleichsmenge und Händlergebinde

`product.amount` + `product.unit` sind die persönliche **Vergleichsmenge**. Sie
geben nicht mehr implizit die Gebindegröße jedes Händlers vor.

Live-Angebote speichern zusätzlich:

- `packageAmount`
- `packageUnit`
- `packageAmountKnown`
- `packageLabel`

Der Preisvergleich berechnet aus Vergleichsmenge und Händlergebinde die
notwendige ganzzahlige Anzahl an Händlergebinden. Erst danach werden
Mengen-/Bundle-Aktionsbedingungen ausgewertet.

Beispiel: persönliche Vergleichsmenge `10 l`; Händler A verkauft `10 l`, Händler
B `3 l`. Für A wird 1 Gebinde, für B werden 4 Gebinde (= 12 l Kaufmenge)
berechnet. Verglichen werden die tatsächlichen Einkaufskosten.


## Schema v5 – automatische Händlerkandidaten

Persönliche Produkte besitzen zusätzlich:

```text
matchingProfile:
  mode: auto | fixed
  query: lokaler Suchbegriff
  queryAuto: bool
  fixedCandidateId: optional
  exclusions: []
  excludedIds: []

autoMatches:
  updatedAt
  query
  counts
  stores:
    mpreis: [kompakte Kandidaten]
    spar:   [kompakte Kandidaten]
    tg:     [kompakte Kandidaten]
    billa:  [kompakte Kandidaten]
```

`autoMatches` und `matchingProfile` sind private Browserdaten. Sie werden nicht
in den öffentlichen GitHub-Preisdatenbestand geschrieben.


## Matching Engine v2 (v12.2)

Automatische Händlerkandidaten werden weiterhin ausschließlich lokal gespeichert.
Die Produkttyp-Erkennung ist jetzt name-zentriert: Beschreibungen dienen nur noch
zur Such-/Ranking-Unterstützung, nicht mehr als alleinige Produkttyp-Evidenz.
Mehrdeutige Kandidaten werden konservativ verworfen.


## Version 13.0 – BILLA im automatischen Kandidatenpool

`autoMatches.stores` kann zusätzlich `billa` enthalten. Die gespeicherten
Kandidaten besitzen dasselbe kompakte Format wie bei MPREIS, SPAR und T&G.
Der öffentliche BILLA-Datensatz liegt in `data/billa.json`; persönliche
Zuordnungen werden weiterhin ausschließlich in `localStorage` gespeichert.

## BILLA-Aktionen (v13.1)

`data/billa.json` kann zusätzlich folgende öffentliche Aktionsfelder enthalten:

- `promotionCount`
- `promotionUpdatedAt`
- `promotionObservedAt`
- `promotionSource`
- `promotionStale`
- `promotionLastError`
- `promotionParserVersion`
- pro Produkt `regularPrice`, `salePrice`, `promotion`,
  `promotionVerified`, `promotionObservedAt`, `promotionProductUrl`,
  `promotionSource` und optional `promotionOfficialLabel`

Die Aktionsdaten werden aus der offiziellen BILLA-Aktionsseite gewonnen. Die
Kondition eines Bundles wird nur übernommen, wenn die Seite sowohl die
Bundle-Größe als auch den konkreten Mengenpreis ausweist.


## v13.3 – BILLA Aktions-/Flugblattebene

BILLA verwendet weiterhin `data/billa.json` als öffentlichen Produkt- und Aktionsbestand. Die Oberfläche unter `Mehr` stellt nun zusätzlich eine aktuelle Aktionsliste und den offiziellen BILLA-Flugblatt-Einstieg bereit. Persönliche Einkaufsdaten bleiben lokal.

## Version 14.0 – HOFER

HOFER-Produkte verwenden dieselbe öffentliche Händlerstruktur wie die anderen
automatisch integrierten Märkte. Grundpreise stammen aus Heisse Preise;
aktuelle Angebotsmetadaten werden separat aus der offiziellen HOFER-Seite
ergänzt.

