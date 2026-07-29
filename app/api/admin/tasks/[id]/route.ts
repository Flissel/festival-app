import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { notifyTaskAssignment } from "@/lib/taskNotifications";
import { parseDueDate } from "@/lib/dueDate";
import { recordAudit, AUDIT_ADMIN } from "@/lib/audit";
import { isRecordNotFound } from "@/lib/prismaError";

const bodySchema = z.object({
  status: z.enum(["open", "in_progress", "done"]).optional(),
  memberId: z.string().trim().max(100).optional(),
  teamId: z.string().trim().max(100).optional(),
  actualCost: z.coerce.number().nonnegative().max(1000000).optional().or(z.literal("")),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
  // Stand, auf dem die Bearbeitung beruht. Wird er mitgeschickt und hat sich
  // die Aufgabe inzwischen geändert, bricht das Update ab, statt die Änderung
  // der anderen Person stillschweigend zu überschreiben.
  expectedUpdatedAt: z.string().datetime().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const task = await prisma.task.findUnique({ where: { id }, include: { category: true } });
  if (!task) {
    return NextResponse.json({ error: "Aufgabe nicht gefunden" }, { status: 404 });
  }

  const { status, memberId, teamId, actualCost, dueDate, expectedUpdatedAt } = parsed.data;

  if (memberId) {
    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member) {
      return NextResponse.json({ error: "Member nicht gefunden" }, { status: 404 });
    }
  }

  if (teamId) {
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      return NextResponse.json({ error: "Team nicht gefunden" }, { status: 404 });
    }
  }

  const isReassignment = memberId !== undefined || teamId !== undefined;

  // Assignment is either a single member or a whole team, never both.
  const assignmentUpdate = isReassignment
    ? memberId
      ? { memberId, teamId: null }
      : teamId
        ? { teamId, memberId: null }
        : { memberId: null, teamId: null }
    : {};

  const data = {
    ...(status !== undefined ? { status } : {}),
    ...assignmentUpdate,
    ...(actualCost !== undefined ? { actualCost: actualCost === "" ? null : actualCost } : {}),
    ...(dueDate !== undefined ? { dueDate: parseDueDate(dueDate || undefined) } : {}),
  };

  let updated;
  try {
    // Der erwartete Stand steckt in der Bedingung des Updates selbst — erst zu
    // prüfen und dann zu schreiben hätte genau die Lücke, um die es geht.
    updated = await prisma.task.update({
      where: expectedUpdatedAt ? { id, updatedAt: new Date(expectedUpdatedAt) } : { id },
      data,
    });
  } catch (error) {
    if (expectedUpdatedAt && isRecordNotFound(error)) {
      const current = await prisma.task.findUnique({ where: { id } });
      return NextResponse.json(
        {
          error:
            "Die Aufgabe wurde inzwischen von jemand anderem geändert. Lade die Seite neu.",
          currentUpdatedAt: current?.updatedAt.toISOString() ?? null,
        },
        { status: 409 }
      );
    }
    throw error;
  }

  const changes: string[] = [];
  if (status !== undefined && status !== task.status) changes.push(`Status → ${status}`);
  if (isReassignment) changes.push("Zuweisung geändert");
  if (actualCost !== undefined) {
    changes.push(`Ist-Kosten → ${actualCost === "" ? "leer" : actualCost}`);
  }
  if (dueDate !== undefined) changes.push(`Fällig → ${dueDate || "leer"}`);

  if (changes.length > 0) {
    await recordAudit({
      source: "admin",
      actor: AUDIT_ADMIN,
      action: "task.update",
      entity: "Task",
      entityId: id,
      summary: `„${task.title}": ${changes.join(", ")}`,
    });
  }

  if (isReassignment && (memberId || teamId)) {
    notifyTaskAssignment({
      memberId: memberId || null,
      teamId: teamId || null,
      taskTitle: task.title,
      categoryName: task.category.name,
    }).catch(() => {});
  }

  return NextResponse.json({ task: updated });
}
