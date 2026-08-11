import { groupByStage, formatSlotRange, type Slot } from "@/lib/timetable";

/**
 * Der Zeitplan auf der Einladung.
 *
 * Nach Bühne gruppiert und nicht als eine lange Liste: Wer die Einladung liest,
 * sucht selten „was läuft um 22 Uhr", sondern „was läuft am Steg". Innerhalb
 * einer Bühne steht der Abend dann der Reihe nach.
 */
export function Timetable({
  slots,
  eventStart,
}: {
  slots: Slot[];
  /** Bezugstag: Was nicht an diesem Tag beginnt, bekommt den Wochentag davor. */
  eventStart: Date | null;
}) {
  if (slots.length === 0) return null;

  const groups = groupByStage(slots);

  return (
    <section className="mb-10">
      <h2 className="mb-3 text-center text-sm uppercase tracking-widest text-white/60">
        Line-up
      </h2>

      <div className="grid gap-3 sm:grid-cols-2">
        {groups.map((group) => (
          <div
            key={group.stage}
            className="rounded-xl border border-white/10 bg-neutral-950/60 p-4 backdrop-blur-sm"
          >
            <p className="text-sm font-semibold text-white/90">{group.stage}</p>
            <ul className="mt-2 space-y-1.5">
              {group.slots.map((slot) => (
                <li key={slot.id} className="flex gap-3 text-sm">
                  {/* Feste Breite für die Zeit: So stehen die Namen untereinander
                      auf einer Kante, auch wenn eine Zeile „ab 23:00" hat.
                      Bemessen an der längsten Form, „23:00–01:00 (So)" — enger
                      bricht die Zeitangabe um und die Zeile wird doppelt hoch. */}
                  <span className="w-32 shrink-0 font-mono text-xs text-white/50">
                    {formatSlotRange(slot, eventStart)}
                  </span>
                  <span className="text-white/85">
                    {slot.title}
                    {slot.note && (
                      <span className="block text-xs text-white/45">{slot.note}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
