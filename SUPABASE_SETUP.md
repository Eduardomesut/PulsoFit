# Configurar cuentas y login (Supabase) — Fase 1

Con esto, los usuarios podrán **registrarse, iniciar sesión y guardar su plan** en la nube.
Mientras no lo configures, la web funciona igual pero en modo invitado (sin botón de login).

## 1. Crea un proyecto en Supabase (gratis)
1. Entra en https://supabase.com y crea una cuenta.
2. **New project** → ponle un nombre (p. ej. `pulsofit`) y una contraseña de base de datos.
3. Espera ~1 minuto a que se aprovisione.

## 2. Crea las tablas
1. En el proyecto, ve a **SQL Editor**.
2. Abre el archivo [`supabase/schema.sql`](./supabase/schema.sql) de este repo, copia **todo** su contenido y pégalo.
3. Pulsa **Run**. Debe crear las tablas `perfiles` y `planes` con sus políticas de seguridad.

## 3. Consigue tus credenciales
En **Project Settings → API**, copia:
- **Project URL** → `VITE_SUPABASE_URL`
- **anon public key** → `VITE_SUPABASE_ANON_KEY`

(La clave `anon` es pública; no pasa nada por que se vea. La seguridad la dan las políticas RLS.)

## 4. Ponlas en `.env.production`
Este repo ya incluye un `.env.production` con las credenciales del proyecto actual.
Si algún día cambias de proyecto Supabase, edita ese archivo con la nueva URL y clave
y haz push: el despliegue las incorpora automáticamente. (La clave `anon` es pública
por diseño, así que puede vivir en el repo sin problema.)

## 5. (Opcional) Desarrollo local
Copia `.env.example` a `.env.local` y rellena los dos valores. Luego `npm run dev`.

## 6. (Opcional) Registro sin confirmar el email
Por defecto Supabase envía un email de confirmación al registrarse. Para probar más rápido:
**Authentication → Providers → Email → desactiva "Confirm email"**. En producción es recomendable dejarlo activado.

---

### ¿Qué guarda ahora mismo?
- Un **perfil** por usuario (se crea solo al registrarse).
- El **último plan** generado por cada usuario, que se recupera al iniciar sesión ("Continuar con mi plan guardado").

Las Fases 2 (registrar progreso) y 3 (amigos y ver su progreso) se construirán sobre esta misma base.
