import { describe, expect, it } from "vitest";
import {
  formatIban,
  normalizeIban,
  normalizePaypalMeHandle,
  paypalMeLink,
} from "@/lib/donation";

describe("normalizePaypalMeHandle", () => {
  it("nimmt das blanke Kürzel", () => {
    expect(normalizePaypalMeHandle("felixmustermann")).toBe("felixmustermann");
  });

  it("schält den Host ab, egal in welcher Schreibweise", () => {
    for (const input of [
      "paypal.me/felix",
      "https://paypal.me/felix",
      "https://www.paypal.me/felix",
      "http://paypal.me/felix",
      "www.paypal.me/felix",
      "https://www.paypal.com/paypalme/felix",
    ]) {
      expect(normalizePaypalMeHandle(input)).toBe("felix");
    }
  });

  it("wirft angehängte Beträge und Parameter weg", () => {
    expect(normalizePaypalMeHandle("paypal.me/felix/20EUR")).toBe("felix");
    expect(normalizePaypalMeHandle("paypal.me/felix?locale=de")).toBe("felix");
  });

  it("ignoriert Leerzeichen am Rand", () => {
    expect(normalizePaypalMeHandle("  felix  ")).toBe("felix");
  });

  it("lehnt ab, was kein Kürzel sein kann", () => {
    // Sonst entstünde ein Link, der ins Leere führt — lieber gar keinen zeigen.
    expect(normalizePaypalMeHandle("")).toBeNull();
    expect(normalizePaypalMeHandle("   ")).toBeNull();
    expect(normalizePaypalMeHandle("felix mustermann")).toBeNull();
    expect(normalizePaypalMeHandle("felix@example.com")).toBeNull();
    expect(normalizePaypalMeHandle("DE89370400440532013000")).toBeNull();
    expect(normalizePaypalMeHandle("paypal.me/")).toBeNull();
  });
});

describe("paypalMeLink", () => {
  it("hängt Betrag und Währung an", () => {
    expect(paypalMeLink("felix", 20)).toBe("https://paypal.me/felix/20.00EUR");
    expect(paypalMeLink("felix", 12.5)).toBe("https://paypal.me/felix/12.50EUR");
  });

  it("lässt den Betrag weg, wenn keiner gewählt wurde", () => {
    expect(paypalMeLink("felix")).toBe("https://paypal.me/felix");
    expect(paypalMeLink("felix", null)).toBe("https://paypal.me/felix");
    expect(paypalMeLink("felix", 0)).toBe("https://paypal.me/felix");
    expect(paypalMeLink("felix", -5)).toBe("https://paypal.me/felix");
    expect(paypalMeLink("felix", Number.NaN)).toBe("https://paypal.me/felix");
  });
});

describe("normalizeIban", () => {
  it("entfernt Leerzeichen und schreibt groß", () => {
    expect(normalizeIban("de89 3704 0044 0532 0130 00")).toBe("DE89370400440532013000");
  });

  it("lehnt ab, was keine IBAN ist", () => {
    expect(normalizeIban("")).toBeNull();
    expect(normalizeIban("1234567890")).toBeNull();
    expect(normalizeIban("DEXX370400440532013000")).toBeNull();
  });
});

describe("formatIban", () => {
  it("gruppiert in Viererblöcke", () => {
    expect(formatIban("DE89370400440532013000")).toBe("DE89 3704 0044 0532 0130 00");
  });
});

describe("donationConfig", () => {
  it("nimmt das Kürzel aus lib/donation.ts, wenn keine Variable gesetzt ist", async () => {
    delete process.env.PAYPAL_ME_URL;
    const { donationConfig } = await import("@/lib/donation");
    const config = donationConfig();
    expect(config.paypalMeHandle).toBe("Flissl404");
    expect(config.problems).toHaveLength(0);
  });

  it("lässt sich über PAYPAL_ME_URL überschreiben", async () => {
    process.env.PAYPAL_ME_URL = "https://paypal.me/jemandanderes";
    const { donationConfig } = await import("@/lib/donation");
    expect(donationConfig().paypalMeHandle).toBe("jemandanderes");
    delete process.env.PAYPAL_ME_URL;
  });

  it("meldet eine unbrauchbare Überschreibung, statt still auf die Vorgabe zurückzufallen", async () => {
    // Sonst spendeten alle weiter an das alte Konto, ohne dass es auffällt.
    process.env.PAYPAL_ME_URL = "DE89370400440532013000";
    const { donationConfig } = await import("@/lib/donation");
    const config = donationConfig();
    expect(config.paypalMeHandle).toBeNull();
    expect(config.problems[0]?.field).toBe("PAYPAL_ME_URL");
    delete process.env.PAYPAL_ME_URL;
  });
});
