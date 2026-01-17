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
        // ✅ 性能优化：启用代码分割 (Code Splitting)
        // 将大文件拆分为多个小文件，允许浏览器并行下载，解决单线程传输瓶颈。
        manualChunks: {
          // 核心框架：体积较大且变动不频繁，适合单独缓存
          'vendor-core': ['react', 'react-dom'],
          // 工具库：体积中等，剥离后可减小业务代码体积
          'vendor-utils': ['socket.io-client', 'marked', 'mammoth', 'html-to-image'],
        }
      },
    },
    chunkSizeWarningLimit: 1000,
  },
})