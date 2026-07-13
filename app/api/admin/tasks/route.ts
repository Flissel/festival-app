import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  categoryId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  memberId: z.string().trim().max(100).optional().or(z.literal("")),
  estimatedCost: z.coerce.number().nonnegative().max(1000000).optional().or(z.literal("")),
});

export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const { categoryId, title, memberId, estimatedCost } = parsed.data;

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

  const task = await prisma.task.create({
    data: {
      categoryId,
      title,
      memberId: memberId || null,
      estimatedCost: estimatedCost === "" || estimatedCost === undefined ? null : estimatedCost,
    },
  });

  return NextResponse.json({ task });
}
