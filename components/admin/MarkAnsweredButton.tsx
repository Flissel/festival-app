"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function MarkAnsweredButton({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleClick() {
    setSubmitting(true);
    try {
      await fetch(`/api/admin/requests/${requestId}`, { method: "PATCH" });
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={submitting}
      className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-black disabled:opacity-50"
    >
      Als beantwortet markieren
    </button>
  );
}
