import { prisma } from "@/lib/prisma";
import { donationConfig, formatIban, paypalMeLink } from "@/lib/donation";
import { isMailboxConfigured } from "@/lib/mailbox";
import { matchGuest } from "@/lib/paymentNotices";
import { RecordPaymentForm } from "@/components/admin/RecordPaymentForm";
import { DeletePaymentButton } from "@/components/admin/DeletePaymentButton";
import { NoticeInbox, type NoticeRow } from "@/components/admin/NoticeInbox";

export const dynamic = "force-dynamic";

function formatEuro(amount: number): string {
  return amount.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

export default async function AdminDonationsPage() {
  const config = donationConfig();
  const guests = await prisma.guest.findMany({
    where: { waitlisted: false },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });
  const payments = await prisma.payment.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { guest: { select: { name: true } } },
  });
  const openNotices = await prisma.paymentNotice.findMany({
    where: { status: "neu" },
    orderBy: { receivedAt: "desc" },
    take: 50,
  });

  const noticeRows: NoticeRow[] = openNotices.map((notice) => {
    const match = matchGuest(notice, guests);
    return {
      id: notice.id,
      receivedAt: notice.receivedAt.toLocaleDateString("de-DE"),
      // Leer statt „0", wenn der Betrag nicht zu lesen war — ein vorbelegtes
      // Feld mit einer erfundenen Zahl wird zu schnell durchgewinkt.
      amountInput:
        notice.amountCents === null
          ? ""
          : (notice.amountCents / 100).toFixed(2).replace(".", ","),
      senderName: notice.senderName,
      senderEmail: notice.senderEmail,
      subject: notice.subject,
      dkimVerified: notice.dkimVerified,
      suggestedGuestId: match?.guestId ?? "",
      suggestionReason: match?.reason ?? null,
    };
  });

  const completed = payments.filter((payment) => payment.status === "completed");
  const total = completed.reduce((sum, payment) => sum + Number(payment.amount), 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Spenden</h1>
        <p className="mt-1 text-sm text-white/60">
          Wohin die Einladungsseite verweist und was bisher eingetragen wurde.
        </p>
      </div>

      {config.problems.length > 0 && (
        <div className="rounded-xl border border-amber-400/40 bg-amber-400/5 p-5 text-sm text-amber-200">
          <p className="font-medium">Noch nicht vollständig eingerichtet</p>
          <ul className="mt-2 space-y-1">
            {config.problems.map((problem) => (
              <li key={problem.field}>
                <code>{problem.field}</code>: {problem.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-sm">
        <p className="font-medium text-white">Zahlwege auf der Einladungsseite</p>

        {config.paypalMeHandle ? (
          <p className="mt-3 text-white/70">
            PayPal:{" "}
            <a
              href={paypalMeLink(config.paypalMeHandle)}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              {paypalMeLink(config.paypalMeHandle)}
            </a>{" "}
            — dieser Link führt zu dem Konto, auf dem das Geld landet. Einmal
            anklicken und nachsehen, ob dort dein Name steht.
          </p>
        ) : (
          <p className="mt-3 text-white/50">PayPal: kein Link hinterlegt.</p>
        )}

        {config.iban ? (
          <p className="mt-2 text-white/70">
            Überweisung: <span className="font-mono">{formatIban(config.iban)}</span>
            {config.ibanHolder && <> ({config.ibanHolder})</>}
          </p>
        ) : (
          <p className="mt-2 text-white/50">Überweisung: keine IBAN hinterlegt.</p>
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-sm text-white/70">
        <p className="font-medium text-white">Wie es abläuft</p>
        <p className="mt-2">
          Der Gast klickt den Link und schickt das Geld direkt an dein PayPal-Konto.
          Die App ist daran nicht beteiligt — sie erfährt <strong>nicht</strong>, ob
          und wie viel jemand gezahlt hat. Es gibt keinen Rückkanal von PayPal.
        </p>
        <p className="mt-2">
          Was die App bekommt, ist die Benachrichtigungsmail, die PayPal dir für
          jeden Eingang schickt. Die liest sie aus deinem Postfach und legt dir
          die Eingänge unten zur Durchsicht hin. Bestätigen musst du jeden
          selbst — die Mail ist ein Hinweis, kein Beleg. Was dort nicht auftaucht
          (Bargeld, Überweisung), trägst du von Hand ein. Mehrere Beiträge
          derselben Person sind kein Problem, jeder wird eine eigene Zeile.
        </p>
        <p className="mt-2">
          Der Hinweis auf der Einladungsseite bittet darum, &bdquo;An einen Freund&ldquo;
          zu wählen. Wer stattdessen &bdquo;Waren und Dienstleistungen&ldquo; nimmt,
          bei dem zieht PayPal Gebühren ab — dann kommt weniger an, als der Gast
          abgeschickt hat.
        </p>
      </div>

      <NoticeInbox
        notices={noticeRows}
        guests={guests}
        mailboxConfigured={isMailboxConfigured()}
      />

      <div>
        <h2 className="mb-3 text-lg font-semibold">
          Eingetragene Beiträge{" "}
          <span className="text-sm font-normal text-white/50">
            ({completed.length}, {formatEuro(total)})
          </span>
        </h2>
        <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-5">
          <p className="mb-3 text-sm font-medium text-white">Beitrag eintragen</p>
          <RecordPaymentForm guests={guests} />
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-white/5 text-left text-white/60">
              <tr>
                <th className="px-4 py-2">Datum</th>
                <th className="px-4 py-2">Gast</th>
                <th className="px-4 py-2">Betrag</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2"></th>
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
                    {payment.status === "completed" ? "erhalten" : "offen"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <DeletePaymentButton
                      paymentId={payment.id}
                      guestName={payment.guest.name}
                      amount={formatEuro(Number(payment.amount))}
                    />
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-white/40">
                    Noch nichts eingetragen.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Altbestand aus der Zeit mit PayPal-API: angelegte, nie abgeschlossene
            Bestellungen. Ohne Erklärung liest sich „offen" wie eine offene
            Forderung. */}
        {payments.some((payment) => payment.status !== "completed") && (
          <p className="mt-3 text-sm text-white/60">
            <span className="text-white/80">&bdquo;offen&ldquo;</span> sind Restposten
            aus der früheren PayPal-Anbindung: begonnene, nie abgeschlossene
            Zahlungen. Es wurde nie Geld eingezogen; sie zählen nicht zur Summe.
          </p>
        )}
      </div>
    </div>
  );
}
