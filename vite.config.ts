import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
// En producción (GitHub Pages) la app se sirve bajo /PulsoFit/.
// En desarrollo se usa la raíz "/".
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/PulsoFit/" : "/",
  plugins: [react()],
}));
