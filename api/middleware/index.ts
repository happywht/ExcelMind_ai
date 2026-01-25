/**
 * API 中间件索引文件
 *
 * 导出所有中间件供外部使用
 */

// 验证中间件
export {
  ValidationMiddleware,
  ValidationRules,
  PredefinedValidators,
  fileUploadValidation,
} from './validationMiddleware';

// 错误处理中间件
export {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  ApiError,
  throwApiError,
  ApiErrors,
} from './errorHandler';

// 认证中间件
export {
  AuthMiddleware,
  createAuthMiddleware,
  authMiddleware,
  requireAuth,
  requireRead,
  requireWrite,
  requireDelete,
  requireExecute,
  requireAdmin,
  requireBasic,
  requireProfessional,
  requireEnterprise,
  PermissionScope,
} from './authMiddleware';

// 速率限制中间件
export {
  RateLimiterMiddleware,
  createRateLimiter,
  createTierRateLimiter,
  createEndpointRateLimiter,
  predefinedRateLimiters,
  ipRateLimiter,
  userRateLimiter,
  skipRateLimit,
} from './rateLimiter';

// 导出默认值
export { errorHandler as default } from './errorHandler';
