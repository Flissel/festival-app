import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const existing = await prisma.request.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Anfrage nicht gefunden" }, { status: 404 });
  }

  const updated = await prisma.request.update({
    where: { id },
    data: { status: "answered", answeredAt: new Date() },
  });

  return NextResponse.json({ request: updated });
}
