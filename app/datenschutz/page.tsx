import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Datenschutz",
  robots: { index: false },
};

// Offen: Kontakt-E-Mail und der Name des Datenbank-Anbieters.
export default function DatenschutzPage() {
  return (
    <main className="flex min-h-screen flex-1 flex-col bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950 text-white">
      <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <h1 className="text-3xl font-bold">Datenschutzerklärung</h1>

        <section className="mt-8 space-y-6 text-white/80">
          <div>
            <h2 className="text-lg font-semibold text-white">Verantwortliche Stelle</h2>
            <p className="mt-2">
              Felix Baumann
              <br />
              Huglfingerstraße 5
              <br />
              81477 München
              <br />
              E-Mail: felixbaumann404@gmail.com
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white">
              Welche Daten wir verarbeiten
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>Anmeldung:</strong> Name, E-Mail-Adresse und Anzahl der
                Begleitpersonen — mehr erheben wir nicht.
              </li>
              <li>
                <strong>Kontaktformular:</strong> Name, E-Mail-Adresse und deine Nachricht.
              </li>
              <li>
                <strong>Freiwillige Unterstützung:</strong> Wer uns etwas dalässt, tut
                das direkt bei PayPal oder per Überweisung — wir übermitteln dafür keine
                Daten und binden auf dieser Seite auch nichts von PayPal ein. Klickst du
                den Spendenlink, verlässt du unsere Seite; ab dort gelten die
                Datenschutzhinweise von PayPal. Was eingegangen ist, notieren wir intern
                beim jeweiligen Namen (Betrag und Datum).
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white">Zweck und Rechtsgrundlage</h2>
            <p className="mt-2">
              Wir nutzen die Daten ausschließlich zur Organisation dieser Veranstaltung
              (Gästeliste, Planung, Rückfragen). Rechtsgrundlage ist Art. 6 Abs. 1 lit. b
              DSGVO (Durchführung der Anmeldung).
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white">Weitergabe und Hosting</h2>
            <p className="mt-2">
              Deine Daten werden nicht an Dritte weitergegeben. Die Anwendung wird bei
              Vercel Inc. gehostet; die Datenbank liegt bei [Datenbank-Anbieter].
              Bestätigungs-E-Mails versenden wir über Google (Gmail).
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white">Speicherdauer</h2>
            <p className="mt-2">
              Wir löschen alle personenbezogenen Daten spätestens drei Monate nach der
              Veranstaltung, sofern keine gesetzlichen Aufbewahrungspflichten bestehen.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white">Deine Rechte</h2>
            <p className="mt-2">
              Du hast das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der
              Verarbeitung deiner Daten sowie ein Beschwerderecht bei einer
              Datenschutz-Aufsichtsbehörde. Schreib uns dafür einfach an felixbaumann404@gmail.com oder
              über das Kontaktformular.
            </p>
          </div>
        </section>

        <SiteFooter />
      </div>
    </main>
  );
}
