"use client";

import { useState } from "react";
import { PaypalDonation } from "@/components/PaypalDonation";

const PRESETS = [10, 20, 50];

const USES = [
  "DJs und Live-Acts",
  "Essen",
  "Getränke und Bar",
  "Sound, Licht und Technik",
];

type Props = {
  paypalClientId: string;
  guestId: string;
  defaultAmount?: number | null;
};

export function DonationBox({ paypalClientId, guestId, defaultAmount = null }: Props) {
  const [amountInput, setAmountInput] = useState(
    defaultAmount !== null ? defaultAmount.toFixed(2) : ""
  );
  const [open, setOpen] = useState(defaultAmount !== null);

  const parsed = Number.parseFloat(amountInput.replace(",", "."));
  const amount = Number.isFinite(parsed) && parsed > 0 ? parsed : null;

  if (!open) {
    return (
      <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-5 text-center">
        <p className="text-sm text-white/70">
          Wir stemmen das Festival privat. Damit DJs, Live-Acts und Bar nicht alles
          umsonst machen müssen, freuen wir uns über einen freiwilligen Beitrag —
          nötig ist er nicht, du bist so oder so dabei.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 rounded-md border border-white/25 px-4 py-2 text-sm font-medium hover:bg-white/10"
        >
          Veranstalter unterstützen
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-5">
      <p className="text-sm font-medium">Veranstalter unterstützen</p>
      <p className="mt-1 text-sm text-white/60">
        Hinter dem Festival steckt einiges an Aufwand und Vorkasse. Davon bezahlen wir:
      </p>
      <ul className="mt-2 space-y-1 text-sm text-white/70">
        {USES.map((use) => (
          <li key={use} className="flex items-start gap-2">
            <span aria-hidden="true" className="text-white/40">
              •
            </span>
            {use}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-white/60">
        Betrag frei wählbar — jeder Euro hilft.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setAmountInput(preset.toFixed(2))}
            className={`rounded-md border px-3 py-1 text-sm ${
              amount === preset
                ? "border-white bg-white text-black"
                : "border-white/25 hover:bg-white/10"
            }`}
          >
            {preset} €
          </button>
        ))}
      </div>

      <label htmlFor="donation-amount" className="mt-4 block text-xs text-white/60">
        Eigener Betrag (€)
      </label>
      <input
        id="donation-amount"
        type="number"
        min={1}
        step="0.01"
        value={amountInput}
        onChange={(event) => setAmountInput(event.target.value)}
        className="mt-1 w-full rounded-md border border-white/20 bg-black/20 px-3 py-2"
      />

      {amount !== null ? (
        <PaypalDonation
          key={amount}
          clientId={paypalClientId}
          guestId={guestId}
          amount={amount}
        />
      ) : (
        <p className="mt-3 text-sm text-white/50">
          Wähle einen Betrag, um die PayPal-Zahlung zu starten.
        </p>
      )}
    </div>
  );
}
