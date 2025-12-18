import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    proxy: {
      // '/api-proxy' で始まるリクエストを NAVITIME の API サーバーに転送します
      '/api-proxy': {
        target: 'https://realestate.navitime.co.jp',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-proxy/, '')
      }
    }
  }
})