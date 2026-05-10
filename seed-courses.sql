-- ============================================================
-- SEED: 10 cursos de Alliance Learning Center
-- Mapea videos del bucket R2 (alliance-lms) a cada lección
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. CATEGORÍAS (upsert por slug)
INSERT INTO categories (id, name, slug, sort_order)
VALUES
  (gen_random_uuid(), 'Guardia',               'guardia',               1),
  (gen_random_uuid(), 'Espalda',               'espalda',               2),
  (gen_random_uuid(), 'Pasajes',               'pasajes',               3),
  (gen_random_uuid(), 'Sistema de Posiciones', 'sistema-de-posiciones', 4),
  (gen_random_uuid(), 'Controles',             'controles',             5)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 2. CURSOS
-- ============================================================
INSERT INTO courses (id, slug, title, description, thumbnail_url, is_free, is_published, is_new, is_featured, total_duration, created_at)
VALUES

-- 1. Dominios de Espalda
('11111111-0001-0000-0000-000000000000',
 'dominios-de-espalda',
 'Dominios de Espalda',
 'Sistema completo para dominar la posición de espalda: conceptos, mantenimientos, rolls y ataques.',
 '2025/10/Espalda-scaled.png',
 false, true, true, true,
 0, now() - interval '10 days'),

-- 2. Doble Pull
('11111111-0002-0000-0000-000000000000',
 'doble-pull',
 'Doble Pull',
 'Aprende a sacar ventaja del doble pull: leg drags, outside hooks, austin hook y más.',
 '2025/10/Doble-Pull-scaled.png',
 false, true, false, false,
 0, now() - interval '9 days'),

-- 3. Berimbolo
('11111111-0003-0000-0000-000000000000',
 'berimbolo',
 'Berimbolo',
 'Sistema de berimbolo completo: entradas, variaciones Z y ataques de finalización.',
 null,
 false, true, false, false,
 0, now() - interval '8 days'),

-- 4. 50/50
('11111111-0004-0000-0000-000000000000',
 '50-50',
 '50/50',
 'Dominio de la guardia 50/50: conceptos, ataques y pasajes.',
 '2025/10/5050-scaled.png',
 false, true, false, false,
 0, now() - interval '7 days'),

-- 5. Pasaje con Dominio Propio
('11111111-0005-0000-0000-000000000000',
 'pasaje-con-dominio-propio',
 'Pasaje con Dominio Propio',
 'Pasaje eficiente usando el dominio propio: parándose y abrazando cintura.',
 '2025/10/Pasaje-vs-DLR-scaled.png',
 false, true, false, false,
 0, now() - interval '6 days'),

-- 6. Crucifijo
('11111111-0006-0000-0000-000000000000',
 'crucifijo',
 'Crucifijo',
 'Sistema completo del crucifijo: dominios, defensas, over-under y ataques desde la posición.',
 '2025/10/Crucifijo-scaled.png',
 false, true, false, false,
 0, now() - interval '5 days'),

-- 7. DLR Invertida
('11111111-0007-0000-0000-000000000000',
 'dlr-invertida',
 'DLR Invertida',
 'Guardia De La Riva Invertida: ataques con omoplata, triángulo, raspajes y emborcadas.',
 '2025/10/Reverse-DLR-scaled.png',
 false, true, false, false,
 0, now() - interval '4 days'),

-- 8. Pasaje Guardia Aranha
('11111111-0008-0000-0000-000000000000',
 'pasaje-guardia-aranha',
 'Pasaje Guardia Aranha',
 'Cómo pasar y jugar la guardia aranha: entrada, llamado desde parado y desde guardia cerrada.',
 '2025/10/Guardia-Aranha-scaled.png',
 false, true, false, false,
 0, now() - interval '3 days'),

-- 9. Guardia One Leg
('11111111-0009-0000-0000-000000000000',
 'guardia-one-leg',
 'Guardia One Leg',
 'Pasaje de la guardia one leg: identificación de dominios, defensas y técnicas de paso.',
 '2025/10/One-Leg-scaled.png',
 false, true, false, false,
 0, now() - interval '2 days'),

-- 10. X-Guard
('11111111-0010-0000-0000-000000000000',
 'x-guard',
 'X-Guard',
 'Guardia DLR y X-Guard: dominios, desequilibrios, ataques y berimbolo básico.',
 '2025/10/X-Guard-scaled.png',
 false, true, false, false,
 0, now() - interval '1 day')

ON CONFLICT (slug) DO UPDATE SET
  title          = EXCLUDED.title,
  description    = EXCLUDED.description,
  thumbnail_url  = EXCLUDED.thumbnail_url,
  is_published   = EXCLUDED.is_published;

-- ============================================================
-- 3. LECCIONES (limpiar las de estos cursos primero para evitar duplicados)
-- ============================================================
DELETE FROM lessons WHERE course_id IN (
  '11111111-0001-0000-0000-000000000000',
  '11111111-0002-0000-0000-000000000000',
  '11111111-0003-0000-0000-000000000000',
  '11111111-0004-0000-0000-000000000000',
  '11111111-0005-0000-0000-000000000000',
  '11111111-0006-0000-0000-000000000000',
  '11111111-0007-0000-0000-000000000000',
  '11111111-0008-0000-0000-000000000000',
  '11111111-0009-0000-0000-000000000000',
  '11111111-0010-0000-0000-000000000000'
);

-- ── CURSO 1: Dominios de Espalda (11 lecciones) ──────────────
INSERT INTO lessons (id, course_id, slug, title, sort_order, is_free, video_url, duration)
VALUES
  (gen_random_uuid(), '11111111-0001-0000-0000-000000000000', 'des-intro',         'Introducción',                                   1,  true,  '2025/06/introduccion-dominio-espalda1.mp4',              0),
  (gen_random_uuid(), '11111111-0001-0000-0000-000000000000', 'des-1-1',           'Dominios con el adversario de 4 apoyos',          2,  false, '2025/06/1.1-Dominios-con-el-adversario-de-4-apoyos.mp4', 0),
  (gen_random_uuid(), '11111111-0001-0000-0000-000000000000', 'des-1-2',           'Dominios con el adversario boca arriba',           3,  false, '2025/06/1.2-Dominios-con-el-adversario-boca-arriba.mp4', 0),
  (gen_random_uuid(), '11111111-0001-0000-0000-000000000000', 'des-2-1',           'De 4 apoyos',                                     4,  false, '2025/06/2.1-De-4-apoyos.mp4',                           0),
  (gen_random_uuid(), '11111111-0001-0000-0000-000000000000', 'des-2-2',           'Desde 4 apoyos — Twister hook',                   5,  false, '2025/06/2.2-Desde-4-apoyos-twister-hook.mp4',           0),
  (gen_random_uuid(), '11111111-0001-0000-0000-000000000000', 'des-3-1',           'Roll sobre mismo hombro (con dominio de brazo)',   6,  false, '2025/06/3.1-Roll-sobre-mismo-hombro-con-dominio-de-brazo.mp4', 0),
  (gen_random_uuid(), '11111111-0001-0000-0000-000000000000', 'des-3-2',           'Roll sobre mismo hombro (sin dominio de brazo)',   7,  false, '2025/06/3.2-Roll-sobre-el-mismo-hombro-sin-dominio-de-brazo.mp4', 0),
  (gen_random_uuid(), '11111111-0001-0000-0000-000000000000', 'des-3-3',           'Roll sobre hombro opuesto — contraataque',         8,  false, '2025/06/3.3-Roll-sobre-hombro-opuesto-contraataque.mp4', 0),
  (gen_random_uuid(), '11111111-0001-0000-0000-000000000000', 'des-3-4',           'Si se viene para arriba mío',                     9,  false, '2025/06/3.4-Si-se-viene-para-arriba-mio.mp4',            0),
  (gen_random_uuid(), '11111111-0001-0000-0000-000000000000', 'des-4-1',           'Llave de brazo de 4 apoyos (1)',                  10,  false, '2025/06/4.1-Llave-de-brazo-de-4-apoyos-1.mp4',          0),
  (gen_random_uuid(), '11111111-0001-0000-0000-000000000000', 'des-4-2',           'Llave de brazo de 4 apoyos (2)',                  11,  false, '2025/06/4.2-Llave-de-brazo-de-4-apoyos-2.mp4',          0)
ON CONFLICT DO NOTHING;

-- ── CURSO 2: Doble Pull (8 lecciones) ────────────────────────
INSERT INTO lessons (id, course_id, slug, title, sort_order, is_free, video_url, duration)
VALUES
  (gen_random_uuid(), '11111111-0002-0000-0000-000000000000', 'dp-intro',   'Introducción',                                     1, true,  '2025/06/introduccion-doble-pull.mp4',                               0),
  (gen_random_uuid(), '11111111-0002-0000-0000-000000000000', 'dp-2-1',     'Leg Drag',                                         2, false, '2025/06/2.1-LegDrag.mov',                                           0),
  (gen_random_uuid(), '11111111-0002-0000-0000-000000000000', 'dp-2-2',     'Outside hook vs oponente pesado',                  3, false, '2025/06/2.2-outside-hook-a-100kg.mov',                              0),
  (gen_random_uuid(), '11111111-0002-0000-0000-000000000000', 'dp-2-4',     'Outside hook a espalda',                           4, false, '2025/06/2.4-outside-hook-a-espalda.mov',                            0),
  (gen_random_uuid(), '11111111-0002-0000-0000-000000000000', 'dp-2-5a',    'Austin hook',                                      5, false, '2025/06/2.5-austin-hook.mov',                                       0),
  (gen_random_uuid(), '11111111-0002-0000-0000-000000000000', 'dp-2-5b',    'Iceberg Leg Drag',                                 6, false, '2025/06/2.5-Iceberg-Legdrag.mp4',                                   0),
  (gen_random_uuid(), '11111111-0002-0000-0000-000000000000', 'dp-sl-1',    'Defendiendo single leg (cabeza hacia adentro)',    7, false, '2025/06/2.2.1-Defendiendo-el-single-leg-con-cabeza-hacia-adentro.mp4', 0),
  (gen_random_uuid(), '11111111-0002-0000-0000-000000000000', 'dp-sl-2',    'Defendiendo single leg (cabeza hacia afuera)',     8, false, '2025/06/2.2.2-Defendiendo-el-singleleg-con-cabeza-hacia-afuera.mp4',  0)
ON CONFLICT DO NOTHING;

-- ── CURSO 3: Berimbolo (8 lecciones) ─────────────────────────
INSERT INTO lessons (id, course_id, slug, title, sort_order, is_free, video_url, duration)
VALUES
  (gen_random_uuid(), '11111111-0003-0000-0000-000000000000', 'beri-intro',  'Introducción',                           1, true,  '2025/06/1.0-Introduccion.mp4',                       0),
  (gen_random_uuid(), '11111111-0003-0000-0000-000000000000', 'beri-3-1',    'Berimbolo básico',                       2, false, '2025/06/3.1-berimbolo.mov',                          0),
  (gen_random_uuid(), '11111111-0003-0000-0000-000000000000', 'beri-z-ld',   'Berimbolo Z — Leg Drag',                 3, false, '2025/06/Berimbolo-z-legdrag.mp4',                    0),
  (gen_random_uuid(), '11111111-0003-0000-0000-000000000000', 'beri-z-tw',   'Berimbolo Z — Twister hook',             4, false, '2025/06/Berimbolo-z-twister-hook.mp4',               0),
  (gen_random_uuid(), '11111111-0003-0000-0000-000000000000', 'beri-z-esp',  'Berimbolo Z — Espalda',                  5, false, '2025/06/Berimbolo-z-espalda.mov',                    0),
  (gen_random_uuid(), '11111111-0003-0000-0000-000000000000', 'beri-s2s',    'Side to side cuando defiende',           6, false, '2025/06/Berimbolo-side-to-side-cuando-defiende.mov', 0),
  (gen_random_uuid(), '11111111-0003-0000-0000-000000000000', 'beri-llg',    'Llave de brazo con giro',                7, false, '2025/08/1.1-LLave-de-brazo-con-giro.mov',            0),
  (gen_random_uuid(), '11111111-0003-0000-0000-000000000000', 'beri-lli',    'Llave de brazo invertida',               8, false, '2025/08/1.2 Llave de brazo invertida.mov',           0)
ON CONFLICT DO NOTHING;

-- ── CURSO 4: 50/50 (6 lecciones) ─────────────────────────────
INSERT INTO lessons (id, course_id, slug, title, sort_order, is_free, video_url, duration)
VALUES
  (gen_random_uuid(), '11111111-0004-0000-0000-000000000000', '5050-intro',  'Introducción',               1, true,  '2025/06/1.0-Introduccion-1.mov',          0),
  (gen_random_uuid(), '11111111-0004-0000-0000-000000000000', '5050-bot',    'Botita',                     2, false, '2025/06/4.1-botita.mp4',                  0),
  (gen_random_uuid(), '11111111-0004-0000-0000-000000000000', '5050-smash',  'Smash',                      3, false, '2025/06/4.1-Smash.mov',                   0),
  (gen_random_uuid(), '11111111-0004-0000-0000-000000000000', '5050-s-mon',  'Smash a montada',            4, false, '2025/06/4.2-Smash-a-montada.mp4',         0),
  (gen_random_uuid(), '11111111-0004-0000-0000-000000000000', '5050-s-med',  'Smash medialuna a espalda',  5, false, '2025/06/4.3-Smash-medialuna-a-espalda.mp4', 0),
  (gen_random_uuid(), '11111111-0004-0000-0000-000000000000', '5050-esp',    'A espalda',                  6, false, '2025/06/a-espalda.mp4',                   0)
ON CONFLICT DO NOTHING;

-- ── CURSO 5: Pasaje con Dominio Propio (2 lecciones) ─────────
INSERT INTO lessons (id, course_id, slug, title, sort_order, is_free, video_url, duration)
VALUES
  (gen_random_uuid(), '11111111-0005-0000-0000-000000000000', 'pdp-2-1', 'Pasaje parándose',                       1, true,  '2025/06/2.1-Pasaje-parandose-1.mov',                 0),
  (gen_random_uuid(), '11111111-0005-0000-0000-000000000000', 'pdp-2-2', 'Pasaje parándose cuando me atan',         2, false, '2025/06/2.2-Pasaje-parandose-2-cuando-me-atan.mp4',  0)
ON CONFLICT DO NOTHING;

-- ── CURSO 6: Crucifijo (17 lecciones) ────────────────────────
INSERT INTO lessons (id, course_id, slug, title, sort_order, is_free, video_url, duration)
VALUES
  (gen_random_uuid(), '11111111-0006-0000-0000-000000000000', 'cruc-intro',  'Introducción',                                     1, true,  '2025/06/Introduccion.mov',                                          0),
  (gen_random_uuid(), '11111111-0006-0000-0000-000000000000', 'cruc-1-1',    'Principales dominios',                              2, false, '2025/06/1.1-Principales-Dominios.mov',                              0),
  (gen_random_uuid(), '11111111-0006-0000-0000-000000000000', 'cruc-3-1',    'Defensa lado derecho — almohada',                   3, false, '2025/06/3.1-Defensa-Lado-derecho-almohada.mp4',                     0),
  (gen_random_uuid(), '11111111-0006-0000-0000-000000000000', 'cruc-3-2a',   'Defensa lado izquierdo (1)',                        4, false, '2025/06/3.2-Defensa-lado-izquierdo-1.mov',                          0),
  (gen_random_uuid(), '11111111-0006-0000-0000-000000000000', 'cruc-3-3a',   'Defensa lado izquierdo (2)',                        5, false, '2025/06/3.3-Defensa-lado-izquierdo-21.mp4',                         0),
  (gen_random_uuid(), '11111111-0006-0000-0000-000000000000', 'cruc-3-4a',   'Defensa lado izquierdo (3)',                        6, false, '2025/06/3.4-Defensa-lado-izquierdo-3.mov',                          0),
  (gen_random_uuid(), '11111111-0006-0000-0000-000000000000', 'cruc-ou-1',   'Over-Under: si hay frame',                          7, false, '2025/06/3.2-Over-Under-si-hay-frame.mov',                           0),
  (gen_random_uuid(), '11111111-0006-0000-0000-000000000000', 'cruc-ou-2',   'Over-Under: si defiende levantando la cadera',     8, false, '2025/06/3.3-Over-Under-si-defiende-levantando-la-cadera.mp4',      0),
  (gen_random_uuid(), '11111111-0006-0000-0000-000000000000', 'cruc-4-1',    'Ataque derecho — robando brazo y mataléon',        9, false, '2025/06/4.1-Ataque-lado-derecho-Robando-brazo-y-mataleon.mov',     0),
  (gen_random_uuid(), '11111111-0006-0000-0000-000000000000', 'cruc-4-2',    'Ataque izquierdo — robando brazo y arco',          10, false, '2025/06/4.2-Ataque-lado-izquierdo-Robando-brazo-y-arco-.mp4',      0),
  (gen_random_uuid(), '11111111-0006-0000-0000-000000000000', 'cruc-4-3',    'Amague, Armlock y Arco y Flecha',                  11, false, '2025/06/4.3-Ataque-lado-izquierdo-Amague-Armlock-Arco-y-Flecha.mov', 0),
  (gen_random_uuid(), '11111111-0006-0000-0000-000000000000', 'cruc-4-4',    'Mano de vaca y estrangulamiento una mano',         12, false, '2025/06/4.4-Mano-de-vaca-y-estrangulamiento-con-una-mano-sola.mp4', 0),
  (gen_random_uuid(), '11111111-0006-0000-0000-000000000000', 'cruc-4-5',    'Corta papel',                                      13, false, '2025/06/4.5-Corta-papel.mp4',                                      0),
  (gen_random_uuid(), '11111111-0006-0000-0000-000000000000', 'cruc-4-6',    'Estrangulación con mano y solapa',                 14, false, '2025/06/4.6-Estrangulacion-con-Mano-y-solapa.mp4',                 0),
  (gen_random_uuid(), '11111111-0006-0000-0000-000000000000', 'cruc-4-7',    'Estrangulamiento con ambas solapas',               15, false, '2025/06/4.7-estrangulamiento-con-ambas-solapas.mp4',               0),
  (gen_random_uuid(), '11111111-0006-0000-0000-000000000000', 'cruc-4-8',    'Llave de brazo (adversario boca arriba)',          16, false, '2025/06/4.8-Llave-de-brazo-con-el-adversario-boca-arriba.mp4',    0),
  (gen_random_uuid(), '11111111-0006-0000-0000-000000000000', 'cruc-4-9',    'Transición a estrangulamiento de reloj',           17, false, '2025/06/4.9-transicion-a-estrangulamiento-de-reloj.mp4',           0)
ON CONFLICT DO NOTHING;

-- ── CURSO 7: DLR Invertida (5 lecciones) ─────────────────────
INSERT INTO lessons (id, course_id, slug, title, sort_order, is_free, video_url, duration)
VALUES
  (gen_random_uuid(), '11111111-0007-0000-0000-000000000000', 'dlri-omo',   'Omoplata',                        1, true,  '2025/06/3.2.1.2-Omoplata.mp4',                    0),
  (gen_random_uuid(), '11111111-0007-0000-0000-000000000000', 'dlri-rasp',  'Raspaje transicionando a X',       2, false, '2025/06/3.2.1.5-Raspaje-transicionando-a-X.mov',  0),
  (gen_random_uuid(), '11111111-0007-0000-0000-000000000000', 'dlri-tri',   'Triángulo',                       3, false, '2025/06/3.3.1.5-Triangulo.mov',                   0),
  (gen_random_uuid(), '11111111-0007-0000-0000-000000000000', 'dlri-emb1',  'Emborcada y acompaño con roll',   4, false, '2025/06/6.1-Emborcada-y-acompano-con-roll.mp4',   0),
  (gen_random_uuid(), '11111111-0007-0000-0000-000000000000', 'dlri-emb2',  'Emborcada y leg drag',            5, false, '2025/06/6.2-Emborcada-y-leg-drag.mp4',            0)
ON CONFLICT DO NOTHING;

-- ── CURSO 8: Pasaje Guardia Aranha (4 lecciones) ─────────────
INSERT INTO lessons (id, course_id, slug, title, sort_order, is_free, video_url, duration)
VALUES
  (gen_random_uuid(), '11111111-0008-0000-0000-000000000000', 'ara-intro',  'Introducción guardia aranha',          1, true,  '2025/06/1.0-Introduccion_guardia_aranha.mp4',     0),
  (gen_random_uuid(), '11111111-0008-0000-0000-000000000000', 'ara-1-1',    'Cómo llamar desde parado',              2, false, '2025/06/1.1-como-llamar-desde-parado.mov',        0),
  (gen_random_uuid(), '11111111-0008-0000-0000-000000000000', 'ara-1-2',    'Desde guardia cerrada',                 3, false, '2025/06/1.2-desde-guardia-cerrada_1.mp4',         0),
  (gen_random_uuid(), '11111111-0008-0000-0000-000000000000', 'ara-2-4',    'Pasaje sentado con pie en araña',       4, false, '2025/06/2.4-Pasaje-sentado-con-pie-en-arana.mov', 0)
ON CONFLICT DO NOTHING;

-- ── CURSO 9: Guardia One Leg (5 lecciones) ───────────────────
-- Usa la carpeta organizada 2025/pasaje one leg/
INSERT INTO lessons (id, course_id, slug, title, sort_order, is_free, video_url, duration)
VALUES
  (gen_random_uuid(), '11111111-0009-0000-0000-000000000000', 'oleg-intro', 'Introducción — Identificación de dominios',      1, true,  '2025/pasaje one leg/1. Introduccion - Identificacion de dominios.mp4', 0),
  (gen_random_uuid(), '11111111-0009-0000-0000-000000000000', 'oleg-def',   'Defensas',                                       2, false, '2025/pasaje one leg/2. Defensas.mp4',                                  0),
  (gen_random_uuid(), '11111111-0009-0000-0000-000000000000', 'oleg-3-1',   'Sacando el pie de la cadera — Step Over',        3, false, '2025/pasaje one leg/3.1 - Sacando el pie de la cadera - Step Over.mp4', 0),
  (gen_random_uuid(), '11111111-0009-0000-0000-000000000000', 'oleg-3-2',   'Sacando el gancho — Rodilla cruzada',            4, false, '2025/pasaje one leg/3.2 - Sacando el gancho - rodilla cruzada.mp4',    0),
  (gen_random_uuid(), '11111111-0009-0000-0000-000000000000', 'oleg-3-3',   'Sacando el gancho — Berimbolo',                  5, false, '2025/pasaje one leg/3.3 - Sacando el gancho - Berimbolo.mp4',          0)
ON CONFLICT DO NOTHING;

-- ── CURSO 10: X-Guard (14 lecciones) ─────────────────────────
-- Usa la carpeta organizada 2025/guadia dlr/ (DLR + X-Guard combinados)
INSERT INTO lessons (id, course_id, slug, title, sort_order, is_free, video_url, duration)
VALUES
  (gen_random_uuid(), '11111111-0010-0000-0000-000000000000', 'xg-1-1',   'Introducción y dominios',                             1, true,  '2025/guadia dlr/1.1 Introduccion y Dominios.mov',                            0),
  (gen_random_uuid(), '11111111-0010-0000-0000-000000000000', 'xg-1-2',   'Mantenimientos',                                      2, false, '2025/guadia dlr/1.2 Mantenimientos.mp4',                                     0),
  (gen_random_uuid(), '11111111-0010-0000-0000-000000000000', 'xg-1-3',   'Desequilibrios',                                      3, false, '2025/guadia dlr/1.3 Desequilibrios.mov',                                     0),
  (gen_random_uuid(), '11111111-0010-0000-0000-000000000000', 'xg-2-1',   'Triángulo',                                           4, false, '2025/guadia dlr/2.1 Triangulo.mp4',                                          0),
  (gen_random_uuid(), '11111111-0010-0000-0000-000000000000', 'xg-2-2',   'Armlock',                                             5, false, '2025/guadia dlr/2.2 - Armlock.mov',                                          0),
  (gen_random_uuid(), '11111111-0010-0000-0000-000000000000', 'xg-2-3',   'Espalda',                                             6, false, '2025/guadia dlr/2.3 - Espalda.mov',                                          0),
  (gen_random_uuid(), '11111111-0010-0000-0000-000000000000', 'xg-3-1',   'Delariva X — bloqueo manga y raspaje a la derecha',   7, false, '2025/guadia dlr/3.1 - Delariva X, bloqueo manga y raspo a la derecha..mov', 0),
  (gen_random_uuid(), '11111111-0010-0000-0000-000000000000', 'xg-3-2',   'Delariva X — raspaje a la izquierda',                 8, false, '2025/guadia dlr/3.2 - Delariva X, raspo a la izquierda.mov',                0),
  (gen_random_uuid(), '11111111-0010-0000-0000-000000000000', 'xg-3-3',   'Delariva X — Babybolo',                               9, false, '2025/guadia dlr/3.3 - Delariva X, Babybolo.mov',                            0),
  (gen_random_uuid(), '11111111-0010-0000-0000-000000000000', 'xg-3-4',   'Sit up y traba al pie cuando me salta la pierna',    10, false, '2025/guadia dlr/3.4 Sit up y traba al pie cuando me salta la pierna.mov',  0),
  (gen_random_uuid(), '11111111-0010-0000-0000-000000000000', 'xg-4-1',   'Leg drag desde DLR Z',                               11, false, '2025/guadia dlr/4.1 - Legdrag desde Dlr Z.mp4',                             0),
  (gen_random_uuid(), '11111111-0010-0000-0000-000000000000', 'xg-4-2',   'Sentando y berimbolo básico',                        12, false, '2025/guadia dlr/4.2 - Sentando y Berimbolo Basico.mp4',                     0),
  (gen_random_uuid(), '11111111-0010-0000-0000-000000000000', 'xg-4-3',   'Sentando — libero pierna para omoplata/armlock',     13, false, '2025/guadia dlr/4.3 - Sentando y Libero Pierna para OmoplataArmlock.mp4', 0),
  (gen_random_uuid(), '11111111-0010-0000-0000-000000000000', 'xg-4-4',   'Kimura',                                             14, false, '2025/guadia dlr/4.4 - Kimura.mov',                                          0)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 4. RELACIONES CURSO–CATEGORÍA
-- ============================================================
-- Asegura que existan las categorías necesarias (idempotente)
DO $$
DECLARE
  v_guardia uuid;
  v_espalda uuid;
  v_pasajes uuid;
  v_sistema uuid;
  v_controles uuid;
BEGIN
  SELECT id INTO v_guardia   FROM categories WHERE slug = 'guardia'               LIMIT 1;
  SELECT id INTO v_espalda   FROM categories WHERE slug = 'espalda'               LIMIT 1;
  SELECT id INTO v_pasajes   FROM categories WHERE slug = 'pasajes'               LIMIT 1;
  SELECT id INTO v_sistema   FROM categories WHERE slug = 'sistema-de-posiciones' LIMIT 1;
  SELECT id INTO v_controles FROM categories WHERE slug = 'controles'             LIMIT 1;

  -- Curso 1: Dominios de Espalda → Controles, Espalda
  INSERT INTO course_categories (course_id, category_id) VALUES
    ('11111111-0001-0000-0000-000000000000', v_controles),
    ('11111111-0001-0000-0000-000000000000', v_espalda)
  ON CONFLICT DO NOTHING;

  -- Curso 2: Doble Pull → Guardia
  INSERT INTO course_categories (course_id, category_id) VALUES
    ('11111111-0002-0000-0000-000000000000', v_guardia)
  ON CONFLICT DO NOTHING;

  -- Curso 3: Berimbolo → Sistema de Posiciones
  INSERT INTO course_categories (course_id, category_id) VALUES
    ('11111111-0003-0000-0000-000000000000', v_sistema)
  ON CONFLICT DO NOTHING;

  -- Curso 4: 50/50 → Guardia
  INSERT INTO course_categories (course_id, category_id) VALUES
    ('11111111-0004-0000-0000-000000000000', v_guardia)
  ON CONFLICT DO NOTHING;

  -- Curso 5: Pasaje con Dominio Propio → Pasajes
  INSERT INTO course_categories (course_id, category_id) VALUES
    ('11111111-0005-0000-0000-000000000000', v_pasajes)
  ON CONFLICT DO NOTHING;

  -- Curso 6: Crucifijo → Espalda, Sistema de Posiciones
  INSERT INTO course_categories (course_id, category_id) VALUES
    ('11111111-0006-0000-0000-000000000000', v_espalda),
    ('11111111-0006-0000-0000-000000000000', v_sistema)
  ON CONFLICT DO NOTHING;

  -- Curso 7: DLR Invertida → Guardia
  INSERT INTO course_categories (course_id, category_id) VALUES
    ('11111111-0007-0000-0000-000000000000', v_guardia)
  ON CONFLICT DO NOTHING;

  -- Curso 8: Pasaje Guardia Aranha → Pasajes
  INSERT INTO course_categories (course_id, category_id) VALUES
    ('11111111-0008-0000-0000-000000000000', v_pasajes)
  ON CONFLICT DO NOTHING;

  -- Curso 9: Guardia One Leg → Guardia
  INSERT INTO course_categories (course_id, category_id) VALUES
    ('11111111-0009-0000-0000-000000000000', v_guardia)
  ON CONFLICT DO NOTHING;

  -- Curso 10: X-Guard → Guardia
  INSERT INTO course_categories (course_id, category_id) VALUES
    ('11111111-0010-0000-0000-000000000000', v_guardia)
  ON CONFLICT DO NOTHING;

END $$;

-- ============================================================
-- 5. PENDIENTES (ejecutar manualmente si no fue hecho antes)
-- ============================================================
-- ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
-- ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('super_admin','admin','admin_profesor','profesor','user'));
-- ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS description TEXT;
-- DELETE FROM public.instructors;
