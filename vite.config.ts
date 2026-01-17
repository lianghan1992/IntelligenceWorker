
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
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-utils': ['socket.io-client', 'marked', 'mammoth'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
})
