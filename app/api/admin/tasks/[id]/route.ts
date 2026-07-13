import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  status: z.enum(["open", "in_progress", "done"]).optional(),
  assignee: z.string().trim().max(100).optional().or(z.literal("")),
  actualCost: z.coerce.number().nonnegative().max(1000000).optional().or(z.literal("")),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) {
    return NextResponse.json({ error: "Aufgabe nicht gefunden" }, { status: 404 });
  }

  const { status, assignee, actualCost } = parsed.data;

  const updated = await prisma.task.update({
    where: { id },
    data: {
      ...(status !== undefined ? { status } : {}),
      ...(assignee !== undefined ? { assignee: assignee || null } : {}),
      ...(actualCost !== undefined
        ? { actualCost: actualCost === "" ? null : actualCost }
        : {}),
    },
  });

  return NextResponse.json({ task: updated });
}
