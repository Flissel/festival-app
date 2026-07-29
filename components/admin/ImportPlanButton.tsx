"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Result = { createdCategories: number; createdTasks: number };

export function ImportPlanButton() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleImport() {
    setSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/orga-plan", { method: "POST" });
      if (!response.ok) {
        setMessage("Import fehlgeschlagen");
        return;
      }
      const result: Result = await response.json();
      setMessage(
        result.createdCategories === 0 && result.createdTasks === 0
          ? "Alles schon drin — nichts hinzugefügt."
          : `${result.createdCategories} Kategorien und ${result.createdTasks} Aufgaben angelegt.`
      );
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handleImport}
        disabled={submitting}
        className="rounded-md border border-white/20 px-3 py-2 text-sm hover:bg-white/5 disabled:opacity-50"
      >
        {submitting ? "Wird eingespielt …" : "Orga-Plan einspielen"}
      </button>
      {message && <span className="text-xs text-white/60">{message}</span>}
    </div>
  );
}
