---
name: verify
description: Cómo verificar cambios de PulsoFit end-to-end (SPA React sin tests) lanzando la app y recorriendo el flujo con Playwright.
---

# Verificar PulsoFit

App = SPA React/Vite en `src/PulsoFit.tsx` (una sola pantalla por `fase`). No hay tests ni linter: `npm run build` solo detecta errores de TypeScript. La verificación real es recorrer el flujo en el navegador.

## Arranque

```bash
npm install        # si no hay node_modules
npm run dev        # http://localhost:5173 (en background)
```

## Automatización del navegador

Playwright está disponible vía npx; no hace falta descargar navegadores: usar el Edge del sistema.

```js
const { chromium } = require("playwright");
const browser = await chromium.launch({ channel: "msedge", headless: true });
```

Si `require("playwright")` no resuelve, instalarlo en el scratchpad con `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm i playwright`.

## Flujos que merece la pena recorrer

1. **Invitado con defaults**: CREAR MI PLAN GRATIS → objetivo → sexo → CONTINUAR×3 → GENERAR. Esperado: 5 comidas/día, sin chips de exclusión, tarjetas Desayuno/Media mañana/Comida/Merienda/Cena.
2. **Preferencias estrictas**: dieta vegana + alergia (p. ej. frutos secos) + algún "no me gusta" + 3 comidas. Recorrer los 7 días (botones Lunes…Domingo) y comprobar que ninguna receta viola dieta/alergias. Ojo: los "no me gusta" SÍ pueden reaparecer si el pool de una categoría queda con <4 recetas (comportamiento diseñado).
3. **Detalle de receta**: clic en una tarjeta → deben verse "Ingredientes" y "Modo de elaboración".
4. **PDF**: esperar el evento `download` al pulsar "Descargar PDF"; nombre esperado `dieta-pulso-<objetivo>.pdf`.

## Gotchas

- La pantalla Scan tarda ~3,6 s; esperar con `waitForSelector("text=Tu semana de comidas")`.
- "Empezar de nuevo" conserva las preferencias (tipoDieta, alergias, noGusta, comidasDia) y solo borra objetivo/sexo: para probar defaults reales, recargar la página (modo invitado no persiste nada).
- Los selectores útiles: las tarjetas de comida tienen clase `.exwrap`; los chips de exclusión contienen 🥗/🚫.
- El "~X kcal" de cada tarjeta es el reparto calórico objetivo de la franja (REPARTO), no las kcal de la receta (`kcalAprox`, que solo sale en el PDF).
