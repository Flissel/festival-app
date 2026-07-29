"use client";

import { useState, type FormEvent } from "react";
import { DonationBox } from "@/components/DonationBox";

type RsvpResult = {
  guestId: string;
  waitlisted?: boolean;
};

type Props = {
  paypalClientId: string;
};

export function RsvpForm({ paypalClientId }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<RsvpResult | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: formData.get("name"),
      email: formData.get("email"),
      plusOnes: formData.get("plusOnes"),
      website: formData.get("website"),
    };

    try {
      const response = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data: unknown = await response.json().catch(() => null);
        const message =
          data && typeof data === "object" && "error" in data && typeof data.error === "string"
            ? data.error
            : "Anmeldung fehlgeschlagen. Bitte versuch es erneut.";
        setErrorMessage(message);
        return;
      }

      const data = (await response.json()) as RsvpResult;
      setResult(data);
    } catch {
      setErrorMessage("Anmeldung fehlgeschlagen. Bitte versuch es erneut.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result?.waitlisted) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-semibold">Du stehst auf der Warteliste!</h2>
        <p className="mt-2 text-white/80">
          Wir sind aktuell voll — aber sobald ein Platz frei wird, melden wir uns sofort
          per E-Mail bei dir. Du musst nichts weiter tun.
        </p>
      </div>
    );
  }

  if (result) {
    return (
      <div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold">Du bist dabei!</h2>
          <p className="mt-2 text-white/80">
            Wir haben dich eingetragen und dir eine Bestätigung geschickt. Mehr musst
            du nicht tun — wir sehen uns vor Ort.
          </p>
        </div>

        <DonationBox paypalClientId={paypalClientId} guestId={result.guestId} />
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
        <p className="mt-1 text-xs text-white/40">Nur für die Bestätigung deiner Anmeldung.</p>
      </div>

      <div>
        <label htmlFor="plusOnes" className="block text-sm font-medium">
          Anzahl Begleitpersonen
        </label>
        <input
          id="plusOnes"
          name="plusOnes"
          type="number"
          min={0}
          max={20}
          defaultValue={0}
          required
          className="mt-1 w-full rounded-md border border-white/20 bg-black/20 px-3 py-2"
        />
      </div>

      {errorMessage && <p className="text-sm text-red-400">{errorMessage}</p>}

      <p className="text-xs text-white/40">
        Wir speichern nur Name, E-Mail-Adresse und die Anzahl der Begleitpersonen —
        ausschließlich zur Organisation dieses Events und nicht an Dritte weitergegeben.
        Details in unserer{" "}
        <a href="/datenschutz" className="underline">
          Datenschutzerklärung
        </a>
        .
      </p>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-white px-4 py-3 font-semibold text-black disabled:opacity-50"
      >
        {submitting ? "Wird gesendet…" : "Anmelden"}
      </button>
    </form>
  );
}
