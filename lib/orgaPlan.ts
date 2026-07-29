// Orga-Plan für das Festival am 29.08. — inhaltlich 1:1 aus der Absprache
// übernommen und nur nach Kategorien sortiert. `prisma/seed.ts` legt daraus die
// Budget-Kategorien und Aufgaben im Admin an.
//
// Konventionen aus der Absprache, bewusst beibehalten:
// - "(€)" markiert Posten, die Geld kosten. Der konkrete Betrag steht noch
//   nicht fest und wird im Admin unter "geschätzte Kosten" nachgetragen.
// - "?" markiert offene Punkte (Zusage fehlt, Zuständigkeit unklar).
// - Namen in Klammern sind die Person, die den Posten übernimmt. Bewusst als
//   Text im Titel und nicht als Member-Zuweisung: Member brauchen eine
//   Telefonnummer, und die liegt für die meisten noch nicht vor.

export const EVENT_DAY = "2026-08-29";

export type PlanTask = {
  title: string;
  // Leer, wo bewusst kein Termin gesetzt ist (die reine Ideensammlung).
  dueDate?: string;
};

export type PlanCategory = {
  name: string;
  tasks: PlanTask[];
};

// Alles, was für die Party bereitstehen muss, ist zum Veranstaltungstag fällig.
// Einzelne Posten (Live-Act, DJs, Anlage) lassen sich im Admin nach vorne ziehen.
const dueOnEventDay = (titles: string[]): PlanTask[] =>
  titles.map((title) => ({ title, dueDate: EVENT_DAY }));

export const ORGA_PLAN: PlanCategory[] = [
  {
    name: "Getränke",
    tasks: dueOnEventDay(["Lieferschein Edeka", "Kühlanhänger (umsonst?)"]),
  },
  {
    name: "Essen",
    tasks: dueOnEventDay([
      "Grillen mit Selbstmitnahme — allen ansagen",
      "Baguette",
      "Nudelsalat (Maxi)",
      "Paella (Felix)",
    ]),
  },
  {
    name: "Musik",
    tasks: dueOnEventDay([
      "12–18 Uhr: Handymusik",
      "18–20 Uhr: Live-Act (€)",
      "20–00 Uhr: DJ 1 — Ladia? Machmut? Karl? (€)",
      "00–02 Uhr: DJ 2 (€)",
    ]),
  },
  {
    name: "Area: DJ",
    tasks: dueOnEventDay(["Anlage (€)", "Lichter (€)", "Deko"]),
  },
  {
    name: "Area: Bar",
    tasks: dueOnEventDay(["Becher", "Schnapsgläser", "Aperol-/Mojito-Spender aus Glas"]),
  },
  {
    name: "Area: Chill-Zelt",
    tasks: dueOnEventDay(["Couchen", "Teppiche", "Deko", "Shisha", "Weed", "Emma?"]),
  },
  {
    name: "Area: Buffet/Grill",
    tasks: dueOnEventDay([
      "1 Extra-Grill",
      "Bierzeltgarnitur fürs Buffet",
      "Tische zum Essen (Baderbräu?)",
      "Teller",
      "Besteck",
    ]),
  },
  {
    name: "Area: Steg",
    tasks: dueOnEventDay(["Deko"]),
  },
  {
    // Noch nichts entschieden — deshalb ohne Fälligkeit.
    name: "Ideen",
    tasks: ["Volleyball", "Spikeball", "Wasservolleyball", "Bierpong", "Shisha"].map(
      (title) => ({ title })
    ),
  },
];
