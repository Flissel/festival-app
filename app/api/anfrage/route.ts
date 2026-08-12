import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { requestSchema } from "@/lib/validation/request";
import { sendRequestNotification } from "@/lib/email";
import { checkRateLimit, clientIp, isHoneypotFilled } from "@/lib/rateLimit";

// Der Mailversand läuft in after() und damit innerhalb der Laufzeitgrenze
// dieser Route. Die Vorgabe von 10 Sekunden ist für einen kalten TLS-Aufbau
// zu Gmail knapp — und wird sie überschritten, sieht es aus wie vorher: Die
// Anmeldung klappt, die Mail kommt nie an.
export const maxDuration = 30;


export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  if (!checkRateLimit({ key: `anfrage:${ip}`, limit: 5, windowMs: 10 * 60 * 1000 })) {
    logger.warn("request.rate_limited", { ip });
    return NextResponse.json(
      { error: "Zu viele Anfragen. Bitte warte ein paar Minuten." },
      { status: 429 }
    );
  }

  const body: unknown = await request.json().catch(() => null);

  if (isHoneypotFilled(body)) {
    logger.warn("request.honeypot_triggered", { ip });
    return NextResponse.json({ status: "ok" });
  }

  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ungültige Eingabe", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const created = await prisma.request.create({ data: parsed.data });
  logger.info("request.created", { requestId: created.id });

// after() statt Absenden-und-Weiterlaufen: Ohne das endet die serverlose
// Funktion mit der Antwort, und die noch offene SMTP-Verbindung stirbt mit ihr —
// die Mail ging nie raus, ohne dass ein Fehler im Protokoll landete. after()
// schiebt die Arbeit hinter die Antwort und hält die Funktion so lange am Leben.
  after(() => sendRequestNotification(parsed.data).catch(() => {}));

  return NextResponse.json({ status: "ok" });
}
