-- =====================================================
-- Seed inicial para QAP ChacoNews
-- Ejecutar luego del schema.sql en Supabase SQL Editor.
-- =====================================================

-- 1) Categorías base
insert into public.categories (id, name, slug, color, sort_order)
values
  (gen_random_uuid(), 'Política', 'politica', '#D7191F', 1),
  (gen_random_uuid(), 'Economía', 'economia', '#0B1220', 2),
  (gen_random_uuid(), 'Sociedad', 'sociedad', '#6B7280', 3),
  (gen_random_uuid(), 'Deportes', 'deportes', '#1D4ED8', 4),
  (gen_random_uuid(), 'Cultura', 'cultura', '#7C3AED', 5)
on conflict (slug) do nothing;

-- 2) Tags base
insert into public.tags (id, name, slug)
values
  (gen_random_uuid(), 'Chaco', 'chaco'),
  (gen_random_uuid(), 'Paraguay', 'paraguay'),
  (gen_random_uuid(), 'Local', 'local'),
  (gen_random_uuid(), 'Economía', 'economia'),
  (gen_random_uuid(), 'Social', 'social')
on conflict (slug) do nothing;

-- 3) Artículo de ejemplo
with category_row as (
  select id from public.categories where slug = 'politica' limit 1
),
news_tag as (
  select id from public.tags where slug = 'chaco' limit 1
),
local_tag as (
  select id from public.tags where slug = 'local' limit 1
)
insert into public.articles (
  id,
  title,
  slug,
  subtitle,
  excerpt,
  content,
  cover_image_url,
  category_id,
  status,
  is_featured,
  is_breaking,
  reading_time_minutes,
  seo_title,
  seo_description,
  views_count,
  published_at
)
select
  gen_random_uuid(),
  'El Chaco fortalece su agenda de inversiones y desarrollo regional',
  'chaco-fortalece-su-agenda-de-inversiones-y-desarrollo-regional',
  'Nuevas alianzas públicas y privadas buscan acelerar proyectos de infraestructura, agua y conectividad.',
  'La región avanzó con nuevos proyectos de infraestructura y servicios públicos para consolidar su crecimiento y mejorar la calidad de vida.',
  '<p>La provincia del Chaco continúa con una agenda de inversiones orientada a mejorar la conectividad, la infraestructura y la prestación de servicios públicos.</p><p>En los últimos meses, distintas instituciones reforzaron acuerdos con empresarios y gobiernos locales para impulsar obras en salud, educación y logística.</p><p>El objetivo es abrir nuevas oportunidades de empleo y reducir la brecha regional con el resto del país.</p>',
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80',
  category_row.id,
  'published',
  true,
  true,
  5,
  'El Chaco fortalece su agenda de inversiones y desarrollo regional',
  'Proyecto regional con inversión y conectividad para el Chaco.',
  1280,
  now() - interval '1 day'
from category_row
on conflict (slug) do nothing;

-- 4) Relación de tags a artículos
with article_row as (
  select id from public.articles where slug = 'chaco-fortalece-su-agenda-de-inversiones-y-desarrollo-regional' limit 1
),
chaco as (
  select id from public.tags where slug = 'chaco' limit 1
),
local as (
  select id from public.tags where slug = 'local' limit 1
)
insert into public.article_tags (article_id, tag_id)
select article_row.id, chaco.id from article_row, chaco
union all
select article_row.id, local.id from article_row, local
on conflict do nothing;

-- 5) Artículo extra
with category_row as (
  select id from public.categories where slug = 'economia' limit 1
),
paraguay_tag as (
  select id from public.tags where slug = 'paraguay' limit 1
),
economia_tag as (
  select id from public.tags where slug = 'economia' limit 1
)
insert into public.articles (
  id,
  title,
  slug,
  subtitle,
  excerpt,
  content,
  cover_image_url,
  category_id,
  status,
  is_featured,
  is_breaking,
  reading_time_minutes,
  seo_title,
  seo_description,
  views_count,
  published_at
)
select
  gen_random_uuid(),
  'Paraguay acelera planes de logística y comercio exterior',
  'paraguay-acelera-planes-de-logistica-y-comercio-exterior',
  'Empresas y autoridades buscan fortalecer la cadena de valor regional.',
  'El crecimiento de la infraestructura logística abre nuevas oportunidades para comercio y producción en Paraguay.',
  '<p>La actividad comercial del país mostró nuevos índices positivos en sectores clave como logística, almacenamiento y transporte.</p><p>Las autoridades trabajaron con actores privados para ampliar la cobertura de rutas y mejorar los tiempos de exportación.</p>',
  'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=1200&q=80',
  category_row.id,
  'published',
  false,
  false,
  4,
  'Paraguay acelera planes de logística y comercio exterior',
  'Nuevos planes de comercio exterior y logística impulsan la economía regional.',
  920,
  now() - interval '2 days'
from category_row
on conflict (slug) do nothing;

with article_row as (
  select id from public.articles where slug = 'paraguay-acelera-planes-de-logistica-y-comercio-exterior' limit 1
),
paraguay as (
  select id from public.tags where slug = 'paraguay' limit 1
),
economia as (
  select id from public.tags where slug = 'economia' limit 1
)
insert into public.article_tags (article_id, tag_id)
select article_row.id, paraguay.id from article_row, paraguay
union all
select article_row.id, economia.id from article_row, economia
on conflict do nothing;

-- =====================================================
-- Fin del seed
-- =====================================================
