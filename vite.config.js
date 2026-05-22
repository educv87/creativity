import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api-bind': {
        target: 'https://api.bind.com.mx',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-bind/, '')
      }
    }
  }
})

