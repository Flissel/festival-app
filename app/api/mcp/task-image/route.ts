import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import {
  storeTaskImage,
  removeTaskImage,
  isStorageConfigured,
  isUploadAuthorized,
} from "@/lib/taskImage";
import { logger } from "@/lib/logger";

// Ein Foto lässt sich nicht durch ein MCP-Werkzeug schicken: Die Werkzeuge
// tauschen Text aus, und ein Bild als Base64 sprengt sowohl das Kontextfenster
// des Modells als auch das Größenlimit einer Serverless-Anfrage. Der Bot lädt
// die Datei deshalb direkt hier hoch — mit einem Token, der nur das darf und
// nicht die übrigen Werkzeuge öffnet (siehe isUploadAuthorized).

export async function POST(request: NextRequest) {
  if (!isUploadAuthorized(request.headers.get("authorization"))) {
    logger.warn("mcp.task_image.unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isStorageConfigured()) {
    return NextResponse.json({ error: "Der Bildspeicher ist nicht eingerichtet." }, { status: 503 });
  }

  const taskId = request.nextUrl.searchParams.get("taskId")?.trim();
  if (!taskId) {
    return NextResponse.json({ error: "taskId fehlt in der Adresse" }, { status: 400 });
  }

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    return NextResponse.json(
      { error: "Aufgabe nicht gefunden. Hol dir die aktuelle Liste mit list_tasks." },
      { status: 404 }
    );
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Kein Bild empfangen. Erwartet wird ein Formularfeld namens file." },
      { status: 400 }
    );
  }

  const stored = await storeTaskImage(taskId, file, file.type);
  if (!stored.ok) {
    return NextResponse.json({ error: stored.error }, { status: 400 });
  }

  const previous = task.imagePath;
  await prisma.task.update({ where: { id: taskId }, data: { imagePath: stored.pathname } });
  if (previous) await removeTaskImage(previous).catch(() => {});

  // Wer das Foto geschickt hat, weiß der Bot; er hängt es als actor an.
  const actor = request.nextUrl.searchParams.get("actor")?.trim() || "Chat";
  await recordAudit({
    source: "chat",
    actor,
    action: "task.image.set",
    entity: "Task",
    entityId: taskId,
    summary: `Foto zu „${task.title}" ${previous ? "ersetzt" : "hinzugefügt"}`,
  });

  logger.info("mcp.task_image.stored", { taskId });
  return NextResponse.json({ status: "ok", message: `Foto zu „${task.title}" gespeichert.` });
}
