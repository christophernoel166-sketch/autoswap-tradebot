import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  preview: {
    port: 8080,
    allowedHosts: [
      "www.autoswaps.online",
      "autoswap-tradebot-production-9c06.up.railway.app"
    ]
  }
});
