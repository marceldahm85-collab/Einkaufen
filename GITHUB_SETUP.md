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
