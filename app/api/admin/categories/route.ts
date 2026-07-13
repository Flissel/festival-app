import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({ name: z.string().trim().min(1).max(100) });

export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const count = await prisma.budgetCategory.count();
  const category = await prisma.budgetCategory.create({
    data: { name: parsed.data.name, sortOrder: count },
  });

  return NextResponse.json({ category });
}
