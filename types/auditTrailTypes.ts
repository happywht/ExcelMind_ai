/**
 * 审计轨迹类型定义
 * 用于追踪和展示 ExcelMind AI 的操作历史
 */

/**
 * 审计轨迹状态
 */
export type AuditTrailStatus = 'success' | 'warning' | 'error' | 'pending';

/**
 * 审计轨迹条目详情
 */
export interface AuditTrailDetails {
  inputFile?: string;
  outputFile?: string;
  operation?: string;
  rowsProcessed?: number;
  anomaliesFound?: number;
  executionTime?: number;
  code?: string;
  errorMessage?: string;
  retryCount?: number;
  maxRetries?: number;
  [key: string]: any;
}

/**
 * 审计轨迹条目
 */
export interface AuditTrailEntry {
  id: string;
  timestamp: string;
  action: string;
  details: AuditTrailDetails;
  status: AuditTrailStatus;
  errorMessage?: string;
  stepNumber?: number;
}

/**
 * 审计轨迹报告元数据
 */
export interface AuditTrailMetadata {
  reportId: string;
  generatedAt: string;
  sessionId?: string;
  taskId?: string;
  totalSteps: number;
  successfulSteps: number;
  failedSteps: number;
  totalExecutionTime: number;
}

/**
 * 审计轨迹完整报告
 */
export interface AuditTrailReport {
  metadata: AuditTrailMetadata;
  entries: AuditTrailEntry[];
}

/**
 * 审计轨迹日志器接口
 */
export interface IAuditTrailLogger {
  log(action: string, details: AuditTrailDetails, status: AuditTrailStatus): void;
  generateReport(): AuditTrailReport;
  clear(): void;
  getEntries(): AuditTrailEntry[];
}
