/**
 * @file 执行状态类型定义
 * @description 定义执行过程中的各种状态，支持四阶段执行模型（侦察→预审→分析→生成）
 * @module types/executionTypes
 */

/**
 * 执行阶段枚举
 * @description 定义四阶段执行模型的各个阶段
 */
export enum ExecutionStage {
  /** 初始化阶段 */
  INITIALIZATION = 'initialization',
  /** 侦察阶段 - 探索数据结构 */
  RECONNAISSANCE = 'reconnaissance',
  /** 预审阶段 - 内控三维校验 */
  PRE_AUDIT = 'pre_audit',
  /** 分析阶段 - AI智能分析 */
  ANALYSIS = 'analysis',
  /** 生成阶段 - 文档生成 */
  GENERATION = 'generation',
  /** 完成阶段 */
  COMPLETED = 'completed'
}

/**
 * 执行状态枚举
 * @description 任务或步骤的执行状态
 */
export enum ExecutionStatus {
  /** 等待执行 */
  PENDING = 'pending',
  /** 正在执行 */
  IN_PROGRESS = 'in_progress',
  /** 执行完成 */
  COMPLETED = 'completed',
  /** 执行失败 */
  FAILED = 'failed',
  /** 已取消 */
  CANCELLED = 'cancelled',
  /** 等待用户输入 */
  AWAITING_USER_INPUT = 'awaiting_user_input'
}

/**
 * 步骤类型枚举
 * @description 定义执行步骤的类型
 */
export enum StepType {
  /** 观察数据 */
  OBSERVE = 'observe',
  /** AI思考 */
  THINK = 'think',
  /** 执行操作 */
  ACT = 'act',
  /** 评估结果 */
  EVALUATE = 'evaluate',
  /** 修复错误 */
  REPAIR = 'repair',
  /** 完成 */
  COMPLETE = 'complete'
}

/**
 * 任务进度接口
 * @description 描述任务的执行进度
 */
export interface TaskProgress {
  /** 任务ID */
  taskId: string;
  /** 当前阶段 */
  currentStage: ExecutionStage;
  /** 完成百分比（0-100） */
  percentage: number;
  /** 总步骤数 */
  totalSteps: number;
  /** 已完成步骤数 */
  completedSteps: number;
  /** 当前步骤ID */
  currentStepId: string | null;
  /** 是否正在运行 */
  isRunning: boolean;
  /** 是否已完成 */
  isCompleted: boolean;
  /** 是否失败 */
  isFailed: boolean;
  /** 开始时间 */
  startTime: number;
  /** 结束时间 */
  endTime?: number;
  /** 总持续时间（毫秒） */
  totalDuration?: number;
  /** 预计剩余时间（毫秒） */
  estimatedRemainingTime?: number;
  /** 进度消息 */
  message: string;
  /** 进度详情 */
  details?: {
    [key: string]: any;
  };
}

/**
 * 执行步骤接口
 * @description 定义单个执行步骤的结构
 */
export interface ExecutionStep {
  /** 步骤ID */
  id: string;
  /** 步骤类型 */
  type: StepType;
  /** 步骤状态 */
  status: ExecutionStatus;
  /** 步骤标题 */
  title: string;
  /** 步骤描述 */
  description: string;
  /** 所属阶段 */
  stage: ExecutionStage;
  /** 步骤序号 */
  stepNumber: number;
  /** 执行代码（可选） */
  code?: string;
  /** 执行结果 */
  result?: any;
  /** 错误信息 */
  error?: ErrorInfo;
  /** 开始时间 */
  startTime?: number;
  /** 结束时间 */
  endTime?: number;
  /** 持续时间（毫秒） */
  duration?: number;
  /** 重试次数 */
  retryCount?: number;
  /** 元数据 */
  metadata?: {
    [key: string]: any;
  };
}

/**
 * 步骤结果接口
 * @description 定义步骤执行的结果
 */
export interface StepResult {
  /** 步骤ID */
  stepId: string;
  /** 是否成功 */
  success: boolean;
  /** 输出数据 */
  output?: any;
  /** 错误信息 */
  error?: ErrorInfo;
  /** 执行时间（毫秒） */
  executionTime: number;
  /** 内存使用情况 */
  memory?: {
    /** 已使用内存（字节） */
    used: number;
    /** 峰值内存（字节） */
    peak: number;
  };
  /** 质量指标 */
  quality?: {
    /** 准确性（0-1） */
    accuracy: number;
    /** 完整性（0-1） */
    completeness: number;
  };
}

/**
 * 执行状态接口
 * @description 整个执行过程的状态
 */
export interface ExecutionState {
  /** 当前步骤ID */
  currentStepId: string | null;
  /** 总步骤数 */
  totalSteps: number;
  /** 已完成步骤数 */
  completedSteps: number;
  /** 完成百分比 */
  percentage: number;
  /** 是否正在运行 */
  isRunning: boolean;
  /** 是否已完成 */
  isCompleted: boolean;
  /** 是否失败 */
  isFailed: boolean;
  /** 开始时间 */
  startTime: number;
  /** 结束时间 */
  endTime?: number;
  /** 总持续时间 */
  totalDuration?: number;
  /** 错误信息 */
  error?: ErrorInfo;
}

/**
 * 执行历史条目接口
 * @description 记录执行历史，用于追溯和调试
 */
export interface ExecutionHistoryEntry {
  /** 历史条目ID */
  id: string;
  /** 时间戳 */
  timestamp: number;
  /** 执行阶段 */
  stage: ExecutionStage;
  /** 执行状态 */
  status: ExecutionStatus;
  /** 输入数据 */
  input: any;
  /** 输出数据 */
  output: any;
  /** 持续时间（毫秒） */
  duration: number;
  /** 错误信息 */
  error?: ErrorInfo;
  /** 元数据 */
  metadata?: Record<string, any>;
}

/**
 * 错误信息接口
 * @description 统一的错误信息结构
 */
export interface ErrorInfo {
  /** 错误码 */
  code: string;
  /** 错误消息 */
  message: string;
  /** 错误堆栈 */
  stack?: string;
  /** 错误详情 */
  details?: any;
  /** 是否可重试 */
  retryable: boolean;
  /** 错误严重级别 */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** 时间戳 */
  timestamp?: number;
}

/**
 * 文档生成任务接口
 * @description 完整的文档生成任务定义
 */
export interface DocumentGenerationTask {
  /** 任务ID */
  id: string;
  /** 执行状态 */
  status: ExecutionStatus;
  /** 进度信息 */
  progress: TaskProgress;
  /** 当前阶段 */
  currentStage: ExecutionStage;
  /** 开始时间 */
  startedAt: number;
  /** 完成时间 */
  completedAt?: number;
  /** 错误信息 */
  error?: ErrorInfo;

  /** 输入：模板结构 */
  template: any;
  /** 输入：数据源配置 */
  dataSources: any[];
  /** 输入：用户指令 */
  userInstruction: string;

  /** 输出：映射方案 */
  mappingScheme?: any;
  /** 输出：生成的文档 */
  generatedDocuments?: any[];

  /** 执行步骤列表 */
  steps: ExecutionStep[];
  /** 执行历史 */
  executionHistory: ExecutionHistoryEntry[];
}

/**
 * 执行计划接口
 * @description 定义执行计划和步骤安排
 */
export interface ExecutionPlan {
  /** 计划ID */
  id: string;
  /** 执行步骤列表 */
  steps: ExecutionStep[];
  /** 预计持续时间（毫秒） */
  estimatedDuration: number;
  /** 所需资源列表 */
  requiredResources: string[];
  /** 依赖关系 */
  dependencies?: string[];
  /** 降级策略 */
  fallbackStrategies: {
    [stepId: string]: any[];
  };
}

/**
 * 质量报告接口
 * @description 执行质量评估报告
 */
export interface QualityReport {
  /** 总体质量分数（0-1） */
  overallQuality: number;
  /** 步骤报告 */
  stepReports: {
    [stepId: string]: any;
  };
  /** 总问题数 */
  totalIssues: number;
  /** 严重问题数 */
  criticalIssues: number;
  /** 改进建议 */
  suggestions: string[];
  /** 指标统计 */
  metrics: {
    /** 总步骤数 */
    totalSteps: number;
    /** 成功步骤数 */
    successfulSteps: number;
    /** 失败步骤数 */
    failedSteps: number;
    /** 重试步骤数 */
    retriedSteps: number;
    /** 总时间 */
    totalTime: number;
  };
}

/**
 * 执行统计接口
 * @description 执行过程的统计数据
 */
export interface ExecutionStatistics {
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

// 测试增量编译

// 测试增量编译
