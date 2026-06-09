import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";

// ── Config ────────────────────────────────────────────────────────────────────
// Cargar desde variables de entorno o .env.local antes de correr este script
const R2_ACCOUNT_ID   = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY   = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_KEY   = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET       = process.env.R2_BUCKET_NAME ?? "alliance-lms";
const R2_PUBLIC_URL   = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

const SUPABASE_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ASSETS_DIR      = "C:/Users/facun/Desktop/wetransfer_learning_2026-05-26_2335";
const COURSE_FOLDER   = "GUARDIA CERRADA";   // carpeta en R2 para los videos
const THUMB_PREFIX    = "2026/05";           // carpeta en R2 para las thumbnails

// ── Lessons: [orden, título, archivo de video, archivo de thumbnail] ──────────
const LESSONS = [
  { order: 1, title: "Baratoplata",          video: "BARATOPLATA.mp4",           thumb: "BARATOPLATA.png" },
  { order: 2, title: "Estrangulamiento",     video: "GC-ESTRANGULAMENTO.mp4",    thumb: "ESTRANGULAMENTO.png" },
  { order: 3, title: "Llave de Brazo",       video: "LLAVE DE BRAZO.mp4",        thumb: "LLAVE-DE-BRAZO.png" },
  { order: 4, title: "MirLock",              video: "MirLock.mp4",               thumb: "MIRLOCK.png" },
  { order: 5, title: "Omoplata",             video: "OMOPLATA.mp4",              thumb: "OMOPLATA.png" },
  { order: 6, title: "Raspaje",              video: "RASPAJE.mp4",               thumb: "RASPAJE.png" },
  { order: 7, title: "Triángulo",            video: "TRIANGULO.mp4",             thumb: "TRIANGULO.png" },
];

// ── Clients ───────────────────────────────────────────────────────────────────
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY, secretAccessKey: R2_SECRET_KEY },
});

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Helpers ───────────────────────────────────────────────────────────────────
async function upload(key, filePath, contentType) {
  const body = readFileSync(filePath);
  await s3.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));
  console.log(`  ✅ uploaded → ${key}`);
  return key;
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log("\n🚀 Iniciando upload a R2...\n");

const lessonData = [];

for (const lesson of LESSONS) {
  console.log(`📦 [${lesson.order}/7] ${lesson.title}`);

  // Video
  const videoKey = `${COURSE_FOLDER}/${lesson.video}`;
  await upload(videoKey, join(ASSETS_DIR, "VIDEOS", lesson.video), "video/mp4");

  // Thumbnail
  const thumbKey = `${THUMB_PREFIX}/${lesson.thumb}`;
  await upload(thumbKey, join(ASSETS_DIR, "PANTALLAS", lesson.thumb), "image/png");

  lessonData.push({ ...lesson, videoKey, thumbKey });
  console.log();
}

console.log("✅ Todos los archivos subidos a R2.\n");
console.log("📝 Insertando curso en Supabase...\n");

// ── Thumbnail del curso: usar la del primer módulo (Baratoplata) ──────────────
const courseThumbnailKey = `${THUMB_PREFIX}/${LESSONS[0].thumb}`;

// Insertar curso
const { data: course, error: courseErr } = await supabase
  .from("courses")
  .insert({
    slug: "guardia-cerrada-armlock-enrolado",
    title: "Guardia Cerrada con Armlock Enrolado",
    description: "Domina el juego desde la guardia cerrada: estrangulaciones, llaves de brazo, barridos y finalizaciones encadenadas.",
    thumbnail_url: courseThumbnailKey,
    is_free: false,
    is_published: true,
    is_new: true,
    is_featured: false,
    total_duration: 0,
  })
  .select("id")
  .single();

if (courseErr) {
  console.error("❌ Error creando curso:", courseErr.message);
  process.exit(1);
}

console.log(`✅ Curso creado: ${course.id}\n`);

// ── Insertar categoría "Guardia" ──────────────────────────────────────────────
const { data: cat } = await supabase
  .from("categories")
  .select("id")
  .eq("slug", "guardia")
  .maybeSingle();

if (cat) {
  await supabase.from("course_categories").insert({ course_id: course.id, category_id: cat.id });
  console.log("✅ Categoría 'Guardia' asignada.\n");
}

// ── Insertar lecciones ────────────────────────────────────────────────────────
console.log("📝 Insertando lecciones...\n");

for (const l of lessonData) {
  const slug = `gc-armlock-${String(l.order).padStart(2, "0")}-${l.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const { error } = await supabase.from("lessons").insert({
    course_id: course.id,
    slug,
    title: l.title,
    sort_order: l.order,
    is_free: l.order === 1, // primera lección gratis
    video_url: l.videoKey,
    duration: 0,
  });

  if (error) {
    console.error(`  ❌ Error lección "${l.title}":`, error.message);
  } else {
    console.log(`  ✅ Lección ${l.order}: ${l.title}`);
  }
}

console.log("\n🎉 Todo listo! El módulo ya está en producción.\n");
console.log(`   URL: https://alliancebaireslearningcenter.com/modulos/guardia-cerrada-armlock-enrolado\n`);
