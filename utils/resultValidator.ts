/**
 * 智能验证工具
 * 用于验证 AI 生成的结果是否符合预期
 */

import type {
  ExcelMetadata,
  ValidationResult,
  ValidationWarning,
  ValidationWarningLevel,
  ValidationConfig,
  ValidationOptions
} from '../types/validationTypes';

/**
 * 默认验证配置
 */
const DEFAULT_CONFIG: ValidationConfig = {
  checkRowCount: true,
  checkColumnCount: true,
  checkNumericRange: true,
  checkDataQuality: true,
  numericRange: {
    min: -1e10,
    max: 1e10
  },
  maxMissingRatio: 0.5,
  maxDuplicateRatio: 0.3
};

/**
 * 验证结果
 *
 * @param result - 执行结果
 * @param metadata - Excel 元数据
 * @param config - 验证配置
 * @param options - 验证选项
 * @returns 验证结果
 */
export async function validateResult(
  result: any,
  metadata: ExcelMetadata,
  config?: Partial<ValidationConfig>,
  options?: ValidationOptions
): Promise<ValidationResult> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const warnings: ValidationWarning[] = [];
  const metrics: any = {};

  // 获取输入数据的行数和列数
  const inputSheet = metadata.sheets[metadata.sheetNames[0]];
  const inputRowCount = inputSheet?.rowCount || 0;
  const inputColumnCount = inputSheet?.columnCount || 0;

  // 检查行数
  if (finalConfig.checkRowCount) {
    const outputRowCount = result.rows ?? result.data?.length ?? 0;
    metrics.rowCount = outputRowCount;

    if (outputRowCount === 0) {
      warnings.push({
        level: 'error',
        code: 'EMPTY_RESULT',
        message: '输出结果为空',
        suggestion: '请检查代码逻辑，确保有数据输出'
      });
    } else if (outputRowCount !== inputRowCount) {
      warnings.push({
        level: 'warning',
        code: 'ROW_COUNT_MISMATCH',
        message: `输出行数 (${outputRowCount}) 与输入行数 (${inputRowCount}) 不一致`,
        suggestion: '如果这是预期行为（如过滤、聚合），可以忽略此警告',
        details: {
          inputRows: inputRowCount,
          outputRows: outputRowCount,
          difference: Math.abs(outputRowCount - inputRowCount)
        }
      });
    }
  }

  // 检查列数
  if (finalConfig.checkColumnCount) {
    let outputColumnCount = 0;

    if (result.columns && Array.isArray(result.columns)) {
      outputColumnCount = result.columns.length;
    } else if (result.data && result.data.length > 0) {
      outputColumnCount = Object.keys(result.data[0]).length;
    } else if (Array.isArray(result) && result.length > 0) {
      outputColumnCount = Object.keys(result[0]).length;
    }

    metrics.columnCount = outputColumnCount;

    if (outputColumnCount === 0) {
      warnings.push({
        level: 'error',
        code: 'NO_COLUMNS',
        message: '输出结果没有列',
        suggestion: '请检查数据处理逻辑，确保有列输出'
      });
    } else if (outputColumnCount > inputColumnCount * 2) {
      warnings.push({
        level: 'warning',
        code: 'TOO_MANY_COLUMNS',
        message: `输出列数 (${outputColumnCount}) 远多于输入列数 (${inputColumnCount})`,
        suggestion: '请确认是否生成了过多中间列',
        details: {
          inputColumns: inputColumnCount,
          outputColumns: outputColumnCount
        }
      });
    }
  }

  // 检查数值范围
  if (finalConfig.checkNumericRange) {
    const numericSummary = extractNumericSummary(result);
    metrics.numericSummary = numericSummary;

    if (numericSummary) {
      const { min, max } = numericSummary;
      const { min: minLimit, max: maxLimit } = finalConfig.numericRange;

      if ((minLimit !== undefined && min < minLimit) || (maxLimit !== undefined && max > maxLimit)) {
        warnings.push({
          level: 'warning',
          code: 'NUMERIC_RANGE_ABNORMAL',
          message: `数值范围异常 [${min.toFixed(2)}, ${max.toFixed(2)}]`,
          suggestion: '请检查计算逻辑，确认数值范围是否合理',
          details: { min, max }
        });
      }

      // 检查是否包含 NaN 或 Infinity
      if (Number.isNaN(min) || Number.isNaN(max) || !Number.isFinite(min) || !Number.isFinite(max)) {
        warnings.push({
          level: 'error',
          code: 'INVALID_NUMERIC_VALUES',
          message: '结果包含 NaN 或 Infinity',
          suggestion: '请检查数据类型转换和计算逻辑'
        });
      }
    }
  }

  // 检查数据质量
  if (finalConfig.checkDataQuality && result.data) {
    const qualityMetrics = analyzeDataQuality(result.data);
    metrics.dataQuality = qualityMetrics;

    // 检查缺失值比例
    if (qualityMetrics.missingValues > 0) {
      const missingRatio = qualityMetrics.missingValues / (result.data.length * (result.columns?.length || 1));
      if (missingRatio > finalConfig.maxMissingRatio) {
        warnings.push({
          level: 'warning',
          code: 'HIGH_MISSING_RATIO',
          message: `缺失值比例过高 (${(missingRatio * 100).toFixed(1)}%)`,
          suggestion: '考虑使用填充或删除策略处理缺失值',
          details: { missingRatio }
        });
      }
    }

    // 检查重复行比例
    if (qualityMetrics.duplicateRows > 0) {
      const duplicateRatio = qualityMetrics.duplicateRows / result.data.length;
      if (duplicateRatio > finalConfig.maxDuplicateRatio) {
        warnings.push({
          level: 'info',
          code: 'HIGH_DUPLICATE_RATIO',
          message: `重复行比例较高 (${(duplicateRatio * 100).toFixed(1)}%)`,
          suggestion: '如果不需要重复数据，可以考虑去重',
          details: { duplicateRatio }
        });
      }
    }

    // 检查类型不一致
    if (qualityMetrics.inconsistentTypes > 0) {
      warnings.push({
        level: 'warning',
        code: 'INCONSISTENT_TYPES',
        message: `检测到 ${qualityMetrics.inconsistentTypes} 列存在类型不一致`,
        suggestion: '建议进行数据类型标准化处理'
      });
    }
  }

  // 计算验证得分
  const score = calculateValidationScore(warnings);

  // 确定整体验证状态
  const hasErrors = warnings.some(w => w.level === 'error' || w.level === 'critical');
  const valid = !hasErrors;

  return {
    valid,
    warnings,
    score,
    metrics
  };
}

/**
 * 提取数值摘要
 */
function extractNumericSummary(result: any): { sum: number; min: number; max: number; avg: number } | null {
  let values: number[] = [];

  // 从不同的数据结构中提取数值
  if (result.data && Array.isArray(result.data)) {
    // 从数据行中提取所有数值
    result.data.forEach((row: any) => {
      if (typeof row === 'object') {
        Object.values(row).forEach(val => {
          if (typeof val === 'number' && Number.isFinite(val)) {
            values.push(val);
          }
        });
      }
    });
  } else if (Array.isArray(result)) {
    result.forEach((row: any) => {
      if (typeof row === 'object') {
        Object.values(row).forEach(val => {
          if (typeof val === 'number' && Number.isFinite(val)) {
            values.push(val);
          }
        });
      }
    });
  }

  if (values.length === 0) {
    return null;
  }

  const sum = values.reduce((a, b) => a + b, 0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = sum / values.length;

  return { sum, min, max, avg };
}

/**
 * 分析数据质量
 */
function analyzeDataQuality(data: any[]): {
  missingValues: number;
  duplicateRows: number;
  inconsistentTypes: number;
} {
  let missingValues = 0;
  let duplicateRows = 0;
  let inconsistentTypes = 0;

  if (!Array.isArray(data) || data.length === 0) {
    return { missingValues, duplicateRows, inconsistentTypes };
  }

  const columns = Object.keys(data[0]);
  const seenRows = new Set<string>();

  // 检查缺失值和重复行
  data.forEach(row => {
    const rowString = JSON.stringify(row);

    if (seenRows.has(rowString)) {
      duplicateRows++;
    } else {
      seenRows.add(rowString);
    }

    columns.forEach(col => {
      if (row[col] === null || row[col] === undefined || row[col] === '') {
        missingValues++;
      }
    });
  });

  // 检查类型不一致
  columns.forEach(col => {
    const types = new Set<string>();
    data.forEach(row => {
      const val = row[col];
      if (val !== null && val !== undefined) {
        types.add(typeof val);
      }
    });

    if (types.size > 1) {
      inconsistentTypes++;
    }
  });

  return { missingValues, duplicateRows, inconsistentTypes };
}

/**
 * 计算验证得分
 */
function calculateValidationScore(warnings: ValidationWarning[]): number {
  if (warnings.length === 0) {
    return 100;
  }

  let score = 100;
  warnings.forEach(warning => {
    switch (warning.level) {
      case 'critical':
        score -= 25;
        break;
      case 'error':
        score -= 15;
        break;
      case 'warning':
        score -= 5;
        break;
      case 'info':
        score -= 1;
        break;
    }
  });

  return Math.max(0, score);
}

/**
 * 快速验证（仅检查关键问题）
 */
export function quickValidate(result: any): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  // 检查结果是否存在
  if (!result) {
    issues.push('结果为空');
    return { valid: false, issues };
  }

  // 检查数据
  const data = result.data ?? result;
  if (!Array.isArray(data) || data.length === 0) {
    issues.push('没有数据输出');
  }

  // 检查是否有错误
  if (result.error) {
    issues.push(`执行错误: ${result.error}`);
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

/**
 * 导出类型
 */
export type { ExcelMetadata, ValidationResult, ValidationWarning, ValidationConfig };
