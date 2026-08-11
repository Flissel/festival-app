import { EVENT_TIME_ZONE, localTimeToDate } from "@/lib/event";

// Der Zeitplan des Fests.
//
// Die eine Sache, die hier alles bestimmt: Das Fest geht über Mitternacht.
// Ein Act um 01:00 gehört zur Nacht des Fests und nicht zum nächsten Tag —
// „Sonntag, 01:00" wäre formal richtig und für jeden, der davorsteht, falsch.
// Deshalb wird nirgends nach Kalendertag gruppiert, sondern durchgehend nach
// Uhrzeit sortiert; der Tag taucht nur auf, wenn er sich ändert.

export type Slot = {
  id: string;
  title: string;
  stage: string;
  startsAt: Date;
  endsAt: Date | null;
  note: string | null;
  isPublic: boolean;
};

/**
 * Vorschläge für das Bühnenfeld. Die Namen stammen aus den Areas des
 * Orga-Plans — sie sind nur ein Angebot, getippt werden darf alles.
 */
export const STAGE_SUGGESTIONS = [
  "DJ",
  "Bar",
  "Chill-Zelt",
  "Buffet/Grill",
  "Steg",
];

/** "20:00" in der Zeitzone des Veranstaltungsorts. */
export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: EVENT_TIME_ZONE,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** "Sa" / "So" — für den Punkt, an dem der Zeitplan über Mitternacht geht. */
export function formatWeekday(date: Date): string {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: EVENT_TIME_ZONE,
    weekday: "short",
  }).format(date);
}

/** Kalendertag in Ortszeit als "2026-08-29" — zum Vergleichen, nicht zum Anzeigen. */
export function localDayKey(date: Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: EVENT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * "20:00–21:30" oder "ab 20:00", wenn kein Ende eingetragen ist.
 *
 * Zwei Stellen, an denen die blanke Uhrzeit in die Irre führt, und beide
 * kommen bei einem Fest vor, das über Mitternacht geht:
 *
 * Läuft der Punkt selbst über Mitternacht, steht der Wochentag hinten dabei —
 * sonst liest sich "23:00–01:00" wie eine Zeitreise.
 *
 * Beginnt er an einem anderen Tag als das Fest, steht der Wochentag vorne.
 * Ohne das steht der Abbau am Sonntagmorgen als "ab 10:00" direkt unter dem
 * Aufbau am Samstag um "10:00–12:00", und die beiden sehen gleichzeitig aus.
 * `referenceDay` ist dafür der Bezugspunkt, üblicherweise der Beginn des Fests.
 */
export function formatSlotRange(
  slot: Pick<Slot, "startsAt" | "endsAt">,
  referenceDay?: Date | null
): string {
  const start = formatTime(slot.startsAt);
  const prefix =
    referenceDay && localDayKey(slot.startsAt) !== localDayKey(referenceDay)
      ? `${formatWeekday(slot.startsAt)} `
      : "";

  if (!slot.endsAt) return `${prefix}ab ${start}`;

  const end = formatTime(slot.endsAt);
  const crossesMidnight = localDayKey(slot.startsAt) !== localDayKey(slot.endsAt);
  return crossesMidnight
    ? `${prefix}${start}–${end} (${formatWeekday(slot.endsAt)})`
    : `${prefix}${start}–${end}`;
}

/** Chronologisch; bei gleichem Beginn entscheidet der Bühnenname. */
export function sortSlots<T extends Pick<Slot, "startsAt" | "stage">>(slots: T[]): T[] {
  return [...slots].sort(
    (a, b) =>
      a.startsAt.getTime() - b.startsAt.getTime() || a.stage.localeCompare(b.stage, "de")
  );
}

export type StageGroup<T> = { stage: string; slots: T[] };

/**
 * Nach Bühne gruppieren. Die Reihenfolge der Bühnen ergibt sich daraus, wann
 * auf ihnen zuerst etwas läuft — die Bühne, die um 13 Uhr aufmacht, steht vor
 * der, die erst um 22 Uhr anfängt. Alphabetisch wäre willkürlich.
 */
export function groupByStage<T extends Pick<Slot, "startsAt" | "stage">>(
  slots: T[]
): StageGroup<T>[] {
  const groups = new Map<string, T[]>();
  for (const slot of sortSlots(slots)) {
    const existing = groups.get(slot.stage);
    if (existing) existing.push(slot);
    else groups.set(slot.stage, [slot]);
  }
  // Map bewahrt die Einfügereihenfolge, und eingefügt wurde chronologisch.
  return [...groups].map(([stage, stageSlots]) => ({ stage, slots: stageSlots }));
}

export type Overlap = { stage: string; first: string; second: string };

/**
 * Programmpunkte, die sich auf derselben Bühne überschneiden.
 *
 * Nur eine Warnung, keine Sperre: Zwei Acts, die sich zehn Minuten überlappen,
 * können ein Übergang sein. Was die Orga nicht sehen soll, ist die
 * Überschneidung, die niemandem aufgefallen ist.
 *
 * Punkte ohne Ende zählen nicht mit — bei „ab 23 Uhr" ist unbekannt, wie lange
 * es geht, und eine Warnung auf Verdacht wäre nur Rauschen.
 */
export function findOverlaps<T extends Slot>(slots: T[]): Overlap[] {
  const overlaps: Overlap[] = [];

  for (const group of groupByStage(slots)) {
    const withEnd = group.slots.filter((slot) => slot.endsAt !== null);
    for (let i = 0; i < withEnd.length; i += 1) {
      for (let j = i + 1; j < withEnd.length; j += 1) {
        const a = withEnd[i]!;
        const b = withEnd[j]!;
        // Berührung an den Rändern ist keine Überschneidung: Der eine hört auf,
        // wenn der andere anfängt — genau so plant man einen Zeitplan.
        if (a.startsAt < b.endsAt! && b.startsAt < a.endsAt!) {
          overlaps.push({ stage: group.stage, first: a.title, second: b.title });
        }
      }
    }
  }

  return overlaps;
}

/**
 * Zeitangabe aus dem Chat lesen.
 *
 * In der Gruppe schreibt niemand einen Zeitstempel. Dort steht „22:00" oder
 * „22 Uhr", und gemeint ist der Abend des Fests. Deshalb nimmt diese Funktion
 * das Datum des Fests als Bezugspunkt und ergänzt es, wo es fehlt.
 *
 * Uhrzeiten vor 06:00 rutschen dabei auf den Folgetag: Wer „02:00" sagt, meint
 * die Nacht nach dem Fest und nicht den Morgen davor.
 */
export function parseSlotTime(input: string, eventStart: Date | null): Date | null {
  const value = input.trim();
  if (!value) return null;

  // Vollständige Angabe: "2026-08-29T22:00" oder "2026-08-29 22:00"
  const full = /^(\d{4}-\d{2}-\d{2})[T ](\d{1,2})(?::(\d{2}))?$/.exec(value);
  if (full) {
    const [, day, hour, minute] = full;
    return localTimeToDate(`${day}T${pad(hour!)}:${minute ?? "00"}`);
  }

  // Tag und Monat ohne Jahr: "29.08. 22:00" — das Jahr kommt vom Fest.
  const german = /^(\d{1,2})\.(\d{1,2})\.?(?:\s+|,\s*)(\d{1,2})(?::(\d{2}))?(?:\s*Uhr)?$/i.exec(
    value
  );
  if (german && eventStart) {
    const [, day, month, hour, minute] = german;
    const year = new Intl.DateTimeFormat("sv-SE", {
      timeZone: EVENT_TIME_ZONE,
      year: "numeric",
    }).format(eventStart);
    return localTimeToDate(`${year}-${pad(month!)}-${pad(day!)}T${pad(hour!)}:${minute ?? "00"}`);
  }

  // Nur die Uhrzeit: "22:00", "22 Uhr", "22"
  const timeOnly = /^(\d{1,2})(?::(\d{2}))?(?:\s*Uhr)?$/i.exec(value);
  if (timeOnly && eventStart) {
    const [, hour, minute] = timeOnly;
    const hours = Number(hour);
    if (hours > 23) return null;

    const dayKey = localDayKey(hours < NIGHT_BOUNDARY_HOUR ? nextDay(eventStart) : eventStart);
    return localTimeToDate(`${dayKey}T${pad(hour!)}:${minute ?? "00"}`);
  }

  return null;
}

/**
 * Vor dieser Stunde gilt eine Uhrzeit als „in der Nacht danach". Sechs Uhr,
 * weil davor niemand ein Fest beginnt und danach niemand mehr auflegt.
 */
const NIGHT_BOUNDARY_HOUR = 6;

function nextDay(date: Date): Date {
  return new Date(date.getTime() + 24 * 60 * 60 * 1000);
}

function pad(value: string | number): string {
  return String(value).padStart(2, "0");
}
