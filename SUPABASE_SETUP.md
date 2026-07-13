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

## 7. Chef IA (chat de cocina para usuarios)

El Chef IA es un chat exclusivo para usuarios con sesión, con **10 consultas al día** por usuario. Usa **Groq**, que tiene un plan **gratuito sin tarjeta**. La clave de la API nunca toca el navegador: vive como secret en una Edge Function.

Pasos (necesitas la [CLI de Supabase](https://supabase.com/docs/guides/cli) y una clave gratuita de [console.groq.com/keys](https://console.groq.com/keys)):

1. **Re-ejecuta `supabase/schema.sql`** en el SQL Editor (añade la tabla `chef_usos` y la función `consumir_uso_chef`, que aplica la cuota diaria en la base de datos).
2. **Consigue la clave gratis:** entra en https://console.groq.com, regístrate (sin tarjeta), ve a **API Keys → Create API Key** y copia la clave (empieza por `gsk_...`).
3. **Vincula el proyecto y guarda la clave como secret:**
   ```bash
   supabase link --project-ref TU_PROJECT_REF
   supabase secrets set GROQ_API_KEY=gsk_...
   ```
4. **Despliega la función:**
   ```bash
   supabase functions deploy chef --no-verify-jwt
   ```

Nada más. El front ya sabe hablar con ella; si la función no está desplegada, la sección Chef IA muestra un aviso amable y el resto de la app no se ve afectada.

**Coste:** **0 €.** Groq sirve modelos abiertos (Llama 3.3 70B) en su plan gratuito, con límites de uso holgados de sobra para la cuota de 10 consultas/día por usuario. Si algún día quisieras cambiar de proveedor o modelo, se toca en un solo sitio: `MODELO` y la URL de la API en `supabase/functions/chef/index.ts`. El límite diario se cambia en `LIMITE_DIARIO` (y el `limite` por defecto de la función SQL).

> Nota: la función se despliega con `--no-verify-jwt` **a propósito**. No es que no haya seguridad: la propia función valida el JWT de Supabase y rechaza a quien no tenga sesión. Se hace así para que el *preflight* CORS (`OPTIONS`, que el navegador manda sin cabecera de autorización) no lo bloquee la pasarela de Supabase antes de llegar al código.
