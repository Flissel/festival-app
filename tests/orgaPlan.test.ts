import { describe, expect, it } from "vitest";
import { ORGA_PLAN, EVENT_DAY } from "@/lib/orgaPlan";
import { parseDueDate } from "@/lib/dueDate";

describe("ORGA_PLAN", () => {
  it("hat eindeutige Kategorienamen", () => {
    const names = ORGA_PLAN.map((category) => category.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("hat je Kategorie eindeutige Aufgabentitel", () => {
    // Der Seed erkennt bestehende Aufgaben am Titel — zwei gleiche Titel in
    // derselben Kategorie würden beim Einspielen still zu einer verschmelzen.
    for (const category of ORGA_PLAN) {
      const titles = category.tasks.map((task) => task.title);
      expect(new Set(titles).size, `Doppelter Titel in "${category.name}"`).toBe(titles.length);
    }
  });

  it("enthält keine leeren Namen oder Titel", () => {
    for (const category of ORGA_PLAN) {
      expect(category.name.trim()).not.toBe("");
      expect(category.tasks.length).toBeGreaterThan(0);
      for (const task of category.tasks) {
        expect(task.title.trim()).not.toBe("");
      }
    }
  });

  it("nutzt nur Fälligkeiten, die sich parsen lassen", () => {
    for (const category of ORGA_PLAN) {
      for (const task of category.tasks) {
        if (!task.dueDate) continue;
        expect(task.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(parseDueDate(task.dueDate)?.getTime()).not.toBeNaN();
      }
    }
  });

  it("legt den Veranstaltungstag auf den 29. August 2026", () => {
    expect(EVENT_DAY).toBe("2026-08-29");
    expect(parseDueDate(EVENT_DAY)?.getUTCDay()).toBe(6); // Samstag
  });
});
