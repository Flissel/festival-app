import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessage } from "@/lib/openclaw";
import { logger } from "@/lib/logger";

const bodySchema = z.object({
  message: z.string().trim().min(1).max(2000),
  teamId: z.string().trim().max(100).optional().or(z.literal("")),
});

export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const { message, teamId } = parsed.data;

  const members = await prisma.member.findMany({
    where: teamId ? { teamId } : undefined,
  });

  if (members.length === 0) {
    return NextResponse.json({ error: "Keine Members gefunden" }, { status: 404 });
  }

  await Promise.all(members.map((member) => sendWhatsAppMessage(member.phone, message)));
  logger.info("broadcast.sent", { count: members.length, teamId: teamId || "all" });

  return NextResponse.json({ status: "ok", count: members.length });
}
