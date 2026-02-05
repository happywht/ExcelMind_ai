/**
 * 质量保证和验证相关的类型定义
 */

// ============================================================================
// SQL 验证类型
// ============================================================================

/**
 * 标识符检查项
 */
export interface IdentifierCheckItem {
  name: string;
  exists: boolean;
  position: string;
}

/**
 * 标识符验证结果
 */
export interface IdentifierValidationResult {
  tables: IdentifierCheckItem[];
  columns: IdentifierCheckItem[];
  missingTables: string[];
  missingColumns: string[];
}

/**
 * 复杂度因子
 */
export interface ComplexityFactor {
  type: 'join' | 'subquery' | 'union' | 'aggregate' | 'nested' | 'other';
  score: number;
  description: string;
}

/**
 * 复杂度验证结果
 */
export interface ComplexityValidationResult {
  totalScore: number;
  factors: ComplexityFactor[];
  isComplex: boolean;
  threshold: number;
}

/**
 * 数据库架构
 */
export interface DatabaseSchema {
  tables: Record<string, {
    columns: Array<{
      name: string;
      type: string;
      nullable?: boolean;
    }>;
  }>;
}

// ============================================================================
// 修复建议类型
// ============================================================================

/**
 * 修复向导选项
 */
export interface FixWizardOption {
  /** 选项标题 */
  title: string;
  /** 选项描述 */
  description: string;
  /** 修复代码 - 用于标识要执行的修复操作 */
  fixCode?: string;
  /** 是否为自动修复 */
  isAutoFix?: boolean;
}

/**
 * 修复向导步骤
 */
export interface FixWizardStep {
  id?: string;
  title: string;
  description: string;
  action?: () => Promise<void>;
  canSkip?: boolean;
  options?: FixWizardOption[];
  defaultOption?: number;
}

/**
 * 修复建议
 */
export interface FixSuggestion {
  id?: string;
  type: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  canAutoFix: boolean;
  steps?: FixWizardStep[];
  suggested?: string;
  autoFixable?: boolean;
}

// ============================================================================
// 幻觉检测类型
// ============================================================================

/**
 * 幻觉报告
 */
export interface HallucinationReport {
  hasHallucination: boolean;
  confidence: number;
  details: string[];
  duration?: number; // 新增字段
}

// ============================================================================
// 文档性能类型
// ============================================================================

/**
 * 文档性能指标
 */
export interface DocumentPerformance {
  generationTime?: number; // 新增字段
  processingTime?: number;
  totalTime?: number;
  memoryUsage?: number;
}

// ============================================================================
// UX 指标类型
// ============================================================================

/**
 * UX 指标
 */
export interface UXMetrics {
  eventType?: string; // 新增字段
  userSatisfaction?: number;
  taskCompletionTime?: number;
  errorRate?: number;
}

// ============================================================================
// 测试报告类型
// ============================================================================

/**
 * 测试报告数据
 */
export interface TestReportData {
  testSuite: string;
  testDate: string;
  environment: {
    nodeVersion: string;
    platform: string;
    architecture: string;
  };
  stabilityResults: StabilityTestResult[];
  performanceResults: PerformanceTestResult[];
  summary: {
    overallStatus: 'PASS' | 'FAIL' | 'CONDITIONAL_PASS';
    totalTests: number; // 新增字段
    passedTests: number; // 新增字段
    failedTests: number;
    passRate: number;
  };
  recommendations: string[];
}

/**
 * 稳定性测试结果
 */
export interface StabilityTestResult {
  testName: string;
  status: 'PASS' | 'FAIL';
  duration: number;
  metrics: any;
  notes?: string;
}

/**
 * 性能测试结果
 */
export interface PerformanceTestResult {
  testName: string;
  status: 'PASS' | 'FAIL';
  metrics: {
    latency?: {
      min: number;
      max: number;
      avg: number;
      p50: number;
      p95: number;
      p99: number;
    };
    throughput?: {
      messagesPerSecond: number;
    };
    resourceUsage?: {
      cpuPercent: number;
      memoryMB: number;
    };
  };
  notes?: string;
}

// ============================================================================
// Excel 元数据类型
// ============================================================================

/**
 * Excel 元数据
 */
export interface ExcelMetadata {
  fileName: string;
  sheetCount: number;
  sheets: Array<{
    name: string;
    rowCount: number;
    columnCount: number;
  }>;
  hasHeaders?: boolean;
  hasFormulas?: boolean;
  hasCharts?: boolean;
}

// ============================================================================
// 多sheet数据源类型
// ============================================================================

/**
 * 多sheet数据源接口
 */
export interface IMultiSheetDataSource {
  enableCache?: boolean; // 新增字段
  getData(sheetName: string): Promise<any>;
  getSheetNames(): Promise<string[]>;
  hasSheet(sheetName: string): Promise<boolean>;
}

// ============================================================================
// 关系管理类型
// ============================================================================

/**
 * 关系移除函数类型
 */
export type RemoveAllRelationshipsFunction = (entityId: string) => Promise<void>;

// ============================================================================
// 同步服务类型
// ============================================================================

/**
 * 同步服务接口
 */
export interface SyncService {
  syncToIndexedDB?(data: any): Promise<void>; // 新增可选方法
  syncFromIndexedDB?(): Promise<any>; // 新增可选方法
}

// ============================================================================
// 状态管理器类型
// ============================================================================

/**
 * 状态管理器接口
 */
export interface StateManager {
  queryExecutionsByStatus?(status: string): Promise<any[]>; // 新增可选方法
  queryExecutionsByTimeRange?(startTime: number, endTime: number): Promise<any[]>; // 新增可选方法
  queryAllExecutions?(): Promise<any[]>; // 新增可选方法
}

// ============================================================================
// Vitest 配置类型
// ============================================================================

/**
 * Vitest 完整配置接口
 */
export interface FullConfig<TUtils, TEnvironment> {
  timeout?: number; // 新增字段
  [key: string]: any;
}

// ============================================================================
// 全局类型扩展
// ============================================================================

declare global {
  interface GlobalThis {
    alasql?: any; // 新增可选属性
  }
}

export {};
