/**
 * AI查询解析器
 * 将自然语言转换为结构化查询计划
 */

import Anthropic from "@anthropic-ai/sdk";
import { IMultiSheetDataSource } from './MultiSheetDataSource';
import { SAMPLING_CONFIG } from '../../config/samplingConfig';

// 配置智谱AI客户端
// 环境检测：兼容浏览器和Node.js环境
const isNodeEnv = typeof process !== 'undefined' && process.env !== undefined;
let client: Anthropic | null = null;

const getClient = (): Anthropic => {
  if (!client) {
    const apiKey = isNodeEnv
      ? (process.env.ZHIPU_API_KEY || process.env.API_KEY || '')
      : (import.meta.env.VITE_ANTHROPIC_API_KEY || '');

    if (!apiKey) {
      throw new Error('AI服务API密钥未配置。请检查环境变量：\n' +
        '- Node.js环境: ZHIPU_API_KEY 或 API_KEY\n' +
        '- 浏览器环境: VITE_ANTHROPIC_API_KEY');
    }

    client = new Anthropic({
      apiKey,
      baseURL: 'https://open.bigmodel.cn/api/anthropic',
      dangerouslyAllowBrowser: true // 允许浏览器环境调用（个人使用可接受）
    });
  }
  return client;
};

// ============================================================
// 类型定义
// ============================================================

export type QueryType = 'simple' | 'aggregate' | 'join' | 'complex' | 'transform';

export interface FilterCondition {
  column: string;
  operator: '=' | '>' | '<' | '>=' | '<=' | '!=' | 'LIKE' | 'IN';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface JoinCondition {
  from: string;
  to: string;
  on: string;
  type?: 'INNER' | 'LEFT' | 'RIGHT';
}

export interface AggregationSpec {
  function: 'SUM' | 'AVG' | 'COUNT' | 'MAX' | 'MIN';
  column: string;
  alias?: string;
}

export interface QueryOperation {
  type: 'select' | 'filter' | 'group' | 'aggregate' | 'transform' | 'sort';
  target: string;
  alias?: string;
  params?: any;
}

export interface QueryPlan {
  queryType: QueryType;
  targetSheets: string[];
  operations: QueryOperation[];
  filters: FilterCondition[];
  joins: JoinCondition[];
  aggregations: AggregationSpec[];
  groupBy?: string[];
  orderBy?: { column: string; direction: 'ASC' | 'DESC' }[];
  limit?: number;
  explanation?: string;
  confidence?: number;
}

export interface QueryIntent {
  queryType: QueryType;
  needsAggregation: boolean;
  needsJoin: boolean;
  needsFilter: boolean;
  targetFields: string[];
  conditions: string[];
  timeRange?: string;
}

export interface QueryEntities {
  sheets: string[];
  columns: Map<string, string>; // 别名 -> 实际列名
  values: Map<string, any>; // 参数名 -> 实际值
  relationships: JoinCondition[];
}

// ============================================================
// AI查询解析器
// ============================================================

export class AIQueryParser {
  private dataSource: IMultiSheetDataSource;
  private cache: Map<string, QueryPlan> = new Map();
  private cacheEnabled: boolean = true;

  constructor(dataSource: IMultiSheetDataSource) {
    this.dataSource = dataSource;
  }

  /**
   * 解析自然语言查询
   */
  async parse(naturalLanguage: string): Promise<QueryPlan> {
    // 检查缓存
    if (this.cacheEnabled && this.cache.has(naturalLanguage)) {
      return this.cache.get(naturalLanguage)!;
    }

    try {
      // Step 1: 提取查询意图
      const intent = await this.extractIntent(naturalLanguage);

      // Step 2: 识别实体
      const entities = await this.extractEntities(naturalLanguage, intent);

      // Step 3: 构建查询计划
      const plan = this.buildQueryPlan(intent, entities);

      // Step 4: 优化查询计划
      const optimizedPlan = await this.optimizePlan(plan);

      // 缓存结果
      if (this.cacheEnabled) {
        this.cache.set(naturalLanguage, optimizedPlan);
      }

      return optimizedPlan;

    } catch (error) {
      console.error('查询解析失败:', error);
      throw new Error(`AI查询解析失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 提取查询意图
   */
  private async extractIntent(query: string): Promise<QueryIntent> {
    const prompt = `
你是一个查询意图分析专家。请分析以下自然语言查询的意图。

【用户查询】
"${query}"

【分析维度】
1. 查询类型：
   - simple: 简单字段查询（如"张三的姓名"）
   - aggregate: 聚合查询（如"总销售额"、"平均成绩"）
   - join: 跨表关联查询（如"张三的绩效"）
   - transform: 数据转换查询（如"提取电话号码"）
   - complex: 复杂组合查询

2. 是否需要聚合操作（SUM, AVG, COUNT等）

3. 是否需要跨表关联（JOIN）

4. 是否需要筛选条件（WHERE）

5. 目标字段（用户想要获取什么信息）

6. 条件参数（筛选条件、时间范围等）

【输出格式】
输出纯JSON（不要Markdown标记）：
{
  "queryType": "simple",
  "needsAggregation": false,
  "needsJoin": false,
  "needsFilter": true,
  "targetFields": ["姓名", "销售额"],
  "conditions": ["姓名=张三"],
  "timeRange": null
}

【示例】
查询: "张三在2023年的总销售额"
输出:
{
  "queryType": "aggregate",
  "needsAggregation": true,
  "needsJoin": false,
  "needsFilter": true,
  "targetFields": ["销售额"],
  "conditions": ["姓名=张三", "年份=2023"],
  "timeRange": "2023年"
}

现在请分析上述查询并输出JSON。
`;

    try {
      const response = await getClient().messages.create({
        model: "glm-4.7",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }]
      });

      const text = response.content[0]?.type === 'text' ? response.content[0].text : "";
      const cleaned = this.cleanJSONResponse(text);

      return JSON.parse(cleaned);
    } catch (error) {
      console.warn('意图提取失败，使用降级策略:', error);
      return this.fallbackIntentExtraction(query);
    }
  }

  /**
   * 识别实体（表名、字段名、值）
   */
  private async extractEntities(
    query: string,
    intent: QueryIntent
  ): Promise<QueryEntities> {
    const availableSheets = this.dataSource.getSheetNames();
    const allColumns = this.getAllAvailableColumns();

    const prompt = `
你是一个实体识别专家。请从查询中提取具体的实体信息。

【用户查询】
"${query}"

【查询意图】
${JSON.stringify(intent, null, 2)}

【可用数据源】
Sheet列表: ${JSON.stringify(availableSheets)}

【可用字段】(前${SAMPLING_CONFIG.QUERY_ENGINE.TOP_COLUMNS}个)
${allColumns.slice(0, SAMPLING_CONFIG.QUERY_ENGINE.TOP_COLUMNS).map(col => `- ${col}`).join('\n')}

【任务】
1. 识别查询涉及的Sheet（可能需要关联多个Sheet）
2. 将查询中的字段名映射到实际的列名（考虑别名、缩写）
3. 提取条件值（如"张三"、"2023年"）
4. 识别表间关联关系（如果需要跨表查询）

【输出格式】
输出纯JSON：
{
  "sheets": ["Sheet1"],
  "columns": {
    "用户提到的字段": "实际的列名",
    "销售额": "销售额",
    "年份": "年份"
  },
  "values": {
    "姓名": "张三",
    "年份": 2023
  },
  "relationships": []
}

【跨表关联示例】
如果查询涉及多个Sheet的关联：
{
  "relationships": [
    {"from": "Sheet1", "to": "Sheet2", "on": "姓名", "type": "INNER"}
  ]
}

现在请提取实体并输出JSON。
`;

    try {
      const response = await getClient().messages.create({
        model: "glm-4.7",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }]
      });

      const text = response.content[0]?.type === 'text' ? response.content[0].text : "";
      const cleaned = this.cleanJSONResponse(text);

      const parsed = JSON.parse(cleaned);

      // 转换为Map格式
      return {
        sheets: parsed.sheets || [],
        columns: new Map(Object.entries(parsed.columns || {})),
        values: new Map(Object.entries(parsed.values || {})),
        relationships: parsed.relationships || []
      };
    } catch (error) {
      console.warn('实体识别失败，使用降级策略:', error);
      return this.fallbackEntityExtraction(query, intent);
    }
  }

  /**
   * 构建查询计划
   */
  private buildQueryPlan(intent: QueryIntent, entities: QueryEntities): QueryPlan {
    const plan: QueryPlan = {
      queryType: intent.queryType,
      targetSheets: entities.sheets,
      operations: [],
      filters: [],
      joins: entities.relationships,
      aggregations: [],
      explanation: ''
    };

    // 构建操作列表
    intent.targetFields.forEach(field => {
      const actualColumn = entities.columns.get(field) || field;
      plan.operations.push({
        type: 'select',
        target: actualColumn,
        alias: field
      });
    });

    // 构建过滤条件
    intent.conditions.forEach(condition => {
      const parsed = this.parseCondition(condition, entities);
      if (parsed) {
        plan.filters.push(parsed);
      }
    });

    // 构建聚合操作
    if (intent.needsAggregation) {
      const aggregation = this.inferAggregation(intent);
      if (aggregation) {
        plan.aggregations.push(aggregation);
      }
    }

    return plan;
  }

  /**
   * 推断聚合函数
   */
  private inferAggregation(intent: QueryIntent): AggregationSpec | null {
    const queryLower = intent.targetFields.join(' ').toLowerCase();

    if (queryLower.includes('总') || queryLower.includes('合计')) {
      return {
        function: 'SUM',
        column: intent.targetFields[0],
        alias: `总计_${intent.targetFields[0]}`
      };
    }

    if (queryLower.includes('平均')) {
      return {
        function: 'AVG',
        column: intent.targetFields[0],
        alias: `平均_${intent.targetFields[0]}`
      };
    }

    if (queryLower.includes('数量') || queryLower.includes('个数') || queryLower.includes('计数')) {
      return {
        function: 'COUNT',
        column: intent.targetFields[0] || '*',
        alias: '数量'
      };
    }

    return null;
  }

  /**
   * 解析条件字符串
   */
  private parseCondition(
    condition: string,
    entities: QueryEntities
  ): FilterCondition | null {
    // 解析 "姓名=张三" 格式
    const match = condition.match(/(.+?)(=|>=|<=|>|<|!=)(.+)/);
    if (match) {
      const [, column, operator, value] = match;
      const actualColumn = entities.columns.get(column.trim()) || column.trim();
      const actualValue = entities.values.get(value.trim()) || value.trim();

      return {
        column: actualColumn,
        operator: operator as FilterCondition['operator'],
        value: actualValue
      };
    }

    return null;
  }

  /**
   * 优化查询计划
   */
  private async optimizePlan(plan: QueryPlan): Promise<QueryPlan> {
    // TODO: 实现查询优化逻辑
    // 1. 选择最优的JOIN顺序
    // 2. 尽早应用过滤条件
    // 3. 使用索引加速查询
    return plan;
  }

  /**
   * 获取所有可用列
   */
  private getAllAvailableColumns(): string[] {
    const sheets = this.dataSource.getSheetNames();
    const columns: string[] = [];

    sheets.forEach(sheetName => {
      const sheetColumns = this.dataSource.getColumnsForSheet
        ? this.dataSource.getColumnsForSheet(sheetName)
        : [];

      sheetColumns.forEach(col => {
        columns.push(`${sheetName}.${col}`);
        columns.push(col); // 同时添加不带表前缀的列名
      });
    });

    return [...new Set(columns)];
  }

  /**
   * 清理AI响应中的JSON
   */
  private cleanJSONResponse(text: string): string {
    let cleaned = text.trim();

    // 移除Markdown代码块标记
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```\s*$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/```\s*$/, '');
    }

    // 查找JSON对象边界
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');

    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
    }

    return cleaned;
  }

  /**
   * 降级策略：简单意图提取
   */
  private fallbackIntentExtraction(query: string): QueryIntent {
    const queryLower = query.toLowerCase();

    // 简单规则匹配
    let queryType: QueryType = 'simple';
    if (queryLower.includes('总') || queryLower.includes('平均') || queryLower.includes('数量')) {
      queryType = 'aggregate';
    }

    return {
      queryType,
      needsAggregation: queryType === 'aggregate',
      needsJoin: false,
      needsFilter: query.includes('=') || query.includes('大于') || query.includes('小于'),
      targetFields: [],
      conditions: []
    };
  }

  /**
   * 降级策略：简单实体提取
   */
  private fallbackEntityExtraction(
    query: string,
    intent: QueryIntent
  ): QueryEntities {
    const sheets = this.dataSource.getSheetNames();

    return {
      sheets: sheets.length > 0 ? [sheets[0]] : [],
      columns: new Map(),
      values: new Map(),
      relationships: []
    };
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 启用/禁用缓存
   */
  setCacheEnabled(enabled: boolean): void {
    this.cacheEnabled = enabled;
    if (!enabled) {
      this.clearCache();
    }
  }
}

// ============================================================
// 导出
// ============================================================

export default AIQueryParser;
