import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      base: './', // 使用相对路径，修复Electron中的资源加载问题
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.ZHIPU_API_KEY),
        'process.env.ZHIPU_API_KEY': JSON.stringify(env.ZHIPU_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        assetsDir: 'assets',
        rollupOptions: {
          output: {
            manualChunks: {
              vendor: ['react', 'react-dom'],
              ui: ['lucide-react'],
              utils: ['xlsx', 'jszip', 'mammoth', 'pdfjs-dist']
            }
          }
        }
      }
    };
});
