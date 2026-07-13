import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { requestSchema } from "@/lib/validation/request";

export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ungültige Eingabe", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const created = await prisma.request.create({ data: parsed.data });
  logger.info("request.created", { requestId: created.id });

  return NextResponse.json({ status: "ok" });
}
