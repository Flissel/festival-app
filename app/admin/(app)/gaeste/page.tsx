import { prisma } from "@/lib/prisma";
import { MarkPaidForm } from "@/components/admin/MarkPaidForm";

const statusLabels: Record<string, string> = {
  pending: "Online ausstehend",
  cash_pending: "Bar ausstehend",
  paid: "Bezahlt",
};

export default async function AdminGuestsPage() {
  const guests = await prisma.guest.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Gäste</h1>
      <div className="overflow-hidden rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-left text-white/60">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">E-Mail</th>
              <th className="px-4 py-2">+Begleitung</th>
              <th className="px-4 py-2">Allergien</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {guests.map((guest) => (
              <tr key={guest.id} className="border-t border-white/10">
                <td className="px-4 py-2">{guest.name}</td>
                <td className="px-4 py-2">{guest.email}</td>
                <td className="px-4 py-2">{guest.plusOnes}</td>
                <td className="px-4 py-2">{guest.allergies ?? "—"}</td>
                <td className="px-4 py-2">{statusLabels[guest.paymentStatus]}</td>
                <td className="px-4 py-2">
                  {guest.paymentStatus === "cash_pending" && (
                    <MarkPaidForm guestId={guest.id} />
                  )}
                </td>
              </tr>
            ))}
            {guests.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-white/40">
                  Noch keine Anmeldungen.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
