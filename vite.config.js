import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // A nagy, ritkán változó third-party kód külön, jól cache-elhető
        // chunk-okba kerül – így egy app-módosítás nem érvényteleníti őket.
        // (A @dnd-kit már az admin lazy-chunkjában van; a Sentry pedig
        //  dinamikus importtal külön chunk – lásd main.jsx.)
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
})