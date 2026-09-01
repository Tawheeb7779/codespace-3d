import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  build: {
    // The site is one document; a single CSS/JS pair beats waterfalling
    // several tiny chunks over a mobile connection.
    cssCodeSplit: false,
    assetsInlineLimit: 2048,
  },
})
