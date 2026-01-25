/**
 * Phase 2 API 类型定义
 *
 * 这个文件定义了 Phase 2 API 接口的所有类型
 * 基于 API_SPECIFICATION_PHASE2.md 文档
 */

// ============================================================================
// 通用类型
// ============================================================================

/**
 * API 成功响应
 */
export interface ApiResponseSuccess<T = any> {
  success: true;
  data: T;
  meta?: ApiResponseMeta;
}

/**
 * API 错误响应
 */
export interface ApiErrorResponse {
  success: false;
  error: ApiError;
  meta?: ApiResponseMeta;
}

/**
 * API 响应元数据
 */
export interface ApiResponseMeta {
  requestId: string;
  timestamp: string;
  version?: string;
  executionTime?: number;
}

/**
 * API 错误详情
 */
export interface ApiError {
  code: string;
  message: string;
  details?: ErrorDetail[];
  requestId: string;
  timestamp: string;
  helpUrl?: string;
}

/**
 * 错误详情项
 */
export interface ErrorDetail {
  field?: string;
  message: string;
  line?: number;
  column?: number;
}

/**
 * 分页信息
 */
export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * 分页响应数据
 */
export interface PaginatedResponse<T> {
  items: T[];
  pagination: Pagination;
}

/**
 * 通用查询参数
 */
export interface QueryParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

// ============================================================================
// 智能数据处理模块类型
// ============================================================================

/**
 * 数据质量分析请求
 */
export interface DataQualityAnalyzeRequest {
  fileId: string;
  sheetName: string;
  options?: DataQualityAnalyzeOptions;
}

/**
 * 数据质量分析选项
 */
export interface DataQualityAnalyzeOptions {
  checkMissingValues?: boolean;
  checkDuplicates?: boolean;
  checkFormats?: boolean;
  checkOutliers?: boolean;
  sampleSize?: number;
}

/**
 * 数据质量分析响应
 */
export interface DataQualityAnalysis {
  analysisId: string;
  fileId: string;
  sheetName: string;
  summary: DataQualitySummary;
  issues: DataQualityIssue[];
  statistics: DataQualityStatistics;
  recommendations: string[];
}

/**
 * 数据质量摘要
 */
export interface DataQualitySummary {
  totalRows: number;
  totalColumns: number;
  completeness: number;
  qualityScore: number;
}

/**
 * 数据质量问题
 */
export interface DataQualityIssue {
  id: string;
  type: DataQualityIssueType;
  severity: 'high' | 'medium' | 'low';
  location: DataQualityIssueLocation;
  description: string;
  impact: string;
  affectedPercentage?: number;
}

/**
 * 数据质量问题类型
 */
export type DataQualityIssueType =
  | 'missing_value'
  | 'duplicate'
  | 'inconsistent_format'
  | 'outlier';

/**
 * 数据质量问题位置
 */
export interface DataQualityIssueLocation {
  column?: string;
  affectedRows?: number[];
  rows?: number[];
  columns?: string[];
  value?: any;
}

/**
 * 数据质量统计
 */
export interface DataQualityStatistics {
  missingValues: {
    total: number;
    byColumn: Record<string, number>;
  };
  duplicates: {
    total: number;
    duplicateSets: number;
  };
  formatIssues: {
    total: number;
    byType: Record<string, number>;
  };
  outliers: {
    total: number;
    byColumn: Record<string, number>;
  };
}

/**
 * 获取清洗建议请求
 */
export interface DataQualitySuggestionsRequest {
  analysisId: string;
  options?: DataQualitySuggestionsOptions;
}

/**
 * 清洗建议选项
 */
export interface DataQualitySuggestionsOptions {
  includeAutoFix?: boolean;
  priority?: 'high' | 'medium' | 'low' | 'all';
}

/**
 * 清洗建议响应
 */
export interface DataQualitySuggestions {
  analysisId: string;
  suggestions: CleaningSuggestion[];
  totalSuggestions: number;
  canAutoFixCount: number;
  estimatedTotalTime: number;
}

/**
 * 清洗建议
 */
export interface CleaningSuggestion {
  id: string;
  issueId: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  estimatedTime: number;
  canAutoFix: boolean;
  steps: string[];
  autoFixCode?: string;
  preview?: CleaningPreview;
  manualAction?: ManualAction;
}

/**
 * 清洗预览
 */
export interface CleaningPreview {
  affectedRows: number;
  afterFixRows?: number;
  examples?: Array<{
    original: any;
    converted: any;
  }>;
}

/**
 * 手动操作
 */
export interface ManualAction {
  type: 'lookup' | 'verify' | 'fill';
  source?: string;
  mapping?: string;
  rowId?: number;
  field?: string;
  suggestedValues?: any[];
}

/**
 * 执行数据清洗请求
 */
export interface DataQualityCleanRequest {
  analysisId: string;
  suggestions: CleaningAction[];
  options?: DataQualityCleanOptions;
}

/**
 * 清洗操作
 */
export interface CleaningAction {
  suggestionId: string;
  action: 'auto_fix' | 'manual' | 'skip';
  manualValue?: any;
}

/**
 * 数据清洗选项
 */
export interface DataQualityCleanOptions {
  createBackup?: boolean;
  validateAfterClean?: boolean;
}

/**
 * 数据清洗响应
 */
export interface DataQualityCleanResult {
  cleanId: string;
  analysisId: string;
  status: 'completed' | 'partial' | 'failed';
  results: CleaningActionResult[];
  summary: CleaningSummary;
  backupFile?: BackupFileInfo;
}

/**
 * 清洗操作结果
 */
export interface CleaningActionResult {
  suggestionId: string;
  status: 'success' | 'skipped' | 'failed';
  affectedRows?: number;
  message: string;
}

/**
 * 清洗摘要
 */
export interface CleaningSummary {
  totalProcessed: number;
  successful: number;
  skipped: number;
  failed: number;
  finalQualityScore: number;
  qualityImprovement: number;
}

/**
 * 备份文件信息
 */
export interface BackupFileInfo {
  fileId: string;
  fileName: string;
  expiresAt: string;
}

/**
 * 转换规则创建请求
 */
export interface TransformRuleCreateRequest {
  name: string;
  description: string;
  category: TransformRuleCategory;
  input: TransformRuleInput;
  transformation: TransformRuleTransformation;
  output: TransformRuleOutput;
}

/**
 * 转换规则类别
 */
export type TransformRuleCategory =
  | 'format_standardization'
  | 'data_validation'
  | 'data_enrichment'
  | 'calculation';

/**
 * 转换规则输入
 */
export interface TransformRuleInput {
  columnType?: string;
  formats?: string[];
  validation?: string;
}

/**
 * 转换规则转换
 */
export interface TransformRuleTransformation {
  type: 'regex_replace' | 'formula' | 'lookup' | 'custom';
  pattern?: string;
  replacement?: string;
  formula?: string;
  code?: string;
}

/**
 * 转换规则输出
 */
export interface TransformRuleOutput {
  format: string;
  dataType: string;
}

/**
 * 转换规则响应
 */
export interface TransformRule {
  ruleId: string;
  name: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

/**
 * 应用转换规则请求
 */
export interface ApplyTransformRulesRequest {
  fileId: string;
  sheetName: string;
  rules: TransformRuleApplication[];
}

/**
 * 转换规则应用
 */
export interface TransformRuleApplication {
  ruleId: string;
  targetColumn: string;
}

/**
 * 应用转换规则响应
 */
export interface ApplyTransformRulesResult {
  transformId: string;
  status: 'completed' | 'partial' | 'failed';
  results: TransformRuleResult[];
}

/**
 * 转换规则结果
 */
export interface TransformRuleResult {
  ruleId: string;
  targetColumn: string;
  status: 'success' | 'partial' | 'failed';
  affectedRows: number;
  skippedRows: number;
  failedRows: number;
}

// ============================================================================
// 多模板文档生成模块类型
// ============================================================================

/**
 * 模板上传请求
 */
export interface TemplateUploadRequest {
  file: File;
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  mappings?: TemplateMappings;
}

/**
 * 模板映射配置
 */
export interface TemplateMappings {
  placeholders: TemplatePlaceholder[];
}

/**
 * 模板占位符
 */
export interface TemplatePlaceholder {
  key: string;
  column: string;
  required: boolean;
  dataType?: string;
  format?: string;
}

/**
 * 模板响应
 */
export interface Template {
  templateId: string;
  name: string;
  status: 'active' | 'inactive';
  file: TemplateFileInfo;
  metadata: TemplateMetadata;
  defaultMappings?: MappingSchemeV2;
  usageStats?: TemplateUsageStats;
  createdAt: string;
  updatedAt: string;
  category?: string;
  tags?: string[];
  description?: string;
}

/**
 * 模板文件信息
 */
export interface TemplateFileInfo {
  fileName: string;
  fileSize: number;
  uploadTime: string;
  downloadUrl?: string;
}

/**
 * 模板元数据
 */
export interface TemplateMetadata {
  placeholders: TemplatePlaceholderInfo[];
  hasLoops: boolean;
  hasConditionals: boolean;
  hasTables: boolean;
  pageCount: number;
  wordCount?: number;
}

/**
 * 模板占位符信息
 */
export interface TemplatePlaceholderInfo {
  key: string;
  rawPlaceholder: string;
  dataType: string;
  required: boolean;
  format?: string;
  context?: {
    section: string;
    position: number;
  };
}

/**
 * 模板使用统计
 */
export interface TemplateUsageStats {
  totalGenerations: number;
  lastUsed: string;
  successRate: number;
}

/**
 * 映射方案 V2
 */
export interface MappingSchemeV2 {
  explanation: string;
  reasoning?: string;
  filterCondition: string | null;
  primarySheet: string;
  mappings: FieldMappingV2[];
  crossSheetMappings?: CrossSheetMapping[];
  unmappedPlaceholders: string[];
  allSheetsInfo?: SheetInfo[];
  confidence?: number;
}

/**
 * 字段映射 V2
 */
export interface FieldMappingV2 {
  placeholder: string;
  excelColumn: string;
  confidence: number;
  transform?: string;
}

/**
 * 跨Sheet映射
 */
export interface CrossSheetMapping {
  placeholder: string;
  sourceSheet: string;
  sourceColumn: string;
  lookupKey: string;
  relationshipType?: 'oneToOne' | 'manyToOne';
  transform?: string;
}

/**
 * Sheet信息
 */
export interface SheetInfo {
  sheetName: string;
  headers: string[];
  rowCount: number;
  sampleData: Record<string, any>[];
}

/**
 * 批量生成请求
 */
export interface BatchGenerationRequest {
  dataSourceId: string;
  templateIds: string[];
  outputFormat: 'docx' | 'pdf';
  options?: BatchGenerationOptions;
  filters?: BatchGenerationFilters;
  notification?: NotificationConfig;
}

/**
 * 批量生成选项
 */
export interface BatchGenerationOptions {
  batchSize?: number;
  parallelProcessing?: boolean;
  createZip?: boolean;
  zipFileName?: string;
}

/**
 * 批量生成过滤器
 */
export interface BatchGenerationFilters {
  condition?: string;
  limit?: number;
}

/**
 * 通知配置
 */
export interface NotificationConfig {
  webhook?: string;
  email?: string;
}

/**
 * 批量生成响应
 */
export interface BatchGenerationResponse {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  estimatedTime: number;
  estimatedDocumentCount: number;
  items: BatchGenerationItem[];
  websocketUrl?: string;
}

/**
 * 批量生成项
 */
export interface BatchGenerationItem {
  templateId: string;
  templateName: string;
  estimatedCount: number;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  completedCount?: number;
  totalCount?: number;
  failedCount?: number;
  downloads?: GenerationDownloadUrls;
}

/**
 * 生成下载URL
 */
export interface GenerationDownloadUrls {
  completedUrl?: string;
  zipUrl?: string;
}

/**
 * 生成状态响应
 */
export interface GenerationStatus {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  currentStep: string;
  startedAt: string;
  estimatedEndTime?: string;
  items: BatchGenerationItem[];
  summary: GenerationSummary;
}

/**
 * 生成摘要
 */
export interface GenerationSummary {
  totalDocuments: number;
  completedDocuments: number;
  failedDocuments: number;
  pendingDocuments: number;
}

// ============================================================================
// 审计规则引擎模块类型
// ============================================================================

/**
 * 审计规则创建请求
 */
export interface AuditRuleCreateRequest {
  name: string;
  description: string;
  category: AuditRuleCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  conditions: AuditRuleConditions;
  actions: AuditRuleAction[];
  schedule?: AuditRuleSchedule;
}

/**
 * 审计规则类别
 */
export type AuditRuleCategory =
  | 'data_quality'
  | 'data_validation'
  | 'business_rule'
  | 'security'
  | 'compliance';

/**
 * 审计规则条件
 */
export interface AuditRuleConditions {
  type: 'field_validation' | 'row_validation' | 'custom';
  field?: string;
  validation?: string;
  expression?: string;
}

/**
 * 审计规则动作
 */
export interface AuditRuleAction {
  type: 'alert' | 'block' | 'log' | 'notify';
  message?: string;
  reason?: string;
  recipients?: string[];
}

/**
 * 审计规则调度
 */
export interface AuditRuleSchedule {
  frequency: 'on_data_change' | 'hourly' | 'daily' | 'weekly';
  time?: string;
}

/**
 * 审计规则响应
 */
export interface AuditRule {
  ruleId: string;
  name: string;
  category: AuditRuleCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  description: string;
  lastTriggered?: string;
  triggerCount?: number;
}

/**
 * 执行审计请求
 */
export interface AuditExecuteRequest {
  fileId: string;
  sheetName: string;
  rules?: string[];
  options?: AuditExecuteOptions;
}

/**
 * 执行审计选项
 */
export interface AuditExecuteOptions {
  stopOnFirstError?: boolean;
  generateReport?: boolean;
}

/**
 * 审计执行响应
 */
export interface AuditExecutionResult {
  auditId: string;
  status: 'completed' | 'partial' | 'failed';
  startedAt: string;
  completedAt: string;
  results: AuditRuleResult[];
  summary: AuditSummary;
  reportUrl?: string;
}

/**
 * 审计规则结果
 */
export interface AuditRuleResult {
  ruleId: string;
  ruleName: string;
  status: 'passed' | 'failed';
  checkedRows: number;
  violations: AuditViolation[];
  message: string;
}

/**
 * 审计违规
 */
export interface AuditViolation {
  row: number;
  field?: string;
  value: any;
  expected?: string;
  message: string;
}

/**
 * 审计摘要
 */
export interface AuditSummary {
  totalRules: number;
  passed: number;
  failed: number;
  skipped: number;
  totalViolations: number;
  overallStatus: 'passed' | 'failed';
}

/**
 * 审计报告
 */
export interface AuditReport {
  auditId: string;
  reportType: 'summary' | 'detailed';
  generatedAt: string;
  summary: AuditSummary;
  details: AuditReportDetail[];
  charts?: AuditReportCharts;
  downloadUrls: AuditReportDownloadUrls;
}

/**
 * 审计报告详情
 */
export interface AuditReportDetail {
  ruleId: string;
  ruleName: string;
  status: 'passed' | 'failed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  checkedItems: number;
  violations: AuditViolation[];
  recommendations: string[];
}

/**
 * 审计报告图表
 */
export interface AuditReportCharts {
  violationsByRule: Record<string, number>;
  violationsBySeverity: Record<string, number>;
}

/**
 * 审计报告下载URL
 */
export interface AuditReportDownloadUrls {
  pdf?: string;
  excel?: string;
  json?: string;
}

// ============================================================================
// 性能监控模块类型
// ============================================================================

/**
 * 性能指标请求
 */
export interface PerformanceMetricsRequest {
  timeRange: '1h' | '6h' | '24h' | '7d' | '30d';
  metricType?: PerformanceMetricType;
}

/**
 * 性能指标类型
 */
export type PerformanceMetricType =
  | 'query_performance'
  | 'ai_performance'
  | 'document_performance'
  | 'resource_usage';

/**
 * 性能指标响应
 */
export interface PerformanceMetrics {
  timeRange: string;
  metrics: PerformanceMetricsData;
  trends?: PerformanceTrends;
}

/**
 * 性能指标数据
 */
export interface PerformanceMetricsData {
  queryPerformance?: QueryPerformanceMetrics;
  aiPerformance?: AIPerformanceMetrics;
  documentPerformance?: DocumentPerformanceMetrics;
  resourceUsage?: ResourceUsageMetrics;
}

/**
 * 查询性能指标
 */
export interface QueryPerformanceMetrics {
  totalQueries: number;
  avgResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  slowQueries: number;
  successRate: number;
}

/**
 * AI性能指标
 */
export interface AIPerformanceMetrics {
  totalCalls: number;
  avgResponseTime: number;
  totalTokens: number;
  avgTokensPerCall: number;
  cacheHitRate: number;
}

/**
 * 文档性能指标
 */
export interface DocumentPerformanceMetrics {
  totalGenerated: number;
  avgGenerationTime: number;
  successRate: number;
  avgDocumentSize: number;
}

/**
 * 资源使用指标
 */
export interface ResourceUsageMetrics {
  cpuPercent: number;
  memoryMB: number;
  diskUsagePercent: number;
}

/**
 * 性能趋势
 */
export interface PerformanceTrends {
  queryResponseTime?: PerformanceDataPoint[];
  aiResponseTime?: PerformanceDataPoint[];
  documentGenerationTime?: PerformanceDataPoint[];
}

/**
 * 性能数据点
 */
export interface PerformanceDataPoint {
  timestamp: string;
  value: number;
}

/**
 * 性能报告
 */
export interface PerformanceReport {
  reportId: string;
  period: {
    start: string;
    end: string;
  };
  summary: PerformanceReportSummary;
  categories: PerformanceReportCategory[];
  alerts: PerformanceAlert[];
  downloadUrls: {
    pdf?: string;
    json?: string;
  };
}

/**
 * 性能报告摘要
 */
export interface PerformanceReportSummary {
  overallHealth: 'excellent' | 'good' | 'fair' | 'poor';
  score: number;
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
}

/**
 * 性能报告类别
 */
export interface PerformanceReportCategory {
  category: PerformanceMetricType;
  score: number;
  status: 'excellent' | 'good' | 'fair' | 'poor';
  metrics: Record<string, any>;
  recommendations: string[];
}

/**
 * 性能告警
 */
export interface PerformanceAlert {
  severity: 'info' | 'warning' | 'error';
  message: string;
  affectedQueries?: string[];
}

/**
 * 性能告警规则创建请求
 */
export interface PerformanceAlertCreateRequest {
  name: string;
  description: string;
  enabled: boolean;
  condition: AlertCondition;
  actions: AlertAction[];
}

/**
 * 告警条件
 */
export interface AlertCondition {
  metric: string;
  operator: '>' | '<' | '=' | '>=' | '<=';
  threshold: number;
}

/**
 * 告警动作
 */
export interface AlertAction {
  type: 'email' | 'webhook';
  recipients?: string[];
  url?: string;
}

/**
 * 性能告警规则
 */
export interface PerformanceAlertRule {
  alertId: string;
  name: string;
  enabled: boolean;
  condition: AlertCondition;
  triggerCount?: number;
  lastTriggered?: string;
}

// ============================================================================
// 质量控制模块类型
// ============================================================================

/**
 * SQL验证请求
 */
export interface SQLValidationRequest {
  sql: string;
  schema: DatabaseSchema;
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

/**
 * SQL验证响应
 */
export interface SQLValidationResult {
  validationId: string;
  isValid: boolean;
  syntax: {
    valid: boolean;
    errors: SyntaxError[];
  };
  identifiers: {
    tables: IdentifierValidation;
    columns: IdentifierValidation;
  };
  complexity: ComplexityValidation;
  recommendations: string[];
}

/**
 * 语法错误
 */
export interface SyntaxError {
  message: string;
  line?: number;
  column?: number;
}

/**
 * 标识符验证
 */
export interface IdentifierValidation {
  checked: string[];
  missing: string[];
  valid: boolean;
}

/**
 * 复杂度验证
 */
export interface ComplexityValidation {
  score: number;
  level: 'simple' | 'medium' | 'complex';
  factors: ComplexityFactor[];
}

/**
 * 复杂度因子
 */
export interface ComplexityFactor {
  type: string;
  score: number;
  description: string;
}

/**
 * 幻觉检测请求
 */
export interface HallucinationDetectionRequest {
  aiResponse: string;
  sourceData: any;
  context: {
    query: string;
    dataSource: string;
  };
}

/**
 * 幻觉检测响应
 */
export interface HallucinationDetectionResult {
  detectionId: string;
  hasHallucination: boolean;
  confidence: number;
  details: HallucinationDetail[];
  summary: string;
}

/**
 * 幻觉详情
 */
export interface HallucinationDetail {
  claim: string;
  verified: boolean;
  sourceValue: any;
  match: boolean;
}

/**
 * 修复建议请求
 */
export interface FixSuggestionsRequest {
  error: {
    code: string;
    message: string;
    context: any;
  };
}

/**
 * 修复建议响应
 */
export interface FixSuggestionsResponse {
  suggestions: FixSuggestion[];
}

/**
 * 修复建议
 */
export interface FixSuggestion {
  id: string;
  type: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  canAutoFix: boolean;
  suggested?: string;
  autoFixCode?: string;
  confidence?: number;
  reasoning?: string;
}

/**
 * 质量门禁创建请求
 */
export interface QualityGateCreateRequest {
  name: string;
  description: string;
  enabled: boolean;
  criteria: QualityGateCriteria[];
  actions: QualityGateActions;
}

/**
 * 质量门禁条件
 */
export interface QualityGateCriteria {
  type: string;
  required: boolean;
  threshold?: number;
  severity: 'error' | 'warning';
}

/**
 * 质量门禁动作
 */
export interface QualityGateActions {
  onPass: string[];
  onFail: string[];
}

/**
 * 质量门禁
 */
export interface QualityGate {
  gateId: string;
  name: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

/**
 * 质量门禁检查请求
 */
export interface QualityGateCheckRequest {
  content: {
    sql?: string;
    context?: any;
  };
}

/**
 * 质量门禁检查响应
 */
export interface QualityGateCheckResult {
  gateId: string;
  passed: boolean;
  overallScore: number;
  checkedAt: string;
  results: QualityGateCheckResultItem[];
  recommendations: string[];
}

/**
 * 质量门禁检查结果项
 */
export interface QualityGateCheckResultItem {
  criteria: string;
  passed: boolean;
  score: number;
  message: string;
  severity: 'error' | 'warning';
}

// ============================================================================
// WebSocket 消息类型
// ============================================================================

/**
 * WebSocket 消息基类
 */
export interface WebSocketMessage {
  type: string;
  timestamp: string;
}

/**
 * 任务进度消息
 */
export interface TaskProgressMessage extends WebSocketMessage {
  type: 'task_progress';
  taskId: string;
  data: {
    progress: number;
    currentStep: string;
    completedSteps: number;
    totalSteps: number;
    estimatedTimeRemaining: number;
    currentItem?: {
      templateName: string;
      documentIndex: number;
      totalDocuments: number;
    };
  };
}

/**
 * 生成状态消息
 */
export interface GenerationStatusMessage extends WebSocketMessage {
  type: 'generation_status';
  taskId: string;
  data: {
    templateId: string;
    templateName: string;
    status: 'completed' | 'failed';
    completedCount: number;
    totalCount: number;
    failedCount: number;
    downloadUrl?: string;
  };
}

/**
 * 审计告警消息
 */
export interface AuditAlertMessage extends WebSocketMessage {
  type: 'audit_alert';
  severity: 'high' | 'medium' | 'low';
  data: {
    auditId: string;
    ruleId: string;
    ruleName: string;
    message: string;
    violations: AuditViolation[];
  };
}

/**
 * 性能告警消息
 */
export interface PerformanceAlertMessage extends WebSocketMessage {
  type: 'performance_alert';
  severity: 'info' | 'warning' | 'error';
  data: {
    alertId: string;
    metric: string;
    currentValue: number;
    threshold: number;
    message: string;
  };
}

/**
 * WebSocket 订阅消息
 */
export interface WebSocketSubscribeMessage {
  action: 'subscribe';
  channels: WebSocketChannel[];
  filters?: {
    taskId?: string;
    [key: string]: any;
  };
}

/**
 * WebSocket 频道
 */
export type WebSocketChannel =
  | 'task_progress'
  | 'generation_status'
  | 'audit_alerts'
  | 'performance_alerts';

// ============================================================================
// 错误代码类型
// ============================================================================

/**
 * API 错误代码枚举
 */
export enum ApiErrorCode {
  // 通用错误 (1xxx)
  UNKNOWN_ERROR = 1000,
  INVALID_REQUEST = 1001,
  UNAUTHORIZED = 1002,
  FORBIDDEN = 1003,
  NOT_FOUND = 1004,
  CONFLICT = 1005,
  RATE_LIMIT_EXCEEDED = 1006,
  INTERNAL_ERROR = 1007,

  // 文件处理错误 (2xxx)
  FILE_NOT_FOUND = 2000,
  FILE_TOO_LARGE = 2001,
  INVALID_FILE_FORMAT = 2002,
  FILE_UPLOAD_FAILED = 2003,

  // 数据处理错误 (3xxx)
  DATA_QUALITY_ANALYSIS_FAILED = 3000,
  DATA_CLEANING_FAILED = 3001,
  TRANSFORM_RULE_NOT_FOUND = 3002,
  TRANSFORM_EXECUTION_FAILED = 3003,

  // 模板错误 (4xxx)
  TEMPLATE_NOT_FOUND = 4000,
  TEMPLATE_INVALID = 4001,
  TEMPLATE_UPLOAD_FAILED = 4002,
  GENERATION_FAILED = 4003,
  DOWNLOAD_FAILED = 4004,

  // 审计错误 (5xxx)
  AUDIT_RULE_NOT_FOUND = 5000,
  AUDIT_EXECUTION_FAILED = 5001,
  AUDIT_REPORT_FAILED = 5002,

  // SQL 错误 (6xxx)
  SQL_SYNTAX_ERROR = 6000,
  SQL_IDENTIFIER_NOT_FOUND = 6001,
  SQL_VALIDATION_FAILED = 6002,

  // 质量控制错误 (7xxx)
  HALLUCINATION_DETECTED = 7000,
  QUALITY_GATE_FAILED = 7001,
  VALIDATION_FAILED = 7002,
}

// ============================================================================
// 导出所有类型
// ============================================================================

export type {
  // 通用类型
  ApiResponseSuccess,
  ApiErrorResponse,
  ApiResponseMeta,
  ApiError,
  ErrorDetail,
  Pagination,
  PaginatedResponse,
  QueryParams,

  // 智能数据处理模块
  DataQualityAnalyzeRequest,
  DataQualityAnalyzeOptions,
  DataQualityAnalysis,
  DataQualitySummary,
  DataQualityIssue,
  DataQualityIssueType,
  DataQualityIssueLocation,
  DataQualityStatistics,
  DataQualitySuggestionsRequest,
  DataQualitySuggestionsOptions,
  DataQualitySuggestions,
  CleaningSuggestion,
  CleaningPreview,
  ManualAction,
  DataQualityCleanRequest,
  DataQualityCleanOptions,
  DataQualityCleanResult,
  CleaningActionResult,
  CleaningSummary,
  BackupFileInfo,
  TransformRuleCreateRequest,
  TransformRuleCategory,
  TransformRuleInput,
  TransformRuleTransformation,
  TransformRuleOutput,
  TransformRule,
  ApplyTransformRulesRequest,
  TransformRuleApplication,
  ApplyTransformRulesResult,
  TransformRuleResult,

  // 多模板文档生成模块
  TemplateUploadRequest,
  TemplateMappings,
  TemplatePlaceholder,
  Template,
  TemplateFileInfo,
  TemplateMetadata,
  TemplatePlaceholderInfo,
  TemplateUsageStats,
  MappingSchemeV2,
  FieldMappingV2,
  CrossSheetMapping,
  SheetInfo,
  BatchGenerationRequest,
  BatchGenerationOptions,
  BatchGenerationFilters,
  NotificationConfig,
  BatchGenerationResponse,
  BatchGenerationItem,
  GenerationDownloadUrls,
  GenerationStatus,
  GenerationSummary,

  // 审计规则引擎模块
  AuditRuleCreateRequest,
  AuditRuleCategory,
  AuditRuleConditions,
  AuditRuleAction,
  AuditRuleSchedule,
  AuditRule,
  AuditExecuteRequest,
  AuditExecuteOptions,
  AuditExecutionResult,
  AuditRuleResult,
  AuditViolation,
  AuditSummary,
  AuditReport,
  AuditReportDetail,
  AuditReportCharts,
  AuditReportDownloadUrls,

  // 性能监控模块
  PerformanceMetricsRequest,
  PerformanceMetricType,
  PerformanceMetrics,
  PerformanceMetricsData,
  QueryPerformanceMetrics,
  AIPerformanceMetrics,
  DocumentPerformanceMetrics,
  ResourceUsageMetrics,
  PerformanceTrends,
  PerformanceDataPoint,
  PerformanceReport,
  PerformanceReportSummary,
  PerformanceReportCategory,
  PerformanceAlert,
  PerformanceAlertCreateRequest,
  AlertCondition,
  AlertAction,
  PerformanceAlertRule,

  // 质量控制模块
  SQLValidationRequest,
  DatabaseSchema,
  SQLValidationResult,
  SyntaxError,
  IdentifierValidation,
  ComplexityValidation,
  ComplexityFactor,
  HallucinationDetectionRequest,
  HallucinationDetectionResult,
  HallucinationDetail,
  FixSuggestionsRequest,
  FixSuggestionsResponse,
  FixSuggestion,
  QualityGateCreateRequest,
  QualityGateCriteria,
  QualityGateActions,
  QualityGate,
  QualityGateCheckRequest,
  QualityGateCheckResult,
  QualityGateCheckResultItem,

  // WebSocket 消息类型
  WebSocketMessage,
  TaskProgressMessage,
  GenerationStatusMessage,
  AuditAlertMessage,
  PerformanceAlertMessage,
  WebSocketSubscribeMessage,
  WebSocketChannel,
};
