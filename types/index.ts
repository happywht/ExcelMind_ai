/**
 * 类型定义导出
 * 统一导出所有前端类型定义
 */

// 审计轨迹类型
export * from './auditTrailTypes';

// 执行可视化类型
export type { ExecutionState } from './executionTypes';
export * from './executionTypes';

// 验证类型
export type { ValidationConfig, ValidationResult } from './validationTypes';
export * from './validationTypes';

// Agentic 类型 - 使用别名避免冲突
export type {
  AIAnalysisRequest as AgenticAIAnalysisRequest,
  AIAnalysisResponse as AgenticAIAnalysisResponse
} from './agenticTypes';
// 不使用 export * 以避免名称冲突

// 文档类型
export * from './documentTypes';

// 映射类型 - 使用别名避免冲突
export type {
  AIAnalysisRequest as MappingAIAnalysisRequest,
  AIAnalysisResponse as MappingAIAnalysisResponse,
  CacheEntry as MappingCacheEntry
} from './mappingSchemaV2';
// 不使用 export * 以避免名称冲突

// Sandbox 类型
export * from './sandbox';

// 降级策略类型
export * from './degradationTypes';

// 存储类型
export * from './storageTypes';

// Phase 2 存储服务类型
export * from './storage';

// Phase 2 API 类型
export * from './apiTypes';

// Phase 2 错误代码
export * from './errorCodes';

// 数据质量类型
export * from './dataQuality';

// 质量规则类型
export * from './qualityRule';
