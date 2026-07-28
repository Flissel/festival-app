"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { MarkPaidForm } from "@/components/admin/MarkPaidForm";

type Guest = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  plusOnes: number;
  paymentStatus: "pending" | "cash_pending" | "paid";
  waitlisted: boolean;
};

// Der Beitrag ist freiwillig — "offen" heißt hier schlicht: noch nichts erfasst.
const statusLabels: Record<Guest["paymentStatus"], string> = {
  pending: "—",
  cash_pending: "Bar zugesagt",
  paid: "Hat unterstützt",
};

const inputClass =
  "w-full rounded-md border border-white/20 bg-black/20 px-2 py-1 text-sm";

export function GuestRow({ guest }: { guest: Guest }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/admin/guests/${guest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          phone: formData.get("phone"),
          plusOnes: formData.get("plusOnes"),
        }),
      });
      if (!response.ok) {
        setError("Speichern fehlgeschlagen");
        return;
      }
      setEditing(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePromote() {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/guests/${guest.id}/promote`, { method: "POST" });
      if (!response.ok) {
        setError("Nachrücken fehlgeschlagen");
        return;
      }
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Anmeldung von „${guest.name}" wirklich löschen?`)) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/guests/${guest.id}`, { method: "DELETE" });
      if (!response.ok) {
        setError("Löschen fehlgeschlagen");
        return;
      }
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (editing) {
    return (
      <tr className="border-t border-white/10">
        <td colSpan={6} className="px-4 py-3">
          <form onSubmit={handleSave} className="flex flex-wrap items-end gap-3">
            <label className="flex-1 min-w-40 text-xs text-white/60">
              Name
              <input name="name" defaultValue={guest.name} required className={inputClass} />
            </label>
            <label className="flex-1 min-w-48 text-xs text-white/60">
              E-Mail
              <input name="email" type="email" defaultValue={guest.email} required className={inputClass} />
            </label>
            <label className="min-w-32 text-xs text-white/60">
              Telefon
              <input name="phone" defaultValue={guest.phone ?? ""} className={inputClass} />
            </label>
            <label className="w-24 text-xs text-white/60">
              Begleitung
              <input name="plusOnes" type="number" min={0} max={20} defaultValue={guest.plusOnes} required className={inputClass} />
            </label>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-white px-3 py-1 text-sm font-semibold text-black disabled:opacity-50"
              >
                Speichern
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-md border border-white/20 px-3 py-1 text-sm"
              >
                Abbrechen
              </button>
            </div>
            {error && <span className="text-xs text-red-400">{error}</span>}
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-white/10">
      <td className="px-4 py-2">{guest.name}</td>
      <td className="px-4 py-2">{guest.email}</td>
      <td className="px-4 py-2">{guest.phone ?? "—"}</td>
      <td className="px-4 py-2">{guest.plusOnes}</td>
      <td className="px-4 py-2">
        {guest.waitlisted ? (
          <span className="rounded-md bg-amber-400/10 px-2 py-1 text-xs text-amber-300">
            Warteliste
          </span>
        ) : (
          statusLabels[guest.paymentStatus]
        )}
      </td>
      <td className="px-4 py-2">
        <div className="flex items-center gap-2">
          {guest.waitlisted && (
            <button
              type="button"
              onClick={handlePromote}
              disabled={submitting}
              className="rounded-md bg-emerald-500/20 px-3 py-1 text-sm text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50"
            >
              Nachrücken
            </button>
          )}
          {!guest.waitlisted && guest.paymentStatus !== "paid" && (
            <MarkPaidForm guestId={guest.id} />
          )}
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md border border-white/20 px-3 py-1 text-sm"
          >
            Bearbeiten
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={submitting}
            className="rounded-md border border-red-400/40 px-3 py-1 text-sm text-red-400 disabled:opacity-50"
          >
            Löschen
          </button>
          {error && <span className="text-xs text-red-400">{error}</span>}
        </div>
      </td>
    </tr>
  );
}
