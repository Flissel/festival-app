import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { recordAudit, AUDIT_ADMIN } from "@/lib/audit";
import { localTimeToDate } from "@/lib/event";
import { isRecordNotFound, isUniqueViolation } from "@/lib/prismaError";
import { formatTime } from "@/lib/timetable";

const patchSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  stage: z.string().trim().min(1).max(60).optional(),
  startsAt: z.string().trim().min(1).max(20).optional(),
  // Leerer String heißt hier ausdrücklich „Ende wieder entfernen" — beim
  // letzten Act der Nacht steht es oft erst spät fest und manchmal gar nicht.
  endsAt: z.string().trim().max(20).optional(),
  note: z.string().trim().max(300).optional(),
  isPublic: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body: unknown = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" },
      { status: 400 }
    );
  }

  const existing = await prisma.timetableSlot.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Programmpunkt nicht gefunden" }, { status: 404 });
  }

  const data: {
    title?: string;
    stage?: string;
    startsAt?: Date;
    endsAt?: Date | null;
    note?: string | null;
    isPublic?: boolean;
  } = {};

  if (parsed.data.title !== undefined) data.title = parsed.data.title;
  if (parsed.data.stage !== undefined) data.stage = parsed.data.stage;
  if (parsed.data.note !== undefined) data.note = parsed.data.note || null;
  if (parsed.data.isPublic !== undefined) data.isPublic = parsed.data.isPublic;

  if (parsed.data.startsAt !== undefined) {
    const startsAt = localTimeToDate(parsed.data.startsAt);
    if (!startsAt) {
      return NextResponse.json({ error: "Beginn ist kein gültiger Zeitpunkt" }, { status: 400 });
    }
    data.startsAt = startsAt;
  }

  if (parsed.data.endsAt !== undefined) {
    if (parsed.data.endsAt === "") {
      data.endsAt = null;
    } else {
      const endsAt = localTimeToDate(parsed.data.endsAt);
      if (!endsAt) {
        return NextResponse.json({ error: "Ende ist kein gültiger Zeitpunkt" }, { status: 400 });
      }
      data.endsAt = endsAt;
    }
  }

  // Gegen den Stand nach der Änderung prüfen, nicht gegen die Eingabe: Wer nur
  // den Beginn verschiebt, soll trotzdem nicht hinter dem alten Ende landen.
  const startsAt = data.startsAt ?? existing.startsAt;
  const endsAt = data.endsAt !== undefined ? data.endsAt : existing.endsAt;
  if (endsAt && endsAt <= startsAt) {
    return NextResponse.json({ error: "Das Ende muss nach dem Beginn liegen" }, { status: 400 });
  }

  try {
    const slot = await prisma.timetableSlot.update({ where: { id }, data });

    await recordAudit({
      source: "admin",
      actor: AUDIT_ADMIN,
      action: "timetable.update",
      entity: "TimetableSlot",
      entityId: id,
      summary: `Zeitplan geändert: „${slot.title}" um ${formatTime(slot.startsAt)} auf ${slot.stage}`,
    });

    logger.info("admin.timetable_updated", { id });
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { error: "Auf dieser Bühne steht zu der Uhrzeit schon etwas im Plan." },
        { status: 409 }
      );
    }
    if (isRecordNotFound(error)) {
      return NextResponse.json({ error: "Programmpunkt war schon gelöscht" }, { status: 404 });
    }
    throw error;
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const existing = await prisma.timetableSlot.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Programmpunkt nicht gefunden" }, { status: 404 });
  }

  try {
    await prisma.timetableSlot.delete({ where: { id } });
  } catch (error) {
    if (isRecordNotFound(error)) {
      return NextResponse.json({ error: "Programmpunkt war schon gelöscht" }, { status: 404 });
    }
    throw error;
  }

  await recordAudit({
    source: "admin",
    actor: AUDIT_ADMIN,
    action: "timetable.delete",
    entity: "TimetableSlot",
    entityId: id,
    summary: `„${existing.title}" um ${formatTime(existing.startsAt)} aus dem Zeitplan entfernt`,
  });

  logger.info("admin.timetable_deleted", { id });
  return NextResponse.json({ status: "ok" });
}
