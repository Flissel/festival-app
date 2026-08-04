import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatEuro(amount: number): string {
  return amount.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

export default async function AdminDashboardPage() {
  const [guests, completedPayments, categories] = await Promise.all([
    prisma.guest.findMany(),
    prisma.payment.findMany({ where: { status: "completed" } }),
    prisma.budgetCategory.findMany({
      orderBy: { sortOrder: "asc" },
      include: { tasks: true },
    }),
  ]);

  const guestCount = guests
    .filter((guest) => !guest.waitlisted)
    .reduce((sum, guest) => sum + 1 + guest.plusOnes, 0);
  const waitlistCount = guests
    .filter((guest) => guest.waitlisted)
    .reduce((sum, guest) => sum + 1 + guest.plusOnes, 0);
  const totalIncome = completedPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const totalSpent = categories.reduce(
    (sum, category) =>
      sum + category.tasks.reduce((taskSum, task) => taskSum + Number(task.actualCost ?? 0), 0),
    0
  );

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm text-white/60">Gäste (inkl. Begleitpersonen)</p>
          <p className="mt-1 text-3xl font-bold">{guestCount}</p>
          {waitlistCount > 0 && (
            <p className="mt-1 text-xs text-amber-300">+ {waitlistCount} auf der Warteliste</p>
          )}
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm text-white/60">Eingegangen</p>
          <p className="mt-1 text-3xl font-bold">{formatEuro(totalIncome)}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm text-white/60">Kasse (Einnahmen − Ausgaben)</p>
          <p className="mt-1 text-3xl font-bold">{formatEuro(totalIncome - totalSpent)}</p>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Budget nach Kategorie</h2>
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="bg-white/5 text-left text-white/60">
              <tr>
                <th className="px-4 py-2">Kategorie</th>
                <th className="px-4 py-2">Geplant</th>
                <th className="px-4 py-2">Ausgegeben</th>
                <th className="px-4 py-2">Restbudget (Plan − Ist)</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => {
                const planned = category.tasks.reduce(
                  (sum, task) => sum + Number(task.estimatedCost ?? 0),
                  0
                );
                const spent = category.tasks.reduce(
                  (sum, task) => sum + Number(task.actualCost ?? 0),
                  0
                );
                return (
                  <tr key={category.id} className="border-t border-white/10">
                    <td className="px-4 py-2">{category.name}</td>
                    <td className="px-4 py-2">{formatEuro(planned)}</td>
                    <td className="px-4 py-2">{formatEuro(spent)}</td>
                    <td className="px-4 py-2">{formatEuro(planned - spent)}</td>
                  </tr>
                );
              })}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-white/40">
                    Noch keine Kategorien angelegt.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
