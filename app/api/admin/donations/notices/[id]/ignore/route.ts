import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { recordAudit, AUDIT_ADMIN } from "@/lib/audit";

// Wegklicken, was keine Spende ist: die Rückzahlung vom Getränkelieferanten,
// das Geld vom Mitbewohner. Die Zeile bleibt in der Datenbank, damit derselbe
// Eingang beim nächsten Abruf nicht wieder auftaucht.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const notice = await prisma.paymentNotice.findUnique({ where: { id } });
  if (!notice) {
    return NextResponse.json({ error: "Eingang nicht gefunden" }, { status: 404 });
  }
  if (notice.status === "uebernommen") {
    return NextResponse.json(
      { error: "Dieser Eingang ist schon als Beitrag eingetragen." },
      { status: 409 }
    );
  }

  await prisma.paymentNotice.update({ where: { id }, data: { status: "ignoriert" } });

  await recordAudit({
    source: "admin",
    actor: AUDIT_ADMIN,
    action: "notice.ignore",
    entity: "PaymentNotice",
    entityId: id,
    summary: `Zahlungseingang „${notice.subject.slice(0, 80)}" als keine Spende weggeklickt`,
  });

  logger.info("admin.notice_ignored", { noticeId: id });
  return NextResponse.json({ status: "ok" });
}
