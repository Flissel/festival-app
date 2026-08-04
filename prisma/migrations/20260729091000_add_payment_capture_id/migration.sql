-- Die Buchungs-ID von PayPal mitschreiben. Bisher stand in der Datenbank nur
-- die Order-ID; um einen Eintrag mit einer Zeile im PayPal-Konto abzugleichen,
-- braucht man die ID der Buchung selbst.
ALTER TABLE "Payment" ADD COLUMN "paypalCaptureId" TEXT;
