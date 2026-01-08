
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 将 /api 请求代理到远程后端服务
      '/api': {
        target: 'https://autoinsight_api.jingyu.today:8081',
        changeOrigin: true, // 必须设置为 true，否则后端会收到错误的 Host 头
        secure: false, // 允许自签名证书等 SSL 问题
      },
      // 将 WebSocket 连接也代理到后端服务器
      '/socket.io': {
        target: 'https://autoinsight_api.jingyu.today:8081',
        ws: true, // 启用 WebSocket 代理
        changeOrigin: true,
        secure: false,
      },
    },
  },
  optimizeDeps: {
    // Remove best-effort-json-parser
  },
  build: {
    rollupOptions: {
      // Remove external config for best-effort-json-parser
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
