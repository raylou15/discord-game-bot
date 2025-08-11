import { defineConfig } from 'vite';

export default defineConfig({
  envDir: '../',
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['operationpolitics.duckdns.org'],
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
    hmr: {
      protocol: 'wss',
      clientPort: 443,
    },
  },
});
