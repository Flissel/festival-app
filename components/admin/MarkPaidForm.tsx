"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function MarkPaidForm({ guestId }: { guestId: string }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/guests/${guestId}/mark-paid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      if (!response.ok) {
        setError("Fehlgeschlagen");
        return;
      }
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="number"
        min={1}
        step="0.01"
        required
        placeholder="Bar erhalten €"
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
        className="w-24 rounded-md border border-white/20 bg-black/20 px-2 py-1 text-sm"
      />
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-white px-3 py-1 text-sm font-semibold text-black disabled:opacity-50"
      >
        Eintragen
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </form>
  );
}
