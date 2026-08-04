"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeletePaymentButton({
  paymentId,
  guestName,
  amount,
}: {
  paymentId: string;
  guestName: string;
  amount: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleDelete() {
    // Geld verschwindet hier aus dem Kassenstand — einmal nachfragen ist
    // angemessen, auch wenn es sonst im Admin selten passiert.
    if (!confirm(`Beitrag über ${amount} von ${guestName} entfernen?`)) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/payments/${paymentId}`, { method: "DELETE" });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        alert(data?.error ?? "Entfernen fehlgeschlagen.");
        return;
      }
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={submitting}
      className="rounded-md border border-red-400/40 px-2 py-1 text-xs text-red-400 disabled:opacity-50"
    >
      Entfernen
    </button>
  );
}
