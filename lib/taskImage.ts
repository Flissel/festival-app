import { put, del } from "@vercel/blob";

// Was der Browser als Bild anzeigen kann, ohne dass wir uns Sorgen machen
// müssen. Kein SVG: Das darf Skripte enthalten, und ein Foto vom Anhänger ist
// nie ein SVG.
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

// Handyfotos liegen bei 2–5 MB. Zehn ist großzügig genug für ein unbearbeitetes
// Bild und klein genug, dass niemand versehentlich ein Video hochlädt.
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export type ImageRejection = { ok: false; error: string };
export type ImageAccepted = { ok: true; pathname: string };

export function isStorageConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

// Zwei Token dürfen Fotos hochladen, und der Unterschied ist der Punkt:
//
// `MCP_SERVER_TOKEN` öffnet sämtliche Werkzeuge — Gästezahlen, Members,
// Nachrichtenversand, Löschen. `MCP_UPLOAD_TOKEN` öffnet nur den Upload.
//
// Gebraucht wird das, weil der Bot Fotos aus einer Sandbox hochlädt. Die hat
// bewusst keinen Zugriff auf seine Konfiguration und bekommt den Token darum
// mitgegeben — und was man mitgibt, sollte so wenig können wie möglich.
//
// Ist kein Upload-Token gesetzt, gilt weiter der Voll-Token: Sonst wäre eine
// bestehende Installation nach dem Update stumm kaputt.
export function isUploadAuthorized(authorizationHeader: string | null): boolean {
  if (!authorizationHeader) return false;

  const accepted = [process.env.MCP_UPLOAD_TOKEN, process.env.MCP_SERVER_TOKEN].filter(
    (token): token is string => Boolean(token)
  );

  return accepted.some((token) => authorizationHeader === `Bearer ${token}`);
}

// Gibt den Grund zurück, statt ihn zu verschlucken: Wer ein Foto hochlädt und
// nichts passiert, probiert es dreimal, bevor er fragt.
export function checkImage(type: string, size: number): ImageRejection | null {
  if (!ALLOWED_TYPES.has(type)) {
    return {
      ok: false,
      error: `„${type}" ist kein unterstütztes Bildformat. Erlaubt sind JPEG, PNG, WebP und GIF.`,
    };
  }
  if (size > MAX_IMAGE_BYTES) {
    return {
      ok: false,
      error: `Das Bild ist ${(size / 1024 / 1024).toFixed(1)} MB groß, erlaubt sind ${MAX_IMAGE_BYTES / 1024 / 1024} MB.`,
    };
  }
  return null;
}

export async function storeTaskImage(
  taskId: string,
  file: Blob,
  contentType: string
): Promise<ImageAccepted | ImageRejection> {
  if (!isStorageConfigured()) {
    return { ok: false, error: "Der Bildspeicher ist nicht eingerichtet (BLOB_READ_WRITE_TOKEN fehlt)." };
  }

  const rejection = checkImage(contentType, file.size);
  if (rejection) return rejection;

  // Der Zufallssuffix kommt von Vercel. Ohne ihn würde ein zweites Foto zur
  // selben Aufgabe das erste überschreiben, während die alte URL noch im
  // Browser-Cache hängt.
  const blob = await put(`tasks/${taskId}.${EXTENSIONS[contentType]}`, file, {
    access: "private",
    contentType,
    addRandomSuffix: true,
  });

  return { ok: true, pathname: blob.pathname };
}

// Beim Ersetzen und beim Löschen einer Aufgabe: Das alte Foto liegt sonst für
// immer im Speicher, den niemand mehr aufräumt.
export async function removeTaskImage(pathname: string): Promise<void> {
  if (!isStorageConfigured()) return;
  await del(pathname);
}
