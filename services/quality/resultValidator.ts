/**
 * 结果验证器
 *
 * 负责验证查询结果的合理性、一致性和异常值检测
 *
 * @module services/quality/resultValidator
 * @version 1.0.0
 */

import {
  QueryResult,
  StructureValidationResult,
  RangeValidationResult,
  ConsistencyValidationResult,
  OutlierDetectionResult,
  OutOfRangeValue,
  InconsistencyItem,
  OutlierValue
} from './aiOutputValidator';

// ============================================================
// 结果验证器类
// ============================================================

/**
 * 结果验证器
 *
 * 验证查询结果的合理性
 */
export class ResultValidator {
  /**
   * 验证结果结构
   */
  validateStructure(result: QueryResult, expectedShape?: any): StructureValidationResult {
    if (!result.data || result.data.length === 0) {
      return {
        matches: true, // 空结果视为有效
        actualColumns: []
      };
    }

    // 获取实际列名
    const actualColumns = Object.keys(result.data[0]);

    if (!expectedShape) {
      // 没有预期形状，只返回实际结构
      return {
        matches: true,
        actualColumns
      };
    }

    // 如果expectedShape是数组，表示预期的列名
    const expectedColumns = Array.isArray(expectedShape) ? expectedShape : [];

    // 检查缺失列
    const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col));

    // 检查额外列
    const extraColumns = actualColumns.filter(col => !expectedColumns.includes(col));

    // 判断是否匹配
    const matches = missingColumns.length === 0;

    return {
      matches,
      expectedColumns,
      actualColumns,
      missingColumns: missingColumns.length > 0 ? missingColumns : undefined,
      extraColumns: extraColumns.length > 0 ? extraColumns : undefined
    };
  }

  /**
   * 验证结果范围
   */
  validateRange(
    result: QueryResult,
    constraints: Record<string, { min?: number; max?: number }>
  ): RangeValidationResult {
    const outOfRangeValues: OutOfRangeValue[] = [];

    if (!result.data || result.data.length === 0) {
      return {
        inRange: true,
        outOfRangeValues: []
      };
    }

    // 检查每一行的每一列
    result.data.forEach((row, rowIndex) => {
      Object.entries(row).forEach(([column, value]) => {
        // 只检查数值类型
        if (typeof value === 'number' && constraints[column]) {
          const { min, max } = constraints[column];

          if (min !== undefined && value < min) {
            outOfRangeValues.push({
              column,
              rowIndex,
              actualValue: value,
              min
            });
          }

          if (max !== undefined && value > max) {
            outOfRangeValues.push({
              column,
              rowIndex,
              actualValue: value,
              max
            });
          }
        }
      });
    });

    return {
      inRange: outOfRangeValues.length === 0,
      outOfRangeValues
    };
  }

  /**
   * 验证结果一致性
   */
  validateConsistency(
    result: QueryResult,
    history: QueryResult[]
  ): ConsistencyValidationResult {
    const inconsistencies: InconsistencyItem[] = [];

    if (!history || history.length === 0) {
      // 没有历史数据，无法比较
      return {
        consistent: true,
        score: 100,
        inconsistencies: []
      };
    }

    if (!result.data || result.data.length === 0) {
      return {
        consistent: true,
        score: 100,
        inconsistencies: []
      };
    }

    const currentColumns = Object.keys(result.data[0]);

    // 比较列的一致性
    for (const histResult of history) {
      if (!histResult.data || histResult.data.length === 0) continue;

      const histColumns = histResult.columns || Object.keys(histResult.data[0]);

      // 检查列数变化
      if (currentColumns.length !== histColumns.length) {
        inconsistencies.push({
          column: '*',
          issue: `列数不一致: 当前${currentColumns.length}列，历史${histColumns.length}列`,
          severity: 'medium'
        });
      }

      // 检查列名变化
      const newColumns = currentColumns.filter(col => !histColumns.includes(col));
      const missingColumns = histColumns.filter(col => !currentColumns.includes(col));

      if (newColumns.length > 0) {
        inconsistencies.push({
          column: newColumns.join(', '),
          issue: `新增列: ${newColumns.join(', ')}`,
          severity: 'low'
        });
      }

      if (missingColumns.length > 0) {
        inconsistencies.push({
          column: missingColumns.join(', '),
          issue: `缺失列: ${missingColumns.join(', ')}`,
          severity: 'medium'
        });
      }

      // 检查行数变化（如果差异超过50%）
      const rowDiffRatio = Math.abs(result.rowCount - histResult.rowCount) / histResult.rowCount;
      if (rowDiffRatio > 0.5) {
        inconsistencies.push({
          column: '*',
          issue: `行数显著变化: 当前${result.rowCount}行，历史${histResult.rowCount}行 (${Math.round(rowDiffRatio * 100)}%差异)`,
          severity: 'low'
        });
      }
    }

    // 计算一致性分数
    let score = 100;
    inconsistencies.forEach(inc => {
      if (inc.severity === 'high') score -= 20;
      else if (inc.severity === 'medium') score -= 10;
      else if (inc.severity === 'low') score -= 5;
    });

    return {
      consistent: inconsistencies.length === 0,
      score: Math.max(0, score),
      inconsistencies
    };
  }

  /**
   * 检测异常值
   */
  detectOutliers(result: QueryResult): OutlierDetectionResult {
    const outliers: OutlierValue[] = [];

    if (!result.data || result.data.length < 3) {
      // 数据太少，无法检测异常值
      return {
        detected: false,
        outliers: []
      };
    }

    const columns = Object.keys(result.data[0]);

    for (const column of columns) {
      // 只检测数值列
      const values = result.data
        .map(row => row[column])
        .filter(val => typeof val === 'number');

      if (values.length < 3) continue;

      // 使用IQR方法检测异常值
      const sorted = [...values].sort((a, b) => a - b);
      const q1Index = Math.floor(sorted.length * 0.25);
      const q3Index = Math.floor(sorted.length * 0.75);
      const q1 = sorted[q1Index];
      const q3 = sorted[q3Index];
      const iqr = q3 - q1;
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;

      // 检测超出范围的值
      result.data.forEach((row, rowIndex) => {
        const value = row[column];
        if (typeof value === 'number') {
          if (value < lowerBound || value > upperBound) {
            // 计算偏离程度（以标准差为单位）
            const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
            const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
            const stdDev = Math.sqrt(variance);
            const deviation = Math.abs((value - mean) / stdDev);

            outliers.push({
              column,
              rowIndex,
              value,
              deviation
            });
          }
        }
      });
    }

    return {
      detected: outliers.length > 0,
      outliers
    };
  }

  /**
   * 检测空值比例
   */
  checkNullRatio(result: QueryResult): Record<string, { ratio: number; count: number }> {
    const nullRatios: Record<string, { ratio: number; count: number }> = {};

    if (!result.data || result.data.length === 0) {
      return nullRatios;
    }

    const columns = Object.keys(result.data[0]);

    for (const column of columns) {
      const nullCount = result.data.filter(row => {
        const value = row[column];
        return value === null || value === undefined || value === '';
      }).length;

      nullRatios[column] = {
        count: nullCount,
        ratio: nullCount / result.rowCount
      };
    }

    return nullRatios;
  }

  /**
   * 验证数据类型一致性
   */
  validateDataTypeConsistency(result: QueryResult): Record<string, { consistent: boolean; types: Set<string> }> {
    const typeInfo: Record<string, { consistent: boolean; types: Set<string> }> = {};

    if (!result.data || result.data.length === 0) {
      return typeInfo;
    }

    const columns = Object.keys(result.data[0]);

    for (const column of columns) {
      const types = new Set<string>();

      result.data.forEach(row => {
        const value = row[column];
        let type = typeof value;

        // 更细致的类型分类
        if (type === 'number') {
          type = Number.isInteger(value) ? 'integer' : 'float';
        } else if (type === 'string') {
          // 尝试检测日期字符串
          if (!isNaN(Date.parse(value))) {
            type = 'date';
          }
        }

        types.add(type);
      });

      typeInfo[column] = {
        consistent: types.size <= 1,
        types
      };
    }

    return typeInfo;
  }

  /**
   * 检测重复行
   */
  detectDuplicates(result: QueryResult): { count: number; ratio: number; duplicates: any[] } {
    if (!result.data || result.data.length === 0) {
      return { count: 0, ratio: 0, duplicates: [] };
    }

    const seen = new Set<string>();
    const duplicates: any[] = [];

    result.data.forEach(row => {
      const signature = JSON.stringify(row);
      if (seen.has(signature)) {
        duplicates.push(row);
      } else {
        seen.add(signature);
      }
    });

    return {
      count: duplicates.length,
      ratio: duplicates.length / result.rowCount,
      duplicates
    };
  }

  /**
   * 验证数值精度
   */
  validateNumericPrecision(result: QueryResult): Record<string, { maxPrecision: number; hasIssues: boolean }> {
    const precisionInfo: Record<string, { maxPrecision: number; hasIssues: boolean }> = {};

    if (!result.data || result.data.length === 0) {
      return precisionInfo;
    }

    const columns = Object.keys(result.data[0]);

    for (const column of columns) {
      const numericValues = result.data
        .map(row => row[column])
        .filter(val => typeof val === 'number' && !Number.isInteger(val));

      if (numericValues.length === 0) continue;

      let maxPrecision = 0;

      numericValues.forEach(value => {
        const str = value.toString();
        const decimalPart = str.split('.')[1];
        if (decimalPart) {
          maxPrecision = Math.max(maxPrecision, decimalPart.length);
        }
      });

      // 如果有小数点后超过10位的数字，标记为有问题
      precisionInfo[column] = {
        maxPrecision,
        hasIssues: maxPrecision > 10
      };
    }

    return precisionInfo;
  }
}

// ============================================================
// 默认导出
// ============================================================

export default ResultValidator;
