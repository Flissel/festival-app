import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  teamId: z.string().trim().max(100).optional().or(z.literal("")),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const member = await prisma.member.findUnique({ where: { id } });
  if (!member) {
    return NextResponse.json({ error: "Member nicht gefunden" }, { status: 404 });
  }

  const { teamId } = parsed.data;
  if (teamId) {
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      return NextResponse.json({ error: "Team nicht gefunden" }, { status: 404 });
    }
  }

  const updated = await prisma.member.update({
    where: { id },
    data: { teamId: teamId || null },
  });
  return NextResponse.json({ member: updated });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const member = await prisma.member.findUnique({ where: { id } });
  if (!member) {
    return NextResponse.json({ error: "Member nicht gefunden" }, { status: 404 });
  }

  await prisma.member.delete({ where: { id } });
  return NextResponse.json({ status: "ok" });
}
