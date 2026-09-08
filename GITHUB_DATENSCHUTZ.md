# Daten-Trennung

## Auf GitHub
- App-Code
- PWA-Dateien
- GitHub Actions
- Importskripte
- öffentliche Händlerpreise
- technischer Importstatus

## Ausschließlich lokal im Browser
- Einkaufsliste
- abgehakte Artikel
- freie/private Artikel
- persönliche Einstellungen
- Theme
- Produktverknüpfungen
- manuell angelegte private Artikel

Das Frontend schreibt keine persönlichen Daten nach GitHub. Persönliche Daten
werden ausschließlich über `localStorage` auf dem jeweiligen Gerät gespeichert.

Dadurch besitzt jedes Gerät zunächst seine eigene private Einkaufsliste.
