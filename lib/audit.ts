import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export type AuditSource = "admin" | "chat" | "system";

export type AuditInput = {
  source: AuditSource;
  // Bei source = "chat" das, was OpenClaw als Urheber meldet. Ein Protokoll,
  // keine Zugangskontrolle — die ist der MCP-Token.
  actor: string;
  action: string;
  entity: string;
  entityId?: string | null;
  summary: string;
};

// Protokollieren darf nie den eigentlichen Vorgang scheitern lassen: Wenn das
// Schreiben ins Protokoll fehlschlägt, ist die Änderung trotzdem passiert und
// die aufrufende Person soll dafür keinen Fehler sehen.
export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditEntry.create({
      data: {
        source: input.source,
        actor: input.actor.trim().slice(0, 120) || "unbekannt",
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        summary: input.summary.slice(0, 500),
      },
    });
  } catch (error) {
    logger.warn("audit.write_failed", {
      action: input.action,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export const AUDIT_ADMIN = "Admin";
