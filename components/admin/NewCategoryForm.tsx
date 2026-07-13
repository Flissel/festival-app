"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function NewCategoryForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (response.ok) {
        setName("");
        router.refresh();
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Neue Kategorie"
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
    </form>
  );
}
