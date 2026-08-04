import { describe, expect, it } from "vitest";
import {
  extractAmountCents,
  extractSenderEmail,
  extractSenderName,
  extractTransactionCode,
  hasPaypalDkim,
  isPaypalSender,
  parsePaypalMail,
  toCents,
  type MailInput,
} from "@/lib/paypalMail";

describe("isPaypalSender", () => {
  it("nimmt die Absender, unter denen PayPal verschickt", () => {
    for (const address of [
      "service@paypal.de",
      "service@paypal.com",
      "noreply@e.paypal.de",
      "SERVICE@PayPal.DE",
    ]) {
      expect(isPaypalSender(address)).toBe(true);
    }
  });

  it("lässt sich nicht von einer Domain täuschen, die nur so anfängt", () => {
    for (const address of [
      "service@paypal.de.beispiel.com",
      "service@paypal.de.evil.tld",
      "service@notpaypal.de",
      "service@meinpaypal.com",
      "paypal.de@gmail.com",
    ]) {
      expect(isPaypalSender(address)).toBe(false);
    }
  });

  it("kommt mit fehlender Adresse klar", () => {
    expect(isPaypalSender(null)).toBe(false);
    expect(isPaypalSender("kein-at-zeichen")).toBe(false);
  });
});

describe("toCents", () => {
  it("liest deutsche Schreibweise", () => {
    expect(toCents("20,00")).toBe(2000);
    expect(toCents("12,50")).toBe(1250);
    expect(toCents("1.234,56")).toBe(123456);
    expect(toCents("0,99")).toBe(99);
  });

  it("liest englische Schreibweise", () => {
    expect(toCents("20.00")).toBe(2000);
    expect(toCents("1,234.56")).toBe(123456);
  });

  it("nimmt glatte Beträge ohne Nachkommastellen", () => {
    expect(toCents("20")).toBe(2000);
  });

  it("hält 1.234 für tausendzweihundertvierunddreißig Euro", () => {
    // Drei Stellen hinter dem Punkt sind eine Tausendergruppe. Als
    // Nachkommastellen gelesen wären daraus 1,23 € geworden — ein Fehler um
    // den Faktor tausend, und zwar nach unten, also unauffällig.
    expect(toCents("1.234")).toBe(123400);
  });

  it("weist zurück, was keine Zahl ist", () => {
    expect(toCents("")).toBeNull();
    expect(toCents("abc")).toBeNull();
    expect(toCents("20,-")).toBeNull();
  });
});

describe("extractAmountCents", () => {
  it("findet den Betrag vor und hinter dem Währungszeichen", () => {
    expect(extractAmountCents("Du hast 20,00 € erhalten")).toBe(2000);
    expect(extractAmountCents("You received €20.00")).toBe(2000);
    expect(extractAmountCents("Betrag: 20,00 EUR")).toBe(2000);
    expect(extractAmountCents("Betrag: EUR 20,00")).toBe(2000);
  });

  it("stört sich nicht daran, dass derselbe Betrag mehrfach dasteht", () => {
    expect(extractAmountCents("20,00 € erhalten. Gutgeschrieben: 20,00 €")).toBe(2000);
  });

  it("gibt auf, wenn mehrere verschiedene Beträge dastehen", () => {
    // Genau der Fall, in dem Raten teuer wird: Gebühr, Betrag und Kontostand
    // stehen nebeneinander und keiner ist als der richtige markiert.
    expect(extractAmountCents("Betrag 20,00 € — Gebühr 0,35 €")).toBeNull();
  });

  it("gibt null zurück, wenn gar kein Betrag dasteht", () => {
    expect(extractAmountCents("Ihre Sicherheitseinstellungen wurden geändert")).toBeNull();
  });
});

describe("extractSenderName", () => {
  it("liest den Namen aus den gängigen Betreffzeilen", () => {
    expect(extractSenderName("Du hast 20,00 € von Max Mustermann erhalten")).toBe(
      "Max Mustermann"
    );
    expect(extractSenderName("Max Mustermann hat dir 20,00 € gesendet")).toBe("Max Mustermann");
    expect(extractSenderName("Sie haben eine Zahlung von Anna Schmidt erhalten")).toBe(
      "Anna Schmidt"
    );
    expect(extractSenderName("You received €20.00 EUR from Max Mustermann")).toBe(
      "Max Mustermann"
    );
  });

  it("hält einen Betrag nicht für einen Namen", () => {
    expect(extractSenderName("Du hast eine Zahlung von 20,00 € erhalten")).toBeNull();
  });

  it("gibt null zurück, wenn im Betreff kein Name steht", () => {
    expect(extractSenderName("Zahlungseingang")).toBeNull();
  });
});

describe("extractSenderEmail", () => {
  it("nimmt die Adresse des Zahlenden, nicht die von PayPal", () => {
    const text = `Max Mustermann (max@beispiel.de) hat dir Geld gesendet.
Fragen? service@paypal.de`;
    expect(extractSenderEmail(text)).toBe("max@beispiel.de");
  });

  it("überspringt die eigene Adresse", () => {
    const text = "An: felix@gmail.com\nVon: max@beispiel.de";
    expect(extractSenderEmail(text, "felix@gmail.com")).toBe("max@beispiel.de");
  });

  it("gibt null zurück, wenn nur PayPal-Adressen dastehen", () => {
    expect(extractSenderEmail("service@paypal.de und noreply@paypal.com")).toBeNull();
  });
});

describe("extractTransactionCode", () => {
  it("nimmt den beschrifteten Code", () => {
    expect(extractTransactionCode("Transaktionscode: 1AB23456CD7890123")).toBe(
      "1AB23456CD7890123"
    );
  });

  it("findet den Code auch unbeschriftet an seiner Form", () => {
    expect(extractTransactionCode("Vorgang 9XY87654ZW3210987 abgeschlossen")).toBe(
      "9XY87654ZW3210987"
    );
  });

  it("gibt null zurück, wenn keiner dasteht", () => {
    expect(extractTransactionCode("Du hast 20,00 € erhalten")).toBeNull();
  });
});

describe("hasPaypalDkim", () => {
  it("erkennt die bestandene Prüfung", () => {
    expect(
      hasPaypalDkim("mx.google.com; dkim=pass header.i=@paypal.de; spf=pass smtp.mailfrom=paypal.de")
    ).toBe(true);
  });

  it("erkennt eine nicht bestandene Prüfung als nicht bestanden", () => {
    expect(hasPaypalDkim("mx.google.com; dkim=fail header.i=@paypal.de")).toBe(false);
  });

  it("lässt sich nicht von einer fremden Domain mit gültiger Signatur täuschen", () => {
    // Genau der Fall, den eine Fälschung erzeugt: eine echte Signatur, aber
    // eben nicht die von PayPal.
    expect(hasPaypalDkim("mx.google.com; dkim=pass header.i=@angreifer.de")).toBe(false);
  });

  it("gilt ohne Header als ungeprüft", () => {
    expect(hasPaypalDkim(null)).toBe(false);
    expect(hasPaypalDkim(undefined)).toBe(false);
  });
});

function mail(overrides: Partial<MailInput> = {}): MailInput {
  return {
    messageId: "<abc@paypal.de>",
    subject: "Du hast 20,00 € von Max Mustermann erhalten",
    fromAddress: "service@paypal.de",
    fromName: "PayPal",
    date: new Date("2026-08-01T10:00:00Z"),
    text: "Max Mustermann (max@beispiel.de) hat dir 20,00 € gesendet.",
    authenticationResults: "mx.google.com; dkim=pass header.i=@paypal.de",
    ...overrides,
  };
}

describe("parsePaypalMail", () => {
  it("macht aus der Eingangsmail einen Vorschlag", () => {
    const result = parsePaypalMail(mail());
    expect(result.kind).toBe("notice");
    if (result.kind !== "notice") return;

    expect(result.notice.amountCents).toBe(2000);
    expect(result.notice.senderName).toBe("Max Mustermann");
    expect(result.notice.senderEmail).toBe("max@beispiel.de");
    expect(result.notice.dkimVerified).toBe(true);
    expect(result.notice.messageId).toBe("<abc@paypal.de>");
  });

  it("überspringt alles, was nicht von PayPal kommt", () => {
    const result = parsePaypalMail(mail({ fromAddress: "betrueger@beispiel.de" }));
    expect(result).toEqual({ kind: "skip", reason: "kein_paypal_absender" });
  });

  it("überspringt Mails ohne Message-ID", () => {
    // Ohne stabile Kennung stünde die Mail bei jedem Abruf erneut in der Liste.
    const result = parsePaypalMail(mail({ messageId: null }));
    expect(result).toEqual({ kind: "skip", reason: "keine_message_id" });
  });

  it("überspringt abgehende Zahlungen und Belege", () => {
    for (const subject of [
      "Du hast 20,00 € an Netflix gesendet",
      "Ihr Beleg über 20,00 €",
      "Rechnung über 20,00 €",
      "Deine Rückerstattung über 20,00 €",
      "Your receipt for €20.00",
    ]) {
      const result = parsePaypalMail(mail({ subject }));
      expect(result, subject).toEqual({ kind: "skip", reason: "kein_zahlungseingang" });
    }
  });

  it("überspringt Post ohne Betrag", () => {
    const result = parsePaypalMail(
      mail({ subject: "Neue Sicherheitseinstellungen", text: "Wir haben dein Passwort geändert." })
    );
    expect(result).toEqual({ kind: "skip", reason: "kein_zahlungseingang" });
  });

  it("legt auch bei unbekannter Formulierung einen Vorschlag an, solange ein Betrag dasteht", () => {
    // Der Fall, für den das gebaut ist: PayPal formuliert den Betreff um. Ohne
    // diesen Ausgang verschwände die Spende stillschweigend.
    const result = parsePaypalMail(
      mail({ subject: "Gutschrift über 20,00 €", text: "Auf deinem Konto sind 20,00 € eingegangen." })
    );
    expect(result.kind).toBe("notice");
    if (result.kind !== "notice") return;
    expect(result.notice.amountCents).toBe(2000);
  });

  it("legt den Vorschlag ohne Betrag an, wenn der Betrag mehrdeutig ist", () => {
    // Lieber eine Zeile, die nach Handarbeit verlangt, als eine falsche Zahl.
    const result = parsePaypalMail(
      mail({
        subject: "Du hast eine Zahlung erhalten",
        text: "Betrag 20,00 € — Gebühr 0,35 € — Gutgeschrieben 19,65 €",
      })
    );
    expect(result.kind).toBe("notice");
    if (result.kind !== "notice") return;
    expect(result.notice.amountCents).toBeNull();
  });

  it("merkt sich, wenn die Signatur fehlt", () => {
    const result = parsePaypalMail(mail({ authenticationResults: null }));
    expect(result.kind).toBe("notice");
    if (result.kind !== "notice") return;
    expect(result.notice.dkimVerified).toBe(false);
  });
});
