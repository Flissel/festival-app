-- Telefonnummer und Allergien werden seit der Verschlankung des Anmelde-
-- formulars nicht mehr erhoben. Die Spalten blieben bis hierher als Altlast
-- stehen: nicht befüllbar, aber im Admin sichtbar. Sie fallen jetzt samt
-- Altbestand weg — Datensparsamkeit, und die Gästeliste zeigt nur noch, was
-- tatsächlich in der Datenbank steht.
ALTER TABLE "Guest" DROP COLUMN IF EXISTS "phone";
ALTER TABLE "Guest" DROP COLUMN IF EXISTS "allergies";
