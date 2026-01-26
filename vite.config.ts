import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        // strictPort: true, // 暂时禁用，让 Vite 自动选择可用端口
        host: '0.0.0.0',
        // 配置API代理,开发环境下将AI相关请求转发到后端服务器
        proxy: mode === 'development' ? {
          '/api': {
            target: env.VITE_API_BASE_URL || 'http://localhost:3001',
            changeOrigin: true,
            secure: false
          }
        } : undefined
      },
      base: './', // 使用相对路径，修复Electron中的资源加载问题
      plugins: [
        react(),
        // ✨ Bundle可视化插件
        visualizer({
          open: false,
          gzipSize: true,
          brotliSize: true,
          filename: 'dist/stats.html',
        })
      ],
      // ❌ 移除: 不再将API密钥注入前端 (安全隐患)
      // define: {
      //   'process.env.API_KEY': JSON.stringify(env.ZHIPU_API_KEY),
      //   'process.env.ZHIPU_API_KEY': JSON.stringify(env.ZHIPU_API_KEY)
      // },
      resolve: {
        alias: {
          // 配置路径别名，解决相对路径解析问题
          '@': path.resolve(__dirname, '.'),
          '@config': path.resolve(__dirname, './config'),
          '@services': path.resolve(__dirname, './services'),
          '@components': path.resolve(__dirname, './components'),
          '@types': path.resolve(__dirname, './types'),
          '@utils': path.resolve(__dirname, './utils'),
          '@excelmind/shared-types': path.resolve(__dirname, './packages/shared-types/dist'),
        }
      },
      build: {
        assetsDir: 'assets',
        // ✨ 提高chunk大小警告阈值
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
          output: {
            // ✨ 优化代码分割策略
            manualChunks: (id) => {
              // React核心库
              if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
                return 'react-vendor';
              }

              // 路由库
              if (id.includes('node_modules/react-router')) {
                return 'router-vendor';
              }

              // UI图标库
              if (id.includes('node_modules/lucide-react')) {
                return 'icons-vendor';
              }

              // UI工具库
              if (id.includes('node_modules/clsx') ||
                  id.includes('node_modules/tailwind-merge') ||
                  id.includes('node_modules/@tanstack/react-query')) {
                return 'ui-utils-vendor';
              }

              // Excel处理库（按需加载）
              if (id.includes('node_modules/xlsx')) {
                return 'xlsx-vendor';
              }

              // Word处理库（按需加载）
              if (id.includes('node_modules/docx') ||
                  id.includes('node_modules/pizzip') ||
                  id.includes('node_modules/mammoth')) {
                return 'docx-vendor';
              }

              // PDF处理库（按需加载）
              if (id.includes('node_modules/pdfjs-dist')) {
                return 'pdf-vendor';
              }

              // 数据处理库
              if (id.includes('node_modules/alasql')) {
                return 'data-vendor';
              }

              // 图表库
              if (id.includes('node_modules/recharts')) {
                return 'chart-vendor';
              }

              // 代码编辑器
              if (id.includes('node_modules/@monaco-editor')) {
                return 'monaco-vendor';
              }

              // 其他大型node_modules包
              if (id.includes('node_modules')) {
                return 'vendor';
              }
            },
            // ✨ 优化chunk文件名
            chunkFileNames: 'assets/js/[name]-[hash].js',
            entryFileNames: 'assets/js/[name]-[hash].js',
            assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
          }
        }
      }
    };
});
