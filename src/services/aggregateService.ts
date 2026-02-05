/**
 * 数据聚合服务
 *
 * 功能：
 * - 支持多种聚合操作（SUM, AVG, COUNT, MAX, MIN, FIRST, LAST, JOIN）
 * - 支持分组聚合
 * - 自动推断聚合字段（当配置为空时）
 *
 * @version 1.0.0
 */

import { AggregateRule, AggregateConfig, AggregateOperation } from '../types/documentTypes';

/**
 * 聚合计算结果
 */
export interface AggregateResult {
  [key: string]: any;
}

/**
 * 执行聚合操作
 *
 * @param data 原始数据数组
 * @param config 聚合配置
 * @returns 聚合结果
 */
export function executeAggregate(data: any[], config: AggregateConfig): AggregateResult[] {
  // 如果配置了分组字段，执行分组聚合
  if (config.groupBy && config.groupBy.length > 0) {
    return executeGroupByAggregate(data, config);
  }

  // 否则执行全局聚合（返回单个结果对象）
  const result = executeRulesOnData(data, config.rules);
  return [result];
}

/**
 * 分组聚合
 */
function executeGroupByAggregate(data: any[], config: AggregateConfig): AggregateResult[] {
  const groups = new Map<string, any[]>();

  // 按分组字段组织数据
  data.forEach(row => {
    const groupKey = config.groupBy!.map(field => String(row[field] || '')).join('|||');

    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }

    groups.get(groupKey)!.push(row);
  });

  // 对每个分组执行聚合
  const results: AggregateResult[] = [];

  groups.forEach((groupData, groupKey) => {
    const groupValues = groupKey.split('|||');

    const result: AggregateResult = executeRulesOnData(groupData, config.rules);

    // 添加分组字段到结果
    config.groupBy!.forEach((field, index) => {
      result[field] = groupValues[index];
    });

    results.push(result);
  });

  return results;
}

/**
 * 对数据执行聚合规则
 */
function executeRulesOnData(data: any[], rules: AggregateRule[]): AggregateResult {
  const result: AggregateResult = {};

  rules.forEach(rule => {
    const { field, operation, alias, delimiter } = rule;
    const resultField = alias || `${operation}_${field}`;

    result[resultField] = applyAggregateOperation(data, field, operation, delimiter);
  });

  return result;
}

/**
 * 应用单个聚合操作
 */
function applyAggregateOperation(
  data: any[],
  field: string,
  operation: AggregateOperation,
  delimiter?: string
): any {
  if (data.length === 0) {
    return getDefaultValue(operation);
  }

  const values = data.map(row => row[field]).filter(v => v !== null && v !== undefined);

  switch (operation) {
    case 'sum':
      return values.reduce((sum, val) => sum + Number(val || 0), 0);

    case 'avg':
      if (values.length === 0) return 0;
      const sum = values.reduce((s, val) => s + Number(val || 0), 0);
      return Number((sum / values.length).toFixed(2));

    case 'count':
      return values.length;

    case 'max':
      return Math.max(...values.map(v => Number(v || 0)));

    case 'min':
      return Math.min(...values.map(v => Number(v || 0)));

    case 'first':
      return values[0];

    case 'last':
      return values[values.length - 1];

    case 'join':
      return values.join(delimiter || ', ');

    default:
      throw new Error(`不支持的聚合操作: ${operation}`);
  }
}

/**
 * 获取聚合操作的默认值
 */
function getDefaultValue(operation: AggregateOperation): any {
  switch (operation) {
    case 'sum':
    case 'avg':
    case 'max':
    case 'min':
      return 0;
    case 'count':
      return 0;
    case 'first':
    case 'last':
    case 'join':
      return '';
    default:
      return null;
  }
}

/**
 * 自动推断聚合配置
 *
 * 根据模板占位符和Excel列名，推断合理的聚合规则
 *
 * @param placeholders 模板占位符列表
 * @param excelHeaders Excel列名列表
 * @returns 推断的聚合配置
 */
export function inferAggregateConfig(
  placeholders: string[],
  excelHeaders: string[]
): AggregateConfig {
  const rules: AggregateRule[] = [];
  const numericFields = excelHeaders.filter(header =>
    isNumericField(header, placeholders)
  );

  // 为数值字段推断聚合操作
  numericFields.forEach(field => {
    const matchingPlaceholders = placeholders.filter(p =>
      p.toLowerCase().includes(field.toLowerCase()) ||
      p.toLowerCase().includes('总') ||
      p.toLowerCase().includes('sum') ||
      p.toLowerCase().includes('合计')
    );

    if (matchingPlaceholders.length > 0) {
      // 匹配到"总计"、"合计"等关键词，使用SUM
      rules.push({
        field,
        operation: 'sum',
        alias: field
      });
    } else if (
      field.toLowerCase().includes('数量') ||
      field.toLowerCase().includes('count') ||
      field.toLowerCase().includes('总数')
    ) {
      rules.push({
        field,
        operation: 'count',
        alias: field
      });
    } else if (
      field.toLowerCase().includes('金额') ||
      field.toLowerCase().includes('价格') ||
      field.toLowerCase().includes('销售额')
    ) {
      rules.push({
        field,
        operation: 'sum',
        alias: `总${field}`
      });
    }
  });

  return { rules };
}

/**
 * 判断字段是否为数值类型
 */
function isNumericField(fieldName: string, placeholders: string[]): boolean {
  const numericKeywords = [
    '金额', '价格', '数量', '总计', '合计', '总和', '平均',
    'amount', 'price', 'count', 'total', 'sum', 'avg',
    '销售额', '成本', '利润', '比率', '百分比'
  ];

  const lowerFieldName = fieldName.toLowerCase();
  return numericKeywords.some(keyword =>
    lowerFieldName.includes(keyword) ||
    placeholders.some(p => p.toLowerCase().includes(keyword))
  );
}

/**
 * 验证聚合配置
 *
 * @param config 聚合配置
 * @param dataFields 数据字段列表
 * @returns 验证结果和错误信息
 */
export function validateAggregateConfig(
  config: AggregateConfig,
  dataFields: string[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 验证聚合规则
  if (!config.rules || config.rules.length === 0) {
    errors.push('聚合配置不能为空');
  }

  config.rules.forEach((rule, index) => {
    if (!rule.field) {
      errors.push(`聚合规则${index + 1}: 字段名不能为空`);
    } else if (!dataFields.includes(rule.field)) {
      errors.push(`聚合规则${index + 1}: 字段 "${rule.field}" 在数据中不存在`);
    }

    if (!rule.operation) {
      errors.push(`聚合规则${index + 1}: 聚合操作不能为空`);
    }
  });

  // 验证分组字段
  if (config.groupBy && config.groupBy.length > 0) {
    config.groupBy.forEach((field, index) => {
      if (!dataFields.includes(field)) {
        errors.push(`分组字段${index + 1}: 字段 "${field}" 在数据中不存在`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
