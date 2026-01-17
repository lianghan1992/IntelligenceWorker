import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:7657',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'ws://127.0.0.1:7657',
        ws: true,
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'socket.io-client', 'marked', 'mammoth', 'html-to-image']
  },
  build: {
    rollupOptions: {
      // 🔴 强制不使用外部 CDN，确保所有包都打入本地文件
      external: [],
      output: {
        // ✅ 性能优化：修复构建错误并优化分包
        manualChunks: {
          // 仅提取 React 核心，确保其作为基础运行时被缓存
          'vendor-react': ['react', 'react-dom'],
          // 其他所有业务代码和工具库将由 Vite 自动进行基于路由和动态导入的拆分 (Code Splitting)
        }
      },
    },
    chunkSizeWarningLimit: 1000,
  },
})