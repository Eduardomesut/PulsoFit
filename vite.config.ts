import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
// En producción (GitHub Pages) la app se sirve bajo /PulsoFit/.
// En desarrollo se usa la raíz "/".
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/PulsoFit/" : "/",
  plugins: [
    react(),
    // PWA instalable: manifest + service worker generados en el build.
    // Registro "autoUpdate" (silencioso, sin preguntar al usuario) porque
    // el propio App ya recarga cada fase entera al navegar, así que una
    // recarga de fondo no pierde nada en curso salvo el chat del Chef IA.
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "apple-touch-icon.png"],
      manifest: {
        name: "PULSO — Dieta semanal personalizada",
        short_name: "PULSO",
        description: "Genera tu dieta semanal personalizada en segundos, con recetas ilustradas y su modo de elaboración paso a paso.",
        lang: "es",
        theme_color: "#0F2C56",
        background_color: "#F2EDE9",
        display: "standalone",
        orientation: "portrait",
        start_url: ".",
        scope: ".",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Solo se precachea el shell de la app (JS/CSS/HTML/iconos). Las
        // llamadas a Supabase (auth, planes, chat del Chef IA en streaming)
        // van a otro origen y no entran en ningún patrón de abajo, así que
        // el service worker nunca las intercepta ni sirve datos obsoletos.
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            // Fotos de Unsplash: no cambian una vez publicadas, cacheo
            // agresivo (CacheFirst) acotado en tamaño y caducidad.
            urlPattern: /^https:\/\/images\.unsplash\.com\//,
            handler: "CacheFirst",
            options: {
              cacheName: "pulso-fotos-recetas",
              expiration: { maxEntries: 250, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
}));
