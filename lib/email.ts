import nodemailer from "nodemailer";
import { logger } from "@/lib/logger";
import { VENUE } from "@/lib/venue";
import { formatEventDate, getEvent } from "@/lib/event";
import { appBaseUrl } from "@/lib/appUrl";

function getTransport() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;

  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });
}

const eventInfoBlock = async () => {
  const event = await getEvent();
  return `Wann: ${formatEventDate(event.startsAt)}
Location: ${VENUE.label}
Karte: ${VENUE.googleMapsUrl}`;
};

export async function sendRsvpConfirmation(params: {
  to: string;
  name: string;
  guestId: string;
}): Promise<void> {
  const transport = getTransport();
  if (!transport) {
    logger.warn("email.not_configured");
    return;
  }

  const base = appBaseUrl();
  const supportBlock = base
    ? `\nWir stemmen das Festival privat und zahlen DJs, Live-Acts, Essen, Getränke
und Technik vor. Falls du uns freiwillig unterstützen möchtest, geht das hier
— nötig ist es nicht:
${base}/zahlung/${params.guestId}\n`
    : "";

  const text = `Hi ${params.name},

du bist dabei — wir haben dich eingetragen!
${supportBlock}
${await eventInfoBlock()}

Fragen? Antworte einfach auf diese E-Mail oder nutze unser Kontaktformular.

Bis bald!`;

  try {
    await transport.sendMail({
      from: process.env.GMAIL_USER,
      to: params.to,
      subject: "Deine Anmeldung zum Festival",
      text,
    });
    logger.info("email.sent", { to: params.to });
  } catch (error) {
    logger.warn("email.send_error", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function sendWaitlistConfirmation(params: {
  to: string;
  name: string;
}): Promise<void> {
  const transport = getTransport();
  if (!transport) {
    logger.warn("email.not_configured");
    return;
  }

  const text = `Hi ${params.name},

danke für dein Interesse am Festival! Wir sind aktuell leider voll — du stehst jetzt auf der Warteliste.

Sobald ein Platz frei wird, melden wir uns sofort bei dir. Du musst nichts weiter tun.

${await eventInfoBlock()}

Bis hoffentlich bald!`;

  try {
    await transport.sendMail({
      from: process.env.GMAIL_USER,
      to: params.to,
      subject: "Du stehst auf der Warteliste fürs Festival",
      text,
    });
    logger.info("email.waitlist_confirmation_sent", { to: params.to });
  } catch (error) {
    logger.warn("email.send_error", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function sendWaitlistPromotion(params: {
  to: string;
  name: string;
  guestId: string;
}): Promise<void> {
  const transport = getTransport();
  if (!transport) {
    logger.warn("email.not_configured");
    return;
  }

  const base = appBaseUrl();
  const supportBlock = base
    ? `\nFalls du uns freiwillig unterstützen möchtest, geht das hier:\n${base}/zahlung/${params.guestId}\n`
    : "";

  const text = `Hi ${params.name},

gute Nachrichten: Ein Platz ist frei geworden — du bist jetzt fest angemeldet! 🎉
${supportBlock}
${await eventInfoBlock()}

Bis bald!`;

  try {
    await transport.sendMail({
      from: process.env.GMAIL_USER,
      to: params.to,
      subject: "Dein Platz beim Festival ist frei geworden!",
      text,
    });
    logger.info("email.waitlist_promotion_sent", { to: params.to });
  } catch (error) {
    logger.warn("email.send_error", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function sendRequestNotification(params: {
  name: string;
  email: string;
  message: string;
}): Promise<void> {
  const transport = getTransport();
  if (!transport) {
    logger.warn("email.not_configured");
    return;
  }

  const text = `Neue Kontaktanfrage über das Formular:

Von: ${params.name} <${params.email}>

${params.message}

Antworten: direkt auf diese E-Mail antworten oder im Admin unter /admin/anfragen bearbeiten.`;

  try {
    await transport.sendMail({
      from: process.env.GMAIL_USER,
      to: process.env.GMAIL_USER,
      replyTo: params.email,
      subject: `Neue Anfrage von ${params.name}`,
      text,
    });
    logger.info("email.request_notification_sent");
  } catch (error) {
    logger.warn("email.send_error", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// Gibt zurück, ob der Versand geklappt hat — der Admin sieht das Ergebnis direkt im UI.
export async function sendRequestReply(params: {
  to: string;
  name: string;
  originalMessage: string;
  reply: string;
}): Promise<boolean> {
  const transport = getTransport();
  if (!transport) {
    logger.warn("email.not_configured");
    return false;
  }

  const quoted = params.originalMessage
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");

  const text = `Hi ${params.name},

${params.reply}

---
Deine ursprüngliche Nachricht:
${quoted}`;

  try {
    await transport.sendMail({
      from: process.env.GMAIL_USER,
      to: params.to,
      replyTo: process.env.GMAIL_USER,
      subject: "Antwort auf deine Anfrage zum Festival",
      text,
    });
    logger.info("email.request_reply_sent", { to: params.to });
    return true;
  } catch (error) {
    logger.warn("email.send_error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
