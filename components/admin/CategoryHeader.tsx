"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CategoryHeader({
  categoryId,
  name,
  taskCount,
}: {
  categoryId: string;
  name: string;
  taskCount: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [saving, setSaving] = useState(false);

  async function handleRename() {
    if (!value.trim() || value === name) {
      setEditing(false);
      setValue(name);
      return;
    }
    setSaving(true);
    try {
      await fetch(`/api/admin/categories/${categoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: value }),
      });
      setEditing(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      taskCount > 0
        ? `"${name}" löschen? ${taskCount} Aufgabe(n) darin werden mitgelöscht.`
        : `"${name}" löschen?`
    );
    if (!confirmed) return;

    setSaving(true);
    try {
      await fetch(`/api/admin/categories/${categoryId}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          disabled={saving}
          className="rounded-md border border-white/20 bg-black/20 px-2 py-1 text-lg font-semibold"
        />
        <button onClick={handleRename} disabled={saving} className="text-xs text-white/60 underline">
          Speichern
        </button>
        <button
          onClick={() => {
            setEditing(false);
            setValue(name);
          }}
          className="text-xs text-white/60 underline"
        >
          Abbrechen
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <h2 className="text-lg font-semibold">{name}</h2>
      <button onClick={() => setEditing(true)} className="text-xs text-white/60 underline hover:text-white">
        Umbenennen
      </button>
      <button
        onClick={handleDelete}
        disabled={saving}
        className="text-xs text-red-400 underline hover:text-red-300"
      >
        Löschen
      </button>
    </div>
  );
}
