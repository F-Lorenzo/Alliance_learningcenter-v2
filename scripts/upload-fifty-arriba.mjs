import { uploadModule } from "./lib/module-uploader.mjs";

// ── Config ────────────────────────────────────────────────────────────────────
// Cargar credenciales desde .env.local antes de correr este script:
//   node --env-file=.env.local scripts/upload-fifty-arriba.mjs
// Para previsualizar sin subir ni escribir nada, agregar DRY_RUN=1:
//   DRY_RUN=1 node --env-file=.env.local scripts/upload-fifty-arriba.mjs

// TODO: apuntar a la carpeta local donde extrajiste
// wetransfer_fifty-arriba_2026-09-16_2224.zip
const ASSETS_DIR = "/ruta/local/a/fifty-arriba";

await uploadModule({
  assetsDir: ASSETS_DIR,
  courseFolder: "50-50 ARRIBA",       // carpeta en R2 (distinta de la existente "5050/")
  slug: "50-50-arriba",
  title: "50/50 desde Arriba",        // TODO: ajustar si querés otro título
  description: "Técnicas y control desde la posición de 50/50 estando arriba.", // TODO: ajustar
  categorySlug: "pasajes",
  isFree: false,
  firstLessonFree: true,
});
