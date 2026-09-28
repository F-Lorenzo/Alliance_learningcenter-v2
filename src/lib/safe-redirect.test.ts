import { describe, it, expect } from "vitest";
import { safeRedirectPath } from "./safe-redirect";

describe("safeRedirectPath", () => {
  it("allows a normal relative path", () => {
    expect(safeRedirectPath("/dashboard/cuenta")).toBe("/dashboard/cuenta");
  });

  it("falls back for null/undefined/empty", () => {
    expect(safeRedirectPath(null)).toBe("/dashboard");
    expect(safeRedirectPath(undefined)).toBe("/dashboard");
    expect(safeRedirectPath("")).toBe("/dashboard");
  });

  it("allows a custom fallback", () => {
    expect(safeRedirectPath(null, "/planes")).toBe("/planes");
    expect(safeRedirectPath("https://evil.com", "/planes")).toBe("/planes");
  });

  // Open redirect: ninguna de estas debe devolverse tal cual — todas terminan navegando fuera
  // del sitio si se pasan sin validar a router.push()/NextResponse.redirect().
  const malicious = [
    "https://evil.com",
    "http://evil.com",
    "//evil.com",
    "///evil.com",
    "////evil.com",
    "/\\evil.com",
    "\\\\evil.com",
    "/\\/evil.com",
    " https://evil.com",
    "HTTPS://evil.com",
    "javascript:alert(1)",
    "evil.com",
    "/%2F%2Fevil.com".replace(/%2F/gi, "/"), // simula el valor ya decodificado por URLSearchParams
  ];
  for (const value of malicious) {
    it(`rejects malicious redirect: ${JSON.stringify(value)}`, () => {
      expect(safeRedirectPath(value)).toBe("/dashboard");
    });
  }

  // Casos válidos que no deben caer en el fallback por error.
  const benign = ["/", "/planes", "/dashboard/cuenta?x=1", "/modulos/guardia/leccion-1"];
  for (const value of benign) {
    it(`allows benign relative path: ${value}`, () => {
      expect(safeRedirectPath(value)).toBe(value);
    });
  }
});
