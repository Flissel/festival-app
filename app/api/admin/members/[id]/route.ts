import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const member = await prisma.member.findUnique({ where: { id } });
  if (!member) {
    return NextResponse.json({ error: "Member nicht gefunden" }, { status: 404 });
  }

  await prisma.member.delete({ where: { id } });
  return NextResponse.json({ status: "ok" });
}
