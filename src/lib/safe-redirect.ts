/**
 * Valida que un `redirect` recibido por query param sea un path RELATIVO al propio sitio —
 * nunca una URL absoluta (`https://evil.com`), protocol-relative (`//evil.com`) ni con
 * backslashes (`/\evil.com`, que algunos navegadores normalizan como `//`) — para evitar un
 * open redirect después de iniciar sesión o confirmar el email.
 *
 * Función pura sin dependencias de servidor: la usa tanto `auth/callback/route.ts` (server)
 * como `login-content.tsx` (cliente, antes hacía `router.push(redirect)` con el valor crudo del
 * query param, sin pasar por esta validación).
 */
export function safeRedirectPath(path: string | null | undefined, fallback = "/dashboard"): string {
  if (!path) return fallback;
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) {
    return fallback;
  }
  return path;
}
