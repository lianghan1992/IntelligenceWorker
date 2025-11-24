
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 将 /api 请求代理到本地 7657 端口的后端服务
      // e.g. /api/sources -> http://127.0.0.1:7657/api/sources
      '/api': {
        target: 'http://127.0.0.1:7657',
        changeOrigin: true, // 必须设置为 true，否则后端会收到错误的 Host 头
      },
      // 将 WebSocket 连接也代理到后端服务器
      '/socket.io': {
        target: 'ws://127.0.0.1:7657',
        ws: true, // 启用 WebSocket 代理
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
        },
      },
    },
    // Increase chunk size warning limit to 1000KB
    chunkSizeWarningLimit: 1000,
  },
})
