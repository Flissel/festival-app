"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Member = { id: string; name: string };

export function NewTaskForm({ categoryId, members }: { categoryId: string; members: Member[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId,
          title: formData.get("title"),
          memberId: formData.get("memberId"),
          estimatedCost: formData.get("estimatedCost"),
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
      <select
        name="memberId"
        defaultValue=""
        className="w-full rounded-md border border-white/20 bg-black/20 px-2 py-1 text-xs"
      >
        <option value="">Nicht zugewiesen</option>
        {members.map((member) => (
          <option key={member.id} value={member.id}>
            {member.name}
          </option>
        ))}
      </select>
      <input
        name="estimatedCost"
        type="number"
        min={0}
        step="0.01"
        placeholder="Geplante Kosten € (optional)"
        className="w-full rounded-md border border-white/20 bg-black/20 px-2 py-1 text-xs"
      />
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
