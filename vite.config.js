import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Dev only — forwards to the Next.js app (npm run dev, port 3000) so
      // the browser sees a same-origin request and never hits a CORS wall.
      // In production this isn't needed: the build below gets served BY the
      // Next.js server itself (see next.config.js), so /api/* is already
      // same-origin.
      "/api": "http://localhost:3000"
    }
  },
  // Production build gets served as static files by the Next.js server at
  // /app/ (see the rewrite in next.config.js) so it and /api/* share one
  // port — no separate Vite server needed once deployed.
  base: "/app/",
  build: {
    outDir: "public/app",
    emptyOutDir: true
  },
  // outDir lives inside the repo's shared public/ folder, which Vite would
  // otherwise ALSO copy wholesale into outDir by default (its usual
  // "copy publicDir into the build" behavior) — that recursively duplicates
  // public/Assets, and worse, public/"DB Data" (gitignored local data) into
  // a folder Next.js serves publicly. Not needed anyway: Next.js already
  // serves public/Assets/* directly from its own root, so disable this.
  publicDir: false
});
