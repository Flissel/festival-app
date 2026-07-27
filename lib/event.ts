export const EVENT = {
  name: "Das Festival",
  // Sobald der Termin feststeht, hier eintragen — erscheint auf der Einladung
  // und in der Bestätigungsmail. Beispiel: "Samstag, 15. August 2026, ab 16 Uhr"
  dateLabel: null as string | null,
};

export function formatEventDate(): string {
  return EVENT.dateLabel ?? "Termin wird noch bekannt gegeben";
}
