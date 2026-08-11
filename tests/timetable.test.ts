import { describe, expect, it } from "vitest";
import {
  findOverlaps,
  formatSlotRange,
  groupByStage,
  localDayKey,
  parseSlotTime,
  sortSlots,
  type Slot,
} from "@/lib/timetable";

// 29.08.2026 ist ein Samstag, im August gilt MESZ (UTC+2).
const EVENT_START = new Date("2026-08-29T11:00:00.000Z"); // 13:00 Ortszeit

function slot(overrides: Partial<Slot> & { id: string }): Slot {
  return {
    title: "Act",
    stage: "DJ",
    startsAt: new Date("2026-08-29T18:00:00.000Z"),
    endsAt: null,
    note: null,
    isPublic: true,
    ...overrides,
  };
}

describe("formatSlotRange", () => {
  it("zeigt Beginn und Ende", () => {
    expect(
      formatSlotRange({
        startsAt: new Date("2026-08-29T18:00:00.000Z"), // 20:00
        endsAt: new Date("2026-08-29T19:30:00.000Z"), // 21:30
      })
    ).toBe("20:00–21:30");
  });

  it("sagt ab-Uhrzeit, wenn kein Ende feststeht", () => {
    expect(
      formatSlotRange({ startsAt: new Date("2026-08-29T21:00:00.000Z"), endsAt: null })
    ).toBe("ab 23:00");
  });

  it("stellt den Wochentag voran, wenn der Punkt an einem anderen Tag beginnt", () => {
    // Der Abbau am Sonntagmorgen stünde sonst als „ab 10:00" direkt unter dem
    // Aufbau am Samstag um „10:00–12:00" — die sähen gleichzeitig aus.
    expect(
      formatSlotRange(
        { startsAt: new Date("2026-08-30T08:00:00.000Z"), endsAt: null },
        EVENT_START
      )
    ).toBe("So ab 10:00");
  });

  it("lässt den Wochentag weg, solange der Punkt am Tag des Fests liegt", () => {
    expect(
      formatSlotRange(
        { startsAt: new Date("2026-08-29T18:00:00.000Z"), endsAt: null },
        EVENT_START
      )
    ).toBe("ab 20:00");
  });

  it("nennt den Wochentag, wenn es über Mitternacht geht", () => {
    // Ohne den Zusatz läse sich „23:00–01:00" wie eine Zeitreise.
    expect(
      formatSlotRange({
        startsAt: new Date("2026-08-29T21:00:00.000Z"), // Sa 23:00
        endsAt: new Date("2026-08-29T23:00:00.000Z"), // So 01:00
      })
    ).toBe("23:00–01:00 (So)");
  });
});

describe("sortSlots", () => {
  it("sortiert chronologisch, nicht nach Bühne", () => {
    const sorted = sortSlots([
      slot({ id: "spaet", startsAt: new Date("2026-08-29T22:00:00.000Z") }),
      slot({ id: "frueh", startsAt: new Date("2026-08-29T12:00:00.000Z") }),
    ]);
    expect(sorted.map((s) => s.id)).toEqual(["frueh", "spaet"]);
  });
});

describe("groupByStage", () => {
  it("ordnet die Bühnen danach, wann sie aufmachen", () => {
    // Alphabetisch stünde „Bar" vorn, obwohl dort erst um 22 Uhr etwas läuft.
    const groups = groupByStage([
      slot({ id: "b", stage: "Bar", startsAt: new Date("2026-08-29T20:00:00.000Z") }),
      slot({ id: "d", stage: "DJ", startsAt: new Date("2026-08-29T12:00:00.000Z") }),
    ]);
    expect(groups.map((g) => g.stage)).toEqual(["DJ", "Bar"]);
  });

  it("hält die Punkte einer Bühne in zeitlicher Reihenfolge", () => {
    const groups = groupByStage([
      slot({ id: "zwei", startsAt: new Date("2026-08-29T20:00:00.000Z") }),
      slot({ id: "eins", startsAt: new Date("2026-08-29T18:00:00.000Z") }),
    ]);
    expect(groups[0]!.slots.map((s) => s.id)).toEqual(["eins", "zwei"]);
  });
});

describe("findOverlaps", () => {
  const von = (h: number) => new Date(`2026-08-29T${String(h).padStart(2, "0")}:00:00.000Z`);

  it("meldet zwei Acts, die sich auf einer Bühne überschneiden", () => {
    const overlaps = findOverlaps([
      slot({ id: "a", title: "Anna", startsAt: von(18), endsAt: von(20) }),
      slot({ id: "b", title: "Ben", startsAt: von(19), endsAt: von(21) }),
    ]);
    expect(overlaps).toEqual([{ stage: "DJ", first: "Anna", second: "Ben" }]);
  });

  it("hält Berührung an den Rändern nicht für eine Überschneidung", () => {
    // Der eine hört auf, wenn der andere anfängt — genau so plant man.
    const overlaps = findOverlaps([
      slot({ id: "a", title: "Anna", startsAt: von(18), endsAt: von(20) }),
      slot({ id: "b", title: "Ben", startsAt: von(20), endsAt: von(22) }),
    ]);
    expect(overlaps).toEqual([]);
  });

  it("stört sich nicht an gleicher Zeit auf verschiedenen Bühnen", () => {
    const overlaps = findOverlaps([
      slot({ id: "a", stage: "DJ", startsAt: von(18), endsAt: von(20) }),
      slot({ id: "b", stage: "Steg", startsAt: von(18), endsAt: von(20) }),
    ]);
    expect(overlaps).toEqual([]);
  });

  it("warnt nicht bei offenem Ende", () => {
    // „ab 23 Uhr" sagt nichts darüber, wie lange — eine Warnung auf Verdacht
    // wäre nur Rauschen.
    const overlaps = findOverlaps([
      slot({ id: "a", startsAt: von(18), endsAt: null }),
      slot({ id: "b", startsAt: von(19), endsAt: von(21) }),
    ]);
    expect(overlaps).toEqual([]);
  });
});

describe("parseSlotTime", () => {
  it("nimmt die vollständige Angabe", () => {
    const parsed = parseSlotTime("2026-08-29T22:00", EVENT_START);
    expect(parsed?.toISOString()).toBe("2026-08-29T20:00:00.000Z");
  });

  it("nimmt sie auch mit Leerzeichen statt T", () => {
    expect(parseSlotTime("2026-08-29 22:00", EVENT_START)?.toISOString()).toBe(
      "2026-08-29T20:00:00.000Z"
    );
  });

  it("ergänzt bei deutscher Schreibweise das Jahr aus dem Termin", () => {
    expect(parseSlotTime("29.08. 22:00", EVENT_START)?.toISOString()).toBe(
      "2026-08-29T20:00:00.000Z"
    );
  });

  it("legt eine blanke Uhrzeit auf den Tag des Fests", () => {
    // Das ist der Fall aus der Gruppe: „Marco spielt um 22 Uhr."
    expect(parseSlotTime("22:00", EVENT_START)?.toISOString()).toBe(
      "2026-08-29T20:00:00.000Z"
    );
    expect(parseSlotTime("22 Uhr", EVENT_START)?.toISOString()).toBe(
      "2026-08-29T20:00:00.000Z"
    );
    expect(parseSlotTime("22", EVENT_START)?.toISOString()).toBe(
      "2026-08-29T20:00:00.000Z"
    );
  });

  it("schiebt frühe Uhrzeiten auf die Nacht danach", () => {
    // „02:00" ist die Nacht nach dem Fest, nicht der Morgen davor — sonst läge
    // der Act elf Stunden vor dem Beginn.
    const parsed = parseSlotTime("02:00", EVENT_START);
    expect(localDayKey(parsed!)).toBe("2026-08-30");
    expect(parsed!.getTime()).toBeGreaterThan(EVENT_START.getTime());
  });

  it("gibt null zurück, wenn nichts Verwertbares dasteht", () => {
    for (const input of ["", "irgendwann", "25:00", "abends"]) {
      expect(parseSlotTime(input, EVENT_START), input).toBeNull();
    }
  });

  it("kommt ohne Termin nur mit vollständigen Angaben klar", () => {
    // Ohne Fest-Datum fehlt der Bezugspunkt für „22:00".
    expect(parseSlotTime("22:00", null)).toBeNull();
    expect(parseSlotTime("2026-08-29T22:00", null)?.toISOString()).toBe(
      "2026-08-29T20:00:00.000Z"
    );
  });
});
