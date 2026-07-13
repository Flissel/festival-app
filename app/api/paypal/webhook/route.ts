import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { verifyPaypalWebhookSignature } from "@/lib/paypal";

type PaypalCaptureCompletedEvent = {
  event_type: string;
  resource: {
    id: string;
    custom_id?: string;
    status: string;
  };
};

export async function POST(request: NextRequest) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    logger.error("paypal.webhook_id_missing");
    return NextResponse.json({ error: "Webhook nicht konfiguriert" }, { status: 500 });
  }

  const rawBody: unknown = await request.json().catch(() => null);
  if (!rawBody || typeof rawBody !== "object") {
    return NextResponse.json({ error: "Ungültiger Payload" }, { status: 400 });
  }

  const headers: Record<string, string> = {
    "paypal-transmission-id": request.headers.get("paypal-transmission-id") ?? "",
    "paypal-transmission-time": request.headers.get("paypal-transmission-time") ?? "",
    "paypal-cert-url": request.headers.get("paypal-cert-url") ?? "",
    "paypal-auth-algo": request.headers.get("paypal-auth-algo") ?? "",
    "paypal-transmission-sig": request.headers.get("paypal-transmission-sig") ?? "",
  };

  const verified = await verifyPaypalWebhookSignature({ webhookId, headers, body: rawBody });
  if (!verified) {
    logger.warn("paypal.webhook_signature_invalid");
    return NextResponse.json({ error: "Signatur ungültig" }, { status: 400 });
  }

  const event = rawBody as PaypalCaptureCompletedEvent;

  if (event.event_type !== "PAYMENT.CAPTURE.COMPLETED") {
    return NextResponse.json({ status: "ignored" });
  }

  const paymentId = event.resource.custom_id;
  if (!paymentId) {
    logger.warn("paypal.webhook_missing_custom_id", { captureId: event.resource.id });
    return NextResponse.json({ status: "ignored" });
  }

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) {
    logger.warn("paypal.webhook_unknown_payment", { paymentId });
    return NextResponse.json({ status: "ignored" });
  }

  if (payment.status !== "completed") {
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: { status: "completed", completedAt: new Date() },
      }),
      prisma.guest.update({
        where: { id: payment.guestId },
        data: { paymentStatus: "paid" },
      }),
    ]);
    logger.info("paypal.webhook_payment_completed", { paymentId });
  }

  return NextResponse.json({ status: "ok" });
}
