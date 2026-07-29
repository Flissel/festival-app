import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { importOrgaPlan } from "@/lib/orgaPlan";
import { logger } from "@/lib/logger";

// Damit der Orga-Plan ohne Kommandozeile und ohne Datenbank-Zugangsdaten in die
// App kommt: einmal klicken im Admin, danach sehen ihn alle. Der Import ist
// idempotent, mehrfaches Klicken legt also nichts doppelt an.
export async function POST() {
  try {
    const result = await importOrgaPlan(prisma);
    logger.info("admin.orga_plan_imported", result);
    return NextResponse.json(result);
  } catch (error) {
    logger.warn("admin.orga_plan_import_error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Import fehlgeschlagen" }, { status: 500 });
  }
}
