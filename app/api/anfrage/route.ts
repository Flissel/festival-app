import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { requestSchema } from "@/lib/validation/request";
import { sendRequestNotification } from "@/lib/email";
import { checkRateLimit, clientIp, isHoneypotFilled } from "@/lib/rateLimit";

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

  sendRequestNotification(parsed.data).catch(() => {});

  return NextResponse.json({ status: "ok" });
}
