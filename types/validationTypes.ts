/**
 * 智能验证系统类型定义
 * 用于验证 AI 生成的结果是否符合预期
 */

/**
 * Excel 元数据接口
 */
export interface ExcelMetadata {
  fileName: string;
  sheetNames: string[];
  sheets: {
    [sheetName: string]: {
      rowCount: number;
      columnCount: number;
      columns: {
        name: string;
        type: 'string' | 'number' | 'date' | 'boolean';
        nullable: boolean;
        sampleValues: any[];
      }[];
      hasEmptyValues: boolean;
    };
  };
}

/**
 * 验证警告级别
 */
export type ValidationWarningLevel = 'info' | 'warning' | 'error' | 'critical';

/**
 * 验证警告
 */
export interface ValidationWarning {
  level: ValidationWarningLevel;
  code: string;
  message: string;
  suggestion?: string;
  details?: {
    [key: string]: any;
  };
}

/**
 * 验证结果
 */
export interface ValidationResult {
  valid: boolean;
  warnings: ValidationWarning[];
  score: number; // 0-100
  metrics: {
    rowCount?: number;
    columnCount?: number;
    numericSummary?: {
      sum?: number;
      min?: number;
      max?: number;
      avg?: number;
    };
    dataQuality?: {
      missingValues: number;
      duplicateRows: number;
      inconsistentTypes: number;
    };
  };
}

/**
 * 验证配置
 */
export interface ValidationConfig {
  checkRowCount: boolean;
  checkColumnCount: boolean;
  checkNumericRange: boolean;
  checkDataQuality: boolean;
  numericRange: {
    min?: number;
    max?: number;
  };
  maxMissingRatio: number; // 0-1
  maxDuplicateRatio: number; // 0-1
}

/**
 * 验证选项
 */
export interface ValidationOptions {
  strict?: boolean;
  silent?: boolean;
  timeout?: number;
}
