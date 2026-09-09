# Live-Import Architektur

## MPREIS Adapter
Datei: `live-mpreis.js`

Er übernimmt:
- Live-Suche
- Abruf verknüpfter Produkte
- Normalisierung von Produkt-ID, Name, Menge, Einheit, Preis und Grundpreis
- Übergabe an das interne Preisformat

## Lokale Verknüpfung

```js
liveLinks: {
  mpreis: {
    remoteObjectId: "...",
    retailerProductId: "...",
    name: "...",
    linkedAt: "..."
  }
}
```

## Synchronisierung
- manuell unter `Mehr -> MPREIS`
- automatisch beim App-Start, wenn die letzte Synchronisierung älter als 12 Stunden ist
- Abruf in kleinen Batches

## Aktionen
Der Produktindex wird zunächst als Basispreisquelle behandelt.
Aktionsbedingungen wie `1+1`, `ab 2 Stück` oder `nur mit App` werden später
durch einen zusätzlichen MPREIS-Aktionsadapter ergänzt.

## Nächste Händler
SPAR, BILLA, HOFER, Lidl und T&G können danach dieselbe Adapter-Schnittstelle verwenden.


## MPREIS-Aktionsstufe (Version 8.3)

Nach dem Grundpreisimport wird `scripts/update_mpreis_actions.py` ausgeführt.

Quelle:
`https://www.mpreis.at/aktionen/aktuell/alle-produkte-in-aktion`

Die Zuordnung erfolgt bevorzugt über die MPREIS-Produkt-ID aus `/shop/p/...`.
Nur wenn keine ID verwendbar ist, wird ein exakt eindeutiger Produktname als
Fallback akzeptiert.

Die Aktionsstufe darf den Grundpreisimport nicht beschädigen. Bei unsicherer
Extraktion bleibt die Aktion daher ungesetzt.
