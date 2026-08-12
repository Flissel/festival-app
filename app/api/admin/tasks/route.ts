import { NextRequest, NextResponse, after } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { notifyTaskAssignment } from "@/lib/taskNotifications";
import { parseDueDate } from "@/lib/dueDate";
import { recordAudit, AUDIT_ADMIN } from "@/lib/audit";
import { isUniqueViolation } from "@/lib/prismaError";

const bodySchema = z.object({
  categoryId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  memberId: z.string().trim().max(100).optional().or(z.literal("")),
  teamId: z.string().trim().max(100).optional().or(z.literal("")),
  estimatedCost: z.coerce.number().nonnegative().max(1000000).optional().or(z.literal("")),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
});

export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const { categoryId, title, description, memberId, teamId, estimatedCost, dueDate } = parsed.data;

  const category = await prisma.budgetCategory.findUnique({ where: { id: categoryId } });
  if (!category) {
    return NextResponse.json({ error: "Kategorie nicht gefunden" }, { status: 404 });
  }

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

  let task;
  try {
    task = await prisma.task.create({
      data: {
        categoryId,
        title,
        description: description || null,
        memberId: memberId || null,
        teamId: teamId || null,
        estimatedCost: estimatedCost === "" || estimatedCost === undefined ? null : estimatedCost,
        dueDate: parseDueDate(dueDate || undefined),
      },
    });
  } catch (error) {
    // Titel sind je Kategorie eindeutig — sonst weiß niemand mehr, welche der
    // zwei gleichnamigen Aufgaben im Chat gemeint ist.
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { error: `In „${category.name}" gibt es „${title}" schon.` },
        { status: 409 }
      );
    }
    throw error;
  }

  await recordAudit({
    source: "admin",
    actor: AUDIT_ADMIN,
    action: "task.create",
    entity: "Task",
    entityId: task.id,
    summary: `„${title}" in „${category.name}" angelegt`,
  });

  if (memberId || teamId) {
    // Siehe /api/rsvp: ohne after() stirbt der Versand mit der Antwort.
    after(() =>
      notifyTaskAssignment({
        memberId: memberId || null,
        teamId: teamId || null,
        taskTitle: title,
        categoryName: category.name,
      }).catch(() => {})
    );
  }

  return NextResponse.json({ task });
}
