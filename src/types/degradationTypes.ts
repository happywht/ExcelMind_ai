/**
 * 降级策略类型定义
 *
 * 定义系统降级模式、状态和监控指标
 * @module degradationTypes
 */

/**
 * 降级模式枚举
 */
export enum DegradationMode {
  /** 浏览器模式 - 完全本地执行（Pyodide） */
  BROWSER = 'browser',
  /** 混合模式 - 前端预处理 + 后端AI */
  HYBRID = 'hybrid',
  /** 纯后端模式 - 完全服务器端执行 */
  BACKEND = 'backend'
}

/**
 * 降级级别枚举
 */
export enum DegradationLevel {
  /** 正常 - 无降级 */
  NORMAL = 'normal',
  /** 预警 - 接近降级阈值 */
  WARNING = 'warning',
  /** 降级 - 已启用降级策略 */
  DEGRADED = 'degraded',
  /** 严重 - 完全降级到后端模式 */
  CRITICAL = 'critical'
}

/**
 * 降级指标接口
 */
export interface DegradationMetrics {
  /** 内存使用率 (0-100) */
  memoryUsage: number;
  /** 文件大小 (bytes) */
  fileSize: number;
  /** API调用失败率 (0-100) */
  apiFailureRate: number;
  /** 平均执行时间 (seconds) */
  avgExecutionTime: number;
  /** 连续失败次数 */
  consecutiveFailures: number;
  /** 最后更新时间 */
  lastUpdate: Date;
}

/**
 * 降级状态接口
 */
export interface DegradationState {
  /** 当前模式 */
  currentMode: DegradationMode;
  /** 当前级别 */
  currentLevel: DegradationLevel;
  /** 降级原因 */
  reason?: string;
  /** 最后检查时间 */
  lastCheck: Date;
  /** 当前指标 */
  metrics: DegradationMetrics;
  /** 是否允许恢复到正常模式 */
  canRecover: boolean;
  /** 稳定持续时间（毫秒） */
  stableDuration: number;
}

/**
 * 降级配置接口
 */
export interface DegradationThresholds {
  /** 内存预警阈值 (%) */
  memoryWarning: number;
  /** 内存临界阈值 (%) */
  memoryCritical: number;
  /** 文件大小预警阈值 (bytes) */
  fileSizeWarning: number;
  /** 文件大小临界阈值 (bytes) */
  fileSizeCritical: number;
  /** API失败率预警阈值 (%) */
  apiFailureWarning: number;
  /** API失败率临界阈值 (%) */
  apiFailureCritical: number;
  /** 执行超时阈值 (seconds) */
  executionTimeout: number;
}

/**
 * 降级恢复配置接口
 */
export interface RecoveryConfig {
  /** 检查间隔 (milliseconds) */
  checkInterval: number;
  /** 最小稳定时间 (milliseconds) */
  minStableTime: number;
  /** 恢复尝试次数 */
  maxRecoveryAttempts: number;
}

/**
 * 降级模式配置接口
 */
export interface ModeConfig {
  /** 浏览器模式配置 */
  browser: {
    maxFileSize: number;
    maxMemory: number;
  };
  /** 混合模式配置 */
  hybrid: {
    maxFileSize: number;
    apiFallback: boolean;
  };
  /** 后端模式配置 */
  backend: {
    maxFileSize: number;
    requiresNetwork: boolean;
  };
}

/**
 * 降级事件类型
 */
export enum DegradationEventType {
  /** 模式变更 */
  MODE_CHANGED = 'mode_changed',
  /** 预警触发 */
  WARNING_TRIGGERED = 'warning_triggered',
  /** 指标更新 */
  METRICS_UPDATED = 'metrics_updated',
  /** 恢复尝试 */
  RECOVERY_ATTEMPT = 'recovery_attempt',
  /** 恢复成功 */
  RECOVERY_SUCCESS = 'recovery_success'
}

/**
 * 降级事件接口
 */
export interface DegradationEvent {
  /** 事件类型 */
  type: DegradationEventType;
  /** 时间戳 */
  timestamp: Date;
  /** 源模式 */
  fromMode?: DegradationMode;
  /** 目标模式 */
  toMode?: DegradationMode;
  /** 事件消息 */
  message: string;
  /** 事件数据 */
  data?: any;
}

/**
 * 降级决策结果接口
 */
export interface DegradationDecision {
  /** 是否需要降级 */
  shouldDegrade: boolean;
  /** 目标模式 */
  targetMode?: DegradationMode;
  /** 决策原因 */
  reason: string;
  /** 触发的阈值 */
  triggeredThresholds: string[];
  /** 置信度 (0-1) */
  confidence: number;
}

/**
 * 内存监控状态接口
 */
export interface MemoryStatus {
  /** 总内存 (bytes) */
  total: number;
  /** 已用内存 (bytes) */
  used: number;
  /** 使用率 (0-100) */
  usagePercent: number;
  /** 是否处于压力状态 */
  underPressure: boolean;
  /** 预测溢出概率 (0-1) */
  overflowProbability: number;
  /** 最后检查时间 */
  lastCheck: Date;
}

/**
 * API熔断器状态接口
 */
export interface CircuitBreakerState {
  /** 熔断器是否开启 */
  isOpen: boolean;
  /** 失败次数 */
  failureCount: number;
  /** 成功次数 */
  successCount: number;
  /** 总调用次数 */
  totalCalls: number;
  /** 失败率 (0-100) */
  failureRate: number;
  /** 最后失败时间 */
  lastFailureTime?: Date;
  /** 最后成功时间 */
  lastSuccessTime?: Date;
  /** 半开启状态下的测试请求数 */
  halfOpenRequests: number;
  /** 开启时间 */
  openedAt?: Date;
}

/**
 * 降级历史记录接口
 */
export interface DegradationHistory {
  /** 记录ID */
  id: string;
  /** 时间戳 */
  timestamp: Date;
  /** 事件类型 */
  eventType: DegradationEventType;
  /** 从模式 */
  fromMode?: DegradationMode;
  /** 到模式 */
  toMode?: DegradationMode;
  /** 原因 */
  reason: string;
  /** 指标快照 */
  metricsSnapshot: DegradationMetrics;
  /** 用户ID（可选） */
  userId?: string;
  /** 会话ID（可选） */
  sessionId?: string;
}

/**
 * 降级通知接口
 */
export interface DegradationNotification {
  /** 通知类型 */
  type: 'info' | 'warning' | 'error' | 'success';
  /** 标题 */
  title: string;
  /** 消息 */
  message: string;
  /** 当前模式 */
  currentMode: DegradationMode;
  /** 建议操作 */
  suggestedActions?: string[];
  /** 持续时间（毫秒，-1表示持续显示） */
  duration?: number;
}

/**
 * 降级健康检查结果接口
 */
export interface HealthCheckResult {
  /** 是否健康 */
  isHealthy: boolean;
  /** 检查项结果 */
  checks: {
    /** 内存检查 */
    memory: { passed: boolean; value: number; threshold: number };
    /** 文件大小检查 */
    fileSize: { passed: boolean; value: number; threshold: number };
    /** API可用性检查 */
    api: { passed: boolean; value: number; threshold: number };
    /** 执行时间检查 */
    execution: { passed: boolean; value: number; threshold: number };
  };
  /** 整体评分 (0-100) */
  overallScore: number;
  /** 建议的降级模式 */
  recommendedMode: DegradationMode;
}
