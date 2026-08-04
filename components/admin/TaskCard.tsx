"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buildWhatsAppLink } from "@/lib/whatsapp";

type TaskStatus = "open" | "in_progress" | "done";

type MemberRef = { id: string; name: string; phone: string | null };
type TeamRef = { id: string; name: string; members: MemberRef[] };

type Task = {
  id: string;
  title: string;
  description: string | null;
  imagePath: string | null;
  status: TaskStatus;
  categoryName: string;
  member: MemberRef | null;
  team: { id: string; name: string } | null;
  estimatedCost: string | null;
  actualCost: string | null;
  dueDate: string | null; // "YYYY-MM-DD"
};

function isOverdue(task: Task): boolean {
  if (!task.dueDate || task.status === "done") return false;
  return task.dueDate < new Date().toISOString().slice(0, 10);
}

const statusLabels: Record<TaskStatus, string> = {
  open: "Offen",
  in_progress: "In Arbeit",
  done: "Erledigt",
};

function messageFor(name: string, task: Task) {
  return `Hi ${name}, du bist für "${task.title}" (${task.categoryName}) eingeteilt. Danke!`;
}

export function TaskCard({
  task,
  members,
  teams,
}: {
  task: Task;
  members: MemberRef[];
  teams: TeamRef[];
}) {
  const router = useRouter();
  const [actualCost, setActualCost] = useState(task.actualCost ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  // Der Pfad selbst wird nie geladen — er liegt im privaten Speicher. Diese
  // Route reicht die Datei erst nach der Sitzungsprüfung durch. Der Pfad hängt
  // als Parameter dran, damit der Browser nach einem Wechsel nicht das alte
  // Bild aus dem Cache zeigt.
  const imageSrc = `/api/admin/tasks/${task.id}/image?v=${encodeURIComponent(task.imagePath ?? "")}`;

  async function uploadImage(file: File) {
    setUploading(true);
    setImageError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch(`/api/admin/tasks/${task.id}/image`, { method: "POST", body });
      if (!response.ok) {
        const data: unknown = await response.json().catch(() => null);
        setImageError(
          data && typeof data === "object" && "error" in data && typeof data.error === "string"
            ? data.error
            : "Das Foto konnte nicht gespeichert werden."
        );
        return;
      }
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  async function removeImage() {
    setUploading(true);
    setImageError(null);
    try {
      await fetch(`/api/admin/tasks/${task.id}/image`, { method: "DELETE" });
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

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

  function handleAssignmentChange(value: string) {
    if (value.startsWith("m:")) {
      updateTask({ memberId: value.slice(2), teamId: "" });
    } else if (value.startsWith("t:")) {
      updateTask({ teamId: value.slice(2), memberId: "" });
    } else {
      updateTask({ memberId: "", teamId: "" });
    }
  }

  const assignedTeam = task.team ? teams.find((t) => t.id === task.team!.id) : null;

  const overdue = isOverdue(task);

  return (
    <div
      className={`rounded-lg border p-3 text-sm ${
        overdue ? "border-red-400/40 bg-red-500/5" : "border-white/10 bg-white/5"
      }`}
    >
      <p className="font-medium">{task.title}</p>
      {task.description && (
        <p className="mt-1 whitespace-pre-line text-xs text-white/60">{task.description}</p>
      )}
      {task.imagePath && (
        <div className="mt-2">
          <a href={imageSrc} target="_blank" rel="noopener noreferrer" className="block">
            {/* Kein next/image: Das Bild kommt aus einer Route, die erst die
                Sitzung prüft, und für ein Vorschaubild im Board lohnt die
                Optimierungs-Pipeline nicht. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageSrc}
              alt={`Foto zu ${task.title}`}
              className="max-h-32 w-full rounded-md border border-white/10 object-cover"
              loading="lazy"
            />
          </a>
          <button
            onClick={removeImage}
            disabled={uploading}
            className="mt-1 text-xs text-white/40 underline hover:text-white/70 disabled:opacity-50"
          >
            Foto entfernen
          </button>
        </div>
      )}

      <label className="mt-2 block text-xs text-white/40 hover:text-white/70">
        {uploading ? "Lädt hoch…" : task.imagePath ? "Foto ersetzen" : "+ Foto"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          disabled={uploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) uploadImage(file);
          }}
        />
      </label>
      {imageError && <p className="mt-1 text-xs text-red-400">{imageError}</p>}
      {overdue && <p className="mt-1 text-xs text-red-400">Überfällig</p>}

      <div className="mt-2 flex items-center gap-2">
        <select
          value={task.member ? `m:${task.member.id}` : task.team ? `t:${task.team.id}` : ""}
          disabled={saving}
          onChange={(event) => handleAssignmentChange(event.target.value)}
          className="rounded-md border border-white/20 bg-black/20 px-2 py-1 text-xs"
        >
          <option value="">Nicht zugewiesen</option>
          <optgroup label="Members">
            {members.map((member) => (
              <option key={member.id} value={`m:${member.id}`}>
                {member.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="Teams">
            {teams.map((team) => (
              <option key={team.id} value={`t:${team.id}`}>
                {team.name}
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      {/* Ohne Nummer gibt es nichts zu verlinken — dann lieber kein Knopf als
          einer, der ins Leere führt. */}
      {task.member?.phone && (
        <a
          href={buildWhatsAppLink(task.member.phone, messageFor(task.member.name, task))}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block rounded-md bg-emerald-500/20 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-500/30"
        >
          WhatsApp senden
        </a>
      )}

      {assignedTeam && (
        <div className="mt-2 flex flex-wrap gap-1">
          {assignedTeam.members.length === 0 && (
            <span className="text-xs text-white/40">Team hat noch keine Members.</span>
          )}
          {assignedTeam.members
            .filter((member) => member.phone)
            .map((member) => (
            <a
              key={member.id}
              href={buildWhatsAppLink(member.phone!, messageFor(member.name, task))}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md bg-emerald-500/20 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-500/30"
            >
              WhatsApp an {member.name}
            </a>
          ))}
        </div>
      )}

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
        <span>Fällig:</span>
        <input
          type="date"
          defaultValue={task.dueDate ?? ""}
          onChange={(event) => updateTask({ dueDate: event.target.value })}
          disabled={saving}
          className="rounded-md border border-white/20 bg-black/20 px-2 py-1"
        />
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
