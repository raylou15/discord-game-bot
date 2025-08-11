// /client/vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  envDir: "../",

  // Don’t pre-bundle the SDK (that’s where things often crawl)
  optimizeDeps: {
    exclude: ["@discord/embedded-app-sdk"],
    esbuildOptions: { target: "es2020" },
  },

  build: {
    target: "es2020",
    sourcemap: false,
    cssCodeSplit: true,
    // Split big libs into separate chunks so Rollup doesn’t choke
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          "discord-sdk": ["@discord/embedded-app-sdk"],
        },
      },
    },
    commonjsOptions: {
      include: [/node_modules/],
    },
    // Optional: bump warn limit so you don’t see scary chunk warnings
    chunkSizeWarningLimit: 1500,
  },

  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: ["operationpolitics.duckdns.org"],
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
    hmr: {
      protocol: "wss",
      clientPort: 443,
    },
  },
}));
