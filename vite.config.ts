
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
      // 新增：Gemini API 代理
      '/gemini-api': {
        target: 'http://gemini.jingyu.today:7658',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/gemini-api/, ''),
      },
    },
  },
  optimizeDeps: {
    // 强制预构建这些依赖，防止开发模式下频繁请求
    include: ['react', 'react-dom', 'socket.io-client', 'marked', 'mammoth', 'html-to-image']
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-utils': ['socket.io-client', 'marked', 'mammoth'],
        },
      },
    },
    // Increase chunk size warning limit to 1000KB
    chunkSizeWarningLimit: 1000,
  },
})
