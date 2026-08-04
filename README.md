# Festival-App

Einladungs- und Orga-App für unser Festival: Gäste melden sich über die öffentliche
Einladungsseite an und geben freiwillig etwas dazu (PayPal oder bar), die
Orga verwaltet Gäste, Aufgaben, Budget und Teams im passwortgeschützten Admin-Bereich.

## Features

- **Einladungsseite** mit Termin, „Zum Kalender hinzufügen"-Button (`.ics`),
  Anfahrtskarte, datensparsamem Anmeldeformular (Name, E-Mail, Begleitpersonen)
  und Datenschutzhinweis
- **Freiwilliger Beitrag**: PayPal.me-Link mit vorbelegtem Betrag oder Bankverbindung,
  Bestätigungsmail per Gmail; wer erst später etwas geben will, kommt über den Link
  in der Mail (`/zahlung/<id>`) zurück
- **Warteliste**: Bei erreichter Kapazität (`RSVP_CAPACITY`) landen neue Anmeldungen
  automatisch auf der Warteliste; Nachrücken per Klick im Admin inkl. Info-Mail
- **Kontaktformular** mit Anfragen-Inbox im Admin, E-Mail-Benachrichtigung an die Orga
  und Antwort direkt aus dem Admin
- **Admin-Dashboard**: Gästeliste (bearbeiten, löschen, als bezahlt markieren,
  CSV-Export für die Türliste), Aufgaben-Board mit Budgetkategorien
  (Plan-/Ist-Kosten, Fälligkeitsdaten, Status-Filter), Teams & Members,
  Broadcast über das OpenClaw-Gateway
- **Spenden** unter `/admin/spenden`: zeigt, wohin die Einladungsseite verweist, ob
  die Angaben stimmen und was bisher eingetragen wurde; liest die
  PayPal-Benachrichtigungen aus dem Gmail-Postfach und legt Eingänge zur
  Bestätigung vor
- **Event-Daten** unter `/admin/event`: Name, Beginn, Ende und Line-up ohne Deploy
  ändern; schlägt auf Einladung, Kalenderdatei, Vorschaubild und Mails durch
- **Verlauf** unter `/admin/verlauf`: wer hat was geändert — aus dem Admin und aus
  der Orga-Gruppe
- **MCP-Server** unter `/api/mcp` (Bearer-Token) als Datenzugang für OpenClaw
- **Spam-Schutz**: Honeypot-Felder und Rate-Limiting auf allen öffentlichen Endpunkten

## Stack

Next.js (App Router) · React · Tailwind CSS · Prisma + PostgreSQL · Zod ·
Nodemailer (Gmail)

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
- `APP_BASE_URL` — öffentliche Basis-URL, wird für Links in E-Mails genutzt
- `PAYPAL_ME_URL` — überschreibt das PayPal.me-Kürzel aus
  [`lib/donation.ts`](lib/donation.ts); nur nötig, wenn das Geld woanders hin soll
- `DONATION_IBAN`/`DONATION_IBAN_HOLDER` — Bankverbindung für alle, die lieber
  überweisen
- `OPENCLAW_GATEWAY_URL`/`OPENCLAW_GATEWAY_TOKEN` — ohne diese Werte geht keine
  Nachricht raus; der Broadcast weist im Admin darauf hin
- `OPENCLAW_CHANNEL` — Kanal für Nachrichten an die Gruppe, Standard `telegram`
- `OPENCLAW_PHONE_CHANNEL` — Kanal für Einzelnachrichten, Standard `whatsapp`;
  Ziel ist dort eine Telefonnummer, die Telegram nicht als Ziel kennt
- `TELEGRAM_GROUP_CHAT_ID` — Chat-ID der Orga-Gruppe; nur damit lässt sich eine
  Nachricht an die Gruppe statt einzeln an alle Members schicken
- `MCP_SERVER_TOKEN` — ohne Token ist der MCP-Endpunkt deaktiviert
- `BLOB_READ_WRITE_TOKEN` — Speicher für Fotos an Aufgaben; wird beim
  Verbinden des Vercel-Blob-Speichers gesetzt. Der Speicher ist privat: Fotos
  gehen nur über eine Route raus, die vorher die Admin-Sitzung prüft

## Termin und Line-up

Name, Beginn, Ende und Line-up stehen in der Datenbank und werden im Admin unter
*Event* gepflegt. Solange dort nichts gespeichert wurde, gelten die Vorgaben aus
[`lib/event.ts`](lib/event.ts) — die Einladung steht also vom ersten Aufruf an.

Beginn und Ende sind echte Zeitpunkte, keine Textzeile: Aus „ab 13 Uhr" lässt
sich kein Kalendereintrag bauen. Eingegeben wird deutsche Ortszeit
(`Europe/Berlin`), gespeichert wird in UTC, und `/kalender.ics` liefert daraus
eine Kalenderdatei mit Termin, Ort und Koordinaten.

Die Location steht weiterhin in [`lib/venue.ts`](lib/venue.ts).

## OpenClaw als Orga-Assistent

Der Bot lebt in der Telegram-Orga-Gruppe und pflegt über den MCP-Server unter
`/api/mcp` die Aufgaben- und Budgetdaten. Sein Zuschnitt steht in
[`openclaw/Soul.md`](openclaw/Soul.md) — dort sind Rolle, Ton, Werkzeugkatalog
und die Grenzen beschrieben, die er einhalten soll.

Aufteilung: **OpenClaw hält den Telegram-Bot**, die App ist die Datenschicht.
In der App steckt kein Telegram-Code; sie stellt nur Werkzeuge bereit.

Was der Bot kann: Aufgaben auflisten, anlegen, ändern, zuweisen und löschen,
Members und Teams anlegen und ändern, Kategorien und Budget lesen, den
Orga-Plan einspielen und den Änderungsverlauf zeigen.

Die Telefonnummer eines Members ist freiwillig. Ohne sie lassen sich Aufgaben
zuweisen, aber keine Einzelnachrichten schicken — der Broadcast nennt die
Betroffenen dann namentlich, statt sie stillschweigend zu überspringen.

Was er bewusst nicht kann:

- **Keine Gästedaten.** `get_guest_stats` liefert nur Zahlen — keine Namen, keine
  E-Mail-Adressen. Was einmal in einem Gruppenchat steht, ist nicht mehr
  einzufangen; die Liste mit Namen gibt es im Admin und als CSV.
- **Keine Gäste anlegen, ändern oder löschen** und keine Zahlungen auslösen.
- **Members und Teams nicht löschen.** Anlegen und ändern ja; wer aus der Orga
  raus soll, wird im Admin entfernt.

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

### Spenden

Die App wickelt **keine** Zahlung ab. Auf der Einladungsseite steht ein
PayPal.me-Link mit vorbelegtem Betrag; das Geld geht direkt von Gast zu
Veranstalter. Der Grund: Die PayPal-REST-API setzt ein Geschäftskonto voraus,
und das kostet pro Zahlung Gebühren (2,49 % + 0,35 €). Über den Link kann der
Gast „An einen Freund" wählen — innerhalb der EU in Euro gebührenfrei. Der
Kasten weist ihn darauf hin.

Die Kehrseite: Es gibt keinen Rückkanal. PayPal meldet der App nichts — kein
Webhook, keine Abfrage. Die Transaction-Search-API könnte das, setzt aber
wiederum ein Geschäftskonto voraus, und Geschäftskonten können „Freunde und
Familie" gar nicht empfangen. Gebührenfrei **oder** automatisch, nicht beides.

Was bleibt, ist die Benachrichtigungsmail, die PayPal für jeden Eingang
verschickt. `/admin/spenden` liest sie per IMAP aus dem Gmail-Postfach
(`GMAIL_USER`/`GMAIL_APP_PASSWORD`, dieselben Zugangsdaten wie für den Versand)
und legt die Eingänge zur Durchsicht ab:

- Gefunden wird nur, was von einer PayPal-Domain kommt und nach Eingang
  aussieht; Belege, Rückerstattungen und Werbung fallen raus.
- Betrag, Absender und Transaktionscode kommen aus dem Mailtext. Steht dort
  kein eindeutiger Betrag, bleibt das Feld leer, statt eine Zahl zu raten.
- Die Zuordnung zum Gast läuft über die E-Mail-Adresse, ersatzweise über den
  Namen. Bei zwei Gästen gleichen Namens wird nichts vorgeschlagen.
- Gebucht wird erst per Klick auf *Übernehmen*. Bis dahin ist die Zeile ein
  Hinweis, kein Beleg — eine Absenderadresse lässt sich fälschen. Ob Google die
  DKIM-Signatur von PayPal bestätigt hat, steht an der Zeile.

Bargeld und Überweisungen tauchen dort naturgemäß nicht auf; die trägt die Orga
im selben Bildschirm von Hand ein. `/admin/spenden` zeigt außerdem den
hinterlegten Link zum Anklicken und meldet, wenn das Kürzel unbrauchbar ist.

Das Kürzel steht in [`lib/donation.ts`](lib/donation.ts) — es erscheint ohnehin
auf der Einladungsseite und ist damit so öffentlich wie Termin und Ort. Die
Bankverbindung dagegen kommt nur aus `DONATION_IBAN`/`DONATION_IBAN_HOLDER`
und liegt nicht im Repository.

Die GitHub-Actions-CI (`.github/workflows/ci.yml`) führt alle drei Checks bei jedem
Push und Pull Request aus.

## Deployment

Das Projekt ist für Vercel mit einer Postgres-Datenbank (z. B. Neon) ausgelegt.
`npm run build` führt `prisma generate` und die Migrationen aus, letztere über
[`scripts/migrate-deploy.mjs`](scripts/migrate-deploy.mjs) statt direkt.

Der Grund: Prisma gibt beim Anfordern seiner Advisory Lock nach 10 Sekunden auf
(`P1002`), und dieses Fenster ist für unseren Aufbau zu knapp. Neon fährt die
Datenbank bei Inaktivität herunter, und Preview und Production teilen sich eine
— ein Build, der die Datenbank aufweckt oder gegen einen parallelen Build
antritt, verliert das Rennen. Das Skript versucht es deshalb dreimal (5 s, 15 s
Pause) und bricht bei allem, was nicht nach einem vorübergehenden Fehler
aussieht, sofort ab. Ein zweiter Anlauf ist gefahrlos, weil `migrate deploy` nur
anwendet, was noch nicht angewendet ist.

Sauberer wäre eine eigene Datenbank für Preview — dann entfällt wenigstens der
Wettlauf zwischen den Umgebungen. Nach dem ersten Deploy einmalig
`npm run db:seed` gegen die Produktions-Datenbank ausführen — oder stattdessen im
Admin unter *Aufgaben* auf „Orga-Plan einspielen" klicken.

Den Seed gegen die Datenbank einer Vercel-Umgebung laufen lassen:

```bash
npx vercel env pull .env --environment=production   # holt DATABASE_URL
npm run db:seed
```

Ohne `--environment` zieht die CLI die Development-Variablen; für Preview
entsprechend `--environment=preview`.
