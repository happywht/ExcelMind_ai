/**
 * 本地规则执行器
 * 执行本地规则类型（not_null, format, range, unique, custom）
 */

import {
  QualityRule,
  RuleExecutionResult,
  QualityIssue,
  RuleExecutionOptions,
  LocalRule
} from '../types/qualityRule';

/**
 * 默认执行选项
 */
const DEFAULT_OPTIONS: RuleExecutionOptions = {
  stopOnFirstError: false,
  maxIssues: 1000,
  sampleSize: 0,
  enableCache: true,
  parallel: false
};

/**
 * 本地规则执行器类
 */
export class LocalRuleExecutor {
  private cache: Map<string, RuleExecutionResult> = new Map();

  /**
   * 执行单个规则
   */
  async executeRule(
    rule: QualityRule,
    data: any[],
    options: Partial<RuleExecutionOptions> = {}
  ): Promise<RuleExecutionResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const startTime = Date.now();

    // 检查缓存
    if (opts.enableCache) {
      const cacheKey = this.getCacheKey(rule, data);
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // 如果没有本地规则定义，返回错误
    if (!rule.localRule) {
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        pass: false,
        issues: [],
        summary: '规则未定义本地执行逻辑',
        suggestions: ['请使用AI执行或定义本地规则'],
        executionTime: Date.now() - startTime,
        checkedRows: 0,
        issueRows: 0
      };
    }

    // 确定目标列
    const targetColumns = rule.targetColumns.length > 0
      ? rule.targetColumns
      : this.detectTargetColumns(rule, data);

    if (targetColumns.length === 0) {
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        pass: true,
        issues: [],
        summary: '未检测到目标列',
        suggestions: ['请手动指定要检查的列'],
        executionTime: Date.now() - startTime,
        checkedRows: 0,
        issueRows: 0
      };
    }

    // 根据规则类型执行
    let issues: QualityIssue[] = [];
    switch (rule.localRule.type) {
      case 'not_null':
        issues = this.checkNotNull(rule, data, targetColumns, opts);
        break;
      case 'format':
        issues = this.checkFormat(rule, data, targetColumns, opts);
        break;
      case 'range':
        issues = this.checkRange(rule, data, targetColumns, opts);
        break;
      case 'unique':
        issues = this.checkUnique(rule, data, targetColumns, opts);
        break;
      case 'custom':
        issues = this.checkCustom(rule, data, targetColumns, opts);
        break;
      default:
        issues = [];
    }

    // 构建结果
    const result: RuleExecutionResult = {
      ruleId: rule.id,
      ruleName: rule.name,
      pass: issues.length === 0,
      issues: issues.slice(0, opts.maxIssues),
      summary: this.buildSummary(rule, issues, data.length, targetColumns),
      suggestions: this.buildSuggestions(rule, issues),
      executionTime: Date.now() - startTime,
      checkedRows: data.length,
      issueRows: new Set(issues.map(i => i.row)).size
    };

    // 缓存结果
    if (opts.enableCache) {
      const cacheKey = this.getCacheKey(rule, data);
      this.cache.set(cacheKey, result);
    }

    return result;
  }

  /**
   * 检测目标列
   */
  private detectTargetColumns(rule: QualityRule, data: any[]): string[] {
    if (data.length === 0) return [];

    const columns = Object.keys(data[0]);

    // ✅ 优先使用targetColumns（如果已指定）
    if (rule.targetColumns && rule.targetColumns.length > 0) {
      return rule.targetColumns.filter(col => columns.includes(col));
    }

    // ✅ 从checkContent中智能提取列名
    // 匹配"包含X的列"或"X、Y、Z列"等模式
    const checkContent = rule.checkContent.toLowerCase();

    // 尝试多种匹配模式
    const patterns = [
      /包含["'](.+?)["']的列/,  // 包含"邮箱、手机号"的列
      /["'](.+?)["']列/,        // "邮箱"列
      /检查["'](.+?)["']/       // 检查"邮箱"
    ];

    for (const pattern of patterns) {
      const match = checkContent.match(pattern);
      if (match && match[1]) {
        const keywords = match[1].split(/[,，、]/).map(s => s.trim().toLowerCase());
        const matched = columns.filter(col =>
          keywords.some(kw =>
            col.toLowerCase().includes(kw) ||
            kw.includes(col.toLowerCase())
          )
        );
        if (matched.length > 0) {
          return matched;
        }
      }
    }

    // ✅ 如果无法匹配，尝试从exampleColumns中推断
    if (rule.localRule && 'exampleColumns' in rule) {
      const exampleColumns = (rule as any).exampleColumns || [];
      const matched = columns.filter(col =>
        exampleColumns.some((ex: string) =>
          col.toLowerCase().includes(ex.toLowerCase()) ||
          ex.toLowerCase().includes(col.toLowerCase())
        )
      );
      if (matched.length > 0) {
        return matched;
      }
    }

    // ❌ 如果都无法匹配，返回空（让用户手动指定）
    return [];
  }

  /**
   * 非空检查
   */
  private checkNotNull(
    rule: QualityRule,
    data: any[],
    columns: string[],
    options: RuleExecutionOptions
  ): QualityIssue[] {
    const issues: QualityIssue[] = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      for (const col of columns) {
        const value = row[col];

        // ✅ 改进的空值判断逻辑
        // 1. 明确的空值：null、undefined
        // 2. 空字符串：''
        // 3. 纯空白字符串：只包含空格、制表符、换行等
        // ❌ 不包括：数字0、布尔false、空数组、空对象
        const isEmpty = value === null ||
                       value === undefined ||
                       value === '' ||
                       (typeof value === 'string' && value.trim() === '');

        if (isEmpty) {
          issues.push({
            row: i + 1,
            column: col,
            value: value,
            description: `字段 "${col}" 为空`,
            severity: rule.severity,
            suggestion: `请填写 ${col} 字段`
          });

          if (options.stopOnFirstError) return issues;
        }
      }
    }

    return issues;
  }

  /**
   * 格式检查（正则）
   */
  private checkFormat(
    rule: QualityRule,
    data: any[],
    columns: string[],
    options: RuleExecutionOptions
  ): QualityIssue[] {
    const issues: QualityIssue[] = [];
    const pattern = rule.localRule?.params?.pattern;

    if (!pattern) {
      return issues;
    }

    const regex = new RegExp(pattern);

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      for (const col of columns) {
        const value = row[col];

        if (value !== null && value !== undefined && value !== '') {
          const strValue = String(value).trim();
          if (!regex.test(strValue)) {
            issues.push({
              row: i + 1,
              column: col,
              value: value,
              description: `字段 "${col}" 的格式不符合要求: ${value}`,
              severity: rule.severity,
              suggestion: `请检查 ${col} 字段格式是否正确`
            });

            if (options.stopOnFirstError) return issues;
          }
        }
      }
    }

    return issues;
  }

  /**
   * 范围检查
   */
  private checkRange(
    rule: QualityRule,
    data: any[],
    columns: string[],
    options: RuleExecutionOptions
  ): QualityIssue[] {
    const issues: QualityIssue[] = [];
    const min = rule.localRule?.params?.min;
    const max = rule.localRule?.params?.max;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      for (const col of columns) {
        const value = row[col];

        if (value === null || value === undefined || value === '') {
          continue;
        }

        let numValue: number;

        // 处理日期
        if (value instanceof Date) {
          numValue = value.getTime();
        } else if (typeof value === 'string' && !isNaN(Date.parse(value))) {
          numValue = new Date(value).getTime();
        }
        // 处理数字
        else if (typeof value === 'number') {
          numValue = value;
        } else {
          continue;
        }

        // 检查范围
        if (min !== undefined && numValue < min) {
          issues.push({
            row: i + 1,
            column: col,
            value: value,
            description: `字段 "${col}" 的值 ${value} 小于最小值 ${min}`,
            severity: rule.severity,
            suggestion: `请将 ${col} 字段的值调整为大于或等于 ${min}`
          });
        }

        if (max !== undefined && numValue > max) {
          issues.push({
            row: i + 1,
            column: col,
            value: value,
            description: `字段 "${col}" 的值 ${value} 大于最大值 ${max}`,
            severity: rule.severity,
            suggestion: `请将 ${col} 字段的值调整为小于或等于 ${max}`
          });
        }

        if (options.stopOnFirstError && issues.length > 0) return issues;
      }
    }

    return issues;
  }

  /**
   * 唯一性检查
   */
  private checkUnique(
    rule: QualityRule,
    data: any[],
    columns: string[],
    options: RuleExecutionOptions
  ): QualityIssue[] {
    const issues: QualityIssue[] = [];

    for (const col of columns) {
      const valueMap = new Map<any, number[]>();

      // 统计每个值出现的行
      for (let i = 0; i < data.length; i++) {
        const value = data[i][col];
        if (value !== null && value !== undefined && value !== '') {
          const rows = valueMap.get(value) || [];
          rows.push(i + 1);
          valueMap.set(value, rows);
        }
      }

      // 找出重复的值
      valueMap.forEach((rows, value) => {
        if (rows.length > 1) {
          for (const row of rows) {
            issues.push({
              row: row,
              column: col,
              value: value,
              description: `字段 "${col}" 的值 "${value}" 重复出现 ${rows.length} 次`,
              severity: rule.severity,
              suggestion: `请确保 ${col} 字段的值唯一`
            });
          }

          if (options.stopOnFirstError) return issues;
        }
      });
    }

    return issues;
  }

  /**
   * 自定义检查
   */
  private checkCustom(
    rule: QualityRule,
    data: any[],
    columns: string[],
    options: RuleExecutionOptions
  ): QualityIssue[] {
    const issues: QualityIssue[] = [];
    const maxLength = rule.localRule?.params?.maxLength;

    if (maxLength !== undefined) {
      // 长度检查
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        for (const col of columns) {
          const value = row[col];

          if (value !== null && value !== undefined) {
            const strValue = String(value);
            if (strValue.length > maxLength) {
              issues.push({
                row: i + 1,
                column: col,
                value: value,
                description: `字段 "${col}" 的长度 ${strValue.length} 超过最大长度 ${maxLength}`,
                severity: rule.severity,
                suggestion: `请将 ${col} 字段的长度缩短到 ${maxLength} 字符以内`
              });

              if (options.stopOnFirstError) return issues;
            }
          }
        }
      }
    }

    return issues;
  }

  /**
   * 构建执行摘要
   */
  private buildSummary(rule: QualityRule, issues: QualityIssue[], totalRows: number, columns: string[]): string {
    if (issues.length === 0) {
      return `✅ 通过：检查了 ${totalRows} 行数据，${columns.join(', ')} 列符合规则`;
    }

    const issueRows = new Set(issues.map(i => i.row)).size;
    const bySeverity = issues.reduce((acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const severityText = Object.entries(bySeverity)
      .map(([severity, count]) => `${severity}: ${count}个`)
      .join(', ');

    return `❌ 不通过：${issueRows} 行有问题，共 ${issues.length} 个问题 (${severityText})`;
  }

  /**
   * 构建修复建议
   */
  private buildSuggestions(rule: QualityRule, issues: QualityIssue[]): string[] {
    if (issues.length === 0) return ['数据质量良好，继续保持'];

    const suggestions = new Set<string>();

    // 从问题中提取建议
    issues.forEach(issue => {
      if (issue.suggestion) {
        suggestions.add(issue.suggestion);
      }
    });

    // 添加通用建议
    if (rule.severity === 'P0') {
      suggestions.add('这是阻塞性问题，必须修复才能继续处理');
    }

    return Array.from(suggestions).slice(0, 5);
  }

  /**
   * 生成缓存键
   */
  private getCacheKey(rule: QualityRule, data: any[]): string {
    return `${rule.id}_${data.length}_${JSON.stringify(rule.targetColumns)}`;
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存大小
   */
  getCacheSize(): number {
    return this.cache.size;
  }
}

// 导出单例
export const localRuleExecutor = new LocalRuleExecutor();
