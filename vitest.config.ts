import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Configuracion de Vitest para Alliance Learning Center.
 *
 * - Entorno node (las rutas API y la logica de suscripciones no necesitan DOM).
 * - Alias "@" -> ./src (igual que tsconfig.json "paths").
 * - Solo se buscan tests en src/**\/*.test.ts.
 * - `setupFiles` instala un guardia: bloquea `fetch` (ninguna prueba puede hablar con
 *   Supabase / MercadoPago / R2 / produccion) y pisa las variables de entorno sensibles con
 *   valores falsos.
 * - `envDir` apunta a un directorio inexistente a proposito: Vite NO lee ningun archivo
 *   `.env*` del proyecto (los tests jamas deben tocar credenciales reales).
 *
 * Compatible con vitest 2.1.9 (instalado) y con ^4.x (package.json).
 */
export default defineConfig({
  envDir: fileURLToPath(new URL("./src/test-utils/.no-env-dir", import.meta.url)),
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/.next/**"],
    setupFiles: ["./src/test-utils/setup.ts"],
    testTimeout: 15_000,
    hookTimeout: 15_000,
    // Cada archivo de test corre aislado (registro de modulos propio): vi.mock es por archivo.
    isolate: true,
  },
});
