/**
 * API 模块索引文件
 *
 * 导出所有API相关的控制器、中间件和路由
 * @version 2.0.0
 */

// ========================================================================
// Phase 2 REST API 服务端实现
// ========================================================================

// 控制器
export * from './controllers/dataQualityController';
export * from './controllers/templateController';
export * from './controllers/batchGenerationController';
export * from './controllers/auditController';

// 中间件
export * from './middleware';

// 路由
export * from './routes';

// ========================================================================
// Phase 2 API 客户端（原有）
// ========================================================================

export { dataQualityAPI, default as DataQualityAPI } from './dataQualityAPI';
export { templateAPI, default as TemplateAPI } from './templateAPI';
export { batchGenerationAPI, default as BatchGenerationAPI } from './batchGenerationAPI';
export * from './config';

// ========================================================================
// 默认导出
// ========================================================================

import { appRouter } from './routes';

export default appRouter;
