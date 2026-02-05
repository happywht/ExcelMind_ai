/**
 * SQL生成器
 * 将查询计划转换为可执行的SQL语句
 */

import { QueryPlan, FilterCondition, JoinCondition, AggregationSpec } from './AIQueryParser';

// ============================================================
// SQL生成器类
// ============================================================

export class SQLGenerator {
  private tablePrefix: string = 't';

  /**
   * 生成完整的SQL查询语句
   */
  generate(plan: QueryPlan): string {
    // 验证查询计划
    this.validatePlan(plan);

    switch (plan.queryType) {
      case 'simple':
        return this.generateSimpleSelect(plan);
      case 'aggregate':
        return this.generateAggregateQuery(plan);
      case 'join':
        return this.generateJoinQuery(plan);
      case 'transform':
        return this.generateTransformQuery(plan);
      case 'complex':
        return this.generateComplexQuery(plan);
      default:
        throw new Error(`不支持的查询类型: ${plan.queryType}`);
    }
  }

  /**
   * 生成简单SELECT查询
   */
  private generateSimpleSelect(plan: QueryPlan): string {
    const { targetSheets, operations, filters, orderBy, limit } = plan;
    const sheet = targetSheets[0];

    // SELECT子句
    const selectClause = this.buildSelectClause(operations, sheet);

    // FROM子句
    const fromClause = `FROM [${this.escapeTableName(sheet)}]`;

    // WHERE子句
    const whereClause = this.buildWhereClause(filters);

    // ORDER BY子句
    const orderByClause = this.buildOrderByClause(orderBy);

    // LIMIT子句
    const limitClause = limit ? `LIMIT ${limit}` : '';

    return `${selectClause} ${fromClause}${whereClause}${orderByClause}${limitClause}`.trim();
  }

  /**
   * 生成聚合查询
   */
  private generateAggregateQuery(plan: QueryPlan): string {
    const { targetSheets, aggregations, filters, groupBy } = plan;
    const sheet = targetSheets[0];

    // SELECT子句（包含聚合函数）
    let selectItems: string[] = [];

    if (aggregations.length > 0) {
      aggregations.forEach(agg => {
        const expr = `${agg.function}(${agg.column === '*' ? '*' : agg.column})`;
        selectItems.push(expr + (agg.alias ? ` AS ${agg.alias}` : ''));
      });
    }

    // 添加GROUP BY字段
    if (groupBy && groupBy.length > 0) {
      groupBy.forEach(col => {
        selectItems.push(col);
      });
    }

    const selectClause = `SELECT ${selectItems.join(', ')}`;
    const fromClause = `FROM [${this.escapeTableName(sheet)}]`;
    const whereClause = this.buildWhereClause(filters);
    const groupByClause = groupBy && groupBy.length > 0 ? ` GROUP BY ${groupBy.join(', ')}` : '';

    return `${selectClause} ${fromClause}${whereClause}${groupByClause}`.trim();
  }

  /**
   * 生成JOIN查询
   */
  private generateJoinQuery(plan: QueryPlan): string {
    const { targetSheets, joins, operations, filters } = plan;

    if (targetSheets.length === 0) {
      throw new Error('JOIN查询需要指定至少一个表');
    }

    // SELECT子句
    const selectItems = operations.map(op => {
      // 解析 "Sheet1.列名" 或仅 "列名"
      if (op.target.includes('.')) {
        return op.target + (op.alias ? ` AS ${op.alias}` : '');
      }
      return `${this.tablePrefix}1.${op.target}${op.alias ? ` AS ${op.alias}` : ''}`;
    });

    const selectClause = `SELECT ${selectItems.join(', ')}`;

    // FROM子句
    let sql = `${selectClause} FROM [${this.escapeTableName(targetSheets[0])}] AS ${this.tablePrefix}1`;

    // JOIN子句
    if (joins && joins.length > 0) {
      joins.forEach((join, index) => {
        const alias = `${this.tablePrefix}${index + 2}`;
        const joinType = join.type || 'INNER';
        sql += ` ${joinType} JOIN [${this.escapeTableName(join.to)}] AS ${alias}`;
        sql += ` ON ${this.tablePrefix}1.${join.on} = ${alias}.${join.on}`;
      });
    }

    // WHERE子句
    const whereClause = this.buildWhereClause(filters, true);
    sql += whereClause;

    return sql;
  }

  /**
   * 生成数据转换查询
   */
  private generateTransformQuery(plan: QueryPlan): string {
    const { targetSheets, operations } = plan;
    const sheet = targetSheets[0];

    const selectItems = operations.map(op => {
      if (op.params && op.params.transform) {
        // 使用转换函数
        return `${op.params.transform}(${op.target}) AS ${op.alias || op.target}`;
      }
      return op.target;
    });

    return `SELECT ${selectItems.join(', ')} FROM [${this.escapeTableName(sheet)}]`;
  }

  /**
   * 生成复杂查询（组合多种操作）
   */
  private generateComplexQuery(plan: QueryPlan): string {
    // 如果有JOIN，优先使用JOIN查询生成器
    if (plan.joins && plan.joins.length > 0) {
      return this.generateJoinQuery(plan);
    }

    // 如果有聚合，使用聚合查询生成器
    if (plan.aggregations && plan.aggregations.length > 0) {
      return this.generateAggregateQuery(plan);
    }

    // 默认使用简单查询
    return this.generateSimpleSelect(plan);
  }

  // ============================================================
  // 子句构建方法
  // ============================================================

  /**
   * 构建SELECT子句
   */
  private buildSelectClause(operations: any[], sheet: string): string {
    if (operations.length === 0) {
      return 'SELECT *';
    }

    const selectItems = operations.map(op => {
      const column = op.target;
      const alias = op.alias;

      if (alias) {
        return `${column} AS ${alias}`;
      }
      return column;
    });

    return `SELECT ${selectItems.join(', ')}`;
  }

  /**
   * 构建WHERE子句
   */
  private buildWhereClause(
    filters: FilterCondition[],
    useTablePrefix: boolean = false
  ): string {
    if (!filters || filters.length === 0) {
      return '';
    }

    const conditions = filters.map(f => {
      const column = useTablePrefix ? `${this.tablePrefix}1.${f.column}` : f.column;
      const value = this.formatValue(f.value);

      switch (f.operator) {
        case 'LIKE':
          return `${column} LIKE '%${f.value}%'`;
        case 'IN':
          if (Array.isArray(f.value)) {
            const values = f.value.map(v => this.formatValue(v)).join(', ');
            return `${column} IN (${values})`;
          }
          return `${column} IN (${value})`;
        default:
          return `${column} ${f.operator} ${value}`;
      }
    });

    // 组合条件（支持AND/OR）
    let result = ' WHERE ';
    for (let i = 0; i < conditions.length; i++) {
      if (i > 0 && filters[i].logicalOperator) {
        result += ` ${filters[i].logicalOperator} `;
      } else if (i > 0) {
        result += ' AND ';
      }
      result += conditions[i];
    }

    return result;
  }

  /**
   * 构建ORDER BY子句
   */
  private buildOrderByClause(
    orderBy?: { column: string; direction: 'ASC' | 'DESC' }[]
  ): string {
    if (!orderBy || orderBy.length === 0) {
      return '';
    }

    const items = orderBy.map(item => `${item.column} ${item.direction}`);
    return ` ORDER BY ${items.join(', ')}`;
  }

  /**
   * 格式化值
   */
  private formatValue(value: any): string {
    if (typeof value === 'string') {
      // 转义单引号
      const escaped = value.replace(/'/g, "''");
      return `'${escaped}'`;
    }
    if (typeof value === 'number') {
      return String(value);
    }
    if (value === null || value === undefined) {
      return 'NULL';
    }
    if (typeof value === 'boolean') {
      return value ? '1' : '0';
    }
    return `'${String(value)}'`;
  }

  /**
   * 转义表名
   */
  private escapeTableName(name: string): string {
    return name.replace(/\]/g, '\\]');
  }

  /**
   * 验证查询计划
   */
  private validatePlan(plan: QueryPlan): void {
    if (!plan.targetSheets || plan.targetSheets.length === 0) {
      throw new Error('查询计划必须指定至少一个目标表');
    }

    if (plan.queryType === 'join' && (!plan.joins || plan.joins.length === 0)) {
      throw new Error('JOIN查询必须指定关联条件');
    }

    if (plan.queryType === 'aggregate' && (!plan.aggregations || plan.aggregations.length === 0)) {
      throw new Error('聚合查询必须指定聚合函数');
    }
  }

  // ============================================================
  // 辅助方法
  // ============================================================

  /**
   * 生成查询解释（用于向用户展示）
   */
  explain(plan: QueryPlan): string {
    const explanations: string[] = [];

    explanations.push(`查询类型: ${this.getQueryTypeDescription(plan.queryType)}`);

    if (plan.targetSheets.length > 0) {
      explanations.push(`涉及表: ${plan.targetSheets.join(', ')}`);
    }

    if (plan.filters && plan.filters.length > 0) {
      explanations.push(`筛选条件: ${plan.filters.length}个`);
    }

    if (plan.aggregations && plan.aggregations.length > 0) {
      explanations.push(`聚合操作: ${plan.aggregations.map(a => a.function).join(', ')}`);
    }

    if (plan.joins && plan.joins.length > 0) {
      explanations.push(`表关联: ${plan.joins.length}个`);
    }

    return explanations.join('\n');
  }

  /**
   * 获取查询类型描述
   */
  private getQueryTypeDescription(type: string): string {
    const descriptions: Record<string, string> = {
      simple: '简单查询',
      aggregate: '聚合查询',
      join: '关联查询',
      transform: '转换查询',
      complex: '复杂查询'
    };
    return descriptions[type] || type;
  }

  /**
   * 批量生成SQL
   */
  generateBatch(plans: QueryPlan[]): string[] {
    return plans.map(plan => this.generate(plan));
  }
}

// ============================================================
// 导出
// ============================================================

export default SQLGenerator;
