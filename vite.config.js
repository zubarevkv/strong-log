import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Сборка статики в корень домена (api/ остаётся рядом на хостинге).
// В dev: VITE_API_BASE=local — работа без бэкенда (localStorage).
//        либо проксируем /api на локальный PHP-сервер.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: process.env.VITE_API_PROXY || "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
  },
});
