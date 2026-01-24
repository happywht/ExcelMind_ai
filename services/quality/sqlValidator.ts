/**
 * SQL验证器
 *
 * 负责验证SQL语法、检测注入、验证标识符和评估复杂度
 *
 * @module services/quality/sqlValidator
 * @version 1.0.0
 */

import { DatabaseSchema, SyntaxValidationResult, InjectionCheckResult, IdentifierValidationResult, ComplexityValidationResult, DangerousOperation } from './aiOutputValidator';

// ============================================================
// 类型定义
// ============================================================

/**
 * 语法验证结果（内部）
 */
interface InternalSyntaxValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误信息 */
  error?: string;
  /** 错误位置 */
  errorPosition?: { line: number; column: number };
}

/**
 * SQL令牌
 */
interface SQLToken {
  /** 类型 */
  type: 'keyword' | 'identifier' | 'operator' | 'literal' | 'comment';
  /** 值 */
  value: string;
  /** 位置 */
  position: number;
}

/**
 * 注入模式
 */
interface InjectionPattern {
  /** 模式 */
  pattern: RegExp;
  /** 类型 */
  type: string;
  /** 严重程度 */
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// ============================================================
// SQL验证器类
// ============================================================

/**
 * SQL验证器
 *
 * 提供全面的SQL验证功能
 */
export class SQLValidator {
  /** SQL注入检测模式 */
  private static readonly INJECTION_PATTERNS: InjectionPattern[] = [
    { pattern: /('|('')|;|\-\-|\/\*|\*\/)/gi, type: 'comment', severity: 'medium' },
    { pattern: /(\b(or|and)\s+[\w\s]*?=\s*[\w\s]*?)/gi, type: 'boolean_based', severity: 'high' },
    { pattern: /(\bunion\s+select\b)/gi, type: 'union_based', severity: 'high' },
    { pattern: /(\b(exec|execute)\s+\w+)/gi, type: 'command_execution', severity: 'critical' },
    { pattern: /(\bxp_|sp_)\w+/gi, type: 'stored_procedure', severity: 'critical' },
    { pattern: /\bwaitfor\s+delay\b/gi, type: 'time_based', severity: 'high' },
    { pattern: /(\b(cast|convert)\s*\(.*?\s+as\s+int\b)/gi, type: 'error_based', severity: 'high' },
    { pattern: /(\b(load_file|into\s+outfile)\b)/gi, type: 'file_access', severity: 'critical' },
    { pattern: /(<|>|<<|>>|\^|\|)/, type: 'bitwise_operator', severity: 'low' },
    { pattern: /(\b(eval|execute)\s*\()/gi, type: 'dynamic_execution', severity: 'critical' }
  ];

  /** 危险操作关键字 */
  private static readonly DANGEROUS_KEYWORDS = [
    'DROP', 'TRUNCATE', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE',
    'GRANT', 'REVOKE', 'EXEC', 'EXECUTE'
  ];

  /** 复杂度评估权重 */
  private static readonly COMPLEXITY_WEIGHTS = {
    join: 10,
    subquery: 15,
    aggregation: 5,
    groupBy: 5,
    orderBy: 3,
    having: 7,
    union: 10,
    case: 5,
    function: 2,
    nestedFunction: 5
  };

  /** AlaSQL保留关键字（用于语法验证） */
  private static readonly SQL_KEYWORDS = [
    'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER',
    'ON', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'NULL', 'IS',
    'ORDER', 'BY', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET', 'TOP',
    'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE',
    'CREATE', 'TABLE', 'DROP', 'ALTER', 'TRUNCATE',
    'UNION', 'INTERSECT', 'EXCEPT', 'DISTINCT',
    'SUM', 'AVG', 'COUNT', 'MAX', 'MIN', 'STDDEV', 'VARIANCE',
    'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
    'AS', 'ASC', 'DESC', 'WITH', 'ROLLUP', 'CUBE'
  ];

  /**
   * 验证SQL语法
   *
   * 基于AlaSQL的语法规则进行验证
   */
  validateSyntax(sql: string): InternalSyntaxValidationResult {
    try {
      // 基本检查
      if (!sql || sql.trim().length === 0) {
        return {
          valid: false,
          error: 'SQL语句为空'
        };
      }

      // 规范化SQL
      const normalized = this.normalizeSQL(sql);

      // 检查基本的SQL结构
      if (!this.hasValidStructure(normalized)) {
        return {
          valid: false,
          error: 'SQL语句缺少必要的子句（SELECT, FROM等）'
        };
      }

      // 检查括号匹配
      if (!this.areBracketsBalanced(normalized)) {
        return {
          valid: false,
          error: 'SQL语句中括号不匹配'
        };
      }

      // 检查引号匹配
      if (!this.areQuotesBalanced(normalized)) {
        return {
          valid: false,
          error: 'SQL语句中引号不匹配'
        };
      }

      // 检查关键字顺序
      const keywordOrderCheck = this.validateKeywordOrder(normalized);
      if (!keywordOrderCheck.valid) {
        return keywordOrderCheck;
      }

      // 尝试解析（如果AlaSQL可用）
      if (typeof alasql !== 'undefined') {
        return this.validateWithAlaSQL(sql);
      }

      // 基本验证通过
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 检查SQL注入
   */
  checkInjection(sql: string): InjectionCheckResult {
    const detectedPatterns: string[] = [];
    const types: string[] = [];
    let maxSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // 检查所有注入模式
    for (const { pattern, type, severity } of SQLValidator.INJECTION_PATTERNS) {
      const matches = sql.match(pattern);
      if (matches) {
        types.push(type);
        detectedPatterns.push(...matches);
        if (this.compareSeverity(severity, maxSeverity) > 0) {
          maxSeverity = severity;
        }
      }
    }

    // 检查多语句（分号）
    const statementCount = sql.split(';').filter(s => s.trim().length > 0).length;
    if (statementCount > 1) {
      types.push('multi_statement');
      detectedPatterns.push('检测到多条SQL语句');
      maxSeverity = 'high';
    }

    return {
      detected: detectedPatterns.length > 0,
      types: [...new Set(types)], // 去重
      patterns: [...new Set(detectedPatterns)],
      severity: maxSeverity
    };
  }

  /**
   * 验证表名和字段名
   */
  validateIdentifiers(sql: string, schema: DatabaseSchema): IdentifierValidationResult {
    const tables: IdentifierCheckItem[] = [];
    const columns: IdentifierCheckItem[] = [];
    const missingTables: string[] = [];
    const missingColumns: string[] = [];

    // 提取表名
    const extractedTables = this.extractTableNames(sql);
    for (const table of extractedTables) {
      const exists = table.toLowerCase() in schema.tables ||
        Object.keys(schema.tables).some(t => t.toLowerCase() === table.toLowerCase());

      tables.push({
        name: table,
        exists,
        position: `FROM/JOIN子句`
      });

      if (!exists) {
        missingTables.push(table);
      }
    }

    // 提取字段名
    const extractedColumns = this.extractColumnNames(sql);
    for (const column of extractedColumns) {
      // 检查是否存在
      let exists = false;
      let foundIn = '';

      for (const [tableName, tableSchema] of Object.entries(schema.tables)) {
        if (tableSchema.columns.some(col => col.name.toLowerCase() === column.toLowerCase())) {
          exists = true;
          foundIn = tableName;
          break;
        }
      }

      columns.push({
        name: column,
        exists,
        position: foundIn || '未知'
      });

      if (!exists && !column.includes('*')) { // 忽略通配符
        missingColumns.push(column);
      }
    }

    return {
      tables,
      columns,
      missingTables,
      missingColumns
    };
  }

  /**
   * 验证查询复杂度
   */
  validateComplexity(sql: string, threshold: number = 50): ComplexityValidationResult {
    const factors: ComplexityFactor[] = [];
    let totalScore = 0;

    const normalized = sql.toUpperCase();

    // JOIN检查
    const joinCount = (normalized.match(/\b(INNER|LEFT|RIGHT|FULL|CROSS)\s+JOIN\b/g) || []).length;
    if (joinCount > 0) {
      const score = joinCount * SQLValidator.COMPLEXITY_WEIGHTS.join;
      factors.push({
        type: 'join',
        score,
        description: `包含${joinCount}个JOIN操作`
      });
      totalScore += score;
    }

    // 子查询检查
    const subqueryCount = (sql.match(/\(.*\bSELECT\b/g) || []).length;
    if (subqueryCount > 0) {
      const score = subqueryCount * SQLValidator.COMPLEXITY_WEIGHTS.subquery;
      factors.push({
        type: 'subquery',
        score,
        description: `包含${subqueryCount}个子查询`
      });
      totalScore += score;
    }

    // 聚合函数检查
    const aggFunctions = normalized.match(/\b(SUM|AVG|COUNT|MAX|MIN|STDDEV|VARIANCE)\s*\(/g) || [];
    if (aggFunctions.length > 0) {
      const score = aggFunctions.length * SQLValidator.COMPLEXITY_WEIGHTS.aggregation;
      factors.push({
        type: 'aggregation',
        score,
        description: `使用${aggFunctions.length}个聚合函数`
      });
      totalScore += score;
    }

    // GROUP BY检查
    if (/\bGROUP\s+BY\b/.test(normalized)) {
      const groupByColumns = normalized.split(/\bGROUP\s+BY\b/)[1]?.split(/\bORDER\s+BY\b|\bLIMIT\b|\bHAVING\b/)[0] || '';
      const columnCount = groupByColumns.split(',').filter(c => c.trim()).length;
      const score = SQLValidator.COMPLEXITY_WEIGHTS.groupBy + (columnCount * 2);
      factors.push({
        type: 'groupBy',
        score,
        description: `按${columnCount}列分组`
      });
      totalScore += score;
    }

    // ORDER BY检查
    if (/\bORDER\s+BY\b/.test(normalized)) {
      const orderByColumns = normalized.split(/\bORDER\s+BY\b/)[1]?.split(/\bLIMIT\b|\bOFFSET\b/)[0] || '';
      const columnCount = orderByColumns.split(',').filter(c => c.trim()).length;
      const score = columnCount * SQLValidator.COMPLEXITY_WEIGHTS.orderBy;
      factors.push({
        type: 'orderBy',
        score,
        description: `按${columnCount}列排序`
      });
      totalScore += score;
    }

    // HAVING检查
    if (/\bHAVING\b/.test(normalized)) {
      const score = SQLValidator.COMPLEXITY_WEIGHTS.having;
      factors.push({
        type: 'having',
        score,
        description: '使用HAVING子句'
      });
      totalScore += score;
    }

    // UNION检查
    const unionCount = (normalized.match(/\bUNION\s+(ALL\s+)?/gi) || []).length;
    if (unionCount > 0) {
      const score = unionCount * SQLValidator.COMPLEXITY_WEIGHTS.union;
      factors.push({
        type: 'union',
        score,
        description: `包含${unionCount}个UNION操作`
      });
      totalScore += score;
    }

    // CASE表达式检查
    const caseCount = (normalized.match(/\bCASE\b/g) || []).length;
    if (caseCount > 0) {
      const score = caseCount * SQLValidator.COMPLEXITY_WEIGHTS.case;
      factors.push({
        type: 'case',
        score,
        description: `包含${caseCount}个CASE表达式`
      });
      totalScore += score;
    }

    // 函数调用检查
    const functionCount = (normalized.match(/[A-Z_][A-Z0-9_]*\s*\(/g) || []).length;
    if (functionCount > 0) {
      const score = functionCount * SQLValidator.COMPLEXITY_WEIGHTS.function;
      factors.push({
        type: 'function',
        score,
        description: `调用${functionCount}个函数`
      });
      totalScore += score;
    }

    // 确定复杂度级别
    let level: ComplexityValidationResult['level'];
    if (totalScore <= 15) {
      level = 'simple';
    } else if (totalScore <= 30) {
      level = 'medium';
    } else if (totalScore <= 60) {
      level = 'complex';
    } else {
      level = 'very_complex';
    }

    return {
      score: totalScore,
      level,
      exceedsThreshold: totalScore > threshold,
      factors
    };
  }

  /**
   * 检测危险操作
   */
  detectDangerousOperations(sql: string): DangerousOperation[] {
    const operations: DangerousOperation[] = [];
    const normalized = sql.toUpperCase().replace(/\s+/g, ' ');

    for (const keyword of SQLValidator.DANGEROUS_KEYWORDS) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      let match;

      while ((match = regex.exec(sql)) !== null) {
        const severity: DangerousOperation['severity'] =
          ['DROP', 'TRUNCATE', 'DELETE'].includes(keyword) ? 'high' : 'medium';

        operations.push({
          type: keyword as DangerousOperation['type'],
          severity,
          position: `位置${match.index}`,
          description: this.getDangerousOperationDescription(keyword)
        });
      }
    }

    return operations;
  }

  /**
   * 提取表名
   */
  private extractTableNames(sql: string): string[] {
    const tables: string[] = [];
    const normalized = sql.toUpperCase();

    // FROM子句后的表名
    const fromMatches = normalized.match(/\bFROM\s+([^\s,]+)/gi);
    if (fromMatches) {
      fromMatches.forEach(match => {
        const tableName = match.replace(/\bFROM\s+/i, '').replace(/[\[\]]/g, '');
        if (tableName && !tables.includes(tableName)) {
          tables.push(tableName);
        }
      });
    }

    // JOIN子句后的表名
    const joinMatches = normalized.match(/\b(?:INNER|LEFT|RIGHT|FULL|CROSS)?\s*JOIN\s+([^\s,]+)/gi);
    if (joinMatches) {
      joinMatches.forEach(match => {
        const tableName = match.replace(/\b(?:INNER|LEFT|RIGHT|FULL|CROSS)?\s*JOIN\s+/i, '').replace(/[\[\]]/g, '');
        if (tableName && !tables.includes(tableName)) {
          tables.push(tableName);
        }
      });
    }

    return tables;
  }

  /**
   * 提取列名
   */
  private extractColumnNames(sql: string): string[] {
    const columns: string[] = [];

    // 移除字符串字面量
    const cleaned = sql.replace(/'[^^']*'/g, '').replace(/"[^^"]*"/g, '');

    // SELECT后的列
    const selectMatch = cleaned.match(/SELECT\s+(.*?)\s+FROM/is);
    if (selectMatch && selectMatch[1]) {
      const selectList = selectMatch[1];
      // 分割列（考虑逗号，但忽略函数内的逗号）
      const columnList = this.splitSelectList(selectList);
      columnList.forEach(col => {
        const columnName = this.extractColumnName(col);
        if (columnName && !columns.includes(columnName)) {
          columns.push(columnName);
        }
      });
    }

    // WHERE条件中的列
    const whereMatch = cleaned.match(/WHERE\s+(.*?)(?:\s+GROUP\s+BY|\s+ORDER\s+BY|\s+LIMIT|$)/is);
    if (whereMatch && whereMatch[1]) {
      const whereColumns = this.extractColumnsFromExpression(whereMatch[1]);
      whereColumns.forEach(col => {
        if (col && !columns.includes(col)) {
          columns.push(col);
        }
      });
    }

    return columns;
  }

  /**
   * 从表达式提取列名
   */
  private extractColumnsFromExpression(expression: string): string[] {
    const columns: string[] = [];

    // 匹配列名（字母、数字、下划线、中文）
    const columnRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*|[\u4e00-\u9fa5]+)\b/g;
    let match;

    while ((match = columnRegex.exec(expression)) !== null) {
      const column = match[1];

      // 过滤掉关键字和函数名
      if (!this.isKeyword(column) && !this.isFunction(column)) {
        columns.push(column);
      }
    }

    return columns;
  }

  /**
   * 检查是否为关键字
   */
  private isKeyword(word: string): boolean {
    return SQLValidator.SQL_KEYWORDS.includes(word.toUpperCase());
  }

  /**
   * 检查是否为函数
   */
  private isFunction(word: string): boolean {
    const commonFunctions = [
      'SUM', 'AVG', 'COUNT', 'MAX', 'MIN', 'STDDEV', 'VARIANCE',
      'UPPER', 'LOWER', 'TRIM', 'SUBSTRING', 'CONCAT',
      'DATE', 'YEAR', 'MONTH', 'DAY', 'NOW', 'CURDATE',
      'CAST', 'CONVERT', 'COALESCE', 'NULLIF', 'ISNULL',
      'ABS', 'ROUND', 'CEIL', 'FLOOR', 'POWER', 'SQRT'
    ];
    return commonFunctions.includes(word.toUpperCase());
  }

  /**
   * 提取列名
   */
  private extractColumnName(columnExpression: string): string {
    // 移除别名
    const withoutAlias = columnExpression.split(/\s+AS\s+/i)[0].trim();

    // 移除表名前缀
    const withoutTable = withoutAlias.split('.').pop() || withoutAlias;

    // 移除方括号
    const clean = withoutTable.replace(/[\[\]]/g, '');

    // 如果是函数或聚合，返回空（稍后处理）
    if (this.isFunction(clean.split('(')[0])) {
      return '';
    }

    return clean;
  }

  /**
   * 分割SELECT列表
   */
  private splitSelectList(selectList: string): string[] {
    const items: string[] = [];
    let currentItem = '';
    let parenthesesDepth = 0;

    for (let i = 0; i < selectList.length; i++) {
      const char = selectList[i];

      if (char === '(') {
        parenthesesDepth++;
        currentItem += char;
      } else if (char === ')') {
        parenthesesDepth--;
        currentItem += char;
      } else if (char === ',' && parenthesesDepth === 0) {
        items.push(currentItem.trim());
        currentItem = '';
      } else {
        currentItem += char;
      }
    }

    if (currentItem.trim()) {
      items.push(currentItem.trim());
    }

    return items;
  }

  /**
   * 规范化SQL
   */
  private normalizeSQL(sql: string): string {
    return sql
      .replace(/\s+/g, ' ')  // 多个空格替换为单个
      .replace(/\s*,\s*/g, ',')  // 规范化逗号
      .replace(/\s*\(\s*/g, '(')  // 规范化左括号
      .replace(/\s*\)\s*/g, ')')  // 规范化右括号
      .trim()
      .toUpperCase();
  }

  /**
   * 检查是否有有效的SQL结构
   */
  private hasValidStructure(sql: string): boolean {
    // 至少要有SELECT和FROM（或其他主要子句）
    const hasMainClause = /\b(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|TRUNCATE)\b/i.test(sql);

    if (!hasMainClause) return false;

    // 如果是SELECT，必须有FROM（可能在未来子查询中）
    const isSelect = /\bSELECT\b/i.test(sql);
    if (isSelect && !/\bFROM\b/i.test(sql)) {
      // 检查是否是简单的常量选择（如 SELECT 1）
      const hasOnlyConstants = /^\s*SELECT\s+[\d\s+,.*]+\s*$/i.test(sql);
      if (!hasOnlyConstants) {
        return false;
      }
    }

    return true;
  }

  /**
   * 检查括号是否平衡
   */
  private areBracketsBalanced(sql: string): boolean {
    let count = 0;

    for (const char of sql) {
      if (char === '(') {
        count++;
      } else if (char === ')') {
        count--;
        if (count < 0) return false;
      }
    }

    return count === 0;
  }

  /**
   * 检查引号是否平衡
   */
  private areQuotesBalanced(sql: string): boolean {
    let singleQuote = false;
    let doubleQuote = false;

    for (let i = 0; i < sql.length; i++) {
      const char = sql[i];
      const prevChar = i > 0 ? sql[i - 1] : '';

      if (char === "'" && prevChar !== '\\') {
        singleQuote = !singleQuote;
      }
      if (char === '"' && prevChar !== '\\') {
        doubleQuote = !doubleQuote;
      }
    }

    return !singleQuote && !doubleQuote;
  }

  /**
   * 验证关键字顺序
   */
  private validateKeywordOrder(sql: string): InternalSyntaxValidationResult {
    const normalized = this.normalizeSQL(sql);

    // 定义关键字顺序
    const keywordOrder = [
      'SELECT',
      'FROM',
      'JOIN',
      'WHERE',
      'GROUP BY',
      'HAVING',
      'ORDER BY',
      'LIMIT'
    ];

    // 检查每个关键字的位置
    let lastIndex = -1;

    for (const keyword of keywordOrder) {
      const index = normalized.indexOf(keyword);
      if (index !== -1) {
        if (index < lastIndex) {
          return {
            valid: false,
            error: `关键字顺序错误: ${keyword} 应该在前面出现`
          };
        }
        lastIndex = index;
      }
    }

    return { valid: true };
  }

  /**
   * 使用AlaSQL验证
   */
  private validateWithAlaSQL(sql: string): InternalSyntaxValidationResult {
    try {
      // 尝试解析SQL（不执行）
      // 这是一个简单的测试，实际应该更复杂
      alasql.parse(sql);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 比较严重程度
   */
  private compareSeverity(
    a: 'low' | 'medium' | 'high' | 'critical',
    b: 'low' | 'medium' | 'high' | 'critical'
  ): number {
    const severityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
    return severityOrder[a] - severityOrder[b];
  }

  /**
   * 获取危险操作描述
   */
  private getDangerousOperationDescription(operation: string): string {
    const descriptions: Record<string, string> = {
      DROP: '删除表或数据库结构',
      TRUNCATE: '清空表中所有数据',
      DELETE: '删除表中数据',
      UPDATE: '修改表中数据',
      INSERT: '插入新数据',
      ALTER: '修改表结构',
      CREATE: '创建新表或数据库对象',
      GRANT: '授予用户权限',
      REVOKE: '撤销用户权限',
      EXEC: '执行存储过程或命令',
      EXECUTE: '执行存储过程或命令'
    };

    return descriptions[operation] || '危险操作';
  }
}

// ============================================================
// 导出类型
// ============================================================

export type {
  InternalSyntaxValidationResult,
  SQLToken,
  InjectionPattern
};

// 默认导出
export default SQLValidator;
