// /client/vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  envDir: "../",
  optimizeDeps: {
    include: ["react", "react-dom"],
    exclude: ["@discord/embedded-app-sdk"],
    esbuildOptions: { target: "es2020" },
  },
  build: {
    target: "es2020",
    sourcemap: false,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          "discord-sdk": ["@discord/embedded-app-sdk"],
        },
      },
    },
    commonjsOptions: { include: [/node_modules/] },
    chunkSizeWarningLimit: 1500,
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: { "/api": { target: "http://localhost:3001", changeOrigin: true, secure: false, ws: true } },
  },
});
