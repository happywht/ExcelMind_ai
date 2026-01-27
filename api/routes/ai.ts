/**
 * AI代理路由
 *
 * 提供AI服务的后端代理接口
 * 所有AI调用都通过后端,确保API密钥不暴露给前端
 */

import { Router } from 'express';
import { aiController } from '../controllers/aiController';
import { asyncHandler } from '../middleware/errorHandler';
import { requireAuth, requireExecute } from '../middleware/authMiddleware';
import { ipRateLimiter } from '../middleware/rateLimiter';

/**
 * 创建AI路由器
 */
export function createAIRouter(): Router {
  const router = Router();

  // 应用IP级别的速率限制
  router.use(ipRateLimiter.middleware);

  // ========================================================================
  // AI代码生成路由
  // ========================================================================

  /**
   * POST /api/v2/ai/generate
   * 通用代码生成接口
   *
   * 请求体:
   * {
   *   "prompt": string,
   *   "context": any[],
   *   "options": { maxTokens, temperature, model }
   * }
   *
   * 需要: 认证 + 执行权限
   */
  router.post(
    '/generate',
    requireAuth,
    requireExecute,
    asyncHandler(aiController.generateCode.bind(aiController))
  );

  /**
   * POST /api/v2/ai/generate-data-code
   * 数据处理代码生成接口
   *
   * 请求体:
   * {
   *   "prompt": string,
   *   "context": Array<{
   *     fileName: string,
   *     headers: string[],
   *     sampleRows: any[],
   *     metadata?: any,
   *     currentSheetName?: string,
   *     sheets?: { [sheetName: string]: any }
   *   }>
   * }
   *
   * 需要: 认证 + 执行权限
   */
  router.post(
    '/generate-data-code',
    requireAuth,
    requireExecute,
    asyncHandler(aiController.generateDataProcessingCode.bind(aiController))
  );

  /**
   * POST /api/v2/ai/generate-formula
   * Excel公式生成接口
   *
   * 请求体:
   * {
   *   "description": string
   * }
   *
   * 需要: 认证 + 执行权限
   */
  router.post(
    '/generate-formula',
    requireAuth,
    requireExecute,
    asyncHandler(aiController.generateExcelFormula.bind(aiController))
  );

  /**
   * POST /api/v2/ai/chat
   * 知识库对话接口
   *
   * 请求体:
   * {
   *   "query": string,
   *   "history": Array<{ role: string, text: string }>,
   *   "contextDocs": string
   * }
   *
   * 需要: 认证 + 执行权限
   */
  router.post(
    '/chat',
    requireAuth,
    requireExecute,
    asyncHandler(aiController.chatWithKnowledgeBase.bind(aiController))
  );

  // ========================================================================
  // 熔断器管理路由
  // ========================================================================

  /**
   * GET /api/v2/ai/circuit-breaker/status
   * 获取熔断器当前状态
   *
   * 需要: 认证
   */
  router.get(
    '/circuit-breaker/status',
    requireAuth,
    asyncHandler(aiController.getCircuitBreakerStatus.bind(aiController))
  );

  /**
   * POST /api/v2/ai/circuit-breaker/reset
   * 重置熔断器
   *
   * 需要: 认证 + 执行权限
   */
  router.post(
    '/circuit-breaker/reset',
    requireAuth,
    requireExecute,
    asyncHandler(aiController.resetCircuitBreaker.bind(aiController))
  );

  /**
   * POST /api/v2/ai/circuit-breaker/close
   * 手动关闭熔断器
   *
   * 需要: 认证 + 执行权限
   */
  router.post(
    '/circuit-breaker/close',
    requireAuth,
    requireExecute,
    asyncHandler(aiController.closeCircuitBreaker.bind(aiController))
  );

  return router;
}

// 导出路由器
export const aiRouter = createAIRouter();

// 导出默认值
export default aiRouter;
