/**
 * Mapping Schema V2 - 智能文档填充系统核心数据结构
 *
 * 设计理念：
 * 1. 支持多阶段AI工作流 (分析 -> 规划 -> 生成 -> 验证)
 * 2. 可追溯性：每个阶段都有输入输出记录
 * 3. 可干预性：用户可以在任何阶段介入调整
 * 4. 可扩展性：支持多种数据源和文档格式
 */

// ============================================================================
// 基础类型定义
// ============================================================================

/**
 * 处理阶段枚举
 */
export enum ProcessingStage {
  // 初始化阶段
  INITIALIZATION = 'initialization',
  // 模板分析阶段
  TEMPLATE_ANALYSIS = 'template_analysis',
  // 数据分析阶段
  DATA_ANALYSIS = 'data_analysis',
  // 语义理解阶段
  SEMANTIC_ANALYSIS = 'semantic_analysis',
  // 映射规划阶段
  MAPPING_PLANNING = 'mapping_planning',
  // 转换生成阶段
  TRANSFORMATION_GENERATION = 'transformation_generation',
  // 文档生成阶段
  DOCUMENT_GENERATION = 'document_generation',
  // 验证阶段
  VALIDATION = 'validation',
  // 完成
  COMPLETED = 'completed'
}

/**
 * 执行状态
 */
export enum ExecutionStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  AWAITING_USER_INPUT = 'awaiting_user_input'
}

/**
 * 数据源类型
 */
export enum DataSourceType {
  EXCEL = 'excel',
  CSV = 'csv',
  JSON = 'json',
  DATABASE = 'database',
  API = 'api',
  CUSTOM = 'custom'
}

/**
 * 文档格式类型
 */
export enum DocumentFormat {
  DOCX = 'docx',
  PDF = 'pdf',
  HTML = 'html',
  TXT = 'txt',
  CUSTOM = 'custom'
}

/**
 * AI交互轮次
 */
export enum AIRound {
  // 第一轮：模板分析
  TEMPLATE_ANALYSIS = 'template_analysis',
  // 第二轮：数据分析
  DATA_ANALYSIS = 'data_analysis',
  // 第三轮：语义理解
  SEMANTIC_UNDERSTANDING = 'semantic_understanding',
  // 第四轮：映射规划
  MAPPING_PLANNING = 'mapping_planning',
  // 第五轮：转换生成
  TRANSFORMATION_GENERATION = 'transformation_generation',
  // 第六轮：验证优化
  VALIDATION_OPTIMIZATION = 'validation_optimization'
}

// ============================================================================
// 模板相关类型
// ============================================================================

/**
 * 模板占位符（增强版）
 */
export interface TemplatePlaceholder {
  id: string;
  name: string; // 占位符名称，如 "产品名称"
  rawPlaceholder: string; // 原始占位符，如 "{{产品名称}}"
  dataType: 'string' | 'number' | 'date' | 'boolean' | 'array' | 'object' | 'unknown';
  required: boolean;
  defaultValue?: any;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    enum?: any[];
  };
  context: {
    section?: string; // 所属章节
    paragraph?: string; // 所属段落
    position: number; // 在文档中的位置
    surroundingText?: string; // 周围文本（用于AI理解上下文）
  };
  semanticHints?: string[]; // 语义提示，AI可用于匹配
}

/**
 * 模板结构分析结果
 */
export interface TemplateStructure {
  format: DocumentFormat;
  fileName: string;
  fileSize: number;
  sections: TemplateSection[];
  placeholders: TemplatePlaceholder[];
  conditionalBlocks?: ConditionalBlock[];
  loops?: LoopBlock[];
  metadata: {
    createdAt: number;
    analyzedAt: number;
    version: string;
  };
}

/**
 * 模板章节
 */
export interface TemplateSection {
  id: string;
  title: string;
  level: number; // 标题级别
  startPosition: number;
  endPosition: number;
  content: string;
  placeholders: string[]; // 包含的占位符ID列表
}

/**
 * 条件块
 */
export interface ConditionalBlock {
  id: string;
  condition: string; // JavaScript表达式
  truePlaceholders: string[];
  falsePlaceholders?: string[];
}

/**
 * 循环块
 */
export interface LoopBlock {
  id: string;
  iterator: string; // 迭代变量名
  collection: string; // 集合变量名
  placeholders: string[];
}

// ============================================================================
// 数据源相关类型
// ============================================================================

/**
 * 数据源配置
 */
export interface DataSourceConfig {
  id: string;
  type: DataSourceType;
  name: string;
  connection: {
    type: 'file' | 'url' | 'database' | 'inline';
    source: string; // 文件路径、URL、连接字符串等
    options?: Record<string, any>;
  };
  schema: DataSchema;
  sampleData?: any[];
  metadata: {
    totalRows?: number;
    totalColumns?: number;
    lastModified?: number;
  };
}

/**
 * 数据结构
 */
export interface DataSchema {
  columns: ColumnDefinition[];
  relationships?: RelationshipDefinition[];
}

/**
 * 列定义
 */
export interface ColumnDefinition {
  name: string;
  dataType: 'string' | 'number' | 'date' | 'boolean' | 'array' | 'object';
  nullable: boolean;
  unique?: boolean;
  primaryKey?: boolean;
  foreignKey?: {
    table: string;
    column: string;
  };
  sampleValues: any[];
  semanticHints?: string[]; // 语义提示，如 "产品名称"、"客户地址"
}

/**
 * 关系定义
 */
export interface RelationshipDefinition {
  from: {
    table: string;
    column: string;
  };
  to: {
    table: string;
    column: string;
  };
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
}

// ============================================================================
// 映射相关类型
// ============================================================================

/**
 * 字段映射（增强版）
 */
export interface FieldMappingV2 {
  id: string;
  placeholder: TemplatePlaceholder;
  dataSource: {
    sourceId: string; // 数据源ID
    column: string; // 列名
    path?: string; // 嵌套路径，如 "address.city"
  };
  transform?: TransformConfig;
  validation?: ValidationConfig;
  fallback?: FallbackConfig;
  confidence: number; // AI匹配置信度 (0-1)
  metadata: {
    createdAt: number;
    createdBy: 'ai' | 'user' | 'system';
    aiReasoning?: string; // AI的推理过程
    userModified?: boolean;
  };
}

/**
 * 转换配置
 */
export interface TransformConfig {
  type: 'simple' | 'conditional' | 'custom' | 'ai_generated';
  code: string; // JavaScript代码
  description: string;
  dependencies?: string[]; // 依赖的其他字段
}

/**
 * 验证配置
 */
export interface ValidationConfig {
  rules: ValidationRule[];
  onError: 'skip' | 'use_default' | 'abort';
}

/**
 * 验证规则
 */
export interface ValidationRule {
  type: 'required' | 'pattern' | 'range' | 'custom';
  condition: string; // JavaScript表达式
  errorMessage: string;
}

/**
 * 降级配置
 */
export interface FallbackConfig {
  value?: any;
  source?: {
    sourceId: string;
    column: string;
  };
  strategy: 'use_default' | 'use_alternative' | 'leave_empty';
}

/**
 * 映射方案（V2版本）
 */
export interface MappingSchemeV2 {
  id: string;
  version: '2.0';
  createdAt: number;
  updatedAt: number;
  status: 'draft' | 'approved' | 'deprecated';

  // 映射关系
  mappings: FieldMappingV2[];

  // 未映射的占位符
  unmappedPlaceholders: TemplatePlaceholder[];

  // 筛选条件
  filterCondition?: FilterCondition;

  // 全局配置
  config: {
    errorHandling: 'strict' | 'lenient';
    nullHandling: 'skip' | 'empty_string' | 'default_value';
    dateFormat: string;
    numberFormat: string;
  };

  // AI分析结果
  aiAnalysis: {
    confidence: number; // 整体置信度
    reasoning: string; // AI的推理说明
    warnings: string[]; // 警告信息
    suggestions: string[]; // 改进建议
  };

  // 执行历史
  executionHistory?: ExecutionHistoryEntry[];
}

/**
 * 筛选条件
 */
export interface FilterCondition {
  type: 'simple' | 'complex' | 'ai_generated';
  expression: string; // JavaScript表达式
  description: string;
  aiGenerated: boolean;
}

// ============================================================================
// 执行相关类型
// ============================================================================

/**
 * 执行历史条目
 */
export interface ExecutionHistoryEntry {
  id: string;
  timestamp: number;
  stage: ProcessingStage;
  status: ExecutionStatus;
  input: any;
  output: any;
  duration: number; // 毫秒
  error?: ErrorInfo;
  metadata?: Record<string, any>;
}

/**
 * 错误信息
 */
export interface ErrorInfo {
  code: string;
  message: string;
  stack?: string;
  details?: any;
  retryable: boolean;
}

/**
 * 文档生成任务
 */
export interface DocumentGenerationTask {
  id: string;
  status: ExecutionStatus;
  progress: number; // 0-100
  currentStage: ProcessingStage;
  startedAt: number;
  completedAt?: number;
  error?: ErrorInfo;

  // 输入
  template: TemplateStructure;
  dataSources: DataSourceConfig[];
  userInstruction: string;

  // 输出
  mappingScheme?: MappingSchemeV2;
  generatedDocuments?: GeneratedDocumentInfo[];

  // AI交互轮次记录
  aiRounds: AIRoundRecord[];
}

/**
 * AI交互轮次记录
 */
export interface AIRoundRecord {
  round: AIRound;
  timestamp: number;
  duration: number;
  input: any;
  output: any;
  status: 'success' | 'failed' | 'retrying';
  retryCount?: number;
  error?: ErrorInfo;
  userIntervention?: {
    type: 'modification' | 'approval' | 'rejection';
    details: any;
  };
}

/**
 * 生成的文档信息
 */
export interface GeneratedDocumentInfo {
  id: string;
  fileName: string;
  format: DocumentFormat;
  blob?: Blob;
  url?: string; // 下载URL
  size: number;
  createdAt: number;
  sourceData: {
    sourceId: string;
    rowIndex: number;
    data: any;
  };
  validationResults?: ValidationResult[];
}

/**
 * 验证结果
 */
export interface ValidationResult {
  field: string;
  passed: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// API请求/响应类型
// ============================================================================

/**
 * 创建任务请求
 */
export interface CreateTaskRequest {
  templateFile: File | ArrayBuffer;
  dataFiles: Array<File | ArrayBuffer>;
  userInstruction: string;
  options?: {
    dataSources?: DataSourceConfig[];
    mappingScheme?: MappingSchemeV2;
    outputFormat?: DocumentFormat;
    batchSize?: number;
  };
}

/**
 * 创建任务响应
 */
export interface CreateTaskResponse {
  taskId: string;
  status: ExecutionStatus;
  estimatedDuration?: number;
  nextSteps: string[];
}

/**
 * 任务状态响应
 */
export interface TaskStatusResponse {
  taskId: string;
  status: ExecutionStatus;
  progress: number;
  currentStage: ProcessingStage;
  completedStages: ProcessingStage[];
  remainingStages: ProcessingStage[];
  error?: ErrorInfo;
  metadata: {
    startedAt: number;
    estimatedCompletionAt?: number;
    currentAIRound?: AIRound;
  };
}

/**
 * AI分析请求
 */
export interface AIAnalysisRequest {
  taskId: string;
  round: AIRound;
  context: AnalysisContext;
  options?: {
    useCache?: boolean;
    timeout?: number;
    maxRetries?: number;
  };
}

/**
 * 分析上下文
 */
export interface AnalysisContext {
  template: TemplateStructure;
  dataSources: DataSourceConfig[];
  userInstruction: string;
  previousResults?: Record<string, any>;
  userFeedback?: string;
}

/**
 * AI分析响应
 */
export interface AIAnalysisResponse {
  round: AIRound;
  result: any;
  confidence: number;
  reasoning: string;
  needsUserInput: boolean;
  userQuestions?: UserQuestion[];
  nextRound?: AIRound;
  metadata?: {
    tokensUsed?: number;
    model?: string;
    processingTime?: number;
    [key: string]: any;
  };
}

/**
 * 用户问题
 */
export interface UserQuestion {
  id: string;
  type: 'choice' | 'confirmation' | 'input' | 'mapping_review';
  question: string;
  options?: string[];
  default?: any;
  metadata?: any;
}

/**
 * 用户反馈请求
 */
export interface UserFeedbackRequest {
  taskId: string;
  round: AIRound;
  feedback: {
    approved: boolean;
    modifications?: any;
    answers?: Record<string, any>;
  };
}

/**
 * 用户反馈响应
 */
export interface UserFeedbackResponse {
  received: boolean;
  nextRound?: AIRound;
  updatedTask?: DocumentGenerationTask;
}

// ============================================================================
// 缓存相关类型
// ============================================================================

/**
 * 缓存键
 */
export interface CacheKey {
  type: 'template_analysis' | 'data_analysis' | 'mapping' | 'ai_response';
  hash: string; // 内容哈希
  version: string;
}

/**
 * 缓存条目
 */
export interface CacheEntry<T = any> {
  key: CacheKey;
  value: T;
  createdAt: number;
  expiresAt: number;
  hitCount: number;
  metadata: {
    size: number;
    tags: string[];
    source: string;
  };
}

// ============================================================================
// 配置类型
// ============================================================================

/**
 * AI服务配置
 */
export interface AIServiceConfig {
  provider: 'zhipu' | 'openai' | 'anthropic' | 'custom';
  model: string;
  apiKey: string;
  baseURL?: string;
  options: {
    maxTokens: number;
    temperature: number;
    timeout: number;
    maxRetries: number;
    retryDelay: number;
  };
}

/**
 * 系统配置
 */
export interface SystemConfig {
  ai: AIServiceConfig;
  cache: {
    enabled: boolean;
    maxSize: number;
    ttl: number;
    strategy: 'lru' | 'fifo' | 'lfu';
  };
  execution: {
    maxConcurrentTasks: number;
    taskTimeout: number;
    cleanupInterval: number;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enableMetrics: boolean;
  };
}
