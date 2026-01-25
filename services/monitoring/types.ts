/**
 * 性能监控系统 - 类型定义
 *
 * Phase 2: 性能优化模块
 * 提供全面的性能监控、分析和优化功能
 */

// ============================================================================
// 核心类型定义
// ============================================================================

/**
 * 性能指标基础接口
 */
export interface PerformanceMetric {
  /** 指标类型 */
  type: MetricType;
  /** 指标名称 */
  name: string;
  /** 指标值 */
  value: number;
  /** 单位 */
  unit: MetricUnit;
  /** 时间戳 */
  timestamp: number;
  /** 附加数据 */
  metadata?: Record<string, any>;
  /** 标签 */
  tags?: string[];
}

/**
 * 指标类型
 */
export type MetricType =
  | 'query'          // 查询性能
  | 'ai_call'        // AI调用
  | 'document'       // 文档生成
  | 'cache'          // 缓存操作
  | 'memory'         // 内存使用
  | 'cpu'            // CPU使用
  | 'network'        // 网络请求
  | 'ux'             // 用户体验
  | 'custom';        // 自定义指标

/**
 * 指标单位
 */
export type MetricUnit =
  | 'ms'             // 毫秒
  | 's'              // 秒
  | 'bytes'          // 字节
  | 'kb'             // 千字节
  | 'mb'             // 兆字节
  | 'gb'             // 吉字节
  | '%'              // 百分比
  | 'count'          // 计数
  | 'ops'            // 操作/秒
  | 'rpm'            // 请求/分钟
  | 'rps'            // 请求/秒;

// ============================================================================
// 查询性能相关类型
// ============================================================================

/**
 * 查询性能指标
 */
export interface QueryPerformance extends PerformanceMetric {
  type: 'query';
  /** 查询SQL */
  query: string;
  /** 执行时间（毫秒） */
  executionTime: number;
  /** 返回行数 */
  rowCount: number;
  /** 查询类型 */
  queryType: 'simple' | 'aggregate' | 'join' | 'complex';
  /** 是否使用缓存 */
  cached: boolean;
  /** 涉及的表 */
  tables?: string[];
}

/**
 * 慢查询信息
 */
export interface SlowQuery {
  /** 查询SQL */
  query: string;
  /** 执行时间（毫秒） */
  executionTime: number;
  /** 执行次数 */
  executionCount: number;
  /** 平均执行时间 */
  avgExecutionTime: number;
  /** 最后执行时间 */
  lastExecution: number;
  /** 查询类型 */
  queryType: string;
  /** 优化建议 */
  suggestions: string[];
}

/**
 * 查询分析结果
 */
export interface QueryAnalysis {
  /** 总查询数 */
  totalQueries: number;
  /** 慢查询列表 */
  slowQueries: SlowQuery[];
  /** 平均执行时间 */
  avgExecutionTime: number;
  /** 最慢查询 */
  slowestQuery: SlowQuery | null;
  /** 最快查询 */
  fastestQuery: {
    query: string;
    executionTime: number;
  } | null;
  /** 缓存命中率 */
  cacheHitRate: number;
  /** 查询类型分布 */
  queryTypeDistribution: Record<string, number>;
}

// ============================================================================
// AI性能相关类型
// ============================================================================

/**
 * AI响应性能
 */
export interface AIPerformance extends PerformanceMetric {
  type: 'ai_call';
  /** 提示词长度 */
  promptLength: number;
  /** 响应长度 */
  responseLength: number;
  /** 使用的token数 */
  tokensUsed: number;
  /** AI模型 */
  model: string;
  /** 调用类型 */
  callType: 'formula' | 'chat' | 'data_processing' | 'mapping';
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
}

// ============================================================================
// 文档生成性能类型
// ============================================================================

/**
 * 文档生成性能
 */
export interface DocumentPerformance extends PerformanceMetric {
  type: 'document';
  /** 模板名称 */
  templateName: string;
  /** 数据行数 */
  dataRowCount: number;
  /** 生成文档数量 */
  documentCount: number;
  /** 生成方式 */
  method: 'single' | 'batch';
  /** 生成状态 */
  status: 'success' | 'partial' | 'failed';
  /** 生成时间（新增） */
  generationTime?: number;
}

// ============================================================================
// 资源使用类型
// ============================================================================

/**
 * 资源使用情况
 */
export interface ResourceUsage {
  /** 内存使用（字节） */
  memory: {
    used: number;
    total: number;
    limit: number;
    percentage: number;
  };
  /** CPU使用 */
  cpu: {
    percentage: number;
    cores: number;
  };
  /** 存储使用 */
  storage: {
    used: number;
    total: number;
    percentage: number;
  };
  /** 时间戳 */
  timestamp: number;
}

// ============================================================================
// 用户体验指标类型
// ============================================================================

/**
 * 用户体验事件
 */
export interface UXEvent {
  /** 事件类型 */
  eventType: 'click' | 'scroll' | 'input' | 'navigation' | 'load' | 'error';
  /** 事件目标 */
  target: string;
  /** 事件数据 */
  data?: Record<string, any>;
  /** 页面/组件 */
  page?: string;
  /** 用户ID（可选） */
  userId?: string;
}

/**
 * 用户体验指标
 */
export interface UXMetrics extends PerformanceMetric {
  type: 'ux';
  /** 页面加载时间 */
  pageLoadTime?: number;
  /** 首次内容绘制时间 */
  firstContentfulPaint?: number;
  /** 交互时间 */
  timeToInteractive?: number;
  /** 累积布局偏移 */
  cumulativeLayoutShift?: number;
  /** 首次输入延迟 */
  firstInputDelay?: number;
  /** 用户会话时长 */
  sessionDuration?: number;
  /** 错误数量 */
  errorCount?: number;
  /** 事件类型（新增） */
  eventType?: string;
  /** 事件目标（新增） */
  target?: string;
}

// ============================================================================
// 报告相关类型
// ============================================================================

/**
 * 时间范围
 */
export interface TimeRange {
  /** 开始时间 */
  from: number;
  /** 结束时间 */
  to: number;
}

/**
 * 性能报告
 */
export interface PerformanceReport {
  /** 报告ID */
  reportId: string;
  /** 报告时间范围 */
  timeRange: TimeRange;
  /** 生成时间 */
  generatedAt: number;
  /** 性能摘要 */
  summary: PerformanceSummary;
  /** 详细指标 */
  metrics: PerformanceMetric[];
  /** 性能评分 */
  score: PerformanceScore;
  /** 优化建议 */
  suggestions: OptimizationSuggestion[];
}

/**
 * 性能摘要
 */
export interface PerformanceSummary {
  /** 查询性能 */
  query: {
    totalQueries: number;
    avgResponseTime: number;
    slowQueryCount: number;
    cacheHitRate: number;
  };
  /** AI性能 */
  ai: {
    totalCalls: number;
    avgResponseTime: number;
    successRate: number;
    totalTokens: number;
  };
  /** 文档生成性能 */
  document: {
    totalGenerated: number;
    avgGenerationTime: number;
    successRate: number;
  };
  /** 资源使用 */
  resources: {
    avgMemoryUsage: number;
    peakMemoryUsage: number;
    avgCpuUsage: number;
  };
}

/**
 * 性能评分
 */
export interface PerformanceScore {
  /** 总体评分 (0-100) */
  overall: number;
  /** 查询评分 */
  query: number;
  /** AI评分 */
  ai: number;
  /** 文档生成评分 */
  document: number;
  /** 资源评分 */
  resources: number;
  /** 评分等级 */
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

// ============================================================================
// 告警相关类型
// ============================================================================

/**
 * 性能阈值
 */
export interface PerformanceThreshold {
  /** 指标名称 */
  metric: string;
  /** 阈值 */
  threshold: number;
  /** 操作符 */
  operator: '>' | '<' | '>=' | '<=' | '==';
  /** 持续时间（毫秒） */
  duration?: number;
  /** 严重程度 */
  severity: 'info' | 'warning' | 'error' | 'critical';
}

/**
 * 性能告警
 */
export interface PerformanceAlert {
  /** 告警ID */
  alertId: string;
  /** 触发时间 */
  timestamp: number;
  /** 阈值配置 */
  threshold: PerformanceThreshold;
  /** 当前值 */
  currentValue: number;
  /** 告警消息 */
  message: string;
  /** 是否已解决 */
  resolved: boolean;
  /** 解决时间 */
  resolvedAt?: number;
}

/**
 * 告警回调
 */
export type AlertCallback = (alert: PerformanceAlert) => void | Promise<void>;

// ============================================================================
// 实时指标类型
// ============================================================================

/**
 * 实时指标
 */
export interface RealTimeMetrics {
  /** 更新时间 */
  timestamp: number;
  /** 查询指标 */
  query: {
    avgResponseTime: number;
    queriesPerSecond: number;
    activeQueries: number;
  };
  /** AI指标 */
  ai: {
    avgResponseTime: number;
    callsPerMinute: number;
    successRate: number;
  };
  /** 文档生成指标 */
  document: {
    avgGenerationTime: number;
    documentsPerMinute: number;
    successRate: number;
  };
  /** 资源指标 */
  resources: {
    memoryUsage: number;
    cpuUsage: number;
    storageUsage: number;
  };
  /** 用户体验指标 */
  ux: {
    avgPageLoadTime: number;
    errorRate: number;
    activeSessions: number;
  };
}

// ============================================================================
// 趋势分析类型
// ============================================================================

/**
 * 趋势分析
 */
export interface TrendAnalysis {
  /** 指标名称 */
  metric: string;
  /** 时间范围 */
  timeRange: TimeRange;
  /** 数据点 */
  dataPoints: {
    timestamp: number;
    value: number;
  }[];
  /** 趋势方向 */
  trend: 'improving' | 'degrading' | 'stable';
  /** 变化率 */
  changeRate: number;
  /** 预测 */
  forecast?: {
    nextValue: number;
    confidence: number;
  };
}

// ============================================================================
// 性能基准类型
// ============================================================================

/**
 * 性能基准配置
 */
export interface PerformanceBenchmarks {
  /** 查询性能基准 */
  queries: {
    simple: BenchmarkThreshold;
    filter: BenchmarkThreshold;
    aggregate: BenchmarkThreshold;
    join: BenchmarkThreshold;
  };
  /** AI响应时间基准 */
  ai: {
    simple: BenchmarkThreshold;
    complex: BenchmarkThreshold;
  };
  /** 文档生成基准 */
  document: {
    single: BenchmarkThreshold;
    batch_10: BenchmarkThreshold;
    batch_100: BenchmarkThreshold;
  };
  /** 资源使用基准 */
  resources: {
    memory: BenchmarkThreshold;
    cpu: BenchmarkThreshold;
  };
}

/**
 * 基准阈值
 */
export interface BenchmarkThreshold {
  /** 目标值（优秀） */
  target: number;
  /** 警告值（一般） */
  warning: number;
  /** 错误值（差） */
  error: number;
}

// ============================================================================
// 优化建议类型
// ============================================================================

/**
 * 优化建议
 */
export interface OptimizationSuggestion {
  /** 建议ID */
  id: string;
  /** 建议类型 */
  type: 'query' | 'cache' | 'concurrency' | 'resource' | 'ai' | 'document';
  /** 优先级 */
  priority: 'high' | 'medium' | 'low';
  /** 标题 */
  title: string;
  /** 描述 */
  description: string;
  /** 预估改进 */
  estimatedImprovement: {
    metric: string;
    currentValue: number;
    expectedValue: number;
    improvementPercentage: number;
  };
  /** 实施步骤 */
  steps: string[];
  /** 相关指标 */
  relatedMetrics: string[];
}

/**
 * 性能瓶颈
 */
export interface Bottleneck {
  /** 瓶颈ID */
  id: string;
  /** 瓶颈类型 */
  type: string;
  /** 严重程度 */
  severity: 'high' | 'medium' | 'low';
  /** 影响的指标 */
  affectedMetrics: string[];
  /** 描述 */
  description: string;
  /** 影响范围 */
  impact: {
    metricName: string;
    degradation: number;
  }[];
}

// ============================================================================
// 对比报告类型
// ============================================================================

/**
 * 对比报告
 */
export interface ComparisonReport {
  /** 对比ID */
  comparisonId: string;
  /** 前置报告 */
  before: PerformanceReport;
  /** 后置报告 */
  after: PerformanceReport;
  /** 对比时间 */
  comparedAt: number;
  /** 改进情况 */
  improvements: {
    metric: string;
    beforeValue: number;
    afterValue: number;
    change: number;
    changePercentage: number;
    status: 'improved' | 'degraded' | 'unchanged';
  }[];
  /** 总体评估 */
  overallAssessment: string;
}

// ============================================================================
// 优化建议顾问类型
// ============================================================================

/**
 * 优化建议
 */
export interface OptimizationAdvice {
  /** 建议ID */
  id: string;
  /** 标题 */
  title: string;
  /** 描述 */
  description: string;
  /** 建议类型 */
  type: string;
  /** 优先级 */
  priority: 'high' | 'medium' | 'low';
  /** 预估效果 */
  estimatedImprovement: ImprovementEstimate;
  /** 实施复杂度 */
  complexity: 'easy' | 'medium' | 'hard';
  /** 实施时间估算 */
  estimatedTime: string;
  /** 相关代码位置 */
  codeLocations?: string[];
}

/**
 * 改进估算
 */
export interface ImprovementEstimate {
  /** 指标名称 */
  metric: string;
  /** 当前值 */
  current: number;
  /** 期望值 */
  expected: number;
  /** 改进百分比 */
  improvementPercentage: number;
  /** 置信度 */
  confidence: 'high' | 'medium' | 'low';
}
