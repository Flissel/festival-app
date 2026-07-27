import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { sendRequestReply } from "@/lib/email";

const bodySchema = z.object({
  reply: z.string().trim().min(1, "Antwort ist erforderlich").max(5000),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const existing = await prisma.request.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Anfrage nicht gefunden" }, { status: 404 });
  }

  const sent = await sendRequestReply({
    to: existing.email,
    name: existing.name,
    originalMessage: existing.message,
    reply: parsed.data.reply,
  });
  if (!sent) {
    return NextResponse.json(
      { error: "E-Mail-Versand fehlgeschlagen — ist der Gmail-Versand konfiguriert?" },
      { status: 502 }
    );
  }

  await prisma.request.update({
    where: { id },
    data: { status: "answered", answeredAt: new Date() },
  });

  logger.info("admin.request_replied", { requestId: id });
  return NextResponse.json({ status: "ok" });
}
