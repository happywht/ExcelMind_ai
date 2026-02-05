/**
 * 工具函数导出
 * 提供审计日志、结果验证和文件摆渡等实用工具
 */

export {
  AuditTrailLogger,
  createAuditLogger
} from './auditTrailLogger';

export {
  validateResult,
  quickValidate
} from './resultValidator';

export {
  FileFerryService,
  createFileFerryService,
  VFS_PATHS
} from './fileFerry';

// 类型导出
export type {
  AuditTrailEntry,
  AuditTrailDetails,
  AuditTrailReport,
  AuditTrailMetadata,
  IAuditTrailLogger,
  AuditTrailStatus
} from '../types/auditTrailTypes';

export type {
  ValidationResult,
  ValidationWarning,
  ValidationConfig,
  ValidationOptions,
  ExcelMetadata
} from '../types/validationTypes';

export type {
  FileFerryOptions,
  FerryResult,
  IPyodideFS
} from './fileFerry';
