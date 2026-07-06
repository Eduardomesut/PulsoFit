<div align="center">

# PULSO

**Tu semana de comidas, personalizada en segundos.**

Web de nutrición con estilo editorial cinematográfico (inspiración Tesla / Nike). Cuéntale a PULSO tu objetivo, tus gustos y tus alergias, y genera al instante una **dieta semanal completa** — cada receta ilustrada, con sus ingredientes y su modo de elaboración paso a paso.

[**Ver la app en vivo →**](https://eduardomesut.github.io/PulsoFit/)

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-opcional-3ECF8E?logo=supabase&logoColor=white)
![GitHub Pages](https://img.shields.io/badge/Deploy-GitHub%20Pages-222?logo=github&logoColor=white)

</div>

---

## ✨ Qué hace

- **4 objetivos** — perder peso, comer equilibrado, ganar peso o ganar músculo.
- **Cálculo de calorías y macros** con la fórmula **Mifflin-St Jeor**, según sexo, edad, peso, altura y objetivo.
- **Preferencias alimentarias reales**:
  - Tipo de dieta: omnívora, vegetariana, vegana, sin gluten, sin lactosa.
  - Alimentos que no te gustan (exclusión flexible).
  - Alergias e intolerancias (exclusión **estricta**).
- **3, 4 o 5 comidas al día**, con reparto calórico por franja.
- **~50 recetas** con foto, ingredientes con cantidades y modo de elaboración paso a paso.
- **Plan semanal de 7 días** adaptado a tus preferencias, con tarjetas de receta expandibles.
- **Exportación a PDF** con recetario completo incluido.
- **Cuenta opcional** (Supabase): guarda tu plan y retómalo al volver. Sin cuenta, la app funciona igual en **modo invitado**.
- Interfaz oscura, animaciones y diseño **responsive**.

## 🧭 Cómo funciona

```
Hero  →  Cuestionario (5 pasos)  →  Scan  →  Plan
        objetivo · sobre ti · dieta        (dieta semanal
        · preferencias · comidas/día        + PDF + guardar)
```

1. **Cuestionario** — recoges tus datos y preferencias (`objetivo`, `sexo`, `edad`, `peso`, `altura`, `tipoDieta`, `alergias`, `noGusta`, `comidasDia`).
2. **Filtrado** — el catálogo de recetas se filtra por dieta y alergias (estricto) y por lo que no te gusta (flexible, para no vaciar categorías).
3. **Generación** — se calcula tu objetivo calórico y macros, y se construye un plan **determinista** de 7 días: los mismos datos producen siempre el mismo plan (no se almacena, se reconstruye).

## 🛠️ Stack

| | |
|---|---|
| **Frontend** | React 18 · TypeScript · Vite |
| **Auth / datos** | Supabase (opcional) |
| **PDF** | jsPDF (carga bajo demanda) |
| **Hosting** | GitHub Pages (CI con GitHub Actions) |

## 🚀 Puesta en marcha

Requisitos: [Node.js](https://nodejs.org/) 18 o superior.

```bash
npm install        # instalar dependencias
npm run dev        # servidor de desarrollo → http://localhost:5173
npm run build      # tsc -b + vite build → dist/
npm run preview    # previsualizar la build de producción
```

> No hay tests ni linter configurados. `npm run build` (que ejecuta `tsc -b` primero) es la forma de comprobar errores de TypeScript.

### Supabase (opcional)

La app funciona sin configuración en **modo invitado**. Para habilitar cuentas y planes guardados, crea un `.env.local` a partir de `.env.example`:

```bash
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

El esquema y las políticas RLS están en [`supabase/schema.sql`](supabase/schema.sql); se ejecutan a mano en el editor SQL de Supabase. Ver [`SUPABASE_SETUP.md`](SUPABASE_SETUP.md) para los pasos completos.

## 📁 Estructura

```
pulsofit/
├── index.html
├── vite.config.ts             # base "/PulsoFit/" en producción
├── src/
│   ├── main.tsx               # punto de entrada (envuelve en AuthProvider)
│   ├── PulsoFit.tsx           # toda la app: catálogo, lógica y pantallas
│   ├── auth.tsx               # AuthProvider / useAuth (Supabase)
│   ├── supabase.ts            # cliente Supabase (null si no está configurado)
│   └── index.css
├── supabase/schema.sql        # esquema + RLS (perfiles, planes)
└── .github/workflows/         # despliegue a GitHub Pages
```

## 🌐 Despliegue

Sitio estático publicado en **GitHub Pages** vía GitHub Actions en cada push a `main`. Las credenciales de Supabase se inyectan en build time desde **variables de repositorio** (`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`); si no están, el build igual funciona y la app corre en modo invitado.

## ⚠️ Aviso

Las cantidades y planes son **orientativos** y con fines informativos. No sustituyen el consejo de un médico o dietista.
