import { describe, expect, it } from "vitest";
import { ORGA_EMAIL, mailtoLink } from "@/lib/contact";

describe("mailtoLink", () => {
  it("hängt den Betreff an die Adresse", () => {
    expect(mailtoLink("Auflegen")).toBe(`mailto:${ORGA_EMAIL}?subject=Auflegen`);
  });

  it("kodiert Leerzeichen und Umlaute", () => {
    // Ein rohes Leerzeichen im mailto verschlucken manche Mailprogramme samt
    // allem, was dahinter steht — der Betreff wäre dann halb weg.
    expect(mailtoLink("Auflegen beim Stereo 2.0 am See")).toContain(
      "?subject=Auflegen%20beim%20Stereo%202.0%20am%20See"
    );
    expect(mailtoLink("Grüße")).toContain("subject=Gr%C3%BC%C3%9Fe");
  });

  it("kodiert Zeichen, die sonst weitere Kopfzeilen anfangen würden", () => {
    // & trennt im mailto die Felder. Unkodiert würde aus einem Betreff mit
    // „&body=…" ein vorbelegter Mailtext — nicht schlimm, aber nicht gewollt.
    expect(mailtoLink("Sound & Licht")).toBe(
      `mailto:${ORGA_EMAIL}?subject=Sound%20%26%20Licht`
    );
  });
});
