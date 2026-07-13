import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { createPaypalOrder } from "@/lib/paypal";

const bodySchema = z.object({
  guestId: z.string().min(1),
  amount: z.coerce.number().positive().max(100000),
});

export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const { guestId, amount } = parsed.data;

  const guest = await prisma.guest.findUnique({ where: { id: guestId } });
  if (!guest) {
    return NextResponse.json({ error: "Gast nicht gefunden" }, { status: 404 });
  }

  const payment = await prisma.payment.create({
    data: { guestId, amount, currency: "EUR", status: "pending" },
  });

  try {
    const order = await createPaypalOrder({ paymentId: payment.id, amount, currency: "EUR" });
    await prisma.payment.update({
      where: { id: payment.id },
      data: { paypalOrderId: order.id },
    });
    logger.info("paypal.order_created", { guestId, paymentId: payment.id, orderId: order.id });
    return NextResponse.json({ orderId: order.id });
  } catch (error) {
    logger.error("paypal.create_order_error", {
      guestId,
      paymentId: payment.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "PayPal-Order konnte nicht erstellt werden" }, { status: 502 });
  }
}
