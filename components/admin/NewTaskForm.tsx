"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Member = { id: string; name: string };
type Team = { id: string; name: string };

export function NewTaskForm({
  categoryId,
  members,
  teams,
}: {
  categoryId: string;
  members: Member[];
  teams: Team[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const assignment = String(formData.get("assignment") ?? "");

    try {
      const response = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId,
          title: formData.get("title"),
          description: formData.get("description"),
          memberId: assignment.startsWith("m:") ? assignment.slice(2) : "",
          teamId: assignment.startsWith("t:") ? assignment.slice(2) : "",
          estimatedCost: formData.get("estimatedCost"),
          dueDate: formData.get("dueDate"),
        }),
      });
      if (response.ok) {
        event.currentTarget.reset();
        setOpen(false);
        router.refresh();
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-white/60 underline hover:text-white"
      >
        + Aufgabe
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 rounded-lg border border-white/10 bg-white/5 p-3">
      <input
        name="title"
        placeholder="Titel"
        required
        className="w-full rounded-md border border-white/20 bg-black/20 px-2 py-1 text-xs"
      />
      <textarea
        name="description"
        rows={2}
        placeholder="Beschreibung (optional) — Maße, Fundort, Ansprechpartner"
        className="w-full rounded-md border border-white/20 bg-black/20 px-2 py-1 text-xs"
      />
      <select
        name="assignment"
        defaultValue=""
        className="w-full rounded-md border border-white/20 bg-black/20 px-2 py-1 text-xs"
      >
        <option value="">Nicht zugewiesen</option>
        <optgroup label="Members">
          {members.map((member) => (
            <option key={member.id} value={`m:${member.id}`}>
              {member.name}
            </option>
          ))}
        </optgroup>
        <optgroup label="Teams">
          {teams.map((team) => (
            <option key={team.id} value={`t:${team.id}`}>
              {team.name}
            </option>
          ))}
        </optgroup>
      </select>
      <input
        name="estimatedCost"
        type="number"
        min={0}
        step="0.01"
        placeholder="Geplante Kosten € (optional)"
        className="w-full rounded-md border border-white/20 bg-black/20 px-2 py-1 text-xs"
      />
      <label className="block text-xs text-white/60">
        Fällig am (optional)
        <input
          name="dueDate"
          type="date"
          className="mt-1 w-full rounded-md border border-white/20 bg-black/20 px-2 py-1 text-xs"
        />
      </label>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-black disabled:opacity-50"
        >
          Anlegen
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-white/60 underline"
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}
