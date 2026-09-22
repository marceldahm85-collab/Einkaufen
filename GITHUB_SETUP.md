# GitHub Pages einrichten

1. Neues Repository erstellen, z. B. `preispilot-osttirol`.
2. Den kompletten Inhalt dieser ZIP in den Branch `main` hochladen.
3. `Settings -> Pages -> Build and deployment -> Source -> GitHub Actions`.
4. `Settings -> Actions -> General -> Workflow permissions`:
   `Read and write permissions` aktivieren.
5. Unter `Actions` den Workflow `Preise aktualisieren und Pages bereitstellen`
   prüfen oder manuell mit `Run workflow` starten.
6. Nach erfolgreichem Lauf die angezeigte GitHub-Pages-Adresse öffnen.

Der Workflow läuft außerdem automatisch alle 6 Stunden.

Persönliche Einkaufsdaten werden dabei nicht verarbeitet oder hochgeladen.

## BILLA ab v13.0

Der Workflow erzeugt zusätzlich `data/billa.json` über `scripts/update_billa.py`.
`live-billa.js` muss deshalb zusammen mit den übrigen App-Dateien in GitHub liegen
und wird vom Pages-Schritt nach `_site/` kopiert.

Beim manuellen Komplett-Upload gilt weiterhin: den vorhandenen Ordner `data/`
nicht überschreiben. Der GitHub-Workflow aktualisiert die öffentlichen Datendateien
selbst und ergänzt `billa.json` beim nächsten erfolgreichen Lauf.
