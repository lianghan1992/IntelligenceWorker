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
      output: {
        // ✅ 细粒度分包策略：防止单个 JS 文件过大导致超时
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // 核心框架独立（最优先加载）
            if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
              return 'framework';
            }
            // 大型工具库单独拆分，按需加载
            if (id.includes('html-to-image') || id.includes('mammoth') || id.includes('jspdf')) {
              return 'heavy-utils';
            }
            if (id.includes('echarts') || id.includes('chart.js') || id.includes('apexcharts')) {
              return 'charts';
            }
            // 其他第三方库归为 vendor
            return 'vendor';
          }
        }
      },
    },
    chunkSizeWarningLimit: 800,
  },
})