// Einen erkannten Zahlungseingang einem Gast zuordnen.
//
// Das Ergebnis ist ein Vorschlag für die Auswahlliste im Admin, keine
// Entscheidung. Wer bei PayPal unter „M. Baumann" zahlt und sich als „Max
// Baumann" angemeldet hat, ist derselbe Mensch — das kann die Orga sehen, ein
// Namensvergleich nicht. Deshalb wird hier nur zugeordnet, was zweifelsfrei
// zusammengehört, und alles andere bleibt offen.

export type GuestRef = { id: string; name: string; email: string };

export type GuestMatch = {
  guestId: string;
  /** Woran es erkannt wurde — steht im Admin neben dem Vorschlag. */
  reason: "email" | "name";
};

/** Kleinschreibung, Leerzeichen zusammenfassen. Mehr nicht — siehe oben. */
function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Die E-Mail-Adresse ist der verlässliche Schlüssel: Sie ist bei den Gästen
 * eindeutig, und wer über PayPal zahlt, tut das meist mit derselben Adresse,
 * mit der er sich angemeldet hat. Der Name ist nur die zweite Wahl.
 */
export function matchGuest(
  notice: { senderEmail: string | null; senderName: string | null },
  guests: GuestRef[]
): GuestMatch | null {
  if (notice.senderEmail) {
    const wanted = normalize(notice.senderEmail);
    const byEmail = guests.find((guest) => normalize(guest.email) === wanted);
    if (byEmail) return { guestId: byEmail.id, reason: "email" };
  }

  if (notice.senderName) {
    const wanted = normalize(notice.senderName);
    const matches = guests.filter((guest) => normalize(guest.name) === wanted);
    // Bei zwei Gästen gleichen Namens wäre jede Wahl geraten. Dann lieber
    // nichts vorschlagen, als das Geld der falschen Person zuzuschreiben.
    if (matches.length === 1) return { guestId: matches[0]!.id, reason: "name" };
  }

  return null;
}
