/**
 * @file 错误类型定义
 * @description 定义标准错误类型，支持业务错误、系统错误、AI错误
 * @module types/errorTypes
 */

/**
 * 错误类别枚举
 * @description 定义错误的分类
 */
export enum ErrorCategory {
  // ========== 用户输入错误 ==========
  /** 验证错误 */
  VALIDATION_ERROR = 'validation_error',
  /** 无效输入 */
  INVALID_INPUT = 'invalid_input',
  /** 参数缺失 */
  MISSING_PARAMETER = 'missing_parameter',

  // ========== 数据处理错误 ==========
  /** 数据解析错误 */
  DATA_PARSING_ERROR = 'data_parsing_error',
  /** 数据转换错误 */
  DATA_TRANSFORMATION_ERROR = 'data_transformation_error',
  /** 列未找到 */
  COLUMN_NOT_FOUND = 'column_not_found',
  /** Sheet未找到 */
  SHEET_NOT_FOUND = 'sheet_not_found',
  /** 文件格式错误 */
  FILE_FORMAT_ERROR = 'file_format_error',

  // ========== AI服务错误 ==========
  /** AI服务错误 */
  AI_SERVICE_ERROR = 'ai_service_error',
  /** AI超时 */
  AI_TIMEOUT = 'ai_timeout',
  /** AI限流 */
  AI_RATE_LIMIT = 'ai_rate_limit',
  /** AI配额用尽 */
  AI_QUOTA_EXCEEDED = 'ai_quota_exceeded',
  /** AI输出解析失败 */
  AI_PARSING_FAILED = 'ai_parsing_failed',

  // ========== 代码执行错误 ==========
  /** 代码执行错误 */
  CODE_EXECUTION_ERROR = 'code_execution_error',
  /** 代码语法错误 */
  CODE_SYNTAX_ERROR = 'code_syntax_error',
  /** 运行时错误 */
  RUNTIME_ERROR = 'runtime_error',
  /** 内存溢出 */
  MEMORY_OVERFLOW = 'memory_overflow',

  // ========== 系统错误 ==========
  /** 网络错误 */
  NETWORK_ERROR = 'network_error',
  /** 存储错误 */
  STORAGE_ERROR = 'storage_error',
  /** 超时错误 */
  TIMEOUT_ERROR = 'timeout_error',
  /** 权限错误 */
  PERMISSION_ERROR = 'permission_error',
  /** 配置错误 */
  CONFIGURATION_ERROR = 'configuration_error',

  // ========== 业务逻辑错误 ==========
  /** 映射冲突 */
  MAPPING_CONFLICT = 'mapping_conflict',
  /** 循环依赖 */
  CIRCULAR_DEPENDENCY = 'circular_dependency',
  /** 数据不一致 */
  DATA_INCONSISTENCY = 'data_inconsistency',
  /** 业务规则违反 */
  BUSINESS_RULE_VIOLATION = 'business_rule_violation',

  // ========== 未知错误 ==========
  /** 未知错误 */
  UNKNOWN_ERROR = 'unknown_error'
}

/**
 * 错误严重级别枚举
 * @description 定义错误的严重程度
 */
export enum ErrorSeverity {
  /** 低级别 - 不影响核心功能 */
  LOW = 'low',
  /** 中级别 - 影响部分功能 */
  MEDIUM = 'medium',
  /** 高级别 - 严重影响功能 */
  HIGH = 'high',
  /** 严重级别 - 系统无法继续运行 */
  CRITICAL = 'critical'
}

/**
 * 错误码枚举
 * @description 标准化的错误码
 */
export enum ErrorCode {
  // ========== 通用错误 (1xxx) ==========
  UNKNOWN = '1000',
  INVALID_REQUEST = '1001',
  MISSING_PARAMETER = '1002',
  INVALID_PARAMETER = '1003',

  // ========== 数据错误 (2xxx) ==========
  FILE_NOT_FOUND = '2001',
  FILE_READ_ERROR = '2002',
  FILE_PARSE_ERROR = '2003',
  SHEET_NOT_FOUND = '2004',
  COLUMN_NOT_FOUND = '2005',
  DATA_FORMAT_ERROR = '2006',
  DATA_VALIDATION_FAILED = '2007',

  // ========== AI错误 (3xxx) ==========
  AI_SERVICE_ERROR = '3001',
  AI_TIMEOUT = '3002',
  AI_RATE_LIMIT = '3003',
  AI_QUOTA_EXCEEDED = '3004',
  AI_PARSING_FAILED = '3005',
  AI_INVALID_RESPONSE = '3006',

  // ========== 执行错误 (4xxx) ==========
  CODE_EXECUTION_ERROR = '4001',
  CODE_SYNTAX_ERROR = '4002',
  RUNTIME_ERROR = '4003',
  MEMORY_OVERFLOW = '4004',
  EXECUTION_TIMEOUT = '4005',

  // ========== 系统错误 (5xxx) ==========
  NETWORK_ERROR = '5001',
  STORAGE_ERROR = '5002',
  PERMISSION_DENIED = '5003',
  CONFIGURATION_ERROR = '5004',
  INTERNAL_ERROR = '5005',

  // ========== 业务错误 (6xxx) ==========
  MAPPING_CONFLICT = '6001',
  CIRCULAR_DEPENDENCY = '6002',
  DATA_INCONSISTENCY = '6003',
  BUSINESS_RULE_VIOLATION = '6004'
}

/**
 * 标准错误接口
 * @description 统一的错误结构
 */
export interface StandardError {
  /** 错误ID */
  id: string;
  /** 错误类别 */
  category: ErrorCategory;
  /** 错误码 */
  code: ErrorCode | string;
  /** 错误消息 */
  message: string;
  /** 用户友好的错误描述 */
  userMessage?: string;
  /** 错误详情 */
  details?: any;
  /** 错误堆栈 */
  stack?: string;
  /** 错误严重级别 */
  severity: ErrorSeverity;
  /** 是否可重试 */
  retryable: boolean;
  /** 时间戳 */
  timestamp: number;
  /** 错误上下文 */
  context?: {
    [key: string]: any;
  };
  /** 相关任务ID */
  taskId?: string;
  /** 相关步骤ID */
  stepId?: string;
}

/**
 * 错误响应接口
 * @description API错误响应的标准格式
 */
export interface ErrorResponse {
  /** 是否成功 */
  success: false;
  /** 错误信息 */
  error: {
    /** 错误码 */
    code: string;
    /** 错误消息 */
    message: string;
    /** 用户友好的错误描述 */
    userMessage?: string;
    /** 错误详情 */
    details?: any;
    /** 请求ID */
    requestId?: string;
    /** 时间戳 */
    timestamp: number;
  };
}

/**
 * 错误分析结果接口
 * @description AI分析错误的结果
 */
export interface ErrorAnalysis {
  /** 原始错误 */
  error: StandardError;
  /** 根本原因 */
  rootCause: string;
  /** 建议的修复策略 */
  suggestedRepairs: RepairStrategy[];
  /** 是否可自动恢复 */
  canAutoRecover: boolean;
  /** 是否需要用户干预 */
  requiresUserIntervention: boolean;
  /** 分析置信度（0-1） */
  confidence: number;
  /** 分析时间 */
  analyzedAt: number;
}

/**
 * 修复策略接口
 * @description 定义错误修复策略
 */
export interface RepairStrategy {
  /** 策略类型 */
  type: 'retry' | 'fallback' | 'alternative_approach' | 'user_intervention' | 'ignore';
  /** 策略描述 */
  description: string;
  /** 具体操作 */
  action: string;
  /** 优先级 */
  priority: number;
  /** 预计成功率（0-1） */
  estimatedSuccessRate: number;
  /** 预计耗时（毫秒） */
  estimatedDuration?: number;
  /** 所需资源 */
  requiredResources?: string[];
}

/**
 * 错误报告接口
 * @description 错误报告的完整结构
 */
export interface ErrorReport {
  /** 报告ID */
  id: string;
  /** 错误列表 */
  errors: StandardError[];
  /** 错误统计 */
  statistics: ErrorStatistics;
  /** 报告时间 */
  reportedAt: number;
  /** 报告人/系统 */
  reporter: string;
  /** 严重程度摘要 */
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

/**
 * 错误统计接口
 * @description 错误的统计信息
 */
export interface ErrorStatistics {
  /** 总错误数 */
  totalErrors: number;
  /** 按类别统计 */
  byCategory: {
    [category: string]: number;
  };
  /** 按严重级别统计 */
  bySeverity: {
    [severity: string]: number;
  };
  /** 按错误码统计 */
  byCode: {
    [code: string]: number;
  };
  /** 可重试错误数 */
  retryableErrors: number;
  /** 不可重试错误数 */
  nonRetryableErrors: number;
}

/**
 * 错误上下文接口
 * @description 错误发生的上下文信息
 */
export interface ErrorContext {
  /** 任务ID */
  taskId?: string;
  /** 步骤ID */
  stepId?: string;
  /** 操作名称 */
  operation?: string;
  /** 输入数据 */
  input?: any;
  /** 相关文件 */
  files?: string[];
  /** 用户信息 */
  user?: {
    id: string;
    name: string;
  };
  /** 系统信息 */
  system?: {
    platform: string;
    version: string;
    memory: number;
  };
  /** 自定义上下文 */
  custom?: {
    [key: string]: any;
  };
}

/**
 * 错误处理选项接口
 * @description 错误处理的配置选项
 */
export interface ErrorHandlingOptions {
  /** 最大重试次数 */
  maxRetries: number;
  /** 重试延迟（毫秒） */
  retryDelay: number;
  /** 是否使用指数退避 */
  exponentialBackoff: boolean;
  /** 是否启用自动修复 */
  enableAutoRepair: boolean;
  /** 错误回调函数 */
  onError?: (error: StandardError) => void;
  /** 重试回调函数 */
  onRetry?: (error: StandardError, attempt: number) => void;
  /** 是否在错误时继续 */
  continueOnError: boolean;
}

/**
 * 错误处理结果接口
 * @description 错误处理的结果
 */
export interface ErrorHandlingResult {
  /** 是否成功处理 */
  success: boolean;
  /** 应用的策略 */
  appliedStrategy?: RepairStrategy;
  /** 处理后的结果 */
  result?: any;
  /** 剩余错误 */
  remainingErrors: StandardError[];
  /** 尝试次数 */
  attemptNumber: number;
  /** 最大尝试次数 */
  maxAttempts: number;
  /** 是否可继续 */
  canContinue: boolean;
}

/**
 * AI错误详情接口
 * @description AI相关的错误详情
 */
export interface AIErrorDetails {
  /** AI服务提供商 */
  provider: 'zhipu' | 'openai' | 'anthropic' | 'custom';
  /** 模型名称 */
  model: string;
  /** 请求ID */
  requestId?: string;
  /** 使用的Token数 */
  tokensUsed?: {
    prompt: number;
    completion: number;
    total: number;
  };
  /** 响应内容（如果解析失败） */
  rawResponse?: string;
  /** 请求内容（用于调试） */
  request?: {
    prompt: string;
    maxTokens: number;
    temperature: number;
  };
}
