# Hauskredit-PWA – Projektkontext

> **So nutzt du diese Datei:** In einem neuen Chat diese `CONTEXT.md` und die aktuelle `index.html` hochladen und dazuschreiben, was du ändern möchtest. Nach jeder größeren Änderung diese Datei mit aktualisieren lassen.

Stand: Oktober 2026 · App-Version 1.0.0 · Service-Worker-Cache `hauskredit-1.0.0`

---

## Ziel

Eine persönliche Web-App für einen österreichischen Wohnbaukredit. Sie hat drei Aufgaben:

1. Sie zeigt die Eckdaten des Kredits auf einen Blick: Restschuld, Rate, Zinsen, Fixzinsende und Laufzeit.
2. Sie berechnet Sondertilgungen: neue Rate, neue Laufzeit, Zinsersparnis und Gebühr. Dabei lassen sich mehrere Sondertilgungen mit jeweils eigener Wirkung kombinieren.
3. Sie dokumentiert die Restschuld Monat für Monat in einem Journal.

Die App läuft komplett im Browser und funktioniert offline. Gehostet wird sie auf GitHub Pages und am Handy als PWA installiert. Die Daten bleiben ausschließlich auf dem Gerät, einen Server oder Account gibt es nicht.

## Dateien

```
hauskredit-pwa/
├── index.html             komplette App (HTML + CSS + JS in einer Datei, Vanilla JS, keine Libraries)
├── sw.js                  Service Worker
├── manifest.webmanifest   PWA-Manifest (standalone, theme #1F5C45)
├── icons/                 icon-192/512, icon-maskable-512, apple-touch-icon (180), favicon-32
├── fonts/                 IBM Plex Sans 400/500/600, IBM Plex Serif 500/600 (latin, woff2, lokal)
├── README.md              Anleitung GitHub Pages + Installation
└── .nojekyll
```

## Bedienoberfläche (4 Reiter)

**Übersicht.** Oben steht die Restschuld laut Plan heute als große Zahl. Darunter zeigt eine Zeitleiste Beginn, „Heute“, Fixzinsende (schraffiert) und Ende. Es folgen die Kennzahlen:
- Rate und aktueller Zins
- Fixzinsende und angenommener Zins danach
- Restschuld und Rate nach dem Fixzinsende
- Laufzeitende und Restlaufzeit
- Zinsen bis zum Ende
- Wirkung von Sondertilgungen, Gebührenregel und heute gebührenfrei möglicher Betrag
- letzter Journaleintrag
- Notizen

Ein Plausibilitätscheck meldet sich, wenn das berechnete Ende vom Vertragsende abweicht. Er schlägt dann ggf. eine andere Zinsmethode vor.

**Sondertilgung.** Beliebig viele Einträge, jeweils mit:
- Betrag und Datum
- Wiederholung: einmalig oder jährlich, mit „Wie oft?“ (leer heißt bis zum Ende)
- Wirkung: „Rate senken“ oder „Laufzeit verkürzen“

Pro Eintrag gibt es einen Live-Hinweis zur Gebühr. Optional lässt sich der Plan mit einheitlicher Wirkung vergleichen (alles Rate bzw. alles Laufzeit). Per Checkbox wählbare Ausgaben:
- `rate`: neue Monatsrate
- `end`: Laufzeit und Enddatum
- `savings`: Zinsersparnis
- `fee`: Gebühr
- `fix`: Stand zum Fixzinsende
- `chart`: Grafik
- `years`: Entwicklung nach jeder Sondertilgung
- `plan`: monatlicher Tilgungsplan

Das Ergebnis ist eine Vergleichstabelle mit „Ohne Sondertilgung“ gegen die Szenarien. Dazu kommen ein SVG-Liniendiagramm und die Detailtabellen.

**Restschuld-Journal.** Jeder Eintrag hat diese Felder:
- Monat und Restschuld
- Zinssatz (vorbefüllt aus den Kreditdaten)
- Tilgung über die Rate (mit Button „aus Restschuld-Differenz ableiten“)
- Sondertilgung und deren Datum
- Notiz

Die Tabelle zeigt Veränderung zum Vormonat und eine Summenzeile, darüber den Verlaufsgraph und den Status des gebührenfreien Rahmens. Einträge lassen sich bearbeiten und löschen. Der neueste Eintrag kann als Ausgangswert übernommen werden.

**Kreditdaten.** Das Formular für alle Parameter, dazu „Beispielwerte einsetzen“. Darunter liegt der Bereich Sicherung: JSON-Export und -Import sowie das Journal als CSV (Semikolon, Dezimalkomma, BOM). Die Versionsanzeige steht ebenfalls hier.

## Datenmodell

Gespeichert in `localStorage` unter dem Key **`hauskredit-v1`**. Eine Sicherungsdatei hat dasselbe JSON-Format.

```js
{
  params: {
    name, betrag,              // Bezeichnung, ursprünglicher Kreditbetrag (nur Info)
    beginn, ende,              // "YYYY-MM": erste / letzte Rate laut Vertrag
    rate,                      // derzeitige Monatsrate
    rest, restMonat,           // Restschuld nach der Rate im Monat restMonat = Startpunkt aller Berechnungen
    zinsFix, fixEnde,          // Zins % p. a., letzter Monat mit Fixzins ("YYYY-MM" oder "")
    zinsVar,                   // erwarteter Durchschnittszins nach Fixzinsende
    neuNachFix,                // bool: Rate wird nach Fixzinsende neu berechnet
    zinsMethode,               // "30/360" | "act/360" | "act/365"
    wirkung,                   // Vertrags-Default: "rate" | "laufzeit"
    gebuehr,                   // % Gebühr auf den Teil über dem Freibetrag
    freibetrag,                // € gebührenfrei (z. B. 34700) oder null = Gebühr auf alles
    freiZeitraum,              // "rolling" (365 Tage) | "calendar" (Kalenderjahr)
    notiz
  },
  journal: [ { ym, amount, note, zins, tilgung, st, stDate } ],   // stDate "YYYY-MM-DD"
  plan:    [ { id, amount, date, repeat: "once"|"yearly", count, mode: "rate"|"laufzeit" } ], // Rohwerte als Strings
  outputs: { rate, end, savings, fee, fix, chart, years, plan },  // Checkbox-Auswahl
  cmpUniform: bool,
  updated: ISO-Datum
}
```

Monate werden intern als Index gerechnet: `idx = Jahr*12 + Monat-1`. Hilfsfunktionen dafür sind `ymToIdx` und `idxToYm`.

## Rechenlogik (`simulate(p, specials, override)`)

- **Start und Ablauf.** Die Rechnung beginnt mit `rest` nach der Rate im Monat `restMonat` und läuft dann Monat für Monat. Die Rate wird am Monatsende gezahlt.
- **Monatszins** (`rateFns`):
  - 30/360: Jahreszins ÷ 12
  - act/360: Jahreszins × Tage im Monat ÷ 360
  - act/365: Jahreszins × Tage im Monat ÷ 365

  Für Annuität und Laufzeit (`annuity`, `nper`) wird der durchschnittliche Monatszins verwendet.
- **Sondertilgung im Monat.** Die Zinsen werden taggenau aufgeteilt: vor dem Tag der Sondertilgung auf die alte Restschuld, danach auf die neue. Ein Betrag über der Restschuld wird gekappt.
- **„Rate senken“.** Die Rate wird mit `Restschuld_mit_ST / Restschuld_ohne_ST` multipliziert. Die Restlaufzeit, die sich aus der tatsächlichen Rate ergibt, bleibt dadurch gleich.
  - ⚠️ Das ist bewusst so: Früher wurde die Rate als neue Annuität bis zum Vertragsende berechnet. Weil die echte Bankrate davon abweicht, sank die Rate schon bei 1 € Sondertilgung um rund 15 €. Diese Lösung bitte nicht zurückbauen.
- **„Laufzeit verkürzen“.** Die Rate bleibt gleich, der Kredit endet früher.
- **Fixzinsende** (falls `neuNachFix`). Neue Rate = `annuity(Restschuld, neuer Zins, nper(Restschuld, Fixzins, aktuelle Rate))`. Die bis dahin geltende, eventuell schon verkürzte Restlaufzeit bleibt also erhalten.
- **Mehrere Sondertilgungen.** Jede wirkt mit ihrem eigenen `mode`, außer `override` ist gesetzt. Gesetzt wird `override` nur im Vergleich „alles Rate“ bzw. „alles Laufzeit“.
- **Rückgabe:** `{ rows[{m, zins, rate, interest, tilgung, st, bal}], applied[], totalInt, totalSt, lastIdx, paidOff }`.
- **„Entwicklung nach jeder Sondertilgung“.** Für jede k-te Sondertilgung wird mit den ersten k Zahlungen simuliert. Daraus ergeben sich „Letzte Rate“ und „Ersparnis bis dahin“ unter der Annahme, dass danach keine weitere Sondertilgung mehr kommt.

## Gebührenlogik

- **Was angerechnet wird.** Sondertilgungen aus dem Journal zählen zum Rahmen (`journalSpecials`). Maßgeblich ist `stDate`; ohne Datum gilt das Monatsende.
- **Zeitfenster.** Rollierend: alle Zahlungen der letzten 365 Tage inklusive der aktuellen. Bei Kalenderjahr: alle Zahlungen im selben Jahr.
- **Berechnung.** `plannedFees` geht die geplanten Zahlungen chronologisch durch und berücksichtigt dabei Journal und bereits geplante Zahlungen. Die Gebühr fällt nur auf den Teil über dem Freibetrag an.
  - Beispiel: 34.700 € frei, 1 %, Zahlung von 36.000 € → 13 € Gebühr.
- **Ausgabe in der Vergleichstabelle.** „Davon gebührenfrei“, „Gebühr“ und „Ersparnis nach Gebühr“.

## Gestaltung

- **Farben** als CSS-Variablen in `:root`, mit Dark Mode über `prefers-color-scheme`:
  - Flaschengrün `--accent #1F5C45` (dunkel: `#7CC3A0`)
  - Gold `--gold` für Sondertilgung und Fixzins
  - `--c3` als Violett für die dritte Linie im Diagramm
  - Hintergrund `#F2F4F2`
- **Schrift.** IBM Plex Sans für die Oberfläche, IBM Plex Serif für große Zahlen, überall `tabular-nums`.
- **Breakpoints.** Ab 860 px wird das Layout einspaltig. Ab 600 px gilt das kompakte Handy-Layout: Reiter in voller Breite, „Restschuld-“ wird ausgeblendet, Kennzahlen zweispaltig.
- **Tabellen.** Sie liegen in `.scroll` und scrollen seitlich. Die erste Spalte ist sticky. Im Tilgungsplan (`.tall`) ist zusätzlich der Kopf sticky.
- **Formate.** Sprache ist Deutsch (Österreich). Alle Formate laufen über `de-AT`, z. B. „€ 1.234,56“ und „Jänner“. Zahleneingaben akzeptieren `1.234,56`, `1234.56` und `34.700` (siehe `parseNum`).

## PWA

- **`sw.js`.** Seitenaufrufe kommen zuerst aus dem Netz (`cache: "no-cache"`), offline aus der gecachten `index.html`. Andere Dateien kommen zuerst aus dem Cache. `skipWaiting` und `clients.claim` sind gesetzt.
- **Updates.** Für eine neue App-Version genügt es, `index.html` zu ersetzen. Bei geänderten Icons oder Schriften muss `VERSION` in `sw.js` erhöht werden.
- **Speicher.** Die App fordert `navigator.storage.persist()` an.
- **Downloads in der installierten App.** Sicherung und CSV gehen über `navigator.share` mit Datei, sonst über einen normalen Download-Link.
- **iOS.** Die installierte App hat einen eigenen Speicher, getrennt von Safari. Daten werden per Sicherungsdatei übertragen.

## Konventionen für Änderungen

- Alles bleibt in **einer** `index.html`. Keine Frameworks, kein Build-Schritt, keine externen Requests.
- Neue Felder kommen in `params` bzw. in die Journal-Einträge. Ältere Sicherungen müssen weiter funktionieren, fehlende Felder bekommen also sinnvolle Defaults.
- Der localStorage-Key `hauskredit-v1` bleibt. Er wird nur gewechselt, wenn wirklich nötig, und dann mit Migration.
- Nach Änderungen die Versionsnummer in `index.html` (Text „Version x.y.z“) anheben. Werden Assets geändert, auch die in `sw.js`.

## Verlauf

1. Grundversion: Übersicht, einmalige und jährliche Sondertilgung, wählbare Ausgaben, Journal.
2. Journal um Zinssatz, Tilgung über Rate und Sondertilgung mit Datum erweitert. Freibetrag mit Gebühr auf den Überschuss (365 Tage oder Kalenderjahr) eingeführt.
3. Eigenständige HTML-Datei mit Sicherung (JSON) und CSV-Export.
4. Layout-Fixes (Überlauf, sticky erste Spalte). Mehrere Sondertilgungen mit eigener Wirkung und Wiederholung.
5. Ratenberechnung korrigiert (proportional statt Neuberechnung). Einstellung „Zinsberechnung der Bank“ mit Vorschlag im Plausibilitätscheck.
6. Umbau zur PWA für GitHub Pages: Manifest, Service Worker, Icons, lokale Schriften.

## Ideen für später (noch nicht umgesetzt)

- Soll/Ist-Vergleich: Journal-Restschuld gegen berechneten Plan.
- Szenarien speichern und benennen, um mehrere Pläne nebeneinander zu haben.
- Zinsszenarien nach dem Fixzinsende, z. B. 3 % / 4 % / 5 % im Vergleich.
- Sondertilgung als Prozent vom Freibetrag bzw. „Freibetrag voll ausnutzen“ als Ein-Klick-Option.
- Mehrere Kredite verwalten.
