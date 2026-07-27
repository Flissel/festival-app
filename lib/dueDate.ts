// Mittags-UTC, damit das Datum in allen europäischen Zeitzonen stabil bleibt.
export function parseDueDate(value: string | undefined): Date | null {
  return value ? new Date(`${value}T12:00:00Z`) : null;
}

export function formatDueDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
