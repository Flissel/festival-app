import { prisma } from "@/lib/prisma";
import { dateToLocalTime, getEvent } from "@/lib/event";
import {
  STAGE_SUGGESTIONS,
  findOverlaps,
  formatSlotRange,
  groupByStage,
} from "@/lib/timetable";
import {
  TimetableEditor,
  type StageRows,
} from "@/components/admin/TimetableEditor";

export const dynamic = "force-dynamic";

export default async function AdminTimetablePage() {
  const [slots, event] = await Promise.all([
    prisma.timetableSlot.findMany({ orderBy: { startsAt: "asc" } }),
    getEvent(),
  ]);

  const overlaps = findOverlaps(slots);

  const groups: StageRows[] = groupByStage(slots).map((group) => ({
    stage: group.stage,
    slots: group.slots.map((slot) => ({
      id: slot.id,
      title: slot.title,
      stage: slot.stage,
      startsAtLocal: dateToLocalTime(slot.startsAt),
      endsAtLocal: dateToLocalTime(slot.endsAt),
      range: formatSlotRange(slot, event.startsAt),
      note: slot.note ?? "",
      isPublic: slot.isPublic,
    })),
  }));

  // Schon benutzte Bühnen zuerst: Wer die dritte Zeile für die DJ-Area
  // einträgt, soll den Namen nicht erneut tippen und dabei anders schreiben.
  const stageSuggestions = [
    ...new Set([...groups.map((group) => group.stage), ...STAGE_SUGGESTIONS]),
  ];

  const publicCount = slots.filter((slot) => slot.isPublic).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Zeitplan</h1>
        <p className="mt-1 text-sm text-white/60">
          Wer spielt wann und wo. Was auf &bdquo;Auf der Einladung zeigen&ldquo;
          steht, sehen die Gäste — der Rest bleibt intern, für Aufbau und
          Anlieferung.
        </p>
      </div>

      {overlaps.length > 0 && (
        <div className="rounded-xl border border-amber-400/40 bg-amber-400/5 p-5 text-sm text-amber-200">
          <p className="font-medium">Zwei Punkte gleichzeitig auf einer Bühne</p>
          <ul className="mt-2 space-y-1">
            {overlaps.map((overlap, index) => (
              <li key={index}>
                {overlap.stage}: &bdquo;{overlap.first}&ldquo; und &bdquo;
                {overlap.second}&ldquo; überschneiden sich.
              </li>
            ))}
          </ul>
          <p className="mt-2 text-amber-200/70">
            Kann Absicht sein, wenn zwei ineinander übergehen. Sonst verschiebt
            einer von beiden.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-sm text-white/70">
        <p>
          {slots.length === 0
            ? "Solange hier nichts steht, zeigt die Einladung nur den Hinweis aus den Event-Daten — aktuell "
            : `${slots.length} Punkte im Plan, davon ${publicCount} auf der Einladung. Hinweis in den Event-Daten: `}
          <span className="text-white">
            &bdquo;{event.lineupNote ?? "—"}&ldquo;
          </span>
          .
        </p>
      </div>

      <TimetableEditor
        groups={groups}
        stageSuggestions={stageSuggestions}
        // Vorbelegt mit dem Beginn des Fests: Der erste Punkt liegt fast immer
        // dort, und ein leeres Datumsfeld ist auf dem Handy lästig.
        defaultStart={dateToLocalTime(event.startsAt)}
      />
    </div>
  );
}
