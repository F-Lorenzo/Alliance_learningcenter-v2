-- ============================================================
-- Curso: Guardia de Ganchos
-- Correr en Supabase → SQL Editor → New query → Run
-- ============================================================

WITH new_course AS (
  INSERT INTO public.courses (slug, title, description, is_free, is_published, is_new, is_featured)
  VALUES (
    'guardia-de-ganchos',
    'Guardia de Ganchos',
    'Sistema completo de Guardia de Ganchos: dominios, ataques desde distintos agarres, raspajes y mantenimientos.',
    false,
    true,
    true,
    true
  )
  RETURNING id
),
cat_link AS (
  INSERT INTO public.course_categories (course_id, category_id)
  SELECT nc.id, c.id
  FROM new_course nc, public.categories c
  WHERE c.slug = 'guardia'
  RETURNING course_id
)
INSERT INTO public.lessons (course_id, slug, title, video_url, is_free, sort_order)
SELECT nc.id, v.slug, v.title, v.video_url, v.is_free, v.sort_order
FROM new_course nc
CROSS JOIN (VALUES
  (1,  'demo',                              'Demo — Guardia de Ganchos',                           '2025/GUARDIA DE GANCHOS/demoganchos.mp4',                                       true),
  (2,  'introduccion',                      'Introducción',                                        '2025/GUARDIA DE GANCHOS/0.0 Introduccion.mp4',                                  true),
  (3,  'desde-parado',                      'Cómo armar desde parado',                             '2025/GUARDIA DE GANCHOS/1.1 Desde parado.mp4',                                  false),
  (4,  'raspaje-dominando-manga',           'Raspaje dominando la manga',                          '2025/GUARDIA DE GANCHOS/2.1.1 Raspaje dominando manga.mp4',                     false),
  (5,  'si-levanta-pierna-para-defender',   'Si levanta la pierna para defender',                  '2025/GUARDIA DE GANCHOS/2.1.2. Si levanta la pierna para defender.mp4',         false),
  (6,  'si-levanta-pierna-lejos-del-pie',   'Si levanta la pierna lejos del pie',                  '2025/GUARDIA DE GANCHOS/2.1.3. Si levanta la pierna lejos del pie.mp4',         false),
  (7,  'transicion-a-guardia-x',            'Transición a Guardia X',                              '2025/GUARDIA DE GANCHOS/2.2.1. Transición a Guardia X.mp4',                     false),
  (8,  'si-pesa-para-atras',                'Si pesa para atrás',                                  '2025/GUARDIA DE GANCHOS/2.2.2 Si pesa para atrás.mp4',                          false),
  (9,  'si-pesa-para-atras-2da-opcion',     'Si pesa para atrás — 2ª opción',                      '2025/GUARDIA DE GANCHOS/2.2.3 Si pesa para atrás 2da opción.mp4',               false),
  (10, 'llave-de-brazo',                    'Llave de brazo',                                      '2025/GUARDIA DE GANCHOS/3.1.1. Llave de brazo.mp4',                             false),
  (11, 'pasaje-a-la-espalda',               'Pasaje a la espalda',                                 '2025/GUARDIA DE GANCHOS/3.1.2. Pasaje a la espalda.mp4',                        false),
  (12, 'cuando-no-puedo-liberar-pies',      'Cuando no puedo liberar mis pies',                    '2025/GUARDIA DE GANCHOS/3.1.3. Cuando no puedo liberar mis pies.mp4',           false),
  (13, 'transicion-guardia-x-una-pierna-a', 'Transición a Guardia X a una pierna (desde gancho)',  '2025/GUARDIA DE GANCHOS/3.1.4. Transición a Guardia X a una pierna.mp4',        false),
  (14, 'agarrando-triceps',                 'Agarrando tríceps',                                   '2025/GUARDIA DE GANCHOS/4.1.1 Agarrando tríceps.mp4',                           false),
  (15, 'raspaje-si-apoya-el-brazo',         'Raspaje si apoya el brazo',                           '2025/GUARDIA DE GANCHOS/4.1.2 Raspaje si apoya el brazo.mp4',                   false),
  (16, 'transicion-guardia-x-una-pierna-b', 'Transición a Guardia X a una pierna (desde manga)',   '2025/GUARDIA DE GANCHOS/4.1.4 Transicion a Guardia X a una pierna.mp4',         false),
  (17, 'sumi-gaeshi',                       'Sumi-gaeshi',                                         '2025/GUARDIA DE GANCHOS/4.2.2 Sumi-gaeshi.mp4',                                 false),
  (18, 'ganando-la-esgrima',                'Ganando la esgrima',                                  '2025/GUARDIA DE GANCHOS/4.2.3 Ganando la esgrima.mp4',                          false),
  (19, 'raspaje-manga-cercana',             'Raspaje dominando la manga cercana',                  '2025/GUARDIA DE GANCHOS/5.1Raspaje dominando la manga cercana..mp4',            false),
  (20, 'raspaje-manga-lejana',              'Raspaje dominando la manga lejana',                   '2025/GUARDIA DE GANCHOS/5.2 Raspaje dominando la manga lejana..mp4',            false),
  (21, 'raspaje-dominando-solapa',          'Raspaje dominando solapa',                            '2025/GUARDIA DE GANCHOS/5.3 Raspaje dominando solapa.mp4',                      false),
  (22, 'mantenimientos',                    'Mantenimientos',                                      '2025/GUARDIA DE GANCHOS/6.0 Mantenimientos.mp4',                                false),
  (23, 'contra-sus-manos',                  'Contra sus manos',                                    '2025/GUARDIA DE GANCHOS/6.1 Contra sus manos.mp4',                              false),
  (24, 'contra-su-hombro',                  'Contra su hombro',                                    '2025/GUARDIA DE GANCHOS/6.2 Contra su hombro.mp4',                              false),
  (25, 'contra-sus-piernas',                'Contra sus piernas',                                  '2025/GUARDIA DE GANCHOS/6.3 Contra sus piernas.mp4',                            false)
) AS v(sort_order, slug, title, video_url, is_free);
