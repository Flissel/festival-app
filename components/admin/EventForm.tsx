"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Props = {
  name: string;
  startsAt: string;
  endsAt: string;
  lineupNote: string;
};

const field =
  "mt-1 w-full rounded-md border border-white/20 bg-black/20 px-3 py-2 text-base";

export function EventForm(initial: Props) {
  const router = useRouter();
  const [values, setValues] = useState<Props>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function update(key: keyof Props, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/event", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setMessage({ ok: false, text: data?.error ?? "Speichern fehlgeschlagen." });
        return;
      }

      setMessage({ ok: true, text: "Gespeichert. Die Einladung zeigt es ab sofort." });
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-5">
      <div>
        <label htmlFor="event-name" className="block text-sm font-medium">
          Name
        </label>
        <input
          id="event-name"
          type="text"
          required
          value={values.name}
          onChange={(event) => update("name", event.target.value)}
          className={field}
        />
        <p className="mt-1 text-xs text-white/50">
          Steht als Überschrift auf der Einladung, im Seitentitel und im Vorschaubild.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="event-start" className="block text-sm font-medium">
            Beginn
          </label>
          <input
            id="event-start"
            type="datetime-local"
            value={values.startsAt}
            onChange={(event) => update("startsAt", event.target.value)}
            className={field}
          />
        </div>
        <div>
          <label htmlFor="event-end" className="block text-sm font-medium">
            Ende
          </label>
          <input
            id="event-end"
            type="datetime-local"
            value={values.endsAt}
            onChange={(event) => update("endsAt", event.target.value)}
            className={field}
          />
        </div>
      </div>
      <p className="text-xs text-white/50">
        Deutsche Ortszeit. Ohne Beginn steht auf der Einladung &bdquo;Termin wird noch
        bekannt gegeben&ldquo; und der Kalender-Button verschwindet. Das Ende zählt nur
        für den Kalendereintrag.
      </p>

      <div>
        <label htmlFor="event-lineup" className="block text-sm font-medium">
          Line-up
        </label>
        <input
          id="event-lineup"
          type="text"
          value={values.lineupNote}
          onChange={(event) => update("lineupNote", event.target.value)}
          placeholder="z. B. Ladia · Machmut · Karl"
          className={field}
        />
        <p className="mt-1 text-xs text-white/50">
          Erscheint als Kennzeichen unter dem Termin. Leer lassen, dann fällt es weg.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="min-h-12 rounded-md bg-white px-5 py-2 font-semibold text-black disabled:opacity-50"
        >
          {submitting ? "Speichert …" : "Speichern"}
        </button>
        {message && (
          <span className={`text-sm ${message.ok ? "text-emerald-300" : "text-red-400"}`}>
            {message.text}
          </span>
        )}
      </div>
    </form>
  );
}
