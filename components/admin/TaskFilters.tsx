"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function TaskFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/admin/aufgaben${params.size > 0 ? `?${params.toString()}` : ""}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <label className="flex items-center gap-2 text-white/60">
        Status
        <select
          value={searchParams.get("status") ?? ""}
          onChange={(event) => setParam("status", event.target.value)}
          className="rounded-md border border-white/20 bg-black/20 px-2 py-1"
        >
          <option value="">Alle</option>
          <option value="open">Offen</option>
          <option value="in_progress">In Arbeit</option>
          <option value="done">Erledigt</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-white/60">
        Sortierung
        <select
          value={searchParams.get("sort") ?? ""}
          onChange={(event) => setParam("sort", event.target.value)}
          className="rounded-md border border-white/20 bg-black/20 px-2 py-1"
        >
          <option value="">Erstellt</option>
          <option value="due">Fälligkeit</option>
        </select>
      </label>
    </div>
  );
}
