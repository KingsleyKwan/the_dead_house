import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  // Production uses GitHub Pages project path; local dev stays at /
  base: mode === "production" ? "/the_dead_house/" : "/",
  build: {
    outDir: "docs",
    emptyOutDir: true,
  },
}));
