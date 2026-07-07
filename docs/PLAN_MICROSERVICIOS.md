# PULSO · Plan de implementación de backend con microservicios

> Plan de evolución de PULSO desde SPA estática (GitHub Pages + Supabase) hacia una
> plataforma con backend propio de microservicios en repositorios separados,
> conectados al front vía API REST. Incluye arquitectura, servicios, contratos,
> infraestructura, fases, funciones nuevas que habilita, testing, costes y riesgos.

---

## 0. Visión y principios

**Objetivo:** añadir un backend real a PULSO sin romper lo que ya funciona, y usarlo
para desbloquear funcionalidades que hoy son imposibles (historial, progreso,
comunidad, notificaciones, administración del catálogo sin redesplegar).

**Principios de diseño (innegociables):**

1. **El front nunca muere.** PULSO hoy funciona 100% en el navegador. Cada servicio
   se integra con *fallback local*: si la API no responde, el front usa la lógica de
   `src/logica.ts` como hasta ahora. El modo invitado se conserva siempre.
2. **Un servicio = una responsabilidad = un repo.** Cada repo se construye, testea,
   versiona y despliega de forma independiente.
3. **Contrato primero (API-first).** Cada endpoint se define en OpenAPI 3 *antes* de
   implementarlo. Los clientes TypeScript del front se generan desde el contrato.
4. **Paridad verificada.** La lógica que se porte a backend (métricas, filtrado,
   generación del plan) debe producir *exactamente* los mismos resultados que
   `logica.ts`. Se verifica con golden tests compartidos (mismos inputs → mismos
   outputs, en JSON, testeados en ambos lados).
5. **Empezar simple.** REST síncrono, una base de datos, sin brokers de mensajería
   hasta que un caso de uso real lo pida. Los microservicios pueden estar bien
   diseñados sin Kafka.

---

## 1. Arquitectura general

```
                       ┌───────────────────────────────┐
                       │   Front — GitHub Pages (SPA)   │
                       │   React + logica.ts (fallback) │
                       └───────────────┬───────────────┘
                                       │ HTTPS / JSON / JWT
                       ┌───────────────▼───────────────┐
                       │        pulso-gateway            │  (fase 2+; al inicio,
                       │  enrutado · CORS · rate limit   │   CORS directo por servicio)
                       └──┬──────────┬──────────┬───────┘
                          │          │          │
        ┌─────────────────▼──┐  ┌────▼───────┐  ┌▼──────────────────┐
        │ pulso-catalogo     │  │ pulso-      │  │ pulso-usuarios    │
        │ recetas, búsqueda, │  │ planes      │  │ perfil, progreso, │
        │ admin              │  │ motor de    │  │ adherencia        │
        │                    │  │ dietas      │  │                   │
        └─────────┬──────────┘  └────┬────────┘  └────────┬──────────┘
                  │                  │                    │
        ┌─────────▼──────────────────▼────────────────────▼──────────┐
        │            PostgreSQL (un esquema por servicio)             │
        └─────────────────────────────────────────────────────────────┘

        Fase 3+:  pulso-social (amistades, compartir)
        Fase 4+:  pulso-notificaciones (emails, lista de la compra)
        Transversal: Supabase Auth como emisor de JWT (se mantiene)
```

**Decisiones transversales:**

| Tema | Decisión | Motivo |
|---|---|---|
| Lenguaje/stack | Java 21 + Spring Boot 3.x | Interés declarado en Java; ecosistema maduro (Spring Data, Security, Actuator) |
| Auth | Se mantiene Supabase Auth como IdP; los servicios validan el JWT contra el JWKS de Supabase | Cero migración de usuarios, login ya funciona; los servicios solo *validan*, no gestionan credenciales |
| Base de datos | Un único Postgres gestionado con **un esquema por servicio** (`catalogo.*`, `planes.*`, `usuarios.*`) | Aislamiento lógico de microservicios con coste de una sola instancia; separable en el futuro |
| Migraciones | Flyway por servicio, en su repo | Versionado del esquema junto al código que lo usa |
| Contratos | OpenAPI 3 en repo propio (`pulso-contratos`), clientes generados | Front y servicios no se desincronizan |
| Comunicación entre servicios | REST síncrono + idempotencia; nada de brokers en fases 1–3 | Simplicidad; los eventos llegan en fase 4 si Notificaciones los necesita |
| Versionado API | Prefijo `/api/v1` | Poder romper contratos sin romper clientes |
| Formato de errores | RFC 7807 (`application/problem+json`) | Estándar, fácil de manejar en el front |
| Observabilidad | Logs JSON estructurados + `/actuator/health` + UptimeRobot | Suficiente para hobby/portfolio; Grafana Cloud free si se quiere más |
| CORS | Origen permitido: `https://eduardomesut.github.io` (+ `http://localhost:5173` en dev) | El front vive en Pages |

---

## 2. Los repositorios

| Repo | Contenido | Fase |
|---|---|---|
| `pulso-contratos` | Especificaciones OpenAPI de todos los servicios, golden tests JSON compartidos, generación de clientes TS/Java | 0 |
| `pulso-catalogo` | Servicio de recetas | 1 |
| `pulso-planes` | Motor de dietas y planes guardados | 2 |
| `pulso-usuarios` | Perfil, progreso corporal, adherencia | 3 |
| `pulso-social` | Amistades, compartir planes | 4 |
| `pulso-notificaciones` | Emails, lista de la compra, resúmenes | 4 |
| `pulso-gateway` | Spring Cloud Gateway (opcional) | 2+ |
| `PulsoFit` (existente) | Front; gana `src/api/` con clientes generados y fallback local | continuo |

Cada repo de servicio comparte la misma plantilla:

```
pulso-<servicio>/
├── src/main/java/es/pulso/<servicio>/
│   ├── api/          # controladores REST (generados o manuales desde OpenAPI)
│   ├── dominio/      # entidades y lógica de negocio pura (sin Spring)
│   ├── infra/        # repositorios JPA, clientes HTTP a otros servicios
│   └── config/       # seguridad (JWT), CORS, OpenAPI
├── src/main/resources/db/migration/   # Flyway V1__..., V2__...
├── src/test/java/    # unit + slice + golden tests de paridad
├── Dockerfile        # imagen distroless multi-stage
├── compose.yml       # levanta el servicio + Postgres local para desarrollo
└── .github/workflows/ci.yml   # build → test → imagen → deploy
```

La separación `dominio/` sin dependencias de Spring replica lo que hicimos con
`logica.ts` en el front: la lógica de negocio se testea sin arrancar el framework.

---

## 3. Diseño de cada servicio

### 3.1 `pulso-catalogo` — el catálogo de recetas como producto

Hoy las recetas están hardcodeadas en `logica.ts`: añadir una receta = PR + deploy.
Este servicio las convierte en datos vivos.

**Endpoints:**

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| GET | `/api/v1/recetas` | Lista paginada; filtros `categoria`, `dieta`, `sinAlergenos`, `q` (búsqueda), `maxKcal` | pública |
| GET | `/api/v1/recetas/{id}` | Detalle completo (ingredientes, pasos) | pública |
| GET | `/api/v1/recetas/cine` | Recetas de series/películas | pública |
| POST | `/api/v1/recetas` | Crear receta | admin |
| PUT | `/api/v1/recetas/{id}` | Editar receta | admin |
| DELETE | `/api/v1/recetas/{id}` | Retirar (soft delete) | admin |
| GET | `/api/v1/catalogo/validacion` | Ejecuta las invariantes del catálogo (regla de autoría) y devuelve el informe | admin |

**Modelo de datos (esquema `catalogo`):**

- `recetas` (id, nombre, categoria, img, kcal_aprox, dietas[], alergenos[],
  contiene[], objetivos[], activa, version, creada_en, actualizada_en)
- `ingredientes` (receta_id, orden, nombre, cantidad)
- `pasos` (receta_id, orden, texto)
- `recetas_cine` (id, obra, tipo, plato, foto_escena, foto_plato, escena, …)

**Detalles clave:**

- **Las invariantes del catálogo que hoy protege `catalogo.test.ts` pasan a ser una
  validación del servicio**: al crear/editar una receta, si la operación deja una
  categoría por debajo de los mínimos (≥5 veganas, ≥5 sin gluten, ≥5 sin lactosa,
  ≥4 seguras), la API la rechaza con un 422 explicando qué mínimo rompería. La regla
  de autoría deja de ser una convención y pasa a ser imposible de violar.
- Búsqueda: `tsvector` de Postgres con diccionario español + `unaccent` (la
  equivalencia del `normalizar` del front, pero en servidor y sobre ingredientes).
- Caché HTTP: `ETag` + `Cache-Control` en los GET públicos (el catálogo cambia poco);
  el front puede cachear en `localStorage` con revalidación.
- Seed inicial: script que importa las ~50 recetas actuales desde `logica.ts`
  exportadas a JSON.

**Front:** `Recetario`, `Cine` y los pools de `filtrarRecetas` consumen la API si está
disponible; si no, usan el catálogo embebido (que se mantiene como snapshot de
respaldo, regenerable con un script desde la API).

### 3.2 `pulso-planes` — el motor de dietas

El corazón: portar `calcularMetricas`, `filtrarRecetas` y `buildDiet` a Java, y
añadir lo que el front solo no puede hacer: historial y planes editables.

**Endpoints:**

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| POST | `/api/v1/planes/generar` | Recibe `datos` (objetivo, sexo, edad, peso, altura, tipoDieta, alergias, noGusta, comidasDia) → devuelve métricas + plan de 7 días | pública (invitado) |
| POST | `/api/v1/planes` | Guarda el plan generado del usuario | JWT |
| GET | `/api/v1/planes` | Historial de planes del usuario (paginado) | JWT |
| GET | `/api/v1/planes/actual` | El plan activo | JWT |
| PATCH | `/api/v1/planes/{id}/comidas/{dia}/{franja}` | **Sustituir una comida**: pide otra receta compatible del pool para esa franja | JWT |
| GET | `/api/v1/planes/{id}/lista-compra` | **Lista de la compra agregada** de la semana (ingredientes sumados y agrupados) | JWT |
| GET | `/api/v1/planes/{id}/pdf` | Generación del PDF en servidor (opcional, fase 2.5) | JWT |

**Modelo de datos (esquema `planes`):**

- `planes` (id, user_id, datos jsonb, metricas jsonb, generado_en, activo)
- `sustituciones` (plan_id, dia, franja, receta_original, receta_nueva, motivo, creada_en)

**Detalles clave:**

- El plan generado sigue siendo determinista, pero al persistirlo con sus
  sustituciones deja de ser necesario regenerarlo: **por fin se pueden editar comidas
  sueltas sin perder el resto** (hoy imposible: el plan se recalcula entero desde
  `datos`).
- **Paridad con el front:** el repo `pulso-contratos` contiene una batería de golden
  files (`caso-001.entrada.json` → `caso-001.salida.json`) generados desde
  `logica.ts`. El servicio Java tiene un test que recorre todos los casos y exige
  igualdad exacta. Vitest tiene el test espejo. Si alguien cambia la fórmula en un
  lado y no en el otro, el CI de contratos falla.
- El servicio consume `pulso-catalogo` para obtener los pools (REST, con caché local
  de 5 min); en fase 1–2, si catálogo no responde, usa su propio snapshot embebido.
- `migrarDatos` vive aquí como migrador de planes antiguos leídos de Supabase.

### 3.3 `pulso-usuarios` — perfil, progreso y adherencia

Lo que convierte PULSO de "generador de dietas" en "seguimiento de tu alimentación".

**Endpoints:**

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| GET/PUT | `/api/v1/perfil` | Datos del usuario (los `datos` del cuestionario + preferencias de notificación) | JWT |
| POST | `/api/v1/progreso/peso` | Registrar pesaje (fecha, kg) | JWT |
| GET | `/api/v1/progreso/peso` | Serie temporal para la gráfica | JWT |
| POST | `/api/v1/adherencia` | Marcar comida cumplida/saltada (dia, franja, fecha) | JWT |
| GET | `/api/v1/adherencia/resumen` | % de adherencia semanal/mensual, rachas | JWT |
| GET | `/api/v1/progreso/informe` | Informe combinado: peso + adherencia + kcal objetivo vs. estimado | JWT |

**Modelo de datos (esquema `usuarios`):** `perfiles`, `pesajes`, `registros_adherencia`.

**Detalles clave:**

- Al registrar pesajes, el servicio puede **sugerir recalcular el plan** (si el peso
  cambió >2 kg desde la última generación, las kcal objetivo ya no son las óptimas):
  emite esa sugerencia en la respuesta y el front ofrece "recalcular mi plan".
- Cierra el círculo del producto: objetivo → plan → seguimiento → ajuste.

### 3.4 `pulso-social` — comunidad (fase 4)

- Amistades (solicitud/aceptación), ver plan y progreso de amigos (con permisos),
  ranking semanal de adherencia entre amigos, compartir una receta o un plan con
  enlace público de solo lectura (`/compartir/{token}`).
- Esquema `social`: `amistades`, `comparticiones`.
- Es la materialización de la tabla `amistades` que `supabase/schema.sql` ya anuncia.

### 3.5 `pulso-notificaciones` — mensajería saliente (fase 4)

- Email semanal (domingo): tu plan de la semana + lista de la compra (consume
  `pulso-planes`).
- Recordatorio de pesaje semanal; aviso de racha de adherencia.
- Implementación: scheduler (Spring `@Scheduled` o cron del hosting) + proveedor de
  email (Resend/Brevo, free tier). Aquí sí aparece la primera comunicación
  asíncrona: una tabla `outbox` en los servicios productores que Notificaciones
  consulta (polling), evitando un broker.

### 3.6 `pulso-gateway` — un solo dominio para todo (fase 2+)

- Spring Cloud Gateway o Caddy/Nginx: `api.pulso.app/catalogo/**` → servicio
  catálogo, etc. Un único CORS, un único rate limit (p. ej. 60 req/min/IP en
  `/planes/generar`), y el front solo conoce una URL base.
- En fase 1 se omite: el front habla directo con el único servicio existente.

---

## 4. Funciones nuevas que habilita el backend

Ordenadas por relación valor/esfuerzo (⭐ = disponible en cuanto exista el servicio del que depende):

| Función | Servicio | Valor |
|---|---|---|
| ⭐ Historial de planes (ver/recuperar planes anteriores) | planes | Hoy solo existe *un* plan por usuario |
| ⭐ Sustituir una comida concreta ("hoy no me apetece esto") | planes | La petición nº1 en cualquier app de dietas |
| ⭐ Lista de la compra semanal agregada (y por email) | planes (+notif.) | Convierte el plan en herramienta de uso diario |
| ⭐ Editar el catálogo sin redesplegar; recetas nuevas al instante | catálogo | Elimina el ciclo PR+deploy por receta |
| ⭐ Gráfica de progreso de peso + sugerencia de recálculo | usuarios | Cierra el ciclo objetivo→plan→resultado |
| Adherencia: marcar comidas hechas, rachas, % semanal | usuarios | Gamificación ligera, retención |
| Favoritos y "no volver a proponerme esto" persistentes | usuarios+planes | Personalización real del motor |
| Búsqueda avanzada (por macros, nº ingredientes, tiempo) | catálogo | El recetario crece de buscador a explorador |
| Recetas de la comunidad con moderación | catálogo+social | Contenido escala sin ti |
| Compartir plan/receta con enlace público | social | Crecimiento orgánico |
| Ranking de adherencia entre amigos | social+usuarios | La razón para invitar amigos |
| Email semanal con el plan y la compra | notificaciones | PULSO aparece en tu bandeja cada domingo |
| Variantes de recetas generadas con IA (Claude API) con revisión admin | catálogo | El catálogo crece asistido; la clave de API vive segura en servidor |
| Estadísticas de uso del catálogo (qué se sustituye más) | planes | Feedback real para mejorar recetas |
| Base para app móvil (la API ya existe) | todos | El front deja de ser el único cliente |

---

## 5. Seguridad

- **JWT de Supabase en todos los servicios:** filtro que valida firma (JWKS público
  de Supabase), expiración y `sub` (user_id). Spring Security con
  `oauth2ResourceServer().jwt()` — configuración, no código.
- **Roles:** claim `role=admin` gestionado en Supabase (tabla `perfiles`) para los
  endpoints de administración del catálogo.
- **Los servicios nunca guardan credenciales.** Solo user_ids.
- **Rate limiting** en `/planes/generar` (endpoint público más caro) — bucket4j o el
  del gateway.
- Validación de entrada exhaustiva (Bean Validation desde el contrato OpenAPI);
  errores RFC 7807 sin filtrar internals.
- Secretos (DB, email) como secrets del hosting; nunca en el repo.

---

## 6. Infraestructura, CI/CD y costes

**Hosting recomendado (fase 1–3):** Railway o Render.

- Cada servicio: contenedor Docker desde GHCR, 256–512 MB RAM.
- Postgres: Neon (free: 0,5 GB, sobra de largo) o el Postgres de la propia Supabase
  ya contratada (esquemas nuevos, coste cero extra).
- Dominio: subdominio gratuito del hosting al principio; `api.` propio si se compra dominio.

**CI/CD por repo (GitHub Actions):**

```
push a main → tests (unit + golden de paridad) → build imagen Docker
  → push a GHCR → deploy automático al hosting → smoke test (/actuator/health)
```

**Costes mensuales estimados:**

| Escenario | Coste |
|---|---|
| Fase 1 (catálogo, free tiers, con cold starts) | 0 € |
| Fases 1–3 siempre-encendido (Railway Hobby ~5 $ + Neon free) | ~5–10 € |
| Fases 1–4 completas (5 servicios + email) | ~15–25 € |

El cold start del free tier (~20-30 s tras inactividad) es el argumento nº1 para el
fallback local del front: aunque el servicio esté dormido, el usuario invitado genera
su plan al instante con `logica.ts` mientras la API despierta.

---

## 7. Cambios en el front (repo PulsoFit)

1. **`src/api/`**: clientes generados desde `pulso-contratos`
   (`openapi-typescript`), un módulo por servicio.
2. **Patrón de fallback** (la pieza más importante):

   ```ts
   // src/api/planes.ts (esquema)
   export async function generarPlan(datos): Promise<Plan> {
     if (!API_URL) return generarPlanLocal(datos);          // sin backend configurado
     try {
       return await postJson(`${API_URL}/api/v1/planes/generar`, datos, { timeout: 4000 });
     } catch {
       return generarPlanLocal(datos);                       // backend caído/dormido
     }
   }
   ```

   `generarPlanLocal` es el `buildDiet`+`calcularMetricas` actual. **`logica.ts` no se
   borra nunca: se convierte en el modo offline.**
3. `VITE_API_URL` como variable de entorno (vacía = comportamiento actual, cero
   riesgo en producción hasta activarla).
4. Pantallas nuevas: historial de planes, gráfica de progreso (peso), botón
   "cambiar esta comida", vista de lista de la compra. Cada una llega con su fase.
5. Los tests actuales de `logica.ts` siguen siendo la red de seguridad del modo local.

---

## 8. Estrategia de testing

| Nivel | Qué | Dónde |
|---|---|---|
| Unit | Lógica de dominio pura (motor de planes, validador de catálogo) | cada servicio |
| Golden de paridad | Mismos inputs → mismos outputs que `logica.ts` (JSON compartidos) | `pulso-contratos`, ejecutados por Vitest y JUnit |
| Slice | Controladores con MockMvc + contratos OpenAPI (validación de esquema) | cada servicio |
| Integración | Testcontainers (Postgres real efímero) para repositorios y migraciones | cada servicio |
| Contrato front↔API | El cliente TS generado compila contra el OpenAPI publicado; test de humo contra el entorno dev | PulsoFit |
| E2E | Playwright contra front + servicios en dev (el script de verificación que ya usamos, ampliado) | PulsoFit |

---

## 9. Fases y esfuerzo estimado

Estimaciones para dedicación tipo hobby (~6–8 h/semana). Cada fase termina con algo
**desplegado y visible**, no hay fases "de infraestructura" sin resultado.

| Fase | Contenido | Duración | Entregable visible |
|---|---|---|---|
| **0. Cimientos** | Repo `pulso-contratos`, OpenAPI del catálogo, plantilla de servicio, decidir hosting, CI esqueleto | 1–2 sem | Contrato publicado + "hola mundo" desplegado con health check |
| **1. Catálogo** | `pulso-catalogo` completo (CRUD, búsqueda, validación de invariantes, seed), front consume con fallback, mini-admin (puede ser HTML servido por el propio servicio) | 2–3 sem | El recetario de la web servido desde la API; añades una receta sin tocar el repo del front |
| **2. Planes** | `pulso-planes` con golden tests de paridad, guardado/historial, sustitución de comidas, lista de la compra; front: historial + "cambiar comida" | 3–4 sem | Historial y sustitución de comidas en producción |
| **2.5 Gateway** | `pulso-gateway` + dominio único + rate limiting | 1 sem | `api.pulso.xyz` |
| **3. Usuarios** | `pulso-usuarios`: pesajes, adherencia, informe; front: gráfica de progreso + check de comidas | 2–3 sem | Pantalla "Mi progreso" |
| **4. Social + Notif.** | Amistades, compartir, email semanal con lista de la compra | 3–4 sem | Enlace público de plan + email dominical |

**Total: ~3–4 meses** de trabajo constante para el plan completo; **la fase 1 sola ya
es un portfolio decente** (microservicio Java real, con contrato, CI/CD, seguridad
JWT y un front en producción consumiéndolo).

---

## 10. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Doble implementación de la lógica (TS + Java) que diverge | Planes distintos según quién los genere | Golden tests de paridad en CI de ambos repos; la fórmula solo se cambia vía PR en `pulso-contratos` primero |
| Cold starts en free tier | Primera petición lenta (20–30 s) | Fallback local instantáneo + ping de keep-alive (cron cada 10 min) o pagar hobby tier |
| Sobrecarga operativa (5 repos, 5 pipelines, 1 persona) | Abandono a mitad | Plantilla de servicio idéntica; fases con entregable visible; **está permitido pararse tras cualquier fase** — el sistema queda coherente |
| Costes que crecen | — | Todo el plan cabe en free tiers hasta fase 3; revisar en cada fase |
| Seguridad de endpoints admin | Alguien edita el catálogo | JWT + rol admin + rate limit + auditoría (columna `actualizado_por`) |
| CORS/latencia desde Pages | UX peor que la actual | Caché HTTP agresiva en catálogo, generación local por defecto para invitados |
| Lock-in del hosting | Migración forzosa | Todo es Docker + Postgres estándar; migrar = cambiar 2 secrets |

---

## 11. Alternativas (para la conversación de viabilidad)

Este plan está diseñado a petición como **microservicios multi-repo**. Alternativas
con menos fricción que conviene tener sobre la mesa al evaluar viabilidad:

1. **Monolito modular** (1 repo `pulso-backend`, módulos Maven `catalogo/`, `planes/`,
   `usuarios/` con las mismas fronteras): ~60% del esfuerzo, mismas funcionalidades,
   un solo deploy. Se puede trocear en microservicios *después* porque las fronteras
   ya existen. **Es la opción que recomendaría para 1 persona si el objetivo fuera
   solo el producto.**
2. **Supabase Edge Functions** (TypeScript): reutiliza `logica.ts` tal cual (cero
   doble implementación), cero hosting nuevo. Ideal para lista de la compra y
   sustitución de comidas. No practica Java ni microservicios.
3. **Híbrido pragmático:** empezar con el monolito modular Java y extraer
   `pulso-catalogo` como primer microservicio real cuando exista el caso de uso
   admin. Aprende ambas cosas en orden.

El valor diferencial del plan multi-repo es **el aprendizaje y el portfolio**
(contratos, CI/CD independiente, seguridad entre servicios, observabilidad); el valor
de producto es idéntico al del monolito modular. Ambas cosas son legítimas — solo hay
que elegir cuál se está optimizando.
