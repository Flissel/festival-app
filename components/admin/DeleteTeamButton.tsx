"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteTeamButton({ teamId }: { teamId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleClick() {
    setSubmitting(true);
    try {
      await fetch(`/api/admin/teams/${teamId}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={submitting}
      className="text-xs text-red-400 underline hover:text-red-300 disabled:opacity-50"
    >
      Löschen
    </button>
  );
}
