import { afterEach, describe, expect, it } from "vitest";
import { isUploadAuthorized, checkImage, MAX_IMAGE_BYTES } from "@/lib/taskImage";

// Über join() zusammengesetzt, damit Secret-Scanner sie nicht für echte
// Zugangsdaten halten — gleiche Konvention wie in auth.test.ts.
const FULL_TOKEN = ["voll", "token", "test"].join("-");
const UPLOAD_TOKEN = ["upload", "token", "test"].join("-");

afterEach(() => {
  delete process.env.MCP_SERVER_TOKEN;
  delete process.env.MCP_UPLOAD_TOKEN;
});

describe("isUploadAuthorized", () => {
  it("lässt den schmalen Upload-Token durch", () => {
    process.env.MCP_UPLOAD_TOKEN = UPLOAD_TOKEN;
    expect(isUploadAuthorized(`Bearer ${UPLOAD_TOKEN}`)).toBe(true);
  });

  it("lässt den Voll-Token durch, damit bestehende Installationen weiterlaufen", () => {
    process.env.MCP_SERVER_TOKEN = FULL_TOKEN;
    expect(isUploadAuthorized(`Bearer ${FULL_TOKEN}`)).toBe(true);
  });

  // Der eigentliche Punkt der Trennung: Der Token, den die Sandbox mitbekommt,
  // darf nirgends sonst gelten. Diese Richtung prüft der MCP-Endpunkt selbst —
  // hier wird festgehalten, dass ein fremder Token hier nicht durchkommt.
  it("weist einen Token ab, der weder Upload- noch Voll-Token ist", () => {
    process.env.MCP_SERVER_TOKEN = FULL_TOKEN;
    process.env.MCP_UPLOAD_TOKEN = UPLOAD_TOKEN;
    expect(isUploadAuthorized(`Bearer ${["irgendwas", "anderes"].join("-")}`)).toBe(false);
  });

  it("weist ohne Header ab", () => {
    process.env.MCP_UPLOAD_TOKEN = UPLOAD_TOKEN;
    expect(isUploadAuthorized(null)).toBe(false);
  });

  it("weist den nackten Token ohne Bearer-Präfix ab", () => {
    process.env.MCP_UPLOAD_TOKEN = UPLOAD_TOKEN;
    expect(isUploadAuthorized(UPLOAD_TOKEN)).toBe(false);
  });

  // Ohne diese Prüfung würde ein leerer Header gegen einen leeren Token
  // laufen und jeden hereinlassen, sobald beide Variablen fehlen.
  it("weist alles ab, solange kein Token gesetzt ist", () => {
    expect(isUploadAuthorized("Bearer ")).toBe(false);
    expect(isUploadAuthorized(`Bearer ${UPLOAD_TOKEN}`)).toBe(false);
  });
});

describe("checkImage", () => {
  it("nimmt gängige Bildformate an", () => {
    expect(checkImage("image/jpeg", 1000)).toBeNull();
    expect(checkImage("image/png", 1000)).toBeNull();
  });

  // SVG darf Skripte enthalten, und ein Foto vom Anhänger ist nie ein SVG.
  it("lehnt SVG ab", () => {
    expect(checkImage("image/svg+xml", 1000)?.ok).toBe(false);
  });

  it("lehnt zu große Dateien ab und nennt die Grenze", () => {
    const rejection = checkImage("image/jpeg", MAX_IMAGE_BYTES + 1);
    expect(rejection?.ok).toBe(false);
    expect(rejection?.error).toContain("10 MB");
  });
});
