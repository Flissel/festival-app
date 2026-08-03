import Link from "next/link";
import { LogoutButton } from "@/components/admin/LogoutButton";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/gaeste", label: "Gäste" },
  { href: "/admin/aufgaben", label: "Aufgaben" },
  { href: "/admin/members", label: "Teams & Members" },
  { href: "/admin/anfragen", label: "Anfragen" },
  { href: "/admin/broadcast", label: "Broadcast" },
  { href: "/admin/spenden", label: "Spenden" },
  { href: "/admin/verlauf", label: "Verlauf" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="border-b border-white/10">
        {/* items-start + umbrechende Navigation: auf dem Handy brauchen die
            sechs Links mehr als eine Zeile. Ohne den Umbruch schob die Leiste
            die ganze Seite auf 551 px, "Broadcast" und "Abmelden" lagen
            außerhalb des Bildschirms. */}
        <div className="mx-auto flex max-w-5xl items-start justify-between gap-4 px-6 py-4">
          <nav className="flex flex-1 flex-wrap gap-x-5 gap-y-1 text-sm">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="py-1 whitespace-nowrap hover:underline"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <LogoutButton />
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
    </div>
  );
}
