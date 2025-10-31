import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Importante: base = '/' para produção na Vercel em domínio raiz
export default defineConfig({
  base: '/',
  plugins: [react()],
  build: {
    // opcional: silenciar warning de tamanho (apenas warning)
    chunkSizeWarningLimit: 1200,
  },
})
