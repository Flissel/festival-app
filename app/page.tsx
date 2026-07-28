import { RsvpForm } from "@/components/RsvpForm";
import { LocationMap } from "@/components/LocationMap";
import { SiteFooter } from "@/components/SiteFooter";
import { KaleidoscopeField } from "@/components/KaleidoscopeField";
import { EVENT, formatEventDate } from "@/lib/event";

export default function HomePage() {
  const paypalClientId = process.env.PAYPAL_CLIENT_ID ?? "";

  return (
    <main className="relative flex min-h-screen flex-1 flex-col overflow-hidden bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950 text-white">
      <KaleidoscopeField />

      {/* Weicher Schleier über dem Farbfeld: nimmt oben Sättigung raus, damit
          Überschrift und Fließtext genug Kontrast behalten. */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-neutral-950/55 via-neutral-950/35 to-neutral-950/65" />

      {/* z-10, weil der Header selbst keinen Stacking-Context öffnet — ohne das
          läge der Inhalt unter den Scheiben. */}
      <div className="relative z-10 mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <header className="mb-10 text-center">
          <p className="text-sm uppercase tracking-widest text-white/60">
            Du bist eingeladen
          </p>
          <h1 className="mt-2 text-4xl font-bold [text-shadow:0_2px_12px_rgba(0,0,0,0.8)]">
            {EVENT.name}
          </h1>
          <p className="mt-3 text-lg font-medium text-white/90 [text-shadow:0_1px_8px_rgba(0,0,0,0.8)]">
            {formatEventDate()}
          </p>
          <p className="mt-4 text-white/80 [text-shadow:0_1px_8px_rgba(0,0,0,0.9)]">
            Bar &amp; Cocktails, Sound, Live-Acts. Trag dich kurz ein, damit wir
            wissen, mit wie vielen wir planen dürfen — mehr brauchen wir nicht.
          </p>
        </header>

        <LocationMap />

        {/* Leicht abgedunkelte Karte: hält das Formular über der Grafik lesbar. */}
        <div className="rounded-2xl border border-white/10 bg-neutral-950/70 p-6 backdrop-blur-sm">
          <RsvpForm paypalClientId={paypalClientId} />
        </div>

        <p className="mt-10 text-center text-xs text-white/50 [text-shadow:0_1px_6px_rgba(0,0,0,0.9)]">
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
