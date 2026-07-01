import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import json5Plugin from 'vite-plugin-json5'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss(), json5Plugin()],
  resolve: {
    alias: {
      '@ww-stats': path.resolve(__dirname, '../../libs/ww/stats/src')
    }
  },
  server: {
    port: 4201
  },
})
