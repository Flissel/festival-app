import { EventForm } from "@/components/admin/EventForm";
import { dateToLocalTime, formatEventDate, getEvent } from "@/lib/event";

export const dynamic = "force-dynamic";

export default async function AdminEventPage() {
  const event = await getEvent();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Event-Daten</h1>
        <p className="mt-1 text-sm text-white/60">
          Name, Termin und Line-up. Änderungen sind sofort auf der Einladung sichtbar
          — auch im Kalender-Download und in neuen Bestätigungsmails.
        </p>
      </div>

      <EventForm
        name={event.name}
        startsAt={dateToLocalTime(event.startsAt)}
        endsAt={dateToLocalTime(event.endsAt)}
        lineupNote={event.lineupNote ?? ""}
      />

      <div className="max-w-lg rounded-xl border border-white/10 bg-white/5 p-5 text-sm text-white/70">
        <p className="font-medium text-white">So steht es gerade auf der Einladung</p>
        <p className="mt-2">{event.name}</p>
        <p className="mt-1">{formatEventDate(event.startsAt)}</p>
        {event.lineupNote && <p className="mt-1 text-white/50">{event.lineupNote}</p>}
      </div>
    </div>
  );
}
