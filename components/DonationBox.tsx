"use client";

import { useState } from "react";
import { formatIban, paypalMeLink } from "@/lib/donation";

const PRESETS = [10, 20, 50];

// Was mit dem Geld passiert. Bewusst nur zwei Punkte: Raum, Getränke und Essen
// stellt die Orga selbst — das steht als eigener Satz darüber, damit klar ist,
// dass hier nicht für alles gesammelt wird.
const USES = ["Die Artists — DJs und Live-Acts", "Die Technik — Sound, Licht, Bühne"];

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
          Raum, Getränke und Essen stellen wir. Unterstützung brauchen wir für die
          Artists und die Technik — freiwillig, du bist so oder so dabei.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 min-h-12 rounded-md border border-white/25 px-4 py-2 text-sm font-medium hover:bg-white/10"
        >
          Artists unterstützen
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-5">
      <p className="text-sm font-medium">Artists unterstützen</p>
      <p className="mt-1 text-sm text-white/60">
        Raum, Getränke und Essen stellen wir. Dein Beitrag geht an:
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
        Betrag frei wählbar — je mehr zusammenkommt, desto mehr können wir auf die
        Beine stellen.
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
        Eigener Betrag (€)
      </label>
      {/* Bewusst kein type="number": Das Feld verwirft ein Komma, und hier
          tippt jeder „12,50". Geparst wird beides. */}
      <input
        id="donation-amount"
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder="z. B. 15"
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
              ? `${amount.toFixed(2).replace(".", ",")} € über PayPal senden`
              : "Mit PayPal unterstützen"}
          </a>
          {/* Der wichtigste Satz im ganzen Kasten: bei „Waren und
              Dienstleistungen" zieht PayPal Gebühren ab, bei „Freunde und
              Familie" nicht. */}
          <p className="mt-2 text-xs text-white/50">
            Bitte im PayPal-Fenster{" "}
            <strong className="text-white/70">&bdquo;An einen Freund&ldquo;</strong>{" "}
            wählen — sonst zieht PayPal Gebühren ab und es kommt weniger an.
          </p>
        </div>
      )}

      {iban && (
        <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-4 text-sm">
          <p className="text-white/70">Lieber überweisen?</p>
          <p className="mt-1 font-mono text-xs break-all text-white/80">{formatIban(iban)}</p>
          {ibanHolder && <p className="mt-1 text-xs text-white/50">{ibanHolder}</p>}
        </div>
      )}
    </div>
  );
}
