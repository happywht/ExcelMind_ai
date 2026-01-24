/**
 * 幻觉检测器
 *
 * 负责检测AI生成内容中的各种幻觉问题
 * 包括字段名幻觉、表名幻觉、数值幻觉和逻辑幻觉
 *
 * @module services/quality/hallucinationDetector
 * @version 1.0.0
 */

import { AIOutput, QueryContext, DatabaseSchema, Hallucination } from './aiOutputValidator';

// ============================================================
// 幻觉检测器类
// ============================================================

/**
 * 幻觉检测器
 *
 * 检测AI生成内容中的幻觉
 */
export class HallucinationDetector {
  /**
   * 检测字段名幻觉
   *
   * 检测AI是否使用了不存在的字段名
   */
  detectFieldHallucination(aiOutput: AIOutput, schema: DatabaseSchema): Hallucination[] {
    const hallucinations: Hallucination[] = [];

    if (!aiOutput.sqlQuery) {
      return [{
        type: 'field',
        issue: '没有SQL查询',
        severity: 'high',
        suggestion: '请提供SQL查询'
      }];
    }

    // 提取SQL中使用的字段
    const usedFields = this.extractFieldsFromSQL(aiOutput.sqlQuery);

    // 获取所有可用字段
    const availableFields = new Set<string>();
    Object.values(schema.tables).forEach(table => {
      table.columns.forEach(column => {
        availableFields.add(column.name.toLowerCase());
        // 也添加可能的别名
        availableFields.add(column.name.toUpperCase());
      });
    });

    // 检查每个使用的字段
    usedFields.forEach(field => {
      const fieldLower = field.toLowerCase();

      // 跳过通配符和函数
      if (field === '*' || this.isFunction(field)) {
        return;
      }

      // 检查字段是否存在
      let exists = false;
      let suggestion = '';

      // 精确匹配
      if (availableFields.has(fieldLower)) {
        exists = true;
      } else {
        // 尝试模糊匹配（查找相似的字段名）
        const similar = this.findSimilarField(fieldLower, availableFields);
        if (similar) {
          exists = false;
          suggestion = `可能是指 "${similar}"`;
        } else {
          exists = false;
          suggestion = '该字段在数据库中不存在';
        }
      }

      if (!exists) {
        hallucinations.push({
          type: 'field',
          issue: `字段 "${field}" 不存在`,
          severity: 'high',
          suggestion
        });
      }
    });

    return hallucinations;
  }

  /**
   * 检测表名幻觉
   *
   * 检测AI是否使用了不存在的表名
   */
  detectTableHallucination(aiOutput: AIOutput, schema: DatabaseSchema): Hallucination[] {
    const hallucinations: Hallucination[] = [];

    if (!aiOutput.sqlQuery) {
      return [{
        type: 'table',
        issue: '没有SQL查询',
        severity: 'high',
        suggestion: '请提供SQL查询'
      }];
    }

    // 提取SQL中使用的表
    const usedTables = this.extractTablesFromSQL(aiOutput.sqlQuery);

    // 获取所有可用表
    const availableTables = new Set(
      Object.keys(schema.tables).map(t => t.toLowerCase())
    );

    // 检查每个使用的表
    usedTables.forEach(table => {
      const tableLower = table.toLowerCase();

      if (!availableTables.has(tableLower)) {
        // 尝试模糊匹配
        const similar = this.findSimilarTable(tableLower, availableTables);
        const suggestion = similar ?
          `可能是指表 "${similar}"` :
          '该表在数据库中不存在';

        hallucinations.push({
          type: 'table',
          issue: `表 "${table}" 不存在`,
          severity: 'high',
          suggestion
        });
      }
    });

    return hallucinations;
  }

  /**
   * 检测数值幻觉
   *
   * 检测AI生成的数值是否合理
   */
  detectValueHallucination(aiOutput: AIOutput, context: QueryContext): Hallucination[] {
    const hallucinations: Hallucination[] = [];

    // 1. 检查SQL中的字面量值
    const literalValues = this.extractLiteralValues(aiOutput.sqlQuery);

    literalValues.forEach(({ value, position }) => {
      if (typeof value === 'number') {
        // 检查是否为异常值
        if (this.isSuspiciousNumber(value)) {
          hallucinations.push({
            type: 'value',
            issue: `可疑的数值: ${value} 在 ${position}`,
            severity: 'medium',
            position,
            suggestion: '请确认这个数值是否正确'
          });
        }

        // 检查是否为常见的幻觉值
        if (this.isCommonHallucinatedValue(value)) {
          hallucinations.push({
            type: 'value',
            issue: `常见的幻觉数值: ${value}`,
            severity: 'medium',
            position,
            suggestion: '请验证这个数值的来源'
          });
        }
      }
    });

    // 2. 检查结果中的异常值（如果有结果）
    if (aiOutput.result && aiOutput.result.data) {
      const outliers = this.detectNumericOutliers(aiOutput.result.data);
      outliers.forEach(outlier => {
        hallucinations.push({
          type: 'value',
          issue: `结果中的异常值: ${outlier.value} (列: ${outlier.column}, 行: ${outlier.rowIndex})`,
          severity: outlier.severity,
          suggestion: '该值可能是计算错误或数据问题'
        });
      });
    }

    // 3. 检查置信度（如果有）
    if (aiOutput.confidence !== undefined && aiOutput.confidence < 0.7) {
      hallucinations.push({
        type: 'value',
        issue: `AI置信度较低: ${Math.round(aiOutput.confidence * 100)}%`,
        severity: 'low',
        suggestion: '建议人工审核结果'
      });
    }

    return hallucinations;
  }

  /**
   * 检测逻辑幻觉
   *
   * 检测AI的查询逻辑是否合理
   */
  detectLogicHallucination(aiOutput: AIOutput, context: QueryContext): Hallucination[] {
    const hallucinations: Hallucination[] = [];

    if (!aiOutput.sqlQuery) {
      return [{
        type: 'logic',
        issue: '没有SQL查询',
        severity: 'high',
        suggestion: '请提供SQL查询'
      }];
    }

    const sql = aiOutput.sqlQuery.toUpperCase();

    // 1. 检查矛盾的查询条件
    if (this.hasContradictoryConditions(sql)) {
      hallucinations.push({
        type: 'logic',
        issue: '查询条件可能存在矛盾',
        severity: 'medium',
        suggestion: '请检查WHERE子句中的条件是否相互矛盾'
      });
    }

    // 2. 检查可能空结果的操作
    if (this.hasRiskyEmptyResultOperation(sql)) {
      hallucinations.push({
        type: 'logic',
        issue: '查询可能返回空结果，但使用了聚合函数',
        severity: 'low',
        suggestion: '考虑添加COALESCE或IFNULL处理'
      });
    }

    // 3. 检查逻辑不匹配（例如用OR代替AND）
    if (context.originalQuery) {
      const originalLower = context.originalQuery.toLowerCase();
      const sqlLower = sql.toLowerCase();

      // 检查是否要求"同时满足"但使用了OR
      if (originalLower.includes('同时') || originalLower.includes('并且') || originalLower.includes('都')) {
        if (sqlLower.includes(' or ') && !sqlLower.includes(' and ')) {
          hallucinations.push({
            type: 'logic',
            issue: '查询要求"同时满足"但使用了OR而不是AND',
            severity: 'high',
            suggestion: '应该使用AND而不是OR'
          });
        }
      }

      // 检查是否要求"或者"但使用了AND
      if (originalLower.includes('或者') || originalLower.includes('或') || originalLower.includes('任意')) {
        if (sqlLower.includes(' and ') && !sqlLower.includes(' or ')) {
          hallucinations.push({
            type: 'logic',
            issue: '查询要求"或者"但使用了AND而不是OR',
            severity: 'high',
            suggestion: '应该使用OR而不是AND'
          });
        }
      }
    }

    // 4. 检查JOIN逻辑
    const joinIssues = this.detectJoinLogicIssues(sql, context.schema);
    hallucinations.push(...joinIssues);

    // 5. 检查聚合逻辑
    const aggIssues = this.detectAggregationLogicIssues(sql);
    hallucinations.push(...aggIssues);

    // 6. 检查子查询逻辑
    const subqueryIssues = this.detectSubqueryLogicIssues(sql);
    hallucinations.push(...subqueryIssues);

    // 7. 检查推理过程（如果有）
    if (aiOutput.reasoning) {
      const reasoningIssues = this.validateReasoning(aiOutput.reasoning, aiOutput.sqlQuery);
      hallucinations.push(...reasoningIssues);
    }

    return hallucinations;
  }

  /**
   * 计算综合幻觉分数
   *
   * 分数越高表示幻觉越严重（0-100）
   */
  calculateHallucinationScore(aiOutput: AIOutput, context: QueryContext): number {
    let totalScore = 0;

    // 检测各类幻觉
    const fieldHallucinations = this.detectFieldHallucination(aiOutput, context.schema);
    const tableHallucinations = this.detectTableHallucination(aiOutput, context.schema);
    const valueHallucinations = this.detectValueHallucination(aiOutput, context);
    const logicHallucinations = this.detectLogicHallucination(aiOutput, context);

    // 计算分数（每个幻觉根据严重程度加分）
    const hallucinations = [
      ...fieldHallucinations,
      ...tableHallucinations,
      ...valueHallucinations,
      ...logicHallucinations
    ];

    hallucinations.forEach(h => {
      switch (h.severity) {
        case 'critical':
          totalScore += 30;
          break;
        case 'high':
          totalScore += 20;
          break;
        case 'medium':
          totalScore += 10;
          break;
        case 'low':
          totalScore += 5;
          break;
      }
    });

    // 限制在0-100范围内
    return Math.min(100, totalScore);
  }

  /**
   * 从SQL中提取字段名
   */
  private extractFieldsFromSQL(sql: string): string[] {
    const fields: string[] = [];

    // 移除字符串字面量
    const cleaned = sql.replace(/'[^^']*'/g, '').replace(/"[^^"]*"/g, '');

    // 提取SELECT列表中的字段
    const selectMatch = cleaned.match(/SELECT\s+(.*?)\s+FROM/is);
    if (selectMatch && selectMatch[1]) {
      const selectList = selectMatch[1];
      const fieldList = this.splitByCommaOutsideParentheses(selectList);

      fieldList.forEach(field => {
        const fieldName = this.extractFieldName(field);
        if (fieldName && fieldName !== '*') {
          fields.push(fieldName);
        }
      });
    }

    // 提取WHERE条件中的字段
    const whereMatch = cleaned.match(/WHERE\s+(.*?)(?:\s+GROUP\s+BY|\s+ORDER\s+BY|\s+LIMIT|$)/is);
    if (whereMatch && whereMatch[1]) {
      const whereFields = this.extractFieldsFromExpression(whereMatch[1]);
      fields.push(...whereFields);
    }

    // 提取JOIN条件中的字段
    const joinMatches = cleaned.match(/ON\s+([\s\S]*?)(?:\s+(?:LEFT|RIGHT|INNER|OUTER)?\s*JOIN|WHERE|$)/gi);
    if (joinMatches) {
      joinMatches.forEach(match => {
        const onClause = match.replace(/\bON\s+/i, '');
        const onFields = this.extractFieldsFromExpression(onClause);
        fields.push(...onFields);
      });
    }

    return [...new Set(fields)];
  }

  /**
   * 从SQL中提取表名
   */
  private extractTablesFromSQL(sql: string): string[] {
    const tables: string[] = [];
    const cleaned = sql.toUpperCase();

    // FROM子句
    const fromMatches = cleaned.match(/\bFROM\s+([^\s,]+)/gi);
    if (fromMatches) {
      fromMatches.forEach(match => {
        const table = match.replace(/\bFROM\s+/i, '').replace(/[\[\]]/g, '');
        if (table) tables.push(table);
      });
    }

    // JOIN子句
    const joinMatches = cleaned.match(/\b(?:INNER|LEFT|RIGHT|FULL|CROSS)?\s*JOIN\s+([^\s,]+)/gi);
    if (joinMatches) {
      joinMatches.forEach(match => {
        const table = match.replace(/\b(?:INNER|LEFT|RIGHT|FULL|CROSS)?\s*JOIN\s+/i, '').replace(/[\[\]]/g, '');
        if (table) tables.push(table);
      });
    }

    return [...new Set(tables)];
  }

  /**
   * 从表达式中提取字段
   */
  private extractFieldsFromExpression(expression: string): string[] {
    const fields: string[] = [];

    // 匹配标识符
    const identifierRegex = /([a-zA-Z_][a-zA-Z0-9_]*|[\u4e00-\u9fa5]+)/g;
    let match;

    while ((match = identifierRegex.exec(expression)) !== null) {
      const field = match[1];

      // 跳过关键字和函数
      if (!this.isKeyword(field) && !this.isFunction(field)) {
        fields.push(field);
      }
    }

    return fields;
  }

  /**
   * 提取字段名
   */
  private extractFieldName(fieldExpression: string): string {
    // 移除别名
    const withoutAlias = fieldExpression.split(/\s+AS\s+/i)[0].trim();
    // 移除表名前缀
    const withoutTable = withoutAlias.split('.').pop() || withoutAlias;
    // 移除方括号
    const clean = withoutTable.replace(/[\[\]]/g, '');
    return clean;
  }

  /**
   * 按逗号分割（忽略括号内的逗号）
   */
  private splitByCommaOutsideParentheses(str: string): string[] {
    const result: string[] = [];
    let current = '';
    let depth = 0;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      if (char === '(') depth++;
      else if (char === ')') depth--;
      else if (char === ',' && depth === 0) {
        result.push(current.trim());
        current = '';
        continue;
      }
      current += char;
    }

    if (current.trim()) {
      result.push(current.trim());
    }

    return result;
  }

  /**
   * 查找相似字段名
   */
  private findSimilarField(field: string, availableFields: Set<string>): string | null {
    let bestMatch: string | null = null;
    let bestDistance = Infinity;

    for (const available of availableFields) {
      const distance = this.levenshteinDistance(field, available);
      if (distance < bestDistance && distance <= 3) {
        bestDistance = distance;
        bestMatch = available;
      }
    }

    return bestMatch;
  }

  /**
   * 查找相似表名
   */
  private findSimilarTable(table: string, availableTables: Set<string>): string | null {
    let bestMatch: string | null = null;
    let bestDistance = Infinity;

    for (const available of availableTables) {
      const distance = this.levenshteinDistance(table, available);
      if (distance < bestDistance && distance <= 3) {
        bestDistance = distance;
        bestMatch = available;
      }
    }

    return bestMatch;
  }

  /**
   * 计算编辑距离
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,
            dp[i][j - 1] + 1,
            dp[i - 1][j - 1] + 1
          );
        }
      }
    }

    return dp[m][n];
  }

  /**
   * 从SQL中提取字面量值
   */
  private extractLiteralValues(sql: string): Array<{ value: any; position: string }> {
    const literals: Array<{ value: any; position: string }> = [];

    // 提取数字
    const numberRegex = /\b(\d+\.?\d*)\b/g;
    let match;
    while ((match = numberRegex.exec(sql)) !== null) {
      literals.push({
        value: parseFloat(match[1]),
        position: `位置${match.index}`
      });
    }

    // 提取字符串
    const stringRegex = /'([^']*)'/g;
    while ((match = stringRegex.exec(sql)) !== null) {
      literals.push({
        value: match[1],
        position: `位置${match.index}`
      });
    }

    return literals;
  }

  /**
   * 检查是否为可疑数字
   */
  private isSuspiciousNumber(value: number): boolean {
    // 检查是否为极端值
    if (Math.abs(value) > 1e10) return true;
    if (Math.abs(value) < 1e-10 && value !== 0) return true;

    // 检查是否为常见的"幻觉"数字
    const suspiciousValues = [42, 666, 777, 12345, 9999];
    if (suspiciousValues.includes(value)) return true;

    return false;
  }

  /**
   * 检查是否为常见的幻觉值
   */
  private isCommonHallucinatedValue(value: number): boolean {
    // AI经常生成的默认值
    const commonHallucinations = [0, 1, 100, -1, 999];
    return commonHallucinations.includes(value);
  }

  /**
   * 检测数值异常值
   */
  private detectNumericOutliers(data: any[]): Array<{ value: number; column: string; rowIndex: number; severity: 'low' | 'medium' | 'high' }> {
    const outliers: Array<{ value: number; column: string; rowIndex: number; severity: 'low' | 'medium' | 'high' }> = [];

    if (data.length === 0) return outliers;

    const columns = Object.keys(data[0]);

    columns.forEach(column => {
      const values = data
        .map((row, idx) => ({ value: row[column], rowIndex: idx }))
        .filter(item => typeof item.value === 'number');

      if (values.length < 3) return;

      const numericValues = values.map(v => v.value);
      const mean = numericValues.reduce((sum, v) => sum + v, 0) / numericValues.length;
      const variance = numericValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / numericValues.length;
      const stdDev = Math.sqrt(variance);

      values.forEach(({ value, rowIndex }) => {
        const zScore = Math.abs((value - mean) / stdDev);
        if (zScore > 3) {
          outliers.push({
            value,
            column,
            rowIndex,
            severity: zScore > 5 ? 'high' : (zScore > 4 ? 'medium' : 'low')
          });
        }
      });
    });

    return outliers;
  }

  /**
   * 检查矛盾的查询条件
   */
  private hasContradictoryConditions(sql: string): boolean {
    // 检查类似 "a > 10 AND a < 5" 的矛盾条件
    const contradictionPatterns = [
      /(\w+)\s*>\s*(\d+)\s+AND\s+\1\s*<\s*(\d+)/gi,
      /(\w+)\s*=\s*'?(\w+)'?\s+AND\s+\1\s*!=\s*'?(\w+)'?/gi,
      /(\w+)\s+IS\s+NOT\s+NULL\s+AND\s+\1\s+IS\s+NULL/gi
    ];

    for (const pattern of contradictionPatterns) {
      if (pattern.test(sql)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 检查可能导致空结果的操作
   */
  private hasRiskyEmptyResultOperation(sql: string): boolean {
    // 检查在没有数据验证的情况下使用聚合函数
    const riskyPatterns = [
      /SUM\s*\([^)]+\)\s*\/\s*COUNT\s*\([^)]+\)/gi,
      /AVG\s*\([^)]+\)\s*\*\s*COUNT\s*\([^)]+\)/gi
    ];

    return riskyPatterns.some(pattern => pattern.test(sql));
  }

  /**
   * 检测JOIN逻辑问题
   */
  private detectJoinLogicIssues(sql: string, schema: DatabaseSchema): Hallucination[] {
    const issues: Hallucination[] = [];

    // 检查是否有关联但没有ON条件
    if (/\bJOIN\s+\w+/i.test(sql) && !/\bON\b/i.test(sql)) {
      issues.push({
        type: 'logic',
        issue: 'JOIN语句缺少ON条件',
        severity: 'high',
        suggestion: '请添加ON条件指定关联关系'
      });
    }

    // 检查是否使用了笛卡尔积
    if (/\bFROM\s+\w+\s*,\s*\w+/i.test(sql) && !/\bWHERE\b/i.test(sql)) {
      issues.push({
        type: 'logic',
        issue: '可能产生笛卡尔积（缺少WHERE条件）',
        severity: 'medium',
        suggestion: '请添加适当的WHERE条件'
      });
    }

    return issues;
  }

  /**
   * 检测聚合逻辑问题
   */
  private detectAggregationLogicIssues(sql: string): Hallucination[] {
    const issues: Hallucination[] = [];

    // 检查混合了聚合和非聚合列
    const hasAggregation = /\b(SUM|AVG|COUNT|MAX|MIN)\s*\(/i.test(sql);
    const hasGroupBy = /\bGROUP\s+BY\b/i.test(sql);

    if (hasAggregation && !hasGroupBy) {
      const selectMatch = sql.match(/SELECT\s+(.*?)\s+FROM/i);
      if (selectMatch && selectMatch[1]) {
        const columns = this.splitByCommaOutsideParentheses(selectMatch[1]);
        if (columns.length > 1) {
          issues.push({
            type: 'logic',
            issue: '查询包含聚合函数但没有GROUP BY，可能导致错误结果',
            severity: 'medium',
            suggestion: '考虑添加GROUP BY或移除非聚合列'
          });
        }
      }
    }

    return issues;
  }

  /**
   * 检测子查询逻辑问题
   */
  private detectSubqueryLogicIssues(sql: string): Hallucination[] {
    const issues: Hallucination[] = [];
    const subqueryCount = (sql.match(/\(.*\bSELECT\b/gi) || []).length;

    if (subqueryCount > 3) {
      issues.push({
        type: 'logic',
        issue: `包含${subqueryCount}个子查询，可能影响性能和可读性`,
        severity: 'low',
        suggestion: '考虑使用JOIN或临时表简化查询'
      });
    }

    // 检查相关子查询
    if (/\bSELECT\b.*\bWHERE\b.*\bSELECT\b/gi.test(sql)) {
      issues.push({
        type: 'logic',
        issue: '包含相关子查询，可能性能较差',
        severity: 'low',
        suggestion: '考虑使用JOIN优化'
      });
    }

    return issues;
  }

  /**
   * 验证推理过程
   */
  private validateReasoning(reasoning: string, sql: string): Hallucination[] {
    const issues: Hallucination[] = [];

    // 检查推理是否与SQL一致
    const mentionedTables = this.extractTablesFromSQL(sql);
    const reasoningLower = reasoning.toLowerCase();

    for (const table of mentionedTables) {
      if (!reasoningLower.includes(table.toLowerCase())) {
        issues.push({
          type: 'logic',
          issue: `推理过程中没有提到表 "${table}"`,
          severity: 'low',
          suggestion: '推理过程应该说明使用的每个表'
        });
      }
    }

    return issues;
  }

  /**
   * 检查是否为关键字
   */
  private isKeyword(word: string): boolean {
    const keywords = [
      'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER',
      'ON', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'NULL', 'IS',
      'ORDER', 'BY', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET', 'TOP',
      'SUM', 'AVG', 'COUNT', 'MAX', 'MIN', 'STDDEV', 'VARIANCE',
      'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'AS', 'ASC', 'DESC'
    ];
    return keywords.includes(word.toUpperCase());
  }

  /**
   * 检查是否为函数
   */
  private isFunction(word: string): boolean {
    const functions = [
      'SUM', 'AVG', 'COUNT', 'MAX', 'MIN', 'STDDEV', 'VARIANCE',
      'UPPER', 'LOWER', 'TRIM', 'SUBSTRING', 'CONCAT',
      'DATE', 'YEAR', 'MONTH', 'DAY', 'NOW', 'CURDATE',
      'CAST', 'CONVERT', 'COALESCE', 'NULLIF', 'ISNULL',
      'ABS', 'ROUND', 'CEIL', 'FLOOR', 'POWER', 'SQRT',
      'LEN', 'LENGTH', 'LEFT', 'RIGHT', 'MID'
    ];
    return functions.includes(word.toUpperCase());
  }
}

// ============================================================
// 默认导出
// ============================================================

export default HallucinationDetector;
