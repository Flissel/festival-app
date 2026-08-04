import { RequestForm } from "@/components/RequestForm";
import { SiteFooter } from "@/components/SiteFooter";

export default function AnfragePage() {
  return (
    <main className="flex min-h-screen flex-1 flex-col bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950 text-white">
      <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-bold">Frage stellen</h1>
          <p className="mt-4 text-white/70">
            Schreib uns kurz, worum es geht — wir melden uns bei dir.
          </p>
        </header>

        <RequestForm />

        <SiteFooter />
      </div>
    </main>
  );
}
