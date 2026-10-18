import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@telemedicine/video-conference": path.resolve(__dirname, "../../packages/video-conference/src/index.ts"),
    },
  },
  server: {
    port: 3002,
    proxy: {
      // CareConnect signaling + care-plan backend
      "/video-api": { target: "http://localhost:8130", changeOrigin: true, rewrite: (p) => p.replace(/^\/video-api/, "") },
      // patient-booking service (for appointment lookups)
      "/api": { target: "http://localhost:8120", changeOrigin: true },
    },
  },
  css: { postcss: { plugins: [] } },
});