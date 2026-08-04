"use client";

import { useState, type FormEvent } from "react";

type Team = { id: string; name: string; memberCount: number };

type Failure = { name: string; error: string };

type Props = {
  teams: Team[];
  groupConfigured: boolean;
};

export function BroadcastForm({ teams, groupConfigured }: Props) {
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState<"group" | "members">(
    groupConfigured ? "group" : "members"
  );
  const [teamId, setTeamId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [failures, setFailures] = useState<Failure[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setResult(null);
    setFailures([]);
    setError(null);

    try {
      const response = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, target, teamId: target === "members" ? teamId : "" }),
      });

      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMessage =
          data && typeof data === "object" && "error" in data && typeof data.error === "string"
            ? data.error
            : "Senden fehlgeschlagen";
        setError(errorMessage);
        if (data && typeof data === "object" && "failures" in data && Array.isArray(data.failures)) {
          setFailures(data.failures as Failure[]);
        }
        return;
      }

      const payload = data as { sent: number; failed: number; failures: Failure[] };
      setResult(
        target === "group"
          ? "In die Orga-Gruppe geschickt."
          : payload.failed === 0
            ? `An alle ${payload.sent} Members zugestellt.`
            : `An ${payload.sent} von ${payload.sent + payload.failed} Members zugestellt.`
      );
      setFailures(payload.failures ?? []);
      if (payload.failed === 0) setMessage("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      <fieldset>
        <legend className="block text-sm font-medium">Empfänger</legend>
        <div className="mt-2 space-y-2">
          <label className="flex items-start gap-2 text-sm">
            <input
              type="radio"
              name="target"
              value="group"
              checked={target === "group"}
              disabled={!groupConfigured}
              onChange={() => setTarget("group")}
              className="mt-1"
            />
            <span>
              Orga-Gruppe (eine Nachricht in den Telegram-Chat)
              {!groupConfigured && (
                <span className="block text-xs text-amber-300">
                  Nicht verfügbar — <code>TELEGRAM_GROUP_CHAT_ID</code> ist nicht gesetzt.
                </span>
              )}
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="radio"
              name="target"
              value="members"
              checked={target === "members"}
              onChange={() => setTarget("members")}
              className="mt-1"
            />
            <span>Einzeln an Members</span>
          </label>
        </div>
      </fieldset>

      {target === "members" && (
        <div>
          <label htmlFor="teamId" className="block text-sm font-medium">
            Team
          </label>
          <select
            id="teamId"
            value={teamId}
            onChange={(event) => setTeamId(event.target.value)}
            className="mt-1 w-full rounded-md border border-white/20 bg-black/20 px-3 py-2"
          >
            <option value="">Alle Members</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name} ({team.memberCount})
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label htmlFor="message" className="block text-sm font-medium">
          Nachricht
        </label>
        <textarea
          id="message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={4}
          required
          className="mt-1 w-full rounded-md border border-white/20 bg-black/20 px-3 py-2"
        />
      </div>

      {result && <p className="text-sm text-emerald-300">{result}</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {/* Wer nicht erreicht wurde, steht namentlich da — sonst merkt es niemand. */}
      {failures.length > 0 && (
        <div className="rounded-md border border-red-400/40 bg-red-400/5 p-3">
          <p className="text-sm font-medium text-red-300">
            Nicht zugestellt an {failures.length}:
          </p>
          <ul className="mt-1 space-y-1 text-xs text-red-200/80">
            {failures.map((failure) => (
              <li key={failure.name}>
                {failure.name} — {failure.error}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-white px-4 py-3 font-semibold text-black disabled:opacity-50"
      >
        {submitting ? "Wird gesendet…" : "Senden"}
      </button>
    </form>
  );
}
