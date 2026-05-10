// Extrae thumbnails de cada curso y los sube a R2
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createClient } from '@supabase/supabase-js';
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const FFMPEG = 'C:/Users/facun/Desktop/ffmpeg/bin/ffmpeg.exe';
const ACCOUNT_ID = '9d96bfb4b9fb302b777fb978c01022e3';
const BUCKET = 'alliance-lms';

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const supabase = createClient(
  process.env.SUPABASE_URL ?? 'https://xwjxwbbbjiwfsthykcao.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY // service role key — set in env, never hardcode
);

const TMP = os.tmpdir();

async function getSignedVideoUrl(key) {
  return getSignedUrl(r2, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn: 3600 });
}

async function extractFrame(videoUrl, outputPath) {
  // ffmpeg lee solo los primeros segundos del stream HTTP — no descarga el video completo
  execFileSync(FFMPEG, [
    '-ss', '00:00:04',       // seek a 4 segundos
    '-i', videoUrl,          // input: URL firmada de R2
    '-frames:v', '1',        // solo 1 frame
    '-q:v', '2',             // calidad alta JPEG
    '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:black',
    '-y',                    // overwrite output
    outputPath,
  ], { timeout: 60000 });    // 60s max
}

async function uploadThumbnail(localPath, r2Key) {
  const data = fs.readFileSync(localPath);
  await r2.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: r2Key,
    Body: data,
    ContentType: 'image/jpeg',
  }));
}

async function main() {
  // Obtener todos los cursos con su primer video
  const { data: courses, error } = await supabase
    .from('courses')
    .select(`
      id, slug, title,
      lessons(id, video_url, sort_order)
    `)
    .eq('is_published', true)
    .order('title');

  if (error) throw error;

  console.log(`Procesando ${courses.length} cursos...\n`);

  for (const course of courses) {
    // Ordenar lecciones y tomar la primera con video
    const lessons = (course.lessons || [])
      .filter(l => l.video_url && !l.video_url.startsWith('http'))
      .sort((a, b) => a.sort_order - b.sort_order);

    if (lessons.length === 0) {
      console.log(`⚠️  ${course.title}: sin videos, skip`);
      continue;
    }

    const firstLesson = lessons[0];
    const thumbKey = `thumbnails/${course.slug}.jpg`;
    const tmpFile = path.join(TMP, `thumb_${course.slug}.jpg`);

    try {
      console.log(`📹 ${course.title} → ${firstLesson.video_url}`);

      // 1. Signed URL del video
      const videoUrl = await getSignedVideoUrl(firstLesson.video_url);

      // 2. Extraer frame con ffmpeg
      extractFrame(videoUrl, tmpFile);

      // 3. Subir a R2
      await uploadThumbnail(tmpFile, thumbKey);

      // 4. Actualizar thumbnail_url en DB
      const { error: updateError } = await supabase
        .from('courses')
        .update({ thumbnail_url: thumbKey })
        .eq('id', course.id);

      if (updateError) throw updateError;

      console.log(`   ✅ Guardado: ${thumbKey}`);

      // Limpiar tmp
      fs.unlinkSync(tmpFile);

    } catch (err) {
      console.error(`   ❌ Error: ${err.message}`);
    }
  }

  console.log('\n=== LISTO ===');
}

main().catch(console.error);
