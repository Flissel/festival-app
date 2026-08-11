import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { recordAudit, AUDIT_ADMIN } from "@/lib/audit";
import { localTimeToDate } from "@/lib/event";
import { isUniqueViolation } from "@/lib/prismaError";
import { formatTime } from "@/lib/timetable";

const bodySchema = z.object({
  title: z.string().trim().min(1, "Ohne Titel weiß niemand, was da läuft").max(120),
  stage: z.string().trim().min(1, "Auf welche Bühne gehört der Punkt?").max(60),
  startsAt: z.string().trim().min(1, "Ohne Beginn hat der Punkt keinen Platz im Plan").max(20),
  endsAt: z.string().trim().max(20).optional().transform((value) => value ?? ""),
  note: z.string().trim().max(300).optional().transform((value) => value ?? ""),
  isPublic: z.boolean().optional().transform((value) => value ?? true),
});

export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" },
      { status: 400 }
    );
  }

  const { title, stage, note, isPublic } = parsed.data;

  const startsAt = localTimeToDate(parsed.data.startsAt);
  if (!startsAt) {
    return NextResponse.json({ error: "Beginn ist kein gültiger Zeitpunkt" }, { status: 400 });
  }

  const endsAt = parsed.data.endsAt ? localTimeToDate(parsed.data.endsAt) : null;
  if (parsed.data.endsAt && !endsAt) {
    return NextResponse.json({ error: "Ende ist kein gültiger Zeitpunkt" }, { status: 400 });
  }
  if (endsAt && endsAt <= startsAt) {
    return NextResponse.json({ error: "Das Ende muss nach dem Beginn liegen" }, { status: 400 });
  }

  try {
    const slot = await prisma.timetableSlot.create({
      data: { title, stage, startsAt, endsAt, note: note || null, isPublic },
    });

    await recordAudit({
      source: "admin",
      actor: AUDIT_ADMIN,
      action: "timetable.create",
      entity: "TimetableSlot",
      entityId: slot.id,
      summary: `„${title}" um ${formatTime(startsAt)} auf ${stage} in den Zeitplan aufgenommen`,
    });

    logger.info("admin.timetable_created", { id: slot.id, stage });
    return NextResponse.json({ status: "ok", id: slot.id });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { error: `Auf ${stage} steht zu dieser Uhrzeit schon etwas im Plan.` },
        { status: 409 }
      );
    }
    throw error;
  }
}
