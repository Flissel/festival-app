import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const updateSchema = z.object({
  name: z.string().trim().min(1, "Name ist erforderlich").max(200),
  email: z.string().trim().email("Ungültige E-Mail-Adresse"),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  plusOnes: z.coerce.number().int().min(0).max(20),
  allergies: z.string().trim().max(500).optional().or(z.literal("")),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body: unknown = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ungültige Eingabe", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const guest = await prisma.guest.findUnique({ where: { id } });
  if (!guest) {
    return NextResponse.json({ error: "Gast nicht gefunden" }, { status: 404 });
  }

  const { name, email, phone, plusOnes, allergies } = parsed.data;
  await prisma.guest.update({
    where: { id },
    data: {
      name,
      email,
      phone: phone || null,
      plusOnes,
      allergies: allergies || null,
    },
  });

  logger.info("admin.guest_updated", { guestId: id });
  return NextResponse.json({ status: "ok" });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const guest = await prisma.guest.findUnique({ where: { id } });
  if (!guest) {
    return NextResponse.json({ error: "Gast nicht gefunden" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.payment.deleteMany({ where: { guestId: id } }),
    prisma.guest.delete({ where: { id } }),
  ]);

  logger.info("admin.guest_deleted", { guestId: id });
  return NextResponse.json({ status: "ok" });
}
