import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { rsvpSchema } from "@/lib/validation/rsvp";
import { sendRsvpConfirmation, sendWaitlistConfirmation } from "@/lib/email";
import { checkRateLimit, clientIp, isHoneypotFilled } from "@/lib/rateLimit";
import { isUniqueViolation } from "@/lib/prismaError";

// Der Mailversand läuft in after() und damit innerhalb der Laufzeitgrenze
// dieser Route. Die Vorgabe von 10 Sekunden ist für einen kalten TLS-Aufbau
// zu Gmail knapp — und wird sie überschritten, sieht es aus wie vorher: Die
// Anmeldung klappt, die Mail kommt nie an.
export const maxDuration = 30;


const DUPLICATE_MESSAGE =
  "Mit dieser E-Mail-Adresse gibt es bereits eine Anmeldung. Für Änderungen schreib uns über das Kontaktformular.";

function readCapacity(): number | null {
  const raw = process.env.RSVP_CAPACITY;
  if (!raw) return null;
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : null;
}

export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  if (!checkRateLimit({ key: `rsvp:${ip}`, limit: 5, windowMs: 10 * 60 * 1000 })) {
    logger.warn("rsvp.rate_limited", { ip });
    return NextResponse.json(
      { error: "Zu viele Anmeldeversuche. Bitte warte ein paar Minuten." },
      { status: 429 }
    );
  }

  const body: unknown = await request.json().catch(() => null);

  if (isHoneypotFilled(body)) {
    logger.warn("rsvp.honeypot_triggered", { ip });
    return NextResponse.json({ guestId: "ok" });
  }

  const parsed = rsvpSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ungültige Eingabe", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, email, plusOnes } = parsed.data;

  const existing = await prisma.guest.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  if (existing) {
    return NextResponse.json({ error: DUPLICATE_MESSAGE }, { status: 409 });
  }

  let waitlisted = false;
  const capacity = readCapacity();
  if (capacity !== null) {
    const guests = await prisma.guest.findMany({
      where: { waitlisted: false },
      select: { plusOnes: true },
    });
    const current = guests.reduce((sum, guest) => sum + 1 + guest.plusOnes, 0);
    waitlisted = current + 1 + plusOnes > capacity;
  }

  let guest;
  try {
    guest = await prisma.guest.create({
      data: { name, email, plusOnes, waitlisted },
    });
  } catch (error) {
    // Zwei Anmeldungen derselben Adresse im selben Moment kommen beide an der
    // Prüfung oben vorbei — abgefangen wird das erst hier von der Datenbank.
    if (isUniqueViolation(error)) {
      return NextResponse.json({ error: DUPLICATE_MESSAGE }, { status: 409 });
    }
    throw error;
  }

  logger.info("rsvp.created", { guestId: guest.id, waitlisted });

  if (waitlisted) {
    after(() => sendWaitlistConfirmation({ to: email, name }).catch(() => {}));
    return NextResponse.json({ guestId: guest.id, waitlisted: true });
  }

// after() statt Absenden-und-Weiterlaufen: Ohne das endet die serverlose
// Funktion mit der Antwort, und die noch offene SMTP-Verbindung stirbt mit ihr —
// die Mail ging nie raus, ohne dass ein Fehler im Protokoll landete. after()
// schiebt die Arbeit hinter die Antwort und hält die Funktion so lange am Leben.
  after(() => sendRsvpConfirmation({ to: email, name, guestId: guest.id }).catch(() => {}));

  return NextResponse.json({ guestId: guest.id });
}
