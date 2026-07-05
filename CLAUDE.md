# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

PULSO (PulsoFit) — a Spanish-language single-page web app that generates personalized weekly diet and workout plans from a short questionnaire (goal, sex, age, weight, height, level). All UI text, variable names, and comments in the codebase are in Spanish; keep new code consistent with that convention.

## Commands

```bash
npm install        # install dependencies
npm run dev         # dev server at http://localhost:5173
npm run build       # tsc -b && vite build (type-checks, then builds to dist/)
npm run preview     # preview the production build
```

There is no test suite and no linter configured. `npm run build` (which runs `tsc -b` first) is the way to check for TypeScript errors.

## Architecture

- **`src/main.tsx`** — entry point; wraps `<App>` in `AuthProvider`.
- **`src/PulsoFit.tsx`** — the entire application (~1500 lines): styling constants, exercise/diet data, calorie/macro logic, and every screen component. There is no router; `App` (in this file) drives a simple state machine via `fase` (`"hero" | "form" | "scan" | "plan"`) and renders one screen at a time. Key pieces inside this file, top to bottom:
  - Style constants (`C` colors, `grad`/`gradText` gradients, `DF` font) and image helpers (`U`, `FALLBACK_IMG`, `onImgError`) — Unsplash URLs with an inline SVG fallback on load error.
  - `EX` / `EXIMG` — exercise catalog and their images; `seriesReps` / `buildWorkout` — builds a workout plan from objetivo (goal) + nivel (level) + días (days/week).
  - `DIETAS` / `FOODIMG` / `platoImg` / `buildDiet` — 7-day diet plan generation per goal.
  - `calcularMetricas` — Mifflin-St Jeor calorie/macro calculation.
  - `App` — root component and state machine.
  - `AuthModal` — login/signup modal (uses `useAuth` from `src/auth.tsx`).
  - `Hero` → `Formulario` (multi-step questionnaire) → `Scan` (loading transition) → `Plan` (final results screen, PDF export, "save plan" for logged-in users).
  - `descargarPDF` (inside `Plan`) — lazy-loads `jspdf` only when the user requests a PDF, builds it by hand with `doc.text`/`doc.line` and a `san()` helper that strips glyphs jsPDF's standard fonts can't render (em-dash, ×, ·, etc.).
- **`src/auth.tsx`** — `AuthProvider`/`useAuth`: thin wrapper around Supabase auth (sign in/up/out, session state). Exposes `enabled` (whether Supabase is configured) so the rest of the app can degrade to guest mode.
- **`src/supabase.ts`** — creates the Supabase client from `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` env vars. If either is missing, `supabase` is `null` and `isSupabaseConfigured` is `false` — **the app must keep working in guest mode (no login) when Supabase isn't configured**; don't assume `supabase` is non-null anywhere without checking.
- **`supabase/schema.sql`** — full Postgres schema/RLS policies for the Supabase project; run manually in the Supabase SQL editor (not migrated automatically). Currently defines `perfiles` (one row per user, auto-created via trigger on signup) and `planes` (one saved plan per user, keyed by `user_id`). Future phases (per the file's own comments and `SUPABASE_SETUP.md`) will add `registros` (progress tracking) and `amistades` (friends).

## Data flow / persistence

- Guest mode: everything lives in React state (`datos` in `App`); nothing persists across reloads.
- Logged-in: on login, the app fetches the user's saved plan (`planes` table, one row per `user_id`, upserted) and offers to resume it ("Continuar con mi plan guardado"). RLS policies restrict each user to their own `perfiles`/`planes` rows.

## Deployment

Static site deployed to GitHub Pages via `.github/workflows/deploy.yml` on push to `main` (or manual dispatch). `vite.config.ts` sets `base: "/PulsoFit/"` for production builds vs `"/"` in dev — keep this in sync if the repo/Pages path ever changes. Supabase credentials are injected at build time from GitHub Actions repository **variables** (not secrets, since the anon key is public by design) — `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. If unset, the build still succeeds and the deployed app runs in guest mode.
