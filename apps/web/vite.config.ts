// apps/web/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  // ✅ add these three blocks
  resolve: {
    alias: {
      buffer: 'buffer',       // make sure imports resolve to the browser polyfill
    },
  },
  optimizeDeps: {
    include: ['buffer'],      // prebundle so it’s available in dev + prod
  },
  define: {
    global: 'window',         // some libs expect a Node-like global
  },

  // dev (local)
  server: {
    host: true,
    port: 5173,
  },

  // prod preview (Railway)
  preview: {
    host: '0.0.0.0',
    port: 8080,
    strictPort: true,
    allowedHosts: ['cypherpunk-tipjar-web-production.up.railway.app'],
    // or: allowedHosts: true
  },
})

