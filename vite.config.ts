import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://api-bcloud-shared-f4fdh9exezd8hgb4.westcentralus-01.azurewebsites.net',
        changeOrigin: true,
        secure: true,
      },
      '/payment': {
        target: 'https://api-bcloud-shared-f4fdh9exezd8hgb4.westcentralus-01.azurewebsites.net',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
