-- AlterTable: Telefonnummer wird optional. Bestehende Nummern bleiben erhalten.
ALTER TABLE "Member" ALTER COLUMN "phone" DROP NOT NULL;
