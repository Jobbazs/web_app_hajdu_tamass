import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Vite 8 / Rolldown: a manualChunks FÜGGVÉNY-formát vár (nem objektumot).
        // A nagy, ritkán változó third-party kód külön, jól cache-elhető chunk-okba
        // kerül – egy app-módosítás után ezek cache-ből jönnek.
        // (A @dnd-kit már az admin lazy-chunkjában van; a Sentry dinamikus
        //  importtal külön chunk – lásd main.jsx.)
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('@supabase')) return 'supabase'
          if (
            id.includes('react-dom') ||
            id.includes('/react/') ||
            id.includes('/scheduler/')
          ) return 'react-vendor'
        },
      },
    },
  },
})