/**
 * Vite 配置 - 修复 WebSocket 代理崩溃问题
 *
 * 修复日期: 2026-01-31
 * 问题: P0 级别 - Vite 代理中间件崩溃
 * 错误: TypeError: Cannot read properties of null (reading 'split')
 *
 * 修复内容:
 * 1. 增强 WebSocket 代理错误处理
 * 2. URL 解析边界情况防御
 * 3. HMR 与 WebSocket 冲突解决
 * 4. 代理路径规范化
 *
 * @version 2.0.1
 */

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

      // ======================================================================
      // 修复：增强版 API 代理配置
      // ======================================================================
      proxy: mode === 'development' ? {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
          ws: true, // 启用 WebSocket 代理

          // ==================================================================
          // 关键修复：增强错误处理，防止代理崩溃
          // ==================================================================
          configure: (proxy, _options) => {
            // ------------------------------------------------------------------
            // 1. 全局错误处理 - 防止服务器崩溃
            // ------------------------------------------------------------------
            proxy.on('error', (err, req, res) => {
              console.error('[Vite Proxy] ERROR:', {
                message: err.message,
                code: (err as any).code,
                url: req.url,
                method: req.method,
              });

              // 防止错误导致服务器崩溃
              if (!res.headersSent) {
                res.writeHead(500, {
                  'Content-Type': 'application/json',
                });
                res.end(JSON.stringify({
                  error: 'Proxy Error',
                  message: err.message,
                }));
              }
            });

            // ------------------------------------------------------------------
            // 2. 请求日志和验证
            // ------------------------------------------------------------------
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              const isWebSocket = req.headers.upgrade?.toLowerCase() === 'websocket';

              console.log('[Vite Proxy]', req.method, req.url, '→', proxyReq.path, {
                ws: isWebSocket,
                headers: {
                  upgrade: req.headers.upgrade,
                  connection: req.headers.connection,
                }
              });

              // WebSocket 路径修复
              if (isWebSocket) {
                // 确保目标服务器主机名正确
                proxyReq.setHeader('Host', 'localhost:3001');
                proxyReq.setHeader('Origin', 'http://localhost:3001');
              }
            });

            // ------------------------------------------------------------------
            // 3. 响应处理
            // ------------------------------------------------------------------
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              const isWebSocket = proxyRes.statusCode === 101;

              console.log('[Vite Proxy]', proxyRes.statusCode, req.url, {
                ws: isWebSocket,
                upgrade: proxyRes.headers.upgrade,
              });

              // WebSocket 连接成功日志
              if (isWebSocket) {
                console.log('[Vite Proxy] ✓ WebSocket connection established');
              }
            });

            // ------------------------------------------------------------------
            // 4. WebSocket 升级请求处理
            // ------------------------------------------------------------------
            proxy.on('upgrade', (req, socket, head) => {
              console.log('[Vite Proxy] WebSocket Upgrade:', {
                url: req.url,
                headers: req.headers,
              });

              // 验证路径格式
              const wsPath = req.url || '';
              if (!wsPath.startsWith('/api')) {
                console.warn('[Vite Proxy] Invalid WebSocket path:', wsPath);
                socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
                return;
              }
            });

            // ------------------------------------------------------------------
            // 5. WebSocket 代理请求处理
            // ------------------------------------------------------------------
            proxy.on('proxyReqWs', (proxyReq, req, socket, options, head) => {
              console.log('[Vite Proxy] WebSocket Proxy Request:', {
                url: req.url,
                target: proxyReq.path,
              });
            });

            // ------------------------------------------------------------------
            // 6. 超时处理
            // ------------------------------------------------------------------
            proxy.on('timeout', (req, res, socket) => {
              console.warn('[Vite Proxy] Timeout:', req.url);
              if (socket) {
                socket.destroy();
              }
            });

            // ------------------------------------------------------------------
            // 7. 连接关闭处理
            // ------------------------------------------------------------------
            proxy.on('close', (req, socket, head) => {
              console.log('[Vite Proxy] Connection closed:', req.url);
            });
          }
        },
      } : undefined,

      // ======================================================================
      // 文件系统访问限制
      // ======================================================================
      fs: {
        strict: true,
        allow: ['..']
      },

      // ======================================================================
      // HMR 配置 - 避免与 WebSocket 冲突
      // ======================================================================
      hmr: {
        protocol: 'ws',
        host: 'localhost',
        port: 3000,
        clientPort: 3000,
        overlay: true,
      }
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
        '@': path.resolve(__dirname, './src'),
        '@config': path.resolve(__dirname, './src/config'),
        '@services': path.resolve(__dirname, './src/services'),
        '@components': path.resolve(__dirname, './src/components'),
        '@types': path.resolve(__dirname, './src/types'),
        '@utils': path.resolve(__dirname, './src/utils'),
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
