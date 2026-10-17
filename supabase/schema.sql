-- =====================================================
-- QAP ChacoNews - Supabase schema
-- =====================================================
-- Ejecutar en Supabase SQL editor.
-- No crea tablas de administración ni políticas peligrosas.
-- Requiere extension uuid-ossp (normalmente ya viene habilitada).

create extension if not exists "uuid-ossp";

-- =====================================================
-- Enums
-- =====================================================
create type public.user_role as enum ('reader', 'editor', 'admin');
create type public.article_status as enum ('draft', 'scheduled', 'published', 'archived');

-- =====================================================
-- Profiles
-- =====================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  profile_color text,
  role public.user_role not null default 'reader',
  is_blocked boolean not null default false,
  blocked_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- =====================================================
-- Categories
-- =====================================================
create table if not exists public.categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  color text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- =====================================================
-- Tags
-- =====================================================
create table if not exists public.tags (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

-- =====================================================
-- Articles
-- =====================================================
create table if not exists public.articles (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  slug text not null unique,
  subtitle text,
  excerpt text,
  content text not null,
  cover_image_url text,
  category_id uuid references public.categories(id) on delete set null,
  author_id uuid references public.profiles(id) on delete set null,
  status public.article_status not null default 'draft',
  is_featured boolean not null default false,
  is_breaking boolean not null default false,
  reading_time_minutes integer,
  seo_title text,
  seo_description text,
  views_count bigint not null default 0,
  published_at timestamptz,
  scheduled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists articles_status_published_idx on public.articles (status, published_at desc);
create index if not exists articles_category_idx on public.articles (category_id, published_at desc);
create index if not exists articles_featured_idx on public.articles (is_featured, published_at desc);
create index if not exists articles_breaking_idx on public.articles (is_breaking, published_at desc);
create index if not exists articles_slug_idx on public.articles (slug);

-- =====================================================
-- Article tags
-- =====================================================
create table if not exists public.article_tags (
  article_id uuid not null references public.articles(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (article_id, tag_id)
);

create index if not exists article_tags_tag_idx on public.article_tags (tag_id);

-- =====================================================
-- Newsletter subscribers
-- =====================================================
create table if not exists public.newsletter_subscribers (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  confirmed boolean not null default false,
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);

-- =====================================================
-- Article views
-- =====================================================
create table if not exists public.article_views (
  id uuid primary key default uuid_generate_v4(),
  article_id uuid not null references public.articles(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  session_id text not null,
  ip_hash text,
  user_agent text,
  referrer text,
  device_type text,
  country text,
  city text,
  time_on_page_seconds integer,
  is_bot boolean not null default false,
  is_suspicious boolean not null default false,
  viewed_at timestamptz not null default now()
);

create index if not exists article_views_article_idx on public.article_views (article_id, viewed_at desc);
create index if not exists article_views_session_idx on public.article_views (session_id);
create unique index if not exists article_views_article_session_unique on public.article_views (article_id, session_id);

-- =====================================================
-- Site settings
-- =====================================================
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- =====================================================
-- Homepage sections
-- =====================================================
-- Util para contenido modular sin tocar el frontend fijo.
create table if not exists public.homepage_sections (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  title text,
  body jsonb not null default '{}',
  published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================
-- Trigger para updated_at
-- =====================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger articles_set_updated_at
before update on public.articles
for each row execute function public.set_updated_at();

create trigger homepage_sections_set_updated_at
before update on public.homepage_sections
for each row execute function public.set_updated_at();

create trigger site_settings_set_updated_at
before update on public.site_settings
for each row execute function public.set_updated_at();

-- =====================================================
-- Trigger para auto-crear profiles al registrar usuario
-- =====================================================
create or replace function public.get_profile_color(seed text)
returns text
language sql
stable
as $$
  select case
    when coalesce(trim(seed), '') = '' then '#3B82F6'
    else array[
      '#3B82F6', '#8B5CF6', '#F59E0B', '#10B981', '#F97316',
      '#EC4899', '#14B8A6', '#6366F1', '#EF4444', '#84CC16'
    ][abs(hashtext(coalesce(seed, ''))) % 10]
  end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, profile_color, role)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'display_name',
      new.email
    ),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture',
      new.raw_user_meta_data ->> 'avatar',
      null
    ),
    public.get_profile_color(
      coalesce(
        new.raw_user_meta_data ->> 'full_name',
        new.raw_user_meta_data ->> 'name',
        new.raw_user_meta_data ->> 'display_name',
        new.email
      )
    ),
    'reader'
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    profile_color = coalesce(public.profiles.profile_color, excluded.profile_color),
    updated_at = now();

  return new;
end;
$$;

create or replace function public.sync_profile_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set
    full_name = coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'display_name',
      full_name,
      new.email
    ),
    avatar_url = coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture',
      new.raw_user_meta_data ->> 'avatar',
      avatar_url
    ),
    profile_color = coalesce(
      public.profiles.profile_color,
      public.get_profile_color(
        coalesce(
          new.raw_user_meta_data ->> 'full_name',
          new.raw_user_meta_data ->> 'name',
          new.raw_user_meta_data ->> 'display_name',
          full_name,
          new.email
        )
      )
    ),
    updated_at = now()
  where id = new.id;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
after update on auth.users
for each row execute function public.sync_profile_from_auth();

create or replace function public.backfill_profiles_from_auth()
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.profiles (id, full_name, avatar_url, profile_color, role)
  select
    au.id,
    coalesce(
      au.raw_user_meta_data ->> 'full_name',
      au.raw_user_meta_data ->> 'name',
      au.raw_user_meta_data ->> 'display_name',
      au.email
    ),
    coalesce(
      au.raw_user_meta_data ->> 'avatar_url',
      au.raw_user_meta_data ->> 'picture',
      au.raw_user_meta_data ->> 'avatar',
      null
    ),
    public.get_profile_color(
      coalesce(
        au.raw_user_meta_data ->> 'full_name',
        au.raw_user_meta_data ->> 'name',
        au.raw_user_meta_data ->> 'display_name',
        au.email
      )
    ),
    'reader'
  from auth.users au
  left join public.profiles p on p.id = au.id
  where p.id is null
  on conflict (id) do update set
    full_name = excluded.full_name,
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    profile_color = coalesce(public.profiles.profile_color, excluded.profile_color),
    updated_at = now();

  update public.profiles p
  set
    full_name = coalesce(
      au.raw_user_meta_data ->> 'full_name',
      au.raw_user_meta_data ->> 'name',
      au.raw_user_meta_data ->> 'display_name',
      p.full_name,
      au.email
    ),
    avatar_url = coalesce(
      au.raw_user_meta_data ->> 'avatar_url',
      au.raw_user_meta_data ->> 'picture',
      au.raw_user_meta_data ->> 'avatar',
      p.avatar_url
    ),
    profile_color = coalesce(
      p.profile_color,
      public.get_profile_color(
        coalesce(
          au.raw_user_meta_data ->> 'full_name',
          au.raw_user_meta_data ->> 'name',
          au.raw_user_meta_data ->> 'display_name',
          p.full_name,
          au.email
        )
      )
    ),
    updated_at = now()
  from auth.users au
  where p.id = au.id;
$$;

-- =====================================================
-- Trigger para incrementar views_count en articles
-- =====================================================
create or replace function public.increment_article_views_count()
returns trigger
language plpgsql
as $$
begin
  update public.articles
  set views_count = views_count + 1
  where id = new.article_id;

  return new;
end;
$$;

drop trigger if exists article_views_increment_count on public.article_views;
create trigger article_views_increment_count
after insert on public.article_views
for each row execute function public.increment_article_views_count();

-- =====================================================
-- Optional: un indice de busqueda full-text simple
-- =====================================================
-- Si luego queres usar search vector, podrias activarlo en otra fase.
-- Por ahora, la app puede filtrar con ilike desde el cliente.

-- =====================================================
-- RLS (seguro y compatible con anon key para sitio publico)
-- =====================================================
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.tags enable row level security;
alter table public.articles enable row level security;
alter table public.article_tags enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.article_views enable row level security;
alter table public.site_settings enable row level security;
alter table public.homepage_sections enable row level security;

-- Public read for published content
drop policy if exists "public_read_published_articles" on public.articles;
create policy "public_read_published_articles"
  on public.articles
  for select
  using (
    status = 'published'
    and (published_at is null or published_at <= now())
  );

drop policy if exists "public_read_categories" on public.categories;
create policy "public_read_categories"
  on public.categories
  for select
  using (true);

drop policy if exists "public_read_tags" on public.tags;
create policy "public_read_tags"
  on public.tags
  for select
  using (true);

drop policy if exists "public_read_article_tags" on public.article_tags;
create policy "public_read_article_tags"
  on public.article_tags
  for select
  using (true);

drop policy if exists "public_read_profiles" on public.profiles;
create policy "public_read_profiles"
  on public.profiles
  for select
  using (true);

drop policy if exists "users_update_own_profile" on public.profiles;
create policy "users_update_own_profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Permite a editores y administradores cambiar roles y datos de perfiles del equipo.
drop policy if exists "team_manage_profiles" on public.profiles;
create policy "team_manage_profiles"
  on public.profiles
  for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('editor', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('editor', 'admin')
    )
  );

drop policy if exists "public_read_site_settings" on public.site_settings;
create policy "public_read_site_settings"
  on public.site_settings
  for select
  using (true);

drop policy if exists "public_read_homepage_sections" on public.homepage_sections;
create policy "public_read_homepage_sections"
  on public.homepage_sections
  for select
  using (published = true);

-- Anonymous insert for newsletter and article views
drop policy if exists "anonymous_insert_newsletter" on public.newsletter_subscribers;
create policy "anonymous_insert_newsletter"
  on public.newsletter_subscribers
  for insert
  with check (true);

drop policy if exists "team_manage_newsletter_subscribers" on public.newsletter_subscribers;
create policy "team_manage_newsletter_subscribers"
  on public.newsletter_subscribers
  for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('editor', 'admin')
    )
  );

create policy "team_manage_newsletter_subscribers_update"
  on public.newsletter_subscribers
  for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('editor', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('editor', 'admin')
    )
  );

drop policy if exists "anonymous_insert_article_views" on public.article_views;
create policy "anonymous_insert_article_views"
  on public.article_views
  for insert
  with check (true);

-- Editor/admin writes on content tables
drop policy if exists "authenticated_manage_content" on public.categories;
create policy "authenticated_manage_content"
  on public.categories
  for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('editor', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('editor', 'admin')
    )
  );

drop policy if exists "authenticated_manage_tags" on public.tags;
create policy "authenticated_manage_tags"
  on public.tags
  for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('editor', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('editor', 'admin')
    )
  );

drop policy if exists "authenticated_manage_articles" on public.articles;
create policy "authenticated_manage_articles"
  on public.articles
  for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('editor', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('editor', 'admin')
    )
  );

drop policy if exists "authenticated_manage_article_tags" on public.article_tags;
create policy "authenticated_manage_article_tags"
  on public.article_tags
  for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('editor', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('editor', 'admin')
    )
  );

drop policy if exists "authenticated_manage_homepage_sections" on public.homepage_sections;
create policy "authenticated_manage_homepage_sections"
  on public.homepage_sections
  for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('editor', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('editor', 'admin')
    )
  );

-- =====================================================
-- Datos iniciales recomendados
-- =====================================================
-- Categoriales de ejemplo
insert into public.categories (id, name, slug, color, sort_order)
values
  (uuid_generate_v4(), 'Política', 'politica', '#D7191F', 1),
  (uuid_generate_v4(), 'Economía', 'economia', '#0B1220', 2),
  (uuid_generate_v4(), 'Sociedad', 'sociedad', '#6B7280', 3),
  (uuid_generate_v4(), 'Deportes', 'deportes', '#1D4ED8', 4),
  (uuid_generate_v4(), 'Cultura', 'cultura', '#7C3AED', 5)
on conflict (slug) do nothing;

-- Etiquetas base
insert into public.tags (id, name, slug)
values
  (uuid_generate_v4(), 'Chaco', 'chaco'),
  (uuid_generate_v4(), 'Paraguay', 'paraguay'),
  (uuid_generate_v4(), 'Local', 'local'),
  (uuid_generate_v4(), 'Economía', 'economia'),
  (uuid_generate_v4(), 'Social', 'social')
on conflict (slug) do nothing;

-- =====================================================
-- Fin del schema
-- =====================================================
