"use client";

import { useState, type FormEvent } from "react";

type Team = { id: string; name: string; memberCount: number };

export function BroadcastForm({ teams }: { teams: Team[] }) {
  const [message, setMessage] = useState("");
  const [teamId, setTeamId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, teamId }),
      });

      if (!response.ok) {
        const data: unknown = await response.json().catch(() => null);
        const errorMessage =
          data && typeof data === "object" && "error" in data && typeof data.error === "string"
            ? data.error
            : "Senden fehlgeschlagen";
        setError(errorMessage);
        return;
      }

      const data = (await response.json()) as { count: number };
      setResult(`Nachricht an ${data.count} Member(s) verschickt.`);
      setMessage("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      <div>
        <label htmlFor="teamId" className="block text-sm font-medium">
          Empfänger
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

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-white px-4 py-2 font-semibold text-black disabled:opacity-50"
      >
        {submitting ? "Wird gesendet…" : "Senden"}
      </button>
    </form>
  );
}
