import Link from "next/link";
import { LogoutButton } from "@/components/admin/LogoutButton";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <nav className="flex gap-6 text-sm">
            <Link href="/admin" className="hover:underline">
              Dashboard
            </Link>
            <Link href="/admin/gaeste" className="hover:underline">
              Gäste
            </Link>
            <Link href="/admin/aufgaben" className="hover:underline">
              Aufgaben
            </Link>
            <Link href="/admin/members" className="hover:underline">
              Members
            </Link>
            <Link href="/admin/anfragen" className="hover:underline">
              Anfragen
            </Link>
          </nav>
          <LogoutButton />
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
    </div>
  );
}
