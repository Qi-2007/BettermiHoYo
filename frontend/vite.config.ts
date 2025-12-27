import vue from '@vitejs/plugin-vue';
import path from 'path'; // 1. 引入 node 的 path 模块
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  // 2. 添加 resolve 配置
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    }
  },
  // Dev server proxy: forward /api to backend at localhost:3000
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})