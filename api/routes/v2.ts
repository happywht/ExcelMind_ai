/**
 * Phase 2 API v2 路由配置
 *
 * 整合所有Phase 2 API端点
 * 基于 API_SPECIFICATION_PHASE2.md 规范
 */

import { Router } from 'express';
import multer from 'multer';

// 导入控制器
import { DataQualityController, createDataQualityController } from '../controllers/dataQualityController';
import {
  templateController,
} from '../controllers/templateController';
import {
  batchGenerationController,
} from '../controllers/batchGenerationController';
import {
  auditController,
} from '../controllers/auditController';
import { aiRouter } from './ai';
import { smartProcessRouter } from './smartProcess';

// 导入服务
import { createLocalStorageService } from '../../services/storage/LocalStorageService';
import { WebSocketService } from '../../services/websocket/websocketService';

// 导入中间件
import {
  PredefinedValidators,
  fileUploadValidation,
} from '../middleware/validationMiddleware';
import {
  errorHandler,
  notFoundHandler,
  asyncHandler,
} from '../middleware/errorHandler';
import {
  requireAuth,
  requireRead,
  requireWrite,
  requireDelete,
  requireExecute,
  requireBasic,
  requireProfessional,
} from '../middleware/authMiddleware';
import {
  ipRateLimiter,
  userRateLimiter,
  predefinedRateLimiters,
} from '../middleware/rateLimiter';

/**
 * 创建 v2 路由器
 */
export function createV2Router(): Router {
  const router = Router();

  // 全局中间件
  router.use(ipRateLimiter.middleware); // 基础IP速率限制

  // ========================================================================
  // 1. 智能数据处理模块
  // ========================================================================

  const dataQualityRouter = Router();

  // 创建DataQualityController实例
  const storageService = createLocalStorageService({ prefix: 'dq_' });
  // 注意：这里需要一个WebSocketService实例，暂时使用null作为占位符
  // 实际使用时应该从服务器传入
  const websocketService = null as any;
  const dataQualityControllerInstance = createDataQualityController(storageService, websocketService);

  // 数据质量分析路由
  dataQualityRouter.post(
    '/analyze',
    requireAuth,
    requireExecute,
    PredefinedValidators.dataQualityAnalyze,
    asyncHandler(dataQualityControllerInstance.analyze.bind(dataQualityControllerInstance))
  );

  dataQualityRouter.get(
    '/analysis/:id',
    requireAuth,
    requireRead,
    asyncHandler(dataQualityControllerInstance.getAnalysis.bind(dataQualityControllerInstance))
  );

  dataQualityRouter.post(
    '/recommendations',
    requireAuth,
    requireRead,
    asyncHandler(dataQualityControllerInstance.getRecommendations.bind(dataQualityControllerInstance))
  );

  dataQualityRouter.post(
    '/auto-fix',
    requireAuth,
    requireWrite,
    asyncHandler(dataQualityControllerInstance.autoFix.bind(dataQualityControllerInstance))
  );

  dataQualityRouter.get(
    '/statistics',
    requireAuth,
    requireRead,
    asyncHandler(dataQualityControllerInstance.getStatistics.bind(dataQualityControllerInstance))
  );

  // 转换规则路由（TODO: 实现转换规则控制器）
  // dataQualityRouter.post('/transform-rules', requireAuth, requireWrite, ...);
  // dataQualityRouter.get('/transform-rules', requireAuth, requireRead, ...);
  // dataQualityRouter.post('/apply-rules', requireAuth, requireExecute, ...);

  router.use('/data-quality', dataQualityRouter);

  // ========================================================================
  // 2. 多模板文档生成模块
  // ========================================================================

  const templateRouter = Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  });

  // 模板管理路由
  templateRouter.post(
    '/',
    requireAuth,
    requireWrite,
    upload.single('file'),
    fileUploadValidation(),
    asyncHandler(templateController.upload.bind(templateController))
  );

  templateRouter.get(
    '/',
    requireAuth,
    requireRead,
    PredefinedValidators.pagination,
    asyncHandler(templateController.list.bind(templateController))
  );

  templateRouter.get(
    '/:id',
    requireAuth,
    requireRead,
    asyncHandler(templateController.get.bind(templateController))
  );

  templateRouter.put(
    '/:id',
    requireAuth,
    requireWrite,
    asyncHandler(templateController.update.bind(templateController))
  );

  templateRouter.delete(
    '/:id',
    requireAuth,
    requireDelete,
    asyncHandler(templateController.delete.bind(templateController))
  );

  templateRouter.post(
    '/:id/preview',
    requireAuth,
    requireExecute,
    asyncHandler(templateController.preview.bind(templateController))
  );

  templateRouter.get(
    '/:id/variables',
    requireAuth,
    requireRead,
    asyncHandler(templateController.getVariables.bind(templateController))
  );

  templateRouter.get(
    '/:id/download',
    requireAuth,
    requireRead,
    asyncHandler(templateController.download.bind(templateController))
  );

  router.use('/templates', templateRouter);

  // 批量文档生成路由
  const batchRouter = Router();
  const batchRateLimiter = predefinedRateLimiters.batchGeneration;

  batchRouter.post(
    '/tasks',
    requireAuth,
    requireBasic,
    batchRateLimiter.middleware,
    asyncHandler(batchGenerationController.createTask.bind(batchGenerationController))
  );

  batchRouter.get(
    '/tasks',
    requireAuth,
    requireRead,
    asyncHandler(batchGenerationController.listTasks.bind(batchGenerationController))
  );

  batchRouter.get(
    '/tasks/:id',
    requireAuth,
    requireRead,
    asyncHandler(batchGenerationController.getTask.bind(batchGenerationController))
  );

  batchRouter.post(
    '/tasks/:id/start',
    requireAuth,
    requireExecute,
    asyncHandler(batchGenerationController.startTask.bind(batchGenerationController))
  );

  batchRouter.post(
    '/tasks/:id/pause',
    requireAuth,
    requireExecute,
    asyncHandler(batchGenerationController.pauseTask.bind(batchGenerationController))
  );

  batchRouter.post(
    '/tasks/:id/cancel',
    requireAuth,
    requireExecute,
    asyncHandler(batchGenerationController.cancelTask.bind(batchGenerationController))
  );

  batchRouter.get(
    '/tasks/:id/progress',
    requireAuth,
    requireRead,
    asyncHandler(batchGenerationController.getProgress.bind(batchGenerationController))
  );

  batchRouter.get(
    '/tasks/:id/download/:templateId/:documentId',
    requireAuth,
    requireRead,
    predefinedRateLimiters.documentDownload.middleware,
    asyncHandler(batchGenerationController.downloadDocument.bind(batchGenerationController))
  );

  batchRouter.get(
    '/tasks/:id/download/zip',
    requireAuth,
    requireRead,
    predefinedRateLimiters.documentDownload.middleware,
    asyncHandler(batchGenerationController.downloadZip.bind(batchGenerationController))
  );

  router.use('/generation', batchRouter);

  // ========================================================================
  // 3. 审计规则引擎模块
  // ========================================================================

  const auditRouter = Router();

  // 审计规则管理路由
  auditRouter.post(
    '/rules',
    requireAuth,
    requireWrite,
    asyncHandler(auditController.createRule.bind(auditController))
  );

  auditRouter.get(
    '/rules',
    requireAuth,
    requireRead,
    asyncHandler(auditController.listRules.bind(auditController))
  );

  auditRouter.get(
    '/rules/:id',
    requireAuth,
    requireRead,
    asyncHandler(auditController.getRule.bind(auditController))
  );

  auditRouter.put(
    '/rules/:id',
    requireAuth,
    requireWrite,
    asyncHandler(auditController.updateRule.bind(auditController))
  );

  auditRouter.delete(
    '/rules/:id',
    requireAuth,
    requireDelete,
    asyncHandler(auditController.deleteRule.bind(auditController))
  );

  // 审计执行路由
  auditRouter.post(
    '/execute',
    requireAuth,
    requireExecute,
    PredefinedValidators.auditExecute,
    asyncHandler(auditController.execute.bind(auditController))
  );

  // 审计报告路由
  auditRouter.get(
    '/reports/:auditId',
    requireAuth,
    requireRead,
    asyncHandler(auditController.getReport.bind(auditController))
  );

  auditRouter.get(
    '/reports/:auditId/:format',
    requireAuth,
    requireRead,
    asyncHandler(auditController.downloadReport.bind(auditController))
  );

  router.use('/audit', auditRouter);

  // ========================================================================
  // 4. 性能监控模块（TODO: 实现控制器）
  // ========================================================================

  // const monitoringRouter = Router();
  // monitoringRouter.get('/metrics', requireAuth, requireRead, ...);
  // monitoringRouter.get('/reports', requireAuth, requireRead, ...);
  // monitoringRouter.post('/alerts', requireAuth, requireWrite, ...);
  // router.use('/monitoring', monitoringRouter);

  // ========================================================================
  // 5. 质量控制模块（TODO: 实现控制器）
  // ========================================================================

  // const qualityRouter = Router();
  // qualityRouter.post('/validate/sql', requireAuth, requireExecute, ...);
  // qualityRouter.post('/detect-hallucination', requireAuth, requireExecute, ...);
  // qualityRouter.post('/fix-suggestions', requireAuth, requireRead, ...);
  // qualityRouter.post('/gates', requireAuth, requireWrite, ...);
  // router.use('/quality', qualityRouter);

  // ========================================================================
  // 6. AI服务代理模块
  // ========================================================================

  router.use('/ai', aiRouter);

  // ========================================================================
  // 7. 智能处理模块 (NEW - Phase 2)
  // ========================================================================

  router.use('/ai/smart-process', smartProcessRouter);

  // ========================================================================
  // WebSocket 端点（TODO: 实现WebSocket服务器）
  // ========================================================================

  // router.ws('/stream/:taskId', ...);

  return router;
}

// 导出路由器
export const v2Router = createV2Router();

// 导出默认值
export default v2Router;
