import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { capturePaypalOrder } from "@/lib/paypal";

const bodySchema = z.object({
  orderId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const { orderId } = parsed.data;

  const payment = await prisma.payment.findUnique({ where: { paypalOrderId: orderId } });
  if (!payment) {
    return NextResponse.json({ error: "Zahlung nicht gefunden" }, { status: 404 });
  }

  if (payment.status === "completed") {
    return NextResponse.json({ status: "already_completed" });
  }

  try {
    const result = await capturePaypalOrder(orderId);
    if (result.status !== "COMPLETED") {
      logger.warn("paypal.capture_not_completed", { orderId, status: result.status });
      return NextResponse.json({ error: "Zahlung nicht abgeschlossen" }, { status: 409 });
    }

    const unit = result.purchaseUnits[0];
    const capturedAmount = unit?.amount ? Number(unit.amount) : null;
    const expectedAmount = Number(payment.amount);

    // Gebucht werden soll genau der Betrag, für den die Order angelegt wurde.
    // Weicht er ab, wird die Zahlung trotzdem verbucht — das Geld ist ja da —,
    // aber die Abweichung muss im Protokoll stehen, sonst stimmt die Kasse
    // später nicht und niemand weiß warum.
    if (capturedAmount !== null && Math.abs(capturedAmount - expectedAmount) > 0.001) {
      logger.error("paypal.capture_amount_mismatch", {
        orderId,
        paymentId: payment.id,
        expected: expectedAmount,
        captured: capturedAmount,
      });
    }

    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "completed",
          completedAt: new Date(),
          paypalCaptureId: unit?.captureId ?? null,
          ...(capturedAmount !== null ? { amount: capturedAmount } : {}),
        },
      }),
      prisma.guest.update({
        where: { id: payment.guestId },
        data: { paymentStatus: "paid" },
      }),
    ]);

    logger.info("paypal.capture_completed", { orderId, paymentId: payment.id });
    return NextResponse.json({ status: "completed" });
  } catch (error) {
    logger.error("paypal.capture_error", {
      orderId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Zahlung konnte nicht erfasst werden" }, { status: 502 });
  }
}
