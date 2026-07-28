import { RsvpForm } from "@/components/RsvpForm";
import { LocationMap } from "@/components/LocationMap";
import { SiteFooter } from "@/components/SiteFooter";
import { Kaleidoscope } from "@/components/Kaleidoscope";
import { EVENT, formatEventDate } from "@/lib/event";

export default function HomePage() {
  const paypalClientId = process.env.PAYPAL_CLIENT_ID ?? "";

  return (
    <main className="flex min-h-screen flex-1 flex-col bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950 text-white">
      <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <header className="relative mb-10 text-center">
          {/* Kein negatives z-index: der Header öffnet keinen eigenen Stacking-Context,
              die Grafik läge sonst hinter dem Seitenhintergrund. Stattdessen zuerst im
              DOM zeichnen und den Text mit relative darüberlegen. */}
          <div className="pointer-events-none absolute left-1/2 top-[-13rem] aspect-square w-[105%] -translate-x-1/2 sm:w-[92%]">
            <Kaleidoscope />
          </div>

          <div className="relative">
            <p className="text-sm uppercase tracking-widest text-white/60">
              Du bist eingeladen
            </p>
            <h1 className="mt-2 text-4xl font-bold [text-shadow:0_2px_12px_rgba(0,0,0,0.8)]">
              {EVENT.name}
            </h1>
            <p className="mt-3 text-lg font-medium text-white/90 [text-shadow:0_1px_8px_rgba(0,0,0,0.8)]">
              {formatEventDate()}
            </p>
            <p className="mt-4 text-white/70">
              Bar &amp; Cocktails, Sound, Live-Acts. Trag dich kurz ein, damit wir
              wissen, mit wie vielen wir planen dürfen — mehr brauchen wir nicht.
            </p>
          </div>
        </header>

        <LocationMap />

        <RsvpForm paypalClientId={paypalClientId} />

        <p className="mt-10 text-center text-xs text-white/40">
          Fragen? Nutze den Link in unserer Telegram-Orga-Gruppe oder schreib uns über{" "}
          <a href="/anfrage" className="underline">
            unser Kontaktformular
          </a>
          .
        </p>

        <SiteFooter />
      </div>
    </main>
  );
}
