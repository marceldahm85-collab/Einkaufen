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
