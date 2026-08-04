import { describe, expect, it } from "vitest";
import { rsvpSchema } from "@/lib/validation/rsvp";
import { requestSchema } from "@/lib/validation/request";

describe("rsvpSchema", () => {
  const base = {
    name: "Alex",
    email: "alex@example.com",
    plusOnes: "2",
  };

  it("akzeptiert eine Anmeldung und wandelt plusOnes in eine Zahl", () => {
    const result = rsvpSchema.safeParse(base);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.plusOnes).toBe(2);
    }
  });

  it("lehnt eine ungültige E-Mail ab", () => {
    expect(rsvpSchema.safeParse({ ...base, email: "keine-mail" }).success).toBe(false);
  });

  it("lehnt negative Begleitpersonen ab", () => {
    expect(rsvpSchema.safeParse({ ...base, plusOnes: "-1" }).success).toBe(false);
  });

  it("lehnt einen leeren Namen ab", () => {
    expect(rsvpSchema.safeParse({ ...base, name: "   " }).success).toBe(false);
  });

  it("ignoriert nicht mehr erhobene Felder wie Telefon und Allergien", () => {
    const result = rsvpSchema.safeParse({
      ...base,
      phone: "+4917012345678",
      allergies: "Nüsse",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("phone");
      expect(result.data).not.toHaveProperty("allergies");
    }
  });
});

describe("requestSchema", () => {
  it("akzeptiert eine gültige Anfrage", () => {
    const result = requestSchema.safeParse({
      name: "Alex",
      email: "alex@example.com",
      message: "Wann geht es los?",
    });
    expect(result.success).toBe(true);
  });

  it("lehnt eine leere Nachricht ab", () => {
    const result = requestSchema.safeParse({
      name: "Alex",
      email: "alex@example.com",
      message: "   ",
    });
    expect(result.success).toBe(false);
  });
});
