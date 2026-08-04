// `prisma migrate deploy` mit Wiederholung.
//
// Vor jeder Migration holt sich Prisma eine Advisory Lock in der Datenbank und
// gibt nach 10 Sekunden auf (P1002). Das ist knapp bemessen für unseren
// Aufbau: Neon fährt die Datenbank bei Inaktivität herunter, und ein Build,
// der sie aufweckt, wartet auf eine Verbindung, die es noch nicht gibt.
// Laufen Preview- und Production-Build gleichzeitig, kommt der zweite Grund
// dazu — sie teilen sich eine Datenbank, und einer der beiden verliert das
// Rennen um die Lock.
//
// Beides ist vorübergehend und beides hat schon Deployments gekostet, bei
// denen nichts kaputt war. Deshalb hier ein zweiter und dritter Anlauf statt
// eines abgebrochenen Builds.
//
// Ein erneuter Anlauf ist gefahrlos: `migrate deploy` wendet nur an, was noch
// nicht angewendet ist. Scheitert eine Migration wirklich, scheitern auch die
// Wiederholungen und der Build bricht ab — wie er soll.

import { spawnSync } from "node:child_process";

const ATTEMPTS = 3;
const BACKOFF_SECONDS = [5, 15];

// Woran ein vorübergehender Fehlschlag zu erkennen ist. Alles andere — eine
// fehlerhafte Migration, ein falsches Passwort — wird sofort durchgereicht.
const RETRYABLE = /P1002|advisory lock|timed out|timeout|ECONNRESET|Can't reach database server/i;

function sleep(seconds) {
  // Synchron, damit der Ablauf ohne Ereignisschleife auskommt: Dieses Skript
  // tut genau eine Sache und wartet dabei.
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, seconds * 1000);
}

for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
  const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    encoding: "utf8",
    env: process.env,
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  if (result.status === 0) process.exit(0);

  const output = `${result.stdout ?? ""}${result.stderr ?? ""}${result.error?.message ?? ""}`;
  const lastAttempt = attempt === ATTEMPTS;

  if (!RETRYABLE.test(output) || lastAttempt) {
    console.error(
      lastAttempt
        ? `\nMigration nach ${ATTEMPTS} Versuchen aufgegeben.`
        : "\nMigration fehlgeschlagen — kein vorübergehender Fehler, kein weiterer Versuch."
    );
    process.exit(result.status ?? 1);
  }

  const wait = BACKOFF_SECONDS[attempt - 1] ?? 15;
  console.error(
    `\nMigration fehlgeschlagen (Versuch ${attempt}/${ATTEMPTS}), sieht vorübergehend aus. ` +
      `Neuer Versuch in ${wait} s.`
  );
  sleep(wait);
}
