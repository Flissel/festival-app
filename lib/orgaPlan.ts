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

import type { PrismaClient } from "@/app/generated/prisma/client";
import { parseDueDate } from "@/lib/dueDate";

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

export type ImportResult = {
  createdCategories: number;
  createdTasks: number;
};

// Schreibt den Plan in die Datenbank. Idempotent: Kategorien und Aufgaben
// werden über ihren Namen wiedererkannt, ein zweiter Lauf ergänzt nur, was neu
// ist, und fasst Status, Zuweisung und Kosten bestehender Einträge nicht an.
//
// Wird von zwei Seiten benutzt — vom Seed-Script und vom Button im Admin —,
// damit es nur eine Wahrheit gibt, wie der Plan in die Datenbank kommt.
export async function importOrgaPlan(db: PrismaClient): Promise<ImportResult> {
  const highest = await db.budgetCategory.aggregate({ _max: { sortOrder: true } });
  let nextSortOrder = (highest._max.sortOrder ?? -1) + 1;

  let createdCategories = 0;
  let createdTasks = 0;

  for (const planCategory of ORGA_PLAN) {
    let category = await db.budgetCategory.findFirst({
      where: { name: planCategory.name },
    });

    if (!category) {
      category = await db.budgetCategory.create({
        data: { name: planCategory.name, sortOrder: nextSortOrder },
      });
      nextSortOrder += 1;
      createdCategories += 1;
    }

    for (const task of planCategory.tasks) {
      const existing = await db.task.findFirst({
        where: { categoryId: category.id, title: task.title },
      });
      if (existing) continue;

      await db.task.create({
        data: {
          categoryId: category.id,
          title: task.title,
          dueDate: parseDueDate(task.dueDate),
        },
      });
      createdTasks += 1;
    }
  }

  return { createdCategories, createdTasks };
}
