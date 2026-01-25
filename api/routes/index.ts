/**
 * API 路由入口文件
 *
 * 整合所有版本的API路由
 */

import { Router, Request, Response } from 'express';
import { v2Router } from './v2';
import { errorHandler, notFoundHandler } from '../middleware/errorHandler';
import { authMiddleware } from '../middleware/authMiddleware';
import rateLimit from 'express-rate-limit';

/**
 * 创建API路由器
 */
export function createApiRouter(): Router {
  const apiRouter = Router();

  // ========================================================================
  // API 状态检查端点（无需认证）
  // ========================================================================

  apiRouter.get('/status', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    });
  });

  apiRouter.get('/health', (req: Request, res: Response) => {
    const health = {
      status: 'healthy',
      version: '2.0.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      services: {
        database: 'unknown',
        cache: 'unknown',
        ai: 'unknown',
      },
    };

    // TODO: 添加实际的健康检查逻辑
    // 检查数据库连接、缓存连接、AI服务等

    res.json(health);
  });

  // ========================================================================
  // API 版本路由
  // ========================================================================

  // v1 API（如果存在）
  // apiRouter.use('/v1', v1Router);

  // v2 API（Phase 2）
  apiRouter.use('/v2', v2Router);

  // ========================================================================
  // 404 处理
  // ========================================================================

  apiRouter.use(notFoundHandler);

  return apiRouter;
}

/**
 * 创建配置了所有中间件的应用路由器
 */
export function createAppRouter(): Router {
  const appRouter = Router();

  // 全局安全头部
  appRouter.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });

  // CORS 处理（如果需要）
  // appRouter.use(cors());

  // 请求体解析
  appRouter.use((req, res, next) => {
    // 生成请求ID（如果没有的话）
    if (!req.headers['x-request-id']) {
      req.headers['x-request-id'] = `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }
    next();
  });

  // API 路由
  appRouter.use('/api', createApiRouter());

  // 错误处理（必须在所有路由之后）
  appRouter.use(errorHandler());

  return appRouter;
}

// 导出路由器
export const apiRouter = createApiRouter();
export const appRouter = createAppRouter();

// 导出默认值
export default appRouter;
