import { prisma } from "@/lib/prisma";
import { checkPaypalHealth } from "@/lib/paypal";

export const dynamic = "force-dynamic";

function formatEuro(amount: number): string {
  return amount.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

function Row({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <tr className="border-t border-white/10">
      <td className="px-4 py-3">{label}</td>
      <td className="px-4 py-3">
        <span
          className={`rounded-md px-2 py-1 text-xs ${
            ok ? "bg-emerald-400/10 text-emerald-300" : "bg-red-400/10 text-red-300"
          }`}
        >
          {ok ? "in Ordnung" : "Problem"}
        </span>
      </td>
      <td className="px-4 py-3 text-white/70">{detail}</td>
    </tr>
  );
}

export default async function AdminPaypalPage() {
  const [health, payments] = await Promise.all([
    checkPaypalHealth(),
    prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 25,
      include: { guest: { select: { name: true } } },
    }),
  ]);

  const completed = payments.filter((payment) => payment.status === "completed");
  const total = completed.reduce((sum, payment) => sum + Number(payment.amount), 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">PayPal</h1>
        <p className="mt-1 text-sm text-white/60">
          Der Stand der Zahlungsanbindung, live geprüft bei jedem Aufruf dieser Seite.
        </p>
      </div>

      {!health.live && (
        <div className="rounded-xl border border-amber-400/40 bg-amber-400/5 p-5 text-sm text-amber-200">
          <p className="font-medium">Diese Umgebung läuft gegen die PayPal-Sandbox.</p>
          <p className="mt-2">
            Zahlungen sehen im Ablauf vollständig echt aus, es wird aber kein Geld
            bewegt und auf deinem Konto kommt nichts an. Für echte Zahlungen muss{" "}
            <code>PAYPAL_API_BASE</code> auf <code>https://api-m.paypal.com</code> stehen
            und <code>PAYPAL_CLIENT_ID</code> / <code>PAYPAL_SECRET</code> müssen aus der
            Live-App stammen — nicht aus der Sandbox-App.
          </p>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-white/5 text-left text-white/60">
            <tr>
              <th className="px-4 py-2">Prüfung</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Details</th>
            </tr>
          </thead>
          <tbody>
            <Row
              label="Umgebung"
              ok={health.live}
              detail={health.live ? `Live (${health.apiBase})` : `Sandbox (${health.apiBase})`}
            />
            <Row
              label="Zugangsdaten hinterlegt"
              ok={health.credentialsConfigured}
              detail={
                health.credentialsConfigured
                  ? "PAYPAL_CLIENT_ID und PAYPAL_SECRET sind gesetzt"
                  : "PAYPAL_CLIENT_ID oder PAYPAL_SECRET fehlt"
              }
            />
            <Row
              label="Anmeldung bei PayPal"
              ok={health.authOk}
              detail={
                health.authOk
                  ? "Token erhalten — die Zugangsdaten passen zu dieser Umgebung"
                  : (health.authError ??
                    "Anmeldung fehlgeschlagen. Häufigste Ursache: Sandbox-Zugangsdaten gegen die Live-API oder umgekehrt.")
              }
            />
            <Row
              label="Webhook"
              ok={health.webhookConfigured}
              detail={
                health.webhookConfigured
                  ? "PAYPAL_WEBHOOK_ID ist gesetzt — Zahlungen werden auch dann verbucht, wenn der Gast den Browser zu früh schließt"
                  : "PAYPAL_WEBHOOK_ID fehlt. Ohne Webhook wird eine Zahlung nur verbucht, wenn der Gast die Seite bis zum Ende offen lässt."
              }
            />
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-sm text-white/70">
        <p className="font-medium text-white">Wohin das Geld geht</p>
        <p className="mt-2">
          Die App setzt in der Bestellung keinen abweichenden Empfänger. PayPal bucht
          deshalb auf das Konto, dem die hinterlegte <code>PAYPAL_CLIENT_ID</code>{" "}
          gehört. Wenn die Anmeldung oben klappt und die Umgebung &bdquo;Live&ldquo; zeigt, landet
          das Geld auf genau dem Konto, aus dessen Entwicklerkonsole diese Zugangsdaten
          stammen.
        </p>
        <p className="mt-2">
          Vollständig bestätigen lässt sich das nur mit einer echten Zahlung: Trag dich
          auf der Einladungsseite ein, spende 1 €, und schau danach hier und in deinem
          PayPal-Konto nach. Die Buchungs-ID in der Tabelle unten muss sich in deinen
          PayPal-Umsätzen wiederfinden.
        </p>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">
          Letzte Zahlungen{" "}
          <span className="text-sm font-normal text-white/50">
            ({completed.length} abgeschlossen, {formatEuro(total)})
          </span>
        </h2>
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-white/5 text-left text-white/60">
              <tr>
                <th className="px-4 py-2">Datum</th>
                <th className="px-4 py-2">Gast</th>
                <th className="px-4 py-2">Betrag</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Buchungs-ID</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-t border-white/10">
                  <td className="whitespace-nowrap px-4 py-2 text-white/60">
                    {payment.createdAt.toISOString().slice(0, 10)}
                  </td>
                  <td className="px-4 py-2">{payment.guest.name}</td>
                  <td className="px-4 py-2">{formatEuro(Number(payment.amount))}</td>
                  <td className="px-4 py-2">
                    {payment.status === "completed" ? "abgeschlossen" : "offen"}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-white/50">
                    {payment.paypalCaptureId ?? "—"}
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-white/40">
                    Noch keine Zahlungen.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
