import { describe, expect, it } from "vitest";
import { matchGuest, type GuestRef } from "@/lib/paymentNotices";

const GUESTS: GuestRef[] = [
  { id: "g1", name: "Max Mustermann", email: "max@beispiel.de" },
  { id: "g2", name: "Anna Schmidt", email: "anna@beispiel.de" },
];

describe("matchGuest", () => {
  it("erkennt den Gast an der E-Mail-Adresse", () => {
    expect(matchGuest({ senderEmail: "max@beispiel.de", senderName: null }, GUESTS)).toEqual({
      guestId: "g1",
      reason: "email",
    });
  });

  it("stört sich nicht an Groß- und Kleinschreibung", () => {
    expect(matchGuest({ senderEmail: "MAX@Beispiel.DE", senderName: null }, GUESTS)?.guestId).toBe(
      "g1"
    );
  });

  it("nimmt den Namen, wenn die Adresse nicht passt", () => {
    expect(
      matchGuest({ senderEmail: "privat@andere.de", senderName: "Anna Schmidt" }, GUESTS)
    ).toEqual({ guestId: "g2", reason: "name" });
  });

  it("zieht die Adresse dem Namen vor", () => {
    // Beides passt, aber auf verschiedene Gäste. Die Adresse ist eindeutig,
    // der Name nicht — also gewinnt die Adresse.
    const match = matchGuest(
      { senderEmail: "max@beispiel.de", senderName: "Anna Schmidt" },
      GUESTS
    );
    expect(match).toEqual({ guestId: "g1", reason: "email" });
  });

  it("schlägt bei zwei Gästen gleichen Namens niemanden vor", () => {
    // Raten hieße hier, das Geld der falschen Person zuzuschreiben.
    const doppelt: GuestRef[] = [
      { id: "a", name: "Max Mustermann", email: "max1@beispiel.de" },
      { id: "b", name: "Max Mustermann", email: "max2@beispiel.de" },
    ];
    expect(matchGuest({ senderEmail: null, senderName: "Max Mustermann" }, doppelt)).toBeNull();
  });

  it("gibt null zurück, wenn nichts passt", () => {
    expect(
      matchGuest({ senderEmail: "fremd@woanders.de", senderName: "Fremde Person" }, GUESTS)
    ).toBeNull();
  });

  it("kommt mit einem Eingang ohne jede Angabe klar", () => {
    expect(matchGuest({ senderEmail: null, senderName: null }, GUESTS)).toBeNull();
  });
});
