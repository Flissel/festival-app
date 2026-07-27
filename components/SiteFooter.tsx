import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-white/10 pt-6 text-center text-xs text-white/40">
      <nav className="flex justify-center gap-6">
        <Link href="/anfrage" className="hover:text-white/70">
          Kontakt
        </Link>
        <Link href="/impressum" className="hover:text-white/70">
          Impressum
        </Link>
        <Link href="/datenschutz" className="hover:text-white/70">
          Datenschutz
        </Link>
      </nav>
    </footer>
  );
}
