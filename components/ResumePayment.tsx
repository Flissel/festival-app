"use client";

import { useState } from "react";
import { PaypalDonation } from "@/components/PaypalDonation";

type Props = {
  paypalClientId: string;
  guestId: string;
  defaultAmount: number | null;
};

export function ResumePayment({ paypalClientId, guestId, defaultAmount }: Props) {
  const [amountInput, setAmountInput] = useState(
    defaultAmount !== null ? defaultAmount.toFixed(2) : ""
  );

  const amount = Number.parseFloat(amountInput.replace(",", "."));
  const validAmount = Number.isFinite(amount) && amount > 0 ? amount : null;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-6">
      <label htmlFor="amount" className="block text-sm font-medium">
        Dein Beitrag (frei wählbar, in €)
      </label>
      <input
        id="amount"
        type="number"
        min={1}
        step="0.01"
        value={amountInput}
        onChange={(event) => setAmountInput(event.target.value)}
        className="mt-1 w-full rounded-md border border-white/20 bg-black/20 px-3 py-2"
      />
      {validAmount !== null ? (
        <PaypalDonation
          key={validAmount}
          clientId={paypalClientId}
          guestId={guestId}
          amount={validAmount}
        />
      ) : (
        <p className="mt-3 text-sm text-white/50">
          Gib einen Betrag ein, um die PayPal-Zahlung zu starten.
        </p>
      )}
    </div>
  );
}
