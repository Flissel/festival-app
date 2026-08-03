/**
 * Öffentliche Basis-URL ohne Schrägstrich am Ende. Null, wenn nicht gesetzt —
 * dann verzichten Mails auf Links, statt auf eine kaputte Adresse zu zeigen.
 */
export function appBaseUrl(): string | null {
  const raw = process.env.APP_BASE_URL;
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
}
