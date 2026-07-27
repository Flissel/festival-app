"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function ReplyForm({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/requests/${requestId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply }),
      });
      if (!response.ok) {
        const data: unknown = await response.json().catch(() => null);
        const message =
          data && typeof data === "object" && "error" in data && typeof data.error === "string"
            ? data.error
            : "Senden fehlgeschlagen";
        setError(message);
        return;
      }
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-white px-3 py-1 text-sm font-semibold text-black"
      >
        Antworten
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-2">
      <textarea
        value={reply}
        onChange={(event) => setReply(event.target.value)}
        rows={4}
        required
        placeholder="Deine Antwort — wird per E-Mail an die Absender:in geschickt"
        className="w-full rounded-md border border-white/20 bg-black/20 px-3 py-2 text-sm"
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-white px-3 py-1 text-sm font-semibold text-black disabled:opacity-50"
        >
          {submitting ? "Wird gesendet…" : "Antwort senden"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-white/60 underline"
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}
