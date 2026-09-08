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
