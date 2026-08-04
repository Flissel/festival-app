import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { recordAudit, AUDIT_ADMIN } from "@/lib/audit";
import { EVENT_DEFAULTS, EVENT_INFO_ID, localTimeToDate } from "@/lib/event";

// Leere Felder heißen "nicht gesetzt", nicht "ungültig": Der Termin darf offen
// bleiben, solange er nicht feststeht.
const optionalTime = z
  .string()
  .trim()
  .max(20)
  .optional()
  .transform((value) => value ?? "");

const bodySchema = z.object({
  name: z.string().trim().min(1, "Name darf nicht leer sein").max(120),
  startsAt: optionalTime,
  endsAt: optionalTime,
  lineupNote: z.string().trim().max(200).optional().transform((value) => value ?? ""),
});

export async function PATCH(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" },
      { status: 400 }
    );
  }

  const { name, lineupNote } = parsed.data;

  const startsAt = parsed.data.startsAt ? localTimeToDate(parsed.data.startsAt) : null;
  if (parsed.data.startsAt && !startsAt) {
    return NextResponse.json({ error: "Beginn ist kein gültiger Zeitpunkt" }, { status: 400 });
  }

  const endsAt = parsed.data.endsAt ? localTimeToDate(parsed.data.endsAt) : null;
  if (parsed.data.endsAt && !endsAt) {
    return NextResponse.json({ error: "Ende ist kein gültiger Zeitpunkt" }, { status: 400 });
  }

  // Ein Ende vor dem Beginn ergibt einen Kalendereintrag, den manche Programme
  // gar nicht erst anzeigen.
  if (startsAt && endsAt && endsAt <= startsAt) {
    return NextResponse.json({ error: "Das Ende muss nach dem Beginn liegen" }, { status: 400 });
  }
  if (!startsAt && endsAt) {
    return NextResponse.json({ error: "Ein Ende ohne Beginn ergibt keinen Termin" }, { status: 400 });
  }

  const data = { name, startsAt, endsAt, lineupNote: lineupNote || null };

  const saved = await prisma.eventInfo.upsert({
    where: { id: EVENT_INFO_ID },
    create: { id: EVENT_INFO_ID, ...data },
    update: data,
  });

  await recordAudit({
    source: "admin",
    actor: AUDIT_ADMIN,
    action: "update",
    entity: "event",
    entityId: EVENT_INFO_ID,
    summary: `Event-Daten geändert: ${name}${saved.lineupNote ? `, Line-up: ${saved.lineupNote}` : ""}`,
  });

  logger.info("admin.event_updated", { name, startsAt: startsAt?.toISOString() ?? null });
  return NextResponse.json({ status: "ok" });
}

export async function GET() {
  const row = await prisma.eventInfo.findUnique({ where: { id: EVENT_INFO_ID } });
  return NextResponse.json(row ?? { id: EVENT_INFO_ID, ...EVENT_DEFAULTS });
}
