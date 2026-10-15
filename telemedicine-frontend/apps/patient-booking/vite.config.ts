/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  server: {
    port: 3001,
    proxy: {
      "/api": { target: "http://localhost:8120", changeOrigin: true },
    },
  },
  css: {
    // Prevent Vite from searching parent directories for a PostCSS config.
    postcss: { plugins: [] },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      thresholds: { lines: 80, functions: 80, branches: 75, statements: 80 },
      exclude: [
        "**/*.config.*",
        "**/main.tsx",
        "src/test/**",
        "**/*.d.ts",
        "src/shared/mocks/browser.ts",
      ],
    },
  },
});