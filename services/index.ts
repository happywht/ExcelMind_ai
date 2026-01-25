/**
 * ExcelMind AI - 服务层统一导出入口
 * Phase 1: 基础架构完成
 */

// ============================================
// 查询引擎模块
// ============================================

export {
  // 数据源管理
  MultiSheetDataSource,
  type Relationship,
  type RelationshipPath,
  type ColumnConflict,
  type SheetMetadata as QuerySheetMetadata
} from './queryEngine/MultiSheetDataSource';

export {
  // 查询引擎
  DataQueryEngine,
  AlaSQLExecutor,
  SQLBuilder,
  QueryOptimizer,
  type QueryRequest,
  type QueryResult,
  type StructuredQuery,
  type JoinClause,
  type Aggregation,
  type QueryEngineConfig,
  type QueryPlan
} from './queryEngine/DataQueryEngine';

export {
  // AI查询解析器
  AIQueryParser,
  type QueryType,
  type FilterCondition,
  type JoinCondition,
  type AggregationSpec,
  type QueryOperation,
  type QueryIntent
} from './queryEngine/AIQueryParser';

// ============================================
// 文档生成模块
// ============================================

export {
  // docxtemplater高级引擎
  DocxtemplaterService,
  DocumentEngineFactory,
  TemplateValidator,
  DataBuilder,
  type DocxtemplaterOptions,
  type ImageOptions,
  type ParserOptions,
  type EnhancedGenerationOptions,
  type BatchOptions,
  type ValidationResult as DocxValidationResult,
  type ConditionalData,
  type LoopData,
  type TableData,
  type ImageData,
  ErrorCode,
  DocxGenerationError
} from './docxtemplaterService';

export {
  // docx-templates标准引擎
  generateWordDocument,
  generateMultipleDocuments,
  createDownloadZip,
  downloadDocument,
  downloadDocumentsAsZip
} from './docxGeneratorService';

// ============================================
// 基础设施模块
// ============================================

export {
  // 缓存服务
  CacheService
} from './infrastructure/cacheService';

export {
  // 事件总线
  EventBus,
  EventType,
  TypedEventBus,
  EventAggregator,
  EventFilter
} from './infrastructure/eventBus';

export {
  // 重试服务
  RetryStrategy,
  RetryStrategyType,
  FallbackStrategy,
  ResilienceStrategy,
  type RetryStrategyConfig
} from './infrastructure/retryService';

export {
  // 基础设施统一导出
  createInfrastructure
} from './infrastructure';

// ============================================
// 性能监控模块 (Phase 2)
// ============================================

export {
  // 性能监控核心
  PerformanceMonitor,
  MetricsCollector,
  PerformanceAnalyzer,
  PerformanceTracker,
  BenchmarkEvaluator,

  // 全局实例
  globalPerformanceMonitor,
  globalMetricsCollector,
  defaultBenchmarkEvaluator,

  // 快捷方法
  recordMetric,
  getPerformanceReport,
  getRealTimeMetrics,
  setPerformanceAlert,
  getPerformanceAlerts,

  // 装饰器
  TrackPerformance,
  TrackQuery,
  TrackAICall,
  TrackDocumentGeneration,

  // 工厂函数
  createMonitoringSystem,
  initPerformanceMonitoring,
  configurePerformanceTracking,

  // 常量
  DEFAULT_PERFORMANCE_BENCHMARKS,
  MONITORING_VERSION,
  MONITORING_PHASE,
  MONITORING_BUILD_DATE
} from './monitoring';

export type {
  // 性能监控类型
  PerformanceMetric,
  MetricType,
  MetricUnit,
  QueryPerformance,
  SlowQuery,
  QueryAnalysis,
  AIPerformance,
  DocumentPerformance,
  ResourceUsage,
  UXEvent,
  UXMetrics,
  TimeRange,
  PerformanceReport,
  PerformanceSummary,
  PerformanceScore,
  PerformanceThreshold,
  PerformanceAlert,
  AlertCallback,
  RealTimeMetrics,
  TrendAnalysis,
  PerformanceBenchmarks,
  BenchmarkThreshold,
  OptimizationSuggestion,
  Bottleneck,
  ComparisonReport,
  OptimizationAdvice,
  ImprovementEstimate
} from './monitoring';

// ============================================
// 类型定义
// ============================================

export type {
  // 文档类型
  TemplateFile,
  FieldMapping,
  GeneratedDocument,
  DocumentProcessingLog
} from '../types/documentTypes';

// ============================================
// 核心服务模块
// ============================================

export {
  // 智谱AI服务
  generateExcelFormula,
  chatWithKnowledgeBase,
  generateDataProcessingCode
} from './zhipuService';

export {
  // Excel处理服务
  readExcelFile,
  exportToExcel,
  exportMultipleSheetsToExcel,
  executeTransformation
} from './excelService';

export {
  // Agentic编排服务
  AgenticOrchestrator,
  createOrchestrator
} from './agentic/AgenticOrchestrator';

// ============================================
// 后端优化模块 (Phase 1 & 3)
// ============================================

export {
  // 元数据服务
  extractExcelMetadata,
  formatMetadataForPrompt,
  generateSimplifiedSchema
} from './metadata/excelMetadataService';

export {
  // Re-Act循环服务
  reactCycle,
  createReactCycleService
} from './react/reactCycleService';

export {
  // 静态代码分析
  StaticCodeAnalyzer,
  analyzeCode,
  checkCodeSecurity,
  checkCodeQuality
} from './quality/staticCodeAnalyzer';

export {
  // Prompt构建服务
  buildPromptWithSchema,
  buildRefinePrompt,
  buildCodeWithTools,
  createPromptBuilder
} from './prompt/promptBuilderService';

export {
  // 审计工具库
  AUDIT_TOOLS,
  generateToolsDocumentation,
  generateToolsCode,
  findTool,
  getToolsByCategory,
  ToolCategory
} from './tools/auditTools';

// ============================================
// 质量控制模块
// ============================================

export {
  // 主验证器
  AIOutputValidator,

  // 子组件
  SQLValidator,
  ResultValidator,
  HallucinationDetector,
  FixSuggestionGenerator,

  // 质量门禁
  QualityGate,
  STRICT_GATE,
} from './quality';

// ============================================
// 类型导出 - 后端优化
// ============================================

export type {
  ExcelMetadata,
  SheetMetadata,
  ColumnMetadata
} from './metadata/excelMetadataService';

export type {
  ReactPhase,
  ReactState,
  ReactResult,
  ReactCycleConfig
} from './react/reactCycleService';

export type {
  SecurityCheckResult as QualitySecurityCheckResult,
  QualityCheckResult,
  AnalysisResult
} from './quality/staticCodeAnalyzer';

export type {
  PromptBuilderConfig
} from './prompt/promptBuilderService';

export type {
  // 质量控制类型
  DatabaseSchema,
  AIOutput,
  QueryContext,
  ValidationConfig,
  ValidationResult as QualityValidationResult,
  SQLValidationResult,
  ResultValidationResult,
  HallucinationDetectionResult,
  FixSuggestion,
  QualityReport,
  GateCriteria,
  GateResult
} from './quality';

// ============================================
// WASM 本地执行模块 (Phase 2)
// ============================================

export {
  // 核心服务
  PyodideService,
  getPyodideService,
  FileSystemService,
  getFileSystemService,
  ExecutionEngine,
  getExecutionEngine,

  // 便捷函数
  initializeWasm,
  executePython,
  mountExcelFile,
  downloadResult,
  cleanup,
  MODULE_INFO,

  // 常量
  STANDARD_PATHS,
  PyodideStatus
} from './wasm';

export type {
  // Pyodide 类型
  PyodideConfig,
  PyodideResult as PyodideExecutionResult,
  FileSystemStatus,

  // 文件系统类型
  FileInfo,
  FileFerryOptions,

  // 执行引擎类型
  ExecutionConfig as WasmExecutionConfig,
  ExecutionContext,
  ExecutionResult as WasmExecutionResult,
  SecurityCheckResult as WasmSecurityCheckResult
} from './wasm';

// ============================================
// 虚拟文件系统模块 (Phase 2 - 虚拟工作台优化)
// ============================================

export {
  // 核心服务
  VirtualFileSystem,
  getVirtualFileSystem,
  FileRole,
  RelationType,

  // 元数据服务
  FileMetadataService,
  getFileMetadataService,

  // 关系服务
  FileRelationshipService,
  getFileRelationshipService,

  // 跨Sheet服务
  CrossSheetService,
  getCrossSheetService,

  // 工作台管理器
  VirtualWorkspaceManager,
  getVirtualWorkspaceManager
} from './infrastructure/vfs';

export type {
  // VFS 核心类型
  VirtualFileInfo,
  FileUpdate,
  FileRelationship,
  VersionInfo,
  DirectoryInfo,
  VFSStats,
  VFSConfig,

  // 元数据类型
  FileTag,
  MetadataQuery,
  MetadataStats,
  SchemaInfo,
  ExtendedFileMetadata,

  // 关系类型
  GraphNode,
  GraphEdge,
  RelationshipGraph,
  PathInfo,
  DependencyAnalysis,
  CascadeImpact,

  // 跨Sheet类型
  SheetReference,
  ValidationResult as VFSValidationResult,
  ResolvedReference,
  ReferenceAnalysis,
  SheetSnapshot,

  // 工作台类型
  WorkspaceStatus,
  WorkspaceConfig,
  WorkspaceSnapshot,
  WorkspaceStats,
  BatchOperationResult
} from './infrastructure/vfs';

// ============================================
// 版本信息
// ============================================

export const SERVICES_VERSION = '2.3.0';
export const PHASE = 'Phase 2 - 虚拟工作台优化服务';
export const BUILD_DATE = new Date().toISOString();
