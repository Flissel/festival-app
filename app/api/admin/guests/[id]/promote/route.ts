import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { sendWaitlistPromotion } from "@/lib/email";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const guest = await prisma.guest.findUnique({ where: { id } });
  if (!guest) {
    return NextResponse.json({ error: "Gast nicht gefunden" }, { status: 404 });
  }
  if (!guest.waitlisted) {
    return NextResponse.json({ error: "Gast steht nicht auf der Warteliste" }, { status: 400 });
  }

  await prisma.guest.update({ where: { id }, data: { waitlisted: false } });

  sendWaitlistPromotion({
    to: guest.email,
    name: guest.name,
    guestId: guest.id,
    paymentMethod: guest.paymentStatus === "cash_pending" ? "cash" : "online",
  }).catch(() => {});

  logger.info("admin.guest_promoted", { guestId: id });
  return NextResponse.json({ status: "ok" });
}
