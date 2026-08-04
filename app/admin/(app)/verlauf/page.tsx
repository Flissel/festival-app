import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const sourceLabels: Record<string, string> = {
  admin: "Admin",
  chat: "Chat",
  system: "System",
};

const sourceStyles: Record<string, string> = {
  admin: "bg-sky-400/10 text-sky-300",
  chat: "bg-violet-400/10 text-violet-300",
  system: "bg-white/10 text-white/60",
};

function formatMoment(at: Date): string {
  return at.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });
}

export default async function AdminAuditPage() {
  const entries = await prisma.auditEntry.findMany({ orderBy: { at: "desc" }, take: 200 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Verlauf</h1>
        <p className="mt-1 text-sm text-white/60">
          Wer hat was geändert — aus dem Admin und aus der Orga-Gruppe. Bei Änderungen
          aus der Gruppe ist der Urheber das, was der Bot meldet: ein Protokoll, keine
          Zugangskontrolle.
        </p>
      </div>

      {entries.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-white/50">
          Noch nichts protokolliert.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-white/5 text-left text-white/60">
              <tr>
                <th className="px-4 py-2">Wann</th>
                <th className="px-4 py-2">Woher</th>
                <th className="px-4 py-2">Wer</th>
                <th className="px-4 py-2">Was</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-t border-white/10">
                  <td className="whitespace-nowrap px-4 py-2 text-white/60">
                    {formatMoment(entry.at)}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-md px-2 py-1 text-xs ${sourceStyles[entry.source] ?? ""}`}
                    >
                      {sourceLabels[entry.source] ?? entry.source}
                    </span>
                  </td>
                  <td className="px-4 py-2">{entry.actor}</td>
                  <td className="px-4 py-2 text-white/80">{entry.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
