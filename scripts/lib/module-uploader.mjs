import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffprobeInstaller from "@ffprobe-installer/ffprobe";
import ffmpeg from "fluent-ffmpeg";
import { readFileSync, statSync, readdirSync } from "fs";
import { join, extname, basename, relative } from "path";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".mkv", ".m4v"]);

// ── Helpers ──────────────────────────────────────────────────────────────────

function slugify(text) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quitar acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Parsea nombres tipo "2.3 Pasaje abrazando cintura.mov" -> { order: 2.3, title: "Pasaje abrazando cintura" }
// Si no hay prefijo numérico, usa el nombre de archivo limpio y va al final del orden.
function parseFilename(filename) {
  const withoutExt = basename(filename, extname(filename));
  const match = withoutExt.match(/^(\d+(?:\.\d+)?)\s*[-.]?\s*(.+)$/);
  if (match) {
    return { sortKey: parseFloat(match[1]), title: match[2].trim() };
  }
  return { sortKey: Infinity, title: withoutExt.trim() };
}

function findVideoFiles(dir) {
  const results = [];
  function walk(current) {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (VIDEO_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
        results.push(full);
      }
    }
  }
  walk(dir);
  return results;
}

function getDurationSeconds(filePath) {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err || !data?.format?.duration) {
        console.warn(`  ⚠️  No se pudo leer duración de ${basename(filePath)}: ${err?.message ?? "sin datos"}`);
        resolve(0);
        return;
      }
      resolve(Math.round(data.format.duration));
    });
  });
}

function formatBytes(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ── Main ─────────────────────────────────────────────────────────────────────

/**
 * Sube todos los videos encontrados (recursivamente) en `assetsDir` a R2 y
 * crea el curso + lecciones correspondientes en Supabase.
 *
 * @param {object} config
 * @param {string} config.assetsDir       Carpeta local con los videos (buscados recursivamente)
 * @param {string} config.courseFolder    Prefijo/carpeta en R2 para los videos de este curso
 * @param {string} config.slug            Slug único del curso
 * @param {string} config.title           Título del curso
 * @param {string} config.description     Descripción del curso
 * @param {string} config.categorySlug    Slug de la categoría (debe existir en `categories`)
 * @param {boolean} [config.isFree=false] Si el curso completo es gratis
 * @param {boolean} [config.firstLessonFree=true] Si la primera lección es gratis (preview)
 */
export async function uploadModule(config) {
  const {
    assetsDir,
    courseFolder,
    slug,
    title,
    description,
    categorySlug,
    isFree = false,
    firstLessonFree = true,
  } = config;

  const DRY_RUN = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";

  const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
  const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY_ID;
  const R2_SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY;
  const R2_BUCKET = process.env.R2_BUCKET_NAME ?? "alliance-lms";
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY || !R2_SECRET_KEY) {
    console.error("❌ Faltan credenciales de R2 en .env.local (R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY).");
    process.exit(1);
  }
  if (!DRY_RUN && (!SUPABASE_URL || !SUPABASE_KEY)) {
    console.error("❌ Faltan credenciales de Supabase en .env.local (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
    console.error("   Corré con DRY_RUN=1 si solo querés previsualizar el plan.");
    process.exit(1);
  }

  let stat;
  try {
    stat = statSync(assetsDir);
  } catch {
    console.error(`❌ No existe la carpeta: ${assetsDir}`);
    console.error("   Editá ASSETS_DIR en este script para que apunte a la carpeta local donde extrajiste el ZIP.");
    process.exit(1);
  }
  if (!stat.isDirectory()) {
    console.error(`❌ ${assetsDir} no es una carpeta.`);
    process.exit(1);
  }

  const files = findVideoFiles(assetsDir);
  if (files.length === 0) {
    console.error(`❌ No se encontraron videos (${[...VIDEO_EXTENSIONS].join(", ")}) dentro de ${assetsDir}`);
    process.exit(1);
  }

  const lessons = files
    .map((filePath) => {
      const filename = basename(filePath);
      const { sortKey, title: parsedTitle } = parseFilename(filename);
      return { filePath, filename, sortKey, title: parsedTitle };
    })
    .sort((a, b) => a.sortKey - b.sortKey || a.filename.localeCompare(b.filename))
    .map((lesson, index) => ({ ...lesson, order: index + 1 }));

  console.log(`\n📦 Módulo: ${title} (${slug})`);
  console.log(`📁 Carpeta local: ${assetsDir}`);
  console.log(`🗂️  Carpeta R2: ${courseFolder}/`);
  console.log(`🏷️  Categoría: ${categorySlug}`);
  console.log(`${DRY_RUN ? "🧪 DRY RUN — no se sube ni se escribe nada" : "🚀 Modo real — se sube y se escribe en producción"}\n`);
  console.log(`📋 ${lessons.length} lecciones detectadas (orden por nombre de archivo):\n`);
  for (const l of lessons) {
    const size = formatBytes(statSync(l.filePath).size);
    console.log(`  ${String(l.order).padStart(2, "0")}. ${l.title}  [${relative(assetsDir, l.filePath)}, ${size}]`);
  }
  console.log();

  if (DRY_RUN) {
    console.log("🧪 DRY RUN: no se subió nada a R2 ni se escribió nada en Supabase.");
    console.log("   Corré de nuevo sin DRY_RUN=1 cuando el listado de arriba esté correcto.\n");
    return;
  }

  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY, secretAccessKey: R2_SECRET_KEY },
  });
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  async function uploadVideo(filePath, key) {
    const body = readFileSync(filePath);
    await s3.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: "video/mp4",
    }));
  }

  console.log("🚀 Subiendo videos a R2...\n");
  const uploaded = [];
  for (const l of lessons) {
    const videoKey = `${courseFolder}/${l.filename}`;
    console.log(`  ⬆️  [${l.order}/${lessons.length}] ${l.filename} → ${videoKey}`);
    await uploadVideo(l.filePath, videoKey);
    const duration = await getDurationSeconds(l.filePath);
    uploaded.push({ ...l, videoKey, duration });
    console.log(`     ✅ subido (${duration}s)`);
  }

  console.log("\n📝 Insertando curso en Supabase...\n");

  const { data: course, error: courseErr } = await supabase
    .from("courses")
    .insert({
      slug,
      title,
      description,
      is_free: isFree,
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
  console.log(`✅ Curso creado: ${course.id}`);

  const { data: cat } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", categorySlug)
    .maybeSingle();

  if (cat) {
    await supabase.from("course_categories").insert({ course_id: course.id, category_id: cat.id });
    console.log(`✅ Categoría '${categorySlug}' asignada.`);
  } else {
    console.warn(`⚠️  No se encontró la categoría '${categorySlug}' — revisá el slug en la tabla categories.`);
  }

  console.log("\n📝 Insertando lecciones...\n");
  for (const l of uploaded) {
    const lessonSlug = `${slug}-${String(l.order).padStart(2, "0")}-${slugify(l.title)}`;
    const { error } = await supabase.from("lessons").insert({
      course_id: course.id,
      slug: lessonSlug,
      title: l.title,
      sort_order: l.order,
      is_free: firstLessonFree && l.order === 1,
      video_url: l.videoKey,
      duration: l.duration,
    });

    if (error) {
      console.error(`  ❌ Error lección "${l.title}":`, error.message);
    } else {
      console.log(`  ✅ Lección ${l.order}: ${l.title} (${l.duration}s)`);
    }
  }

  console.log("\n🎉 Todo listo! El módulo ya está en producción.");
  console.log(`   URL: https://alliancebaireslearningcenter.com/modulos/${slug}\n`);
}
