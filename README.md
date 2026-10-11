# Hauskredit

Kleine Web-App (PWA) zum Planen von Sondertilgungen und Dokumentieren der Restschuld.
Läuft komplett im Browser, funktioniert offline und lässt sich am Handy wie eine App installieren.
**Alle Daten bleiben auf dem jeweiligen Gerät** – im Repository liegt nur die leere App.

## Auf GitHub Pages veröffentlichen

1. Auf github.com ein neues Repository anlegen, z. B. `hauskredit`.
   Für GitHub Pages im Gratis-Konto muss es **öffentlich** sein (es enthält keine persönlichen Daten).
2. Im Repository auf **Add file → Upload files** und den **Inhalt** dieses Ordners hineinziehen
   (also `index.html`, `sw.js`, `manifest.webmanifest`, `.nojekyll`, `README.md` und die Ordner `icons` und `fonts`).
   Mit **Commit changes** bestätigen.
3. **Settings → Pages**: bei *Source* „Deploy from a branch“ wählen, Branch `main`, Ordner `/ (root)`, **Save**.
4. Nach ein bis zwei Minuten ist die App erreichbar unter
   `https://DEIN-BENUTZERNAME.github.io/hauskredit/`

> Hinweis: Die Datei `.nojekyll` beginnt mit einem Punkt und wird von manchen Systemen versteckt.
> Sie ist nicht zwingend nötig, verhindert aber, dass GitHub die Seite unnötig verarbeitet.

## Am Handy installieren

- **iPhone (Safari):** Link öffnen → Teilen-Symbol → **Zum Home-Bildschirm**.
- **Android (Chrome):** Link öffnen → Menü ⋮ → **App installieren** (bzw. „Zum Startbildschirm hinzufügen“).

Danach startet die App vom Home-Bildschirm im Vollbild und funktioniert auch ohne Internet.

## Daten übernehmen

Die installierte App hat ihren eigenen Speicher – vor allem am iPhone sieht sie die Daten aus Safari
oder aus einer früheren Version **nicht**. So überträgst du sie:

1. In der alten Version: **Kreditdaten → Sicherung herunterladen**.
2. In der installierten App: **Kreditdaten → Sicherung laden** und die Datei auswählen.

Lade auch später regelmäßig eine Sicherung herunter (z. B. in iCloud Drive oder Google Drive),
denn beim Löschen der App oder der Browserdaten sind die Daten sonst weg.

## Updates

Einfach die geänderte `index.html` im Repository ersetzen. Die App lädt die neue Version beim
nächsten Start automatisch, sobald das Handy online ist. Wurden Schriften oder Icons geändert,
in `sw.js` die `VERSION` erhöhen.

## Schriften

IBM Plex Sans und IBM Plex Serif (SIL Open Font License 1.1), lokal eingebunden über Fontsource.
