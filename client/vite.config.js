import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    allowedHosts: ['operationpolitics.duckdns.org'],
    host: true,
    port: 5173
  }
})
