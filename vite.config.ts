import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5000,
    allowedHosts: true,
    proxy: {
      // All calls to /api/* will be forwarded to the backend
      "/api": {
        target:
          "https://dc1d5084-d907-4236-8b8b-7b2b6225dddf-00-wb051pwb7av8.janeway.replit.dev",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
