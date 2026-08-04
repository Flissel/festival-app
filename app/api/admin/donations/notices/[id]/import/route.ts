import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { recordAudit, AUDIT_ADMIN } from "@/lib/audit";

// Der Betrag kommt aus dem Formular und nicht aus der gespeicherten Zeile.
// Das ist Absicht: Was der Parser aus der Mail gelesen hat, ist ein Vorschlag
// im Eingabefeld — was gebucht wird, hat die Orga gesehen und bestätigt.
const bodySchema = z.object({
  guestId: z.string().min(1),
  amount: z.coerce.number().positive().max(100000),
});

class AlreadyHandled extends Error {}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const notice = await prisma.paymentNotice.findUnique({ where: { id } });
  if (!notice) {
    return NextResponse.json({ error: "Eingang nicht gefunden" }, { status: 404 });
  }

  const guest = await prisma.guest.findUnique({ where: { id: parsed.data.guestId } });
  if (!guest) {
    return NextResponse.json({ error: "Gast nicht gefunden" }, { status: 404 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Zuerst die Zeile beanspruchen. Klicken zwei Leute gleichzeitig auf
      // Übernehmen, gewinnt genau einer — sonst stünde derselbe Eingang zweimal
      // im Kassenstand.
      const claimed = await tx.paymentNotice.updateMany({
        where: { id, status: "neu" },
        data: { status: "uebernommen" },
      });
      if (claimed.count === 0) throw new AlreadyHandled();

      const payment = await tx.payment.create({
        data: {
          guestId: guest.id,
          amount: parsed.data.amount,
          currency: "EUR",
          status: "completed",
          completedAt: notice.receivedAt,
        },
      });

      await tx.paymentNotice.update({ where: { id }, data: { paymentId: payment.id } });
      await tx.guest.update({ where: { id: guest.id }, data: { paymentStatus: "paid" } });
    });
  } catch (error) {
    if (error instanceof AlreadyHandled) {
      return NextResponse.json(
        { error: "Dieser Eingang wurde schon bearbeitet." },
        { status: 409 }
      );
    }
    throw error;
  }

  await recordAudit({
    source: "admin",
    actor: AUDIT_ADMIN,
    action: "payment.create",
    entity: "PaymentNotice",
    entityId: id,
    summary:
      `Beitrag über ${parsed.data.amount.toFixed(2)} € von ${guest.name} aus der ` +
      `PayPal-Mail übernommen (${notice.senderName ?? "Absender unbekannt"})`,
  });

  logger.info("admin.notice_imported", { noticeId: id, guestId: guest.id });
  return NextResponse.json({ status: "ok" });
}
