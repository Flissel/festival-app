"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function NewMemberForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      if (!response.ok) {
        setError("Anlegen fehlgeschlagen");
        return;
      }
      setName("");
      setPhone("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Name"
        required
        className="rounded-md border border-white/20 bg-black/20 px-2 py-1 text-sm"
      />
      <input
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
        placeholder="Telefon (z.B. +49 151 12345678)"
        required
        className="rounded-md border border-white/20 bg-black/20 px-2 py-1 text-sm"
      />
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-white px-3 py-1 text-sm font-semibold text-black disabled:opacity-50"
      >
        Anlegen
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </form>
  );
}
