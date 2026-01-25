/**
 * SQL Formatter
 * SQL格式化工具类，支持SQL美化、压缩和验证
 */

import { format } from 'sql-formatter';
import type { FormatOptions, ValidationResult, ValidationError } from './types';

/**
 * SQL格式化器类
 */
export class SQLFormatter {
  /**
   * 默认格式化选项
   */
  private static defaultOptions: FormatOptions = {
    language: 'sql',
    indent: '  ',
    keywordCase: 'upper',
    identifierCase: 'preserve',
    linesBetweenQueries: 2,
  };

  /**
   * SQL关键字列表（用于验证）
   */
  private static readonly SQL_KEYWORDS = new Set([
    'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'CROSS',
    'ON', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'IS', 'NULL',
    'ORDER', 'BY', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET', 'ASC', 'DESC',
    'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE',
    'CREATE', 'TABLE', 'INDEX', 'VIEW', 'DROP', 'ALTER', 'ADD', 'COLUMN',
    'UNION', 'ALL', 'DISTINCT', 'EXISTS', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
    'AS', 'WITH', 'RECURSIVE', 'OVER', 'PARTITION', 'WINDOW',
    'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'UNIQUE', 'CHECK', 'CONSTRAINT',
    'DEFAULT', 'CASCADE', 'RESTRICT', 'NO', 'ACTION', 'SET', 'NULL'
  ]);

  /**
   * 格式化SQL
   * @param sql SQL语句
   * @param options 格式化选项
   * @returns 格式化后的SQL
   */
  static format(sql: string, options?: FormatOptions): string {
    try {
      const mergedOptions = { ...this.defaultOptions, ...options };

      // 使用sql-formatter库进行格式化
      const formatted = format(sql, {
        language: mergedOptions.language as any || 'sql',
        indent: mergedOptions.indent || '  ',
        keywordCase: mergedOptions.keywordCase as any || 'upper',
        identifierCase: mergedOptions.identifierCase as any || 'preserve',
        linesBetweenQueries: mergedOptions.linesBetweenQueries || 2,
      } as any);

      return formatted.trim();
    } catch (error) {
      console.error('SQL格式化失败:', error);
      // 如果格式化失败，返回原SQL
      return sql;
    }
  }

  /**
   * 压缩SQL（移除多余的空白和换行）
   * @param sql SQL语句
   * @returns 压缩后的SQL
   */
  static minify(sql: string): string {
    try {
      return sql
        .replace(/\s+/g, ' ')           // 多个空白替换为单个空格
        .replace(/\s*([(),;])\s*/g, '$1') // 移除符号周围的空白
        .replace(/;\s*;/g, ';')         // 移除多余的分号
        .trim();
    } catch (error) {
      console.error('SQL压缩失败:', error);
      return sql;
    }
  }

  /**
   * 验证SQL语法
   * @param sql SQL语句
   * @returns 验证结果
   */
  static validate(sql: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    const trimmedSQL = sql.trim();

    // 1. 检查是否为空
    if (!trimmedSQL) {
      errors.push({
        message: 'SQL语句不能为空',
        severity: 'error'
      });
      return { isValid: false, errors, warnings };
    }

    // 2. 检查括号匹配
    const bracketErrors = this.checkBrackets(trimmedSQL);
    errors.push(...bracketErrors);

    // 3. 检查引号匹配
    const quoteErrors = this.checkQuotes(trimmedSQL);
    errors.push(...quoteErrors);

    // 4. 检查基本SQL结构
    const structureErrors = this.checkSQLStructure(trimmedSQL);
    errors.push(...structureErrors);

    // 5. 检查常见错误模式
    const patternErrors = this.checkCommonErrors(trimmedSQL);
    errors.push(...patternErrors);

    // 6. 性能警告
    const performanceWarnings = this.checkPerformanceIssues(trimmedSQL);
    warnings.push(...performanceWarnings);

    // 7. 检测SQL类型
    const sqlType = this.detectSQLType(trimmedSQL);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sqlType
    };
  }

  /**
   * 美化SQL（格式化的别名）
   * @param sql SQL语句
   * @param options 格式化选项
   * @returns 美化后的SQL
   */
  static beautify(sql: string, options?: FormatOptions): string {
    return this.format(sql, options);
  }

  /**
   * 检查括号匹配
   * @private
   */
  private static checkBrackets(sql: string): ValidationError[] {
    const errors: ValidationError[] = [];
    const stack: { char: string; line: number }[] = [];
    const lines = sql.split('\n');
    const bracketPairs: { [key: string]: string } = {
      ')': '(',
      ']': '[',
      '}': '{'
    };

    lines.forEach((line, lineNum) => {
      for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '(' || char === '[' || char === '{') {
          stack.push({ char, line: lineNum + 1 });
        } else if (char === ')' || char === ']' || char === '}') {
          const last = stack.pop();
          if (!last || last.char !== bracketPairs[char]) {
            errors.push({
              message: `括号不匹配: 找到多余的 '${char}'`,
              position: { line: lineNum + 1, column: i + 1 },
              severity: 'error'
            });
          }
        }
      }
    });

    // 检查未闭合的括号
    while (stack.length > 0) {
      const unclosed = stack.pop()!;
      errors.push({
        message: `括号未闭合: '${unclosed.char}' 在第 ${unclosed.line} 行`,
        severity: 'error'
      });
    }

    return errors;
  }

  /**
   * 检查引号匹配
   * @private
   */
  private static checkQuotes(sql: string): ValidationError[] {
    const errors: ValidationError[] = [];
    const lines = sql.split('\n');

    lines.forEach((line, lineNum) => {
      // 检查单引号
      let singleQuoteCount = 0;
      // 检查双引号
      let doubleQuoteCount = 0;
      // 检查反引号
      let backtickCount = 0;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const prevChar = i > 0 ? line[i - 1] : '';

        // 忽略转义的引号
        if (prevChar === '\\') continue;

        if (char === "'") singleQuoteCount++;
        if (char === '"') doubleQuoteCount++;
        if (char === '`') backtickCount++;
      }

      if (singleQuoteCount % 2 !== 0) {
        errors.push({
          message: '单引号未闭合',
          position: { line: lineNum + 1, column: 0 },
          severity: 'error'
        });
      }

      if (doubleQuoteCount % 2 !== 0) {
        errors.push({
          message: '双引号未闭合',
          position: { line: lineNum + 1, column: 0 },
          severity: 'error'
        });
      }

      if (backtickCount % 2 !== 0) {
        errors.push({
          message: '反引号未闭合',
          position: { line: lineNum + 1, column: 0 },
          severity: 'error'
        });
      }
    });

    return errors;
  }

  /**
   * 检查SQL基本结构
   * @private
   */
  private static checkSQLStructure(sql: string): ValidationError[] {
    const errors: ValidationError[] = [];
    const upperSQL = sql.toUpperCase().trim();

    // 检查是否有SQL关键字
    const hasKeyword = Array.from(this.SQL_KEYWORDS).some(keyword =>
      upperSQL.includes(keyword)
    );

    if (!hasKeyword) {
      errors.push({
        message: '未检测到有效的SQL关键字',
        severity: 'error'
      });
    }

    // 检查SELECT语句
    if (upperSQL.startsWith('SELECT')) {
      if (!upperSQL.includes('FROM')) {
        // 派生表或子查询可能不需要FROM
        const hasFromOrComma = upperSQL.includes('FROM') || sql.includes(',');
        if (!hasFromOrComma) {
          errors.push({
            message: 'SELECT语句通常需要FROM子句',
            severity: 'warning'
          });
        }
      }
    }

    // 检查JOIN语句
    const joinMatches = upperSQL.match(/JOIN/g);
    if (joinMatches && joinMatches.length > 0) {
      const onMatches = upperSQL.match(/ON/g);
      if (!onMatches || onMatches.length < joinMatches.length) {
        errors.push({
          message: 'JOIN语句通常需要ON条件',
          severity: 'warning'
        });
      }
    }

    return errors;
  }

  /**
   * 检查常见错误模式
   * @private
   */
  private static checkCommonErrors(sql: string): ValidationError[] {
    const errors: ValidationError[] = [];
    const upperSQL = sql.toUpperCase();

    // 检查连续逗号
    if (/,,/.test(sql)) {
      errors.push({
        message: '检测到连续的逗号',
        severity: 'error'
      });
    }

    // 检查多余的分号
    if (/;;/.test(sql)) {
      errors.push({
        message: '检测到多余的分号',
        severity: 'warning'
      });
    }

    // 检查未闭合的注释
    const commentBlockCount = (sql.match(/\/\*/g) || []).length;
    const commentCloseCount = (sql.match(/\*\//g) || []).length;
    if (commentBlockCount !== commentCloseCount) {
      errors.push({
        message: '注释块未闭合',
        severity: 'error'
      });
    }

    // 检查SELECT *
    if (/SELECT\s+\*\s+FROM/i.test(sql)) {
      errors.push({
        message: '使用SELECT *可能影响性能，建议明确列出列名',
        severity: 'warning'
      });
    }

    return errors;
  }

  /**
   * 检查性能问题
   * @private
   */
  private static checkPerformanceIssues(sql: string): ValidationError[] {
    const warnings: ValidationError[] = [];
    const upperSQL = sql.toUpperCase();

    // 检查SELECT *
    if (/SELECT\s+\*\s+FROM/i.test(sql)) {
      warnings.push({
        message: 'SELECT * 可能影响性能，建议明确指定列',
        severity: 'warning'
      });
    }

    // 检查LIKE '%...'
    if (/\s+LIKE\s+(['"][^'"]*%|'[^'"]*%)/i.test(sql)) {
      warnings.push({
        message: '前缀通配符LIKE查询可能导致全表扫描',
        severity: 'warning'
      });
    }

    // 检查OR条件
    const orCount = (upperSQL.match(/\bOR\b/g) || []).length;
    if (orCount > 3) {
      warnings.push({
        message: `存在${orCount}个OR条件，考虑使用UNION或IN替代`,
        severity: 'warning'
      });
    }

    // 检查子查询
    if (/\(\s*SELECT/i.test(sql)) {
      warnings.push({
        message: '检测到子查询，考虑使用JOIN优化性能',
        severity: 'warning'
      });
    }

    return warnings;
  }

  /**
   * 检测SQL类型
   * @private
   */
  private static detectSQLType(sql: string): string {
    const trimmedSQL = sql.trim().toUpperCase();
    const firstWord = trimmedSQL.split(/\s+/)[0];

    const typeMap: { [key: string]: string } = {
      'SELECT': 'SELECT',
      'INSERT': 'INSERT',
      'UPDATE': 'UPDATE',
      'DELETE': 'DELETE',
      'CREATE': 'CREATE',
      'ALTER': 'ALTER',
      'DROP': 'DROP',
      'TRUNCATE': 'TRUNCATE',
      'GRANT': 'GRANT',
      'REVOKE': 'REVOKE',
      'WITH': 'WITH (CTE)',
      'MERGE': 'MERGE',
      'CALL': 'CALL',
      'EXPLAIN': 'EXPLAIN',
      'SHOW': 'SHOW',
      'DESC': 'DESCRIBE',
      'DESCRIBE': 'DESCRIBE'
    };

    return typeMap[firstWord] || 'UNKNOWN';
  }

  /**
   * 高亮SQL关键字（用于显示）
   * @param sql SQL语句
   * @returns 带HTML标记的SQL
   */
  static highlightSQL(sql: string): string {
    let highlighted = sql;

    // 高亮关键字
    this.SQL_KEYWORDS.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      highlighted = highlighted.replace(regex, `<span class="sql-keyword">${keyword}</span>`);
    });

    // 高亮字符串
    highlighted = highlighted.replace(/'([^']*)'/g, `<span class="sql-string">'$1'</span>`);

    // 高亮数字
    highlighted = highlighted.replace(/\b(\d+)\b/g, `<span class="sql-number">$1</span>`);

    // 高亮注释
    highlighted = highlighted.replace(/(--[^\n]*)/g, `<span class="sql-comment">$1</span>`);

    return highlighted;
  }

  /**
   * 提取SQL中的表名
   * @param sql SQL语句
   * @returns 表名数组
   */
  static extractTableNames(sql: string): string[] {
    const tables: string[] = [];
    const upperSQL = sql.toUpperCase();

    // 提取FROM后的表名
    const fromMatches = upperSQL.match(/FROM\s+(\w+)/gi);
    if (fromMatches) {
      fromMatches.forEach(match => {
        const tableName = match.replace(/FROM\s+/i, '').trim();
        tables.push(tableName);
      });
    }

    // 提取JOIN后的表名
    const joinMatches = upperSQL.match(/(?:JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|INNER\s+JOIN|OUTER\s+JOIN)\s+(\w+)/gi);
    if (joinMatches) {
      joinMatches.forEach(match => {
        const tableName = match.replace(/(?:JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|INNER\s+JOIN|OUTER\s+JOIN)\s+/i, '').trim();
        if (!tables.includes(tableName)) {
          tables.push(tableName);
        }
      });
    }

    // 提取INSERT INTO后的表名
    const insertMatches = upperSQL.match(/INSERT\s+INTO\s+(\w+)/i);
    if (insertMatches) {
      const tableName = insertMatches[1];
      if (!tables.includes(tableName)) {
        tables.push(tableName);
      }
    }

    // 提取UPDATE后的表名
    const updateMatches = upperSQL.match(/UPDATE\s+(\w+)/i);
    if (updateMatches) {
      const tableName = updateMatches[1];
      if (!tables.includes(tableName)) {
        tables.push(tableName);
      }
    }

    return [...new Set(tables)];
  }

  /**
   * 计算SQL复杂度分数
   * @param sql SQL语句
   * @returns 复杂度分数（0-100）
   */
  static calculateComplexity(sql: string): number {
    let score = 0;
    const upperSQL = sql.toUpperCase();

    // 基础分数
    score += 10;

    // JOIN数量
    const joinCount = (upperSQL.match(/JOIN/g) || []).length;
    score += joinCount * 10;

    // 子查询数量
    const subqueryCount = (upperSQL.match(/\(\s*SELECT/g) || []).length;
    score += subqueryCount * 15;

    // UNION数量
    const unionCount = (upperSQL.match(/UNION/g) || []).length;
    score += unionCount * 10;

    // CASE WHEN数量
    const caseCount = (upperSQL.match(/CASE/g) || []).length;
    score += caseCount * 5;

    // WHERE条件复杂度
    const whereMatch = upperSQL.match(/WHERE\s+(.*?)(?:GROUP|ORDER|LIMIT|;|$)/is);
    if (whereMatch) {
      const whereConditions = whereMatch[1].split(/\bAND\b|\bOR\b/i);
      score += whereConditions.length * 2;
    }

    // 聚合函数
    const aggCount = (upperSQL.match(/\b(COUNT|SUM|AVG|MIN|MAX|GROUP_CONCAT)\b/g) || []).length;
    score += aggCount * 3;

    // 限制最大分数为100
    return Math.min(score, 100);
  }

  /**
   * 生成SQL执行计划（模拟）
   * @param sql SQL语句
   * @returns 执行计划描述
   */
  static generateExplainPlan(sql: string): string[] {
    const plan: string[] = [];
    const upperSQL = sql.toUpperCase();

    plan.push('1. 解析SQL语句');

    if (upperSQL.includes('WHERE')) {
      plan.push('2. 应用WHERE条件过滤');
    }

    if (upperSQL.includes('JOIN')) {
      plan.push('3. 执行表连接操作');
    }

    if (upperSQL.includes('GROUP')) {
      plan.push('4. 执行分组聚合');
    }

    if (upperSQL.includes('ORDER')) {
      plan.push('5. 执行排序操作');
    }

    if (upperSQL.includes('LIMIT')) {
      plan.push('6. 应用LIMIT限制');
    }

    plan.push('7. 返回结果集');

    return plan;
  }
}

/**
 * 导出工具函数
 */
export const formatSQL = (sql: string, options?: FormatOptions): string => {
  return SQLFormatter.format(sql, options);
};

export const minifySQL = (sql: string): string => {
  return SQLFormatter.minify(sql);
};

export const validateSQL = (sql: string): ValidationResult => {
  return SQLFormatter.validate(sql);
};

export const beautifySQL = (sql: string, options?: FormatOptions): string => {
  return SQLFormatter.beautify(sql, options);
};

export const highlightSQL = (sql: string): string => {
  return SQLFormatter.highlightSQL(sql);
};

export const extractTableNames = (sql: string): string[] => {
  return SQLFormatter.extractTableNames(sql);
};

export const calculateComplexity = (sql: string): number => {
  return SQLFormatter.calculateComplexity(sql);
};

export const generateExplainPlan = (sql: string): string[] => {
  return SQLFormatter.generateExplainPlan(sql);
};
