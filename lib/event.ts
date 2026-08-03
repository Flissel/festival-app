export const EVENT = {
  name: "Das Festival",
  // Erscheint auf der Einladung, im OG-Bild und in der Bestätigungsmail.
  dateLabel: "Samstag, 29. August 2026, ab 13 Uhr" as string | null,
  // Sobald die Acts feststehen, hier durch die Namen ersetzen — oder auf null
  // setzen, dann verschwindet die Zeile.
  lineupNote: "Line-up folgt" as string | null,
};

export function formatEventDate(): string {
  return EVENT.dateLabel ?? "Termin wird noch bekannt gegeben";
}
