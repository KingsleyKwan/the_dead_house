import { defineConfig } from "vite";

export default defineConfig({
  // Relative paths — works at /docs/ on GitHub Pages (root deploy)
  base: "./",
  build: {
    outDir: "docs",
    emptyOutDir: true,
  },
});
