
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
        // 移除 manualChunks，让 Rollup 自动通过动态导入进行分割，或者合并为较少的大文件。
        // 在高延迟（HK -> 大陆）网络下，减少请求数量（TCP握手次数）优于减小单文件体积。
      },
    },
    chunkSizeWarningLimit: 2000, // 调大警告限制，因为我们有意合并了文件
  },
})