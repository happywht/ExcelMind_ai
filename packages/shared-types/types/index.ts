/**
 * @file ExcelMind AI 共享类型库 - 主入口文件
 * @description 统一导出所有类型定义，确保前后端类型一致性
 * @module types/index
 * @version 1.0.0
 */

// ========== 文件元数据类型 ==========
export * from './fileMetadata';

// ========== 执行状态类型 ==========
export * from './executionTypes';

// ========== 验证结果类型 ==========
export * from './validationTypes';

// ========== 错误类型 ==========
export * from './errorTypes';

// ========== 通用类型定义 ==========

/**
 * 通用状态枚举
 */
export enum CommonStatus {
  /** 活跃 */
  ACTIVE = 'active',
  /** 非活跃 */
  INACTIVE = 'inactive',
  /** 已删除 */
  DELETED = 'deleted',
  /** 已归档 */
  ARCHIVED = 'archived'
}

/**
 * 简化的数据质量指标接口
 * @description 用于通用的数据质量评估
 */
export interface SimpleDataQualityMetrics {
  /** 缺失值数量 */
  missingValues: number;
  /** 重复行数量 */
  duplicateRows: number;
  /** 类型不一致数量 */
  inconsistentTypes: number;
  /** 空值比例（0-1） */
  missingRatio: number;
  /** 重复行比例（0-1） */
  duplicateRatio: number;
}

/**
 * 分页参数接口
 */
export interface PaginationParams {
  /** 页码（从1开始） */
  page: number;
  /** 每页数量 */
  pageSize: number;
  /** 排序字段 */
  sortBy?: string;
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
}

/**
 * 分页响应接口
 */
export interface PaginationResponse<T> {
  /** 数据列表 */
  items: T[];
  /** 总数 */
  total: number;
  /** 当前页码 */
  page: number;
  /** 每页数量 */
  pageSize: number;
  /** 总页数 */
  totalPages: number;
  /** 是否有下一页 */
  hasNext: boolean;
  /** 是否有上一页 */
  hasPrev: boolean;
}

/**
 * API响应基础接口
 */
export interface ApiResponse<T = any> {
  /** 是否成功 */
  success: boolean;
  /** 响应数据 */
  data?: T;
  /** 错误信息 */
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  /** 响应元数据 */
  metadata?: {
    timestamp: number;
    requestId: string;
    version: string;
  };
}

/**
 * 配置接口
 */
export interface Config {
  /** 系统配置 */
  system: SystemConfig;
  /** AI服务配置 */
  ai: AIServiceConfig;
  /** 缓存配置 */
  cache: CacheConfig;
  /** 执行配置 */
  execution: ExecutionConfig;
  /** 日志配置 */
  logging: LoggingConfig;
}

/**
 * 系统配置接口
 */
export interface SystemConfig {
  /** 系统名称 */
  name: string;
  /** 系统版本 */
  version: string;
  /** 环境 */
  environment: 'development' | 'staging' | 'production';
  /** 调试模式 */
  debug: boolean;
}

/**
 * AI服务配置接口
 */
export interface AIServiceConfig {
  /** 服务提供商 */
  provider: 'zhipu' | 'openai' | 'anthropic' | 'custom';
  /** 模型名称 */
  model: string;
  /** API密钥 */
  apiKey: string;
  /** 基础URL */
  baseURL?: string;
  /** 请求选项 */
  options: {
    /** 最大Token数 */
    maxTokens: number;
    /** 温度 */
    temperature: number;
    /** 超时时间（毫秒） */
    timeout: number;
    /** 最大重试次数 */
    maxRetries: number;
    /** 重试延迟（毫秒） */
    retryDelay: number;
  };
}

/**
 * 缓存配置接口
 */
export interface CacheConfig {
  /** 是否启用缓存 */
  enabled: boolean;
  /** 最大缓存大小（MB） */
  maxSize: number;
  /** 缓存过期时间（毫秒） */
  ttl: number;
  /** 缓存策略 */
  strategy: 'lru' | 'fifo' | 'lfu';
}

/**
 * 执行配置接口
 */
export interface ExecutionConfig {
  /** 最大并发任务数 */
  maxConcurrentTasks: number;
  /** 任务超时时间（毫秒） */
  taskTimeout: number;
  /** 清理间隔（毫秒） */
  cleanupInterval: number;
}

/**
 * 日志配置接口
 */
export interface LoggingConfig {
  /** 日志级别 */
  level: 'debug' | 'info' | 'warn' | 'error';
  /** 是否启用指标 */
  enableMetrics: boolean;
  /** 日志输出方式 */
  output: 'console' | 'file' | 'remote';
}

/**
 * 会话信息接口
 */
export interface SessionInfo {
  /** 会话ID */
  sessionId: string;
  /** 用户ID */
  userId?: string;
  /** 开始时间 */
  startTime: number;
  /** 最后活动时间 */
  lastActivity: number;
  /** 会话数据 */
  data?: {
    [key: string]: any;
  };
}

/**
 * 任务信息接口
 */
export interface TaskInfo {
  /** 任务ID */
  taskId: string;
  /** 任务类型 */
  taskType: string;
  /** 任务状态 */
  status: string;
  /** 进度（0-100） */
  progress: number;
  /** 创建时间 */
  createdAt: number;
  /** 更新时间 */
  updatedAt: number;
  /** 完成时间 */
  completedAt?: number;
  /** 任务元数据 */
  metadata?: {
    [key: string]: any;
  };
}

/**
 * 用户信息接口
 */
export interface UserInfo {
  /** 用户ID */
  id: string;
  /** 用户名 */
  name: string;
  /** 邮箱 */
  email?: string;
  /** 角色 */
  role: 'admin' | 'user' | 'guest';
  /** 权限列表 */
  permissions: string[];
  /** 创建时间 */
  createdAt: number;
  /** 最后登录时间 */
  lastLoginAt?: number;
}

/**
 * 字段映射接口（基础版）
 */
export interface FieldMapping {
  /** 占位符 */
  placeholder: string;
  /** Excel列名 */
  excelColumn: string;
  /** 数据转换代码 */
  transform?: string;
}

/**
 * 映射方案接口（基础版）
 */
export interface MappingScheme {
  /** 映射说明 */
  explanation: string;
  /** 筛选条件 */
  filterCondition: string | null;
  /** 主Sheet */
  primarySheet: string;
  /** 字段映射 */
  mappings: FieldMapping[];
  /** 跨Sheet映射 */
  crossSheetMappings?: any[];
  /** 未映射的占位符 */
  unmappedPlaceholders: string[];
  /** 所有Sheet信息 */
  allSheetsInfo?: any[];
  /** 置信度 */
  confidence?: number;
}

/**
 * 文档生成选项接口
 */
export interface GenerationOptions {
  /** 模板数据 */
  template: ArrayBuffer;
  /** 映射数据 */
  data: any | any[];
  /** 输出文件名 */
  outputFileName?: string;
  /** 生成模式 */
  mode?: 'individual' | 'aggregate';
  /** 聚合配置 */
  aggregateConfig?: any;
}

/**
 * 文档生成结果接口
 */
export interface GenerationResult {
  /** 是否成功 */
  success: boolean;
  /** 生成的文档 */
  documents: Blob[];
  /** 文件名 */
  fileName: string;
  /** 文档数量 */
  count: number;
  /** 错误信息 */
  error?: string;
}

/**
 * 日志级别类型
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * 日志条目接口
 */
export interface LogEntry {
  /** 日志级别 */
  level: LogLevel;
  /** 日志消息 */
  message: string;
  /** 时间戳 */
  timestamp: number;
  /** 上下文信息 */
  context?: {
    [key: string]: any;
  };
  /** 堆栈信息 */
  stack?: string;
}

/**
 * 统计信息接口
 */
export interface Statistics {
  /** 总任务数 */
  totalTasks: number;
  /** 已完成任务数 */
  completedTasks: number;
  /** 失败任务数 */
  failedTasks: number;
  /** 平均执行时间 */
  averageExecutionTime: number;
  /** 成功率 */
  successRate: number;
  /** 错误分布 */
  errorDistribution: {
    [category: string]: number;
  };
  /** 最常见错误 */
  mostCommonErrors: {
    error: string;
    count: number;
  }[];
}

/**
 * 进度回调函数类型
 */
export type ProgressCallback = (progress: TaskProgress) => void;

/**
 * 任务进度接口
 */
export interface TaskProgress {
  /** 任务ID */
  taskId: string;
  /** 当前进度（0-100） */
  percentage: number;
  /** 当前阶段 */
  currentStage: string;
  /** 进度消息 */
  message: string;
  /** 进度详情 */
  details?: {
    [key: string]: any;
  };
}

/**
 * 工具函数类型
 */
export type UtilityFunction = (...args: any[]) => any;

/**
 * 事件处理器类型
 */
export type EventHandler = (...args: any[]) => void | Promise<void>;

/**
 * 事件接口
 */
export interface Event {
  /** 事件类型 */
  type: string;
  /** 事件数据 */
  data?: any;
  /** 时间戳 */
  timestamp: number;
  /** 事件来源 */
  source?: string;
}

/**
 * 错误构造函数类型
 */
export type ErrorConstructor = new (message: string, code?: string) => Error;

/**
 * 类构造函数类型
 */
export type ClassConstructor<T = any> = new (...args: any[]) => T;

/**
 * 深度可空类型
 */
export type DeepNullable<T> = {
  [P in keyof T]: DeepNullable<T[P]> | null;
};

/**
 * 深度只读类型
 */
export type DeepReadOnly<T> = {
  readonly [P in keyof T]: DeepReadOnly<T[P]>;
};

/**
 * 深度可选类型
 */
export type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};

/**
 * 提取函数返回值类型
 */
export type ReturnType<T extends (...args: any) => any> = T extends (
  ...args: any
) => infer R
  ? R
  : any;

/**
 * 提取Promise的返回值类型
 */
export type Awaited<T> = T extends Promise<infer U> ? U : T;

/**
 * 版本信息接口
 */
export interface VersionInfo {
  /** 主版本号 */
  major: number;
  /** 次版本号 */
  minor: number;
  /** 补丁版本号 */
  patch: number;
  /** 预发布版本 */
  prerelease?: string;
  /** 构建元数据 */
  build?: string;
}

/**
 * 健康检查结果接口
 */
export interface HealthCheckResult {
  /** 是否健康 */
  healthy: boolean;
  /** 检查时间 */
  timestamp: number;
  /** 服务状态 */
  services: {
    [serviceName: string]: {
      /** 是否健康 */
      healthy: boolean;
      /** 响应时间（毫秒） */
      responseTime: number;
      /** 错误消息 */
      error?: string;
    };
  };
}

/**
 * 功能开关接口
 */
export interface FeatureFlag {
  /** 功能名称 */
  name: string;
  /** 是否启用 */
  enabled: boolean;
  /** 目标用户 */
  targetUsers?: string[];
  /** 目标百分比（0-100） */
  targetPercentage?: number;
  /** 过期时间 */
  expiresAt?: number;
}

/**
 * 缓存键接口
 */
export interface CacheKey {
  /** 键类型 */
  type: string;
  /** 键哈希 */
  hash: string;
  /** 版本 */
  version: string;
}

/**
 * 缓存条目接口
 */
export interface CacheEntry<T = any> {
  /** 缓存键 */
  key: CacheKey;
  /** 缓存值 */
  value: T;
  /** 创建时间 */
  createdAt: number;
  /** 过期时间 */
  expiresAt: number;
  /** 命中次数 */
  hitCount: number;
  /** 元数据 */
  metadata: {
    /** 缓存大小 */
    size: number;
    /** 标签 */
    tags: string[];
    /** 来源 */
    source: string;
  };
}
