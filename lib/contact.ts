// Die Adresse, unter der die Orga erreichbar ist.
//
// Steht hier im Code und nicht in den Umgebungsvariablen, weil sie ohnehin
// öffentlich ist: § 5 DDG verlangt sie im Impressum, und dort steht sie auch.
// Ein zweiter Ort, an dem dieselbe Adresse gepflegt werden müsste, wäre der
// sicherere Weg zu zwei verschiedenen Adressen.
export const ORGA_EMAIL = "felixbaumann404@gmail.com";

/**
 * Baut einen mailto-Link mit vorbelegtem Betreff.
 *
 * Der Betreff ist der eigentliche Zweck: Eine Mail mit „Auflegen beim Stereo
 * 2.0" im Betreff findet man in einem Postfach wieder, eine ohne nicht.
 */
export function mailtoLink(subject: string): string {
  return `mailto:${ORGA_EMAIL}?subject=${encodeURIComponent(subject)}`;
}
