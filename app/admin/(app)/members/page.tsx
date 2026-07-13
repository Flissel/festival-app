import { prisma } from "@/lib/prisma";
import { NewMemberForm } from "@/components/admin/NewMemberForm";
import { DeleteMemberButton } from "@/components/admin/DeleteMemberButton";

export const dynamic = "force-dynamic";

export default async function AdminMembersPage() {
  const members = await prisma.member.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Members</h1>
        <NewMemberForm />
      </div>
      <div className="overflow-hidden rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-left text-white/60">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Telefon</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id} className="border-t border-white/10">
                <td className="px-4 py-2">{member.name}</td>
                <td className="px-4 py-2">{member.phone}</td>
                <td className="px-4 py-2">
                  <DeleteMemberButton memberId={member.id} />
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-white/40">
                  Noch keine Members angelegt.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
