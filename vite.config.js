import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Forwards to the Next.js app (npm run dev, port 3000) so the browser
      // sees a same-origin request and never hits a CORS wall.
      "/api": "http://localhost:3000"
    }
  }
});
