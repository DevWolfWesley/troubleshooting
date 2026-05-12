import { defineConfig } from "vite";

export default defineConfig({
  root: "02 - Web",
  base: "./",
  publicDir: "public",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    sourcemap: false,
    minify: "terser"
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true
  }
});