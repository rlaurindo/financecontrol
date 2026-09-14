create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  can_import_whatsapp boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users
  add column if not exists can_import_whatsapp boolean not null default false;

alter table public.users
  add column if not exists updated_at timestamptz not null default now();

insert into public.users (id, email, can_import_whatsapp)
select
  id,
  lower(email),
  lower(email) = 'robson.laurindo@gmail.com'
from auth.users
where email is not null
on conflict (id) do update
set
  email = excluded.email,
  can_import_whatsapp = public.users.can_import_whatsapp or excluded.can_import_whatsapp,
  updated_at = now();

update public.users
set
  can_import_whatsapp = true,
  updated_at = now()
where lower(email) = 'robson.laurindo@gmail.com';

alter table public.users enable row level security;

grant select on public.users to authenticated;

drop policy if exists "users_select_own_permissions" on public.users;

create policy "users_select_own_permissions"
on public.users
for select
to authenticated
using (
  id = (select auth.uid())
  or lower(email) = lower((select auth.jwt() ->> 'email'))
);
