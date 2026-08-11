"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export type SlotRow = {
  id: string;
  title: string;
  stage: string;
  /** Schon als Wandzeit für `datetime-local` — die Umrechnung passiert am Server. */
  startsAtLocal: string;
  endsAtLocal: string;
  range: string;
  note: string;
  isPublic: boolean;
};

export type StageRows = { stage: string; slots: SlotRow[] };

export function TimetableEditor({
  groups,
  stageSuggestions,
  defaultStart,
}: {
  groups: StageRows[];
  stageSuggestions: string[];
  defaultStart: string;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/10 bg-white/5 p-5">
        <p className="mb-3 text-sm font-medium text-white">Programmpunkt hinzufügen</p>
        <SlotForm
          stageSuggestions={stageSuggestions}
          defaultStart={defaultStart}
          submitLabel="Hinzufügen"
        />
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-white/40">
          Noch nichts im Zeitplan. Was du hier einträgst und öffentlich stellst,
          steht auf der Einladung.
        </p>
      ) : (
        groups.map((group) => (
          <div key={group.stage}>
            <h2 className="mb-2 text-lg font-semibold">{group.stage}</h2>
            <ul className="space-y-2">
              {group.slots.map((slot) => (
                <SlotItem key={slot.id} slot={slot} stageSuggestions={stageSuggestions} />
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}

function SlotItem({
  slot,
  stageSuggestions,
}: {
  slot: SlotRow;
  stageSuggestions: string[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (!confirm(`„${slot.title}" aus dem Zeitplan entfernen?`)) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/timetable/${slot.id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        alert(data?.error ?? "Entfernen fehlgeschlagen.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <li className="rounded-lg border border-white/20 bg-black/20 p-4">
        <SlotForm
          slot={slot}
          stageSuggestions={stageSuggestions}
          submitLabel="Speichern"
          onDone={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border border-white/10 bg-black/20 p-4">
      <span className="font-mono text-sm text-white/70">{slot.range}</span>
      <span className="font-medium">{slot.title}</span>
      {!slot.isPublic && (
        <span className="rounded-full border border-white/20 px-2 py-0.5 text-xs text-white/50">
          nur intern
        </span>
      )}
      {slot.note && <span className="text-xs text-white/50">{slot.note}</span>}

      <span className="ml-auto flex gap-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-md border border-white/20 px-2 py-1 text-xs hover:bg-white/10"
        >
          Bearbeiten
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={busy}
          className="rounded-md border border-red-400/40 px-2 py-1 text-xs text-red-400 disabled:opacity-50"
        >
          Entfernen
        </button>
      </span>
    </li>
  );
}

function SlotForm({
  slot,
  stageSuggestions,
  submitLabel,
  defaultStart,
  onDone,
  onCancel,
}: {
  slot?: SlotRow;
  stageSuggestions: string[];
  submitLabel: string;
  defaultStart?: string;
  onDone?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(slot?.title ?? "");
  const [stage, setStage] = useState(slot?.stage ?? "");
  const [startsAt, setStartsAt] = useState(slot?.startsAtLocal ?? defaultStart ?? "");
  const [endsAt, setEndsAt] = useState(slot?.endsAtLocal ?? "");
  const [note, setNote] = useState(slot?.note ?? "");
  const [isPublic, setIsPublic] = useState(slot?.isPublic ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(
        slot ? `/api/admin/timetable/${slot.id}` : "/api/admin/timetable",
        {
          method: slot ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, stage, startsAt, endsAt, note, isPublic }),
        }
      );

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Speichern fehlgeschlagen.");
        return;
      }

      if (!slot) {
        // Nach dem Anlegen bleibt die Bühne stehen: Meistens trägt man eine
        // Bühne am Stück durch, Act für Act.
        setTitle("");
        setEndsAt("");
        setNote("");
      }
      onDone?.();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const listId = `stages-${slot?.id ?? "neu"}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1">
          <label htmlFor={`title-${listId}`} className="block text-xs text-white/60">
            Act oder Programmpunkt
          </label>
          <input
            id={`title-${listId}`}
            type="text"
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="z. B. Marco b2b Lena"
            className="mt-1 min-h-12 w-full rounded-md border border-white/20 bg-black/20 px-3 py-2 text-base"
          />
        </div>

        <div>
          <label htmlFor={`stage-${listId}`} className="block text-xs text-white/60">
            Bühne
          </label>
          <input
            id={`stage-${listId}`}
            type="text"
            required
            list={listId}
            value={stage}
            onChange={(event) => setStage(event.target.value)}
            placeholder="DJ"
            className="mt-1 min-h-12 w-40 rounded-md border border-white/20 bg-black/20 px-3 py-2 text-base"
          />
          {/* Vorschläge statt Auswahlliste: neue Areas sollen ohne Deploy gehen,
              aber „DJ-Area" neben „DJ Area" soll nicht aus Versehen entstehen. */}
          <datalist id={listId}>
            {stageSuggestions.map((suggestion) => (
              <option key={suggestion} value={suggestion} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor={`start-${listId}`} className="block text-xs text-white/60">
            Beginn
          </label>
          <input
            id={`start-${listId}`}
            type="datetime-local"
            required
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
            className="mt-1 min-h-12 rounded-md border border-white/20 bg-black/20 px-3 py-2 text-base"
          />
        </div>

        <div>
          <label htmlFor={`end-${listId}`} className="block text-xs text-white/60">
            Ende <span className="text-white/40">(optional)</span>
          </label>
          <input
            id={`end-${listId}`}
            type="datetime-local"
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
            className="mt-1 min-h-12 rounded-md border border-white/20 bg-black/20 px-3 py-2 text-base"
          />
        </div>

        <div className="min-w-40 flex-1">
          <label htmlFor={`note-${listId}`} className="block text-xs text-white/60">
            Notiz <span className="text-white/40">(optional)</span>
          </label>
          <input
            id={`note-${listId}`}
            type="text"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="z. B. braucht CDJs"
            className="mt-1 min-h-12 w-full rounded-md border border-white/20 bg-black/20 px-3 py-2 text-base"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-white/70">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(event) => setIsPublic(event.target.checked)}
          className="size-4"
        />
        Auf der Einladung zeigen
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="min-h-12 rounded-md bg-white px-5 py-2 font-semibold text-black disabled:opacity-50"
        >
          {busy ? "Speichert …" : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="min-h-12 rounded-md border border-white/25 px-4 py-2 text-sm text-white/70 hover:bg-white/10"
          >
            Abbrechen
          </button>
        )}
        {error && <span className="text-sm text-red-400">{error}</span>}
      </div>
    </form>
  );
}
