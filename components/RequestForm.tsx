"use client";

import { useState, type FormEvent } from "react";

export function RequestForm() {
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: formData.get("name"),
      email: formData.get("email"),
      message: formData.get("message"),
      website: formData.get("website"),
    };

    try {
      const response = await fetch("/api/anfrage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data: unknown = await response.json().catch(() => null);
        const message =
          data && typeof data === "object" && "error" in data && typeof data.error === "string"
            ? data.error
            : "Senden fehlgeschlagen. Bitte versuch es erneut.";
        setErrorMessage(message);
        return;
      }

      setSent(true);
    } catch {
      setErrorMessage("Senden fehlgeschlagen. Bitte versuch es erneut.");
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-semibold">Danke für deine Nachricht!</h2>
        <p className="mt-2 text-white/80">Wir melden uns so schnell wie möglich bei dir.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Honeypot: für Menschen unsichtbar, Bots füllen es aus */}
      <div aria-hidden="true" className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-medium">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          className="mt-1 w-full rounded-md border border-white/20 bg-black/20 px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          E-Mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="mt-1 w-full rounded-md border border-white/20 bg-black/20 px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium">
          Deine Frage
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          required
          className="mt-1 w-full rounded-md border border-white/20 bg-black/20 px-3 py-2"
        />
      </div>

      {errorMessage && <p className="text-sm text-red-400">{errorMessage}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-white px-4 py-3 font-semibold text-black disabled:opacity-50"
      >
        {submitting ? "Wird gesendet…" : "Senden"}
      </button>
    </form>
  );
}
