import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

console.log("🔧 VITE CONFIG LOADED");

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    allowedHosts: true,  // ⬅ allows ALL Replit preview hostnames
  },
});
