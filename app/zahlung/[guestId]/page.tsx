import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ResumePayment } from "@/components/ResumePayment";
import { SiteFooter } from "@/components/SiteFooter";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Beitrag zahlen",
  robots: { index: false },
};

export default async function PaymentPage({
  params,
}: {
  params: Promise<{ guestId: string }>;
}) {
  const { guestId } = await params;
  const guest = await prisma.guest.findUnique({
    where: { id: guestId },
    include: { payments: { orderBy: { createdAt: "desc" } } },
  });
  if (!guest) notFound();

  const paypalClientId = process.env.PAYPAL_CLIENT_ID ?? "";
  const lastPendingAmount =
    guest.payments.find((payment) => payment.status === "pending")?.amount ?? null;

  return (
    <main className="flex min-h-screen flex-1 flex-col bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950 text-white">
      <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-bold">Beitrag zahlen</h1>
          <p className="mt-4 text-white/70">
            Hi {guest.name} — hier kannst du deinen Festival-Beitrag per PayPal abschließen.
          </p>
        </header>

        {guest.waitlisted ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold">Du stehst noch auf der Warteliste</h2>
            <p className="mt-2 text-white/80">
              Sobald dein Platz bestätigt ist, melden wir uns — dann kannst du hier deinen
              Beitrag zahlen.
            </p>
          </div>
        ) : guest.paymentStatus === "paid" ? (
          <div className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 p-6">
            <h2 className="text-xl font-semibold text-emerald-300">Alles erledigt!</h2>
            <p className="mt-2 text-white/80">
              Dein Beitrag ist bereits eingegangen — vielen Dank! Wir sehen uns auf dem
              Festival.
            </p>
          </div>
        ) : (
          <ResumePayment
            paypalClientId={paypalClientId}
            guestId={guest.id}
            defaultAmount={lastPendingAmount !== null ? Number(lastPendingAmount) : null}
          />
        )}

        <SiteFooter />
      </div>
    </main>
  );
}
