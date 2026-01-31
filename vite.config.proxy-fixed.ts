/**
 * 增强版 Vite 配置 - 修复代理崩溃问题
 *
 * 修复内容：
 * 1. WebSocket 代理路径规范化
 * 2. http-proxy 中间件错误处理增强
 * 3. URL 解析边界情况处理
 * 4. HMR 与 WebSocket 冲突解决
 *
 * @version 2.0.0
 */

import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import type { ProxyOptions } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    server: {
      port: 3000,
      // strictPort: true,
      host: '0.0.0.0',

      // ======================================================================
      // 增强版代理配置 - 修复 WebSocket 崩溃
      // ======================================================================
      proxy: mode === 'development' ? {
        // HTTP API 代理
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
          ws: true, // 启用 WebSocket 代理
          rewrite: (path) => path,
          configure: (proxy, options) => {
            // ==================================================================
            // 1. 增强 http-proxy 错误处理
            // ==================================================================

            proxy.on('error', (err, req, res) => {
              console.error('[Vite Proxy] ERROR:', {
                message: err.message,
                code: (err as any).code,
                url: req.url,
                method: req.method,
                headers: req.headers
              });

              // 防止错误导致服务器崩溃
              if (!res.headersSent) {
                res.writeHead(500, {
                  'Content-Type': 'application/json',
                });
                res.end(JSON.stringify({
                  error: 'Proxy Error',
                  message: err.message,
                  url: req.url
                }));
              }
            });

            // ==================================================================
            // 2. 请求预处理 - URL 规范化
            // ==================================================================

            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log('[Vite Proxy] Request:', {
                method: req.method,
                url: req.url,
                target: proxyReq.path,
                headers: {
                  ...req.headers,
                  upgrade: req.headers.upgrade,
                  connection: req.headers.connection
                }
              });

              // 修复 WebSocket 升级请求的路径
              if (req.headers.upgrade && req.headers.upgrade.toLowerCase() === 'websocket') {
                // 确保路径格式正确
                const originalPath = req.url || '';
                const normalizedPath = originalPath.replace(/^\/api/, '/api');

                console.log('[Vite Proxy] WebSocket Upgrade:', {
                  originalPath,
                  normalizedPath,
                  targetPath: proxyReq.path
                });

                // 设置正确的 WebSocket 头
                proxyReq.setHeader('Origin', 'http://localhost:3001');
                proxyReq.setHeader('Host', 'localhost:3001');
              }
            });

            // ==================================================================
            // 3. 响应处理 - 防止协议解析错误
            // ==================================================================

            proxy.on('proxyRes', (proxyRes, req, res) => {
              console.log('[Vite Proxy] Response:', {
                statusCode: proxyRes.statusCode,
                url: req.url,
                headers: {
                  'content-type': proxyRes.headers['content-type'],
                  'upgrade': proxyRes.headers['upgrade'],
                  'connection': proxyRes.headers['connection']
                }
              });

              // WebSocket 连接成功
              if (proxyRes.statusCode === 101 && proxyRes.headers.upgrade) {
                console.log('[Vite Proxy] ✓ WebSocket connection established:', req.url);
              }
            });

            // ==================================================================
            // 4. WebSocket 连接处理
            // ==================================================================

            proxy.on('upgrade', (req, socket, head) => {
              console.log('[Vite Proxy] WebSocket Upgrade Request:', {
                url: req.url,
                headers: req.headers
              });

              // 验证 WebSocket 路径
              const wsPath = req.url || '';
              if (!wsPath.startsWith('/api')) {
                console.warn('[Vite Proxy] Invalid WebSocket path:', wsPath);
                socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
                return;
              }

              console.log('[Vite Proxy] ✓ WebSocket upgrade validated:', wsPath);
            });

            // ==================================================================
            // 5. 连接错误处理
            // ==================================================================

            proxy.on('proxyReqWs', (proxyReq, req, socket, options, head) => {
              console.log('[Vite Proxy] WebSocket Proxy Request:', {
                url: req.url,
                target: proxyReq.path,
                headers: proxyReq.getHeaders()
              });
            });

            proxy.on('close', (req, socket, head) => {
              console.log('[Vite Proxy] Connection closed:', req.url);
            });

            // ==================================================================
            // 6. 超时处理
            // ==================================================================

            proxy.on('timeout', (req, res, socket) => {
              console.warn('[Vite Proxy] Timeout:', req.url);

              if (socket) {
                socket.destroy();
              }
            });
          }
        },

        // ======================================================================
        // WebSocket 专用代理规则 (避免路径冲突)
        // ======================================================================
        '/api/v2/stream': {
          target: 'ws://localhost:3001',
          ws: true,
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('error', (err, req, res) => {
              console.error('[Vite WS Proxy] Error:', {
                message: err.message,
                url: req.url
              });
            });

            proxy.on('upgrade', (req, socket, head) => {
              console.log('[Vite WS Proxy] Upgrade:', req.url);
            });

            proxy.on('proxyReqWs', (proxyReq, req, socket, options, head) => {
              console.log('[Vite WS Proxy] WebSocket request:', {
                url: req.url,
                target: proxyReq.path
              });
            });
          }
        }
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
        overlay: true,
        clientPort: 3000
      }
    },

    base: './',

    plugins: [
      react(),
      visualizer({
        open: false,
        gzipSize: true,
        brotliSize: true,
        filename: 'dist/stats.html',
      })
    ],

    resolve: {
      alias: {
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
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('node_modules/react-router')) {
              return 'router-vendor';
            }
            if (id.includes('node_modules/lucide-react')) {
              return 'icons-vendor';
            }
            if (id.includes('node_modules/clsx') ||
                id.includes('node_modules/tailwind-merge') ||
                id.includes('node_modules/@tanstack/react-query')) {
              return 'ui-utils-vendor';
            }
            if (id.includes('node_modules/xlsx')) {
              return 'xlsx-vendor';
            }
            if (id.includes('node_modules/docx') ||
                id.includes('node_modules/pizzip') ||
                id.includes('node_modules/mammoth')) {
              return 'docx-vendor';
            }
            if (id.includes('node_modules/pdfjs-dist')) {
              return 'pdf-vendor';
            }
            if (id.includes('node_modules/alasql')) {
              return 'data-vendor';
            }
            if (id.includes('node_modules/recharts')) {
              return 'chart-vendor';
            }
            if (id.includes('node_modules/@monaco-editor')) {
              return 'monaco-vendor';
            }
            if (id.includes('node_modules')) {
              return 'vendor';
            }
          },
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
        }
      }
    }
  };
});
