import { RsvpForm } from "@/components/RsvpForm";
import { LocationMap } from "@/components/LocationMap";

export default function HomePage() {
  const paypalClientId = process.env.PAYPAL_CLIENT_ID ?? "";

  return (
    <main className="flex min-h-screen flex-1 flex-col bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950 text-white">
      <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <header className="mb-10 text-center">
          <p className="text-sm uppercase tracking-widest text-white/50">
            Du bist eingeladen
          </p>
          <h1 className="mt-2 text-4xl font-bold">Das Festival</h1>
          <p className="mt-4 text-white/70">
            Bar &amp; Cocktails, Sound, Live-Acts — trag dich ein und sichere dir
            deinen Platz. Der Beitrag ist auf Spendenbasis, du entscheidest die Höhe.
          </p>
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
      </div>
    </main>
  );
}
