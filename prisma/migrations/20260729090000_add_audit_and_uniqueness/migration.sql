-- Eindeutigkeit dort erzwingen, wo bisher nur Anwendungscode geprüft hat.
-- Import, Admin-UI und die Chat-Werkzeuge erkennen Kategorien und Aufgaben an
-- ihrem Namen; laufen zwei Zugriffe gleichzeitig, legen beide an, weil zwischen
-- "gibt es schon?" und "anlegen" eine Lücke klafft. Die Datenbank schließt sie.
--
-- Bestandsdaten könnten diese Regeln bereits verletzen. Deshalb räumt jede
-- Regel erst auf, bevor der Index entsteht — sonst schlägt die Migration beim
-- Deploy fehl und nimmt den ganzen Build mit.

-- 1. Kategorien: Doppelte Namen bekommen ein Namenssuffix aus ihrer ID.
--    Bewusst umbenennen statt zusammenführen — Umbenennen verliert nichts, und
--    welche der beiden gemeint war, weiß nur ein Mensch.
UPDATE "BudgetCategory" c
SET "name" = c."name" || ' [' || left(c."id", 6) || ']'
FROM (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "name" ORDER BY "sortOrder", "id") AS rn
  FROM "BudgetCategory"
) dup
WHERE c."id" = dup."id" AND dup.rn > 1;

CREATE UNIQUE INDEX "BudgetCategory_name_key" ON "BudgetCategory"("name");

-- 2. Aufgaben: gleicher Ansatz je Kategorie.
UPDATE "Task" t
SET "title" = t."title" || ' [' || left(t."id", 6) || ']'
FROM (
  SELECT "id",
         ROW_NUMBER() OVER (PARTITION BY "categoryId", "title" ORDER BY "createdAt", "id") AS rn
  FROM "Task"
) dup
WHERE t."id" = dup."id" AND dup.rn > 1;

CREATE UNIQUE INDEX "Task_categoryId_title_key" ON "Task"("categoryId", "title");

-- 3. Gäste: Hier ist eine doppelte E-Mail wirklich eine Doppelanmeldung und
--    keine legitime Zweitzeile. Der älteste Eintrag bleibt, etwaige Zahlungen
--    der jüngeren werden auf ihn umgehängt, dann fallen die jüngeren weg.
UPDATE "Payment" p
SET "guestId" = keep."keeper"
FROM (
  SELECT "id",
         FIRST_VALUE("id") OVER (PARTITION BY "email" ORDER BY "createdAt", "id") AS "keeper",
         ROW_NUMBER() OVER (PARTITION BY "email" ORDER BY "createdAt", "id") AS rn
  FROM "Guest"
) keep
WHERE p."guestId" = keep."id" AND keep.rn > 1;

DELETE FROM "Guest" g
USING (
  SELECT "id"
  FROM (
    SELECT "id", ROW_NUMBER() OVER (PARTITION BY "email" ORDER BY "createdAt", "id") AS rn
    FROM "Guest"
  ) x
  WHERE x.rn > 1
) dup
WHERE g."id" = dup."id";

CREATE UNIQUE INDEX "Guest_email_key" ON "Guest"("email");

-- 4. Änderungsprotokoll. Ohne das ist bei mehreren Pflegenden nicht mehr
--    feststellbar, wer einen Eintrag verstellt hat — im Admin nicht und über
--    den Chat erst recht nicht.
CREATE TYPE "AuditSource" AS ENUM ('admin', 'chat', 'system');

CREATE TABLE "AuditEntry" (
    "id" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" "AuditSource" NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditEntry_at_idx" ON "AuditEntry"("at");
