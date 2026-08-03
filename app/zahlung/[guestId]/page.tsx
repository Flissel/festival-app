import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DonationBox } from "@/components/DonationBox";
import { SiteFooter } from "@/components/SiteFooter";
import { donationConfig } from "@/lib/donation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Veranstalter unterstützen",
  robots: { index: false },
};

export default async function SupportPage({
  params,
}: {
  params: Promise<{ guestId: string }>;
}) {
  const { guestId } = await params;
  const guest = await prisma.guest.findUnique({
    where: { id: guestId },
    select: { name: true, waitlisted: true },
  });
  if (!guest) notFound();

  const { paypalMeHandle, iban, ibanHolder } = donationConfig();

  return (
    <main className="flex min-h-screen flex-1 flex-col bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950 text-white">
      <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-bold">Veranstalter unterstützen</h1>
          <p className="mt-4 text-white/70">
            Hi {guest.name} — deine Anmeldung steht, hier ändert sich daran nichts.
            Wenn du magst, kannst du uns freiwillig etwas dalassen.
          </p>
        </header>

        {guest.waitlisted ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold">Du stehst noch auf der Warteliste</h2>
            <p className="mt-2 text-white/80">
              Sobald dein Platz bestätigt ist, melden wir uns bei dir.
            </p>
          </div>
        ) : (
          <DonationBox
            paypalMeHandle={paypalMeHandle}
            iban={iban}
            ibanHolder={ibanHolder}
          />
        )}

        <SiteFooter />
      </div>
    </main>
  );
}
