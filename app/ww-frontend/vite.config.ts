import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@ww-stats': path.resolve(__dirname, '../../libs/ww/stats/src')
    }
  },
  server: {
    port: 4201, // Usamos el 4201 para no chocar con el 4200 de Genshin
    host: 'localhost',
  }
})
