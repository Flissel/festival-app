import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { rsvpSchema } from "@/lib/validation/rsvp";
import { sendRsvpConfirmation, sendWaitlistConfirmation } from "@/lib/email";
import { checkRateLimit, clientIp, isHoneypotFilled } from "@/lib/rateLimit";

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
    return NextResponse.json(
      {
        error:
          "Mit dieser E-Mail-Adresse gibt es bereits eine Anmeldung. Für Änderungen schreib uns über das Kontaktformular.",
      },
      { status: 409 }
    );
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

  const guest = await prisma.guest.create({
    data: { name, email, plusOnes, waitlisted },
  });

  logger.info("rsvp.created", { guestId: guest.id, waitlisted });

  if (waitlisted) {
    sendWaitlistConfirmation({ to: email, name }).catch(() => {});
    return NextResponse.json({ guestId: guest.id, waitlisted: true });
  }

  sendRsvpConfirmation({ to: email, name, guestId: guest.id }).catch(() => {});

  return NextResponse.json({ guestId: guest.id });
}
