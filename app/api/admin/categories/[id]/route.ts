import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({ name: z.string().trim().min(1).max(100) });

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const category = await prisma.budgetCategory.findUnique({ where: { id } });
  if (!category) {
    return NextResponse.json({ error: "Kategorie nicht gefunden" }, { status: 404 });
  }

  const updated = await prisma.budgetCategory.update({
    where: { id },
    data: { name: parsed.data.name },
  });
  return NextResponse.json({ category: updated });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const category = await prisma.budgetCategory.findUnique({ where: { id } });
  if (!category) {
    return NextResponse.json({ error: "Kategorie nicht gefunden" }, { status: 404 });
  }

  await prisma.budgetCategory.delete({ where: { id } });
  return NextResponse.json({ status: "ok" });
}
