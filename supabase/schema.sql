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

-- ---------- Chef IA: cuota diaria de consultas ----------
-- Cada usuario tiene un contador de consultas por día. La Edge Function
-- `chef` llama a consumir_uso_chef() antes de cada consulta a la IA:
-- si devuelve -1, la cuota está agotada y no se llama al modelo.
create table if not exists public.chef_usos (
  user_id uuid not null references auth.users (id) on delete cascade,
  dia date not null default current_date,
  usados int not null default 0,
  primary key (user_id, dia)
);

alter table public.chef_usos enable row level security;

-- El usuario puede consultar su propio consumo; solo la función (security
-- definer) escribe en la tabla.
drop policy if exists "chef_usos_ver_propio" on public.chef_usos;
create policy "chef_usos_ver_propio" on public.chef_usos
  for select using (auth.uid() = user_id);

grant select on public.chef_usos to authenticated;

-- Consume un uso de forma atómica y devuelve cuántos quedan hoy,
-- o -1 si la cuota ya estaba agotada. El límite vive aquí, en la BD:
-- el cliente no puede saltárselo.
create or replace function public.consumir_uso_chef(limite int default 10)
returns int
language plpgsql
security definer set search_path = public
as $$
declare
  v_usados int;
begin
  if auth.uid() is null then
    return -1;
  end if;
  insert into chef_usos (user_id, dia, usados)
  values (auth.uid(), current_date, 1)
  on conflict (user_id, dia) do update
    set usados = chef_usos.usados + 1
    where chef_usos.usados < limite
  returning usados into v_usados;
  if v_usados is null then
    return -1; -- el WHERE impidió el update: cuota agotada
  end if;
  return limite - v_usados;
end;
$$;

grant execute on function public.consumir_uso_chef(int) to authenticated;

-- ============================================================
-- FASE 3 · Amigos, chat y recetas compartidas
-- ============================================================

-- ---------- Nombre de usuario público (handle) ----------
-- Identificador único y buscable para que los amigos se encuentren.
-- Formato: minúsculas, números y guion bajo, 3-20 caracteres.
alter table public.perfiles add column if not exists usuario text;

alter table public.perfiles drop constraint if exists perfiles_usuario_formato;
alter table public.perfiles add constraint perfiles_usuario_formato
  check (usuario is null or usuario ~ '^[a-z0-9_]{3,20}$');

-- Único ignorando NULLs (varios perfiles pueden no tener usuario aún).
create unique index if not exists perfiles_usuario_key on public.perfiles (usuario);

-- Búsqueda de usuarios por prefijo del handle. SECURITY DEFINER para poder
-- leer perfiles ajenos, pero solo devuelve id/usuario/nombre y nunca permite
-- enumerar (exige término de 2+ caracteres y sesión iniciada).
create or replace function public.buscar_usuarios(termino text)
returns table (id uuid, usuario text, nombre text)
language sql security definer set search_path = public
as $$
  select p.id, p.usuario, p.nombre
  from public.perfiles p
  where auth.uid() is not null
    and p.usuario is not null
    and p.id <> auth.uid()
    and length(coalesce(termino, '')) >= 2
    and p.usuario like lower(termino) || '%'
  order by p.usuario
  limit 10;
$$;
revoke execute on function public.buscar_usuarios(text) from public, anon;
grant execute on function public.buscar_usuarios(text) to authenticated;

-- ---------- Amistades ----------
-- Una fila por relación, con dirección (quién la pidió) y estado.
create table if not exists public.amistades (
  id uuid primary key default gen_random_uuid(),
  solicitante uuid not null references auth.users (id) on delete cascade,
  receptor uuid not null references auth.users (id) on delete cascade,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aceptada')),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint amistades_distintos check (solicitante <> receptor),
  unique (solicitante, receptor)
);

alter table public.amistades enable row level security;

-- Ver: cualquiera de las dos partes de la relación.
drop policy if exists "amistades_ver" on public.amistades;
create policy "amistades_ver" on public.amistades
  for select using (auth.uid() = solicitante or auth.uid() = receptor);

-- Crear: solo tú como solicitante (la RPC enviar_solicitud es la vía normal).
drop policy if exists "amistades_crear" on public.amistades;
create policy "amistades_crear" on public.amistades
  for insert with check (auth.uid() = solicitante and solicitante <> receptor);

-- Aceptar: solo el receptor pasa la solicitud a 'aceptada'.
drop policy if exists "amistades_aceptar" on public.amistades;
create policy "amistades_aceptar" on public.amistades
  for update using (auth.uid() = receptor) with check (auth.uid() = receptor);

-- Rechazar / eliminar amigo: cualquiera de las dos partes borra la fila.
drop policy if exists "amistades_borrar" on public.amistades;
create policy "amistades_borrar" on public.amistades
  for delete using (auth.uid() = solicitante or auth.uid() = receptor);

grant select, insert, update, delete on public.amistades to authenticated;

-- Envía una solicitud por handle. Centraliza la lógica: si ya existe una
-- solicitud en sentido contrario, la acepta directamente; evita duplicados.
-- Devuelve un código: enviada | aceptada | ya_amigos | ya_pendiente |
-- no_existe | uno_mismo | error.
create or replace function public.enviar_solicitud(destino text)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_dest uuid;
  v_estado text;
begin
  if auth.uid() is null then return 'error'; end if;
  select id into v_dest from public.perfiles where usuario = lower(destino);
  if v_dest is null then return 'no_existe'; end if;
  if v_dest = auth.uid() then return 'uno_mismo'; end if;
  select estado into v_estado from public.amistades
    where (solicitante = auth.uid() and receptor = v_dest)
       or (solicitante = v_dest and receptor = auth.uid())
    limit 1;
  if v_estado = 'aceptada' then return 'ya_amigos'; end if;
  if v_estado = 'pendiente' then
    update public.amistades set estado = 'aceptada', actualizado_en = now()
      where solicitante = v_dest and receptor = auth.uid() and estado = 'pendiente';
    if found then return 'aceptada'; end if;
    return 'ya_pendiente';
  end if;
  insert into public.amistades (solicitante, receptor) values (auth.uid(), v_dest);
  return 'enviada';
end;
$$;
revoke execute on function public.enviar_solicitud(text) from public, anon;
grant execute on function public.enviar_solicitud(text) to authenticated;

-- Estado social del usuario en una sola llamada: amigos aceptados, solicitudes
-- recibidas y enviadas, cada uno con el perfil (usuario/nombre) de la otra
-- persona. SECURITY DEFINER para unir con perfiles sin abrir su RLS.
create or replace function public.estado_social()
returns json
language sql security definer set search_path = public
as $$
  select json_build_object(
    'amigos', coalesce((
      select json_agg(json_build_object(
        'amistad_id', a.id, 'id', p.id, 'usuario', p.usuario, 'nombre', p.nombre
      ) order by p.usuario)
      from public.amistades a
      join public.perfiles p
        on p.id = case when a.solicitante = auth.uid() then a.receptor else a.solicitante end
      where a.estado = 'aceptada' and (a.solicitante = auth.uid() or a.receptor = auth.uid())
    ), '[]'::json),
    'recibidas', coalesce((
      select json_agg(json_build_object(
        'amistad_id', a.id, 'id', p.id, 'usuario', p.usuario, 'nombre', p.nombre, 'creado_en', a.creado_en
      ) order by a.creado_en desc)
      from public.amistades a
      join public.perfiles p on p.id = a.solicitante
      where a.estado = 'pendiente' and a.receptor = auth.uid()
    ), '[]'::json),
    'enviadas', coalesce((
      select json_agg(json_build_object(
        'amistad_id', a.id, 'id', p.id, 'usuario', p.usuario, 'nombre', p.nombre
      ) order by a.creado_en desc)
      from public.amistades a
      join public.perfiles p on p.id = a.receptor
      where a.estado = 'pendiente' and a.solicitante = auth.uid()
    ), '[]'::json)
  );
$$;
revoke execute on function public.estado_social() from public, anon;
grant execute on function public.estado_social() to authenticated;

-- ---------- Mensajes (chat 1 a 1) ----------
-- Cada fila es un mensaje entre dos usuarios. `receta` guarda, opcionalmente,
-- una instantánea de la receta compartida (mismo formato que el catálogo) para
-- que se siga viendo aunque la original se borre.
create table if not exists public.mensajes (
  id uuid primary key default gen_random_uuid(),
  emisor uuid not null references auth.users (id) on delete cascade,
  receptor uuid not null references auth.users (id) on delete cascade,
  texto text,
  receta jsonb,
  leido boolean not null default false,
  creado_en timestamptz not null default now(),
  constraint mensajes_contenido check (texto is not null or receta is not null),
  constraint mensajes_distintos check (emisor <> receptor)
);

alter table public.mensajes enable row level security;
-- Replica identity full: permite filtrar eventos realtime por cualquier columna.
alter table public.mensajes replica identity full;

-- Ver: emisor o receptor del mensaje.
drop policy if exists "mensajes_ver" on public.mensajes;
create policy "mensajes_ver" on public.mensajes
  for select using (auth.uid() = emisor or auth.uid() = receptor);

-- Enviar: solo como emisor y solo si hay amistad aceptada con el receptor.
drop policy if exists "mensajes_enviar" on public.mensajes;
create policy "mensajes_enviar" on public.mensajes
  for insert with check (
    auth.uid() = emisor
    and exists (
      select 1 from public.amistades a
      where a.estado = 'aceptada'
        and ((a.solicitante = mensajes.emisor and a.receptor = mensajes.receptor)
          or (a.solicitante = mensajes.receptor and a.receptor = mensajes.emisor))
    )
  );

-- Marcar como leído: solo el receptor.
drop policy if exists "mensajes_marcar_leido" on public.mensajes;
create policy "mensajes_marcar_leido" on public.mensajes
  for update using (auth.uid() = receptor) with check (auth.uid() = receptor);

grant select, insert, update on public.mensajes to authenticated;

create index if not exists mensajes_conversacion on public.mensajes (emisor, receptor, creado_en);
create index if not exists mensajes_no_leidos on public.mensajes (receptor, leido);

-- ---------- Realtime ----------
-- Suscribe mensajes y amistades a la publicación de realtime (para el chat en
-- vivo y las notificaciones). Idempotente: no falla si ya están añadidas.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'mensajes') then
    alter publication supabase_realtime add table public.mensajes;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'amistades') then
    alter publication supabase_realtime add table public.amistades;
  end if;
end $$;

-- ============================================================
-- La Fase 2 (progreso) añadirá la tabla `registros` aquí más adelante.
-- ============================================================
