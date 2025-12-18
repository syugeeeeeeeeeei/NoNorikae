import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // GitHub Pages等のサブディレクトリ展開に対応
  server: {
    proxy: {
      // ローカル開発用プロキシ（本番/静的ホスティングでは機能しません）
      '/api-proxy': {
        target: 'https://realestate.navitime.co.jp',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-proxy/, '')
      }
    }
  }
})