import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Use /Cafe/ for GitHub Pages, / for Vercel & local dev
  base: process.env.GITHUB_PAGES === 'true' ? '/Cafe/' : '/',
  server: {
    port: 5173
  },
  build: {
    outDir: 'dist'
  }
})
