/**
 * @file 验证结果类型定义
 * @description 统一验证相关的类型定义，支持内控三维校验
 * @module types/validationTypes
 */

/**
 * 验证级别枚举
 * @description 定义验证的严格级别
 */
export enum ValidationLevel {
  /** 信息级别 */
  INFO = 'info',
  /** 警告级别 */
  WARNING = 'warning',
  /** 错误级别 */
  ERROR = 'error',
  /** 严重级别 */
  CRITICAL = 'critical'
}

/**
 * 验证状态枚举
 * @description 验证操作的状态
 */
export enum ValidationStatus {
  /** 待验证 */
  PENDING = 'pending',
  /** 验证中 */
  VALIDATING = 'validating',
  /** 验证通过 */
  PASSED = 'passed',
  /** 验证失败 */
  FAILED = 'failed',
  /** 验证跳过 */
  SKIPPED = 'skipped'
}

/**
 * 内控维度枚举
 * @description 内控三维校验的三个维度
 */
export enum InternalControlDimension {
  /** 完整性 - 数据是否完整无缺失 */
  COMPLETENESS = 'completeness',
  /** 准确性 - 数据是否准确无误 */
  ACCURACY = 'accuracy',
  /** 一致性 - 数据是否逻辑一致 */
  CONSISTENCY = 'consistency'
}

/**
 * 验证错误接口
 * @description 定义单个验证错误
 */
export interface ValidationError {
  /** 错误ID */
  id: string;
  /** 错误级别 */
  level: ValidationLevel;
  /** 错误码 */
  code: string;
  /** 错误消息 */
  message: string;
  /** 错误字段 */
  field?: string;
  /** 错误值 */
  value?: any;
  /** 期望值 */
  expectedValue?: any;
  /** 修复建议 */
  suggestion?: string;
  /** 错误详情 */
  details?: {
    [key: string]: any;
  };
  /** 所在行号 */
  row?: number;
  /** 所在列名 */
  column?: string;
  /** 时间戳 */
  timestamp?: number;
}

/**
 * 验证结果接口
 * @description 完整的验证结果
 */
export interface ValidationResult {
  /** 是否验证通过 */
  valid: boolean;
  /** 验证状态 */
  status: ValidationStatus;
  /** 验证分数（0-100） */
  score: number;
  /** 验证警告列表 */
  warnings: ValidationError[];
  /** 验证错误列表 */
  errors: ValidationError[];
  /** 验证指标 */
  metrics: ValidationMetrics;
  /** 验证时间 */
  validatedAt: number;
  /** 验证耗时（毫秒） */
  duration: number;
  /** 验证配置 */
  config?: ValidationConfig;
}

/**
 * 验证指标接口
 * @description 验证过程中的各项指标
 */
export interface ValidationMetrics {
  /** 行数统计 */
  rowCount?: number;
  /** 列数统计 */
  columnCount?: number;
  /** 数值摘要 */
  numericSummary?: {
    sum?: number;
    min?: number;
    max?: number;
    avg?: number;
    median?: number;
    stdDev?: number;
  };
  /** 数据质量指标 */
  dataQuality?: ValidationDataQualityMetrics;
  /** 内控三维指标 */
  internalControl?: InternalControlMetrics;
}

/**
 * 验证数据质量指标接口
 * @description 数据质量的量化指标（扩展版，包含分数）
 */
export interface ValidationDataQualityMetrics {
  /** 缺失值数量 */
  missingValues: number;
  /** 重复行数量 */
  duplicateRows: number;
  /** 类型不一致数量 */
  inconsistentTypes: number;
  /** 空值比例（0-1） */
  missingRatio: number;
  /** 重复行比例（0-1） */
  duplicateRatio: number;
  /** 数据完整性分数（0-1） */
  completenessScore: number;
  /** 数据准确性分数（0-1） */
  accuracyScore: number;
  /** 数据一致性分数（0-1） */
  consistencyScore: number;
}

/**
 * 基础数据质量指标接口
 * @description 数据质量的量化指标（不包含分数）
 */
export interface BaseDataQualityMetrics {
  /** 缺失值数量 */
  missingValues: number;
  /** 重复行数量 */
  duplicateRows: number;
  /** 类型不一致数量 */
  inconsistentTypes: number;
  /** 空值比例（0-1） */
  missingRatio: number;
  /** 重复行比例（0-1） */
  duplicateRatio: number;
}

/**
 * 内控指标接口
 * @description 内控三维校验的指标
 */
export interface InternalControlMetrics {
  /** 完整性维度 */
  completeness: {
    /** 是否通过 */
    passed: boolean;
    /** 分数（0-1） */
    score: number;
    /** 问题列表 */
    issues: string[];
    /** 检查项 */
    checks: {
      requiredFieldsPresent: boolean;
      noNullKeys: boolean;
      dataCompletenessRatio: number;
    };
  };
  /** 准确性维度 */
  accuracy: {
    /** 是否通过 */
    passed: boolean;
    /** 分数（0-1） */
    score: number;
    /** 问题列表 */
    issues: string[];
    /** 检查项 */
    checks: {
      dataTypeAccuracy: boolean;
      valueRangeAccuracy: boolean;
      formatAccuracy: boolean;
    };
  };
  /** 一致性维度 */
  consistency: {
    /** 是否通过 */
    passed: boolean;
    /** 分数（0-1） */
    score: number;
    /** 问题列表 */
    issues: string[];
    /** 检查项 */
    checks: {
      crossFieldConsistency: boolean;
      logicalConsistency: boolean;
      referentialIntegrity: boolean;
    };
  };
}

/**
 * 验证配置接口
 * @description 验证规则的配置
 */
export interface ValidationConfig {
  /** 是否检查行数 */
  checkRowCount: boolean;
  /** 是否检查列数 */
  checkColumnCount: boolean;
  /** 是否检查数值范围 */
  checkNumericRange: boolean;
  /** 是否检查数据质量 */
  checkDataQuality: boolean;
  /** 是否进行内控三维校验 */
  checkInternalControl: boolean;
  /** 数值范围配置 */
  numericRange?: {
    min?: number;
    max?: number;
  };
  /** 最大缺失值比例（0-1） */
  maxMissingRatio: number;
  /** 最大重复行比例（0-1） */
  maxDuplicateRatio: number;
  /** 必填字段列表 */
  requiredFields?: string[];
  /** 字段类型定义 */
  fieldTypes?: {
    [fieldName: string]: 'string' | 'number' | 'date' | 'boolean';
  };
  /** 自定义验证规则 */
  customRules?: ValidationRule[];
}

/**
 * 验证规则接口
 * @description 单个验证规则的定义
 */
export interface ValidationRule {
  /** 规则ID */
  id: string;
  /** 规则名称 */
  name: string;
  /** 规则类型 */
  type: 'required' | 'pattern' | 'range' | 'custom' | 'internal_control';
  /** 规则条件（JavaScript表达式） */
  condition: string;
  /** 错误消息 */
  errorMessage: string;
  /** 规则级别 */
  level: ValidationLevel;
  /** 是否启用 */
  enabled: boolean;
  /** 规则描述 */
  description?: string;
}

/**
 * 验证选项接口
 * @description 验证操作的选项
 */
export interface ValidationOptions {
  /** 严格模式 */
  strict?: boolean;
  /** 静默模式（不抛出异常） */
  silent?: boolean;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 是否并行验证 */
  parallel?: boolean;
  /** 最大并行数 */
  maxParallel?: number;
  /** 是否中断于第一个错误 */
  stopOnError?: boolean;
  /** 是否返回详细信息 */
  verbose?: boolean;
}

/**
 * 验证报告接口
 * @description 完整的验证报告
 */
export interface ValidationReport {
  /** 报告ID */
  id: string;
  /** 任务ID */
  taskId: string;
  /** 验证结果 */
  result: ValidationResult;
  /** 验证时间 */
  validatedAt: number;
  /** 验证人/系统 */
  validator: string;
  /** 报告元数据 */
  metadata: {
    /** 验证的数据源 */
    dataSource: string;
    /** 验证的数据范围 */
    dataRange?: {
      startRow: number;
      endRow: number;
    };
    /** 验证版本 */
    version: string;
  };
}

/**
 * Excel元数据接口
 * @description Excel文件的元数据，用于验证
 */
export interface ExcelMetadata {
  /** 文件名 */
  fileName: string;
  /** Sheet名称列表 */
  sheetNames: string[];
  /** Sheet详细信息 */
  sheets: {
    [sheetName: string]: {
      /** 行数 */
      rowCount: number;
      /** 列数 */
      columnCount: number;
      /** 列信息 */
      columns: {
        name: string;
        type: 'string' | 'number' | 'date' | 'boolean';
        nullable: boolean;
        sampleValues: any[];
      }[];
      /** 是否有空值 */
      hasEmptyValues: boolean;
    };
  };
}

/**
 * 验证警告接口
 * @description 验证过程中的警告信息
 */
export interface ValidationWarning {
  /** 警告级别 */
  level: ValidationLevel;
  /** 警告码 */
  code: string;
  /** 警告消息 */
  message: string;
  /** 修复建议 */
  suggestion?: string;
  /** 警告详情 */
  details?: {
    [key: string]: any;
  };
}
