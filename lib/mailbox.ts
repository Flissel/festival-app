import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { logger } from "@/lib/logger";
import { parsePaypalMail, type PaypalNotice, type SkipReason } from "@/lib/paypalMail";

// Liest das Gmail-Postfach, in dem die Benachrichtigungen von PayPal landen.
//
// Es sind dieselben Zugangsdaten, mit denen die App die Bestätigungsmails
// verschickt (lib/email.ts) — ein App-Passwort von Google. Für IMAP muss in den
// Gmail-Einstellungen unter „Weiterleitung und POP/IMAP" der IMAP-Zugriff
// aktiviert sein; SMTP allein genügt nicht.
//
// Die Verbindung wird pro Abruf auf- und wieder abgebaut. Eine dauerhaft
// offene Verbindung (IMAP IDLE) wäre sparsamer, überlebt aber keine
// serverlose Funktion, die nach ein paar Sekunden wieder verschwindet.

const HOST = "imap.gmail.com";
const PORT = 993;

/** Wie weit zurück gesucht wird, wenn nichts anderes gesagt ist. */
export const DEFAULT_SINCE_DAYS = 90;

/**
 * Obergrenze pro Abruf. Nicht aus Sparsamkeit, sondern damit die Funktion in
 * ihrer Laufzeit bleibt. Wird sie erreicht, steht das im Ergebnis — eine still
 * abgeschnittene Liste sähe aus wie „mehr war nicht da".
 */
export const MAX_MESSAGES = 100;

export type ScanResult =
  | {
      ok: true;
      notices: PaypalNotice[];
      /** Wie viele Mails angesehen wurden. */
      scanned: number;
      /** Warum die übrigen nichts geworden sind. */
      skipped: Record<SkipReason, number>;
      /** Wurde die Obergrenze erreicht, liegen womöglich ältere Mails brach. */
      truncated: boolean;
    }
  | { ok: false; error: string };

export function isMailboxConfigured(): boolean {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

export async function fetchPaypalNotices(options?: {
  sinceDays?: number;
  maxMessages?: number;
}): Promise<ScanResult> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    logger.warn("mailbox.not_configured");
    return { ok: false, error: "Postfach ist nicht eingerichtet" };
  }

  const sinceDays = options?.sinceDays ?? DEFAULT_SINCE_DAYS;
  const maxMessages = options?.maxMessages ?? MAX_MESSAGES;
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);

  const client = new ImapFlow({
    host: HOST,
    port: PORT,
    secure: true,
    auth: { user, pass },
    // Die Bibliothek loggt sonst jede IMAP-Zeile — darin stünde der Inhalt der
    // Mails, und der gehört nicht ins Anwendungsprotokoll.
    logger: false,
    // Ohne eigene Fristen wartet ein hängender Server, bis die Funktion
    // abgeräumt wird, und die Orga sieht nur einen Timeout ohne Erklärung.
    greetingTimeout: 10_000,
    connectionTimeout: 15_000,
    socketTimeout: 60_000,
  });

  const notices: PaypalNotice[] = [];
  const skipped: Record<SkipReason, number> = {
    kein_paypal_absender: 0,
    kein_zahlungseingang: 0,
    keine_message_id: 0,
  };
  let scanned = 0;
  let truncated = false;

  try {
    await client.connect();
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    logger.warn("mailbox.connect_failed", { error: detail });
    return { ok: false, error: explainConnectError(detail) };
  }

  try {
    const lock = await client.getMailboxLock("INBOX");
    try {
      // Vorfilter auf dem Server: „paypal" irgendwo im Absender. Ob die Mail
      // wirklich von PayPal kommt, entscheidet danach der Parser anhand der
      // Domain — dieser Filter spart nur Übertragung.
      const messages = client.fetch(
        { from: "paypal", since },
        { source: true, envelope: true }
      );

      for await (const message of messages) {
        if (scanned >= maxMessages) {
          truncated = true;
          break;
        }
        scanned += 1;

        // Ohne Quelltext gibt es nichts zu lesen. Kommt vor, wenn der Server
        // die Mail zwischen Suche und Abruf entfernt hat.
        if (!message.source) continue;

        try {
          const parsed = await simpleParser(message.source);
          const from = parsed.from?.value?.[0];

          const result = parsePaypalMail(
            {
              messageId: parsed.messageId ?? null,
              subject: parsed.subject ?? null,
              fromAddress: from?.address ?? null,
              fromName: from?.name ?? null,
              date: parsed.date ?? null,
              text: parsed.text ?? null,
              authenticationResults: headerValue(parsed.headers.get("authentication-results")),
            },
            user
          );

          if (result.kind === "notice") {
            notices.push(result.notice);
          } else {
            skipped[result.reason] += 1;
          }
        } catch (error) {
          // Eine unlesbare Mail darf den ganzen Abruf nicht kippen.
          logger.warn("mailbox.parse_failed", {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    } finally {
      lock.release();
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    logger.warn("mailbox.fetch_failed", { error: detail });
    return { ok: false, error: `Postfach nicht lesbar: ${detail}` };
  } finally {
    await client.logout().catch(() => client.close());
  }

  logger.info("mailbox.scan_done", { scanned, found: notices.length, truncated });
  return { ok: true, notices, scanned, skipped, truncated };
}

/** `headers.get` liefert je nach Header einen String oder eine Liste. */
function headerValue(raw: unknown): string | null {
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) return raw.filter((entry) => typeof entry === "string").join("; ");
  return null;
}

/**
 * Die Meldungen von Google sind für die Orga unbrauchbar. „Invalid
 * credentials" heißt fast immer: IMAP ist im Konto gar nicht eingeschaltet.
 */
function explainConnectError(detail: string): string {
  if (/invalid credentials|authenticationfailed|auth/i.test(detail)) {
    return (
      "Anmeldung am Postfach abgelehnt. Prüfe das App-Passwort und ob in den " +
      "Gmail-Einstellungen unter „Weiterleitung und POP/IMAP\" der IMAP-Zugriff " +
      "eingeschaltet ist."
    );
  }
  if (/timeout|etimedout|enotfound|econnrefused/i.test(detail)) {
    return `Postfach nicht erreichbar (${detail}).`;
  }
  return `Postfach nicht erreichbar: ${detail}`;
}
