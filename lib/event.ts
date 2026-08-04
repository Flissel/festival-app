import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/** Alle Uhrzeiten sind Ortszeit am Veranstaltungsort, nicht Serverzeit. */
export const EVENT_TIME_ZONE = "Europe/Berlin";

/** Es gibt genau ein Fest — die Zeile in EventInfo trägt darum eine feste ID. */
export const EVENT_INFO_ID = "singleton";

export type EventInfo = {
  name: string;
  startsAt: Date | null;
  endsAt: Date | null;
  lineupNote: string | null;
};

/**
 * Gilt, solange im Admin nichts gespeichert wurde. Damit steht die Einladung
 * auch beim allerersten Aufruf, ohne dass jemand vorher etwas eintragen muss.
 */
export const EVENT_DEFAULTS: EventInfo = {
  name: "Das Festival",
  // 29.08.2026, 13:00 Ortszeit — im August gilt MESZ, also UTC+2.
  startsAt: new Date("2026-08-29T11:00:00.000Z"),
  // Bis 02:00 in der Nacht auf Sonntag, so weit reicht der Musikplan.
  endsAt: new Date("2026-08-30T00:00:00.000Z"),
  lineupNote: "Line-up folgt",
};

export async function getEvent(): Promise<EventInfo> {
  try {
    const row = await prisma.eventInfo.findUnique({ where: { id: EVENT_INFO_ID } });
    if (!row) return EVENT_DEFAULTS;
    return {
      name: row.name,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      lineupNote: row.lineupNote,
    };
  } catch (error) {
    // Die Einladung ist die eine Seite, die stehen muss. Lieber die Vorgaben
    // zeigen als eine Fehlerseite — aber nicht stillschweigend.
    logger.error("event.load_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return EVENT_DEFAULTS;
  }
}

/**
 * Versatz der Zeitzone zu UTC an genau diesem Zeitpunkt, in Millisekunden.
 * Über Intl statt über eine Bibliothek: Sommer- und Winterzeit stecken schon
 * in den Zeitzonendaten der Laufzeitumgebung.
 */
function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  // "24" statt "00" kommt bei hour12: false um Mitternacht vor.
  const hour = get("hour") % 24;
  const asIfUtc = Date.UTC(get("year"), get("month") - 1, get("day"), hour, get("minute"), get("second"));
  return asIfUtc - date.getTime();
}

/**
 * Nimmt die Wandzeit aus einem `datetime-local`-Feld ("2026-08-29T13:00") und
 * liest sie als Ortszeit am Veranstaltungsort — nicht als Zeit in der Zone des
 * Browsers und erst recht nicht als UTC. Sonst stünde im Kalender des Gastes
 * eine andere Uhrzeit als auf der Einladung.
 */
export function localTimeToDate(wallTime: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?$/.exec(wallTime.trim());
  if (!match) return null;
  const [, year, month, day, hour, minute] = match.map(Number);

  const naive = Date.UTC(year, month - 1, day, hour, minute);
  // Zweimal rechnen: Der Versatz hängt selbst vom Zeitpunkt ab, und die erste
  // Schätzung kann bei einer Zeitumstellung auf der falschen Seite liegen.
  const firstGuess = naive - timeZoneOffsetMs(new Date(naive), EVENT_TIME_ZONE);
  const corrected = naive - timeZoneOffsetMs(new Date(firstGuess), EVENT_TIME_ZONE);
  const result = new Date(corrected);
  return Number.isNaN(result.getTime()) ? null : result;
}

/** Umkehrung für das Formular: Zeitpunkt → "2026-08-29T13:00" in Ortszeit. */
export function dateToLocalTime(date: Date | null): string {
  if (!date) return "";
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: EVENT_TIME_ZONE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export function formatEventDate(startsAt: Date | null): string {
  if (!startsAt) return "Termin wird noch bekannt gegeben";

  const day = new Intl.DateTimeFormat("de-DE", {
    timeZone: EVENT_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(startsAt);

  const parts = new Intl.DateTimeFormat("de-DE", {
    timeZone: EVENT_TIME_ZONE,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(startsAt);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0") % 24;
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";

  // "ab 13 Uhr" liest sich besser als "ab 13:00 Uhr"; halbe Stunden brauchen
  // die Minuten aber.
  const time = minute === "00" ? `${hour}` : `${hour}:${minute}`;
  return `${day}, ab ${time} Uhr`;
}
