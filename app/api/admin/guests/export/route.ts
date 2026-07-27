import { prisma } from "@/lib/prisma";
import { toCsv } from "@/lib/csv";

const statusLabels: Record<string, string> = {
  pending: "Online ausstehend",
  cash_pending: "Bar ausstehend",
  paid: "Bezahlt",
};

export async function GET() {
  const guests = await prisma.guest.findMany({ orderBy: { name: "asc" } });

  const rows = [
    ["Name", "E-Mail", "Telefon", "Begleitpersonen", "Allergien", "Status", "Warteliste", "Angemeldet am"],
    ...guests.map((guest) => [
      guest.name,
      guest.email,
      guest.phone ?? "",
      String(guest.plusOnes),
      guest.allergies ?? "",
      statusLabels[guest.paymentStatus] ?? guest.paymentStatus,
      guest.waitlisted ? "ja" : "nein",
      guest.createdAt.toISOString().slice(0, 10),
    ]),
  ];

  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="gaesteliste.csv"',
    },
  });
}
