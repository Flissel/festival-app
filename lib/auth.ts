import { createHmac, timingSafeEqual, scryptSync } from "node:crypto";

const SESSION_COOKIE_NAME = "admin_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET fehlt in der Umgebung");
  return secret;
}

export function verifyAdminPassword(password: string): boolean {
  const stored = process.env.ADMIN_PASSWORD_HASH;
  if (!stored) throw new Error("ADMIN_PASSWORD_HASH fehlt in der Umgebung");

  const [salt, hashHex] = stored.split(":");
  if (!salt || !hashHex) return false;

  const derived = scryptSync(password, salt, 64);
  const expected = Buffer.from(hashHex, "hex");
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

export function hashAdminPassword(password: string, salt: string): string {
  const derived = scryptSync(password, salt, 64);
  return `${salt}:${derived.toString("hex")}`;
}

export function createSessionToken(): string {
  const issuedAt = Date.now().toString();
  const signature = createHmac("sha256", getSessionSecret()).update(issuedAt).digest("hex");
  return `${issuedAt}.${signature}`;
}

export function isValidSessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const [issuedAt, signature] = token.split(".");
  if (!issuedAt || !signature) return false;

  const expected = createHmac("sha256", getSessionSecret()).update(issuedAt).digest("hex");
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signature);
  if (expectedBuf.length !== actualBuf.length || !timingSafeEqual(expectedBuf, actualBuf)) {
    return false;
  }

  const ageMs = Date.now() - Number(issuedAt);
  return ageMs >= 0 && ageMs <= SESSION_MAX_AGE_SECONDS * 1000;
}

export { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS };
