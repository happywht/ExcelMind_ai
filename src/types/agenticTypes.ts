/**
 * 多步分析和自我修复系统 - 类型定义
 *
 * 这个文件定义了 AgenticOrchestrator 的所有类型
 * 基于 SOLID 原则设计，确保类型系统的可扩展性和可维护性
 */

/**
 * 数据文件信息接口
 */
export interface DataFileInfo {
  id: string;
  fileName: string;
  sheets?: { [sheetName: string]: any[] };
  currentSheetName?: string;
  metadata?: {
    [sheetName: string]: {
      comments?: { [cellAddress: string]: string };
      notes?: { [cellAddress: string]: string };
      rowCount?: number;
      columnCount?: number;
    };
  };
}

/**
 * 任务状态枚举
 */
export enum TaskStatus {
  IDLE = 'idle',                   // 空闲状态
  OBSERVING = 'observing',         // 观察阶段
  THINKING = 'thinking',           // 思考阶段
  ACTING = 'acting',               // 执行阶段
  EVALUATING = 'evaluating',       // 评估阶段
  REPAIRING = 'repairing',         // 修复阶段
  COMPLETED = 'completed',         // 已完成
  FAILED = 'failed',               // 已失败
  CANCELLED = 'cancelled'          // 已取消
}

/**
 * 错误分类枚举
 */
export enum ErrorCategory {
  // 用户输入错误
  VALIDATION_ERROR = 'validation_error',
  INVALID_INPUT = 'invalid_input',

  // 数据处理错误
  DATA_ERROR = 'data_error',
  DATA_PARSING_ERROR = 'data_parsing_error',
  DATA_TRANSFORMATION_ERROR = 'data_transformation_error',
  COLUMN_NOT_FOUND = 'column_not_found',

  // AI服务错误
  AI_SERVICE_ERROR = 'ai_service_error',
  AI_TIMEOUT = 'ai_timeout',
  AI_RATE_LIMIT = 'ai_rate_limit',

  // 代码执行错误
  CODE_EXECUTION_ERROR = 'code_execution_error',
  CODE_SYNTAX_ERROR = 'code_syntax_error',
  RUNTIME_ERROR = 'runtime_error',

  // 系统错误
  NETWORK_ERROR = 'network_error',
  STORAGE_ERROR = 'storage_error',
  TIMEOUT_ERROR = 'timeout_error',

  // 未知错误
  UNKNOWN_ERROR = 'unknown_error'
}

/**
 * 任务错误接口
 */
export interface TaskError {
  id: string;
  category: ErrorCategory;
  code: string;
  message: string;
  details?: any;
  stack?: string;
  timestamp: number;
  retryable: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * 错误分析结果
 */
export interface ErrorAnalysis {
  error: TaskError;
  rootCause: string;
  suggestedRepair: RepairStrategy[];
  canAutoRecover: boolean;
  requiresUserIntervention: boolean;
  confidence: number;
}

/**
 * 修复策略接口
 */
export interface RepairStrategy {
  type: 'retry' | 'fallback' | 'alternative_approach' | 'user_intervention';
  description: string;
  action: string;
  priority: number;
  estimatedSuccessRate: number;
}

/**
 * 分析步骤接口
 */
export interface AnalysisStep {
  id: string;
  name: string;
  description: string;
  status: TaskStatus;
  startTime: number;
  endTime?: number;
  duration?: number;
  input: any;
  output?: any;
  error?: TaskError;
  metadata?: {
    [key: string]: any;
  };
}

/**
 * 执行计划接口
 */
export interface ExecutionPlan {
  id: string;
  steps: AnalysisStep[];
  estimatedDuration: number;
  requiredResources: string[];
  dependencies?: string[];
  fallbackStrategies: {
    [stepId: string]: RepairStrategy[];
  };
}

/**
 * 步骤反馈接口
 */
export interface StepFeedback {
  stepId: string;
  success: boolean;
  quality: number; // 0-1
  issues: string[];
  suggestions: string[];
  outputQuality: {
    completeness: number;
    accuracy: number;
    consistency: number;
  };
}

/**
 * 质量报告接口
 */
export interface QualityReport {
  overallQuality: number; // 0-1
  stepReports: {
    [stepId: string]: StepFeedback;
  };
  totalIssues: number;
  criticalIssues: number;
  suggestions: string[];
  metrics: {
    totalSteps: number;
    successfulSteps: number;
    failedSteps: number;
    retriedSteps: number;
    totalTime: number;
  };
}

/**
 * 任务上下文接口
 */
export interface TaskContext {
  userInput: string;
  dataFiles: DataFileInfo[];
  metadata: {
    [key: string]: any;
  };
  history: {
    attempts: number;
    errors: TaskError[];
    repairs: RepairStrategy[];
  };
  sessionState: {
    sessionId: string;
    startTime: number;
    lastUpdateTime: number;
  };
}

/**
 * 多步任务接口
 */
export interface MultiStepTask {
  id: string;
  status: TaskStatus;
  context: TaskContext;
  currentStep?: number;
  steps: AnalysisStep[];
  plan?: ExecutionPlan;
  result?: TaskResult;
  error?: TaskError;
  qualityReport?: QualityReport;
  progress: {
    percentage: number;
    currentPhase: string;
    message: string;
  };
  metadata: {
    createdAt: number;
    updatedAt: number;
    completedAt?: number;
    version: string;
  };
}

/**
 * 任务结果接口
 */
export interface TaskResult {
  success: boolean;
  data?: {
    [fileName: string]: any[] | { [sheetName: string]: any[] };
  };
  outputFiles?: string[];
  logs: string[];
  qualityReport?: QualityReport;
  executionSummary: {
    totalSteps: number;
    successfulSteps: number;
    failedSteps: number;
    retriedSteps: number;
    totalTime: number;
    averageStepTime: number;
  };
  metadata: {
    completedAt: number;
    sessionId: string;
    taskId: string;
  };
}

/**
 * 观察结果接口
 */
export interface ObservationResult {
  success: boolean;
  observations: {
    dataStructure: {
      files: string[];
      sheets: { [fileName: string]: string[] };
      totalRows: number;
      totalColumns: number;
    };
    dataQuality: {
      missingValues: number;
      duplicateRows: number;
      inconsistentTypes: number;
    };
    metadata: {
      hasComments: boolean;
      hasNotes: boolean;
      commentCount: number;
      noteCount: number;
    };
    patterns: string[];
  };
  issues: string[];
  warnings: string[];
}

/**
 * 思考结果接口（扩展）
 */
export interface ThinkingResult {
  success: boolean;
  plan: ExecutionPlan;
  reasoning: string;
  assumptions: string[];
  risks: string[];
  alternatives: {
    description: string;
    pros: string[];
    cons: string[];
    estimatedSuccessRate: number;
  }[];
  confidence: number;
}

/**
 * 执行步骤结果接口
 */
export interface StepResult {
  stepId: string;
  success: boolean;
  output?: any;
  error?: TaskError;
  rawError?: unknown; // 原始错误对象
  executionTime: number;
  generatedCode?: string; // 生成的代码（用于调试）
  memory?: {
    used: number;
    peak: number;
  };
  quality?: {
    accuracy: number;
    completeness: number;
  };
}

/**
 * 评估结果接口
 */
export interface EvaluationResult {
  success: boolean;
  passed: boolean;
  feedback: StepFeedback;
  nextAction: 'continue' | 'retry' | 'repair' | 'complete' | 'fail';
  qualityScore: number;
  issues: {
    critical: string[];
    warning: string[];
    info: string[];
  };
}

/**
 * 修复结果接口
 */
export interface RepairResult {
  success: boolean;
  appliedStrategy: RepairStrategy;
  result?: any;
  remainingErrors: TaskError[];
  attemptNumber: number;
  maxAttempts: number;
  canContinue: boolean;
}

/**
 * 编排器配置接口
 */
export interface OrchestratorConfig {
  maxRetries: number;
  timeoutPerStep: number;
  totalTimeout: number;
  qualityThreshold: number;
  enableAutoRepair: boolean;
  enableCaching: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  aiModel: string;
  maxTokens: number;
}

/**
 * 进度回调类型
 */
export type ProgressCallback = (state: MultiStepTask) => void;

/**
 * 日志级别类型
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * 日志条目接口
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  context?: {
    [key: string]: any;
  };
  stack?: string;
}

/**
 * AI分析请求接口（扩展）
 */
export interface AIAnalysisRequest {
  prompt: string;
  context: any;
  systemInstruction?: string;
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

/**
 * AI分析响应接口（扩展）
 */
export interface AIAnalysisResponse {
  success: boolean;
  content: string;
  reasoning?: string;
  confidence?: number;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
  error?: {
    code: string;
    message: string;
  };
  metadata?: {
    [key: string]: any;
  };
}

/**
 * AI处理结果接口
 */
export interface AIProcessResult {
  success: boolean;
  data?: any;
  content?: string;
  error?: string;
  metadata?: {
    [key: string]: any;
  };
}

/**
 * 代码执行请求接口
 */
export interface CodeExecutionRequest {
  code: string;
  datasets: { [fileName: string]: any[] };
  timeout?: number;
}

/**
 * 代码执行响应接口
 */
export interface CodeExecutionResponse {
  success: boolean;
  data?: { [fileName: string]: any[] };
  output?: string;
  error?: {
    type: string;
    message: string;
    line?: number;
    column?: number;
    stack?: string;
  };
  executionTime: number;
}

/**
 * 会话状态接口
 */
export interface SessionState {
  sessionId: string;
  tasks: MultiStepTask[];
  currentTaskId?: string;
  metadata: {
    createdAt: number;
    lastActivity: number;
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
  };
}

/**
 * 统计信息接口
 */
export interface Statistics {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageExecutionTime: number;
  successRate: number;
  errorDistribution: {
    [category: string]: number;
  };
  mostCommonErrors: {
    error: string;
    count: number;
  }[];
}
