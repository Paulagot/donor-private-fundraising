// apps/web/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  // dev (local)
  server: {
    host: true,    // listen on 0.0.0.0 (handy if you ever test on LAN)
    port: 5173,
  },

  // prod preview (Railway)
  preview: {
    host: '0.0.0.0',
    port: 8080,
    strictPort: true,
    // allow your Railway web domain here:
    allowedHosts: ['cypherpunk-tipjar-web-production.up.railway.app'],
    // (for quick testing you could use: allowedHosts: true)
  },
})
