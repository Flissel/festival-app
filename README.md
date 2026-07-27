# Festival-App

Einladungs- und Orga-App für unser Festival: Gäste melden sich über die öffentliche
Einladungsseite an und zahlen ihren Beitrag auf Spendenbasis (PayPal oder bar), die
Orga verwaltet Gäste, Aufgaben, Budget und Teams im passwortgeschützten Admin-Bereich.

## Features

- **Einladungsseite** mit Termin, Anfahrtskarte, RSVP-Formular (inkl. Begleitpersonen,
  Allergien) und Datenschutzhinweis
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
  WhatsApp-Broadcast über das OpenClaw-Gateway
- **Automatische WhatsApp-Benachrichtigung** bei Aufgabenzuweisung
- **MCP-Server** unter `/api/mcp` (Bearer-Token), damit der Orga-Chatbot auf
  Aufgabendaten zugreifen kann
- **Spam-Schutz**: Honeypot-Felder und Rate-Limiting auf allen öffentlichen Endpunkten

## Stack

Next.js (App Router) · React · Tailwind CSS · Prisma + PostgreSQL · Zod ·
Nodemailer (Gmail) · PayPal REST API

## Setup

```bash
npm install
cp .env.example .env   # Werte eintragen, siehe Kommentare in der Datei
npx prisma migrate dev # legt die Datenbank an
npm run db:seed        # Standard-Budgetkategorien
npm run dev
```

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
- `OPENCLAW_GATEWAY_URL`/`OPENCLAW_GATEWAY_TOKEN` — ohne diese Werte werden keine
  WhatsApp-Nachrichten versendet
- `MCP_SERVER_TOKEN` — ohne Token ist der MCP-Endpunkt deaktiviert

Event-Daten (Name, Termin) stehen in [`lib/event.ts`](lib/event.ts), die Location in
[`lib/venue.ts`](lib/venue.ts).

**Vor dem Launch:** Die Platzhalter in [`app/impressum/page.tsx`](app/impressum/page.tsx)
und [`app/datenschutz/page.tsx`](app/datenschutz/page.tsx) (Name, Anschrift,
Kontakt, Hosting-Angaben) müssen ersetzt werden.

## Tests & Checks

```bash
npm run lint       # ESLint
npm run typecheck  # TypeScript
npm test           # Vitest (Auth, Validierung, Rate-Limiter)
```

Die GitHub-Actions-CI (`.github/workflows/ci.yml`) führt alle drei Checks bei jedem
Push und Pull Request aus.

## Deployment

Das Projekt ist für Vercel mit einer Postgres-Datenbank (z. B. Neon) ausgelegt.
`npm run build` führt `prisma generate` und `prisma migrate deploy` aus, Migrationen
werden also beim Deploy automatisch angewendet. Nach dem ersten Deploy einmalig
`npm run db:seed` gegen die Produktions-Datenbank ausführen und den PayPal-Webhook
(`PAYMENT.CAPTURE.COMPLETED` → `/api/paypal/webhook`) in der PayPal-Konsole anlegen.
