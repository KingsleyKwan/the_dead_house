import { defineConfig } from "vite";

export default defineConfig({
  // Relative paths so dist/ and GitHub Pages both work
  base: "./",
  build: {
    outDir: "docs",
    emptyOutDir: true,
  },
});
