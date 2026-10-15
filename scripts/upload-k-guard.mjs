import { uploadModule } from "./lib/module-uploader.mjs";

// ── Config ────────────────────────────────────────────────────────────────────
// Cargar credenciales desde .env.local antes de correr este script:
//   node --env-file=.env.local scripts/upload-k-guard.mjs
// Para previsualizar sin subir ni escribir nada, agregar DRY_RUN=1:
//   DRY_RUN=1 node --env-file=.env.local scripts/upload-k-guard.mjs
//
// Secciones: el helper (scripts/lib/module-uploader.mjs) toma el título de
// sección de la subcarpeta inmediata de cada video. Para que quede agrupado
// como en el esquema (1. Cómo llegar / 2. Transiciones / 3. Finales), organizá
// la carpeta KGUARD en subcarpetas con esos mismos nombres antes de correr el
// script. Si los videos están sueltos sin subcarpetas, se suben igual pero
// sin separadores de sección — corré con DRY_RUN=1 primero para revisar.

const ASSETS_DIR = "C:\\Users\\facun\\Desktop\\wetransfer_kguard_2026-10-14_2346\\KGUARD";

await uploadModule({
  assetsDir: ASSETS_DIR,
  courseFolder: "K GUARD",
  slug: "k-guard",
  title: "K Guard",
  // TODO: ajustar la descripción si querés otra redacción
  description: "Sistema de K Guard: cómo armarla, transiciones a X Guard y a Matrix / Baby Bolo, y finalización con triángulo.",
  categorySlug: "guardia", // mismo criterio usado para x-guard
  isFree: false,
  firstLessonFree: true,
});

// NOTA sobre los links a otros sistemas del esquema original:
//   - "K Guard → X Guard" (Ver sistema X Guard): el curso x-guard ya existe
//     en producción, pero hoy no hay ningún campo ni UI para renderizar un
//     link clickeable dentro de una lección — es una función nueva a construir.
//   - "K Guard → Matrix → Baby Bolo" (Ver sistema Baby Bolo / Crab Ride): ese
//     módulo todavía no existe en la plataforma, así que ese link no tendría
//     destino aunque se implemente la función.
// Este script sube el contenido y arma las secciones; los links quedan
// pendientes de una decisión de producto (ver mensaje en el chat).
