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


## BILLA Adapter (Version 13.0)

Dateien:
- `scripts/update_billa.py`
- `live-billa.js`
- `data/billa.json`

Der Grundbestand wird aus `https://heisse-preise.io/data/latest-canonical.json`
mit `store=billa` übernommen. Produkt-ID, Name, Beschreibung, Menge, Einheit,
aktueller Preis, Grundpreis, Bio-Kennzeichen und Preisverlauf werden in dasselbe
öffentliche Schema wie MPREIS/SPAR normalisiert.

BILLA ist damit im Händlerkatalog und in der automatischen Kandidatensuche
verfügbar. Die persönlichen Matchingprofile und Kandidatenpools bleiben lokal.

Die offizielle BILLA-Aktionsseite ist **noch nicht** als verifizierte
Aktionsquelle freigeschaltet. Insbesondere `ab N`, `N+M`, jö-/Treuebedingungen
und Gültigkeitszeiträume werden erst in einer separaten Aktionsstufe verwendet,
wenn sie strukturiert und eindeutig einem Produkt zugeordnet werden können.

## HOFER

`live-hofer.js` stellt Grundpreise, Katalog-Browsing, automatische Zuordnung,
verifizierte Aktionsmetadaten und den offiziellen Flugblatt-Link bereit.



## Lidl

`scripts/update_lidl.py` übernimmt den Lidl-Bestand aus dem öffentlichen
Heisse-Preise-Datensatz. `live-lidl.js` stellt Laden, Suchen, Katalog-Browsing,
automatische Zuordnung und Preisstatus bereit. Der offizielle Lidl-Flugblatt-Link
wird über die Oberfläche bereitgestellt.
