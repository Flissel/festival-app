import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSessionToken, verifyAdminPassword, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

const bodySchema = z.object({ password: z.string().min(1) });

export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  if (!checkRateLimit({ key: `login:${ip}`, limit: 10, windowMs: 15 * 60 * 1000 })) {
    logger.warn("admin.login_rate_limited", { ip });
    return NextResponse.json(
      { error: "Zu viele Login-Versuche. Bitte warte 15 Minuten." },
      { status: 429 }
    );
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Passwort erforderlich" }, { status: 400 });
  }

  let valid: boolean;
  try {
    valid = verifyAdminPassword(parsed.data.password);
  } catch (error) {
    logger.error("admin.login_config_error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Admin-Login ist nicht konfiguriert" }, { status: 500 });
  }

  if (!valid) {
    return NextResponse.json({ error: "Falsches Passwort" }, { status: 401 });
  }

  const response = NextResponse.json({ status: "ok" });
  response.cookies.set(SESSION_COOKIE_NAME, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
  return response;
}
