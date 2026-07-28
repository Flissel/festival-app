import { z } from "zod";

// Bewusst datensparsam: nur was für Planung und Bestätigungsmail nötig ist.
export const rsvpSchema = z.object({
  name: z.string().trim().min(1, "Name ist erforderlich").max(200),
  email: z.string().trim().email("Ungültige E-Mail-Adresse"),
  plusOnes: z.coerce.number().int().min(0).max(20),
});

export type RsvpInput = z.infer<typeof rsvpSchema>;
