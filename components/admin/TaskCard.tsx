"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type TaskStatus = "open" | "in_progress" | "done";

type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  assignee: string | null;
  estimatedCost: string | null;
  actualCost: string | null;
};

const statusLabels: Record<TaskStatus, string> = {
  open: "Offen",
  in_progress: "In Arbeit",
  done: "Erledigt",
};

export function TaskCard({ task }: { task: Task }) {
  const router = useRouter();
  const [actualCost, setActualCost] = useState(task.actualCost ?? "");
  const [saving, setSaving] = useState(false);

  async function updateTask(data: Record<string, unknown>) {
    setSaving(true);
    try {
      await fetch(`/api/admin/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
      <p className="font-medium">{task.title}</p>
      {task.assignee && <p className="text-white/60">Zuständig: {task.assignee}</p>}
      <div className="mt-2 flex items-center gap-2">
        <select
          value={task.status}
          disabled={saving}
          onChange={(event) => updateTask({ status: event.target.value })}
          className="rounded-md border border-white/20 bg-black/20 px-2 py-1 text-xs"
        >
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-white/60">
        <span>Ist-Kosten:</span>
        <input
          type="number"
          min={0}
          step="0.01"
          value={actualCost}
          onChange={(event) => setActualCost(event.target.value)}
          onBlur={() => updateTask({ actualCost })}
          disabled={saving}
          className="w-20 rounded-md border border-white/20 bg-black/20 px-2 py-1"
        />
        <span>€</span>
      </div>
    </div>
  );
}
