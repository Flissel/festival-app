import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { recordAudit, AUDIT_ADMIN } from "@/lib/audit";

const bodySchema = z.object({
  amount: z.coerce.number().positive().max(100000),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const guest = await prisma.guest.findUnique({ where: { id } });
  if (!guest) {
    return NextResponse.json({ error: "Gast nicht gefunden" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.payment.create({
      data: {
        guestId: id,
        amount: parsed.data.amount,
        currency: "EUR",
        status: "completed",
        completedAt: new Date(),
      },
    }),
    prisma.guest.update({ where: { id }, data: { paymentStatus: "paid" } }),
  ]);

  // Geld ist die Stelle, an der später am ehesten jemand fragt, wie das da
  // hineingekommen ist.
  await recordAudit({
    source: "admin",
    actor: AUDIT_ADMIN,
    action: "payment.create",
    entity: "Payment",
    entityId: id,
    summary: `Beitrag über ${parsed.data.amount.toFixed(2)} € von ${guest.name} eingetragen`,
  });

  logger.info("admin.guest_marked_paid", { guestId: id, amount: parsed.data.amount });
  return NextResponse.json({ status: "ok" });
}
