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
        // ✅ 性能优化升级：修复构建错误
        manualChunks: {
          // 仅提取已安装的 React 核心库
          'vendor-react': ['react', 'react-dom'],
          // 其他重型库 (mammoth, html-to-image) 让 Vite 自动按路由拆分，配合前端预加载实现最佳体验
        }
      },
    },
    chunkSizeWarningLimit: 1000,
  },
})