-- SEED COMPLETO: 21 cursos Alliance Learning Center
-- Ejecutar en Supabase SQL Editor

-- 1. LIMPIAR datos anteriores por slug (orden importa por FK)
DELETE FROM lessons
WHERE course_id IN (SELECT id FROM courses WHERE slug IN (
  '50-50',
  'berimbolo',
  'control-lateral',
  'crucifijo',
  'dlr-invertida',
  'doble-pull',
  'dominios-de-espalda',
  'guardia-aranha',
  'guardia-cerrada',
  'guardia-de-ganchos',
  'guardia-dlr',
  'guardia-one-leg',
  'lapela',
  'lucha-de-pie',
  'media-guardia',
  'montada',
  'pasaje-aranha',
  'pasaje-guardia-abierta',
  'pasaje-one-leg',
  'pasajes-dlr',
  'x-guard'
));

DELETE FROM course_categories
WHERE course_id IN (SELECT id FROM courses WHERE slug IN (
  '50-50',
  'berimbolo',
  'control-lateral',
  'crucifijo',
  'dlr-invertida',
  'doble-pull',
  'dominios-de-espalda',
  'guardia-aranha',
  'guardia-cerrada',
  'guardia-de-ganchos',
  'guardia-dlr',
  'guardia-one-leg',
  'lapela',
  'lucha-de-pie',
  'media-guardia',
  'montada',
  'pasaje-aranha',
  'pasaje-guardia-abierta',
  'pasaje-one-leg',
  'pasajes-dlr',
  'x-guard'
));

DELETE FROM courses WHERE slug IN (
  '50-50',
  'berimbolo',
  'control-lateral',
  'crucifijo',
  'dlr-invertida',
  'doble-pull',
  'dominios-de-espalda',
  'guardia-aranha',
  'guardia-cerrada',
  'guardia-de-ganchos',
  'guardia-dlr',
  'guardia-one-leg',
  'lapela',
  'lucha-de-pie',
  'media-guardia',
  'montada',
  'pasaje-aranha',
  'pasaje-guardia-abierta',
  'pasaje-one-leg',
  'pasajes-dlr',
  'x-guard'
);

-- 2. CATEGORÍAS
INSERT INTO categories (id, name, slug, sort_order)
VALUES
  (gen_random_uuid(), 'Guardia', 'guardia', 1),
  (gen_random_uuid(), 'Sistema de Posiciones', 'sistema-de-posiciones', 2),
  (gen_random_uuid(), 'Controles', 'controles', 3),
  (gen_random_uuid(), 'Espalda', 'espalda', 4),
  (gen_random_uuid(), 'Lucha de Pie', 'lucha-de-pie', 5),
  (gen_random_uuid(), 'Pasajes', 'pasajes', 6)
ON CONFLICT (slug) DO NOTHING;

-- 3. CURSOS (IDs fijos para referenciar en lecciones)
INSERT INTO courses (id, slug, title, thumbnail_url, is_free, is_published, is_new, is_featured, total_duration, created_at)
VALUES
  ('AAAAAAAA-0001-0000-0000-000000000000', '50-50', '50/50', '2025/10/5050-scaled.png', false, true, false, false, 0, now() - interval '21 days'),
  ('AAAAAAAA-0002-0000-0000-000000000000', 'berimbolo', 'Berimbolo', NULL, false, true, false, false, 0, now() - interval '20 days'),
  ('AAAAAAAA-0003-0000-0000-000000000000', 'control-lateral', 'Control Lateral', '2025/10/Control-Lateral-scaled.png', false, true, false, false, 0, now() - interval '19 days'),
  ('AAAAAAAA-0004-0000-0000-000000000000', 'crucifijo', 'Crucifijo', '2025/10/Crucifijo-scaled.png', false, true, false, false, 0, now() - interval '18 days'),
  ('AAAAAAAA-0005-0000-0000-000000000000', 'dlr-invertida', 'DLR Invertida', '2025/10/Reverse-DLR-scaled.png', false, true, false, false, 0, now() - interval '17 days'),
  ('AAAAAAAA-0006-0000-0000-000000000000', 'doble-pull', 'Doble Pull', '2025/10/Doble-Pull-scaled.png', false, true, false, false, 0, now() - interval '16 days'),
  ('AAAAAAAA-0007-0000-0000-000000000000', 'dominios-de-espalda', 'Dominios de Espalda', '2025/10/Espalda-scaled.png', false, true, false, false, 0, now() - interval '15 days'),
  ('AAAAAAAA-0008-0000-0000-000000000000', 'guardia-aranha', 'Guardia Aranha', '2025/10/Guardia-Aranha-scaled.png', false, true, false, false, 0, now() - interval '14 days'),
  ('AAAAAAAA-0009-0000-0000-000000000000', 'guardia-cerrada', 'Guardia Cerrada', '2025/10/Guardia-Cerrada-scaled.png', false, true, false, false, 0, now() - interval '13 days'),
  ('AAAAAAAA-0010-0000-0000-000000000000', 'guardia-de-ganchos', 'Guardia de Ganchos', '2025/10/Guardia-De-ganchos.png', false, true, false, false, 0, now() - interval '12 days'),
  ('AAAAAAAA-0011-0000-0000-000000000000', 'guardia-dlr', 'Guardia DLR', '2025/10/Reverse-DLR-scaled.png', false, true, false, false, 0, now() - interval '11 days'),
  ('AAAAAAAA-0012-0000-0000-000000000000', 'guardia-one-leg', 'Guardia One Leg', '2025/10/One-Leg-scaled.png', false, true, false, false, 0, now() - interval '10 days'),
  ('AAAAAAAA-0013-0000-0000-000000000000', 'lapela', 'Lapela', '2025/10/Lapela-scaled.png', false, true, false, false, 0, now() - interval '9 days'),
  ('AAAAAAAA-0014-0000-0000-000000000000', 'lucha-de-pie', 'Lucha de Pie', '2025/10/Lucha-de-pie-scaled.png', false, true, false, false, 0, now() - interval '8 days'),
  ('AAAAAAAA-0015-0000-0000-000000000000', 'media-guardia', 'Media Guardia', '2025/10/Media-Guardia-scaled.png', false, true, false, false, 0, now() - interval '7 days'),
  ('AAAAAAAA-0016-0000-0000-000000000000', 'montada', 'Montada', '2025/10/Montada-scaled.png', false, true, false, false, 0, now() - interval '6 days'),
  ('AAAAAAAA-0017-0000-0000-000000000000', 'pasaje-aranha', 'Pasaje Aranha', '2025/10/Guardia-Aranha-scaled.png', false, true, false, false, 0, now() - interval '5 days'),
  ('AAAAAAAA-0018-0000-0000-000000000000', 'pasaje-guardia-abierta', 'Pasaje Guardia Abierta', '2025/10/Pasaje-vs-DLR-scaled.png', false, true, false, false, 0, now() - interval '4 days'),
  ('AAAAAAAA-0019-0000-0000-000000000000', 'pasaje-one-leg', 'Pasaje One Leg', '2025/10/Pasaje-one-leg-scaled.png', false, true, false, false, 0, now() - interval '3 days'),
  ('AAAAAAAA-0020-0000-0000-000000000000', 'pasajes-dlr', 'Pasajes DLR', '2025/10/Pasaje-vs-DLR-scaled.png', false, true, false, false, 0, now() - interval '2 days'),
  ('AAAAAAAA-0021-0000-0000-000000000000', 'x-guard', 'X-Guard', '2025/10/X-Guard-scaled.png', false, true, false, false, 0, now() - interval '1 days');

-- 4. LECCIONES
INSERT INTO lessons (id, course_id, slug, title, sort_order, is_free, video_url, duration) VALUES
  (gen_random_uuid(), 'AAAAAAAA-0001-0000-0000-000000000000', '50-50-01-1.0-introduccion', '1.0 Introduccion', 1, true, '5050/1.0 Introduccion.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0001-0000-0000-000000000000', '50-50-02-2.1-pasaje-parandose-1', '2.1 Pasaje parandose 1', 2, false, '5050/2.1 Pasaje parandose 1.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0001-0000-0000-000000000000', '50-50-03-2.2-pasaje-parandose-2-cuando-me-atan', '2.2 Pasaje parandose 2 (cuando me atan)', 3, false, '5050/2.2 Pasaje parandose 2 (cuando me atan).mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0001-0000-0000-000000000000', '50-50-04-2.3-pasaje-abrazando-cintura', '2.3 Pasaje abrazando cintura', 4, false, '5050/2.3 Pasaje abrazando cintura.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0001-0000-0000-000000000000', '50-50-05-2.4-pasaje-sentado-con-pie-en-arana', '2.4 Pasaje sentado con pie en araña', 5, false, '5050/2.4 Pasaje sentado con pie en araña.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0001-0000-0000-000000000000', '50-50-06-2.5-iceberg-legdrag', '2.5 Iceberg Legdrag', 6, false, '5050/2.5 Iceberg Legdrag.mov', 0);

INSERT INTO lessons (id, course_id, slug, title, sort_order, is_free, video_url, duration) VALUES
  (gen_random_uuid(), 'AAAAAAAA-0002-0000-0000-000000000000', 'berimbolo-01-a-espalda', 'A espalda', 1, true, 'BERIMBOLO/A espalda.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0002-0000-0000-000000000000', 'berimbolo-02-berimbolo-side-to-side-cuando-defiende', 'Berimbolo side to side cuando defiende', 2, false, 'BERIMBOLO/Berimbolo side to side cuando defiende.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0002-0000-0000-000000000000', 'berimbolo-03-berimbolo-z-espalda', 'Berimbolo z   espalda', 3, false, 'BERIMBOLO/Berimbolo z - espalda.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0002-0000-0000-000000000000', 'berimbolo-04-berimbolo-z-legdrag', 'Berimbolo z   legdrag', 4, false, 'BERIMBOLO/Berimbolo z - legdrag.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0002-0000-0000-000000000000', 'berimbolo-05-berimbolo-z-twister-hook', 'Berimbolo z   twister hook', 5, false, 'BERIMBOLO/Berimbolo z - twister hook.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0002-0000-0000-000000000000', 'berimbolo-06-introduccion', 'Introduccion', 6, false, 'BERIMBOLO/Introduccion.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0002-0000-0000-000000000000', 'berimbolo-07-montada', 'Montada', 7, false, 'BERIMBOLO/Montada.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0002-0000-0000-000000000000', 'berimbolo-08-superman-pass', 'Superman pass', 8, false, 'BERIMBOLO/Superman pass.mov', 0);

INSERT INTO lessons (id, course_id, slug, title, sort_order, is_free, video_url, duration) VALUES
  (gen_random_uuid(), 'AAAAAAAA-0003-0000-0000-000000000000', 'control-lateral-01-1.0-introduccion-y-dominios', '1.0 Introduccion y Dominios', 1, true, 'CONTROL LATERAL/1.0 Introduccion y Dominios.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0003-0000-0000-000000000000', 'control-lateral-02-1.1-llave-de-brazo-con-giro', '1.1 LLave de brazo con giro', 2, false, 'CONTROL LATERAL/1.1 LLave de brazo con giro.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0003-0000-0000-000000000000', 'control-lateral-03-1.2-llave-de-brazo-invertida', '1.2 Llave de brazo invertida', 3, false, 'CONTROL LATERAL/1.2 Llave de brazo invertida.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0003-0000-0000-000000000000', 'control-lateral-04-2.1-llave-de-brazo', '2.1 llave de brazo', 4, false, 'CONTROL LATERAL/2.1 llave de brazo.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0003-0000-0000-000000000000', 'control-lateral-05-2.2-kimura', '2.2 kimura', 5, false, 'CONTROL LATERAL/2.2 kimura.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0003-0000-0000-000000000000', 'control-lateral-06-2.3-corta-papel', '2.3 Corta papel', 6, false, 'CONTROL LATERAL/2.3 Corta papel.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0003-0000-0000-000000000000', 'control-lateral-07-4.1-estrangulamiento', '4.1 Estrangulamiento', 7, false, 'CONTROL LATERAL/4.1 Estrangulamiento.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0003-0000-0000-000000000000', 'control-lateral-08-4.2-llave-de-brazo', '4.2 llave de brazo', 8, false, 'CONTROL LATERAL/4.2 llave de brazo.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0003-0000-0000-000000000000', 'control-lateral-09-4.3-llave-de-brazo-girando', '4.3 Llave de brazo girando', 9, false, 'CONTROL LATERAL/4.3 Llave de brazo girando.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0003-0000-0000-000000000000', 'control-lateral-10-5.1-corta-papel', '5.1 Corta papel', 10, false, 'CONTROL LATERAL/5.1 Corta papel.mov', 0);

INSERT INTO lessons (id, course_id, slug, title, sort_order, is_free, video_url, duration) VALUES
  (gen_random_uuid(), 'AAAAAAAA-0004-0000-0000-000000000000', 'crucifijo-01-1.0-introduccion', '1.0 Introduccion', 1, true, 'CRUCIFIJO/1.0 Introduccion.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0004-0000-0000-000000000000', 'crucifijo-02-1.1-dominios-con-el-adversario-de-4-apoyos', '1.1 Dominios con el adversario de 4 apoyos', 2, false, 'CRUCIFIJO/1.1 Dominios con el adversario de 4 apoyos.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0004-0000-0000-000000000000', 'crucifijo-03-1.2-dominios-con-el-adversario-boca-arriba', '1.2 Dominios con el adversario boca arriba', 3, false, 'CRUCIFIJO/1.2 Dominios con el adversario boca arriba.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0004-0000-0000-000000000000', 'crucifijo-04-2.1-de-4-apoyos', '2.1 De 4 apoyos', 4, false, 'CRUCIFIJO/2.1 De 4 apoyos.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0004-0000-0000-000000000000', 'crucifijo-05-2.2.1-defendiendo-el-single-leg-con-cabeza-hacia-adentro', '2.2.1 Defendiendo el single leg con cabeza hacia adentro', 5, false, 'CRUCIFIJO/2.2.1 Defendiendo el single leg con cabeza hacia adentro.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0004-0000-0000-000000000000', 'crucifijo-06-2.2.2-defendiendo-el-singleleg-con-cabeza-hacia-afuera', '2.2.2 Defendiendo el singleleg con cabeza hacia  afuera', 6, false, 'CRUCIFIJO/2.2.2 Defendiendo el singleleg con cabeza hacia  afuera.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0004-0000-0000-000000000000', 'crucifijo-07-3.1-roll-sobre-mismo-hombro-con-dominio-de-brazo', '3.1 Roll sobre mismo hombro con dominio de brazo', 7, false, 'CRUCIFIJO/3.1 Roll sobre mismo hombro con dominio de brazo.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0004-0000-0000-000000000000', 'crucifijo-08-3.2-roll-sobre-el-mismo-hombro-sin-dominio-de-brazo', '3.2 Roll sobre el mismo hombro sin dominio de brazo', 8, false, 'CRUCIFIJO/3.2 Roll sobre el mismo hombro sin dominio de brazo.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0004-0000-0000-000000000000', 'crucifijo-09-3.3-roll-sobre-hombro-opuesto-contraataque', '3.3 Roll sobre hombro opuesto (contraataque)', 9, false, 'CRUCIFIJO/3.3 Roll sobre hombro opuesto (contraataque).mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0004-0000-0000-000000000000', 'crucifijo-10-3.4-si-se-viene-para-arriba-mio', '3.4 Si se viene para arriba mio', 10, false, 'CRUCIFIJO/3.4 Si se viene para arriba mio.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0004-0000-0000-000000000000', 'crucifijo-11-4.1-llave-de-brazo-de-4-apoyos-1', '4.1 Llave de brazo de 4 apoyos 1', 11, false, 'CRUCIFIJO/4.1 Llave de brazo de 4 apoyos 1.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0004-0000-0000-000000000000', 'crucifijo-12-4.2-llave-de-brazo-de-4-apoyos-2', '4.2 Llave de brazo de 4 apoyos 2', 12, false, 'CRUCIFIJO/4.2 Llave de brazo de 4 apoyos 2.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0004-0000-0000-000000000000', 'crucifijo-13-4.3-matalon-de-4-apoyos', '4.3 Matalón de 4 apoyos', 13, false, 'CRUCIFIJO/4.3 Matalón de 4 apoyos.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0004-0000-0000-000000000000', 'crucifijo-14-4.4-mano-de-vaca-y-estrangulamiento-con-una-mano-sola', '4.4 Mano de vaca y estrangulamiento con una mano sola', 14, false, 'CRUCIFIJO/4.4 Mano de vaca y estrangulamiento con una mano sola.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0004-0000-0000-000000000000', 'crucifijo-15-4.5-corta-papel', '4.5 Corta papel', 15, false, 'CRUCIFIJO/4.5 Corta papel.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0004-0000-0000-000000000000', 'crucifijo-16-4.6-estrangulacion-con-mano-y-solapa', '4.6 Estrangulacion con  Mano y solapa', 16, false, 'CRUCIFIJO/4.6 Estrangulacion con  Mano y solapa.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0004-0000-0000-000000000000', 'crucifijo-17-4.7-estrangulamiento-con-ambas-solapas', '4.7 estrangulamiento con ambas solapas', 17, false, 'CRUCIFIJO/4.7 estrangulamiento con ambas solapas.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0004-0000-0000-000000000000', 'crucifijo-18-4.8-llave-de-brazo-con-el-adversario-boca-arriba', '4.8 Llave de brazo con el adversario boca arriba', 18, false, 'CRUCIFIJO/4.8 Llave de brazo con el adversario boca arriba.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0004-0000-0000-000000000000', 'crucifijo-19-4.9-transicion-a-estrangulamiento-de-reloj', '4.9 transicion a estrangulamiento de  reloj', 19, false, 'CRUCIFIJO/4.9 transicion a estrangulamiento de  reloj.mp4', 0);

INSERT INTO lessons (id, course_id, slug, title, sort_order, is_free, video_url, duration) VALUES
  (gen_random_uuid(), 'AAAAAAAA-0005-0000-0000-000000000000', 'dlr-invertida-01-1.-conceptos-distancia-frame', '1. Conceptos   Distancia   Frame', 1, true, 'DLR INVERTIDA/1. Conceptos - Distancia - Frame.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0005-0000-0000-000000000000', 'dlr-invertida-02-2.1-overhead-sweep', '2.1   Overhead Sweep', 2, false, 'DLR INVERTIDA/2.1 - Overhead Sweep.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0005-0000-0000-000000000000', 'dlr-invertida-03-2.2-entrada-a-la-x', '2.2   Entrada a la X', 3, false, 'DLR INVERTIDA/2.2 - Entrada a la X.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0005-0000-0000-000000000000', 'dlr-invertida-04-2.3-kiss-of-dragon', '2.3   Kiss Of Dragon', 4, false, 'DLR INVERTIDA/2.3 - Kiss Of Dragon.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0005-0000-0000-000000000000', 'dlr-invertida-05-2.4-kiss-of-dragon-twister-hook', '2.4   Kiss of dragon + Twister Hook', 5, false, 'DLR INVERTIDA/2.4 - Kiss of dragon + Twister Hook.mp4', 0);

INSERT INTO lessons (id, course_id, slug, title, sort_order, is_free, video_url, duration) VALUES
  (gen_random_uuid(), 'AAAAAAAA-0006-0000-0000-000000000000', 'doble-pull-01-1.0-introduccion', '1.0 Introduccion', 1, true, 'DOBLE PULL/1.0 Introduccion.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0006-0000-0000-000000000000', 'doble-pull-02-1.1-principales-dominios', '1.1 Principales Dominios', 2, false, 'DOBLE PULL/1.1 Principales Dominios.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0006-0000-0000-000000000000', 'doble-pull-03-2.1-legdrag', '2.1 LegDrag', 3, false, 'DOBLE PULL/2.1 LegDrag.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0006-0000-0000-000000000000', 'doble-pull-04-2.2-outside-hook-a-100kg', '2.2 outside hook a 100kg', 4, false, 'DOBLE PULL/2.2 outside hook a 100kg.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0006-0000-0000-000000000000', 'doble-pull-05-2.4-outside-hook-a-espalda', '2.4 outside hook a espalda', 5, false, 'DOBLE PULL/2.4 outside hook a espalda.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0006-0000-0000-000000000000', 'doble-pull-06-2.5-austin-hook', '2.5 austin hook', 6, false, 'DOBLE PULL/2.5 austin hook.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0006-0000-0000-000000000000', 'doble-pull-07-3.1-berimbolo', '3.1 berimbolo', 7, false, 'DOBLE PULL/3.1 berimbolo.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0006-0000-0000-000000000000', 'doble-pull-08-4.1-botita', '4.1 botita', 8, false, 'DOBLE PULL/4.1 botita.mov', 0);

INSERT INTO lessons (id, course_id, slug, title, sort_order, is_free, video_url, duration) VALUES
  (gen_random_uuid(), 'AAAAAAAA-0007-0000-0000-000000000000', 'dominios-de-esp-01-1.0-introduccion-y-dominios', '1.0 Introduccion y dominios', 1, true, 'DOMINIOS ESPALDA/1.0 Introduccion y dominios.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0007-0000-0000-000000000000', 'dominios-de-esp-02-2.1-desde-4-apoyos', '2.1 Desde 4 apoyos', 2, false, 'DOMINIOS ESPALDA/2.1 Desde 4 apoyos.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0007-0000-0000-000000000000', 'dominios-de-esp-03-2.2-desde-4-apoyos-twister-hook', '2.2 Desde 4 apoyos twister hook', 3, false, 'DOMINIOS ESPALDA/2.2 Desde 4 apoyos twister hook.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0007-0000-0000-000000000000', 'dominios-de-esp-04-3.1-defensa-lado-derecho-almohada', '3.1   Defensa Lado derecho (almohada)', 4, false, 'DOMINIOS ESPALDA/3.1 - Defensa Lado derecho (almohada).mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0007-0000-0000-000000000000', 'dominios-de-esp-05-3.2-defensa-lado-izquierdo-1', '3.2   Defensa lado izquierdo 1', 5, false, 'DOMINIOS ESPALDA/3.2 - Defensa lado izquierdo 1.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0007-0000-0000-000000000000', 'dominios-de-esp-06-3.3-defensa-lado-izquierdo-2', '3.3   Defensa lado izquierdo 2', 6, false, 'DOMINIOS ESPALDA/3.3 - Defensa lado izquierdo 2.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0007-0000-0000-000000000000', 'dominios-de-esp-07-3.4-defensa-lado-izquierdo-3', '3.4   Defensa lado izquierdo 3', 7, false, 'DOMINIOS ESPALDA/3.4 - Defensa lado izquierdo 3.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0007-0000-0000-000000000000', 'dominios-de-esp-08-4.1-ataque-lado-derecho-robando-brazo-y-mataleon', '4.1   Ataque lado derecho (Robando brazo y mataleon)', 8, false, 'DOMINIOS ESPALDA/4.1 - Ataque lado derecho (Robando brazo y mataleon).mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0007-0000-0000-000000000000', 'dominios-de-esp-09-4.2-ataque-lado-izquierdo-robando-brazo-y-arco-y-flecha', '4.2   Ataque lado izquierdo (Robando brazo y arco y flecha)', 9, false, 'DOMINIOS ESPALDA/4.2 - Ataque lado izquierdo (Robando brazo y arco y flecha).mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0007-0000-0000-000000000000', 'dominios-de-esp-10-4.3-ataque-lado-izquierdo-amague-armlock-arco-y-flecha', '4.3   Ataque lado izquierdo (Amague Armlock + Arco y Flecha)', 10, false, 'DOMINIOS ESPALDA/4.3 - Ataque lado izquierdo (Amague Armlock + Arco y Flecha).mov', 0);

INSERT INTO lessons (id, course_id, slug, title, sort_order, is_free, video_url, duration) VALUES
  (gen_random_uuid(), 'AAAAAAAA-0008-0000-0000-000000000000', 'guardia-aranha-01-1.0-introduccion', '1.0 Introduccion', 1, true, 'GUARDIA ARANHA/1.0 Introduccion.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0008-0000-0000-000000000000', 'guardia-aranha-02-1.1-como-llamar-desde-parado', '1.1 como llamar desde parado', 2, false, 'GUARDIA ARANHA/1.1 como llamar desde parado.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0008-0000-0000-000000000000', 'guardia-aranha-03-1.2-desde-guardia-cerrada', '1.2 desde guardia cerrada', 3, false, 'GUARDIA ARANHA/1.2 desde guardia cerrada.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0008-0000-0000-000000000000', 'guardia-aranha-04-2.1-manteniendo-el-adversario-adelante-y-utilizacion-del-las', '2.1 Manteniendo el adversario adelante y utilizacion del laso', 4, false, 'GUARDIA ARANHA/2.1 Manteniendo el adversario adelante y utilizacion del laso.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0008-0000-0000-000000000000', 'guardia-aranha-05-3.1.2.1-mano-talon-y-gancho', '3.1.2.1 Mano talón y gancho', 5, false, 'GUARDIA ARANHA/3.1.2.1 Mano talón y gancho.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0008-0000-0000-000000000000', 'guardia-aranha-06-3.1.2.2-tripode', '3.1.2.2 tripode', 6, false, 'GUARDIA ARANHA/3.1.2.2 tripode.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0008-0000-0000-000000000000', 'guardia-aranha-07-3.1.2.3-balao', '3.1.2.3 Balão', 7, false, 'GUARDIA ARANHA/3.1.2.3 Balão.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0008-0000-0000-000000000000', 'guardia-aranha-08-3.1.2.3-si-camina-lado-errado', '3.1.2.3 Si camina Lado errado', 8, false, 'GUARDIA ARANHA/3.1.2.3 Si camina Lado errado.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0008-0000-0000-000000000000', 'guardia-aranha-09-3.1.2.4-si-camina-lado-correcto', '3.1.2.4 Si camina Lado correcto', 9, false, 'GUARDIA ARANHA/3.1.2.4 Si camina Lado correcto.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0008-0000-0000-000000000000', 'guardia-aranha-10-3.2-pie-en-el-biceps-conceptos-y-desequilibrios', '3.2 Pie en el bíceps   Conceptos y Desequilibrios', 10, false, 'GUARDIA ARANHA/3.2 Pie en el bíceps - Conceptos y Desequilibrios.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0008-0000-0000-000000000000', 'guardia-aranha-11-3.2.1.1-raspaje-1', '3.2.1.1 Raspaje 1', 11, false, 'GUARDIA ARANHA/3.2.1.1 Raspaje 1.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0008-0000-0000-000000000000', 'guardia-aranha-12-3.2.1.2-omoplata', '3.2.1.2 Omoplata', 12, false, 'GUARDIA ARANHA/3.2.1.2 Omoplata.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0008-0000-0000-000000000000', 'guardia-aranha-13-3.2.1.3-triangulo', '3.2.1.3 Triangulo', 13, false, 'GUARDIA ARANHA/3.2.1.3 Triangulo.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0008-0000-0000-000000000000', 'guardia-aranha-14-3.2.1.4-raspaje-con-dlr-profunda', '3.2.1.4 Raspaje con dlr profunda', 14, false, 'GUARDIA ARANHA/3.2.1.4 Raspaje con dlr profunda.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0008-0000-0000-000000000000', 'guardia-aranha-15-3.2.1.5-raspaje-transicionando-a-x', '3.2.1.5 Raspaje transicionando a X', 15, false, 'GUARDIA ARANHA/3.2.1.5 Raspaje transicionando a X.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0008-0000-0000-000000000000', 'guardia-aranha-16-3.2.2.1-lo-hago-caminar', '3.2.2.1 Lo hago caminar', 16, false, 'GUARDIA ARANHA/3.2.2.1 Lo hago caminar.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0008-0000-0000-000000000000', 'guardia-aranha-17-3.2.2.2-con-peso-hacia-atras', '3.2.2.2 Con peso hacia atrás', 17, false, 'GUARDIA ARANHA/3.2.2.2 Con peso hacia atrás.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0008-0000-0000-000000000000', 'guardia-aranha-18-3.2.2.3-apoya-rodilla-lejana', '3.2.2.3 Apoya rodilla lejana', 18, false, 'GUARDIA ARANHA/3.2.2.3 Apoya rodilla lejana.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0008-0000-0000-000000000000', 'guardia-aranha-19-3.2.2.4-si-da-el-paso-en-lugar-de-apoyar-rodilla', '3.2.2.4 Si da el paso en lugar de apoyar rodilla', 19, false, 'GUARDIA ARANHA/3.2.2.4 Si da el paso en lugar de apoyar rodilla.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0008-0000-0000-000000000000', 'guardia-aranha-20-3.2.2.5-transicion-y-raspaje-de-x', '3.2.2.5 Transicion y raspaje de X', 20, false, 'GUARDIA ARANHA/3.2.2.5 Transicion y raspaje de X.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0008-0000-0000-000000000000', 'guardia-aranha-21-3.3.1.1-raspaje-1-si-me-lo-puedo-cargar', '3.3.1.1 Raspaje 1 si me lo puedo cargar', 21, false, 'GUARDIA ARANHA/3.3.1.1 Raspaje 1 si me lo puedo cargar.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0008-0000-0000-000000000000', 'guardia-aranha-22-3.3.1.2-raspaje-2-si-el-peso-queda-a-mitad-de-camino', '3.3.1.2 Raspaje 2 si el peso queda a mitad de camino', 22, false, 'GUARDIA ARANHA/3.3.1.2 Raspaje 2 si el peso queda a mitad de camino.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0008-0000-0000-000000000000', 'guardia-aranha-23-3.3.1.3-llave-de-biceps', '3.3.1.3 Llave de biceps', 23, false, 'GUARDIA ARANHA/3.3.1.3 Llave de biceps.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0008-0000-0000-000000000000', 'guardia-aranha-24-3.3.1.4-omoplata-con-roll', '3.3.1.4 Omoplata con roll', 24, false, 'GUARDIA ARANHA/3.3.1.4 Omoplata con roll.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0008-0000-0000-000000000000', 'guardia-aranha-25-3.3.1.5-triangulo', '3.3.1.5 Triangulo', 25, false, 'GUARDIA ARANHA/3.3.1.5 Triangulo.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0008-0000-0000-000000000000', 'guardia-aranha-26-3.3.2.1-balao', '3.3.2.1 Balao', 26, false, 'GUARDIA ARANHA/3.3.2.1 Balao.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0008-0000-0000-000000000000', 'guardia-aranha-27-3.3.2.2-omoplata', '3.3.2.2 Omoplata', 27, false, 'GUARDIA ARANHA/3.3.2.2 Omoplata.mov', 0);

INSERT INTO lessons (id, course_id, slug, title, sort_order, is_free, video_url, duration) VALUES
  (gen_random_uuid(), 'AAAAAAAA-0009-0000-0000-000000000000', 'guardia-cerrada-01-1.0-introduccion-como-llegar', '1.0 Introduccion   Como Llegar', 1, true, 'GUARDIA CERRADA/1.0 Introduccion - Como Llegar.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0009-0000-0000-000000000000', 'guardia-cerrada-02-2.1-versus-defensa-colando-la-rodilla', '2.1   Versus Defensa Colando la rodilla', 2, false, 'GUARDIA CERRADA/2.1 - Versus Defensa Colando la rodilla.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0009-0000-0000-000000000000', 'guardia-cerrada-03-2.2-cuando-se-para', '2.2   Cuando se para', 3, false, 'GUARDIA CERRADA/2.2 - Cuando se para.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0009-0000-0000-000000000000', 'guardia-cerrada-04-3.1-omoplata', '3.1   Omoplata', 4, false, 'GUARDIA CERRADA/3.1 - Omoplata.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0009-0000-0000-000000000000', 'guardia-cerrada-05-3.2-triangulo-invertido-kimura', '3.2   Triangulo Invertido + Kimura', 5, false, 'GUARDIA CERRADA/3.2 - Triangulo Invertido + Kimura.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0009-0000-0000-000000000000', 'guardia-cerrada-06-3.3-triangulo-invertido-a-triangulo', '3.3   Triangulo Invertido a Triangulo', 6, false, 'GUARDIA CERRADA/3.3 - Triangulo Invertido a Triangulo.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0009-0000-0000-000000000000', 'guardia-cerrada-07-3.4-triangulo', '3.4   Triangulo', 7, false, 'GUARDIA CERRADA/3.4 - Triangulo.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0009-0000-0000-000000000000', 'guardia-cerrada-08-3.5-combo-armlock-omoplata', '3.5   Combo Armlock   Omoplata', 8, false, 'GUARDIA CERRADA/3.5 - Combo Armlock - Omoplata.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0009-0000-0000-000000000000', 'guardia-cerrada-09-4.1-armdrag-a-la-espalda', '4.1   Armdrag a la espalda', 9, false, 'GUARDIA CERRADA/4.1 - Armdrag a la espalda.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0009-0000-0000-000000000000', 'guardia-cerrada-10-4.2-armdrag-a-inversion-de-pendulo', '4.2   Armdrag a Inversión de pendulo', 10, false, 'GUARDIA CERRADA/4.2 - Armdrag a Inversión de pendulo.mov', 0);

INSERT INTO lessons (id, course_id, slug, title, sort_order, is_free, video_url, duration) VALUES
  (gen_random_uuid(), 'AAAAAAAA-0010-0000-0000-000000000000', 'guardia-de-ganc-01-0.0-introduccion', '0.0 Introduccion', 1, true, 'GUARDIA DE GANCHOS/0.0 Introduccion.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0010-0000-0000-000000000000', 'guardia-de-ganc-02-1.1-desde-parado', '1.1 Desde parado', 2, false, 'GUARDIA DE GANCHOS/1.1 Desde parado.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0010-0000-0000-000000000000', 'guardia-de-ganc-03-2.1.1-raspaje-dominando-manga', '2.1.1 Raspaje dominando manga', 3, false, 'GUARDIA DE GANCHOS/2.1.1 Raspaje dominando manga.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0010-0000-0000-000000000000', 'guardia-de-ganc-04-2.1.2.-si-levanta-la-pierna-para-defender', '2.1.2. Si levanta la pierna para defender', 4, false, 'GUARDIA DE GANCHOS/2.1.2. Si levanta la pierna para defender.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0010-0000-0000-000000000000', 'guardia-de-ganc-05-2.1.3.-si-levanta-la-pierna-lejos-del-pie', '2.1.3. Si levanta la pierna lejos del pie', 5, false, 'GUARDIA DE GANCHOS/2.1.3. Si levanta la pierna lejos del pie.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0010-0000-0000-000000000000', 'guardia-de-ganc-06-2.2.1.-transicion-a-guardia-x', '2.2.1. Transición a Guardia X', 6, false, 'GUARDIA DE GANCHOS/2.2.1. Transición a Guardia X.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0010-0000-0000-000000000000', 'guardia-de-ganc-07-2.2.2-si-pesa-para-atras', '2.2.2 Si pesa para atrás', 7, false, 'GUARDIA DE GANCHOS/2.2.2 Si pesa para atrás.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0010-0000-0000-000000000000', 'guardia-de-ganc-08-2.2.3-si-pesa-para-atras-2da-opcion', '2.2.3 Si pesa para atrás 2da opción', 8, false, 'GUARDIA DE GANCHOS/2.2.3 Si pesa para atrás 2da opción.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0010-0000-0000-000000000000', 'guardia-de-ganc-09-3.1.1.-llave-de-brazo', '3.1.1. Llave de brazo', 9, false, 'GUARDIA DE GANCHOS/3.1.1. Llave de brazo.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0010-0000-0000-000000000000', 'guardia-de-ganc-10-3.1.2.-pasaje-a-la-espalda', '3.1.2. Pasaje a la espalda', 10, false, 'GUARDIA DE GANCHOS/3.1.2. Pasaje a la espalda.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0010-0000-0000-000000000000', 'guardia-de-ganc-11-3.1.3.-cuando-no-puedo-liberar-mis-pies', '3.1.3. Cuando no puedo liberar mis pies', 11, false, 'GUARDIA DE GANCHOS/3.1.3. Cuando no puedo liberar mis pies.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0010-0000-0000-000000000000', 'guardia-de-ganc-12-3.1.4.-transicion-a-guardia-x-a-una-pierna', '3.1.4. Transición a Guardia X a una pierna', 12, false, 'GUARDIA DE GANCHOS/3.1.4. Transición a Guardia X a una pierna.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0010-0000-0000-000000000000', 'guardia-de-ganc-13-4.1.1-agarrando-triceps', '4.1.1 Agarrando tríceps', 13, false, 'GUARDIA DE GANCHOS/4.1.1 Agarrando tríceps.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0010-0000-0000-000000000000', 'guardia-de-ganc-14-4.1.2-raspaje-si-apoya-el-brazo', '4.1.2 Raspaje si apoya el brazo', 14, false, 'GUARDIA DE GANCHOS/4.1.2 Raspaje si apoya el brazo.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0010-0000-0000-000000000000', 'guardia-de-ganc-15-4.1.4-transicion-a-guardia-x-a-una-pierna', '4.1.4 Transicion a Guardia X a una pierna', 15, false, 'GUARDIA DE GANCHOS/4.1.4 Transicion a Guardia X a una pierna.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0010-0000-0000-000000000000', 'guardia-de-ganc-16-4.2.2-sumigaeshi', '4.2.2 Sumi gaeshi', 16, false, 'GUARDIA DE GANCHOS/4.2.2 Sumi-gaeshi.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0010-0000-0000-000000000000', 'guardia-de-ganc-17-4.2.3-ganando-la-esgrima', '4.2.3 Ganando la esgrima', 17, false, 'GUARDIA DE GANCHOS/4.2.3 Ganando la esgrima.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0010-0000-0000-000000000000', 'guardia-de-ganc-18-5.1raspaje-dominando-la-manga-cercana.', '5.1Raspaje dominando la manga cercana.', 18, false, 'GUARDIA DE GANCHOS/5.1Raspaje dominando la manga cercana..mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0010-0000-0000-000000000000', 'guardia-de-ganc-19-5.2-raspaje-dominando-la-manga-lejana.', '5.2 Raspaje dominando la manga lejana.', 19, false, 'GUARDIA DE GANCHOS/5.2 Raspaje dominando la manga lejana..mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0010-0000-0000-000000000000', 'guardia-de-ganc-20-5.3-raspaje-dominando-solapa', '5.3 Raspaje dominando solapa', 20, false, 'GUARDIA DE GANCHOS/5.3 Raspaje dominando solapa.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0010-0000-0000-000000000000', 'guardia-de-ganc-21-6.0-mantenimientos', '6.0 Mantenimientos', 21, false, 'GUARDIA DE GANCHOS/6.0 Mantenimientos.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0010-0000-0000-000000000000', 'guardia-de-ganc-22-6.1-contra-sus-manos', '6.1 Contra sus manos', 22, false, 'GUARDIA DE GANCHOS/6.1 Contra sus manos.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0010-0000-0000-000000000000', 'guardia-de-ganc-23-6.2-contra-su-hombro', '6.2 Contra su hombro', 23, false, 'GUARDIA DE GANCHOS/6.2 Contra su hombro.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0010-0000-0000-000000000000', 'guardia-de-ganc-24-6.3-contra-sus-piernas', '6.3 Contra sus piernas', 24, false, 'GUARDIA DE GANCHOS/6.3 Contra sus piernas.mp4', 0);

INSERT INTO lessons (id, course_id, slug, title, sort_order, is_free, video_url, duration) VALUES
  (gen_random_uuid(), 'AAAAAAAA-0011-0000-0000-000000000000', 'guardia-dlr-01-1.1-introduccion-y-dominios', '1.1 Introduccion y Dominios', 1, true, 'GUARDIA DLR/1.1 Introduccion y Dominios.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0011-0000-0000-000000000000', 'guardia-dlr-02-1.2-mantenimientos', '1.2 Mantenimientos', 2, false, 'GUARDIA DLR/1.2 Mantenimientos.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0011-0000-0000-000000000000', 'guardia-dlr-03-1.3-desequilibrios', '1.3 Desequilibrios', 3, false, 'GUARDIA DLR/1.3 Desequilibrios.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0011-0000-0000-000000000000', 'guardia-dlr-04-2.1-triangulo', '2.1   Triangulo', 4, false, 'GUARDIA DLR/2.1 - Triangulo.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0011-0000-0000-000000000000', 'guardia-dlr-05-2.1-triangulo', '2.1 Triangulo', 5, false, 'GUARDIA DLR/2.1 Triangulo.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0011-0000-0000-000000000000', 'guardia-dlr-06-2.2-armlock', '2.2   Armlock', 6, false, 'GUARDIA DLR/2.2 - Armlock.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0011-0000-0000-000000000000', 'guardia-dlr-07-2.3-espalda', '2.3   Espalda', 7, false, 'GUARDIA DLR/2.3 - Espalda.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0011-0000-0000-000000000000', 'guardia-dlr-08-3.1-delariva-x-bloqueo-manga-y-raspo-a-la-derecha.', '3.1   Delariva X, bloqueo manga y raspo a la derecha.', 8, false, 'GUARDIA DLR/3.1 - Delariva X, bloqueo manga y raspo a la derecha..mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0011-0000-0000-000000000000', 'guardia-dlr-09-3.2-delariva-x-raspo-a-la-izquierda', '3.2   Delariva X, raspo a la izquierda', 9, false, 'GUARDIA DLR/3.2 - Delariva X, raspo a la izquierda.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0011-0000-0000-000000000000', 'guardia-dlr-10-3.3-delariva-x-babybolo', '3.3   Delariva X, Babybolo', 10, false, 'GUARDIA DLR/3.3 - Delariva X, Babybolo.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0011-0000-0000-000000000000', 'guardia-dlr-11-3.4-sit-up-y-traba-al-pie-cuando-me-salta-la-pierna', '3.4 Sit up y traba al pie cuando me salta la pierna', 11, false, 'GUARDIA DLR/3.4 Sit up y traba al pie cuando me salta la pierna.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0011-0000-0000-000000000000', 'guardia-dlr-12-4.1-legdrag-desde-dlr-z', '4.1   Legdrag desde Dlr Z', 12, false, 'GUARDIA DLR/4.1 - Legdrag desde Dlr Z.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0011-0000-0000-000000000000', 'guardia-dlr-13-4.2-sentando-y-berimbolo-basico', '4.2   Sentando y Berimbolo Basico', 13, false, 'GUARDIA DLR/4.2 - Sentando y Berimbolo Basico.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0011-0000-0000-000000000000', 'guardia-dlr-14-4.3-sentando-y-libero-pierna-para-omoplataarmlock', '4.3   Sentando y Libero Pierna para OmoplataArmlock', 14, false, 'GUARDIA DLR/4.3 - Sentando y Libero Pierna para OmoplataArmlock.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0011-0000-0000-000000000000', 'guardia-dlr-15-4.4-kimura', '4.4   Kimura', 15, false, 'GUARDIA DLR/4.4 - Kimura.mov', 0);

INSERT INTO lessons (id, course_id, slug, title, sort_order, is_free, video_url, duration) VALUES
  (gen_random_uuid(), 'AAAAAAAA-0012-0000-0000-000000000000', 'guardia-one-leg-01-1.1-canilla-c-canilla', '1.1 Canilla c canilla', 1, true, 'GUARDIA ONE LEG/1.1 Canilla c canilla.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0012-0000-0000-000000000000', 'guardia-one-leg-02-1.2-dlr', '1.2 DLR', 2, false, 'GUARDIA ONE LEG/1.2 DLR.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0012-0000-0000-000000000000', 'guardia-one-leg-03-1.3-arrodillado-doble-esgrima', '1.3 Arrodillado doble esgrima', 3, false, 'GUARDIA ONE LEG/1.3 Arrodillado doble esgrima.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0012-0000-0000-000000000000', 'guardia-one-leg-04-2.1-cuando-saca-el-pie-de-la-cadera-op1', '2.1 Cuando saca el pie de la cadera OP1', 4, false, 'GUARDIA ONE LEG/2.1 Cuando saca el pie de la cadera OP1.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0012-0000-0000-000000000000', 'guardia-one-leg-05-2.2-cuando-saca-el-pie-de-la-cadera-op2x', '2.2 Cuando saca el pie de la cadera OP2 X', 5, false, 'GUARDIA ONE LEG/2.2 Cuando saca el pie de la cadera OP2-X.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0012-0000-0000-000000000000', 'guardia-one-leg-06-3.1-ida-y-vuelta', '3.1 Ida y vuelta', 6, false, 'GUARDIA ONE LEG/3.1 Ida y vuelta.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0012-0000-0000-000000000000', 'guardia-one-leg-07-3.2-ida-y-vuelta-variacion', '3.2 Ida y vuelta   variacion', 7, false, 'GUARDIA ONE LEG/3.2 Ida y vuelta - variacion.mp4', 0);

INSERT INTO lessons (id, course_id, slug, title, sort_order, is_free, video_url, duration) VALUES
  (gen_random_uuid(), 'AAAAAAAA-0013-0000-0000-000000000000', 'lapela-01-ll1.introduccionarmado', 'LL 1.Introducción Armado', 1, true, 'LAPELA/LL_1.Introducción-Armado.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0013-0000-0000-000000000000', 'lapela-02-ll2.1versus-over-under', 'LL 2.1 Versus Over Under', 2, false, 'LAPELA/LL_2.1-Versus Over Under.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0013-0000-0000-000000000000', 'lapela-03-ll2.2versus-emborcada', 'LL 2.2 Versus Emborcada', 3, false, 'LAPELA/LL_2.2-Versus Emborcada.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0013-0000-0000-000000000000', 'lapela-04-ll2.3-versus-toreando-weak-side', 'LL 2.3   Versus Toreando Weak Side', 4, false, 'LAPELA/LL_2.3 - Versus Toreando Weak Side.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0013-0000-0000-000000000000', 'lapela-05-ll3.1-pierna-cercana-x-con-lapel', 'LL 3.1   Pierna Cercana   X con lapel', 5, false, 'LAPELA/LL_3.1 - Pierna Cercana - X con lapel.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0013-0000-0000-000000000000', 'lapela-06-ll3.2-polish-sweep-y-pasaje', 'LL 3.2   Polish sweep y pasaje', 6, false, 'LAPELA/LL_3.2 - Polish sweep y pasaje.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0013-0000-0000-000000000000', 'lapela-07-ll3.3-versus-oponente-parado-polish-a-espalda', 'LL 3.3   Versus oponente parado   Polish a Espalda', 7, false, 'LAPELA/LL_3.3 - Versus oponente parado - Polish a Espalda.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0013-0000-0000-000000000000', 'lapela-08-sg1.1-de-guardia-cerrada', 'SG 1.1   De Guardia Cerrada', 8, false, 'LAPELA/SG_1.1 - De Guardia Cerrada.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0013-0000-0000-000000000000', 'lapela-09-sg1.2-desde-delariva-y-guardia-abierta', 'SG 1.2   Desde Delariva y Guardia Abierta', 9, false, 'LAPELA/SG_1.2 - Desde Delariva y Guardia Abierta.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0013-0000-0000-000000000000', 'lapela-10-sg2.1-lapeloplata', 'SG 2.1   Lapeloplata', 10, false, 'LAPELA/SG_2.1 - Lapeloplata.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0013-0000-0000-000000000000', 'lapela-11-sg2.2-inversion-hacia-atras-cuando-defienden-lapeloplata', 'SG 2.2   Inversión hacia atrás cuando defienden Lapeloplata', 11, false, 'LAPELA/SG_2.2 - Inversión hacia atrás cuando defienden Lapeloplata.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0013-0000-0000-000000000000', 'lapela-12-sg3.1-inversion-hacia-atras', 'SG 3.1   Inversión hacia atrás', 12, false, 'LAPELA/SG_3.1 - Inversión hacia atrás.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0013-0000-0000-000000000000', 'lapela-13-sg3.2-inversion-hacia-adelante-guardia-x', 'SG 3.2   Inversión hacia adelante + Guardia X', 13, false, 'LAPELA/SG_3.2 - Inversión hacia adelante + Guardia X.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0013-0000-0000-000000000000', 'lapela-14-wg1.introduccion', 'WG 1.Introduccion', 14, false, 'LAPELA/WG_1.Introduccion.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0013-0000-0000-000000000000', 'lapela-15-wg2.1-desde-guardia-de-la-riva', 'WG 2.1   Desde Guardia De la Riva', 15, false, 'LAPELA/WG_2.1 - Desde Guardia De la Riva.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0013-0000-0000-000000000000', 'lapela-16-wg2.2-desde-lapel-lasso', 'WG 2.2   Desde Lapel Lasso', 16, false, 'LAPELA/WG_2.2 - Desde Lapel Lasso.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0013-0000-0000-000000000000', 'lapela-17-wg3.1-cuando-me-quieren-saltar-la-pierna', 'WG 3.1   Cuando me quieren saltar la pierna', 17, false, 'LAPELA/WG_3.1 - Cuando me quieren saltar la pierna.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0013-0000-0000-000000000000', 'lapela-18-wg3.1-cuando-me-quieren-saltar-la-pierna3.2-cuando-me-saltan', 'WG 3.1   Cuando me quieren saltar la pierna3.2   Cuando me saltan la pierna (worm a one leg)', 18, false, 'LAPELA/WG_3.1 - Cuando me quieren saltar la pierna3.2 - Cuando me saltan la pierna (worm a one leg).mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0013-0000-0000-000000000000', 'lapela-19-wg4.1-rolando-sobre-el-hombro-desde-worm.-opcion-1-espalda', 'WG 4.1   Rolando sobre el hombro desde Worm. Opcion 1 Espalda', 19, false, 'LAPELA/WG_4.1 - Rolando sobre el hombro desde Worm. Opcion 1 Espalda.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0013-0000-0000-000000000000', 'lapela-20-wg4.2-ataque-desde-reverse-delaworm.-opcion-2-espalda', 'WG 4.2   Ataque desde Reverse DelaWorm. Opción 2 Espalda', 20, false, 'LAPELA/WG_4.2 - Ataque desde Reverse DelaWorm. Opción 2 Espalda.mp4', 0);

INSERT INTO lessons (id, course_id, slug, title, sort_order, is_free, video_url, duration) VALUES
  (gen_random_uuid(), 'AAAAAAAA-0014-0000-0000-000000000000', 'lucha-de-pie-01-1.1-introduccion', '1.1 Introducción', 1, true, 'LUCHA DE PIE/1.1 Introducción.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0014-0000-0000-000000000000', 'lucha-de-pie-02-1.2-como-desplazar', '1.2 Cómo Desplazar', 2, false, 'LUCHA DE PIE/1.2 Cómo Desplazar.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0014-0000-0000-000000000000', 'lucha-de-pie-03-1.3-dominios-y-desequilibrios', '1.3 Dominios y Desequilibrios', 3, false, 'LUCHA DE PIE/1.3 Dominios y Desequilibrios.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0014-0000-0000-000000000000', 'lucha-de-pie-04-1.4-roturas-de-agarres-kumi-kata', '1.4 Roturas de Agarres (Kumi Kata)', 4, false, 'LUCHA DE PIE/1.4 Roturas de Agarres (Kumi Kata).mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0014-0000-0000-000000000000', 'lucha-de-pie-05-1.5-como-aprender-un-lance-desde-cero', '1.5 Cómo aprender un lance desde cero', 5, false, 'LUCHA DE PIE/1.5 Cómo aprender un lance desde cero.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0014-0000-0000-000000000000', 'lucha-de-pie-06-2.1-okuri-ashi-barai', '2.1 Okuri Ashi Barai', 6, false, 'LUCHA DE PIE/2.1 Okuri Ashi Barai.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0014-0000-0000-000000000000', 'lucha-de-pie-07-2.2-ouchi-gari', '2.2 Ouchi Gari', 7, false, 'LUCHA DE PIE/2.2 Ouchi Gari.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0014-0000-0000-000000000000', 'lucha-de-pie-08-2.3-kouchi-gari', '2.3 Kouchi Gari', 8, false, 'LUCHA DE PIE/2.3 Kouchi Gari.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0014-0000-0000-000000000000', 'lucha-de-pie-09-2.4-osoto-gari', '2.4 Osoto Gari', 9, false, 'LUCHA DE PIE/2.4 Osoto Gari.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0014-0000-0000-000000000000', 'lucha-de-pie-10-3.1-o-goshi', '3.1 O Goshi', 10, false, 'LUCHA DE PIE/3.1 O Goshi.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0014-0000-0000-000000000000', 'lucha-de-pie-11-3.2-koshi-guruma', '3.2 Koshi Guruma', 11, false, 'LUCHA DE PIE/3.2 Koshi Guruma.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0014-0000-0000-000000000000', 'lucha-de-pie-12-3.3-harai-goshi', '3.3 Harai Goshi', 12, false, 'LUCHA DE PIE/3.3 Harai Goshi.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0014-0000-0000-000000000000', 'lucha-de-pie-13-4.1-ankle-pick', '4.1 Ankle Pick', 13, false, 'LUCHA DE PIE/4.1 Ankle Pick.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0014-0000-0000-000000000000', 'lucha-de-pie-14-4.2-seoi-nage', '4.2 Seoi Nage', 14, false, 'LUCHA DE PIE/4.2 Seoi Nage.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0014-0000-0000-000000000000', 'lucha-de-pie-15-4.3-kata-guruma', '4.3 Kata Guruma', 15, false, 'LUCHA DE PIE/4.3 Kata Guruma.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0014-0000-0000-000000000000', 'lucha-de-pie-16-5.1-sumi-gaeshi', '5.1 Sumi Gaeshi', 16, false, 'LUCHA DE PIE/5.1 Sumi Gaeshi.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0014-0000-0000-000000000000', 'lucha-de-pie-17-5.2-tomoe-nage', '5.2 Tomoe Nage', 17, false, 'LUCHA DE PIE/5.2 Tomoe Nage.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0014-0000-0000-000000000000', 'lucha-de-pie-18-5.3-tani-otoshi', '5.3 Tani Otoshi', 18, false, 'LUCHA DE PIE/5.3 Tani Otoshi.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0014-0000-0000-000000000000', 'lucha-de-pie-19-6.-llamado-a-la-guardia', '6. Llamado a la guardia', 19, false, 'LUCHA DE PIE/6. Llamado a la guardia.mp4', 0);

INSERT INTO lessons (id, course_id, slug, title, sort_order, is_free, video_url, duration) VALUES
  (gen_random_uuid(), 'AAAAAAAA-0015-0000-0000-000000000000', 'media-guardia-01-1.1.-con-dominio-de-solapa-cruzada.', '1.1. Con dominio de solapa cruzada.', 1, true, 'MEDIA GUARDIA/1.1. Con dominio de solapa cruzada..mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0015-0000-0000-000000000000', 'media-guardia-02-1.2-con-dominio-de-manga', '1.2 Con dominio de manga', 2, false, 'MEDIA GUARDIA/1.2 Con dominio de manga.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0015-0000-0000-000000000000', 'media-guardia-03-1.3-desde-guardia-z', '1.3 Desde Guardia Z', 3, false, 'MEDIA GUARDIA/1.3 Desde Guardia Z.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0015-0000-0000-000000000000', 'media-guardia-04-1.4-detalles-importantes.', '1.4 Detalles importantes.', 4, false, 'MEDIA GUARDIA/1.4 Detalles importantes..mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0015-0000-0000-000000000000', 'media-guardia-05-2.1-si-me-dominan-la-pierna', '2.1 Si me dominan la pierna', 5, false, 'MEDIA GUARDIA/2.1 Si me dominan la pierna.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0015-0000-0000-000000000000', 'media-guardia-06-3.1.1.1-raspaje-coyote', '3.1.1.1 Raspaje coyote', 6, false, 'MEDIA GUARDIA/3.1.1.1 Raspaje coyote.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0015-0000-0000-000000000000', 'media-guardia-07-3.1.1.2-raspaje-con-fuga-de-cadera.', '3.1.1.2 Raspaje con fuga de cadera.', 7, false, 'MEDIA GUARDIA/3.1.1.2 Raspaje con fuga de cadera..mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0015-0000-0000-000000000000', 'media-guardia-08-3.1.1.3-cuando-quieren-pasar-con-rodilla-cruzada.', '3.1.1.3 Cuando quieren pasar con rodilla cruzada.', 8, false, 'MEDIA GUARDIA/3.1.1.3 Cuando quieren pasar con rodilla cruzada..mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0015-0000-0000-000000000000', 'media-guardia-09-3.1.2.1-dominando-la-solapa.', '3.1.2.1 Dominando la solapa.', 9, false, 'MEDIA GUARDIA/3.1.2.1 Dominando la solapa..mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0015-0000-0000-000000000000', 'media-guardia-10-3.1.2.2-levantada-turca.', '3.1.2.2 Levantada turca.', 10, false, 'MEDIA GUARDIA/3.1.2.2 Levantada turca..mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0015-0000-0000-000000000000', 'media-guardia-11-3.1.2.3-con-dominio-de-botamanga', '3.1.2.3 Con dominio de botamanga', 11, false, 'MEDIA GUARDIA/3.1.2.3 Con dominio de botamanga.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0015-0000-0000-000000000000', 'media-guardia-12-3.1.3.1-cambio-de-solapas', '3.1.3.1 Cambio de solapas', 12, false, 'MEDIA GUARDIA/3.1.3.1 Cambio de solapas.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0015-0000-0000-000000000000', 'media-guardia-13-3.1.3.1-utilizando-el-antebrazo', '3.1.3.1 Utilizando el antebrazo', 13, false, 'MEDIA GUARDIA/3.1.3.1 Utilizando el antebrazo.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0015-0000-0000-000000000000', 'media-guardia-14-3.2.1-cuando-nos-abrazan-cabeza-y-nos-esgriman', '3.2.1 Cuando nos abrazan cabeza y nos esgriman', 14, false, 'MEDIA GUARDIA/3.2.1 Cuando nos abrazan cabeza y nos esgriman.mov', 0);

INSERT INTO lessons (id, course_id, slug, title, sort_order, is_free, video_url, duration) VALUES
  (gen_random_uuid(), 'AAAAAAAA-0016-0000-0000-000000000000', 'montada-01-1.1-abrazando-cabeza', '1.1 Abrazando cabeza', 1, true, 'MONTADA/1.1 Abrazando cabeza.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0016-0000-0000-000000000000', 'montada-02-1.2-lazando-el-brazo', '1.2 Lazando el brazo', 2, false, 'MONTADA/1.2 Lazando el brazo.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0016-0000-0000-000000000000', 'montada-03-2.1-abrazando-la-cabeza-en-la-salida-de-codos', '2.1 Abrazando la cabeza en la salida de codos', 3, false, 'MONTADA/2.1 Abrazando la cabeza en la salida de codos.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0016-0000-0000-000000000000', 'montada-04-3.1.1-llave-de-brazo', '3.1.1 Llave de brazo', 4, false, 'MONTADA/3.1.1 Llave de brazo.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0016-0000-0000-000000000000', 'montada-05-3.1.2-americana', '3.1.2 Americana', 5, false, 'MONTADA/3.1.2 Americana.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0016-0000-0000-000000000000', 'montada-06-3.2.1-estrangulamiento-1', '3.2.1 Estrangulamiento 1', 6, false, 'MONTADA/3.2.1 Estrangulamiento 1.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0016-0000-0000-000000000000', 'montada-07-3.2.2-estrangulamiento-2', '3.2.2 Estrangulamiento 2', 7, false, 'MONTADA/3.2.2 Estrangulamiento 2.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0016-0000-0000-000000000000', 'montada-08-3.2.3-ataque-duplo', '3.2.3 ataque duplo', 8, false, 'MONTADA/3.2.3 ataque duplo.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0016-0000-0000-000000000000', 'montada-09-3.2.4-montada-en-c', '3.2.4 montada en C', 9, false, 'MONTADA/3.2.4 montada en C.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0016-0000-0000-000000000000', 'montada-10-3.3.1-superman', '3.3.1 Superman', 10, false, 'MONTADA/3.3.1 Superman.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0016-0000-0000-000000000000', 'montada-11-3.3.2-ezequiel', '3.3.2 Ezequiel', 11, false, 'MONTADA/3.3.2 Ezequiel.mov', 0);

INSERT INTO lessons (id, course_id, slug, title, sort_order, is_free, video_url, duration) VALUES
  (gen_random_uuid(), 'AAAAAAAA-0017-0000-0000-000000000000', 'pasaje-aranha-01-1.-conceptos', '1. Conceptos', 1, true, 'PASAJE ARANHA/1. Conceptos.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0017-0000-0000-000000000000', 'pasaje-aranha-02-2.1-toreada', '2.1 Toreada', 2, false, 'PASAJE ARANHA/2.1 Toreada.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0017-0000-0000-000000000000', 'pasaje-aranha-03-2.2-leg-drag', '2.2 Leg Drag', 3, false, 'PASAJE ARANHA/2.2 Leg Drag.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0017-0000-0000-000000000000', 'pasaje-aranha-04-2.3-emborcada', '2.3 Emborcada', 4, false, 'PASAJE ARANHA/2.3 Emborcada.mp4', 0);

INSERT INTO lessons (id, course_id, slug, title, sort_order, is_free, video_url, duration) VALUES
  (gen_random_uuid(), 'AAAAAAAA-0018-0000-0000-000000000000', 'pasaje-guardia--01-1.0-introduccion', '1.0 Introduccion', 1, true, 'PASAJE GUARDIA ABIERTA/1.0 Introduccion.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0018-0000-0000-000000000000', 'pasaje-guardia--02-2.1-toreando', '2.1 Toreando', 2, false, 'PASAJE GUARDIA ABIERTA/2.1 Toreando.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0018-0000-0000-000000000000', 'pasaje-guardia--03-2.2-double-under', '2.2 Double Under', 3, false, 'PASAJE GUARDIA ABIERTA/2.2 Double Under.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0018-0000-0000-000000000000', 'pasaje-guardia--04-2.3-rodilla-x-dentro-huevo-frito-', '2.3 Rodilla x dentro   huevo frito', 4, false, 'PASAJE GUARDIA ABIERTA/2.3 Rodilla x dentro - huevo frito -.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0018-0000-0000-000000000000', 'pasaje-guardia--05-3.1-over-under', '3.1 Over Under', 5, false, 'PASAJE GUARDIA ABIERTA/3.1 Over Under.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0018-0000-0000-000000000000', 'pasaje-guardia--06-3.2-over-under-si-hay-frame', '3.2 Over Under si hay frame', 6, false, 'PASAJE GUARDIA ABIERTA/3.2 Over Under si hay frame.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0018-0000-0000-000000000000', 'pasaje-guardia--07-3.3-over-under-si-defiende-levantando-la-cadera', '3.3 Over Under si defiende levantando la cadera', 7, false, 'PASAJE GUARDIA ABIERTA/3.3 Over Under si defiende levantando la cadera.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0018-0000-0000-000000000000', 'pasaje-guardia--08-4.1-smash', '4.1 Smash', 8, false, 'PASAJE GUARDIA ABIERTA/4.1 Smash.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0018-0000-0000-000000000000', 'pasaje-guardia--09-4.2-smash-a-montada', '4.2 Smash a montada', 9, false, 'PASAJE GUARDIA ABIERTA/4.2 Smash a montada.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0018-0000-0000-000000000000', 'pasaje-guardia--10-4.3-smash-medialuna-a-espalda', '4.3 Smash medialuna a espalda', 10, false, 'PASAJE GUARDIA ABIERTA/4.3 Smash medialuna a espalda.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0018-0000-0000-000000000000', 'pasaje-guardia--11-5.1-rodilla-cruzada', '5.1 Rodilla cruzada', 11, false, 'PASAJE GUARDIA ABIERTA/5.1 Rodilla cruzada.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0018-0000-0000-000000000000', 'pasaje-guardia--12-5.2-rodilla-cruzada-vs-frame', '5.2 Rodilla cruzada vs frame', 12, false, 'PASAJE GUARDIA ABIERTA/5.2 Rodilla cruzada vs frame.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0018-0000-0000-000000000000', 'pasaje-guardia--13-5.3-rodilla-cruzada-vs-frame-2', '5.3 Rodilla cruzada vs frame 2', 13, false, 'PASAJE GUARDIA ABIERTA/5.3 Rodilla cruzada vs frame 2_.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0018-0000-0000-000000000000', 'pasaje-guardia--14-5.4-rodilla-cruzada-vs-knee-shield', '5.4 Rodilla cruzada vs knee shield', 14, false, 'PASAJE GUARDIA ABIERTA/5.4 Rodilla cruzada vs knee shield.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0018-0000-0000-000000000000', 'pasaje-guardia--15-5.5-rodilla-cruzada-si-no-llego-con-rodilla', '5.5 Rodilla cruzada si no llego con rodilla', 15, false, 'PASAJE GUARDIA ABIERTA/5.5 Rodilla cruzada si no llego con rodilla.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0018-0000-0000-000000000000', 'pasaje-guardia--16-5.6-rodilla-cruzada-si-no-llego-con-rodilla-ni-manos', '5.6 Rodilla cruzada si no llego con rodilla ni manos', 16, false, 'PASAJE GUARDIA ABIERTA/5.6 Rodilla cruzada si no llego con rodilla ni manos.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0018-0000-0000-000000000000', 'pasaje-guardia--17-6.1-emborcada-y-acompano-con-roll', '6.1 Emborcada y acompaño con roll', 17, false, 'PASAJE GUARDIA ABIERTA/6.1 Emborcada y acompaño con roll.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0018-0000-0000-000000000000', 'pasaje-guardia--18-6.2-emborcada-y-leg-drag', '6.2 Emborcada y leg drag', 18, false, 'PASAJE GUARDIA ABIERTA/6.2 Emborcada y leg drag.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0018-0000-0000-000000000000', 'pasaje-guardia--19-7.1-leg-drag', '7.1 Leg drag', 19, false, 'PASAJE GUARDIA ABIERTA/7.1 Leg drag.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0018-0000-0000-000000000000', 'pasaje-guardia--20-7.2-leg-drag-a-la-otra-pierna', '7.2 Leg Drag a la otra pierna', 20, false, 'PASAJE GUARDIA ABIERTA/7.2 Leg Drag a la otra pierna.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0018-0000-0000-000000000000', 'pasaje-guardia--21-7.3-leg-drag-si-fuga-cadera', '7.3 Leg Drag si fuga cadera', 21, false, 'PASAJE GUARDIA ABIERTA/7.3 Leg Drag si fuga cadera.mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0018-0000-0000-000000000000', 'pasaje-guardia--22-7.4-leg-drag-si-busca-recuperar-', '7.4 Leg Drag si busca recuperar', 22, false, 'PASAJE GUARDIA ABIERTA/7.4 Leg Drag si busca recuperar .mov', 0),
  (gen_random_uuid(), 'AAAAAAAA-0018-0000-0000-000000000000', 'pasaje-guardia--23-pasajesteaser', 'pasajes teaser', 23, false, 'PASAJE GUARDIA ABIERTA/pasajes-teaser.mp4', 0);

INSERT INTO lessons (id, course_id, slug, title, sort_order, is_free, video_url, duration) VALUES
  (gen_random_uuid(), 'AAAAAAAA-0019-0000-0000-000000000000', 'pasaje-one-leg-01-1.-introduccion-identificacion-de-dominios', '1. Introduccion   Identificacion de dominios', 1, true, 'PASAJE ONE LEG/1. Introduccion - Identificacion de dominios.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0019-0000-0000-000000000000', 'pasaje-one-leg-02-2.-defensas', '2. Defensas', 2, false, 'PASAJE ONE LEG/2. Defensas.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0019-0000-0000-000000000000', 'pasaje-one-leg-03-3.1-sacando-el-pie-de-la-cadera-step-over', '3.1   Sacando el pie de la cadera   Step Over', 3, false, 'PASAJE ONE LEG/3.1 - Sacando el pie de la cadera - Step Over.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0019-0000-0000-000000000000', 'pasaje-one-leg-04-3.2-sacando-el-gancho-rodilla-cruzada', '3.2   Sacando el gancho   rodilla cruzada', 4, false, 'PASAJE ONE LEG/3.2 - Sacando el gancho - rodilla cruzada.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0019-0000-0000-000000000000', 'pasaje-one-leg-05-3.3-sacando-el-gancho-berimbolo', '3.3   Sacando el gancho   Berimbolo', 5, false, 'PASAJE ONE LEG/3.3 - Sacando el gancho - Berimbolo.mp4', 0);

INSERT INTO lessons (id, course_id, slug, title, sort_order, is_free, video_url, duration) VALUES
  (gen_random_uuid(), 'AAAAAAAA-0020-0000-0000-000000000000', 'pasajes-dlr-01-1.conceptos', '1.Conceptos', 1, true, 'PASAJES DLR/1.Conceptos.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0020-0000-0000-000000000000', 'pasajes-dlr-02-2.1-leg-weave-a-smash', '2.1   Leg Weave a Smash', 2, false, 'PASAJES DLR/2.1 - Leg Weave a Smash.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0020-0000-0000-000000000000', 'pasajes-dlr-03-2.2-leg-weave-a-cross-knee', '2.2   Leg Weave a Cross Knee', 3, false, 'PASAJES DLR/2.2 - Leg Weave a Cross Knee.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0020-0000-0000-000000000000', 'pasajes-dlr-04-2.3-shin-slice-a-la-derecha', '2.3   Shin Slice a la derecha', 4, false, 'PASAJES DLR/2.3 - Shin Slice a la derecha.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0020-0000-0000-000000000000', 'pasajes-dlr-05-2.4-toreando-el-gancho-dlr', '2.4   Toreando el gancho dlr', 5, false, 'PASAJES DLR/2.4 - Toreando el gancho dlr.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0020-0000-0000-000000000000', 'pasajes-dlr-06-3.1-legdrag-emborcando', '3.1   Legdrag Emborcando', 6, false, 'PASAJES DLR/3.1 - Legdrag Emborcando.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0020-0000-0000-000000000000', 'pasajes-dlr-07-3.2-shin-trap-legdrag', '3.2   Shin Trap + Legdrag', 7, false, 'PASAJES DLR/3.2 - Shin Trap + Legdrag.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0020-0000-0000-000000000000', 'pasajes-dlr-08-3.3-legdrag-volador-girando', '3.3   Legdrag Volador Girando', 8, false, 'PASAJES DLR/3.3 - Legdrag Volador Girando.mp4', 0);

INSERT INTO lessons (id, course_id, slug, title, sort_order, is_free, video_url, duration) VALUES
  (gen_random_uuid(), 'AAAAAAAA-0021-0000-0000-000000000000', 'x-guard-01-1-introduccion', '1 Introducción', 1, true, 'X GUARD/1 Introducción.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0021-0000-0000-000000000000', 'x-guard-02-2.1.-desde-guardia-sentada-con-una-esgrima', '2.1. Desde guardia sentada (con una esgrima)', 2, false, 'X GUARD/2.1. Desde guardia sentada (con una esgrima).mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0021-0000-0000-000000000000', 'x-guard-03-2.2-desde-guardia-sentada-doble-esgrima', '2.2 Desde guardia sentada (doble esgrima)', 3, false, 'X GUARD/2.2 Desde guardia sentada (doble esgrima).mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0021-0000-0000-000000000000', 'x-guard-04-2.3-desde-canilla-con-canilla', '2.3 Desde canilla con canilla', 4, false, 'X GUARD/2.3 Desde canilla con canilla.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0021-0000-0000-000000000000', 'x-guard-05-2.4-desde-guardia-dlr', '2.4 Desde guardia DLR', 5, false, 'X GUARD/2.4 Desde guardia DLR.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0021-0000-0000-000000000000', 'x-guard-06-3.1-raspaje-dominando-manga-lejana', '3.1 Raspaje dominando manga lejana', 6, false, 'X GUARD/3.1 Raspaje dominando manga lejana.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0021-0000-0000-000000000000', 'x-guard-07-3.2-raspaje-de-tijera-para-atras', '3.2 Raspaje de tijera para atrás', 7, false, 'X GUARD/3.2 Raspaje de tijera para atrás.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0021-0000-0000-000000000000', 'x-guard-08-3.3-levantada-tecnica', '3.3 Levantada técnica', 8, false, 'X GUARD/3.3 Levantada técnica.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0021-0000-0000-000000000000', 'x-guard-09-3.4-tomoe-nague', '3.4 Tomoe nague', 9, false, 'X GUARD/3.4 Tomoe nague.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0021-0000-0000-000000000000', 'x-guard-10-3.5-dominando-manga-cercana-1', '3.5 Dominando manga cercana 1', 10, false, 'X GUARD/3.5 Dominando manga cercana 1.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0021-0000-0000-000000000000', 'x-guard-11-3.6-dominando-manga-cercana-2', '3.6 Dominando manga cercana 2', 11, false, 'X GUARD/3.6 Dominando manga cercana 2.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0021-0000-0000-000000000000', 'x-guard-12-4.1-dominio-de-botamanga', '4.1 Dominio de botamanga', 12, false, 'X GUARD/4.1 Dominio de botamanga.mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0021-0000-0000-000000000000', 'x-guard-13-4.2-cuando-saca-el-gancho-de-arriba.', '4.2 Cuando saca el gancho de arriba.', 13, false, 'X GUARD/4.2 Cuando saca el gancho de arriba..mp4', 0),
  (gen_random_uuid(), 'AAAAAAAA-0021-0000-0000-000000000000', 'x-guard-14-4.3-cuando-mata-los-2-ganchos-juntos', '4.3 Cuando mata los 2 ganchos juntos', 14, false, 'X GUARD/4.3 Cuando mata los 2 ganchos juntos.mp4', 0);

-- 5. CATEGORÍAS POR CURSO
DO $$
DECLARE
  v_guardia uuid;
  v_sistema_de_posiciones uuid;
  v_controles uuid;
  v_espalda uuid;
  v_lucha_de_pie uuid;
  v_pasajes uuid;
BEGIN
  SELECT id INTO v_guardia FROM categories WHERE slug = 'guardia' LIMIT 1;
  SELECT id INTO v_sistema_de_posiciones FROM categories WHERE slug = 'sistema-de-posiciones' LIMIT 1;
  SELECT id INTO v_controles FROM categories WHERE slug = 'controles' LIMIT 1;
  SELECT id INTO v_espalda FROM categories WHERE slug = 'espalda' LIMIT 1;
  SELECT id INTO v_lucha_de_pie FROM categories WHERE slug = 'lucha-de-pie' LIMIT 1;
  SELECT id INTO v_pasajes FROM categories WHERE slug = 'pasajes' LIMIT 1;

  INSERT INTO course_categories (course_id, category_id) VALUES ('AAAAAAAA-0001-0000-0000-000000000000', v_guardia) ON CONFLICT DO NOTHING;
  INSERT INTO course_categories (course_id, category_id) VALUES ('AAAAAAAA-0002-0000-0000-000000000000', v_sistema_de_posiciones) ON CONFLICT DO NOTHING;
  INSERT INTO course_categories (course_id, category_id) VALUES ('AAAAAAAA-0003-0000-0000-000000000000', v_controles) ON CONFLICT DO NOTHING;
  INSERT INTO course_categories (course_id, category_id) VALUES ('AAAAAAAA-0004-0000-0000-000000000000', v_espalda) ON CONFLICT DO NOTHING;
  INSERT INTO course_categories (course_id, category_id) VALUES ('AAAAAAAA-0004-0000-0000-000000000000', v_sistema_de_posiciones) ON CONFLICT DO NOTHING;
  INSERT INTO course_categories (course_id, category_id) VALUES ('AAAAAAAA-0005-0000-0000-000000000000', v_guardia) ON CONFLICT DO NOTHING;
  INSERT INTO course_categories (course_id, category_id) VALUES ('AAAAAAAA-0006-0000-0000-000000000000', v_guardia) ON CONFLICT DO NOTHING;
  INSERT INTO course_categories (course_id, category_id) VALUES ('AAAAAAAA-0007-0000-0000-000000000000', v_controles) ON CONFLICT DO NOTHING;
  INSERT INTO course_categories (course_id, category_id) VALUES ('AAAAAAAA-0007-0000-0000-000000000000', v_espalda) ON CONFLICT DO NOTHING;
  INSERT INTO course_categories (course_id, category_id) VALUES ('AAAAAAAA-0008-0000-0000-000000000000', v_guardia) ON CONFLICT DO NOTHING;
  INSERT INTO course_categories (course_id, category_id) VALUES ('AAAAAAAA-0009-0000-0000-000000000000', v_guardia) ON CONFLICT DO NOTHING;
  INSERT INTO course_categories (course_id, category_id) VALUES ('AAAAAAAA-0010-0000-0000-000000000000', v_guardia) ON CONFLICT DO NOTHING;
  INSERT INTO course_categories (course_id, category_id) VALUES ('AAAAAAAA-0011-0000-0000-000000000000', v_guardia) ON CONFLICT DO NOTHING;
  INSERT INTO course_categories (course_id, category_id) VALUES ('AAAAAAAA-0012-0000-0000-000000000000', v_guardia) ON CONFLICT DO NOTHING;
  INSERT INTO course_categories (course_id, category_id) VALUES ('AAAAAAAA-0013-0000-0000-000000000000', v_guardia) ON CONFLICT DO NOTHING;
  INSERT INTO course_categories (course_id, category_id) VALUES ('AAAAAAAA-0014-0000-0000-000000000000', v_lucha_de_pie) ON CONFLICT DO NOTHING;
  INSERT INTO course_categories (course_id, category_id) VALUES ('AAAAAAAA-0015-0000-0000-000000000000', v_guardia) ON CONFLICT DO NOTHING;
  INSERT INTO course_categories (course_id, category_id) VALUES ('AAAAAAAA-0016-0000-0000-000000000000', v_controles) ON CONFLICT DO NOTHING;
  INSERT INTO course_categories (course_id, category_id) VALUES ('AAAAAAAA-0017-0000-0000-000000000000', v_pasajes) ON CONFLICT DO NOTHING;
  INSERT INTO course_categories (course_id, category_id) VALUES ('AAAAAAAA-0018-0000-0000-000000000000', v_pasajes) ON CONFLICT DO NOTHING;
  INSERT INTO course_categories (course_id, category_id) VALUES ('AAAAAAAA-0019-0000-0000-000000000000', v_pasajes) ON CONFLICT DO NOTHING;
  INSERT INTO course_categories (course_id, category_id) VALUES ('AAAAAAAA-0020-0000-0000-000000000000', v_pasajes) ON CONFLICT DO NOTHING;
  INSERT INTO course_categories (course_id, category_id) VALUES ('AAAAAAAA-0021-0000-0000-000000000000', v_guardia) ON CONFLICT DO NOTHING;
END $$;