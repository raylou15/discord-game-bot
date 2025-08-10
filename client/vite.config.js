import { defineConfig } from "vite";

export default defineConfig({
  envDir: "./",                 // put .env next to this file (or change if different)
  server: {
    host: true,                 // bind on all interfaces
    port: 5173,
    strictPort: true,
    allowedHosts: ["turkey-charmed-coral.ngrok-free.app"],
    origin: "https://turkey-charmed-coral.ngrok-free.app", // <-- important for assets/ws
    hmr: {
      host: "turkey-charmed-coral.ngrok-free.app",
      protocol: "wss",
      clientPort: 443,
    },
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
});
