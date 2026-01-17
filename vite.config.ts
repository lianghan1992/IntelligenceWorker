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
        // ✅ 性能优化升级：更精细的策略
        manualChunks: {
          // 仅提取 React 核心，这是首屏必须的，体积固定且易于缓存
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // 其他重型库 (mammoth, html-to-image) 不再强制合并，
          // 而是让 Vite 自动将其放入对应的 lazy-load 路由 chunk 中，实现"按需静默下载"。
        }
      },
    },
    chunkSizeWarningLimit: 1000,
  },
})