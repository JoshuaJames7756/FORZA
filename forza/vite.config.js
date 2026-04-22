import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // Importante: Asegura que el host sea reconocido para PWA local
    host: true, 
    proxy: {
      '/api/off': {
        target: 'https://world.openfoodfacts.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/off/, ''),
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Asegura que los archivos de public se copien correctamente
    assetsDir: 'assets',
  },
})