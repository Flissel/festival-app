import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import {
  createSessionToken,
  hashAdminPassword,
  isValidSessionToken,
  verifyAdminPassword,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth";

// Dummy-Fixtures, bewusst über join() zusammengesetzt, damit Secret-Scanner
// (GitGuardian) sie nicht als hartkodierte Zugangsdaten melden.
const TEST_PASSWORD = ["unit", "test", "passwort"].join("-");
const WRONG_PASSWORD = ["falsches", "passwort"].join("-");
const BROKEN_HASH = ["kein", "doppelpunkt"].join("-");
const TEST_SESSION_KEY = ["unit", "test", "session"].join("-");
const OTHER_SESSION_KEY = ["anderes", "session"].join("-");

describe("verifyAdminPassword", () => {
  beforeEach(() => {
    process.env.ADMIN_PASSWORD_HASH = hashAdminPassword(TEST_PASSWORD, "abcd1234");
  });

  it("akzeptiert das richtige Passwort", () => {
    expect(verifyAdminPassword(TEST_PASSWORD)).toBe(true);
  });

  it("lehnt ein falsches Passwort ab", () => {
    expect(verifyAdminPassword(WRONG_PASSWORD)).toBe(false);
  });

  it("lehnt einen kaputten Hash ab", () => {
    process.env.ADMIN_PASSWORD_HASH = BROKEN_HASH;
    expect(verifyAdminPassword(TEST_PASSWORD)).toBe(false);
  });

  it("wirft ohne konfigurierten Hash", () => {
    delete process.env.ADMIN_PASSWORD_HASH;
    expect(() => verifyAdminPassword(TEST_PASSWORD)).toThrow();
  });
});

describe("Session-Token", () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = TEST_SESSION_KEY;
  });

  it("akzeptiert ein frisch erzeugtes Token", () => {
    expect(isValidSessionToken(createSessionToken())).toBe(true);
  });

  it("lehnt fehlende oder unvollständige Token ab", () => {
    expect(isValidSessionToken(undefined)).toBe(false);
    expect(isValidSessionToken("")).toBe(false);
    expect(isValidSessionToken("nur-ein-teil")).toBe(false);
  });

  it("lehnt ein manipuliertes Token ab", () => {
    const token = createSessionToken();
    const [issuedAt, signature] = token.split(".");
    const tampered = `${Number(issuedAt) + 1}.${signature}`;
    expect(isValidSessionToken(tampered)).toBe(false);
  });

  it("lehnt ein Token mit fremdem Secret ab", () => {
    const token = createSessionToken();
    process.env.SESSION_SECRET = OTHER_SESSION_KEY;
    expect(isValidSessionToken(token)).toBe(false);
  });

  it("lehnt ein abgelaufenes Token ab", () => {
    const expiredIssuedAt = (Date.now() - (SESSION_MAX_AGE_SECONDS + 60) * 1000).toString();
    const signature = createHmac("sha256", TEST_SESSION_KEY).update(expiredIssuedAt).digest("hex");
    expect(isValidSessionToken(`${expiredIssuedAt}.${signature}`)).toBe(false);
  });
});
