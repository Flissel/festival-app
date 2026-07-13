import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { rsvpSchema } from "@/lib/validation/rsvp";

export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = rsvpSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ungültige Eingabe", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, email, phone, plusOnes, allergies, paymentMethod, amount } = parsed.data;

  const guest = await prisma.guest.create({
    data: {
      name,
      email,
      phone: phone || null,
      plusOnes,
      allergies: allergies || null,
      paymentStatus: paymentMethod === "cash" ? "cash_pending" : "pending",
    },
  });

  logger.info("rsvp.created", { guestId: guest.id, paymentMethod });

  return NextResponse.json({
    guestId: guest.id,
    paymentMethod,
    amount: amount ?? null,
  });
}
