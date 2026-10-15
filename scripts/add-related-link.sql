-- Correr en Supabase → SQL Editor
-- Permite que una lección muestre un link (o un texto "próximamente" si todavía
-- no existe el destino) hacia otro sistema/curso, ej. "K Guard → X Guard".
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS related_label text;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS related_course_slug text;
