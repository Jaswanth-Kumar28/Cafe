import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Use /Luxury-Cafe/ for GitHub Pages, / for Vercel & local dev
  base: process.env.GITHUB_PAGES === 'true' ? '/Luxury-Cafe/' : '/',
  server: {
    port: 5173
  },
  build: {
    outDir: 'dist'
  }
})
