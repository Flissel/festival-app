import { prisma } from "@/lib/prisma";
import { BroadcastForm } from "@/components/admin/BroadcastForm";

export const dynamic = "force-dynamic";

export default async function AdminBroadcastPage() {
  const teams = await prisma.team.findMany({ orderBy: { name: "asc" }, include: { members: true } });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Broadcast</h1>
      <p className="text-sm text-white/60">
        Schickt eine WhatsApp-Nachricht an alle Members oder ein einzelnes Team über OpenClaw.
      </p>
      <BroadcastForm
        teams={teams.map((team) => ({ id: team.id, name: team.name, memberCount: team.members.length }))}
      />
    </div>
  );
}
