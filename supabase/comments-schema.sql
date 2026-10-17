-- ==========================================
-- QAP ChacoNews: comentarios y likes
-- Ejecutar en Supabase SQL Editor
-- ==========================================

create extension if not exists "pgcrypto";

create table if not exists public.comments (
  id bigserial primary key,
  article_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_id bigint null references public.comments(id) on delete cascade,
  body text not null,
  like_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.comment_likes (
  id bigserial primary key,
  comment_id bigint not null references public.comments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (comment_id, user_id)
);

create index if not exists idx_comments_article_id
  on public.comments (article_id);

create index if not exists idx_comments_parent_id
  on public.comments (parent_id);

create index if not exists idx_comments_article_parent
  on public.comments (article_id, parent_id);

create index if not exists idx_comment_likes_comment_id
  on public.comment_likes (comment_id);

create index if not exists idx_comment_likes_user_id
  on public.comment_likes (user_id);

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace function public.sync_comment_like_count()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update public.comments
    set like_count = like_count + 1
    where id = new.comment_id;
    return new;
  end if;

  if tg_op = 'DELETE' then
    update public.comments
    set like_count = greatest(like_count - 1, 0)
    where id = old.comment_id;
    return old;
  end if;

  return null;
end;
$$ language plpgsql;

drop trigger if exists comments_updated_at on public.comments;
create trigger comments_updated_at
before update on public.comments
for each row
execute function public.handle_updated_at();

drop trigger if exists comment_likes_insert on public.comment_likes;
create trigger comment_likes_insert
after insert or delete on public.comment_likes
for each row
execute function public.sync_comment_like_count();

alter table public.comments enable row level security;
alter table public.comment_likes enable row level security;

create policy "Public comments are viewable by everyone"
on public.comments
for select
using (true);

create policy "Authenticated users can insert comments"
on public.comments
for insert
with check (
  auth.role() = 'authenticated'
  and auth.uid() = user_id
  and length(trim(body)) between 1 and 2000
);

create policy "Users can update their own comments"
on public.comments
for update
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and length(trim(body)) between 1 and 2000
);

create policy "Users can delete their own comments or admins can moderate"
on public.comments
for delete
using (auth.uid() = user_id or public.is_admin_or_editor());

create policy "Authenticated users can like comments"
on public.comment_likes
for insert
with check (
  auth.role() = 'authenticated'
  and auth.uid() = user_id
);

create policy "Users can remove their own likes"
on public.comment_likes
for delete
using (auth.uid() = user_id);

grant select on public.comments to anon;
grant select on public.comment_likes to anon;

grant insert, update, delete on public.comments to authenticated;
grant insert, delete on public.comment_likes to authenticated;
