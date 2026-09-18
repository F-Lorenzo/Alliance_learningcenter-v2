import { uploadModule } from "./lib/module-uploader.mjs";

// ── Config ────────────────────────────────────────────────────────────────────
// Cargar credenciales desde .env.local antes de correr este script:
//   node --env-file=.env.local scripts/upload-fifty-abajo.mjs
// Para previsualizar sin subir ni escribir nada, agregar DRY_RUN=1:
//   DRY_RUN=1 node --env-file=.env.local scripts/upload-fifty-abajo.mjs

// TODO: apuntar a la carpeta local donde extrajiste
// wetransfer_fifty-abajo_2026-09-16_2218.zip
const ASSETS_DIR = "/ruta/local/a/fifty-abajo";

await uploadModule({
  assetsDir: ASSETS_DIR,
  courseFolder: "50-50 ABAJO",        // carpeta en R2 (distinta de la existente "5050/")
  slug: "50-50-abajo",
  title: "50/50 desde Abajo",         // TODO: ajustar si querés otro título
  description: "Técnicas de defensa, escape y ataque desde la posición de 50/50 estando abajo.", // TODO: ajustar
  categorySlug: "guardia",
  isFree: false,
  firstLessonFree: true,
});
