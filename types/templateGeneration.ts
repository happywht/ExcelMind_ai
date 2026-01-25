/**
 * 多模板文档生成系统 - 核心类型定义
 *
 * 设计理念：
 * 1. 复用现有docxtemplaterService进行单个文档生成
 * 2. 支持批量模板管理和并发生成
 * 3. 实时进度追踪和WebSocket推送
 * 4. 完整的历史记录和任务管理
 *
 * @version 2.0.0
 * @module TemplateGeneration
 */

// ============================================================================
// 核心枚举类型
// ============================================================================

/**
 * 任务状态
 */
export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PARTIALLY_COMPLETED = 'partially_completed'
}

/**
 * 生成模式
 */
export enum GenerationMode {
  // 单模板多数据
  SINGLE_TEMPLATE = 'single_template',
  // 多模板单数据
  MULTI_TEMPLATE = 'multi_template',
  // 多模板多数据（笛卡尔积）
  CROSS_PRODUCT = 'cross_product'
}

/**
 * 模板状态
 */
export enum TemplateStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
  DELETED = 'deleted'
}

/**
 * 优先级
 */
export enum Priority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

// ============================================================================
// 模板管理类型
// ============================================================================

/**
 * 模板文件元数据
 */
export interface TemplateMetadata {
  id: string;
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  version: string;
  status: TemplateStatus;
  createdAt: number;
  updatedAt: number;
  fileSize: number;
  placeholderCount: number;
  complexity: 'simple' | 'complex';
  thumbnailUrl?: string;
}

/**
 * 模板配置
 */
export interface TemplateConfig {
  metadata: TemplateMetadata;
  fileBuffer: ArrayBuffer;
  placeholders: string[];
  defaultMappings?: Record<string, string>; // 默认字段映射
  validationRules?: ValidationRule[];
  sampleData?: Record<string, any>;
  previewHtml?: string;
}

/**
 * 模板映射配置
 */
export interface TemplateMappingConfig {
  templateId: string;
  mappings: FieldMapping[];
  filterCondition?: string; // 筛选条件JavaScript代码
  transformCode?: string; // 转换代码
  customConfig?: Record<string, any>;
}

/**
 * 字段映射
 */
export interface FieldMapping {
  placeholder: string; // 模板占位符，如 "{{产品名称}}"
  dataField: string; // 数据字段，如 "product_name"
  transform?: string; // 转换表达式
  required?: boolean;
  defaultValue?: any;
}

/**
 * 验证规则
 */
export interface ValidationRule {
  field: string;
  type: 'required' | 'pattern' | 'range' | 'custom';
  condition?: string; // JavaScript表达式
  errorMessage: string;
}

// ============================================================================
// 批量任务类型
// ============================================================================

/**
 * 批量生成任务
 */
export interface BatchGenerationTask {
  id: string;
  status: TaskStatus;
  mode: GenerationMode;
  priority: Priority;
  progress: number; // 0-100

  // 输入配置
  config: BatchTaskConfig;

  // 执行信息
  execution: TaskExecutionInfo;

  // 统计信息
  stats: TaskStatistics;

  // 时间信息
  timestamps: TaskTimestamps;

  // 错误信息（如果失败）
  error?: TaskError;
}

/**
 * 批量任务配置
 */
export interface BatchTaskConfig {
  // 模板选择
  templateIds: string[]; // 模板ID列表

  // 数据源配置
  dataSource: DataSourceConfig;

  // 生成参数
  parameters: GenerationParameters;

  // 输出配置
  output: OutputConfig;

  // 高级选项
  options?: BatchTaskOptions;
}

/**
 * 数据源配置
 */
export interface DataSourceConfig {
  type: 'excel' | 'csv' | 'json' | 'database' | 'api';
  source: {
    // 文件上传
    file?: {
      name: string;
      buffer: ArrayBuffer;
    };
    // 数据库连接
    connection?: {
      host: string;
      database: string;
      table: string;
      query?: string;
    };
    // API端点
    endpoint?: {
      url: string;
      headers?: Record<string, string>;
    };
    // 内联数据
    inline?: Array<Record<string, any>>;
  };
  // 数据筛选
  filter?: string; // JavaScript表达式
  // 数据排序
  sort?: {
    field: string;
    order: 'asc' | 'desc';
  };
  // 数据限制
  limit?: number;
  offset?: number;
}

/**
 * 生成参数
 */
export interface GenerationParameters {
  // 文件名模板
  fileNameTemplate?: string; // 如 "{{name}}_合同.docx"
  // 日期格式
  dateFormat?: string;
  // 数字格式
  numberFormat?: string;
  // 是否压缩输出
  compressOutput?: boolean;
  // 输出格式
  outputFormat?: 'docx' | 'pdf' | 'both';
}

/**
 * 输出配置
 */
export interface OutputConfig {
  // 输出方式
  type: 'download' | 'storage' | 'email' | 'webhook';
  // 下载配置
  download?: {
    fileName: string;
    zipFileName?: string; // 批量下载时的ZIP文件名
  };
  // 存储配置
  storage?: {
    provider: 'local' | 's3' | 'oss' | 'azure';
    path: string;
    credentials?: Record<string, string>;
  };
  // 邮件配置
  email?: {
    recipients: string[];
    subject: string;
    body: string;
  };
  // Webhook配置
  webhook?: {
    url: string;
    headers?: Record<string, string>;
  };
}

/**
 * 批量任务选项
 */
export interface BatchTaskOptions {
  // 并发控制
  concurrency?: number; // 并发生成数量，默认3
  // 批次大小
  batchSize?: number; // 每批处理数量，默认10
  // 失败处理
  continueOnError?: boolean; // 遇到错误是否继续，默认true
  // 重试次数
  retryCount?: number; // 失败重试次数，默认2
  // 重试延迟
  retryDelay?: number; // 重试延迟（毫秒），默认1000
  // 内存限制
  memoryLimit?: number; // 内存限制（MB），默认512
  // 超时时间
  timeout?: number; // 任务超时（秒），默认300
  // WebSocket通知
  enableWebSocket?: boolean; // 是否启用WebSocket推送，默认true
  // 进度回调间隔
  progressInterval?: number; // 进度推送间隔（毫秒），默认500
}

// ============================================================================
// 任务执行信息
// ============================================================================

/**
 * 任务执行信息
 */
export interface TaskExecutionInfo {
  // 总文档数
  totalDocuments: number;
  // 已完成文档数
  completedDocuments: number;
  // 失败文档数
  failedDocuments: number;
  // 跳过文档数
  skippedDocuments: number;
  // 当前批次
  currentBatch: number;
  // 总批次数
  totalBatches: number;
  // 当前处理的文档索引
  currentIndex: number;
  // 预计剩余时间（毫秒）
  estimatedTimeRemaining?: number;
  // 预计完成时间（时间戳）
  estimatedCompletionAt?: number;
  // 当前处理阶段
  currentStage: GenerationStage;
}

/**
 * 生成阶段
 */
export enum GenerationStage {
  INITIALIZING = 'initializing',
  LOADING_DATA = 'loading_data',
  VALIDATING_TEMPLATES = 'validating_templates',
  PREPARING_MAPPING = 'preparing_mapping',
  GENERATING_DOCUMENTS = 'generating_documents',
  COMPRESSING_OUTPUT = 'compressing_output',
  UPLOADING_RESULTS = 'uploading_results',
  FINALIZING = 'finalizing'
}

/**
 * 任务统计信息
 */
export interface TaskStatistics {
  // 开始时间
  startTime?: number;
  // 结束时间
  endTime?: number;
  // 总耗时（毫秒）
  duration?: number;
  // 平均每个文档耗时（毫秒）
  avgTimePerDocument?: number;
  // 成功率
  successRate?: number;
  // 总生成文件大小（字节）
  totalFileSize?: number;
  // 平均文件大小（字节）
  avgFileSize?: number;
  // 内存使用峰值（字节）
  peakMemoryUsage?: number;
  // CPU使用率
  cpuUsage?: number;
  // 生成速度（文档/分钟）
  generationSpeed?: number;
}

/**
 * 任务时间戳
 */
export interface TaskTimestamps {
  createdAt: number;
  startedAt?: number;
  pausedAt?: number;
  resumedAt?: number;
  completedAt?: number;
  cancelledAt?: number;
  failedAt?: number;
}

/**
 * 任务错误
 */
export interface TaskError {
  code: string;
  message: string;
  details?: any;
  stack?: string;
  failedAt?: number; // 失败时间
  retryable?: boolean;
}

// ============================================================================
// 文档生成结果
// ============================================================================

/**
 * 文档生成结果
 */
export interface DocumentGenerationResult {
  id: string;
  taskId: string;
  templateId: string;
  dataIndex: number;
  status: 'success' | 'failed' | 'skipped';

  // 输出
  output?: {
    blob: Blob;
    fileName: string;
    fileSize: number;
    url?: string; // 下载URL
  };

  // 输入数据
  inputData?: Record<string, any>;

  // 生成时间
  generatedAt?: number;
  duration?: number; // 生成耗时（毫秒）

  // 错误信息
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * 批量生成结果
 */
export interface BatchGenerationResult {
  taskId: string;
  status: TaskStatus;
  progress: number;

  // 结果统计
  stats: {
    total: number;
    successful: number;
    failed: number;
    skipped: number;
    duration: number;
  };

  // 生成的文档列表
  documents: DocumentGenerationResult[];

  // ZIP文件（如果打包）
  zipBlob?: Blob;
  zipUrl?: string;

  // 下载链接
  downloadUrls?: {
    individual?: string[]; // 单个文档下载链接
    zip?: string; // ZIP打包下载链接
  };
}

// ============================================================================
// 历史记录类型
// ============================================================================

/**
 * 历史记录条目
 */
export interface GenerationHistoryItem {
  id: string;
  taskId: string;
  status: TaskStatus;
  mode: GenerationMode;
  config: {
    templateIds: string[];
    templateNames: string[];
    dataSourceType: string;
    dataSourceName: string;
    totalDocuments: number;
  };
  stats: TaskStatistics;
  timestamps: TaskTimestamps;
  userId?: string;
  userName?: string;
}

/**
 * 历史记录查询参数
 */
export interface HistoryQueryParams {
  // 分页
  page?: number;
  limit?: number;
  // 筛选
  status?: TaskStatus;
  mode?: GenerationMode;
  templateId?: string;
  dateFrom?: number;
  dateTo?: number;
  userId?: string;
  // 排序
  sortBy?: 'createdAt' | 'startTime' | 'duration' | 'successRate';
  sortOrder?: 'asc' | 'desc';
  // 搜索
  search?: string;
}

/**
 * 历史记录列表响应
 */
export interface HistoryListResponse {
  items: GenerationHistoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    totalDocuments: number;
    avgSuccessRate: number;
  };
}

// ============================================================================
// 实时进度类型
// ============================================================================

/**
 * 进度更新事件
 */
export interface ProgressUpdateEvent {
  type: 'progress';
  taskId: string;
  progress: number; // 0-100
  stage: GenerationStage;
  message?: string;
  timestamp: number;
}

/**
 * 文档生成事件
 */
export interface DocumentGeneratedEvent {
  type: 'document_generated';
  taskId: string;
  documentId: string;
  templateId: string;
  dataIndex: number;
  status: 'success' | 'failed' | 'skipped';
  fileName?: string;
  timestamp: number;
}

/**
 * 任务状态变更事件
 */
export interface TaskStatusChangedEvent {
  type: 'status_changed';
  taskId: string;
  oldStatus: TaskStatus;
  newStatus: TaskStatus;
  timestamp: number;
  reason?: string;
}

/**
 * 错误事件
 */
export interface ErrorEvent {
  type: 'error';
  taskId: string;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: number;
  fatal?: boolean; // 是否致命错误（导致任务失败）
}

/**
 * 完成事件
 */
export interface TaskCompletedEvent {
  type: 'completed';
  taskId: string;
  status: TaskStatus;
  result: BatchGenerationResult;
  timestamp: number;
}

/**
 * WebSocket事件联合类型
 */
export type WebSocketEvent =
  | ProgressUpdateEvent
  | DocumentGeneratedEvent
  | TaskStatusChangedEvent
  | ErrorEvent
  | TaskCompletedEvent;

// ============================================================================
// API请求/响应类型
// ============================================================================

/**
 * 创建批量任务请求
 */
export interface CreateBatchTaskRequest {
  mode: GenerationMode;
  templateIds: string[];
  dataSource: DataSourceConfig;
  parameters?: GenerationParameters;
  output?: OutputConfig;
  options?: BatchTaskOptions;
  priority?: Priority;
  scheduledAt?: number; // 定时执行（时间戳）
}

/**
 * 创建批量任务响应
 */
export interface CreateBatchTaskResponse {
  taskId: string;
  status: TaskStatus;
  estimatedDuration?: number;
  estimatedCompletionAt?: number;
  message?: string;
}

/**
 * 任务状态响应
 */
export interface TaskStatusResponse {
  taskId: string;
  status: TaskStatus;
  progress: number;
  stage: GenerationStage;
  execution: TaskExecutionInfo;
  stats: Partial<TaskStatistics>;
  timestamps: TaskTimestamps;
  error?: TaskError;
}

/**
 * 暂停/恢复/取消任务响应
 */
export interface TaskControlResponse {
  taskId: string;
  status: TaskStatus;
  message: string;
}

// ============================================================================
// 模板管理API类型
// ============================================================================

/**
 * 上传模板请求
 */
export interface UploadTemplateRequest {
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  file: File | ArrayBuffer;
  version?: string;
}

/**
 * 上传模板响应
 */
export interface UploadTemplateResponse {
  templateId: string;
  metadata: TemplateMetadata;
  placeholders: string[];
  previewHtml?: string;
}

/**
 * 更新模板请求
 */
export interface UpdateTemplateRequest {
  templateId: string;
  updates: {
    name?: string;
    description?: string;
    category?: string;
    tags?: string[];
    status?: TemplateStatus;
    defaultMappings?: Record<string, string>;
    validationRules?: ValidationRule[];
  };
}

/**
 * 列出模板查询参数
 */
export interface ListTemplatesParams {
  page?: number;
  limit?: number;
  category?: string;
  tags?: string[];
  status?: TemplateStatus;
  search?: string;
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'placeholderCount';
  sortOrder?: 'asc' | 'desc';
}

/**
 * 列出模板响应
 */
export interface ListTemplatesResponse {
  templates: Array<{
    metadata: TemplateMetadata;
    placeholderCount: number;
    complexity: 'simple' | 'complex';
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  categories: string[];
  tags: string[];
}

// ============================================================================
// 辅助工具类型
// ============================================================================

/**
 * 任务队列项
 */
export interface TaskQueueItem {
  task: BatchGenerationTask;
  priority: Priority;
  scheduledAt?: number;
  estimatedDuration?: number;
  dependencies?: string[]; // 依赖的任务ID列表
}

/**
 * 系统状态
 */
export interface SystemStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  tasks: {
    running: number;
    pending: number;
    completed: number;
    failed: number;
  };
  resources: {
    cpu: number; // CPU使用率
    memory: number; // 内存使用率
    disk: number; // 磁盘使用率
  };
  queues: {
    size: number;
    avgWaitTime: number;
  };
}

/**
 * 健康检查响应
 */
export interface HealthCheckResponse {
  status: SystemStatus['status'];
  timestamp: number;
  version: string;
  uptime: number;
  services: {
    api: boolean;
    database: boolean;
    storage: boolean;
    cache: boolean;
  };
}
