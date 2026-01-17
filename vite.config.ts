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
        // ✅ 极致分包策略
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // 1. 核心基础库 (首屏必须) - 保持最小
            if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
              return 'framework';
            }
            // 2. 独立的重型库 (按需加载)
            if (id.includes('socket.io-client')) return 'lib-socket';
            if (id.includes('html-to-image')) return 'lib-image';
            if (id.includes('mammoth')) return 'lib-doc';
            if (id.includes('marked')) return 'lib-markdown';
            if (id.includes('echarts') || id.includes('chart.js') || id.includes('apexcharts')) {
              return 'lib-charts';
            }
            // 3. 其他杂项
            return 'vendor-utils';
          }
        }
      },
    },
    chunkSizeWarningLimit: 800,
  },
})