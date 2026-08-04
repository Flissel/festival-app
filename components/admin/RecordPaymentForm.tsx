"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type GuestOption = { id: string; name: string };

export function RecordPaymentForm({ guests }: { guests: GuestOption[] }) {
  const router = useRouter();
  const [guestId, setGuestId] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  if (guests.length === 0) {
    return (
      <p className="text-sm text-white/50">
        Noch keine Gäste angemeldet — sobald sich jemand einträgt, kannst du hier
        Beiträge verbuchen.
      </p>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/guests/${guestId}/mark-paid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Komma zulassen: Auf einer deutschen Tastatur tippt man 12,50.
        body: JSON.stringify({ amount: amount.replace(",", ".") }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setMessage({ ok: false, text: data?.error ?? "Eintragen fehlgeschlagen." });
        return;
      }

      const name = guests.find((guest) => guest.id === guestId)?.name ?? "Gast";
      setMessage({ ok: true, text: `Eingetragen: ${amount} € von ${name}.` });
      setAmount("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor="payment-guest" className="block text-xs text-white/60">
          Von wem
        </label>
        <select
          id="payment-guest"
          required
          value={guestId}
          onChange={(event) => setGuestId(event.target.value)}
          className="mt-1 min-h-12 rounded-md border border-white/20 bg-black/20 px-3 py-2 text-sm"
        >
          <option value="">Gast wählen …</option>
          {guests.map((guest) => (
            <option key={guest.id} value={guest.id}>
              {guest.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="payment-amount" className="block text-xs text-white/60">
          Betrag (€)
        </label>
        <input
          id="payment-amount"
          type="text"
          inputMode="decimal"
          required
          placeholder="20"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className="mt-1 min-h-12 w-28 rounded-md border border-white/20 bg-black/20 px-3 py-2 text-base"
        />
      </div>

      <button
        type="submit"
        disabled={submitting || !guestId}
        className="min-h-12 rounded-md bg-white px-5 py-2 font-semibold text-black disabled:opacity-50"
      >
        {submitting ? "Trägt ein …" : "Eintragen"}
      </button>

      {message && (
        <span className={`text-sm ${message.ok ? "text-emerald-300" : "text-red-400"}`}>
          {message.text}
        </span>
      )}
    </form>
  );
}
