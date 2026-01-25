/**
 * 数据质量增强模块 - 类型定义
 *
 * @module types/dataQuality
 * @version 1.0.0
 * @description 智能数据处理增强模块的完整类型定义
 */

// ============================================================================
// 数据质量报告类型
// ============================================================================

/**
 * 数据质量报告
 */
export interface DataQualityReport {
  /** 报告ID */
  reportId: string;
  /** 文件名 */
  fileName: string;
  /** Sheet名称 */
  sheetName: string;
  /** 总行数 */
  totalRows: number;
  /** 总列数 */
  totalColumns: number;
  /** 检测时间戳 */
  timestamp: number;
  /** 数据质量评分 (0-100) */
  qualityScore: number;
  /** 检测到的问题 */
  issues: DataQualityIssue[];
  /** 各列的统计信息 */
  columnStats: ColumnStatistics[];
  /** 数据样本 (用于AI分析) */
  dataSample?: any[];
}

// ============================================================================
// 数据质量问题类型
// ============================================================================

/**
 * 数据质量问题类型枚举
 */
export enum DataQualityIssueType {
  /** 缺失值 */
  MISSING_VALUE = 'missing_value',
  /** 异常值 */
  OUTLIER = 'outlier',
  /** 重复行 */
  DUPLICATE_ROW = 'duplicate_row',
  /** 格式不一致 */
  FORMAT_INCONSISTENCY = 'format_inconsistency',
  /** 无效类型 */
  INVALID_TYPE = 'invalid_type',
  /** 数据不一致 */
  DATA_INCONSISTENCY = 'data_inconsistency'
}

/**
 * 数据质量问题
 */
export interface DataQualityIssue {
  /** 问题ID */
  issueId: string;
  /** 问题类型 */
  issueType: DataQualityIssueType;
  /** 严重程度 */
  severity: IssueSeverity;
  /** 影响的列 */
  affectedColumns: string[];
  /** 影响的行索引 */
  affectedRows: number[];
  /** 问题描述 */
  description: string;
  /** 问题统计 */
  statistics: IssueStatistics;
  /** 建议的清洗策略 (预生成) */
  suggestedStrategies?: CleaningStrategy[];
}

/**
 * 问题严重程度
 */
export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low';

/**
 * 问题统计信息
 */
export interface IssueStatistics {
  /** 影响的行数 */
  affectedRowCount: number;
  /** 影响的百分比 (0-100) */
  affectedPercentage: number;
  /** 问题分布 */
  distribution: { [key: string]: number };
}

// ============================================================================
// 清洗建议类型
// ============================================================================

/**
 * 清洗建议
 */
export interface CleaningSuggestion {
  /** 建议ID */
  suggestionId: string;
  /** 关联的问题ID */
  issueId: string;
  /** 建议的策略 */
  strategy: CleaningStrategy;
  /** 优先级 (0-1, 越高越推荐) */
  priority: number;
  /** AI生成的推荐理由 */
  reasoning: string;
  /** 预期效果 */
  expectedImpact: ImpactAssessment;
  /** 风险等级 */
  riskLevel: RiskLevel;
  /** 执行估算 */
  executionEstimate: ExecutionEstimate;
}

/**
 * 清洗策略
 */
export interface CleaningStrategy {
  /** 策略ID */
  strategyId: string;
  /** 策略名称 */
  name: string;
  /** 策略类型 */
  type: StrategyType;
  /** 策略描述 */
  description: string;
  /** 策略参数 */
  parameters: StrategyParameters;
  /** 执行代码 (Python或JavaScript) */
  executionCode?: string;
}

/**
 * 策略类型枚举
 */
export enum StrategyType {
  /** 删除 */
  DELETE = 'delete',
  /** 填充 */
  FILL = 'fill',
  /** 替换 */
  REPLACE = 'replace',
  /** 标准化 */
  STANDARDIZE = 'standardize',
  /** 转换 */
  TRANSFORM = 'transform',
  /** 合并 */
  MERGE = 'merge',
  /** 拆分 */
  SPLIT = 'split'
}

/**
 * 策略参数
 */
export interface StrategyParameters {
  /** 目标列 */
  targetColumn: string;
  /** 操作类型 */
  operation: string;
  /** 参数值 */
  value?: any;
  /** 条件 */
  condition?: string;
  /** 选项 */
  options?: { [key: string]: any };
}

/**
 * 影响评估
 */
export interface ImpactAssessment {
  /** 数据保留率 (0-1) */
  dataRetentionRate: number;
  /** 质量改善度 (0-100) */
  qualityImprovement: number;
  /** 受影响的行数 */
  affectedRows: number;
  /** 副作用 */
  sideEffects?: string[];
}

/**
 * 风险等级
 */
export type RiskLevel = 'low' | 'medium' | 'high';

/**
 * 执行估算
 */
export interface ExecutionEstimate {
  /** 预估时间 (毫秒) */
  estimatedTime: number;
  /** 复杂度 */
  complexity: ComplexityLevel;
}

/**
 * 复杂度等级
 */
export type ComplexityLevel = 'simple' | 'moderate' | 'complex';

// ============================================================================
// 清洗历史类型
// ============================================================================

/**
 * 清洗历史记录
 */
export interface CleaningHistoryEntry {
  /** 操作ID */
  operationId: string;
  /** 时间戳 */
  timestamp: number;
  /** 文件名 */
  fileName: string;
  /** Sheet名称 */
  sheetName: string;
  /** 执行的策略 */
  strategy: CleaningStrategy;
  /** 执行前状态 */
  beforeState: DataSnapshot;
  /** 执行后状态 */
  afterState: DataSnapshot;
  /** 执行报告 */
  executionReport: ExecutionReport;
  /** 用户反馈 */
  userFeedback?: UserFeedback;
}

/**
 * 数据快照
 */
export interface DataSnapshot {
  /** 总行数 */
  totalRows: number;
  /** 质量评分 */
  qualityScore: number;
  /** 问题摘要 */
  issueSummary: IssueSummary;
}

/**
 * 问题摘要
 */
export interface IssueSummary {
  /** 严重问题数量 */
  critical: number;
  /** 高优先级问题数量 */
  high: number;
  /** 中等优先级问题数量 */
  medium: number;
  /** 低优先级问题数量 */
  low: number;
}

/**
 * 执行报告
 */
export interface ExecutionReport {
  /** 状态 */
  status: ExecutionStatus;
  /** 开始时间 */
  startTime: number;
  /** 结束时间 */
  endTime: number;
  /** 执行时长 (毫秒) */
  duration: number;
  /** 处理的行数 */
  processedRows: number;
  /** 成功处理的行数 */
  successRows: number;
  /** 失败的行数 */
  failedRows: number;
  /** 错误信息 */
  errors?: ExecutionError[];
  /** 警告信息 */
  warnings?: string[];
}

/**
 * 执行状态
 */
export type ExecutionStatus = 'success' | 'partial' | 'failed';

/**
 * 执行错误
 */
export interface ExecutionError {
  /** 行号 */
  row: number;
  /** 列名 */
  column?: string;
  /** 错误消息 */
  message: string;
  /** 错误类型 */
  errorType: string;
}

/**
 * 用户反馈
 */
export interface UserFeedback {
  /** 是否满意 */
  satisfied: boolean;
  /** 评分 (1-5) */
  rating?: number;
  /** 评论 */
  comments?: string;
}

// ============================================================================
// 列统计类型
// ============================================================================

/**
 * 列统计信息
 */
export interface ColumnStatistics {
  /** 列名 */
  columnName: string;
  /** 数据类型 */
  dataType: DataType;
  /** 空值数量 */
  nullCount: number;
  /** 唯一值数量 */
  uniqueCount: number;
  /** 最小值 (数值类型) */
  min?: number;
  /** 最大值 (数值类型) */
  max?: number;
  /** 平均值 (数值类型) */
  mean?: number;
  /** 中位数 (数值类型) */
  median?: number;
  /** 标准差 (数值类型) */
  stdDev?: number;
  /** 众数 (所有类型) */
  mode?: any;
  /** 样本值 */
  sampleValues?: any[];
  /** 数据分布 (直方图) */
  distribution?: DataDistribution[];
}

/**
 * 数据类型
 */
export type DataType = 'string' | 'number' | 'boolean' | 'date' | 'object' | 'unknown';

/**
 * 数据分布
 */
export interface DataDistribution {
  /** 值 */
  value: any;
  /** 计数 */
  count: number;
  /** 百分比 */
  percentage: number;
}

// ============================================================================
// 清洗结果类型
// ============================================================================

/**
 * 清洗结果
 */
export interface CleaningResult {
  /** 操作ID */
  operationId: string;
  /** 清洗后的数据 */
  cleanedData: any;
  /** 执行报告 */
  executionReport: ExecutionReport;
  /** 验证结果 (可选) */
  validationResult?: ValidationResult;
}

/**
 * 验证结果
 */
export interface ValidationResult {
  /** 是否通过验证 */
  valid: boolean;
  /** 验证分数 (0-100) */
  score: number;
  /** 验证详情 */
  details: ValidationDetail[];
}

/**
 * 验证详情
 */
export interface ValidationDetail {
  /** 验证项 */
  item: string;
  /** 是否通过 */
  passed: boolean;
  /** 分数 */
  score: number;
  /** 消息 */
  message?: string;
}

// ============================================================================
// 配置选项类型
// ============================================================================

/**
 * 分析选项
 */
export interface AnalysisOptions {
  /** 采样大小 */
  sampleSize?: number;
  /** 采样方法 */
  samplingMethod?: SamplingMethod;
  /** 是否检测缺失值 */
  detectMissing?: boolean;
  /** 是否检测异常值 */
  detectOutliers?: boolean;
  /** 是否检测重复行 */
  detectDuplicates?: boolean;
  /** 是否检测格式不一致 */
  detectFormat?: boolean;
  /** 自定义检测规则 */
  customRules?: CustomRule[];
  /** 异常值检测方法 */
  outlierMethod?: OutlierDetectionMethod;
  /** 异常值阈值 (IQR方法的倍数) */
  outlierThreshold?: number;
}

/**
 * 采样方法
 */
export type SamplingMethod = 'random' | 'systematic' | 'stratified';

/**
 * 自定义规则
 */
export interface CustomRule {
  /** 规则ID */
  ruleId: string;
  /** 规则名称 */
  name: string;
  /** 规则描述 */
  description: string;
  /** 规则函数 */
  rule: (row: any, index: number) => boolean;
  /** 严重程度 */
  severity: IssueSeverity;
}

/**
 * 异常值检测方法
 */
export type OutlierDetectionMethod = 'iqr' | 'zscore' | 'isolation_forest' | 'custom';

/**
 * 建议生成选项
 */
export interface SuggestionOptions {
  /** 每个问题最多建议数量 */
  maxSuggestions?: number;
  /** 是否考虑用户上下文 */
  considerUserContext?: boolean;
  /** 是否解释推理过程 */
  explainReasoning?: boolean;
  /** 是否生成执行代码 */
  generateCode?: boolean;
  /** 用户偏好 */
  userPreferences?: UserPreferences;
}

/**
 * 用户偏好
 */
export interface UserPreferences {
  /** 优先数据保留 */
  preferDataRetention?: boolean;
  /** 优先质量改善 */
  preferQualityImprovement?: boolean;
  /** 风险容忍度 */
  riskTolerance?: RiskLevel;
  /** 排除的策略类型 */
  excludedStrategies?: StrategyType[];
}

/**
 * 执行选项
 */
export interface ExecutionOptions {
  /** 是否在执行后验证 */
  validateAfterExecution?: boolean;
  /** 是否生成报告 */
  generateReport?: boolean;
  /** 是否保存到历史 */
  saveToHistory?: boolean;
  /** 遇到错误是否停止 */
  stopOnError?: boolean;
  /** 批次大小 */
  batchSize?: number;
}

/**
 * 历史筛选条件
 */
export interface HistoryFilters {
  /** 文件名 */
  fileName?: string;
  /** 开始时间戳 */
  startDate?: number;
  /** 结束时间戳 */
  endDate?: number;
  /** 策略类型 */
  strategyType?: StrategyType;
  /** 执行状态 */
  status?: ExecutionStatus;
  /** 限制数量 */
  limit?: number;
  /** 偏移量 */
  offset?: number;
}

// ============================================================================
// 统计类型
// ============================================================================

/**
 * 清洗统计信息
 */
export interface CleaningStatistics {
  /** 总操作数 */
  totalOperations: number;
  /** 平均质量改善 */
  averageQualityImprovement: number;
  /** 最常用的策略 */
  mostUsedStrategies: StrategyUsage[];
  /** 操作频率 */
  operationFrequency: OperationFrequency[];
  /** 用户满意度 */
  userSatisfaction?: number;
}

/**
 * 策略使用情况
 */
export interface StrategyUsage {
  /** 策略名称 */
  strategyName: string;
  /** 使用次数 */
  usageCount: number;
  /** 使用频率 */
  usageFrequency: number;
  /** 平均改善度 */
  averageImprovement: number;
}

/**
 * 操作频率
 */
export interface OperationFrequency {
  /** 日期 */
  date: string;
  /** 操作次数 */
  count: number;
}

// ============================================================================
// API请求/响应类型
// ============================================================================

/**
 * 分析请求
 */
export interface AnalyzeRequest {
  /** 文件数据 (Base64) */
  file: string;
  /** 文件名 */
  fileName: string;
  /** Sheet名称 (可选) */
  sheetName?: string;
  /** 分析选项 */
  options?: AnalysisOptions;
}

/**
 * 分析响应
 */
export interface AnalyzeResponse {
  /** 数据质量报告 */
  report: DataQualityReport;
}

/**
 * 生成建议请求
 */
export interface GenerateSuggestionsRequest {
  /** 报告ID */
  reportId: string;
  /** 建议选项 */
  options?: SuggestionOptions;
}

/**
 * 生成建议响应
 */
export interface GenerateSuggestionsResponse {
  /** 清洗建议列表 */
  suggestions: CleaningSuggestion[];
  /** 推荐的建议 */
  recommendation?: CleaningSuggestion;
}

/**
 * 执行清洗请求
 */
export interface ExecuteCleaningRequest {
  /** 文件数据 */
  fileData: {
    fileName: string;
    data: any[];
  };
  /** 策略列表 */
  strategies: CleaningStrategy[];
  /** 执行选项 */
  options?: ExecutionOptions;
}

/**
 * 执行清洗响应
 */
export interface ExecuteCleaningResponse {
  /** 操作ID */
  operationId: string;
  /** 清洗后的数据 */
  cleanedData: any[];
  /** 执行报告 */
  executionReport: ExecutionReport;
  /** 新的质量评分 */
  newQualityScore: number;
  /** 质量改善度 */
  qualityImprovement: number;
}

/**
 * 获取历史请求
 */
export interface GetHistoryRequest extends HistoryFilters {}

/**
 * 获取历史响应
 */
export interface GetHistoryResponse {
  /** 历史记录列表 */
  history: CleaningHistoryEntry[];
  /** 分页信息 */
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

/**
 * 撤销操作请求
 */
export interface UndoOperationRequest {
  /** 操作ID */
  operationId: string;
  /** 是否恢复到快照 */
  restoreToSnapshot?: boolean;
}

/**
 * 撤销操作响应
 */
export interface UndoOperationResponse {
  /** 操作ID */
  operationId: string;
  /** 是否撤销成功 */
  undone: boolean;
  /** 恢复的数据 */
  restoredData?: any[];
  /** 消息 */
  message: string;
}

// ============================================================================
// 错误类型
// ============================================================================

/**
 * 数据质量错误
 */
export class DataQualityError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'DataQualityError';
  }
}

/**
 * 检测错误
 */
export class DetectionError extends DataQualityError {
  constructor(message: string, details?: any) {
    super(message, 'DETECTION_ERROR', details);
    this.name = 'DetectionError';
  }
}

/**
 * 执行错误
 */
export class ExecutionError extends DataQualityError {
  constructor(message: string, details?: any) {
    super(message, 'EXECUTION_ERROR', details);
    this.name = 'ExecutionError';
  }
}

/**
 * 策略错误
 */
export class StrategyError extends DataQualityError {
  constructor(message: string, details?: any) {
    super(message, 'STRATEGY_ERROR', details);
    this.name = 'StrategyError';
  }
}

/**
 * 验证错误
 */
export class ValidationError extends DataQualityError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

// ============================================================================
// 工具类型
// ============================================================================

/**
 * 检测器接口
 */
export interface DataQualityDetector {
  /**
   * 检测数据质量问题
   * @param data Excel数据
   * @param options 分析选项
   * @returns 检测到的问题列表
   */
  detect(data: any, options?: AnalysisOptions): Promise<DataQualityIssue[]>;
}

/**
 * 策略库接口
 */
export interface StrategyLibrary {
  /**
   * 获取适用于特定问题的策略
   * @param issueType 问题类型
   * @returns 策略列表
   */
  getStrategiesForIssue(issueType: DataQualityIssueType): CleaningStrategy[];

  /**
   * 注册新策略
   * @param type 策略类型
   * @param strategy 策略定义
   */
  registerStrategy(type: StrategyType, strategy: CleaningStrategy): void;
}

/**
 * 存储服务接口
 */
export interface IStorageService {
  /**
   * 设置值
   */
  set(key: string, value: any): Promise<void>;

  /**
   * 获取值
   */
  get(key: string): Promise<any>;

  /**
   * 查询
   */
  query(collection: string, filters: any): Promise<any[]>;

  /**
   * 添加到集合
   */
  addToSet(setName: string, value: string): Promise<void>;
}

/**
 * 缓存服务接口
 */
export interface ICacheService {
  /**
   * 设置缓存
   */
  set(key: string, value: any, ttl?: number): Promise<void>;

  /**
   * 获取缓存
   */
  get(key: string): Promise<any>;

  /**
   * 删除缓存
   */
  delete(key: string): Promise<void>;

  /**
   * 清空缓存
   */
  clear(): Promise<void>;
}

/**
 * AI服务接口
 */
export interface IAIService {
  /**
   * 分析
   */
  analyze(prompt: string): Promise<string>;

  /**
   * 生成代码
   */
  generateCode(prompt: string): Promise<string>;
}

// ============================================================================
// 导出完成 - 所有接口已在定义时导出
// ============================================================================
