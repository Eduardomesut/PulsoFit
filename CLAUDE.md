# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

PULSO (PulsoFit) — a Spanish-language single-page web app that generates a personalized weekly diet plan from a short questionnaire (goal, sex, age, weight, height, diet type, disliked foods, allergies, meals per day). Every meal comes from a structured recipe catalog with a photo, ingredients with quantities, and step-by-step preparation instructions. All UI text, variable names, and comments in the codebase are in Spanish; keep new code consistent with that convention.

## Commands

```bash
npm install        # install dependencies
npm run dev         # dev server at http://localhost:5173
npm run build       # tsc -b && vite build (type-checks, then builds to dist/)
npm test            # vitest run — pure logic + recipe-catalog invariant tests
npm run test:watch  # vitest in watch mode
npm run preview     # preview the production build
```

Tests (Vitest) live next to the code in `src/*.test.ts` and cover only the pure logic in `src/logica.ts` — no component/DOM tests yet. The deploy workflow runs `npm test` before building, so a failing test (including a catalog-invariant violation) blocks deployment. There is no linter configured; `npm run build` (which runs `tsc -b` first) is the way to check for TypeScript errors.

## Architecture

- **`src/main.tsx`** — entry point; wraps `<App>` in `AuthProvider`.
- **`src/logica.ts`** — data catalogs and all pure (React-free) logic, imported by `PulsoFit.tsx` and by the tests:
  - Image/text helpers: `U` (Unsplash URL builder), `youtubeUrl`, `normalizar` (lowercase + strip accents). `FOODIMG` is the image bank (ingredient-type key → Unsplash id); each recipe references a `FOODIMG` key via its `img` field.
  - `TIPOS_DIETA` / `ALERGENOS` / `ALIMENTOS` — option catalogs for the preference questions (diet type, allergies, disliked foods). `OBJETIVOS` — the four goals.
  - `RECETAS` — ~50 structured recipes (`id`, `nombre`, `categoria`, `img`, `kcalAprox`, `ingredientes` with quantities, `pasos` preparation steps, `dietas`, `alergenos`, `contiene`, `objetivos`). Authoring rule: per category keep ≥5 vegan, ≥5 gluten-free, ≥5 lactose-free and ≥4 "safe" recipes (vegan + zero allergens) so filtering never empties a category — enforced by `src/catalogo.test.ts`.
  - `RECETAS_CINE` — iconic dishes from series/movies; never enter the weekly plan or the PDF. Optional `fotoEscena` (real still from the show, hotlinked from Fandom wikis / Wikimedia) and `fotoPlato` (real dish photo from Wikimedia Commons); both fall back to `FOODIMG` on load error via the `conRespaldo` handler in `FichaReceta`.
  - `REPARTO` — meal slots + calorie split per meals-per-day (3/4/5); `filtrarRecetas` — filters `RECETAS` by allergies + diet type (strict) and disliked foods (relaxed if a category drops below 4 recipes); `buildDiet` — deterministic 7-day plan from the filtered pools.
  - `calcularMetricas` — Mifflin-St Jeor calorie/macro calculation per objetivo (`perder` / `equilibrio` / `ganar` / `musculo`).
  - `migrarDatos` — migrates saved plans from the old fitness-era format (maps old objetivo ids, drops `nivel`/`dias`, fills in new preference fields).
- **`src/logica.test.ts` / `src/catalogo.test.ts`** — Vitest suites: the former covers the pure functions above, the latter asserts recipe-catalog invariants (unique ids, valid vocabularies, authoring rule, no diet+allergy combination leaves a category under 4 recipes).
- **`src/PulsoFit.tsx`** — styling constants and every screen component. There is no router; `App` (in this file) drives a simple state machine via `fase` (`"hero" | "form" | "scan" | "plan" | "recetario" | "cine" | "restaurantes"`) and renders one screen at a time. Key pieces inside this file, top to bottom:
  - Style constants (`C` colors, `grad`/`gradText` gradients, `DF` font) and image fallback helpers (`FALLBACK_IMG`, `onImgError`) — inline SVG fallback when a photo fails to load.
  - `App` — root component and state machine.
  - `AuthModal` — login/signup modal (uses `useAuth` from `src/auth.tsx`).
  - `Hero` → `Formulario` (5-step questionnaire: objetivo, about you, diet type, preferences, meals/day) → `Scan` (loading transition) → `Plan` (final results screen with expandable recipe cards showing ingredients + preparation, PDF export, "save plan" for logged-in users).
  - `Cabecera` — Tesla-style shared top bar (logo left, centered flat text links, contextual `acciones` right, `MenuLateral` slide-over panel on narrow screens via the "Menú" button). Catalog sections are reachable from it on every screen (App remembers the origin screen in `seccionDesde`): `Recetario` (all recipes incl. cine ones, searchable by name/ingredient — accent-insensitive via `normalizar` — with category filter chips), `Cine` (series/movie dishes) and `Restaurantes` (city/area search that embeds a keyless Google Maps iframe — `output=embed`, no API key — with cuisine-type chips preselected from the user's `tipoDieta`). Both build on the shared `CabeceraSeccion` (banner header), `FichaReceta` (expandable card, scene banner when `fotoEscena` exists) and `DetalleReceta` (ingredients + steps + YouTube link, also used by `Plan`).
  - `descargarPDF` (inside `Plan`) — lazy-loads `jspdf` only when the user requests a PDF; includes the weekly plan plus a deduplicated "RECETARIO" section with full recipes. Uses a `san()` helper that strips glyphs jsPDF's standard fonts can't render (em-dash, ×, ·, etc.).
- **`src/auth.tsx`** — `AuthProvider`/`useAuth`: thin wrapper around Supabase auth (sign in/up/out, session state). Exposes `enabled` (whether Supabase is configured) so the rest of the app can degrade to guest mode.
- **`src/supabase.ts`** — creates the Supabase client from `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` env vars. If either is missing, `supabase` is `null` and `isSupabaseConfigured` is `false` — **the app must keep working in guest mode (no login) when Supabase isn't configured**; don't assume `supabase` is non-null anywhere without checking.
- **`supabase/schema.sql`** — full Postgres schema/RLS policies for the Supabase project; run manually in the Supabase SQL editor (not migrated automatically). Currently defines `perfiles` (one row per user, auto-created via trigger on signup) and `planes` (one saved plan per user, keyed by `user_id`). Future phases (per the file's own comments and `SUPABASE_SETUP.md`) will add `registros` (progress tracking) and `amistades` (friends).

## Data flow / persistence

- Guest mode: everything lives in React state (`datos` in `App`); nothing persists across reloads.
- `datos` shape: `{ objetivo, sexo, edad, peso, altura, tipoDieta, alergias[], noGusta[], comidasDia }`. The generated plan is never stored — it's rebuilt deterministically from `datos` via `buildDiet`/`calcularMetricas`.
- Logged-in: on login, the app fetches the user's saved plan (`planes` table, one row per `user_id`, upserted), runs it through `migrarDatos` (old fitness-era rows are converted; unrecognizable objetivos disable resume), and offers to resume it ("Continuar con mi plan guardado"). RLS policies restrict each user to their own `perfiles`/`planes` rows.

## Deployment

Static site deployed to GitHub Pages via `.github/workflows/deploy.yml` on push to `main` (or manual dispatch). `vite.config.ts` sets `base: "/PulsoFit/"` for production builds vs `"/"` in dev — keep this in sync if the repo/Pages path ever changes. Supabase credentials are injected at build time from GitHub Actions repository **variables** (not secrets, since the anon key is public by design) — `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. If unset, the build still succeeds and the deployed app runs in guest mode.
