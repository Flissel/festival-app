import { z } from "zod";

export const requestSchema = z.object({
  name: z.string().trim().min(1, "Name ist erforderlich").max(200),
  email: z.string().trim().email("Ungültige E-Mail-Adresse"),
  message: z.string().trim().min(1, "Nachricht ist erforderlich").max(2000),
});

export type RequestInput = z.infer<typeof requestSchema>;
