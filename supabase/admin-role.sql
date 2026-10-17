-- Asignar el rol de administrador a la cuenta real del editor principal.
-- Ejemplo para kentoterakawa@gmail.com

update public.profiles
set role = 'admin'
where id = (
  select id
  from auth.users
  where email = 'kentoterakawa@gmail.com'
  limit 1
);

-- Si no existe aún el perfil para ese usuario, crearlo y dejarlo como admin.
-- insert into public.profiles (id, full_name, avatar_url, role)
-- values (
--   (select id from auth.users where email = 'kentoterakawa@gmail.com'),
--   'Kento Terakawa',
--   null,
--   'admin'
-- )
-- on conflict (id) do update set role = 'admin', full_name = excluded.full_name;

-- Verificación rápida:
-- select id, email, full_name, role
-- from auth.users u
-- left join public.profiles p on p.id = u.id
-- where u.email = 'kentoterakawa@gmail.com';
