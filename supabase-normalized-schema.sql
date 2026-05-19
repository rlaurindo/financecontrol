create table if not exists public.entradas (
  id text primary key,
  client_name text not null,
  operator_name text not null,
  entry_date date not null,
  payment_method text not null,
  transfer_person text,
  city text not null,
  amount numeric not null default 0,
  description text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saidas (
  id text primary key,
  description text not null,
  amount numeric not null default 0,
  category text not null,
  payment_date date not null,
  payment_method text not null,
  transfer_person text,
  city text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categorias (
  id text primary key,
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.localidades (
  id text primary key,
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.operacionais (
  id text primary key,
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.metodos_pagamento (
  id text primary key,
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.configuracoes (
  id integer primary key check (id = 1),
  theme text not null default 'green',
  auth jsonb not null default '{"username":"admin","password":"admin123"}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.entradas enable row level security;
alter table public.saidas enable row level security;
alter table public.categorias enable row level security;
alter table public.localidades enable row level security;
alter table public.operacionais enable row level security;
alter table public.metodos_pagamento enable row level security;
alter table public.configuracoes enable row level security;

drop policy if exists "entradas_all" on public.entradas;
drop policy if exists "saidas_all" on public.saidas;
drop policy if exists "categorias_all" on public.categorias;
drop policy if exists "localidades_all" on public.localidades;
drop policy if exists "operacionais_all" on public.operacionais;
drop policy if exists "metodos_pagamento_all" on public.metodos_pagamento;
drop policy if exists "configuracoes_all" on public.configuracoes;

create policy "entradas_all"
on public.entradas
for all
to anon, authenticated
using (true)
with check (true);

create policy "saidas_all"
on public.saidas
for all
to anon, authenticated
using (true)
with check (true);

create policy "categorias_all"
on public.categorias
for all
to anon, authenticated
using (true)
with check (true);

create policy "localidades_all"
on public.localidades
for all
to anon, authenticated
using (true)
with check (true);

create policy "operacionais_all"
on public.operacionais
for all
to anon, authenticated
using (true)
with check (true);

create policy "metodos_pagamento_all"
on public.metodos_pagamento
for all
to anon, authenticated
using (true)
with check (true);

create policy "configuracoes_all"
on public.configuracoes
for all
to anon, authenticated
using (id = 1)
with check (id = 1);
