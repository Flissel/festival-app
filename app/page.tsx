import { RsvpForm } from "@/components/RsvpForm";
import { LocationMap } from "@/components/LocationMap";
import { SiteFooter } from "@/components/SiteFooter";
import { KaleidoscopeField } from "@/components/KaleidoscopeField";
import { formatEventDate, getEvent } from "@/lib/event";
import { donationConfig } from "@/lib/donation";

// Statisch würde der Spendenlink beim Build eingebacken. Wer ihn später in den
// Umgebungsvariablen setzt, sähe ihn dann unter /admin/spenden schon, die Gäste
// aber erst nach dem nächsten Deploy — und niemand merkt die Lücke. Lieber pro
// Aufruf rendern; die Seite hat ohnehin kaum Last.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { paypalMeHandle, iban, ibanHolder } = donationConfig();
  const event = await getEvent();

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
            {event.name}
          </h1>
          <p className="mt-3 text-lg font-medium text-white/90 [text-shadow:0_1px_8px_rgba(0,0,0,0.8)]">
            {formatEventDate(event.startsAt)}
          </p>
          {event.lineupNote && (
            <p className="mt-2 inline-block rounded-full border border-white/25 bg-black/30 px-3 py-1 text-xs uppercase tracking-wider text-white/70">
              {event.lineupNote}
            </p>
          )}
          {event.startsAt && (
            <p className="mt-4">
              <a
                href="/kalender.ics"
                className="inline-flex min-h-12 items-center rounded-md border border-white/25 bg-black/30 px-4 py-2 text-sm hover:bg-white/10"
              >
                Zum Kalender hinzufügen
              </a>
            </p>
          )}
          <p className="mt-4 text-white/80 [text-shadow:0_1px_8px_rgba(0,0,0,0.9)]">
            Bar &amp; Cocktails, Sound, Live-Acts. Trag dich kurz ein, damit wir
            wissen, mit wie vielen wir planen dürfen — mehr brauchen wir nicht.
          </p>
        </header>

        <LocationMap />

        {/* Leicht abgedunkelte Karte: hält das Formular über der Grafik lesbar. */}
        <div className="rounded-2xl border border-white/10 bg-neutral-950/70 p-6 backdrop-blur-sm">
          <RsvpForm donation={{ paypalMeHandle, iban, ibanHolder }} />
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
