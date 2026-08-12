"use client";

import { useState } from "react";
import { formatIban, paypalMeLink } from "@/lib/donation";

const PRESETS = [10, 20, 50];

// Was mit dem Geld passiert. Bewusst nur zwei Punkte: Raum, Getränke und Essen
// stellt die Orga selbst — das steht als eigener Satz darüber, damit klar ist,
// dass hier nicht für alles gesammelt wird.
const USES = ["The artists — DJs and live acts", "The equipment — sound, light, stage"];

type Props = {
  paypalMeHandle: string | null;
  iban: string | null;
  ibanHolder: string | null;
};

export function DonationBox({ paypalMeHandle, iban, ibanHolder }: Props) {
  const [amountInput, setAmountInput] = useState("");
  const [open, setOpen] = useState(false);

  const parsed = Number.parseFloat(amountInput.replace(",", "."));
  const amount = Number.isFinite(parsed) && parsed > 0 ? parsed : null;

  // Ohne Zahlweg wäre der Kasten eine Einladung ins Leere.
  if (!paypalMeHandle && !iban) return null;

  if (!open) {
    return (
      <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-5 text-center">
        <p className="text-sm text-white/70">
          We provide the space, the drinks and the food. What we need support for
          are the artists and the equipment — a contribution is voluntary, you are
          in either way.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 min-h-12 rounded-md border border-white/25 px-4 py-2 text-sm font-medium hover:bg-white/10"
        >
          Support the artists
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-5">
      <p className="text-sm font-medium">Support the artists</p>
      <p className="mt-1 text-sm text-white/60">
        We provide the space, the drinks and the food. Your contribution pays for:
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
        Any amount helps — the more comes together, the more we can put on for you.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setAmountInput(preset.toFixed(2))}
            className={`min-h-12 rounded-md border px-4 py-2 text-sm ${
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
        Your amount (€)
      </label>
      {/* Bewusst kein type="number": Das Feld verwirft ein Komma, und hier
          tippt jeder „12,50". Geparst wird beides. */}
      <input
        id="donation-amount"
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder="e.g. 15"
        value={amountInput}
        onChange={(event) => setAmountInput(event.target.value)}
        className="mt-1 w-full rounded-md border border-white/20 bg-black/20 px-3 py-2 text-base"
      />

      {paypalMeHandle && (
        <div className="mt-4">
          <a
            href={paypalMeLink(paypalMeHandle, amount)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-12 w-full items-center justify-center rounded-md bg-white px-4 py-3 text-sm font-semibold text-black hover:bg-white/90"
          >
            {amount !== null
              ? `Send ${amount.toFixed(2).replace(".", ",")} € via PayPal`
              : "Support via PayPal"}
          </a>
          {/* Der wichtigste Satz im ganzen Kasten: bei „Waren und
              Dienstleistungen" zieht PayPal Gebühren ab, bei „Freunde und
              Familie" nicht. Der deutsche Wortlaut steht mit dabei, weil das
              PayPal-Fenster in der Sprache des Zahlenden erscheint — und die
              meisten Gäste sehen dort „An einen Freund". */}
          <p className="mt-2 text-xs text-white/50">
            Please choose{" "}
            <strong className="text-white/70">&bdquo;Friends and Family&ldquo;</strong> in
            PayPal (German: &bdquo;An einen Freund&ldquo;) — otherwise fees are
            deducted and less arrives.
          </p>
        </div>
      )}

      {iban && (
        <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-4 text-sm">
          <p className="text-white/70">Prefer a bank transfer?</p>
          <p className="mt-1 font-mono text-xs break-all text-white/80">{formatIban(iban)}</p>
          {ibanHolder && <p className="mt-1 text-xs text-white/50">{ibanHolder}</p>}
        </div>
      )}
    </div>
  );
}
