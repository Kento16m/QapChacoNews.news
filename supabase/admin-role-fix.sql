-- =====================================================
-- EJECUTAR EN: Supabase Dashboard > SQL Editor
-- DESDE: Proyecto de Supabase
-- HACIA: auth.users y public.profiles
-- =====================================================
-- NO EJECUTAR EN EL TERMINAL LOCAL, NO EN VS CODE,
-- NO EN UN MIGRADOR DEL PROYECTO.
-- Este script corrige el caso en que el usuario autenticado
-- no tiene perfil y/o no tiene rol admin asignado.
-- =====================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS profile_color text,
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'reader',
  ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS blocked_reason text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 1) Asegurar que exista el perfil del usuario y dejarlo con datos básicos.
insert into public.profiles (id, full_name, avatar_url, profile_color, role, is_blocked, blocked_reason, created_at, updated_at)
select
  au.id,
  coalesce(
    au.raw_user_meta_data ->> 'full_name',
    au.raw_user_meta_data ->> 'name',
    au.raw_user_meta_data ->> 'display_name',
    au.email
  ) as full_name,
  coalesce(
    au.raw_user_meta_data ->> 'avatar_url',
    au.raw_user_meta_data ->> 'picture',
    au.raw_user_meta_data ->> 'avatar',
    null
  ) as avatar_url,
  case
    when exists (select 1 from pg_proc where proname = 'get_profile_color') then public.get_profile_color(
      coalesce(
        au.raw_user_meta_data ->> 'full_name',
        au.raw_user_meta_data ->> 'name',
        au.raw_user_meta_data ->> 'display_name',
        au.email
      )
    )
    else '#7c3aed'
  end as profile_color,
  'reader' as role,
  false as is_blocked,
  null as blocked_reason,
  now() as created_at,
  now() as updated_at
from auth.users au
where au.email = 'TU_EMAIL_AQUI@dominio.com'
on conflict (id) do update set
  full_name = coalesce(public.profiles.full_name, excluded.full_name),
  avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
  profile_color = coalesce(public.profiles.profile_color, excluded.profile_color),
  role = coalesce(public.profiles.role, excluded.role),
  is_blocked = coalesce(public.profiles.is_blocked, excluded.is_blocked),
  blocked_reason = coalesce(public.profiles.blocked_reason, excluded.blocked_reason),
  updated_at = now();

-- 2) Conceder rol de administrador al usuario correcto.
update public.profiles
set role = 'admin',
    is_blocked = false,
    blocked_reason = null,
    updated_at = now()
where id = (
  select id
  from auth.users
  where email = 'TU_EMAIL_AQUI@dominio.com'
  limit 1
);

-- 3) Validación rápida: confirma que el usuario quedó con perfil y rol admin.
select
  u.id,
  u.email,
  p.full_name,
  p.role,
  p.is_blocked,
  p.blocked_reason,
  p.created_at,
  p.updated_at
from auth.users u
left join public.profiles p on p.id = u.id
where u.email = 'TU_EMAIL_AQUI@dominio.com';
