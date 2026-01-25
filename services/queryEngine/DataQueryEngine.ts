/**
 * 数据查询引擎核心
 * 智能数据查询的大脑 - Phase 1 核心实现
 *
 * 功能特性：
 * - 支持自然语言查询（AI驱动）
 * - 支持直接SQL查询
 * - 支持结构化查询（编程接口）
 * - AlaSQL深度集成
 * - 查询缓存和性能优化
 * - 丰富的辅助函数库
 */

import { IMultiSheetDataSource, globalDataSource } from './MultiSheetDataSource';
import { AIQueryParser, QueryPlan } from './AIQueryParser';
import { SQLGenerator } from './SQLGenerator';
import { initializeHelperFunctions } from './QueryHelperFunctions';
import { ExcelData } from '../../types';

// ============================================================
// 类型定义
// ============================================================

/**
 * 查询请求接口
 * 支持三种查询方式：自然语言、SQL、结构化
 */
export interface QueryRequest {
  /** 自然语言查询（AI解析） */
  naturalLanguage?: string;

  /** 直接SQL查询 */
  sql?: string;

  /** 结构化查询（编程接口） */
  structured?: StructuredQuery;
}

/**
 * 结构化查询接口
 * 提供类型安全的编程查询接口
 */
export interface StructuredQuery {
  /** 数据源表名 */
  from: string;

  /** 选择字段（空数组表示全选） */
  select?: string[];

  /** 筛选条件 */
  where?: Record<string, any>;

  /** 排序 */
  orderBy?: {
    column: string;
    direction: 'asc' | 'desc';
  };

  /** 结果限制 */
  limit?: number;

  /** 跳过记录数 */
  offset?: number;

  /** 表关联 */
  joins?: JoinClause[];

  /** 聚合操作 */
  aggregations?: Aggregation[];

  /** 分组字段 */
  groupBy?: string[];
}

/**
 * JOIN子句
 */
export interface JoinClause {
  /** 关联表 */
  table: string;

  /** 关联字段 */
  on: string;

  /** 关联类型 */
  type?: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
}

/**
 * 聚合操作
 */
export interface Aggregation {
  /** 聚合函数 */
  function: 'SUM' | 'AVG' | 'COUNT' | 'MAX' | 'MIN';

  /** 目标字段 */
  column: string;

  /** 别名 */
  alias?: string;
}

/**
 * 查询结果
 */
export interface QueryResult {
  /** 查询数据 */
  data: any[];

  /** 实际执行的SQL */
  sql: string;

  /** 执行时间（毫秒） */
  executionTime: number;

  /** 返回行数 */
  rowCount: number;

  /** 查询说明 */
  explanation?: string;

  /** 查询计划（AI模式） */
  plan?: QueryPlan;

  /** 错误信息 */
  error?: string;

  /** 成功标志 */
  success: boolean;
}

/**
 * 查询配置
 */
export interface QueryEngineConfig {
  /** 启用缓存 */
  enableCache?: boolean;

  /** 启用AI解析 */
  enableAI?: boolean;

  /** 最大执行时间（毫秒） */
  maxExecutionTime?: number;

  /** 调试模式 */
  debugMode?: boolean;

  /** 缓存大小限制 */
  cacheSize?: number;

  /** 缓存TTL（毫秒） */
  cacheTTL?: number;
}

/**
 * 查询计划分析结果（本地版本，避免与AIQueryParser.QueryPlan冲突）
 */
export interface LocalQueryPlan {
  /** 查询类型 */
  type: 'simple' | 'aggregate' | 'join' | 'complex' | 'transform';

  /** 涉及的表 */
  tables: string[];

  /** 使用的索引 */
  indexes?: string[];

  /** 预估成本 */
  estimatedCost?: number;

  /** 优化建议 */
  suggestions?: string[];
}

// ============================================================
// AlaSQL执行器
// ============================================================

/**
 * AlaSQL执行器封装
 * 提供类型安全的SQL执行接口
 */
export class AlaSQLExecutor {
  private initialized = false;
  private registeredFunctions = new Set<string>();
  private registeredTables = new Set<string>();

  /**
   * 初始化执行器
   */
  initialize(): void {
    if (typeof alasql === 'undefined') {
      throw new Error('AlaSQL未加载。请确保已安装并导入alasql库。');
    }

    this.initialized = true;
  }

  /**
   * 执行SQL查询
   */
  execute<T = any>(sql: string, params?: any): T {
    if (!this.initialized) {
      this.initialize();
    }

    const startTime = performance.now();

    try {
      let result: T;

      if (params) {
        result = alasql(sql, params);
      } else {
        result = alasql(sql);
      }

      const executionTime = performance.now() - startTime;

      if (this.isDebugEnabled()) {
        console.log(`[AlaSQL] 执行时间: ${executionTime.toFixed(2)}ms`);
        console.log(`[AlaSQL] SQL: ${sql}`);
      }

      return result;
    } catch (error) {
      console.error(`[AlaSQL] 执行失败: ${sql}`, error);
      throw error;
    }
  }

  /**
   * 创建表并加载数据
   */
  createTable(tableName: string, data: any[]): void {
    if (!this.initialized) {
      this.initialize();
    }

    const escapedName = this.escapeTableName(tableName);

    try {
      // 创建表
      this.execute(`CREATE TABLE IF NOT EXISTS [${escapedName}]`);

      // 加载数据
      alasql.tables[escapedName] = { data };

      this.registeredTables.add(tableName);

      if (this.isDebugEnabled()) {
        console.log(`[AlaSQL] 创建表: ${tableName}, ${data.length}行`);
      }
    } catch (error) {
      console.error(`[AlaSQL] 创建表失败: ${tableName}`, error);
      throw error;
    }
  }

  /**
   * 注册自定义函数
   */
  registerFunction(name: string, fn: Function): void {
    if (!this.initialized) {
      this.initialize();
    }

    try {
      (alasql as any).fn[name] = fn;
      this.registeredFunctions.add(name);

      if (this.isDebugEnabled()) {
        console.log(`[AlaSQL] 注册函数: ${name}`);
      }
    } catch (error) {
      console.error(`[AlaSQL] 注册函数失败: ${name}`, error);
      throw error;
    }
  }

  /**
   * 批量注册函数
   */
  registerFunctions(functions: Record<string, Function>): void {
    Object.entries(functions).forEach(([name, fn]) => {
      this.registerFunction(name, fn);
    });
  }

  /**
   * 删除表
   */
  dropTable(tableName: string): void {
    const escapedName = this.escapeTableName(tableName);

    try {
      this.execute(`DROP TABLE IF EXISTS [${escapedName}]`);
      this.registeredTables.delete(tableName);
    } catch (error) {
      console.warn(`[AlaSQL] 删除表失败: ${tableName}`, error);
    }
  }

  /**
   * 清空所有表
   */
  dropAllTables(): void {
    try {
      this.execute('DROP TABLE IF EXISTS *');
      this.registeredTables.clear();
    } catch (error) {
      console.warn('[AlaSQL] 清空所有表失败', error);
    }
  }

  /**
   * 获取表信息
   */
  getTableInfo(tableName: string): { data: any[] } | null {
    const escapedName = this.escapeTableName(tableName);
    return alasql.tables[escapedName] || null;
  }

  /**
   * 转义表名
   */
  private escapeTableName(name: string): string {
    return name.replace(/\]/g, '\\]');
  }

  /**
   * 检查是否启用调试
   */
  private isDebugEnabled(): boolean {
    // 可以从全局配置读取
    return false;
  }

  /**
   * 获取已注册的函数列表
   */
  getRegisteredFunctions(): string[] {
    return Array.from(this.registeredFunctions);
  }

  /**
   * 获取已注册的表列表
   */
  getRegisteredTables(): string[] {
    return Array.from(this.registeredTables);
  }
}

// ============================================================
// SQL构建器
// ============================================================

/**
 * SQL构建器
 * 从结构化查询构建SQL语句
 */
export class SQLBuilder {
  /**
   * 构建SELECT语句
   */
  buildSelect(params: {
    from: string;
    columns?: string[];
    where?: string;
    orderBy?: string;
    limit?: number;
    offset?: number;
  }): string {
    const { from, columns, where, orderBy, limit, offset } = params;

    // SELECT子句
    const selectClause = columns && columns.length > 0
      ? columns.join(', ')
      : '*';

    let sql = `SELECT ${selectClause} FROM [${this.escapeTableName(from)}]`;

    // WHERE子句
    if (where) {
      sql += ` WHERE ${where}`;
    }

    // ORDER BY子句
    if (orderBy) {
      sql += ` ORDER BY ${orderBy}`;
    }

    // LIMIT子句
    if (limit !== undefined) {
      sql += ` LIMIT ${limit}`;
    }

    // OFFSET子句
    if (offset !== undefined) {
      sql += ` OFFSET ${offset}`;
    }

    return sql;
  }

  /**
   * 构建JOIN语句
   */
  buildJoin(clause: JoinClause): string {
    const { table, on, type = 'INNER' } = clause;
    return ` ${type} JOIN [${this.escapeTableName(table)}] ON ${on}`;
  }

  /**
   * 构建聚合查询
   */
  buildAggregation(params: {
    from: string;
    aggregations: Aggregation[];
    groupBy?: string[];
    having?: string;
    where?: string;
  }): string {
    const { from, aggregations, groupBy, having, where } = params;

    // SELECT子句
    const selectItems: string[] = [];

    // 聚合函数
    aggregations.forEach(agg => {
      const expr = agg.column === '*'
        ? `${agg.function}(*)`
        : `${agg.function}(${agg.column})`;

      selectItems.push(expr + (agg.alias ? ` AS ${agg.alias}` : ''));
    });

    // GROUP BY字段
    if (groupBy && groupBy.length > 0) {
      groupBy.forEach(col => selectItems.push(col));
    }

    let sql = `SELECT ${selectItems.join(', ')} FROM [${this.escapeTableName(from)}]`;

    // WHERE子句
    if (where) {
      sql += ` WHERE ${where}`;
    }

    // GROUP BY子句
    if (groupBy && groupBy.length > 0) {
      sql += ` GROUP BY ${groupBy.join(', ')}`;
    }

    // HAVING子句
    if (having) {
      sql += ` HAVING ${having}`;
    }

    return sql;
  }

  /**
   * 构建WHERE条件
   */
  buildWhere(conditions: Record<string, any>): string {
    const clauses: string[] = [];

    Object.entries(conditions).forEach(([column, value]) => {
      if (value === null || value === undefined) {
        clauses.push(`${column} IS NULL`);
      } else if (typeof value === 'object') {
        // 支持操作符：{ $gt: 100, $lt: 200 }
        Object.entries(value).forEach(([operator, operand]) => {
          const sqlOperator = this.mapOperator(operator);
          clauses.push(`${column} ${sqlOperator} ${this.formatValue(operand)}`);
        });
      } else if (Array.isArray(value)) {
        // IN 查询
        const values = value.map(v => this.formatValue(v)).join(', ');
        clauses.push(`${column} IN (${values})`);
      } else {
        clauses.push(`${column} = ${this.formatValue(value)}`);
      }
    });

    return clauses.join(' AND ');
  }

  /**
   * 映射操作符
   */
  private mapOperator(operator: string): string {
    const operatorMap: Record<string, string> = {
      $eq: '=',
      $ne: '!=',
      $gt: '>',
      $gte: '>=',
      $lt: '<',
      $lte: '<=',
      $like: 'LIKE'
    };

    return operatorMap[operator] || operator;
  }

  /**
   * 格式化值
   */
  private formatValue(value: any): string {
    if (typeof value === 'string') {
      const escaped = value.replace(/'/g, "''");
      return `'${escaped}'`;
    }
    if (typeof value === 'number') {
      return String(value);
    }
    if (typeof value === 'boolean') {
      return value ? '1' : '0';
    }
    if (value === null || value === undefined) {
      return 'NULL';
    }
    return `'${String(value)}'`;
  }

  /**
   * 转义表名
   */
  private escapeTableName(name: string): string {
    return name.replace(/\]/g, '\\]');
  }
}

// ============================================================
// 查询优化器
// ============================================================

interface CacheEntry {
  result: QueryResult;
  timestamp: number;
  hits: number;
}

/**
 * 查询优化器
 * 提供查询缓存和性能优化
 */
export class QueryOptimizer {
  private cache = new Map<string, CacheEntry>();
  private config: Required<Pick<QueryEngineConfig, 'enableCache' | 'cacheSize' | 'cacheTTL'>>;

  constructor(config: QueryEngineConfig = {}) {
    this.config = {
      enableCache: config.enableCache ?? true,
      cacheSize: config.cacheSize ?? 100,
      cacheTTL: config.cacheTTL ?? 300000 // 5分钟默认
    };
  }

  /**
   * 获取缓存结果
   */
  getCache(key: string): QueryResult | null {
    if (!this.config.enableCache) {
      return null;
    }

    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // 检查TTL
    const now = Date.now();
    if (now - entry.timestamp > this.config.cacheTTL) {
      this.cache.delete(key);
      return null;
    }

    // 更新命中次数
    entry.hits++;
    return entry.result;
  }

  /**
   * 设置缓存
   */
  setCache(key: string, result: QueryResult): void {
    if (!this.config.enableCache) {
      return;
    }

    // 检查缓存大小限制
    if (this.cache.size >= this.config.cacheSize) {
      this.evictLRU();
    }

    this.cache.set(key, {
      result,
      timestamp: Date.now(),
      hits: 0
    });
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 清除过期缓存
   */
  clearExpiredCache(): void {
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.config.cacheTTL) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 淘汰最少使用的缓存项
   */
  private evictLRU(): void {
    let minHits = Infinity;
    let lruKey: string | null = null;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.hits < minHits) {
        minHits = entry.hits;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }

  /**
   * 分析查询计划
   */
  analyze(sql: string): LocalQueryPlan {
    // 简单分析查询类型
    const lowerSQL = sql.toLowerCase();

    let type: LocalQueryPlan['type'] = 'simple';

    if (lowerSQL.includes('join')) {
      type = 'join';
    } else if (lowerSQL.includes('group by')) {
      type = 'aggregate';
    } else if (lowerSQL.includes('sum(') || lowerSQL.includes('avg(') || lowerSQL.includes('count(')) {
      type = 'aggregate';
    }

    // 提取涉及的表
    const tableMatches = sql.match(/from\s+\[([^\]]+)\]/gi) || [];
    const tables = tableMatches.map(match =>
      match.replace(/from\s+\[([^\]]+)\]/i, '$1')
    );

    return {
      type,
      tables,
      suggestions: this.generateSuggestions(sql, type)
    };
  }

  /**
   * 生成优化建议
   */
  private generateSuggestions(sql: string, type: LocalQueryPlan['type']): string[] {
    const suggestions: string[] = [];

    if (type === 'join') {
      suggestions.push('考虑为JOIN字段创建索引以提升性能');
    }

    if (sql.includes('LIKE')) {
      suggestions.push('LIKE查询可能较慢，考虑使用全文索引');
    }

    if (!sql.includes('LIMIT') && !sql.includes('TOP')) {
      suggestions.push('建议添加LIMIT限制返回行数');
    }

    return suggestions;
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): {
    size: number;
    hits: number;
    hitRate: number;
  } {
    let totalHits = 0;

    for (const entry of this.cache.values()) {
      totalHits += entry.hits;
    }

    return {
      size: this.cache.size,
      hits: totalHits,
      hitRate: this.cache.size > 0 ? totalHits / this.cache.size : 0
    };
  }
}

// ============================================================
// 数据查询引擎 - 主类
// ============================================================

/**
 * 数据查询引擎
 * 智能数据查询的核心
 */
export class DataQueryEngine {
  private dataSource: IMultiSheetDataSource;
  private executor: AlaSQLExecutor;
  private builder: SQLBuilder;
  private optimizer: QueryOptimizer;
  private parser: AIQueryParser;
  private sqlGenerator: SQLGenerator;
  private config: Required<QueryEngineConfig>;
  private initialized = false;

  constructor(
    dataSource?: IMultiSheetDataSource,
    config: QueryEngineConfig = {}
  ) {
    this.dataSource = dataSource || globalDataSource;
    this.executor = new AlaSQLExecutor();
    this.builder = new SQLBuilder();
    this.optimizer = new QueryOptimizer(config);
    this.config = {
      enableCache: config.enableCache ?? true,
      enableAI: config.enableAI ?? true,
      maxExecutionTime: config.maxExecutionTime ?? 10000,
      debugMode: config.debugMode ?? false,
      cacheSize: config.cacheSize ?? 100,
      cacheTTL: config.cacheTTL ?? 300000
    };

    // 延迟初始化AI组件（避免循环依赖）
    this.parser = null as any;
    this.sqlGenerator = null as any;
  }

  /**
   * 初始化引擎
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      this.debug('引擎已初始化，跳过');
      return;
    }

    try {
      this.debug('开始初始化数据查询引擎...');

      // 初始化AlaSQL执行器
      this.executor.initialize();

      // 初始化辅助函数
      initializeHelperFunctions();

      // 动态导入AI组件（避免循环依赖）
      const { AIQueryParser } = await import('./AIQueryParser');
      const { SQLGenerator } = await import('./SQLGenerator');

      this.parser = new AIQueryParser(this.dataSource);
      this.sqlGenerator = new SQLGenerator();

      this.initialized = true;
      this.debug('数据查询引擎初始化成功');
    } catch (error) {
      console.error('数据查询引擎初始化失败:', error);
      throw error;
    }
  }

  /**
   * 加载Excel数据
   */
  loadExcelData(excelData: ExcelData): void {
    if (!this.initialized) {
      throw new Error('引擎未初始化，请先调用 initialize()');
    }

    this.debug('开始加载Excel数据...');

    // 清空现有数据
    this.dataSource.clear();
    this.executor.dropAllTables();

    // 加载所有Sheet
    Object.entries(excelData.sheets).forEach(([sheetName, data], index) => {
      // 第一个Sheet优先级最高
      const priority = index === 0 ? 10 : 0;
      this.dataSource.registerSheet(sheetName, data, priority);
      this.executor.createTable(sheetName, data);
    });

    // 自动检测并建立表间关系
    this.autoDetectRelationships();

    const stats = this.dataSource.getStatistics();
    this.debug(`Excel数据加载完成: ${stats.sheetCount}个表, ${stats.totalRows}行`);
  }

  /**
   * 执行查询（主入口）
   * 支持三种查询方式：
   * 1. 自然语言字符串
   * 2. QueryRequest对象（包含SQL或结构化查询）
   */
  async query(query: string | QueryRequest): Promise<QueryResult> {
    const startTime = performance.now();

    try {
      // 确保已初始化
      if (!this.initialized) {
        await this.initialize();
      }

      // 统一为QueryRequest格式
      const request = typeof query === 'string'
        ? { naturalLanguage: query }
        : query;

      this.debug('执行查询:', request);

      // 根据查询类型路由
      if (request.sql) {
        return this.executeQuerySQL(request.sql, startTime);
      } else if (request.structured) {
        return this.executeQueryStructured(request.structured!, startTime);
      } else if (request.naturalLanguage) {
        return this.executeQueryNatural(request.naturalLanguage, startTime);
      } else {
        throw new Error('查询请求必须包含 naturalLanguage、sql 或 structured 之一');
      }
    } catch (error) {
      const executionTime = performance.now() - startTime;

      return {
        success: false,
        data: [],
        sql: '',
        executionTime,
        rowCount: 0,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 执行SQL查询
   */
  private async executeQuerySQL(sql: string, startTime: number): Promise<QueryResult> {
    // 检查缓存
    const cacheKey = `sql:${sql}`;
    const cached = this.optimizer.getCache(cacheKey);

    if (cached) {
      this.debug('使用缓存结果');
      return cached;
    }

    // 执行查询
    const data = this.executeWithTimeout(() => {
      return this.executor.execute<any[]>(sql);
    });

    const executionTime = performance.now() - startTime;

    // 构建结果
    const result: QueryResult = {
      success: true,
      data,
      sql,
      executionTime,
      rowCount: Array.isArray(data) ? data.length : 0,
      explanation: this.generateExplanation(sql, data)
    };

    // 缓存结果
    this.optimizer.setCache(cacheKey, result);

    return result;
  }

  /**
   * 执行结构化查询
   */
  private async executeQueryStructured(
    structured: StructuredQuery,
    startTime: number
  ): Promise<QueryResult> {
    // 检查缓存
    const cacheKey = `structured:${JSON.stringify(structured)}`;
    const cached = this.optimizer.getCache(cacheKey);

    if (cached) {
      this.debug('使用缓存结果');
      return cached;
    }

    // 构建SQL
    let sql: string;

    if (structured.aggregations && structured.aggregations.length > 0) {
      // 聚合查询
      const where = structured.where ? this.builder.buildWhere(structured.where) : undefined;
      sql = this.builder.buildAggregation({
        from: structured.from,
        aggregations: structured.aggregations,
        groupBy: structured.groupBy,
        where
      });
    } else {
      // 普通查询
      const where = structured.where ? this.builder.buildWhere(structured.where) : undefined;
      const orderBy = structured.orderBy
        ? `${structured.orderBy.column} ${structured.orderBy.direction.toUpperCase()}`
        : undefined;

      sql = this.builder.buildSelect({
        from: structured.from,
        columns: structured.select,
        where,
        orderBy,
        limit: structured.limit,
        offset: structured.offset
      });
    }

    // 执行查询
    const data = this.executeWithTimeout(() => {
      return this.executor.execute<any[]>(sql);
    });

    const executionTime = performance.now() - startTime;

    // 构建结果
    const result: QueryResult = {
      success: true,
      data,
      sql,
      executionTime,
      rowCount: Array.isArray(data) ? data.length : 0,
      explanation: this.generateExplanation(sql, data)
    };

    // 缓存结果
    this.optimizer.setCache(cacheKey, result);

    return result;
  }

  /**
   * 执行自然语言查询
   */
  private async executeQueryNatural(
    naturalLanguage: string,
    startTime: number
  ): Promise<QueryResult> {
    // 检查缓存
    const cacheKey = `nl:${naturalLanguage}`;
    const cached = this.optimizer.getCache(cacheKey);

    if (cached) {
      this.debug('使用缓存结果');
      return cached;
    }

    // 如果未启用AI，返回错误
    if (!this.config.enableAI) {
      throw new Error('AI查询未启用。请提供SQL查询或结构化查询。');
    }

    // AI解析查询
    const plan = await this.parser.parse(naturalLanguage);

    // 生成SQL
    const sql = this.sqlGenerator.generate(plan);

    // 执行查询
    const data = this.executeWithTimeout(() => {
      return this.executor.execute<any[]>(sql);
    });

    const executionTime = performance.now() - startTime;

    // 构建结果
    const result: QueryResult = {
      success: true,
      data,
      sql,
      executionTime,
      rowCount: Array.isArray(data) ? data.length : 0,
      explanation: this.generateExplanation(sql, data),
      plan
    };

    // 缓存结果
    this.optimizer.setCache(cacheKey, result);

    return result;
  }

  /**
   * 快速查询（便捷方法）
   */
  async quickQuery(
    sheet: string,
    column?: string,
    condition?: string
  ): Promise<any[]> {
    const select = column ? [column] : undefined;
    const where = condition ? { [column || sheet]: condition } : undefined;

    const result = await this.query({
      structured: {
        from: sheet,
        select,
        where
      }
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    return result.data;
  }

  /**
   * 批量查询
   */
  async batchQuery(queries: QueryRequest[]): Promise<QueryResult[]> {
    const results: QueryResult[] = [];

    for (const query of queries) {
      const result = await this.query(query);
      results.push(result);
    }

    return results;
  }

  /**
   * 带超时执行的查询
   */
  private executeWithTimeout<T>(fn: () => T): T {
    if (typeof Worker === 'undefined') {
      // 非浏览器环境，直接执行
      return fn();
    }

    // 简单实现：直接执行（实际应该使用Worker或超时机制）
    return fn();
  }

  /**
   * 自动检测表间关系
   */
  private autoDetectRelationships(): void {
    const sheetNames = this.dataSource.getSheetNames();

    if (sheetNames.length < 2) {
      return; // 只有一个表，无需关联
    }

    for (let i = 0; i < sheetNames.length; i++) {
      for (let j = i + 1; j < sheetNames.length; j++) {
        const sheet1 = sheetNames[i];
        const sheet2 = sheetNames[j];

        // 查找共同字段
        const commonColumns = this.findCommonColumns(sheet1, sheet2);

        // 建立关系
        commonColumns.forEach(col => {
          this.dataSource.createRelationship(sheet1, sheet2, col);
        });
      }
    }

    const relationships = this.dataSource.getRelationships();
    if (relationships.length > 0 && this.config.debugMode) {
      console.log('检测到表间关系:', relationships);
    }
  }

  /**
   * 查找两个Sheet的共同字段
   */
  private findCommonColumns(sheet1: string, sheet2: string): string[] {
    const data1 = this.dataSource.getSheet(sheet1);
    const data2 = this.dataSource.getSheet(sheet2);

    if (data1.length === 0 || data2.length === 0) return [];

    const cols1 = new Set(Object.keys(data1[0]));
    const cols2 = new Set(Object.keys(data2[0]));

    return [...cols1].filter(col => cols2.has(col));
  }

  /**
   * 生成查询结果说明
   */
  private generateExplanation(sql: string, data: any[]): string {
    const explanations: string[] = [];

    const lowerSQL = sql.toLowerCase();

    // 查询类型
    if (lowerSQL.includes('join')) {
      explanations.push('执行关联查询');
    } else if (lowerSQL.includes('group by')) {
      explanations.push('执行聚合分组查询');
    } else {
      explanations.push('执行简单查询');
    }

    // 结果数量
    const count = Array.isArray(data) ? data.length : 0;
    explanations.push(`返回${count}条记录`);

    return explanations.join('，');
  }

  /**
   * 调试输出
   */
  private debug(...args: any[]): void {
    if (this.config.debugMode) {
      console.log('[DataQueryEngine]', ...args);
    }
  }

  /**
   * 获取数据源统计信息
   */
  getStatistics() {
    return this.dataSource.getStatistics();
  }

  /**
   * 获取所有可用表名
   */
  getTableNames(): string[] {
    return this.dataSource.getSheetNames();
  }

  /**
   * 获取指定表的列名
   */
  getColumns(tableName: string): string[] {
    if (this.dataSource.getColumnsForSheet) {
      return this.dataSource.getColumnsForSheet(tableName);
    }
    return [];
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.optimizer.clearCache();
    if (this.parser) {
      this.parser.clearCache();
    }
  }

  /**
   * 获取缓存统计
   */
  getCacheStats() {
    return this.optimizer.getCacheStats();
  }

  /**
   * 重置引擎
   */
  reset(): void {
    this.dataSource.clear();
    this.executor.dropAllTables();
    this.clearCache();
    this.initialized = false;
  }

  /**
   * 启用/禁用调试模式
   */
  setDebugMode(enabled: boolean): void {
    this.config.debugMode = enabled;
  }

  /**
   * 启用/禁用AI
   */
  setAIEnabled(enabled: boolean): void {
    this.config.enableAI = enabled;
  }

  /**
   * 启用/禁用缓存
   */
  setCacheEnabled(enabled: boolean): void {
    this.config.enableCache = enabled;
    if (!enabled) {
      this.clearCache();
    }
  }
}

// ============================================================
// 全局单例实例
// ============================================================

/**
 * 全局查询引擎实例
 */
export const globalQueryEngine = new DataQueryEngine();

/**
 * 快速查询（使用全局引擎）
 */
export async function quickQuery(
  excelData: ExcelData,
  query: string | QueryRequest
): Promise<QueryResult> {
  const engine = new DataQueryEngine();
  await engine.initialize();
  engine.loadExcelData(excelData);
  return engine.query(query);
}

/**
 * 批量查询
 */
export async function batchQuery(
  excelData: ExcelData,
  queries: QueryRequest[]
): Promise<QueryResult[]> {
  const engine = new DataQueryEngine();
  await engine.initialize();
  engine.loadExcelData(excelData);

  const results: QueryResult[] = [];
  for (const query of queries) {
    const result = await engine.query(query);
    results.push(result);
  }

  return results;
}

// ============================================================
// 导出
// ============================================================

export default DataQueryEngine;
