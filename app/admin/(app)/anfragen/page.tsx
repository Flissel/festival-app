import { prisma } from "@/lib/prisma";
import { MarkAnsweredButton } from "@/components/admin/MarkAnsweredButton";

export default async function AdminRequestsPage() {
  const requests = await prisma.request.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Anfragen</h1>
      <div className="space-y-3">
        {requests.map((request) => (
          <div key={request.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium">
                  {request.name} <span className="text-white/50">— {request.email}</span>
                </p>
                <p className="mt-1 text-sm text-white/80">{request.message}</p>
              </div>
              {request.status === "open" ? (
                <MarkAnsweredButton requestId={request.id} />
              ) : (
                <span className="shrink-0 rounded-md bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">
                  Beantwortet
                </span>
              )}
            </div>
          </div>
        ))}
        {requests.length === 0 && (
          <p className="text-white/40">Noch keine Anfragen.</p>
        )}
      </div>
    </div>
  );
}
