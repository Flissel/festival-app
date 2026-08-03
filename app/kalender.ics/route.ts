import { getEvent } from "@/lib/event";
import { VENUE } from "@/lib/venue";
import { appBaseUrl } from "@/lib/appUrl";

// Liest den Termin aus der Datenbank, darf also nicht vorgerendert werden.
export const dynamic = "force-dynamic";

// Feste Kennung: Wer den Termin ein zweites Mal hinzufügt, aktualisiert den
// vorhandenen Eintrag, statt einen doppelten anzulegen.
const EVENT_UID = "das-festival@festival-app";

/** In iCalendar sind Komma, Semikolon und Backslash Steuerzeichen. */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function stamp(date: Date): string {
  return `${date.toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`;
}

/**
 * RFC 5545 erlaubt höchstens 75 Oktette je Zeile; längere werden umbrochen und
 * die Folgezeile beginnt mit einem Leerzeichen. Ohne das lehnen manche
 * Kalender die Datei wortlos ab.
 */
function fold(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;

  const chunks: string[] = [];
  let start = 0;
  while (start < bytes.length) {
    // 74 Oktette, damit für das führende Leerzeichen der Folgezeile Platz
    // bleibt; die Grenze auf ein Zeichen ausrichten, sonst zerfällt ein
    // Umlaut in zwei halbe Bytes.
    let end = Math.min(start + (start === 0 ? 75 : 74), bytes.length);
    while (end > start && end < bytes.length && (bytes[end] & 0xc0) === 0x80) end -= 1;
    chunks.push(bytes.subarray(start, end).toString("utf8"));
    start = end;
  }
  return chunks.join("\r\n ");
}

export async function GET() {
  const event = await getEvent();

  if (!event.startsAt) {
    return new Response("Der Termin steht noch nicht fest.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // Ohne Ende nimmt der Kalender sonst irgendeine Dauer an.
  const endsAt = event.endsAt ?? new Date(event.startsAt.getTime() + 12 * 60 * 60 * 1000);
  const base = appBaseUrl();

  const description = [
    "Einladung, Anmeldung und Anfahrt:",
    base ?? VENUE.googleMapsUrl,
    "",
    `Karte: ${VENUE.googleMapsUrl}`,
  ].join("\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Festival-App//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${EVENT_UID}`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(event.startsAt)}`,
    `DTEND:${stamp(endsAt)}`,
    `SUMMARY:${escapeText(event.name)}`,
    `LOCATION:${escapeText(VENUE.label)}`,
    `GEO:${VENUE.latitude};${VENUE.longitude}`,
    `DESCRIPTION:${escapeText(description)}`,
    base ? `URL:${base}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter((line): line is string => line !== null);

  return new Response(lines.map(fold).join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="festival.ics"',
      "Cache-Control": "no-store",
    },
  });
}
