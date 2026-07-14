import nodemailer from "nodemailer";
import { logger } from "@/lib/logger";
import { VENUE } from "@/lib/venue";

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

export async function sendRsvpConfirmation(params: {
  to: string;
  name: string;
  paymentMethod: "online" | "cash";
  amount: number | null;
}): Promise<void> {
  const transport = getTransport();
  if (!transport) {
    logger.warn("email.not_configured");
    return;
  }

  const paymentLine =
    params.paymentMethod === "cash"
      ? "Du zahlst deinen Beitrag bar vor Ort."
      : params.amount
        ? `Dein Beitrag von ${params.amount.toFixed(2)} € wird online über PayPal abgewickelt.`
        : "Dein Beitrag wird online über PayPal abgewickelt.";

  const text = `Hi ${params.name},

danke für deine Anmeldung zum Festival!

${paymentLine}

Location: ${VENUE.label}
Karte: ${VENUE.googleMapsUrl}

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
