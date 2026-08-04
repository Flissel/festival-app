import { NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { recordAudit, AUDIT_ADMIN } from "@/lib/audit";
import { storeTaskImage, removeTaskImage, isStorageConfigured } from "@/lib/taskImage";

// Alles unter /api/admin/ hängt hinter der Sitzungsprüfung in proxy.ts. Genau
// deshalb liegen die Fotos in einem privaten Blob-Speicher und werden hier
// durchgereicht, statt unter einer URL zu liegen, die jeder aufrufen kann.

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const task = await prisma.task.findUnique({ where: { id }, select: { imagePath: true } });
  if (!task?.imagePath) {
    return new NextResponse("Kein Foto zu dieser Aufgabe", { status: 404 });
  }

  const result = await get(task.imagePath, { access: "private" });
  if (result?.statusCode !== 200) {
    return new NextResponse("Foto nicht gefunden", { status: 404 });
  }

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType ?? "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
      // Privat heißt auch: nicht in einem geteilten Cache ablegen.
      "Cache-Control": "private, max-age=300",
    },
  });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!isStorageConfigured()) {
    return NextResponse.json(
      { error: "Der Bildspeicher ist nicht eingerichtet." },
      { status: 503 }
    );
  }

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) {
    return NextResponse.json({ error: "Aufgabe nicht gefunden" }, { status: 404 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Kein Bild empfangen" }, { status: 400 });
  }

  const stored = await storeTaskImage(id, file, file.type);
  if (!stored.ok) {
    return NextResponse.json({ error: stored.error }, { status: 400 });
  }

  const previous = task.imagePath;
  await prisma.task.update({ where: { id }, data: { imagePath: stored.pathname } });

  // Erst nach dem erfolgreichen Update: Bricht der Schritt davor ab, zeigt die
  // Aufgabe weiter auf ein Foto, das es noch gibt.
  if (previous) await removeTaskImage(previous).catch(() => {});

  await recordAudit({
    source: "admin",
    actor: AUDIT_ADMIN,
    action: "task.image.set",
    entity: "Task",
    entityId: id,
    summary: `Foto zu „${task.title}" ${previous ? "ersetzt" : "hinzugefügt"}`,
  });

  return NextResponse.json({ status: "ok" });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) {
    return NextResponse.json({ error: "Aufgabe nicht gefunden" }, { status: 404 });
  }
  if (!task.imagePath) {
    return NextResponse.json({ status: "ok" });
  }

  await prisma.task.update({ where: { id }, data: { imagePath: null } });
  await removeTaskImage(task.imagePath).catch(() => {});

  await recordAudit({
    source: "admin",
    actor: AUDIT_ADMIN,
    action: "task.image.clear",
    entity: "Task",
    entityId: id,
    summary: `Foto zu „${task.title}" entfernt`,
  });

  return NextResponse.json({ status: "ok" });
}
