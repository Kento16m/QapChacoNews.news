-- =====================================================
-- EJECUTAR EN: Supabase Dashboard > SQL Editor
-- DESDE: Proyecto de Supabase actual
-- HACIA: auth.users y public.profiles
-- =====================================================
-- ESTE SCRIPT ES INDEPENDIENTE de schema.sql y de
-- admin-access-control.sql. NO LO MEZCLÉS con el resto.
-- =====================================================
-- USO:
-- 1) Reemplazá TU_EMAIL_AQUI@dominio.com por el email real
--    del usuario administrador.
-- 2) Ejecutá este archivo SOLO en Supabase SQL Editor.
-- 3) Verificá el resultado con la query final.
-- =====================================================

-- Si el esquema ya existente no tiene los campos nuevos,
-- los agregamos sin romper la base actual.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS profile_color text,
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'reader',
  ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS blocked_reason text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.profiles
SET role = COALESCE(role, 'reader'),
    is_blocked = COALESCE(is_blocked, false),
    updated_at = COALESCE(updated_at, now())
WHERE id IS NOT NULL;

WITH target_user AS (
  SELECT id, email
  FROM auth.users
  WHERE email = 'kentoterakawa@gmail.com'
  LIMIT 1
)
INSERT INTO public.profiles (
  id,
  full_name,
  avatar_url,
  profile_color,
  role,
  is_blocked,
  blocked_reason,
  created_at,
  updated_at
)
SELECT
  tu.id,
  COALESCE(
    (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = tu.id),
    (SELECT raw_user_meta_data->>'name' FROM auth.users WHERE id = tu.id),
    (SELECT raw_user_meta_data->>'display_name' FROM auth.users WHERE id = tu.id),
    tu.email
  ) AS full_name,
  COALESCE(
    (SELECT raw_user_meta_data->>'avatar_url' FROM auth.users WHERE id = tu.id),
    (SELECT raw_user_meta_data->>'picture' FROM auth.users WHERE id = tu.id),
    NULL
  ) AS avatar_url,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_proc WHERE proname = 'get_profile_color'
    ) THEN (
      SELECT public.get_profile_color(
        COALESCE(
          (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = tu.id),
          (SELECT raw_user_meta_data->>'name' FROM auth.users WHERE id = tu.id),
          (SELECT raw_user_meta_data->>'display_name' FROM auth.users WHERE id = tu.id),
          tu.email
        )
      )
    )
    ELSE '#7c3aed'
  END AS profile_color,
  'reader' AS role,
  false AS is_blocked,
  NULL AS blocked_reason,
  now() AS created_at,
  now() AS updated_at
FROM target_user tu
ON CONFLICT (id) DO UPDATE SET
  full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
  avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
  profile_color = COALESCE(public.profiles.profile_color, EXCLUDED.profile_color),
  is_blocked = COALESCE(public.profiles.is_blocked, false),
  blocked_reason = COALESCE(public.profiles.blocked_reason, EXCLUDED.blocked_reason),
  updated_at = now();

UPDATE public.profiles
SET role = 'admin',
    is_blocked = false,
    blocked_reason = NULL,
    updated_at = now()
WHERE id IN (
  SELECT id
  FROM auth.users
  WHERE email = 'TU_EMAIL_AQUI@dominio.com'
);

-- Verificación rápida. Si todo está bien, deberías ver un usuario con role = admin.
SELECT
  u.id,
  u.email,
  p.full_name,
  p.role,
  p.is_blocked,
  p.blocked_reason,
  p.updated_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'TU_EMAIL_AQUI@dominio.com';
