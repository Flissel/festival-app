import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-white/10 pt-6 text-center text-xs text-white/40">
      {/* py-2 an den Links: als reiner Text wären die Trefferflächen nur 16 px
          hoch und mit dem Daumen kaum zu treffen. */}
      <nav className="flex flex-wrap justify-center gap-x-6">
        <Link href="/anfrage" className="py-2 hover:text-white/70">
          Kontakt
        </Link>
        <Link href="/impressum" className="py-2 hover:text-white/70">
          Impressum
        </Link>
        <Link href="/datenschutz" className="py-2 hover:text-white/70">
          Datenschutz
        </Link>
      </nav>
    </footer>
  );
}
