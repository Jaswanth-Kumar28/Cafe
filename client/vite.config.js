import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/Luxury-Cafe/', // GitHub Pages repo name — change this if repo name changes
  server: {
    port: 5173
  },
  build: {
    outDir: 'dist'
  }
})
