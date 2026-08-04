import { prisma } from "@/lib/prisma";
import { NewMemberForm } from "@/components/admin/NewMemberForm";
import { DeleteMemberButton } from "@/components/admin/DeleteMemberButton";
import { NewTeamForm } from "@/components/admin/NewTeamForm";
import { DeleteTeamButton } from "@/components/admin/DeleteTeamButton";
import { MemberTeamSelect } from "@/components/admin/MemberTeamSelect";

export const dynamic = "force-dynamic";

export default async function AdminMembersPage() {
  const [members, teams] = await Promise.all([
    prisma.member.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.team.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Teams</h1>
          <NewTeamForm />
        </div>
        <div className="flex flex-wrap gap-2">
          {teams.map((team) => (
            <span
              key={team.id}
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm"
            >
              {team.name}
              <DeleteTeamButton teamId={team.id} />
            </span>
          ))}
          {teams.length === 0 && <p className="text-white/40">Noch keine Teams angelegt.</p>}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Members</h2>
          <NewMemberForm />
        </div>
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="bg-white/5 text-left text-white/60">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Telefon</th>
                <th className="px-4 py-2">Team</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-t border-white/10">
                  <td className="px-4 py-2">{member.name}</td>
                  <td className="px-4 py-2">
                    {member.phone ?? <span className="text-white/40">keine Nummer</span>}
                  </td>
                  <td className="px-4 py-2">
                    <MemberTeamSelect
                      memberId={member.id}
                      currentTeamId={member.teamId}
                      teams={teams}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <DeleteMemberButton memberId={member.id} />
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-white/40">
                    Noch keine Members angelegt.
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
