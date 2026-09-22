# Einkaufsoptimierung – Verlässlichkeitsregeln

## Grundregel

Für dieselbe vollständig bepreiste Einkaufsliste gilt zwingend:

`Günstigster Einkauf <= Max. 2 Märkte <= 1 Markt`

Dabei bedeutet `Max. 2` tatsächlich höchstens zwei Märkte, also 1 oder 2.

## Auswahl

### 1 Markt
Alle einzelnen Händler werden geprüft.

### Max. 2
Geprüft werden:
- alle einzelnen Händler
- jedes mögliche Händlerpaar

### Vergleich
1. Zuerst werden nur Lösungen berücksichtigt, die alle Artikel bepreisen können.
2. Unter diesen gewinnt die niedrigste Gesamtsumme.
3. Bei gleichem Preis gewinnt die Lösung mit weniger tatsächlich verwendeten Märkten.

## Fehlende Preise

Kann eine Strategie nicht alle Artikel bepreisen, wird keine Gesamtsumme ausgegeben.
Die App zeigt stattdessen:
- Preisabdeckung
- Teilbetrag
- Warnhinweis

Eine unvollständige Teilsumme wird niemals mit einer vollständigen Gesamtsumme
gleichgesetzt.


## Automatische Kandidaten ab v12.0

Ein persönlicher Artikel kann pro Markt mehrere passende Händlerprodukte
besitzen. `pricedOfferForStore()` bewertet sämtliche aktiven Kandidaten des
Markts für die tatsächlich gewünschte Einkaufsmenge und wählt erst danach die
günstigste reale Kaufkombination.

Damit wird nicht der niedrigste aufgedruckte Gebindepreis gewählt, sondern die
Kassenbelastung nach:
- benötigter Anzahl ganzer Gebinde,
- Mindestmengen,
- N+M-Bundles,
- Gültigkeitszeitraum,
- Vergleichsmenge.

Eine feste Kandidatenauswahl reduziert den automatischen Händlerkandidatenpool
auf den vom Nutzer gewählten Datensatz; manuelle Preise anderer, noch nicht
automatisch angebundener Märkte bleiben weiterhin verfügbar.


## v12.1: Sortierung der Produktalternativen

Die Reihenfolge in der manuellen Alternativenansicht ist vom eigentlichen
Einkaufsoptimierer getrennt. Standardmäßig werden Alternativen nach effektivem
EUR/l, EUR/kg oder EUR/Stk sortiert. Optional kann nach tatsächlichem
Kassenbetrag oder geringster Übermenge sortiert werden.

Die Optimiererstrategien `cheapest`, `max2` und `one` verwenden weiterhin den
realen Kassenbetrag (`lineTotal`). Dadurch bleibt die Optimierer-Invariante
unverändert.
