"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type GuestOption = { id: string; name: string };

export type NoticeRow = {
  id: string;
  receivedAt: string;
  /** Vorbelegung für das Eingabefeld, schon in deutscher Schreibweise. */
  amountInput: string;
  senderName: string | null;
  senderEmail: string | null;
  subject: string;
  dkimVerified: boolean;
  /** Vorgeschlagener Gast, oder leer wenn keiner sicher passt. */
  suggestedGuestId: string;
  suggestionReason: "email" | "name" | null;
};

export function NoticeInbox({
  notices,
  guests,
  mailboxConfigured,
}: {
  notices: NoticeRow[];
  guests: GuestOption[];
  mailboxConfigured: boolean;
}) {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleScan() {
    setScanning(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/donations/scan", { method: "POST" });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
        scanned?: number;
        created?: number;
        truncated?: boolean;
      } | null;

      if (!response.ok) {
        setMessage({ ok: false, text: data?.error ?? "Abrufen fehlgeschlagen." });
        return;
      }

      const created = data?.created ?? 0;
      const parts = [
        created === 0
          ? "Nichts Neues gefunden."
          : `${created} neue${created === 1 ? "r" : ""} Eingang${created === 1 ? "" : "e"} gefunden.`,
        `${data?.scanned ?? 0} Mails angesehen.`,
      ];
      // Eine stillschweigend abgeschnittene Liste sähe aus wie „mehr war nicht
      // da" — deshalb steht das hier ausdrücklich.
      if (data?.truncated) {
        parts.push("Obergrenze erreicht — nochmal abrufen für den Rest.");
      }
      setMessage({ ok: true, text: parts.join(" ") });
      router.refresh();
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-white">Eingänge aus dem Postfach</p>
          <p className="mt-1 text-sm text-white/60">
            PayPal schickt dir für jeden Eingang eine E-Mail. Die App liest sie und
            legt sie hier zur Durchsicht ab — gebucht wird erst, wenn du
            übernimmst.
          </p>
        </div>
        <button
          type="button"
          onClick={handleScan}
          disabled={scanning || !mailboxConfigured}
          className="min-h-12 shrink-0 rounded-md border border-white/25 px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-50"
        >
          {scanning ? "Sieht nach …" : "Postfach abrufen"}
        </button>
      </div>

      {!mailboxConfigured && (
        <p className="mt-3 rounded-lg border border-amber-400/40 bg-amber-400/5 p-3 text-sm text-amber-200">
          Für den Abruf fehlen die Zugangsdaten zum Postfach. Es sind dieselben,
          mit denen die App die Bestätigungsmails verschickt.
        </p>
      )}

      {message && (
        <p className={`mt-3 text-sm ${message.ok ? "text-emerald-300" : "text-red-400"}`}>
          {message.text}
        </p>
      )}

      {notices.length === 0 ? (
        <p className="mt-4 text-sm text-white/40">
          Nichts offen. Was du übernimmst oder wegklickst, verschwindet von hier.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {notices.map((notice) => (
            <NoticeCard key={notice.id} notice={notice} guests={guests} />
          ))}
        </ul>
      )}
    </div>
  );
}

function NoticeCard({ notice, guests }: { notice: NoticeRow; guests: GuestOption[] }) {
  const router = useRouter();
  const [guestId, setGuestId] = useState(notice.suggestedGuestId);
  const [amount, setAmount] = useState(notice.amountInput);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function post(path: string, body?: unknown) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Hat nicht geklappt.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const suggestionNote =
    notice.suggestionReason === "email"
      ? "über die E-Mail-Adresse zugeordnet"
      : notice.suggestionReason === "name"
        ? "über den Namen zugeordnet — bitte prüfen"
        : null;

  return (
    <li className="rounded-lg border border-white/10 bg-black/20 p-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-medium text-white">
          {notice.senderName ?? "Absender unbekannt"}
        </span>
        {notice.senderEmail && (
          <span className="text-xs text-white/50">{notice.senderEmail}</span>
        )}
        <span className="text-xs text-white/50">{notice.receivedAt}</span>
      </div>

      <p className="mt-1 text-xs text-white/40">{notice.subject}</p>

      {!notice.dkimVerified && (
        // Absender lassen sich frei behaupten. Ohne gültige Signatur ist das
        // hier eine Mail, die sagt, sie käme von PayPal — mehr nicht.
        <p className="mt-2 text-xs text-amber-300">
          Ohne gültige PayPal-Signatur. Sieh im PayPal-Konto nach, ob das Geld
          wirklich angekommen ist.
        </p>
      )}

      {notice.amountInput === "" && (
        <p className="mt-2 text-xs text-amber-300">
          Aus der Mail war kein eindeutiger Betrag zu lesen — bitte eintippen.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div>
          <label
            htmlFor={`notice-guest-${notice.id}`}
            className="block text-xs text-white/60"
          >
            Gast
          </label>
          <select
            id={`notice-guest-${notice.id}`}
            value={guestId}
            onChange={(event) => setGuestId(event.target.value)}
            className="mt-1 min-h-12 rounded-md border border-white/20 bg-black/20 px-3 py-2 text-sm"
          >
            <option value="">Gast wählen …</option>
            {guests.map((guest) => (
              <option key={guest.id} value={guest.id}>
                {guest.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor={`notice-amount-${notice.id}`}
            className="block text-xs text-white/60"
          >
            Betrag (€)
          </label>
          <input
            id={`notice-amount-${notice.id}`}
            type="text"
            inputMode="decimal"
            placeholder="20"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="mt-1 min-h-12 w-28 rounded-md border border-white/20 bg-black/20 px-3 py-2 text-base"
          />
        </div>

        <button
          type="button"
          disabled={busy || !guestId || amount.trim() === ""}
          onClick={() =>
            post(`/api/admin/donations/notices/${notice.id}/import`, {
              guestId,
              // Komma zulassen: Auf einer deutschen Tastatur tippt man 12,50.
              amount: amount.replace(",", "."),
            })
          }
          className="min-h-12 rounded-md bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
        >
          Übernehmen
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => post(`/api/admin/donations/notices/${notice.id}/ignore`)}
          className="min-h-12 rounded-md border border-white/25 px-4 py-2 text-sm text-white/70 hover:bg-white/10 disabled:opacity-50"
        >
          Keine Spende
        </button>
      </div>

      {suggestionNote && guestId === notice.suggestedGuestId && (
        <p className="mt-2 text-xs text-white/40">{suggestionNote}</p>
      )}

      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </li>
  );
}
