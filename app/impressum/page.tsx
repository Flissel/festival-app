import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Impressum",
  robots: { index: false },
};

// Offen: die Kontakt-E-Mail. § 5 DDG verlangt eine Adresse für schnelle
// elektronische Kontaktaufnahme — ein Kontaktformular allein genügt nicht.
export default function ImpressumPage() {
  return (
    <main className="flex min-h-screen flex-1 flex-col bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950 text-white">
      <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <h1 className="text-3xl font-bold">Impressum</h1>

        <section className="mt-8 space-y-6 text-white/80">
          <div>
            <h2 className="text-lg font-semibold text-white">Angaben gemäß § 5 DDG</h2>
            <p className="mt-2">
              Felix Baumann
              <br />
              Huglfingerstraße 5
              <br />
              81477 München
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white">Kontakt</h2>
            <p className="mt-2">E-Mail: [E-Mail-Adresse]</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white">
              Verantwortlich für den Inhalt
            </h2>
            <p className="mt-2">Felix Baumann, Anschrift wie oben</p>
          </div>

          <p className="text-sm text-white/50">
            Diese Seite dient der Organisation einer privaten Veranstaltung.
          </p>
        </section>

        <SiteFooter />
      </div>
    </main>
  );
}
