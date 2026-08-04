import { describe, expect, it } from "vitest";
import { isUniqueViolation, isRecordNotFound } from "@/lib/prismaError";

describe("isUniqueViolation", () => {
  it("erkennt den Prisma-Code für verletzte Eindeutigkeit", () => {
    expect(isUniqueViolation({ code: "P2002" })).toBe(true);
  });

  it("lässt andere Fehler durch", () => {
    expect(isUniqueViolation({ code: "P2025" })).toBe(false);
    expect(isUniqueViolation(new Error("boom"))).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
    expect(isUniqueViolation(undefined)).toBe(false);
    expect(isUniqueViolation("P2002")).toBe(false);
  });
});

describe("isRecordNotFound", () => {
  it("erkennt den Code für nicht gefundene Datensätze", () => {
    expect(isRecordNotFound({ code: "P2025" })).toBe(true);
  });

  it("lässt andere Fehler durch", () => {
    expect(isRecordNotFound({ code: "P2002" })).toBe(false);
    expect(isRecordNotFound(null)).toBe(false);
  });
});
