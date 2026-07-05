-- ============================================================
-- PULSO · Esquema de base de datos (Fase 1: cuentas + planes)
-- Pega y ejecuta este archivo entero en el SQL Editor de Supabase.
-- ============================================================

-- ---------- Perfiles ----------
create table if not exists public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text,
  creado_en timestamptz not null default now()
);

alter table public.perfiles enable row level security;

drop policy if exists "perfiles_ver_propio" on public.perfiles;
create policy "perfiles_ver_propio" on public.perfiles
  for select using (auth.uid() = id);

drop policy if exists "perfiles_editar_propio" on public.perfiles;
create policy "perfiles_editar_propio" on public.perfiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "perfiles_insertar_propio" on public.perfiles;
create policy "perfiles_insertar_propio" on public.perfiles
  for insert with check (auth.uid() = id);

-- Crea automáticamente el perfil cuando alguien se registra.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.perfiles (id, nombre)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Planes (uno por usuario) ----------
create table if not exists public.planes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  datos jsonb not null,
  actualizado_en timestamptz not null default now()
);

alter table public.planes enable row level security;

-- Cada usuario solo puede leer y escribir su propio plan.
drop policy if exists "planes_propios" on public.planes;
create policy "planes_propios" on public.planes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- Las Fases 2 (progreso) y 3 (amigos) añadirán las tablas
-- `registros` y `amistades` aquí más adelante.
-- ============================================================
