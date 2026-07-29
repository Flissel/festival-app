import { z } from "zod";

// Bewusst datensparsam: nur was für Planung und Bestätigungsmail nötig ist.
export const rsvpSchema = z.object({
  name: z.string().trim().min(1, "Name ist erforderlich").max(200),
  // Kleingeschrieben gespeichert, damit die Eindeutigkeit in der Datenbank
  // dasselbe versteht wie die Doppelanmeldungs-Prüfung im Code: „Max@..." und
  // „max@..." sind dieselbe Person.
  email: z.string().trim().toLowerCase().email("Ungültige E-Mail-Adresse"),
  plusOnes: z.coerce.number().int().min(0).max(20),
});

export type RsvpInput = z.infer<typeof rsvpSchema>;
