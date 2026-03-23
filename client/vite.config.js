import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],

  // In dev mode, proxy /api calls to the Express server
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },

  // Build output goes directly into Express's public folder
  build: {
    outDir: "../public",
    emptyOutDir: true,
  },
});
