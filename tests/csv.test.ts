import { describe, expect, it } from "vitest";
import { escapeCsvField, toCsv } from "@/lib/csv";
import { parseDueDate, formatDueDate } from "@/lib/dueDate";

describe("escapeCsvField", () => {
  it("lässt harmlose Werte unverändert", () => {
    expect(escapeCsvField("Alex")).toBe("Alex");
  });

  it("quotet Semikolons, Anführungszeichen und Zeilenumbrüche", () => {
    expect(escapeCsvField("a;b")).toBe('"a;b"');
    expect(escapeCsvField('sagt "hi"')).toBe('"sagt ""hi"""');
    expect(escapeCsvField("zeile1\nzeile2")).toBe('"zeile1\nzeile2"');
  });
});

describe("toCsv", () => {
  it("erzeugt BOM, Semikolon-Trennung und CRLF", () => {
    const csv = toCsv([
      ["Name", "E-Mail"],
      ["Alex", "alex@example.com"],
    ]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("Name;E-Mail\r\n");
    expect(csv.endsWith("\r\n")).toBe(true);
  });
});

describe("dueDate", () => {
  it("parst ein Datum als Mittags-UTC", () => {
    const date = parseDueDate("2026-08-15");
    expect(date?.toISOString()).toBe("2026-08-15T12:00:00.000Z");
  });

  it("gibt null für leere Werte zurück", () => {
    expect(parseDueDate(undefined)).toBeNull();
    expect(parseDueDate("")).toBeNull();
  });

  it("formatiert zurück auf YYYY-MM-DD", () => {
    expect(formatDueDate(new Date("2026-08-15T12:00:00Z"))).toBe("2026-08-15");
  });
});
