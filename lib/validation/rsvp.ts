import { z } from "zod";

export const rsvpSchema = z
  .object({
    name: z.string().trim().min(1, "Name ist erforderlich").max(200),
    email: z.string().trim().email("Ungültige E-Mail-Adresse"),
    phone: z.string().trim().max(50).optional().or(z.literal("")),
    plusOnes: z.coerce.number().int().min(0).max(20),
    allergies: z.string().trim().max(500).optional().or(z.literal("")),
    paymentMethod: z.enum(["online", "cash"]),
    amount: z.coerce.number().positive().max(100000).optional(),
  })
  .refine((data) => data.paymentMethod !== "online" || data.amount !== undefined, {
    message: "Betrag ist bei Online-Zahlung erforderlich",
    path: ["amount"],
  });

export type RsvpInput = z.infer<typeof rsvpSchema>;
