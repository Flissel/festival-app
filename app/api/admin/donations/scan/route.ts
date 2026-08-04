import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { recordAudit, AUDIT_ADMIN } from "@/lib/audit";
import { fetchPaypalNotices, isMailboxConfigured } from "@/lib/mailbox";

// IMAP braucht eine echte TCP-Verbindung — die gibt es nur in der Node-
// Laufzeitumgebung, nicht am Edge.
export const runtime = "nodejs";
// Ein Postfach mit vielen Mails braucht länger als die üblichen paar Sekunden.
export const maxDuration = 60;

export async function POST() {
  if (!isMailboxConfigured()) {
    return NextResponse.json(
      { error: "Postfach ist nicht eingerichtet" },
      { status: 400 }
    );
  }

  const result = await fetchPaypalNotices();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  // skipDuplicates fängt die Mails ab, die schon in der Liste stehen. Wichtig
  // ist dabei, dass bestehende Zeilen unangetastet bleiben: Ein bereits
  // übernommener oder weggeklickter Eingang darf nicht wieder als „neu"
  // auftauchen, nur weil die Mail noch im Postfach liegt.
  const created = await prisma.paymentNotice.createMany({
    data: result.notices.map((notice) => ({
      messageId: notice.messageId,
      receivedAt: notice.receivedAt,
      amountCents: notice.amountCents,
      currency: notice.currency,
      senderName: notice.senderName,
      senderEmail: notice.senderEmail,
      transactionCode: notice.transactionCode,
      subject: notice.subject,
      dkimVerified: notice.dkimVerified,
    })),
    skipDuplicates: true,
  });

  if (created.count > 0) {
    await recordAudit({
      source: "admin",
      actor: AUDIT_ADMIN,
      action: "notice.scan",
      entity: "PaymentNotice",
      summary: `${created.count} neue Zahlungseingänge im Postfach gefunden`,
    });
  }

  logger.info("admin.donation_scan", {
    scanned: result.scanned,
    found: result.notices.length,
    created: created.count,
    truncated: result.truncated,
  });

  return NextResponse.json({
    status: "ok",
    scanned: result.scanned,
    created: created.count,
    alreadyKnown: result.notices.length - created.count,
    truncated: result.truncated,
  });
}
