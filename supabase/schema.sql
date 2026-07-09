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

-- Permisos de tabla para usuarios logueados. Sin esto, la RLS ni siquiera
-- llega a evaluarse y toda operación falla con "permission denied" (42501).
grant select, insert, update on public.perfiles to authenticated;

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

-- Permisos de tabla para usuarios logueados (imprescindible además de la RLS;
-- sin esto el guardado del plan falla siempre con 42501 y la tabla queda vacía).
grant select, insert, update, delete on public.planes to authenticated;

-- ---------- Recetas de la comunidad ----------
-- Recetas creadas por los usuarios desde la web. La columna `receta` guarda
-- el mismo formato jsonb que las recetas del catálogo (nombre, categoria,
-- img, kcalAprox, ingredientes[], pasos[]).
create table if not exists public.recetas_comunidad (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  autor text not null,
  receta jsonb not null,
  creado_en timestamptz not null default now()
);

alter table public.recetas_comunidad enable row level security;

-- Las recetas publicadas son públicas: las ve todo el mundo, también sin sesión.
drop policy if exists "recetas_comunidad_leer_todos" on public.recetas_comunidad;
create policy "recetas_comunidad_leer_todos" on public.recetas_comunidad
  for select using (true);

-- Publicar requiere sesión y solo en nombre propio.
drop policy if exists "recetas_comunidad_publicar_propia" on public.recetas_comunidad;
create policy "recetas_comunidad_publicar_propia" on public.recetas_comunidad
  for insert with check (auth.uid() = user_id);

-- Borrar: el autor puede borrar las suyas; el administrador (este correo,
-- el mismo que ADMIN_EMAIL en src/logica.ts) puede borrar cualquiera.
drop policy if exists "recetas_comunidad_borrar" on public.recetas_comunidad;
create policy "recetas_comunidad_borrar" on public.recetas_comunidad
  for delete using (
    auth.uid() = user_id
    or (auth.jwt() ->> 'email') = 'merinofernandezeduardo@gmail.com'
  );

-- Permisos de tabla (imprescindibles además de la RLS, ver nota en perfiles).
grant select on public.recetas_comunidad to anon, authenticated;
grant select, insert, delete on public.recetas_comunidad to authenticated;

-- ---------- Favoritos ----------
-- Recetas que el usuario guarda con el corazón. `receta_id` es texto porque
-- mezcla ids del catálogo estático ("des1", "cine3"…) y uuids de
-- recetas_comunidad. Una fila por usuario y receta.
create table if not exists public.favoritos (
  user_id uuid not null references auth.users (id) on delete cascade,
  receta_id text not null,
  creado_en timestamptz not null default now(),
  primary key (user_id, receta_id)
);

alter table public.favoritos enable row level security;

-- Cada usuario solo ve y toca sus propios favoritos.
drop policy if exists "favoritos_propios" on public.favoritos;
create policy "favoritos_propios" on public.favoritos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Permisos de tabla (imprescindibles además de la RLS, ver nota en perfiles).
-- update incluido: el corazón guarda con upsert (INSERT ... ON CONFLICT DO
-- UPDATE), que exige ese privilegio además de insert.
grant select, insert, update, delete on public.favoritos to authenticated;

-- ============================================================
-- Las Fases 2 (progreso) y 3 (amigos) añadirán las tablas
-- `registros` y `amistades` aquí más adelante.
-- ============================================================
