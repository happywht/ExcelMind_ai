/**
 * Express 应用配置
 *
 * Phase 2 API 服务器主应用
 * 整合所有路由、中间件和配置
 */

import { logger } from '@/utils/logger';
import express, { Express } from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { appRouter } from '../api/routes';
import { setupWebSocket } from './websocket';

/**
 * 创建并配置 Express 应用
 */
export function createApp(): Express {
  const app = express();

  // ========================================================================
  // 安全中间件
  // ========================================================================

  // Helmet 安全头部
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS 配置
  const corsOptions = {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  };
  app.use(cors(corsOptions));

  // ========================================================================
  // 基础中间件
  // ========================================================================

  // 压缩响应
  app.use(compression());

  // 请求体解析
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 请求日志
  if (process.env.NODE_ENV !== 'test') {
    app.use((req, res, next) => {
      const start = Date.now();
      const requestId = req.headers['x-request-id'] || 'unknown';

      res.on('finish', () => {
        const duration = Date.now() - start;
        const status = res.statusCode;
        const method = req.method;
        const path = req.path;

        logger.debug(
          `[${requestId}] ${method} ${path} ${status} - ${duration}ms`
        );
      });

      next();
    });
  }

  // ========================================================================
  // 健康检查端点（必须在路由之前）
  // ========================================================================

  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '2.0.0',
    });
  });

  // ========================================================================
  // API 路由
  // ========================================================================

  app.use('/', appRouter);

  // ========================================================================
  // 错误处理（已在 appRouter 中配置）
  // ========================================================================

  return app;
}

/**
 * 创建带 WebSocket 的 HTTP 服务器
 */
export function createServerWithWebSocket() {
  const app = createApp();
  const server = createServer(app);

  // 设置 WebSocket 服务器
  const wss = new WebSocketServer({
    server,
    path: '/api/v2/stream',
  });

  setupWebSocket(wss);

  return { app, server, wss };
}

// 导出应用
export default createApp;
