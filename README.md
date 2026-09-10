# PreisPilot Osttirol – Version 11.4

Erste lauffähige Gesamtversion der privaten mobilen Einkaufs-/Preisvergleichs-App.

## Enthalten

- Mobile-First-Oberfläche mit 4 Hauptseiten
- Einkaufsliste mit Menge, Abhaken, Löschen und Sortierung
- Artikel aus Datenbank oder freie Artikel hinzufügen
- Artikelübersicht mit Suche, Kategorien und günstigstem bekannten Preis
- Marktübersicht für MPREIS, HOFER, Lidl, SPAR, BILLA und T&G
- Marktfarben als UI-Akzente
- Produktdetail mit Preisvergleich
- Einfache Einkaufsoptimierung nach günstigstem Einzelpreis
- Artikeldatenbank: neue Artikel anlegen / löschen
- Light / Dark / System
- Osttirol als feste Standardregion
- Speicherung im Browser via localStorage
- PWA-Manifest und Service Worker für Installation / Offline-Grundfunktion
- Datenmodell bereits auf externe Preisimporte vorbereitet

## Starten

Am zuverlässigsten über einen kleinen lokalen Webserver:

### Mit Python
Im Projektordner:

python -m http.server 8080

Dann im Browser öffnen:

http://localhost:8080

### Direkt per Datei
index.html lässt sich auch direkt öffnen. Die App funktioniert dann grundsätzlich,
nur der Service Worker / die PWA-Installation ist bei file:// nicht aktiv.

## Wichtiger Hinweis

Die enthaltenen Preise sind ausschließlich Demo-Daten. Der automatische Abruf realer
Händlerpreise ist in dieser Version noch nicht angeschlossen.

## Nächster technischer Block

Als nächstes sollte ein separates Import-/Backend-Modul folgen, das externe Preisdaten
für Osttirol abruft, normalisiert und in dasselbe Datenmodell einspeist. Dadurch bleibt
die mobile Oberfläche unabhängig von den einzelnen Händlerquellen.


## Änderungen in Version 2

- Header vollständig entfernt
- Theme-Schnellwechsel aus dem Header entfernt; Theme-Auswahl bleibt unter „Mehr“
- Sichtbare Regionskarte entfernt; Osttirol bleibt technisch als Standardregion gespeichert
- Inhalte rücken weiter nach oben und nutzen die mobile Fläche besser
- Light-Theme deutlich wärmer und farbiger
- Dark-Theme wärmer mit Braun-/Orange-/Grün-Akzenten statt kühlem Anthrazit
- Einkaufskarte und Einkaufsoptimierung mit farbigen Akzentflächen
- Aktive Kategoriechips farbiger
- Vier farbige Bottom-Navigation-Symbole:
  - Einkauf: Orange
  - Artikel: Blau
  - Märkte: Grün
  - Mehr: Violett
- Floating-Plus-Button farblich hervorgehoben


## Änderungen in Version 3

- Floating-Plus-Button vollständig entfernt
- Artikel hinzufügen jetzt kompakt direkt in der Einkaufskarte
- Listen-Cards deutlich kompakter:
  - weniger Innenabstand
  - kleinere Zwischenräume
  - kompaktere Metadaten
  - kleinere Preis- und Mengensteuerung
  - reduzierte Kartenradien und Schatten
- Markt- und Artikelübersichten ebenfalls platzsparender
- Abgehakte Einkaufsartikel werden automatisch ans Listenende verschoben
  - gilt bei „Liste“
  - gilt bei Sortierung nach Markt
  - gilt bei Sortierung nach Kategorie
  - gilt bei Sortierung nach Preis


## Änderungen in Version 4

### Datenmodell
- Schema-Version 2 eingeführt
- automatische Migration vorhandener lokaler Version-1–3-Daten
- Quelle pro Preisdatenpunkt
- Abruf-/Aktualisierungszeitpunkt
- Händlerprodukt-ID
- Preisverlauf
- Aktionsbedingungen

### Produktdetails
- Quelle und Aktualität je Händlerpreis
- Aktionsbadges
- Aktionsbedingungen
- Tiefst-/Durchschnitts-/Höchstpreis aus dem gespeicherten Verlauf
- aufklappbarer Preisverlauf

### Einkaufsoptimierung
Unter „Mehr → Einkaufsoptimierung“ stehen nun drei Modi zur Verfügung:
- Günstig: beliebig viele Märkte
- Max. 2: höchstens zwei Märkte
- 1 Markt: nur ein Markt

Die Optimierung priorisiert zuerst die größtmögliche Preisabdeckung und danach
den niedrigsten Gesamtpreis.

### Vorbereitung für Händlerimporte
Das Schema ist jetzt technisch bereit, externe Händler-Adapter einzuspeisen.
Die echten Preise sind weiterhin nicht live angebunden.


## Änderungen in Version 5 – Optimierungslogik korrigiert

### Ursache
Die vorherige Version konnte bei unvollständiger Preisabdeckung eine niedrigere
Teilsumme im Modus „1 Markt“ anzeigen. Diese Summe sah wie ein vollständiger
Gesamtpreis aus und war deshalb nicht sinnvoll mit „Max. 2“ vergleichbar.

### Korrektur
- vollständige Lösungen werden strikt von unvollständigen Lösungen getrennt
- eine Gesamtsumme wird nur noch angezeigt, wenn alle offenen Artikel bepreist sind
- bei fehlenden Preisen erscheint stattdessen „Teilbetrag“
- „Max. 2“ prüft weiterhin:
  - alle einzelnen Märkte
  - alle möglichen Zweierkombinationen
- bei vollständiger Abdeckung ist damit mathematisch garantiert:
  - `Max. 2 <= 1 Markt`
- zusätzliche defensive Invariante im Code:
  - sollte diese Regel wider Erwarten verletzt werden, fällt die Berechnung auf
    die gültige günstigere Ein-Markt-Lösung zurück
- bei Preisgleichheit wird die Lösung mit weniger tatsächlich verwendeten Märkten bevorzugt

### Freie Artikel
Freie Einkaufslisten-Artikel ohne eingetragenen Preis führen ebenfalls dazu, dass
keine scheinbar vollständige Gesamtsumme angezeigt wird.


## Änderungen in Version 6 – erster echter Live-Importer

### MPREIS
- separater Adapter `live-mpreis.js`
- Live-Suche im aktuellen MPREIS-Produktindex
- lokale Artikel können einmalig mit einem konkreten MPREIS-Produkt verknüpft werden
- verknüpfte Preise lassen sich unter „Mehr → MPREIS“ aktualisieren
- nach erfolgreicher Verknüpfung wird der Live-Preis direkt übernommen
- Preisverlauf wird bei jeder Synchronisierung fortgeschrieben
- automatische Aktualisierung beim App-Start, wenn die letzte Synchronisierung
  mehr als 12 Stunden zurückliegt
- Importfehler blockieren die restliche App nicht

### Nutzung
Unter „Mehr → Datenbank“ steht bei jedem Artikel ein Button `MPREIS`.
1. Button antippen.
2. Passendes MPREIS-Produkt suchen/auswählen.
3. Ab dann ist der Artikel verknüpft (`MPREIS ✓`).
4. „Mehr → MPREIS → Aktualisieren“ aktualisiert alle verknüpften Artikel.

### Warum keine automatische Namenszuordnung?
Ähnliche Produktnamen sind nicht zuverlässig genug. Die einmalige explizite
Verknüpfung verhindert falsche Zuordnungen von Marken oder Packungsgrößen.

### Technischer Hinweis
Der Abruf läuft direkt aus dem Browser zum von MPREIS verwendeten Algolia-Index.
Falls Browser oder Netzwerk den CORS-Zugriff blockieren, bleibt die App nutzbar;
der Live-Importer zeigt dann lediglich einen Fehler.


## Version 8 – GitHub Pages

Die App nutzt jetzt eine statische GitHub-Pages-Architektur.

MPREIS → GitHub Action → `data/mpreis.json` → GitHub Pages → Smartphone

Der Workflow läuft bei Push, manuell und alle 6 Stunden.

Persönliche Daten bleiben ausschließlich im Browser-localStorage und werden nicht
in das Repository geschrieben. Siehe `GITHUB_DATENSCHUTZ.md`.

Einrichtung: `GITHUB_SETUP.md`.


## Version 8.2 – robuster MPREIS-Datenimport

Der direkte MPREIS-Algolia-Nachbau wurde vorerst entfernt.

Als Quelle wird nun der öffentliche österreichische Rohdatenexport von
`heisse-preise.io/data/latest-canonical.json` verwendet. Der Export enthält unter
anderem MPREIS-Datensätze mit aktuellem Preis, Menge, Einheit, Bio-Status und
Preisverlauf.

### Verlässlichkeitsregeln

- ein erster Workflow kann nur grün werden, wenn mindestens 100 MPREIS-Produkte
  in `data/mpreis.json` vorhanden sind
- eine leere Datei kann deshalb nicht mehr unbemerkt als erfolgreich deployed werden
- sobald einmal ein gültiger Datenbestand vorhanden ist, bleibt dieser bei einem
  temporären Quellenfehler bestehen
- `data/**`-Commits des Preis-Bots lösen keinen neuen Workflow aus
- `.nojekyll` wird im Workflow selbst erzeugt

### Datenschutz

Keine Änderung: persönliche Einkaufsdaten bleiben ausschließlich im localStorage
des jeweiligen Browsers und werden nicht nach GitHub übertragen.


## Version 8.3 – MPREIS-Aktionen

Der stabile MPREIS-Grundpreisimport aus Heisse Preise bleibt unverändert.

Danach läuft eine zweite, bewusst getrennte Importstufe:

`scripts/update_mpreis_actions.py`

Sie liest die offizielle MPREIS-Seite „Alle Produkte in Aktion“ und übernimmt
eine Aktion nur dann, wenn sie eindeutig einem Produkt zugeordnet werden kann.

Unterstützt werden aktuell:
- Statt-Preis / Aktionspreis
- prozentuelle Preissenkung
- `ab N Stück`
- `bei N Stück`
- `1+1`, `2+1`, `2+2`, `4+2`, `12+12` usw.
- `NUR MIT APP`

Das öffentliche Produktobjekt erhält bei einer sicheren Zuordnung unter anderem:

```json
{
  "regularPrice": 2.99,
  "salePrice": 1.99,
  "promotionVerified": true,
  "promotion": {
    "type": "bundle",
    "requiredQuantity": 3,
    "paidQuantity": 2,
    "freeQuantity": 1,
    "label": "2+1 gratis",
    "loyaltyRequired": true,
    "loyaltyProgram": "MPREIS App",
    "verified": true
  }
}
```

### Ausfallsicherheit

Der Aktionsimport ist eine Zusatzstufe. Wenn die MPREIS-Aktionsseite ihre Struktur
ändert oder vorübergehend nicht erreichbar ist, bleibt `data/mpreis.json` mit den
normalen Preisen vollständig nutzbar. Unsichere Aktionen werden nicht geraten.

### App

- MPREIS-Suchergebnisse zeigen Aktionspreis, Statt-Preis und Bedingung.
- Verknüpfte lokale Produkte übernehmen die verifizierte Aktionsinformation.
- Produktdetails und Marktansicht verwenden die bereits vorhandenen Aktions-Badges.
- Der MPREIS-Status zeigt zusätzlich die Anzahl der verifizierten Aktionen.
- lokale MPREIS-Übernahme wird spätestens nach 6 Stunden aktualisiert.


## Version 8.4 – MPREIS Aktionsansicht

Unter `Mehr → MPREIS` gibt es nun einen direkten Einstieg:

`🔥 N Aktionsartikel anzeigen`

Die Ansicht benötigt keinen Suchbegriff. Sie liest ausschließlich Produkte mit
`promotionVerified === true` aus `data/mpreis.json` und zeigt alle aktuell
verifizierten MPREIS-Aktionen kompakt an.

Angezeigt werden:
- Produktname
- Menge
- Aktionspreis
- Statt-/Normalpreis
- Grundpreis
- Aktionsbedingung
- Kennzeichnung `NUR MIT APP`, sofern erforderlich

Geplanter späterer Ausbau:
Alle importierten Händlerprodukte sollen vollständig browsbar und durchsuchbar
werden, um die persönliche Produktdatenbank schneller zu pflegen und zu verknüpfen.


## Version 9.0 – SPAR als zweiter Live-Händler

SPAR ist nun zusätzlich zu MPREIS als automatisch aktualisierter Händler integriert.

### Öffentliche Daten

GitHub Actions erzeugt:

- `data/mpreis.json`
- `data/spar.json`

Beide Grundpreisdateien werden aus dem österreichischen Rohdatenexport von
Heisse Preise erstellt.

### SPAR in der App

Unter `Mehr → SPAR` werden angezeigt:

- Datenstand
- Anzahl der importierten SPAR-Produkte
- Anzahl der persönlich verknüpften Artikel
- manuelles Neuladen

In der persönlichen Artikeldatenbank gibt es pro Artikel nun zwei getrennte
Verknüpfungen:

- MPREIS
- SPAR

Eine SPAR-Verknüpfung übernimmt:

- aktuellen Preis
- Menge / Einheit
- Grundpreis
- Preisverlauf
- Abrufdatum und Quelle

Die Verknüpfungen bleiben weiterhin ausschließlich im localStorage des Browsers.

### Wichtig

SPAR-Aktionsbedingungen werden in Version 9.0 noch nicht separat ausgewiesen.
Der Grundpreisimport ist bewusst zuerst unabhängig und stabil umgesetzt.
Die offizielle SPAR-Aktionslogik ist der nächste separate Integrationsschritt.


## Version 9.1 – Aktionsdaten ausfallsicher

Beim Grundpreisimport werden zuletzt verifizierte MPREIS-Aktionsfelder nun
produktweise mitgeführt. Erst ein erfolgreiches neues Einlesen der offiziellen
MPREIS-Aktionsseite ersetzt sie.

Scheitert nur die Aktionsstufe vorübergehend:
- Grundpreise werden weiterhin aktualisiert
- die zuletzt verifizierten Aktionen bleiben vorhanden
- `promotionStale` wird auf `true` gesetzt
- `promotionLastError` dokumentiert den technischen Fehler
- die Aktion wird beim nächsten erfolgreichen Lauf frisch ersetzt

Dadurch kann ein einzelner temporärer MPREIS-Abruffehler die Aktionsansicht
nicht mehr komplett leeren.


## Version 9.2 – SPAR-Aktionen

SPAR-Aktionen werden als zweite Stufe nach dem stabilen SPAR-Grundpreisimport
ergänzt.

Quelle der Aktionsstufe:
`https://search-spar.spar-ics.com/fact-finder/rest/v4/search/products_lmos_at`

Verwendete offizielle strukturierte Felder sind unter anderem:
- `product-number`
- `is-on-promotion`
- `price`
- `regular-price`
- `badge-short-name`
- `badge-names`
- `url`

Die Zuordnung erfolgt ausschließlich über die SPAR-Produktnummer.

Unterstützte Darstellungen:
- Aktionspreis / Normalpreis
- 1+1, 2+1 usw.
- Monatssparer
- Preisgesenkt
- IMMER BILLIG
- Prozentaktionen
- SPAR-App/Joker-Hinweise, sofern im Datensatz vorhanden

### Ausfallsicherheit

Der Grundpreisimport trägt zuletzt verifizierte SPAR-Aktionen weiter.
Scheitert die Aktionsstufe vorübergehend, bleiben die letzten verifizierten
Aktionen erhalten und werden als `promotionStale` markiert.

### App

Unter `Mehr → SPAR` gibt es nun:
`🔥 N SPAR-Aktionsartikel anzeigen`

Die Liste zeigt ohne Suchbegriff alle aktuell verifizierten SPAR-Aktionsprodukte.
Persönlich verknüpfte SPAR-Produkte übernehmen die Aktionsinformationen ebenfalls.


## Version 9.3 – SPAR-Aktions-Badges korrigiert

Der SPAR-FactFinder liefert für österreichische Produkte zuverlässig
Produktnummer, Aktionsstatus, Preis und Normalpreis. Die semantischen Badge-Texte
sind jedoch nicht bei allen Datensätzen befüllt.

Daher arbeitet die Aktionsstufe nun zweistufig:

1. FactFinder identifiziert Aktion und Produkt eindeutig.
2. Nur wenn daraus lediglich ein rechnerischer `-xx %`-Badge entstehen würde,
   wird zusätzlich die offizielle SPAR-Produktseite des bereits identifizierten
   Artikels gelesen.

Dadurch können offizielle Bezeichnungen wie:
- `1+1 gratis`
- `2+1 gratis`
- `Monatssparer`
- `Preisgesenkt`
- `IMMER BILLIG`
- `SPAR-Joker`
- Mengenaktionen

erhalten bleiben, statt automatisch in einen Prozent-Rabatt umgerechnet zu werden.

Der Workflow schreibt außerdem eine Zusammenfassung der gefundenen Aktionsarten
ins Log und nach `promotionBreakdown` in `data/spar.json`.


## Version 9.4 – SPAR-Aktionsdiagnose

Diese Version verändert die sichtbare SPAR-Aktionslogik bewusst noch nicht.

Vor `SPAR-Aktionen ergänzen` läuft nun:
`scripts/diagnose_spar_promotions.py`

Die Diagnose untersucht den aktuellen SPAR-FactFinder-Datensatz und protokolliert:

- alle relevanten Feldnamen für Promotion/Badge/Preis
- unterschiedliche Werte und Häufigkeiten
- `is-on-promotion`
- `badge-short-name`
- `badge-names`
- `badge-icon`
- `price`
- `regular-price`
- `best-price`
- Preisbeziehungen
- relevante FactFinder-Facetten
- häufigste Kombinationen der Promotion-Felder
- einige Produktbeispiele pro Struktur

Zusätzlich wird `data/spar-promotion-diagnostics.json` erzeugt.

Ziel ist, echte kurzfristige Aktionen strukturell von Dauertiefpreisen wie
`IMMER BILLIG` und langfristigen Preisänderungen wie `Preisgesenkt` zu trennen,
bevor die Importlogik erneut geändert wird.


## Version 9.5 – SPAR-Aktionslogik auf Basis der Live-Diagnose

Die Diagnose des realen SPAR-FactFinder-Datensatzes hat gezeigt:

- `is-on-promotion=true` ist der zuverlässige Indikator für aktuelle Angebote.
- `price < regular-price` deckt nahezu dieselbe Aktionsmenge ab.
- `promotion-text` bzw. `promotion-most-likely-text` sind semantisch wertvoll,
  kommen derzeit aber nur bei sehr wenigen Produkten vor.
- `badge-names`, `badge-short-name` und `badge-icon` enthalten überwiegend
  Produktmerkmale oder längerfristige Preisprogramme und dürfen nicht als
  kurzfristige Aktionsart interpretiert werden.

Daraus folgt:

1. Nur `is-on-promotion=true` kommt in die Aktionsansicht.
2. Eine konkrete Aktionsbedingung wird nur angezeigt, wenn SPAR sie strukturiert
   in `promotion-text` / `promotion-most-likely-text` liefert.
3. Fehlt diese Information, lautet die sichere Bezeichnung schlicht `Aktion`.
4. Der rechnerische Rabatt bleibt als `discountPercent` gespeichert, wird aber
   nicht mehr als vermeintliche Aktionsart (`-xx %`) missverstanden.
5. 50 % Preisnachlass wird nicht automatisch als `1+1 gratis` bezeichnet.
6. `IMMER BILLIG`, Bio, Pfand, Lokalität oder 5%-Wein-Badges werden nicht zur
   Klassifikation einer laufenden Aktion verwendet.

Der temporäre Diagnose-Schritt wird im normalen Workflow wieder entfernt.
`scripts/diagnose_spar_promotions.py` kann für spätere Analysen im Repository
verbleiben, läuft aber nicht mehr automatisch.


## Version 10.0 – T&G Osttirol

T&G ist nun als dritter automatisch aktualisierter Händler integriert.

### Datenumfang

T&G stellt aktuell keinen vollständigen öffentlich durchsuchbaren Sortimentskatalog
bereit. Deshalb importiert PreisPilot bewusst nur Informationen, die auf der
offiziellen T&G-Aktionsseite eindeutig verfügbar sind:

- aktuelle Spezialaktionen
- Normalpreis
- Aktionspreis
- Grundpreistext
- Gültigkeitszeitraum
- prozentuale Sortimentsaktionen ohne festen Produktpreis
- Link zum aktuellen Osttirol-Flugblatt

Quelle:
`https://www.tundg.at/aktionen/`

### App

Unter `Mehr → T&G` gibt es:

- Datenstand
- Anzahl aktueller Spezialaktionen
- Gültigkeit
- persönliche T&G-Aktionsverknüpfungen
- Aktionsansicht ohne Suchbegriff
- direkten Link zum Osttirol-Flugblatt

In `Artikel verwalten` gibt es zusätzlich einen T&G-Button.

Die T&G-Suche in dieser Verknüpfung durchsucht ausdrücklich nur aktuell
bepreiste Spezialaktionen und ist kein vollständiger T&G-Katalog.

### Nach Aktionsende

Eine persönliche T&G-Verknüpfung bleibt lokal bestehen. Verschwindet die Aktion
aus dem aktuellen Import, wird der alte Aktionspreis über `validUntil`
automatisch nicht mehr als aktiver Angebotspreis verwendet. Der lokale
Preisverlauf bleibt erhalten.

### Datenschutz

Persönliche Produktverknüpfungen, Einkaufsliste und Einstellungen bleiben
weiterhin ausschließlich im localStorage des Browsers.


## Version 10.1 – T&G-Osttirol-Flugblatt-Diagnose

Ziel ist, künftig nicht nur die wenigen T&G-Spezialaktionen der Website,
sondern die vollständigen Angebote des regionalen Osttirol-Flugblatts zu
importieren.

Neue Datei:
`scripts/diagnose_tg_flyer.py`

Der Diagnose-Schritt:
- lädt den FlowPaper-Viewer
- untersucht HTML- und JavaScript-Assets
- sucht die zugrunde liegende PDF-Datei
- lädt sie, sofern auffindbar
- extrahiert den vorhandenen PDF-Text mit `pypdf`
- zählt typische Aktionssignale wie `BILLIGER`, `GRATIS`, Mengenbedingungen
  und Preiswerte
- speichert Seitenvorschauen und technische Informationen in
  `data/tg-flyer-diagnostics.json`

Noch werden aus dem Flugblatt keine zusätzlichen Preise in `data/tg.json`
übernommen. Erst nach Sichtung der echten PDF-Textstruktur wird der Parser
für das vollständige Osttirol-Flugblatt gebaut.


## Version 10.2 – FlowPaper-PDF-Auflösung korrigiert

Die erste T&G-Flugblattdiagnose hat die echte FlowPaper-Konfiguration gefunden:

`T-G_..._Osttirol_[*,2,true].pdf`

Das ist kein echter PDF-Dateiname, sondern FlowPapers Split-/Dual-Mode-Syntax.

Die Diagnose normalisiert solche Angaben nun automatisch zu:

`T-G_..._Osttirol.pdf`

Zusätzlich werden Original-PDF-Pfade aus `IMGFiles` und `JSONFile` abgeleitet.
Bekannte Demo-URLs aus FlowPaper-Bibliotheken wie `mydomain.com/abc.pdf` werden
verworfen.

Damit soll der nächste GitHub-Lauf erstmals die echte T&G-Osttirol-PDF laden
und den vorhandenen Text seitenweise analysieren.


## Version 10.3 – T&G Osttirol-Flugblatt wird importiert

Die Diagnose hat gezeigt, dass das offizielle regionale T&G-Flugblatt vollständig
als PDF erreichbar ist und auf acht Seiten maschinenlesbaren Produkttext enthält.

Der Workflow führt nun nach dem stabilen Spezialaktionsimport zusätzlich aus:

`scripts/update_tg_flyer.py`

### Was aus dem Flugblatt übernommen wird

Der Parser erkennt Produktblöcke anhand der im PDF gedruckten Grundpreise.
Aus Menge und Grundpreis wird der sichtbare Angebotspreis rekonstruiert und
anschließend gegen die tatsächlich gedruckten Preiswerte derselben Seite
abgeglichen. Dadurch werden auch Rundungsfälle wie 15,99 statt rechnerisch
16,00 berücksichtigt.

Erkannt werden unter anderem:
- kg-, g-, l- und ml-Gebinde
- Multipacks wie `20 x 0,5 l`
- Mengenbereiche wie `160–411 ml`
- Preise je 100 g
- Preise je 0,5 l
- Rollen- und Meterpreise

### Mengen- und Gratisaktionen

Besonders sichere Muster wie:

`0,69`
`1 DS. 1,39`
`BEI 24 DS. JE`

werden zusätzlich ausgewertet. Aus Preisverhältnis und benötigter Menge kann
z. B. `12+12 gratis`, `4+2 gratis`, `3+3 gratis`, `2+1 gratis` oder `1+1 gratis`
eindeutig rekonstruiert werden.

Nur solche eindeutig zugeordneten Bedingungen werden für persönliche
Produktverknüpfungen und den Optimierer freigegeben.

### Konservative Behandlung aller anderen Flugblattpreise

Das PDF enthält viele Mengenhinweise wie `AB 2 PKG.`, deren räumliche Zuordnung
im reinen PDF-Text nicht immer zweifelsfrei erhalten bleibt.

Diese Produkte werden trotzdem mit erkanntem Flugblattpreis in der
T&G-Aktionsansicht angezeigt, erhalten aber das Kennzeichen `nur Anzeige`.
Sie fließen nicht in den Optimierer ein, bis die Bedingung sicher zugeordnet
werden kann.

Damit ist ein falscher Preisvergleich ausgeschlossen, während trotzdem der
Großteil des Osttirol-Flugblatts direkt in der App sichtbar wird.

Der bisherige Spezialaktionsimport bleibt als stabile zweite Quelle erhalten.


## Version 10.4 – räumliche T&G-Zuordnung + korrekte Mengenpreise

Der T&G-Flugblattimport verwendet zusätzlich zu der bereits bewährten
Textreihenfolge nun die echten PDF-Textkoordinaten.

### Räumliche Zuordnung

`pypdf` liefert für Textfragmente die Position auf der jeweiligen PDF-Seite.
PreisPilot sucht damit Produktanker über Produktname und Grundpreis und ordnet
Mengenhinweise wie:

- `AB 2 PKG.`
- `AB 6 FL.`
- `AB 12 DS.`
- `AB 24 DS.`
- `AB 2 KISTEN`

nur dann einem Artikel zu, wenn die Position eindeutig genug ist.

Bei räumlich mehrdeutigen Treffern wird bewusst keine Zuordnung vorgenommen.
Die bisherige textbasierte Erkennung bleibt die stärkere Quelle und wird nicht
überschrieben.

Der Workflow protokolliert getrennt:

- sicher über Textstruktur zugeordnet
- zusätzlich über PDF-Positionen zugeordnet
- insgesamt sicher verknüpfbar

### Mengenbedingungen im Optimierer

Der Optimierer berücksichtigt jetzt `requiredQuantity` tatsächlich.

Beispiele:

- `ab 2 Stück`: bei Menge 1 wird der Aktionspreis nicht verwendet; ist der
  Normalpreis unbekannt, gilt das Angebot für diese Einkaufsmenge als nicht
  bepreist.
- `1+1 gratis`: vollständige Aktionsgruppen werden zum gedruckten Effektivpreis
  berechnet. Eine Restmenge wird nur dann bewertet, wenn ein Normalpreis bekannt
  ist.
- Ein Mengenangebot ohne bekannten Normalpreis wird unterhalb der Mindestmenge
  nicht geschätzt.

Damit können Mengenaktionen nicht mehr fälschlich als normaler Einzelpreis in
`Günstigster Einkauf`, `Maximal 2 Märkte` oder `Nur ein Markt` einfließen.

Die T&G-Aktionsansicht bleibt unverändert vollständig: nicht sicher zuordenbare
Flyerpreise werden weiterhin als `nur Anzeige` dargestellt.


## Version 11.0 – Händlerkatalog

Die Seite `Artikel` besitzt nun zwei Ansichten:

- `Meine Artikel`
- `Händlerkatalog`

Der Händlerkatalog umfasst derzeit alle bereits importierten Produktbestände von:

- MPREIS
- SPAR
- T&G

### Browsing

Ein leerer Suchbegriff zeigt den vollständigen Händlerbestand alphabetisch an.
Damit die mobile App bei zehntausenden Produkten flüssig bleibt, werden immer
nur 50 Produkte gerendert. Über `Weitere Produkte laden` wird seitenweise
nachgeladen.

Die Suche läuft trotzdem über den vollständigen Händlerbestand und nicht nur
über die gerade sichtbaren 50 Karten.

Optional kann mit `🔥 Aktionen` ausschließlich nach aktuell erkannten
Aktionsartikeln gefiltert werden.

### Verknüpfen vom Händlerprodukt aus

Jede Händlerproduktkarte besitzt nun `Verknüpfen`.

Danach kann:
- ein bestehender persönlicher Artikel ausgewählt werden oder
- das Händlerprodukt direkt als neuer persönlicher Artikel übernommen werden.

Die neue Richtung ergänzt den bisherigen Workflow
`persönlicher Artikel → Händlerprodukt suchen`.

### Datenschutz

Der Händlerkatalog liest ausschließlich die öffentlichen JSON-Preisdateien.
Welche Produkte mit welchen persönlichen Artikeln verknüpft wurden, bleibt
weiterhin ausschließlich im localStorage des Browsers.

### Performance

Die Live-Module MPREIS, SPAR und T&G besitzen nun eine gemeinsame paginierte
`browse()`-Schnittstelle. Der alphabetische Index wird erst beim ersten Öffnen
des jeweiligen Katalogs im Browser aufgebaut und anschließend wiederverwendet.


## Version 11.1 – Flugblätter MPREIS, INTERSPAR und T&G

Die Händlerkarten unter `Mehr` besitzen nun ein einheitliches Zwei-Button-Layout:

- `🔥 Aktionen`
- `📄 Flugblatt`

### MPREIS

Seit Version 11.2 wird die offizielle MPREIS-Flugblattseite direkt mit Region
`Osttirol` geöffnet:

`https://www.mpreis.at/aktionen/flugblatt?region=osttirol`

Die frühere Tirol-Voreinstellung aus Version 11.1 wurde damit korrigiert.

### SPAR / INTERSPAR

Auf ausdrücklichen Wunsch wird nicht das allgemeine SPAR-Flugblatt verwendet,
sondern die offizielle INTERSPAR-Seite für Osttirol:

`https://www.interspar.at/aktionen/osttirol`

Die Seite führt jeweils die aktuellen INTERSPAR-Osttirol-Flugblätter.

### T&G

T&G verwendet weiterhin den vom GitHub-Importer automatisch erkannten
regionalen Osttirol-Flugblatt-Viewer aus `data/tg.json`.

Damit müssen für die drei Händler keine kalenderwochenabhängigen URLs in der
App gepflegt werden.


## Version 11.2 – Gebindevergleich, bessere Produktsuche, MPREIS Osttirol

### Vergleichsmenge statt blindem Gebindepreis

Persönliche Artikel besitzen weiterhin `Menge + Einheit`, diese Werte werden
jetzt ausdrücklich als **Vergleichsmenge** verwendet. Direkt in der Artikelliste
kann die Vergleichsmenge über `Vergleich: … ✎` geändert werden.

Jede Live-Verknüpfung merkt sich zusätzlich die tatsächliche Gebindegröße des
Händlerprodukts. Für einen Vergleich berechnet PreisPilot zunächst, wie viele
ganze Händlergebinde nötig sind, um die persönliche Vergleichsmenge zu decken.
Erst auf diese Gebindeanzahl werden `ab N`, `1+1`, `2+1` usw. angewandt.

Damit können z. B. eine 20×0,5-l-Bierkiste, ein 6×0,5-l-Pack und einzelne
0,5-l-Dosen korrekt für dieselbe Zielmenge verglichen werden.

### Erweiterte Händlerproduktsuche

Die Heisse-Preise-Grunddaten enthalten keine belastbare allgemeine
Produktkategorie. Deshalb erweitert `live-search.js` die Suche um eine lokale,
deterministische Produkttyp-Taxonomie und vorsichtige Marken-Inferenz.

Beispiel: Eine Suche nach `Bier` findet jetzt auch passende Artikel, bei denen
der Datensatz hauptsächlich den Markennamen enthält. Entsprechende Aliasgruppen
gibt es auch für häufige Produkttypen wie Kaffee, Milch, Käse, Joghurt, Nudeln,
Wasser, Limonade, Saft, Wein, Sekt, Schokolade, Chips, Waschmittel usw.

Die Verknüpfungssuche zeigt bis zu 60 Treffer und nennt zusätzlich die gesamte
Trefferzahl. Der Händlerkatalog verwendet dieselbe erweiterte Suchlogik.

### MPREIS Flugblatt

Der MPREIS-Flugblattbutton verwendet nun direkt:

`https://www.mpreis.at/aktionen/flugblatt?region=osttirol`

Die frühere Tirol-Voreinstellung wurde entfernt.


## Version 11.3 – persönliche Artikel bearbeiten

Diese Version basiert direkt auf dem vom Nutzer heruntergeladenen Repository
`Einkaufen-main.zip`.

Persönliche Artikel können nun nachträglich geändert werden, ohne sie zu
löschen oder neu anzulegen.

Bearbeitbar sind:
- Artikelname
- Marke
- Kategorie
- Vergleichsmenge
- Einheit

Der Bearbeiten-Button ist an drei Stellen verfügbar:
- `Artikel → Meine Artikel`
- im Produktdetail
- `Mehr → Datenbank → Artikel verwalten`

Beim Speichern wird derselbe Produktdatensatz aktualisiert. Unverändert bleiben:
- Produkt-ID
- MPREIS-/SPAR-/T&G-Verknüpfungen
- vorhandene Angebote und Preisverläufe
- Favoritenstatus
- Referenzen aus der Einkaufsliste

### GitHub-Pages-Korrektur

Im Repository war `live-search.js` bereits vorhanden und in `index.html` sowie
im Service Worker eingetragen, aber der GitHub-Pages-Workflow kopierte die
Datei nicht nach `_site`.

Dadurch konnte die mit v11.2 eingeführte erweiterte Händlersuche im
Pages-Deployment fehlen.

Der Workflow kopiert jetzt zusätzlich `live-search.js` nach `_site` und prüft
die Such-, Katalog- und Gebindelogik vor dem Deployment.
\n\n## Version 11.4 – Aktionslogik vollständig abgesichert\n\nDiese Version korrigiert die Aktionsberechnung in Einkaufsliste und Optimierer.\n\n### T&G 1+1 / Mehrfachgebinde\n\nEin verknüpftes Händlergebinde wird zuerst in die persönliche Vergleichsmenge\numgerechnet. Anschließend werden alle sinnvollen kaufbaren Paketmengen geprüft.\nDamit kann der Optimierer eine zusätzliche Packung/Kiste bewusst mitnehmen,\nwenn dadurch eine Aktion greift und der reale Kassenbetrag gleich hoch oder\nniedriger ist.\n\nBeispiel für eine aktive 1+1-Aktion:\n- Normalpreis pro 10-l-Kiste: 29,80 EUR\n- 1+1-Aktionspreis je Kiste: 14,90 EUR\n- 2 Kisten kosten zusammen 29,80 EUR, nicht 59,60 EUR.\n- Wird nur eine 10-l-Vergleichsmenge benötigt, darf die App trotzdem zwei\n  Kisten wählen, wenn die zweite gratis ist und der Kassenbetrag dadurch nicht\n  steigt.\n\n### Geprüfte Aktionstypen\n\n- normaler Aktions-/Preisreduktionspreis\n- Prozentaktion mit konkretem Aktionspreis\n- Mengenpreis `ab N Stück`\n- Bundles `1+1`, `2+1`, `4+2`, `12+12` und allgemeine N+M-Strukturen\n- Restmengen bei Bundles zum Normalpreis, sofern dieser bekannt ist\n- App-/Treuebedingungen bleiben am Preis sichtbar\n- Aktionen ohne sicheren Fixpreis bleiben vom Optimierer ausgeschlossen\n\n### Gültigkeitsdaten\n\nAktionspreise werden nur noch verwendet, wenn sie am lokalen Kalendertag in\nÖsterreich gültig sind. Zukünftige und abgelaufene Aktionen werden vollständig\naus der Aktionsdarstellung und aus der Preisberechnung entfernt. Dadurch kann\nnicht mehr `1+1 gratis` angezeigt werden, während im Hintergrund bereits der\nNormalpreis gerechnet wird.\n\nWenn ein MPREIS- oder SPAR-Aktionsimport als `promotionStale` markiert ist,\nwerden die alten Aktionspreise vorsorglich nicht mehr verwendet. Die normalen\nProduktpreise bleiben verfügbar.\n\n### T&G-Ausgabenwechsel\n\nDie offizielle T&G-Seite kann am ersten Gültigkeitstag noch die abgelaufene\nAusgabe als `Aktuelle Ausgabe` und die bereits begonnene Ausgabe als `Kommende\nAusgabe` anzeigen. Der Importer erkennt diesen Datumswechsel nun selbst, leitet\nden offiziellen Osttirol-Viewer aus der neuen Periode ab und prüft ihn vor der\nVerwendung. Ist der neue Viewer noch nicht erreichbar, werden alte Aktionen\nnicht als aktuell ausgegeben.\n\n### Integritätsprüfung\n\nVor jedem Pages-Deployment prüft `scripts/check_action_integrity.py` alle drei\nöffentlichen Datensätze auf ungültige Preise, Datumsintervalle, Mengenaktionen,\nBundle-Mengen und unsichere Optimierer-Freigaben.\n