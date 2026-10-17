-- =====================================================
-- QAP ChacoNews - Admin moderation helpers
-- Ejecutar en Supabase SQL Editor como bloque standalone.
-- =====================================================

create or replace function public.is_admin_or_editor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('editor', 'admin')
  );
$$;

-- Permite que admins/editors eliminen comentarios con moderación.
drop policy if exists "Users can delete their own comments or admins can moderate" on public.comments;
create policy "Users can delete their own comments or admins can moderate"
on public.comments
for delete
using (auth.uid() = user_id or public.is_admin_or_editor());
