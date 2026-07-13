import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  status: z.enum(["open", "in_progress", "done"]).optional(),
  memberId: z.string().trim().max(100).optional().or(z.literal("")),
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

  const { status, memberId, actualCost } = parsed.data;

  if (memberId) {
    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member) {
      return NextResponse.json({ error: "Member nicht gefunden" }, { status: 404 });
    }
  }

  const updated = await prisma.task.update({
    where: { id },
    data: {
      ...(status !== undefined ? { status } : {}),
      ...(memberId !== undefined ? { memberId: memberId || null } : {}),
      ...(actualCost !== undefined
        ? { actualCost: actualCost === "" ? null : actualCost }
        : {}),
    },
  });

  return NextResponse.json({ task: updated });
}
