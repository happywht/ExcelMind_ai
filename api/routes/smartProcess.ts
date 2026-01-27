/**
 * 智能处理路由
 *
 * 提供智能Excel数据处理的API端点
 * 所有请求都需要认证和授权
 */

import { Router } from 'express';
import { smartProcessController } from '../controllers/smartProcessController';
import { asyncHandler } from '../middleware/errorHandler';
import { requireAuth, requireExecute } from '../middleware/authMiddleware';
import { ipRateLimiter, userRateLimiter } from '../middleware/rateLimiter';

/**
 * 创建智能处理路由器
 */
export function createSmartProcessRouter(): Router {
  const router = Router();

  // 全局中间件
  router.use(ipRateLimiter.middleware); // IP级别速率限制

  // ========================================================================
  // 智能处理端点
  // ========================================================================

  /**
   * POST /api/v2/ai/smart-process
   *
   * 执行智能Excel数据处理
   * 支持多步分析(Observ-Think-Act-Evaluate)
   *
   * 请求体:
   * {
   *   "command": "对比表A和表B，找出金额不一致的行",
   *   "files": [...],
   *   "options": {...}
   * }
   *
   * 响应: 202 Accepted
   * {
   *   "success": true,
   *   "data": {
   *     "taskId": "task_12345",
   *     "status": "processing",
   *     "links": {...}
   *   }
   * }
   *
   * 需要: 认证 + 执行权限
   */
  router.post(
    '/',
    requireAuth,
    requireExecute,
    userRateLimiter.middleware, // ✅ 修复：正确使用速率限制器的 middleware 方法
    asyncHandler(smartProcessController.execute.bind(smartProcessController))
  );

  /**
   * GET /api/v2/ai/smart-process/:taskId
   *
   * 获取任务状态和结果
   *
   * 响应: 200 OK
   * {
   *   "success": true,
   *   "data": {
   *     "taskId": "task_12345",
   *     "status": "completed",
   *     "result": {...}
   *   }
   * }
   *
   * 需要: 认证 + 读取权限
   */
  router.get(
    '/:taskId',
    requireAuth,
    requireExecute,
    asyncHandler(smartProcessController.getStatus.bind(smartProcessController))
  );

  /**
   * POST /api/v2/ai/smart-process/:taskId/cancel
   *
   * 取消正在执行的任务
   *
   * 响应: 200 OK
   * {
   *   "success": true,
   *   "data": {
   *     "taskId": "task_12345",
   *     "status": "cancelled"
   *   }
   * }
   *
   * 需要: 认证 + 执行权限
   */
  router.post(
    '/:taskId/cancel',
    requireAuth,
    requireExecute,
    asyncHandler(smartProcessController.cancel.bind(smartProcessController))
  );

  // ========================================================================
  // 实时进度端点 (WebSocket/SSE) - TODO: Phase 2实现
  // ========================================================================

  /**
   * GET /api/v2/ai/smart-process/:taskId/stream
   *
   * 实时推送任务执行进度
   * 使用Server-Sent Events (SSE)或WebSocket
   *
   * 事件类型:
   * - progress: 进度更新
   * - log: 日志输出
   * - complete: 任务完成
   * - error: 错误发生
   *
   * 需要: 认证 + 执行权限
   */
  // router.get(
  //   '/:taskId/stream',
  //   requireAuth,
  //   requireExecute,
  //   (req, res) => {
  //     // SSE实现
  //     res.setHeader('Content-Type', 'text/event-stream');
  //     res.setHeader('Cache-Control', 'no-cache');
  //     res.setHeader('Connection', 'keep-alive');
  //
  //     // TODO: 实现SSE推送逻辑
  //   }
  // );

  return router;
}

// 导出路由器
export const smartProcessRouter = createSmartProcessRouter();

// 导出默认值
export default smartProcessRouter;
