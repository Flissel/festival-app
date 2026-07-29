import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendToGroup, sendToPhone, groupChatId } from "@/lib/openclaw";
import { logger } from "@/lib/logger";
import { recordAudit, AUDIT_ADMIN } from "@/lib/audit";

const bodySchema = z.object({
  message: z.string().trim().min(1).max(2000),
  // "group" schickt eine Nachricht in die Orga-Gruppe, sonst je eine an die
  // Members des Teams (oder an alle).
  target: z.enum(["group", "members"]).default("members"),
  teamId: z.string().trim().max(100).optional().or(z.literal("")),
});

export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const { message, target, teamId } = parsed.data;

  if (target === "group") {
    if (!groupChatId()) {
      return NextResponse.json(
        { error: "Für die Gruppe fehlt TELEGRAM_GROUP_CHAT_ID in den Umgebungsvariablen." },
        { status: 400 }
      );
    }

    const result = await sendToGroup(message);
    if (!result.ok) {
      logger.warn("broadcast.group_failed", { error: result.error });
      return NextResponse.json(
        { error: `Zustellung an die Gruppe fehlgeschlagen: ${result.error}` },
        { status: 502 }
      );
    }

    await recordAudit({
      source: "admin",
      actor: AUDIT_ADMIN,
      action: "broadcast.group",
      entity: "Broadcast",
      summary: `An die Orga-Gruppe: ${message.slice(0, 120)}`,
    });

    logger.info("broadcast.group_sent");
    return NextResponse.json({ sent: 1, failed: 0, failures: [], target: "group" });
  }

  const members = await prisma.member.findMany({ where: teamId ? { teamId } : undefined });

  if (members.length === 0) {
    return NextResponse.json({ error: "Keine Members gefunden" }, { status: 404 });
  }

  // Ergebnis je Empfänger einsammeln, statt es wie bisher wegzuwerfen: Wer
  // nichts bekommen hat, muss im Admin sichtbar werden — sonst hält man einen
  // Broadcast für zugestellt, der nie ankam.
  const results = await Promise.all(
    members.map(async (member) => ({
      name: member.name,
      result: await sendToPhone(member.phone, message),
    }))
  );

  const failures = results
    .filter((entry) => !entry.result.ok)
    .map((entry) => ({
      name: entry.name,
      error: entry.result.ok ? "" : entry.result.error,
    }));

  const sent = results.length - failures.length;

  await recordAudit({
    source: "admin",
    actor: AUDIT_ADMIN,
    action: "broadcast.members",
    entity: "Broadcast",
    summary: `An ${sent} von ${results.length} Members: ${message.slice(0, 100)}`,
  });

  logger.info("broadcast.sent", { sent, failed: failures.length, teamId: teamId || "all" });

  // Erreicht niemand die Nachricht, ist das kein Teilerfolg, sondern ein Fehler.
  const status = sent === 0 ? 502 : 200;
  return NextResponse.json(
    { sent, failed: failures.length, failures, target: "members" },
    { status }
  );
}
