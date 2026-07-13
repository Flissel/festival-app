"use client";

import { useState, type FormEvent } from "react";

type PaymentMethod = "online" | "cash";

type RsvpResult = {
  guestId: string;
  paymentMethod: PaymentMethod;
  amount: number | null;
};

export function RsvpForm() {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("online");
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
      phone: formData.get("phone"),
      plusOnes: formData.get("plusOnes"),
      allergies: formData.get("allergies"),
      paymentMethod: formData.get("paymentMethod"),
      amount: paymentMethod === "online" ? formData.get("amount") : undefined,
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

  if (result) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-semibold">Danke für deine Anmeldung!</h2>
        {result.paymentMethod === "cash" ? (
          <p className="mt-2 text-white/80">
            Wir haben dich eingetragen. Du zahlst deinen Beitrag bar vor Ort.
          </p>
        ) : (
          <div className="mt-4">
            <p className="text-white/80">
              Fast geschafft — schließe deine Anmeldung mit der Zahlung von{" "}
              {result.amount?.toFixed(2)}&nbsp;€ ab.
            </p>
            <div
              className="mt-4 rounded-lg border border-dashed border-white/20 p-4 text-sm text-white/50"
              data-guest-id={result.guestId}
              data-amount={result.amount ?? undefined}
            >
              PayPal-Zahlung folgt hier.
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
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
        <label htmlFor="phone" className="block text-sm font-medium">
          Telefon (optional)
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          className="mt-1 w-full rounded-md border border-white/20 bg-black/20 px-3 py-2"
        />
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

      <div>
        <label htmlFor="allergies" className="block text-sm font-medium">
          Allergien / Unverträglichkeiten (optional)
        </label>
        <textarea
          id="allergies"
          name="allergies"
          rows={2}
          className="mt-1 w-full rounded-md border border-white/20 bg-black/20 px-3 py-2"
        />
      </div>

      <fieldset>
        <legend className="block text-sm font-medium">Wie möchtest du beitragen?</legend>
        <div className="mt-2 space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="paymentMethod"
              value="online"
              checked={paymentMethod === "online"}
              onChange={() => setPaymentMethod("online")}
            />
            Online per PayPal
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="paymentMethod"
              value="cash"
              checked={paymentMethod === "cash"}
              onChange={() => setPaymentMethod("cash")}
            />
            Bar vor Ort
          </label>
        </div>
      </fieldset>

      {paymentMethod === "online" && (
        <div>
          <label htmlFor="amount" className="block text-sm font-medium">
            Dein Beitrag (frei wählbar, in €)
          </label>
          <input
            id="amount"
            name="amount"
            type="number"
            min={1}
            step="0.01"
            required
            className="mt-1 w-full rounded-md border border-white/20 bg-black/20 px-3 py-2"
          />
        </div>
      )}

      {errorMessage && <p className="text-sm text-red-400">{errorMessage}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-white px-4 py-2 font-semibold text-black disabled:opacity-50"
      >
        {submitting ? "Wird gesendet…" : "Anmelden"}
      </button>
    </form>
  );
}
