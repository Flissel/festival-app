import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { recordAudit, AUDIT_ADMIN } from "@/lib/audit";
import { isRecordNotFound } from "@/lib/prismaError";

// Die Spendenliste ist Handarbeit — also muss auch ein falsch eingetragener
// Betrag wieder verschwinden können. Ohne das bliebe ein Tippfehler für immer
// im Kassenstand stehen.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { guest: { select: { id: true, name: true } } },
  });
  if (!payment) {
    return NextResponse.json({ error: "Eintrag nicht gefunden" }, { status: 404 });
  }

  try {
    await prisma.payment.delete({ where: { id } });
  } catch (error) {
    if (isRecordNotFound(error)) {
      return NextResponse.json({ error: "Eintrag war schon gelöscht" }, { status: 404 });
    }
    throw error;
  }

  // Bleibt nichts mehr übrig, ist der Gast auch nicht mehr als bezahlt zu
  // führen — sonst zeigt die Gästeliste „bezahlt“ ohne einen einzigen Beleg.
  const remaining = await prisma.payment.count({
    where: { guestId: payment.guestId, status: "completed" },
  });
  if (remaining === 0) {
    await prisma.guest.update({
      where: { id: payment.guestId },
      data: { paymentStatus: "pending" },
    });
  }

  await recordAudit({
    source: "admin",
    actor: AUDIT_ADMIN,
    action: "payment.delete",
    entity: "Payment",
    entityId: id,
    summary: `Beitrag über ${Number(payment.amount).toFixed(2)} € von ${payment.guest.name} entfernt`,
  });

  logger.info("admin.payment_deleted", { paymentId: id, guestId: payment.guestId });
  return NextResponse.json({ status: "ok" });
}
