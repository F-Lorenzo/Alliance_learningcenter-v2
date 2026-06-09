import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffmpeg from "fluent-ffmpeg";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import { createWriteStream, readFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { pipeline } from "stream/promises";
import { Readable } from "stream";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET     = process.env.R2_BUCKET_NAME ?? "alliance-lms";
const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY, secretAccessKey: R2_SECRET_KEY },
});
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const TMP = "scripts/tmp-thumbs";
if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true });

// Los 6 cursos con su primer video
const COURSES = [
  { slug: "pasaje-toreando",       firstVideo: "PASAJE GUARDIA ABIERTA/1.0 Introduccion.mov" },
  { slug: "pasaje-over-under",     firstVideo: "PASAJE GUARDIA ABIERTA/3.1 Over Under.mov" },
  { slug: "pasaje-smash",          firstVideo: "PASAJE GUARDIA ABIERTA/4.1 Smash.mov" },
  { slug: "pasaje-rodilla-cruzada",firstVideo: "PASAJE GUARDIA ABIERTA/5.1 Rodilla cruzada.mov" },
  { slug: "pasaje-emborcada",      firstVideo: "PASAJE GUARDIA ABIERTA/6.1 Emborcada y acompaño con roll.mov" },
  { slug: "pasaje-leg-drag",       firstVideo: "PASAJE GUARDIA ABIERTA/7.1 Leg drag.mov" },
];

async function downloadVideoChunk(videoKey, localPath) {
  console.log(`  ⬇️  Descargando fragmento de: ${videoKey}`);
  const { Body } = await s3.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: videoKey }));
  const writeStream = createWriteStream(localPath);
  await pipeline(Readable.from(Body), writeStream);
}

function extractFrame(videoPath, outputPath, timeSeconds = 8) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .seekInput(timeSeconds)
      .frames(1)
      .output(outputPath)
      .on("end", resolve)
      .on("error", reject)
      .run();
  });
}

async function uploadThumbnail(localPath, thumbKey) {
  const body = readFileSync(localPath);
  await s3.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: thumbKey,
    Body: body,
    ContentType: "image/jpeg",
  }));
}

for (const course of COURSES) {
  console.log(`\n📦 ${course.slug}`);

  const videoLocal = join(TMP, `${course.slug}.mov`);
  const thumbLocal = join(TMP, `${course.slug}.jpg`);
  const thumbKey   = `thumbnails/${course.slug}.jpg`;

  try {
    await downloadVideoChunk(course.firstVideo, videoLocal);
    console.log(`  🎬 Extrayendo frame a los 8s...`);
    await extractFrame(videoLocal, thumbLocal, 8);
    console.log(`  ⬆️  Subiendo thumbnail...`);
    await uploadThumbnail(thumbLocal, thumbKey);

    // Actualizar curso en Supabase
    const { error } = await sb.from("courses").update({ thumbnail_url: thumbKey }).eq("slug", course.slug);
    if (error) console.error(`  ❌ Supabase:`, error.message);
    else console.log(`  ✅ Thumbnail asignado: ${thumbKey}`);
  } catch (err) {
    console.error(`  ❌ Error:`, err.message);
  }
}

console.log("\n🎉 ¡Thumbnails generados y asignados!");
