"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Team = { id: string; name: string };

export function MemberTeamSelect({
  memberId,
  currentTeamId,
  teams,
}: {
  memberId: string;
  currentTeamId: string | null;
  teams: Team[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function handleChange(teamId: string) {
    setSaving(true);
    try {
      await fetch(`/api/admin/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <select
      defaultValue={currentTeamId ?? ""}
      disabled={saving}
      onChange={(event) => handleChange(event.target.value)}
      className="rounded-md border border-white/20 bg-black/20 px-2 py-1 text-xs"
    >
      <option value="">Kein Team</option>
      {teams.map((team) => (
        <option key={team.id} value={team.id}>
          {team.name}
        </option>
      ))}
    </select>
  );
}
