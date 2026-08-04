// Spenden ohne PayPal-API.
//
// Die REST-API von PayPal setzt ein Geschäftskonto voraus, und ein
// Geschäftskonto kostet pro Zahlung Gebühren. Stattdessen bekommt der Gast
// einen PayPal.me-Link und schickt das Geld direkt — als „Freunde und
// Familie" innerhalb der EU gebührenfrei.
//
// Der Preis dafür: Die App erfährt nichts von der Zahlung. Es gibt keinen
// Rückkanal von PayPal, kein Webhook, keine Buchungs-ID. Wer wie viel gegeben
// hat, trägt die Orga im Admin ein, nachdem sie es im PayPal-Konto gesehen hat.

// Das Kürzel steht auf der Einladungsseite und ist damit ohnehin öffentlich —
// wie Termin und Ort in lib/event.ts und lib/venue.ts. Deshalb hier und nicht
// nur in den Umgebungsvariablen: So funktioniert der Spendenkasten ohne
// weitere Einrichtung. PAYPAL_ME_URL überschreibt den Wert, falls nötig.
const DEFAULT_PAYPAL_ME = "Flissl404";

/** Was in der Umgebung fehlt oder falsch aussieht — für die Admin-Anzeige. */
export type DonationProblem = { field: string; message: string };

/** Was die öffentlichen Seiten zum Anzeigen brauchen. */
export type DonationDisplay = {
  /** PayPal.me-Kürzel, bereits geprüft. Null, wenn nicht nutzbar. */
  paypalMeHandle: string | null;
  iban: string | null;
  ibanHolder: string | null;
};

export type DonationConfig = DonationDisplay & { problems: DonationProblem[] };

/**
 * Nimmt „felix", „paypal.me/felix", „https://www.paypal.me/felix" oder
 * „https://www.paypal.com/paypalme/felix" und macht daraus das Kürzel.
 * Gibt null zurück, wenn übrig bleibt, was kein Kürzel sein kann.
 */
export function normalizePaypalMeHandle(raw: string): string | null {
  const withoutHost = raw
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/^paypal\.com\/paypalme\//i, "")
    .replace(/^paypal\.me\//i, "");

  const handle = withoutHost.split(/[/?#]/)[0]?.trim() ?? "";

  // Eine IBAN besteht ebenfalls nur aus Buchstaben und Ziffern und stünde damit
  // als Kürzel durch. Die beiden Werte stehen in der .env direkt untereinander;
  // vertauscht ergäbe das einen Spendenlink, der auf eine leere PayPal-Seite
  // führt — und niemand merkt es, weil er ja aussieht wie ein Link.
  if (looksLikeIban(handle)) return null;

  // PayPal vergibt Kürzel aus Buchstaben und Ziffern, höchstens 20 Zeichen.
  return /^[A-Za-z0-9]{1,20}$/.test(handle) ? handle : null;
}

/** Zwei Buchstaben Land, zwei Prüfziffern, dann die Kontokennung. */
function looksLikeIban(value: string): boolean {
  return /^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$/.test(value.toUpperCase());
}

/** Erlaubt Leerzeichen in der Eingabe, prüft Länge und Zeichenvorrat grob. */
export function normalizeIban(raw: string): string | null {
  const compact = raw.replace(/\s+/g, "").toUpperCase();
  return looksLikeIban(compact) ? compact : null;
}

/** IBAN in Vierergruppen — so wird sie abgetippt und so wird sie geprüft. */
export function formatIban(iban: string): string {
  return iban.replace(/(.{4})/g, "$1 ").trim();
}

export function donationConfig(): DonationConfig {
  const problems: DonationProblem[] = [];

  const override = process.env.PAYPAL_ME_URL?.trim() ?? "";
  const rawHandle = override || DEFAULT_PAYPAL_ME;
  const paypalMeHandle = normalizePaypalMeHandle(rawHandle);
  if (!paypalMeHandle) {
    problems.push({
      field: override ? "PAYPAL_ME_URL" : "DEFAULT_PAYPAL_ME",
      message: `„${rawHandle}" ergibt kein gültiges PayPal.me-Kürzel. Erwartet wird z. B. „felixmustermann" oder „https://paypal.me/felixmustermann".`,
    });
  }

  const rawIban = process.env.DONATION_IBAN?.trim() ?? "";
  let iban: string | null = null;
  if (rawIban) {
    iban = normalizeIban(rawIban);
    if (!iban) {
      problems.push({
        field: "DONATION_IBAN",
        message: `„${rawIban}" sieht nicht wie eine IBAN aus.`,
      });
    }
  }

  const ibanHolder = process.env.DONATION_IBAN_HOLDER?.trim() || null;
  if (iban && !ibanHolder) {
    problems.push({
      field: "DONATION_IBAN_HOLDER",
      message: "IBAN ohne Kontoinhaber — viele Banken lehnen die Überweisung dann ab.",
    });
  }

  return { paypalMeHandle, iban, ibanHolder, problems };
}

/**
 * Baut den Zahllink. Die Währung gehört an den Betrag, sonst nimmt PayPal die
 * des Empfängerkontos — bei einem deutschen Konto wäre das zwar auch Euro,
 * aber darauf sollte sich der Link nicht verlassen.
 */
export function paypalMeLink(handle: string, amount?: number | null): string {
  const base = `https://paypal.me/${handle}`;
  if (amount === null || amount === undefined || !Number.isFinite(amount) || amount <= 0) {
    return base;
  }
  return `${base}/${amount.toFixed(2)}EUR`;
}
