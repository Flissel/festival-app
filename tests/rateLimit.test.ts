import { describe, expect, it } from "vitest";
import { checkRateLimit, isHoneypotFilled } from "@/lib/rateLimit";

describe("checkRateLimit", () => {
  it("erlaubt Anfragen bis zum Limit und blockt danach", () => {
    const params = { key: "test:limit", limit: 3, windowMs: 60_000, now: 1_000 };
    expect(checkRateLimit(params)).toBe(true);
    expect(checkRateLimit(params)).toBe(true);
    expect(checkRateLimit(params)).toBe(true);
    expect(checkRateLimit(params)).toBe(false);
  });

  it("setzt das Limit nach Ablauf des Fensters zurück", () => {
    const key = "test:reset";
    expect(checkRateLimit({ key, limit: 1, windowMs: 60_000, now: 1_000 })).toBe(true);
    expect(checkRateLimit({ key, limit: 1, windowMs: 60_000, now: 2_000 })).toBe(false);
    expect(checkRateLimit({ key, limit: 1, windowMs: 60_000, now: 62_000 })).toBe(true);
  });

  it("zählt verschiedene Keys getrennt", () => {
    expect(checkRateLimit({ key: "test:a", limit: 1, windowMs: 60_000, now: 1_000 })).toBe(true);
    expect(checkRateLimit({ key: "test:b", limit: 1, windowMs: 60_000, now: 1_000 })).toBe(true);
  });
});

describe("isHoneypotFilled", () => {
  it("erkennt ein ausgefülltes Honeypot-Feld", () => {
    expect(isHoneypotFilled({ website: "http://spam.example" })).toBe(true);
  });

  it("ignoriert leere oder fehlende Werte", () => {
    expect(isHoneypotFilled({ website: "" })).toBe(false);
    expect(isHoneypotFilled({ website: "   " })).toBe(false);
    expect(isHoneypotFilled({})).toBe(false);
    expect(isHoneypotFilled(null)).toBe(false);
    expect(isHoneypotFilled("string")).toBe(false);
  });
});
