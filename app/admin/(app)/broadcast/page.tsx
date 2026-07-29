import { prisma } from "@/lib/prisma";
import { BroadcastForm } from "@/components/admin/BroadcastForm";
import { groupChatId, isGatewayConfigured, DEFAULT_CHANNEL } from "@/lib/openclaw";

export const dynamic = "force-dynamic";

export default async function AdminBroadcastPage() {
  const teams = await prisma.team.findMany({ orderBy: { name: "asc" }, include: { members: true } });
  const gatewayReady = isGatewayConfigured();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Broadcast</h1>
      <p className="text-sm text-white/60">
        Schickt eine Nachricht über OpenClaw — entweder in die Orga-Gruppe oder einzeln
        an Members. Kanal: <code>{DEFAULT_CHANNEL}</code>.
      </p>

      {/* Ohne Gateway geht nichts raus. Das vorher zu sagen ist ehrlicher, als
          hinterher eine Fehlerliste zu zeigen. */}
      {!gatewayReady && (
        <div className="rounded-md border border-amber-400/40 bg-amber-400/5 p-4 text-sm text-amber-200">
          Das OpenClaw-Gateway ist nicht konfiguriert (<code>OPENCLAW_GATEWAY_URL</code> und{" "}
          <code>OPENCLAW_GATEWAY_TOKEN</code>). Nachrichten werden nicht zugestellt,
          und das Formular meldet das jetzt auch so.
        </div>
      )}

      <BroadcastForm
        teams={teams.map((team) => ({
          id: team.id,
          name: team.name,
          memberCount: team.members.length,
        }))}
        groupConfigured={groupChatId() !== null}
      />
    </div>
  );
}
