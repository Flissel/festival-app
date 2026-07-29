import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { recordAudit, AUDIT_ADMIN } from "@/lib/audit";
import { isUniqueViolation } from "@/lib/prismaError";

const bodySchema = z.object({ name: z.string().trim().min(1).max(100) });

export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const count = await prisma.budgetCategory.count();

  let category;
  try {
    category = await prisma.budgetCategory.create({
      data: { name: parsed.data.name, sortOrder: count },
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { error: `Die Kategorie „${parsed.data.name}" gibt es schon.` },
        { status: 409 }
      );
    }
    throw error;
  }

  await recordAudit({
    source: "admin",
    actor: AUDIT_ADMIN,
    action: "category.create",
    entity: "BudgetCategory",
    entityId: category.id,
    summary: `Kategorie „${category.name}" angelegt`,
  });

  return NextResponse.json({ category });
}
