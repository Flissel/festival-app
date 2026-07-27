import { prisma } from "@/lib/prisma";
import { GuestRow } from "@/components/admin/GuestRow";

export const dynamic = "force-dynamic";

type GuestRecord = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  plusOnes: number;
  allergies: string | null;
  paymentStatus: "pending" | "cash_pending" | "paid";
  waitlisted: boolean;
};

function GuestTable({ guests, emptyText }: { guests: GuestRecord[]; emptyText: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full min-w-[860px] text-sm">
        <thead className="bg-white/5 text-left text-white/60">
          <tr>
            <th className="px-4 py-2">Name</th>
            <th className="px-4 py-2">E-Mail</th>
            <th className="px-4 py-2">Telefon</th>
            <th className="px-4 py-2">+Begleitung</th>
            <th className="px-4 py-2">Allergien</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {guests.map((guest) => (
            <GuestRow key={guest.id} guest={guest} />
          ))}
          {guests.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-6 text-center text-white/40">
                {emptyText}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default async function AdminGuestsPage() {
  const allGuests = await prisma.guest.findMany({ orderBy: { createdAt: "desc" } });

  const toRecord = (guest: (typeof allGuests)[number]): GuestRecord => ({
    id: guest.id,
    name: guest.name,
    email: guest.email,
    phone: guest.phone,
    plusOnes: guest.plusOnes,
    allergies: guest.allergies,
    paymentStatus: guest.paymentStatus,
    waitlisted: guest.waitlisted,
  });

  const guests = allGuests.filter((guest) => !guest.waitlisted).map(toRecord);
  const waitlist = allGuests.filter((guest) => guest.waitlisted).map(toRecord);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gäste</h1>
        <a
          href="/api/admin/guests/export"
          download
          className="rounded-md border border-white/20 px-3 py-1 text-sm hover:bg-white/5"
        >
          CSV exportieren
        </a>
      </div>

      <GuestTable guests={guests} emptyText="Noch keine Anmeldungen." />

      {waitlist.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">
            Warteliste{" "}
            <span className="text-sm font-normal text-white/50">
              ({waitlist.reduce((sum, guest) => sum + 1 + guest.plusOnes, 0)} Personen)
            </span>
          </h2>
          <GuestTable guests={waitlist} emptyText="Warteliste ist leer." />
        </div>
      )}
    </div>
  );
}
