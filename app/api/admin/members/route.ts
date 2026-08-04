import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  name: z.string().trim().min(1).max(100),
  // Optional: Wer jemanden nur zum Zuweisen von Aufgaben braucht, hat die
  // Nummer oft nicht zur Hand.
  phone: z.string().trim().max(30).optional(),
});

export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const member = await prisma.member.create({
    data: { name: parsed.data.name, phone: parsed.data.phone || null },
  });
  return NextResponse.json({ member });
}
