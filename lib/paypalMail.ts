// Zahlungseingänge aus den Benachrichtigungsmails von PayPal lesen.
//
// Warum über das Postfach und nicht über die API: Die Transaction-Search-API
// von PayPal setzt ein Geschäftskonto voraus, und Geschäftskonten können
// „Freunde und Familie" gar nicht empfangen — jede Spende würde Gebühren
// kosten. Auf dem gebührenfreien Weg ist die Benachrichtigungsmail die einzige
// Spur, die eine Zahlung hinterlässt.
//
// Der Parser ist bewusst misstrauisch. Was hier herauskommt, ist ein Vorschlag
// für die Orga und niemals eine Buchung: Was er nicht sicher lesen kann, lässt
// er leer, statt eine Zahl zu erfinden. Eine fehlende Zahl kostet zehn Sekunden
// Tippen, eine falsche steht bis zum Fest im Kassenstand.

/** Eine Mail, so weit aufbereitet, dass der Parser sie ansehen kann. */
export type MailInput = {
  messageId: string | null;
  subject: string | null;
  fromAddress: string | null;
  fromName: string | null;
  date: Date | null;
  text: string | null;
  /** Der `Authentication-Results`-Header, den Gmail beim Empfang anhängt. */
  authenticationResults?: string | null;
};

export type PaypalNotice = {
  messageId: string;
  receivedAt: Date;
  /** In Cent, damit unterwegs nichts gerundet wird. Null = nicht lesbar. */
  amountCents: number | null;
  currency: string;
  senderName: string | null;
  senderEmail: string | null;
  transactionCode: string | null;
  subject: string;
  /** Hat PayPal die Mail nachweislich signiert (DKIM)? */
  dkimVerified: boolean;
};

/**
 * Warum eine Mail übersprungen wurde. Nur für das Protokoll — die Orga sieht
 * übersprungene Mails nicht, sonst stünde jede Werbemail in der Liste.
 */
export type SkipReason = "kein_paypal_absender" | "kein_zahlungseingang" | "keine_message_id";

export type ParseResult =
  | { kind: "notice"; notice: PaypalNotice }
  | { kind: "skip"; reason: SkipReason };

/**
 * Absender prüfen. Der Vergleich läuft über die Domain und nicht über
 * „enthält paypal", damit `paypal.de.beispiel.com` nicht durchrutscht.
 */
export function isPaypalSender(address: string | null): boolean {
  if (!address) return false;
  const at = address.lastIndexOf("@");
  if (at < 0) return false;
  const domain = address.slice(at + 1).trim().toLowerCase();
  return PAYPAL_DOMAINS.some((known) => domain === known || domain.endsWith(`.${known}`));
}

const PAYPAL_DOMAINS = ["paypal.de", "paypal.com", "paypal.at", "paypal.ch"];

/**
 * Hat PayPal die Mail signiert? Gmail schreibt das Ergebnis seiner Prüfung in
 * `Authentication-Results`. Ein Absender lässt sich frei behaupten, eine
 * gültige DKIM-Signatur nicht.
 *
 * Ohne den Header gilt die Mail als ungeprüft, nicht als gefälscht: Nicht jeder
 * Server schreibt ihn, und die Orga bestätigt ohnehin jeden Eintrag von Hand.
 */
export function hasPaypalDkim(header: string | null | undefined): boolean {
  if (!header) return false;
  // Beispiel: "mx.google.com; dkim=pass header.i=@paypal.de; spf=pass ..."
  const matches = header.matchAll(/dkim=(\w+)[^;]*?header\.(?:i|d)=@?([\w.-]+)/gi);
  for (const match of matches) {
    const [, result, domain] = match;
    if (result?.toLowerCase() !== "pass") continue;
    const lower = domain?.toLowerCase() ?? "";
    if (PAYPAL_DOMAINS.some((known) => lower === known || lower.endsWith(`.${known}`))) {
      return true;
    }
  }
  return false;
}

// Betreffzeilen, bei denen Geld hereinkommt. PayPal hat die Anrede im Deutschen
// von „Sie" auf „du" umgestellt und formuliert je nach Zahlungsart anders,
// deshalb mehrere Muster statt eines festen Satzes.
const INCOMING_PATTERNS = [
  /\berhalten\b/i,
  /\bhat\s+(?:dir|Ihnen)\b.*\bgesendet\b/i,
  /\bhat\s+(?:dir|Ihnen)\b.*\bgeschickt\b/i,
  /\bZahlungseingang\b/i,
  /\byou(?:'ve| have)\s+received\b/i,
  /\bsent\s+you\b/i,
];

// Was zwar von PayPal kommt, aber kein Eingang ist. Diese Mails verschwinden
// still — stünden sie in der Liste, wäre die Liste unbrauchbar.
const OUTGOING_PATTERNS = [
  /\bdu\s+hast\b.*\bgesendet\b/i,
  /\bSie\s+haben\b.*\bgesendet\b/i,
  /\bBeleg\b/i,
  /\bQuittung\b/i,
  /\bRechnung\b/i,
  /\bAbbuchung\b/i,
  /\bLastschrift\b/i,
  /\bRückerstattung\b/i,
  /\bErstattung\b/i,
  /\bBestellung\b/i,
  /\bzurückgebucht\b/i,
  /\bstorniert\b/i,
  /\byour\s+receipt\b/i,
  /\byou\s+sent\b/i,
];

/**
 * Betrag aus einem Text lesen. Gibt null zurück, wenn nichts oder mehrdeutig
 * mehreres dasteht — der Mailtext nennt neben dem Betrag oft noch Gebühren
 * oder einen Kontostand, und welche Zahl gemeint ist, ist dann Raterei.
 */
export function extractAmountCents(text: string): number | null {
  const found = new Set<number>();

  for (const match of text.matchAll(MONEY_PATTERN)) {
    const raw = match[1] ?? match[2];
    if (!raw) continue;
    const cents = toCents(raw);
    if (cents !== null && cents > 0) found.add(cents);
  }

  // Genau ein Betrag ist eindeutig. Mehrere gleiche Beträge auch — der Betrag
  // steht in vielen Mails zweimal, im Betreff und noch einmal im Fließtext.
  return found.size === 1 ? [...found][0]! : null;
}

// Währungszeichen vor oder hinter der Zahl. Beide Schreibweisen kommen vor:
// deutsch „20,00 €", englisch „€20.00" oder „EUR 20.00".
const MONEY_PATTERN =
  /(?:(?:€|EUR)\s*([\d.,]+)|([\d.,]+)\s*(?:€|EUR))/gi;

/**
 * „1.234,56" (deutsch) und „1,234.56" (englisch) zu Cent. Unterscheidet die
 * beiden am letzten Trennzeichen: Was zwei Stellen hinter sich hat, ist das
 * Dezimalkomma, alles andere ist Tausenderpunkt.
 */
export function toCents(raw: string): number | null {
  const cleaned = raw.trim().replace(/\s/g, "");
  if (!/^\d[\d.,]*$/.test(cleaned)) return null;

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  const separator = lastComma > lastDot ? lastComma : lastDot;

  let euros: string;
  let cents: string;

  if (separator >= 0 && cleaned.length - separator - 1 === 2) {
    euros = cleaned.slice(0, separator);
    cents = cleaned.slice(separator + 1);
  } else if (separator >= 0 && cleaned.length - separator - 1 === 3) {
    // Drei Stellen hinter dem letzten Trennzeichen: Tausendergruppe, keine
    // Nachkommastellen — „1.234" sind 1234 Euro, nicht 1,234.
    euros = cleaned;
    cents = "00";
  } else if (separator >= 0) {
    euros = cleaned.slice(0, separator);
    cents = cleaned.slice(separator + 1).padEnd(2, "0").slice(0, 2);
  } else {
    euros = cleaned;
    cents = "00";
  }

  const eurosDigits = euros.replace(/[.,]/g, "");
  if (!/^\d+$/.test(eurosDigits) || !/^\d{2}$/.test(cents)) return null;

  const value = Number.parseInt(eurosDigits, 10) * 100 + Number.parseInt(cents, 10);
  return Number.isSafeInteger(value) ? value : null;
}

/**
 * Den Namen des Zahlenden aus dem Betreff holen. PayPal stellt ihn je nach
 * Formulierung vor oder hinter den Betrag.
 */
export function extractSenderName(subject: string): string | null {
  const patterns = [
    // „Du hast 20,00 € von Max Mustermann erhalten"
    /\bvon\s+(.+?)\s+erhalten\b/i,
    // „Max Mustermann hat dir 20,00 € gesendet"
    /^(.+?)\s+hat\s+(?:dir|Ihnen)\b/i,
    // „You received €20.00 EUR from Max Mustermann"
    /\bfrom\s+(.+?)\s*$/i,
  ];

  for (const pattern of patterns) {
    const match = subject.match(pattern);
    const name = match?.[1]?.trim();
    // Ein Treffer, der nur aus Betrag und Währung besteht, ist kein Name.
    if (name && name.length <= 80 && !/^[\d.,\s€]+(?:EUR)?$/i.test(name)) {
      return name.replace(/\s+/g, " ");
    }
  }
  return null;
}

/**
 * Die Adresse des Zahlenden aus dem Mailtext. Sie ist der brauchbarste
 * Anhaltspunkt für die Zuordnung: Der Gast hat sich mit einer E-Mail-Adresse
 * angemeldet, und Namen werden unterschiedlich geschrieben.
 */
export function extractSenderEmail(text: string, ownAddress?: string | null): string | null {
  const own = ownAddress?.trim().toLowerCase();
  for (const match of text.matchAll(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g)) {
    const candidate = match[0].toLowerCase();
    if (isPaypalSender(candidate)) continue;
    if (own && candidate === own) continue;
    // PayPal setzt Verweise auf eigene Hilfeseiten und Bildserver in den Text;
    // deren Adressen sind keine Zahlenden.
    if (/@(?:e|epl|email|mail)\./i.test(candidate)) continue;
    return candidate;
  }
  return null;
}

/** Transaktionscode: 17 Stellen aus Großbuchstaben und Ziffern. */
export function extractTransactionCode(text: string): string | null {
  const labelled = text.match(/Transaktions(?:code|nummer)\s*:?\s*([0-9A-Z]{10,20})/i);
  if (labelled?.[1]) return labelled[1].toUpperCase();

  const bare = text.match(/\b[0-9A-Z]{17}\b/);
  return bare?.[0] ?? null;
}

/**
 * Eine Mail ansehen und entscheiden, ob daraus ein Vorschlag wird.
 *
 * Drei Ausgänge, und der dritte ist der wichtige: Was von PayPal kommt, einen
 * Betrag enthält, aber nicht eindeutig als Eingang zu erkennen ist, wird
 * trotzdem zum Vorschlag — nur ohne Betrag. Lieber legt die Orga eine Zeile
 * von Hand nach, als dass eine Spende unbemerkt durchrutscht, weil PayPal
 * seine Betreffzeilen umformuliert hat.
 */
export function parsePaypalMail(mail: MailInput, ownAddress?: string | null): ParseResult {
  if (!isPaypalSender(mail.fromAddress)) {
    return { kind: "skip", reason: "kein_paypal_absender" };
  }
  // Ohne stabile Kennung ließe sich nicht sagen, ob wir die Mail schon einmal
  // gesehen haben — beim nächsten Abruf stünde alles doppelt in der Liste.
  if (!mail.messageId) {
    return { kind: "skip", reason: "keine_message_id" };
  }

  const subject = mail.subject?.trim() ?? "";
  const text = mail.text ?? "";
  const haystack = `${subject}\n${text}`;

  if (OUTGOING_PATTERNS.some((pattern) => pattern.test(subject))) {
    return { kind: "skip", reason: "kein_zahlungseingang" };
  }

  const incoming = INCOMING_PATTERNS.some((pattern) => pattern.test(subject));

  // Der Betreff ist die verlässlichste Stelle: Im Fließtext stehen Gebühren,
  // Kontostände und Werbebeträge, die den Betrag mehrdeutig machen.
  const amountCents = extractAmountCents(subject) ?? extractAmountCents(text);

  // Weder als Eingang erkennbar noch ein Betrag darin: Newsletter, Sicherheits-
  // hinweis, Kontoauszug. Das ist der Großteil der PayPal-Post.
  if (!incoming && amountCents === null) {
    return { kind: "skip", reason: "kein_zahlungseingang" };
  }

  return {
    kind: "notice",
    notice: {
      messageId: mail.messageId,
      receivedAt: mail.date ?? new Date(),
      amountCents,
      currency: "EUR",
      senderName: extractSenderName(subject) ?? mail.fromName?.trim() ?? null,
      senderEmail: extractSenderEmail(haystack, ownAddress),
      transactionCode: extractTransactionCode(haystack),
      subject: subject.slice(0, 300),
      dkimVerified: hasPaypalDkim(mail.authenticationResults),
    },
  };
}

/** Cent zu „12,50 €" — für Anzeige und Protokolltexte. */
export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}
