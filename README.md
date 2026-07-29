# Festival-App

Einladungs- und Orga-App für unser Festival: Gäste melden sich über die öffentliche
Einladungsseite an und zahlen ihren Beitrag auf Spendenbasis (PayPal oder bar), die
Orga verwaltet Gäste, Aufgaben, Budget und Teams im passwortgeschützten Admin-Bereich.

## Features

- **Einladungsseite** mit Termin, Anfahrtskarte, datensparsamem Anmeldeformular
  (Name, E-Mail, Begleitpersonen) und Datenschutzhinweis
- **Beitrag auf Spendenbasis**: PayPal-Checkout mit Webhook-Abgleich oder Barzahlung
  vor Ort, Bestätigungsmail per Gmail; abgebrochene Zahlungen lassen sich über den
  Link in der Mail (`/zahlung/<id>`) jederzeit nachholen
- **Warteliste**: Bei erreichter Kapazität (`RSVP_CAPACITY`) landen neue Anmeldungen
  automatisch auf der Warteliste; Nachrücken per Klick im Admin inkl. Info-Mail
- **Kontaktformular** mit Anfragen-Inbox im Admin, E-Mail-Benachrichtigung an die Orga
  und Antwort direkt aus dem Admin
- **Admin-Dashboard**: Gästeliste (bearbeiten, löschen, als bezahlt markieren,
  CSV-Export für die Türliste), Aufgaben-Board mit Budgetkategorien
  (Plan-/Ist-Kosten, Fälligkeitsdaten, Status-Filter), Teams & Members,
  Broadcast über das OpenClaw-Gateway
- **PayPal-Status** unter `/admin/paypal`: zeigt live, ob die Anbindung gegen die
  Sandbox oder gegen echtes Geld läuft, ob die Zugangsdaten passen und welche
  Buchungen angekommen sind
- **Verlauf** unter `/admin/verlauf`: wer hat was geändert — aus dem Admin und aus
  der Orga-Gruppe
- **MCP-Server** unter `/api/mcp` (Bearer-Token) als Datenzugang für OpenClaw
- **Spam-Schutz**: Honeypot-Felder und Rate-Limiting auf allen öffentlichen Endpunkten

## Stack

Next.js (App Router) · React · Tailwind CSS · Prisma + PostgreSQL · Zod ·
Nodemailer (Gmail) · PayPal REST API

## Setup

```bash
npm install
cp .env.example .env   # Werte eintragen, siehe Kommentare in der Datei
npx prisma migrate dev # legt die Datenbank an
npm run db:seed        # Orga-Plan als Kategorien + Aufgaben
npm run dev
```

### Orga-Plan

Der abgestimmte Orga-Plan steht als Daten in `lib/orgaPlan.ts` — 9 Kategorien
(Getränke, Essen, Musik, die vier Areas, Steg, Ideen) mit 33 Aufgaben. In die
Datenbank kommt er auf zwei Wegen, die dieselbe Funktion benutzen:

- **Im Admin** unter *Aufgaben* → Button „Orga-Plan einspielen". Kein Terminal
  und keine Datenbank-Zugangsdaten nötig; danach sehen ihn alle Admins.
- **Per Kommandozeile** mit `npm run db:seed`.

Beides ist idempotent: Kategorien und Aufgaben werden am Namen wiedererkannt,
ein zweiter Lauf ergänzt nur, was neu ist, und fasst Status, Zuweisungen und
Kosten aus dem Admin nicht an. Wächst der Plan, kommen die neuen Zeilen in
`lib/orgaPlan.ts` und der Import läuft nochmal.

Admin-Passwort-Hash für `ADMIN_PASSWORD_HASH` erzeugen:

```bash
npm run admin:hash -- "dein-passwort"
```

Der Admin-Bereich liegt unter [`/admin`](http://localhost:3000/admin).

## Konfiguration

Alle Umgebungsvariablen sind in [`.env.example`](.env.example) dokumentiert.
Optional:

- `RSVP_CAPACITY` — maximale Gesamt-Gästezahl (inkl. Begleitpersonen); leer lassen
  für unbegrenzt. Bei Erreichen landen neue Anmeldungen auf der Warteliste.
- `APP_BASE_URL` — öffentliche Basis-URL, wird für Zahlungslinks in E-Mails genutzt
- `OPENCLAW_GATEWAY_URL`/`OPENCLAW_GATEWAY_TOKEN` — ohne diese Werte geht keine
  Nachricht raus; der Broadcast weist im Admin darauf hin
- `OPENCLAW_CHANNEL` — Kanalname für das Gateway, Standard `telegram`
- `TELEGRAM_GROUP_CHAT_ID` — Chat-ID der Orga-Gruppe; nur damit lässt sich eine
  Nachricht an die Gruppe statt einzeln an alle Members schicken
- `MCP_SERVER_TOKEN` — ohne Token ist der MCP-Endpunkt deaktiviert

Event-Daten (Name, Termin) stehen in [`lib/event.ts`](lib/event.ts), die Location in
[`lib/venue.ts`](lib/venue.ts).

## OpenClaw als Orga-Assistent

Der Bot lebt in der Telegram-Orga-Gruppe und pflegt über den MCP-Server unter
`/api/mcp` die Aufgaben- und Budgetdaten. Sein Zuschnitt steht in
[`openclaw/Soul.md`](openclaw/Soul.md) — dort sind Rolle, Ton, Werkzeugkatalog
und die Grenzen beschrieben, die er einhalten soll.

Aufteilung: **OpenClaw hält den Telegram-Bot**, die App ist die Datenschicht.
In der App steckt kein Telegram-Code; sie stellt nur Werkzeuge bereit.

Was der Bot kann: Aufgaben auflisten, anlegen, ändern, zuweisen und löschen,
Kategorien und Budget lesen, den Orga-Plan einspielen und den Änderungsverlauf
zeigen.

Was er bewusst nicht kann:

- **Keine Gästedaten.** `get_guest_stats` liefert nur Zahlen — keine Namen, keine
  E-Mail-Adressen. Was einmal in einem Gruppenchat steht, ist nicht mehr
  einzufangen; die Liste mit Namen gibt es im Admin und als CSV.
- **Keine Gäste anlegen, ändern oder löschen** und keine Zahlungen auslösen.

### Zugriff und Nachvollziehbarkeit

Der `MCP_SERVER_TOKEN` ist die **einzige** Zugangskontrolle. Wer ihn hat, darf
alles, was die Werkzeuge können — entsprechend gehört er nicht in die Gruppe,
sondern nur in die OpenClaw-Konfiguration.

Innerhalb der Gruppe darf jede Person Aufgaben pflegen; es gibt keine
Rechteprüfung je Person. Dafür verlangt jedes schreibende Werkzeug einen
`actor` — den Anzeigenamen der Person, die die Nachricht geschrieben hat. Das
landet zusammen mit jeder Admin-Änderung im Verlauf unter `/admin/verlauf`.

Wichtig zur Einordnung: `actor` ist **selbst gemeldet**. Es ist ein Protokoll,
das zeigt, wie eine Änderung zustande kam — kein Nachweis, der einer
absichtlichen Täuschung standhält.

**Vor dem Launch:** Die Platzhalter in [`app/impressum/page.tsx`](app/impressum/page.tsx)
und [`app/datenschutz/page.tsx`](app/datenschutz/page.tsx) (Name, Anschrift,
Kontakt, Hosting-Angaben) müssen ersetzt werden.

## Tests & Checks

```bash
npm run lint       # ESLint
npm run typecheck  # TypeScript
npm test           # Vitest (Auth, Validierung, Rate-Limiter, CSV, Orga-Plan)
```

### PayPal überprüfen

`/admin/paypal` prüft bei jedem Aufruf live, ob die Anbindung steht: Umgebung
(Sandbox oder echt), ob die Zugangsdaten zu dieser Umgebung passen, ob der
Webhook konfiguriert ist, und welche Buchungen angekommen sind.

Der häufigste stille Fehler ist die Sandbox: Ohne gesetztes `PAYPAL_API_BASE`
läuft alles gegen `api-m.sandbox.paypal.com`. Der Bezahlvorgang sieht dann
vollständig echt aus, es fließt aber kein Geld.

Die App setzt in der Bestellung keinen abweichenden Empfänger, PayPal bucht
deshalb auf das Konto, dem die hinterlegte `PAYPAL_CLIENT_ID` gehört.
Endgültig bestätigen lässt sich das nur mit einer echten Zahlung: anmelden,
1 € spenden, danach die Buchungs-ID aus `/admin/paypal` in den eigenen
PayPal-Umsätzen wiederfinden.

Die GitHub-Actions-CI (`.github/workflows/ci.yml`) führt alle drei Checks bei jedem
Push und Pull Request aus.

## Deployment

Das Projekt ist für Vercel mit einer Postgres-Datenbank (z. B. Neon) ausgelegt.
`npm run build` führt `prisma generate` und `prisma migrate deploy` aus, Migrationen
werden also beim Deploy automatisch angewendet. Nach dem ersten Deploy einmalig
`npm run db:seed` gegen die Produktions-Datenbank ausführen und den PayPal-Webhook
(`PAYMENT.CAPTURE.COMPLETED` → `/api/paypal/webhook`) in der PayPal-Konsole anlegen.

Den Seed gegen die Datenbank einer Vercel-Umgebung laufen lassen:

```bash
npx vercel env pull .env --environment=production   # holt DATABASE_URL
npm run db:seed
```

Ohne `--environment` zieht die CLI die Development-Variablen; für Preview
entsprechend `--environment=preview`.
