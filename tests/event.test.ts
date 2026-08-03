import { describe, expect, it } from "vitest";
import {
  dateToLocalTime,
  EVENT_DEFAULTS,
  formatEventDate,
  localTimeToDate,
} from "@/lib/event";

describe("localTimeToDate", () => {
  it("liest die Eingabe als deutsche Ortszeit, nicht als UTC", () => {
    // Ende August gilt MESZ (UTC+2): 13:00 Ortszeit sind 11:00 UTC. Läge hier
    // 13:00Z, stünde im Kalender des Gastes 15 Uhr.
    expect(localTimeToDate("2026-08-29T13:00")?.toISOString()).toBe(
      "2026-08-29T11:00:00.000Z"
    );
  });

  it("rechnet im Winter mit MEZ statt MESZ", () => {
    expect(localTimeToDate("2026-01-15T13:00")?.toISOString()).toBe(
      "2026-01-15T12:00:00.000Z"
    );
  });

  it("trifft die Stunde direkt nach der Zeitumstellung", () => {
    // Umstellung 2026: 29. März, 02:00 → 03:00 MESZ.
    expect(localTimeToDate("2026-03-29T04:00")?.toISOString()).toBe(
      "2026-03-29T02:00:00.000Z"
    );
    expect(localTimeToDate("2026-03-29T01:00")?.toISOString()).toBe(
      "2026-03-29T00:00:00.000Z"
    );
  });

  it("nimmt Sekunden hin und weist Unsinn ab", () => {
    expect(localTimeToDate("2026-08-29T13:00:00")?.toISOString()).toBe(
      "2026-08-29T11:00:00.000Z"
    );
    expect(localTimeToDate("")).toBeNull();
    expect(localTimeToDate("29.08.2026 13:00")).toBeNull();
    expect(localTimeToDate("2026-08-29")).toBeNull();
  });
});

describe("dateToLocalTime", () => {
  it("ist die Umkehrung von localTimeToDate", () => {
    for (const wall of ["2026-08-29T13:00", "2026-01-15T09:30", "2026-06-01T23:45"]) {
      const asDate = localTimeToDate(wall);
      expect(asDate).not.toBeNull();
      expect(dateToLocalTime(asDate)).toBe(wall);
    }
  });

  it("liefert für einen fehlenden Zeitpunkt ein leeres Feld", () => {
    expect(dateToLocalTime(null)).toBe("");
  });
});

describe("formatEventDate", () => {
  it("schreibt volle Stunden ohne Minuten", () => {
    expect(formatEventDate(localTimeToDate("2026-08-29T13:00"))).toBe(
      "Samstag, 29. August 2026, ab 13 Uhr"
    );
  });

  it("nennt die Minuten, wenn es sie gibt", () => {
    expect(formatEventDate(localTimeToDate("2026-08-29T13:30"))).toBe(
      "Samstag, 29. August 2026, ab 13:30 Uhr"
    );
  });

  it("sagt Bescheid, solange kein Termin feststeht", () => {
    expect(formatEventDate(null)).toBe("Termin wird noch bekannt gegeben");
  });
});

describe("EVENT_DEFAULTS", () => {
  it("beginnt am 29. August 2026 um 13 Uhr Ortszeit", () => {
    expect(formatEventDate(EVENT_DEFAULTS.startsAt)).toBe(
      "Samstag, 29. August 2026, ab 13 Uhr"
    );
  });

  it("endet danach, sonst wäre der Kalendereintrag ungültig", () => {
    expect(EVENT_DEFAULTS.endsAt!.getTime()).toBeGreaterThan(
      EVENT_DEFAULTS.startsAt!.getTime()
    );
  });
});
