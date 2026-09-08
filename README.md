# PreisPilot Osttirol – Version 8

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
