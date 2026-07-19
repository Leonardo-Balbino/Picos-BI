import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      // Evita o preflight OPTIONS que o IIS da API rejeita (405): em dev, o navegador
      // enxerga a chamada como same-origin (localhost:5173/publica/...) e o Vite
      // repassa para a API real por baixo dos panos, sem CORS. Ver VITE_API_BASE_URL no .env.
      '/publica': {
        target: 'https://api.meuerponline.com.br',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
