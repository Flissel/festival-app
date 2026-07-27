import { describe, expect, it } from "vitest";
import { rsvpSchema } from "@/lib/validation/rsvp";
import { requestSchema } from "@/lib/validation/request";

describe("rsvpSchema", () => {
  const base = {
    name: "Alex",
    email: "alex@example.com",
    phone: "",
    plusOnes: "2",
    allergies: "",
  };

  it("akzeptiert eine Online-Anmeldung mit Betrag", () => {
    const result = rsvpSchema.safeParse({ ...base, paymentMethod: "online", amount: "15" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.plusOnes).toBe(2);
      expect(result.data.amount).toBe(15);
    }
  });

  it("verlangt bei Online-Zahlung einen Betrag", () => {
    const result = rsvpSchema.safeParse({ ...base, paymentMethod: "online" });
    expect(result.success).toBe(false);
  });

  it("akzeptiert Barzahlung ohne Betrag", () => {
    expect(rsvpSchema.safeParse({ ...base, paymentMethod: "cash" }).success).toBe(true);
  });

  it("lehnt eine ungültige E-Mail ab", () => {
    const result = rsvpSchema.safeParse({ ...base, email: "keine-mail", paymentMethod: "cash" });
    expect(result.success).toBe(false);
  });

  it("lehnt negative Begleitpersonen ab", () => {
    const result = rsvpSchema.safeParse({ ...base, plusOnes: "-1", paymentMethod: "cash" });
    expect(result.success).toBe(false);
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
