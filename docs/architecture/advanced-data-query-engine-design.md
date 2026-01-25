# 高级数据查询引擎架构设计方案

## 一、复杂场景技术难点分析

### 1.1 多Sheet联合查询场景

**技术难点：**
- **跨Sheet数据关联**：需要建立Sheet间的数据引用关系
- **数据源路由**：根据字段名自动定位到正确的Sheet
- **关联键匹配**：智能识别不同Sheet间的关联字段（如"姓名"）
- **冲突解决**：当多个Sheet存在同名列时的优先级策略

**当前架构缺陷：**
```typescript
// 当前实现：只支持单Sheet数据处理
interface ExcelData {
  sheets: { [sheetName: string]: any[] };
  currentSheetName: string; // ❌ 只能处理单个Sheet
}
```

### 1.2 复杂聚合查询场景

**技术难点：**
- **条件筛选**：需要支持多条件AND/OR组合
- **分组聚合**：SUM、AVG、COUNT、MAX、MIN等聚合函数
- **时间范围处理**：动态日期解析（"2023年"、"最近3个月"）
- **跨行计算**：需要完整遍历数据集

**示例查询需求：**
```
"张三在2023年的总销售额"
↓ 需要解析为
SELECT SUM(销售额)
FROM data
WHERE 姓名 = '张三' AND 年份 = 2023
```

### 1.3 单元格多值提取场景

**技术难点：**
- **非结构化数据解析**：单元格内容格式不统一
- **正则表达式匹配**：需要智能识别电话、邮箱等模式
- **部分提取**：从混合文本中提取特定信息

**示例数据：**
```
联系方式列："电话:021-12345678 邮箱:zhangsan@company.com"
↓ 需要提取为
{ 电话: "021-12345678", 邮箱: "zhangsan@company.com" }
```

### 1.4 跨列关联查询场景

**技术难点：**
- **多跳关联**：Sheet A → Sheet B → Sheet C
- **链式查询优化**：避免多次全表扫描
- **外键关系识别**：自动识别表间关系
- **循环依赖检测**：防止无限递归

---

## 二、技术栈选型建议

### 2.1 核心技术栈

#### 数据查询引擎层
```typescript
// 推荐使用内存数据库引擎
import {
  // 方案1: AlaSQL (推荐) - 纯SQL接口，支持JSON查询
  alasql
  // 方案2: Linq - TypeScript强类型查询
  // 方案3: 自研查询引擎 - 针对Excel优化的DSL
} from 'query-engine';
```

**AlaSQL优势：**
- ✅ 支持标准SQL语法
- ✅ 直接操作JavaScript对象
- ✅ 支持JOIN、GROUP BY、聚合函数
- ✅ 零依赖，体积小（200KB）
- ✅ 兼容Excel数据结构

#### AI增强层
```typescript
// 当前使用的智谱AI已足够，增强提示词策略
const AI_ENHANCEMENT = {
  // Few-Shot Learning + Chain-of-Thought
  queryUnderstanding: "自然语言→SQL转换",
  semanticMatching: "字段名语义相似度匹配",
  relationshipInference: "表间关系推理"
};
```

#### 数据处理层
```typescript
import {
  lodash, // 数据处理工具库
  moment, // 日期处理
  jsonpath, // JSONPath查询（用于嵌套数据）
  exceljs // 更强大的Excel读写（替代XLSX）
};
```

### 2.2 技术栈对比表

| 方案 | 优势 | 劣势 | 适用场景 |
|------|------|------|----------|
| **AlaSQL** | 标准SQL、功能强大 | 性能略逊 | 复杂查询、聚合 |
| **Linq2JS** | 类型安全、IDE支持 | 学习曲线陡 | TypeScript项目 |
| **自研DSL** | 完全定制、性能最优 | 开发成本高 | 特定场景优化 |
| **MongoDB查询** | 灵活、文档型 | 需要服务端 | 大规模数据 |

**推荐选择：AlaSQL + 自研辅助函数**
- 简单场景：直接SQL
- 复杂场景：AI生成SQL + 辅助函数
- 性能优化：内存索引缓存

---

## 三、数据查询引擎架构设计

### 3.1 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      用户接口层                               │
│  Natural Language Input: "张三2023年总销售额，从绩效表取"    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   AI语义解析层                                │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │  意图识别        │  │  实体提取        │                  │
│  │  - 查询类型      │  │  - 表名          │                  │
│  │  - 聚合函数      │  │  - 字段名        │                  │
│  │  - 筛选条件      │  │  - 关联关系      │                  │
│  └─────────────────┘  └─────────────────┘                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                 查询构建层 (Query Builder)                    │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │  SQL生成器       │  │  执行计划优化    │                  │
│  │  - SELECT构建    │  │  - 索引选择      │                  │
│  │  - JOIN优化      │  │  - 缓存策略      │                  │
│  │  - WHERE条件     │  │  - 并行执行      │                  │
│  └─────────────────┘  └─────────────────┘                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              数据执行层 (Data Execution Engine)               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           AlaSQL 内存数据库                            │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐            │   │
│  │  │ Sheet1   │  │ Sheet2   │  │ Sheet3   │            │   │
│  │  │ (索引化) │  │ (索引化) │  │ (索引化) │            │   │
│  │  └──────────┘  └──────────┘  └──────────┘            │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           辅助函数库                                   │   │
│  │  - extractPhone()  - extractEmail()                   │   │
│  │  - dateRange()    - multiValueSplit()                 │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   结果处理层                                  │
│  - 数据转换  - 格式化  - 错误处理  - 缓存更新                │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 核心模块设计

#### 3.2.1 多Sheet数据源管理器

```typescript
/**
 * 多Sheet数据源管理器
 * 职责：统一管理多个Sheet的数据访问
 */
interface MultiSheetDataSource {
  // 注册Sheet数据
  registerSheet(sheetName: string, data: any[]): void;

  // 获取Sheet数据
  getSheet(sheetName: string): any[];

  // 智能字段查找（自动定位到包含该字段的Sheet）
  findSheetByColumn(columnName: string): string | null;

  // 建立Sheet间关联
  createRelationship(
    fromSheet: string,
    toSheet: string,
    onColumn: string
  ): void;

  // 获取所有Sheet名
  getSheetNames(): string[];
}

class AlasqlDataSource implements MultiSheetDataSource {
  private sheets: Map<string, any[]> = new Map();
  private columnIndex: Map<string, Set<string>> = new Map(); // 列名→Sheet集合
  private relationships: Map<string, Relationship> = new Map();

  registerSheet(sheetName: string, data: any[]): void {
    this.sheets.set(sheetName, data);

    // 构建列索引
    if (data.length > 0) {
      const columns = Object.keys(data[0]);
      columns.forEach(col => {
        if (!this.columnIndex.has(col)) {
          this.columnIndex.set(col, new Set());
        }
        this.columnIndex.get(col)!.add(sheetName);
      });

      // 创建AlaSQL表
      alasql(`CREATE TABLE IF NOT EXISTS [${sheetName}]`);
      alasql.tables[sheetName] = { data: data };
    }
  }

  findSheetByColumn(columnName: string): string | null {
    const sheets = this.columnIndex.get(columnName);
    if (!sheets || sheets.size === 0) return null;
    if (sheets.size === 1) return sheets.values().next().value;

    // 多个Sheet包含该列，返回优先级最高的（根据用户配置或AI推荐）
    return this.resolveColumnConflict(columnName, sheets);
  }

  private resolveColumnConflict(
    columnName: string,
    sheets: Set<string>
  ): string {
    // 策略1：优先主表
    // 策略2：AI推荐
    // 策略3：用户确认
    return Array.from(sheets)[0]; // 简化实现
  }

  createRelationship(fromSheet: string, toSheet: string, onColumn: string): void {
    const key = `${fromSheet}.${toSheet}`;
    this.relationships.set(key, {
      from: fromSheet,
      to: toSheet,
      on: onColumn
    });
  }
}
```

#### 3.2.2 AI查询解析器

```typescript
/**
 * AI查询解析器
 * 职责：将自然语言转换为结构化查询计划
 */
interface QueryPlan {
  queryType: 'simple' | 'aggregate' | 'join' | 'complex';
  targetSheets: string[];
  operations: QueryOperation[];
  filters: FilterCondition[];
  joins: JoinCondition[];
  aggregations: AggregationSpec[];
}

interface QueryOperation {
  type: 'select' | 'filter' | 'group' | 'aggregate' | 'transform';
  target: string; // 目标字段或表
  params?: any;
}

class AIQueryParser {
  async parse(
    naturalLanguage: string,
    dataSource: MultiSheetDataSource
  ): Promise<QueryPlan> {
    // Step 1: 调用AI理解意图
    const intent = await this.extractIntent(naturalLanguage);

    // Step 2: 识别实体（表名、字段名、条件值）
    const entities = await this.extractEntities(naturalLanguage, dataSource);

    // Step 3: 构建查询计划
    const plan = this.buildQueryPlan(intent, entities);

    // Step 4: 优化查询计划
    return this.optimizePlan(plan, dataSource);
  }

  private async extractIntent(query: string): Promise<QueryIntent> {
    const prompt = `
分析以下查询的意图：
"${query}"

输出JSON格式：
{
  "queryType": "simple|aggregate|join|complex",
  "needsAggregation": boolean,
  "needsJoin": boolean,
  "targetFields": string[],
  "conditions": string[]
}
`;

    const response = await callAI(prompt);
    return JSON.parse(response);
  }

  private async extractEntities(
    query: string,
    dataSource: MultiSheetDataSource
  ): Promise<QueryEntities> {
    const availableSheets = dataSource.getSheetNames();
    const allColumns = this.getAllColumns(dataSource);

    const prompt = `
从查询中提取实体：
查询："${query}"

可用数据源：
- Sheet列表：${JSON.stringify(availableSheets)}
- 所有字段：${JSON.stringify(allColumns.slice(0, 50))}

输出JSON：
{
  "sheets": ["实际用到的Sheet名"],
  "columns": { "别名": "实际字段名" },
  "values": { "参数名": "实际值" },
  "relationships": [{ "from": "Sheet1", "to": "Sheet2", "on": "关联字段" }]
}
`;

    const response = await callAI(prompt);
    return JSON.parse(response);
  }

  private buildQueryPlan(
    intent: QueryIntent,
    entities: QueryEntities
  ): QueryPlan {
    return {
      queryType: intent.queryType,
      targetSheets: entities.sheets,
      operations: this.buildOperations(intent, entities),
      filters: this.buildFilters(intent.conditions, entities),
      joins: entities.relationships,
      aggregations: this.buildAggregations(intent)
    };
  }

  private optimizePlan(
    plan: QueryPlan,
    dataSource: MultiSheetDataSource
  ): QueryPlan {
    // 优化策略：
    // 1. 尽早应用过滤条件
    // 2. 选择合适的JOIN顺序
    // 3. 使用索引加速查询
    // 4. 并行化独立操作

    return plan; // 简化实现
  }
}
```

#### 3.2.3 SQL生成器

```typescript
/**
 * SQL生成器
 * 职责：将查询计划转换为可执行的SQL语句
 */
class SQLGenerator {
  generate(plan: QueryPlan): string {
    switch (plan.queryType) {
      case 'simple':
        return this.generateSimpleSelect(plan);
      case 'aggregate':
        return this.generateAggregateQuery(plan);
      case 'join':
        return this.generateJoinQuery(plan);
      case 'complex':
        return this.generateComplexQuery(plan);
      default:
        throw new Error(`未知查询类型: ${plan.queryType}`);
    }
  }

  private generateSimpleSelect(plan: QueryPlan): string {
    const { targetSheets, operations, filters } = plan;
    const sheet = targetSheets[0];

    const selectClause = operations
      .filter(op => op.type === 'select')
      .map(op => op.target)
      .join(', ');

    const whereClause = this.buildWhereClause(filters);

    return `SELECT ${selectClause} FROM [${sheet}]${whereClause}`;
  }

  private generateAggregateQuery(plan: QueryPlan): string {
    const { targetSheets, aggregations, filters } = plan;
    const sheet = targetSheets[0];

    const selectClause = aggregations
      .map(agg => `${agg.function}(${agg.column}) AS ${agg.alias}`)
      .join(', ');

    const whereClause = this.buildWhereClause(filters);

    return `SELECT ${selectClause} FROM [${sheet}]${whereClause}`;
  }

  private generateJoinQuery(plan: QueryPlan): string {
    const { targetSheets, joins, operations, filters } = plan;

    let sql = `SELECT ${operations.map(op => op.target).join(', ')} `;
    sql += `FROM [${targetSheets[0]}] AS t1 `;

    joins.forEach((join, index) => {
      const alias = `t${index + 2}`;
      sql += `JOIN [${join.to}] AS ${alias} ON t1.${join.on} = ${alias}.${join.on} `;
    });

    sql += this.buildWhereClause(filters);

    return sql;
  }

  private buildWhereClause(filters: FilterCondition[]): string {
    if (filters.length === 0) return '';

    const conditions = filters
      .map(f => `${f.column} ${f.operator} '${f.value}'`)
      .join(' AND ');

    return ` WHERE ${conditions}`;
  }
}
```

#### 3.2.4 辅助函数库

```typescript
/**
 * 数据处理辅助函数库
 * 职责：提供复杂的数据提取和转换功能
 */
class DataHelperFunctions {
  // 注册所有自定义函数到AlaSQL
  static registerAll(): void {
    alasql.fn.extractPhone = this.extractPhone;
    alasql.fn.extractEmail = this.extractEmail;
    alasql.fn.multiValueSplit = this.multiValueSplit;
    alasql.fn.parseDateRange = this.parseDateRange;
    alasql.fn.columnToArray = this.columnToArray;
  }

  /**
   * 从混合文本中提取电话号码
   * 示例："电话:021-12345678 邮箱:xxx" → "021-12345678"
   */
  static extractPhone(text: string): string | null {
    const phoneRegex = /电话[：:]\s*(\d{3,4}-\d{7,8}|\d{11})/;
    const match = text.match(phoneRegex);
    return match ? match[1] : null;
  }

  /**
   * 从混合文本中提取邮箱
   */
  static extractEmail(text: string): string | null {
    const emailRegex = /邮箱[：:]\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
    const match = text.match(emailRegex);
    return match ? match[1] : null;
  }

  /**
   * 分割多值单元格
   * 示例："北京,上海,深圳" → ["北京", "上海", "深圳"]
   */
  static multiValueSplit(text: string, separator: string = ','): string[] {
    return text.split(separator).map(s => s.trim()).filter(s => s);
  }

  /**
   * 解析日期范围
   * 示例："2023年" → [2023-01-01, 2023-12-31]
   */
  static parseDateRange(dateStr: string): [Date, Date] {
    // 简化实现
    if (dateStr.includes('年')) {
      const year = parseInt(dateStr);
      return [new Date(year, 0, 1), new Date(year, 11, 31)];
    }
    throw new Error(`不支持的日期格式: ${dateStr}`);
  }

  /**
   * 将列值转换为数组（用于IN查询）
   */
  static columnToArray(rows: any[], columnName: string): any[] {
    return rows.map(row => row[columnName]);
  }
}
```

### 3.3 完整执行流程示例

```typescript
/**
 * 查询引擎主类
 */
class DataQueryEngine {
  private dataSource: MultiSheetDataSource;
  private parser: AIQueryParser;
  private sqlGenerator: SQLGenerator;

  constructor() {
    this.dataSource = new AlasqlDataSource();
    this.parser = new AIQueryParser();
    this.sqlGenerator = new SQLGenerator();

    // 注册辅助函数
    DataHelperFunctions.registerAll();
  }

  /**
   * 加载Excel数据
   */
  loadExcelData(excelData: ExcelData): void {
    Object.entries(excelData.sheets).forEach(([sheetName, data]) => {
      this.dataSource.registerSheet(sheetName, data);
    });

    // 自动检测并建立表间关系
    this.autoDetectRelationships(excelData);
  }

  /**
   * 执行自然语言查询
   */
  async query(naturalLanguage: string): Promise<QueryResult> {
    try {
      // 1. 解析查询
      const plan = await this.parser.parse(naturalLanguage, this.dataSource);

      // 2. 生成SQL
      const sql = this.sqlGenerator.generate(plan);

      console.log('生成的SQL:', sql);

      // 3. 执行查询
      const result = alasql(sql);

      return {
        success: true,
        data: result,
        sql: sql,
        plan: plan
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * 自动检测表间关系
   */
  private autoDetectRelationships(excelData: ExcelData): void {
    const sheetNames = Object.keys(excelData.sheets);

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
  }

  private findCommonColumns(sheet1: string, sheet2: string): string[] {
    const data1 = this.dataSource.getSheet(sheet1);
    const data2 = this.dataSource.getSheet(sheet2);

    if (data1.length === 0 || data2.length === 0) return [];

    const cols1 = new Set(Object.keys(data1[0]));
    const cols2 = new Set(Object.keys(data2[0]));

    return [...cols1].filter(col => cols2.has(col));
  }
}

// 使用示例
const engine = new DataQueryEngine();
engine.loadExcelData(excelData);

// 示例1: 简单查询
const result1 = await engine.query("张三的部门");
// 生成SQL: SELECT 部门 FROM [Sheet1] WHERE 姓名 = '张三'

// 示例2: 聚合查询
const result2 = await engine.query("张三在2023年的总销售额");
// 生成SQL: SELECT SUM(销售额) FROM [Sheet1] WHERE 姓名 = '张三' AND 年份 = 2023

// 示例3: 跨Sheet查询
const result3 = await engine.query("张三的绩效分数");
// 生成SQL: SELECT t2.绩效 FROM [Sheet1] AS t1 JOIN [Sheet2] AS t2 ON t1.姓名 = t2.姓名 WHERE t1.姓名 = '张三'

// 示例4: 多值提取
const result4 = await engine.query("所有员工的电话号码");
// 生成SQL: SELECT 姓名, extractPhone(联系方式) AS 电话 FROM [Sheet1]
```

---

## 四、AI介入策略

### 4.1 三级AI介入策略

#### Level 1: 模板匹配（无需AI）
```typescript
// 预定义查询模板
const QUERY_TEMPLATES = {
  SIMPLE_FIELD: '{name}的{field}',
  AGGREGATE: '{name}在{period}的总{metric}',
  FILTER: '{metric}大于{value}的记录'
};

function matchTemplate(query: string): QueryPlan | null {
  // 简单规则匹配，无需调用AI
}
```

#### Level 2: Few-Shot Learning（标准AI）
```typescript
// 提供少量示例，让AI理解查询模式
const FEW_SHOT_EXAMPLES = `
示例1:
查询: "张三的总销售额"
SQL: SELECT SUM(销售额) FROM 表 WHERE 姓名='张三'

示例2:
查询: "2023年各部门平均绩效"
SQL: SELECT 部门, AVG(绩效) FROM 表 WHERE 年份=2023 GROUP BY 部门
`;
```

#### Level 3: Chain-of-Thought（复杂推理）
```typescript
// 让AI逐步推理查询逻辑
const COT_PROMPT = `
让我们一步步分析这个查询：
"${query}"

步骤1: 识别查询意图（聚合/筛选/关联）
步骤2: 确定涉及的数据表
步骤3: 提取字段名和条件
步骤4: 构建SQL语句

请按照上述步骤思考并输出结果。
`;
```

### 4.2 AI Prompt优化建议

```typescript
const SYSTEM_PROMPT = `
你是一个专业的SQL查询生成专家。你的任务是将自然语言转换为精确的SQL语句。

【规则】
1. 表名必须用方括号包裹，如 [Sheet1]
2. 字符串值用单引号包裹
3. 使用标准SQL函数 (SUM, AVG, MAX, MIN, COUNT)
4. 日期格式: 'YYYY-MM-DD'
5. 支持自定义函数: extractPhone(), extractEmail()

【示例】
输入: "张三2023年的总销售额"
输出: {"sql": "SELECT SUM(销售额) FROM [Sheet1] WHERE 姓名 = '张三' AND 年份 = 2023", "explanation": "查询张三在2023年的销售总额"}

【当前上下文】
可用表: {sheetNames}
所有字段: {allFields}

现在处理用户查询: {userQuery}
`;
```

### 4.3 AI辅助功能清单

| 功能 | AI角色 | 触发时机 |
|------|--------|----------|
| 字段名映射 | 语义匹配 | 用户使用别名时 |
| 表关系推断 | 关系推理 | 跨Sheet查询时 |
| 查询意图理解 | 意图分类 | 每次查询 |
| SQL生成 | 代码生成 | 复杂查询 |
| 结果解释 | 自然语言生成 | 查询完成后 |
| 错误修正 | 错误诊断 | SQL执行失败 |

---

## 五、实现路线图

### Phase 1: 基础架构（1-2周）
- [ ] 集成AlaSQL库
- [ ] 实现MultiSheetDataSource
- [ ] 实现基础SQL生成器
- [ ] 编写单元测试

### Phase 2: AI增强（2-3周）
- [ ] 实现AIQueryParser
- [ ] 优化Prompt工程
- [ ] 实现字段名语义匹配
- [ ] 添加Few-Shot示例库

### Phase 3: 高级功能（3-4周）
- [ ] 实现辅助函数库
- [ ] 实现自动关系检测
- [ ] 实现查询优化器
- [ ] 添加缓存机制

### Phase 4: 用户体验（2-3周）
- [ ] 实现查询结果可视化
- [ ] 添加SQL预览功能
- [ ] 实现查询历史记录
- [ ] 添加智能提示

### Phase 5: 性能优化（持续）
- [ ] 实现查询结果缓存
- [ ] 优化大数据集查询
- [ ] 实现增量更新
- [ ] 添加性能监控

---

## 六、关键技术决策

### 6.1 为什么选择AlaSQL？

**优势：**
1. ✅ **标准SQL接口**：用户和AI都熟悉SQL
2. ✅ **内存数据库**：查询速度快，适合Excel场景
3. ✅ **JOIN支持**：完美解决跨Sheet查询
4. ✅ **聚合函数**：内置SUM、AVG等常用函数
5. ✅ **自定义函数**：可扩展extractPhone等辅助函数
6. ✅ **零依赖**：体积小，不影响打包大小

**替代方案对比：**
- **Linq2JS**：类型安全但学习曲线陡
- **MongoDB**：需要后端支持，过于重量级
- **自研引擎**：开发成本高，维护困难

### 6.2 为什么需要AI介入？

| 场景 | 纯规则 | AI增强 |
|------|--------|--------|
| 标准字段匹配 | ✅ 足够 | ⚠️ 过度设计 |
| 别名/缩写匹配 | ❌ 困难 | ✅ 语义理解 |
| 复杂聚合查询 | ❌ 难以覆盖 | ✅ 灵活生成 |
| 表关系推断 | ❌ 需要配置 | ✅ 自动识别 |

**结论：** 简单场景用规则，复杂场景用AI

### 6.3 性能优化策略

```typescript
// 1. 结果缓存
const queryCache = new Map<string, QueryResult>();

// 2. 索引优化
alasql('CREATE INDEX ON [Sheet1] (姓名)');

// 3. 分页查询
const pageSize = 100;
const page1 = alasql('SELECT * FROM [Sheet1] LIMIT ? OFFSET ?', [pageSize, 0]);

// 4. 并行执行
const results = await Promise.all([
  executeQuery(query1),
  executeQuery(query2)
]);
```

---

## 七、扩展性考虑

### 7.1 插件化架构

```typescript
interface QueryPlugin {
  name: string;
  transform(plan: QueryPlan): QueryPlan;
}

class DataQueryEngine {
  private plugins: QueryPlugin[] = [];

  registerPlugin(plugin: QueryPlugin): void {
    this.plugins.push(plugin);
  }

  private applyPlugins(plan: QueryPlan): QueryPlan {
    return this.plugins.reduce(
      (acc, plugin) => plugin.transform(acc),
      plan
    );
  }
}

// 示例插件：自动添加时间过滤
class TimeFilterPlugin implements QueryPlugin {
  name = 'time-filter';

  transform(plan: QueryPlan): QueryPlan {
    // 自动添加默认时间范围
    return plan;
  }
}
```

### 7.2 多数据源支持

```typescript
interface DataConnector {
  read(): Promise<any[]>;
  write(data: any[]): Promise<void>;
}

class ExcelConnector implements DataConnector { }
class CSVConnector implements DataConnector { }
class JSONConnector implements DataConnector { }

// 未来可扩展到数据库连接器
class MySQLConnector implements DataConnector { }
class PostgreSQLConnector implements DataConnector { }
```

---

## 八、总结

### 8.1 核心设计原则

1. **渐进式复杂度**：从简单查询开始，逐步支持复杂场景
2. **AI辅助而非替代**：AI处理复杂语义，规则处理标准场景
3. **SQL标准化**：使用标准SQL接口，降低学习成本
4. **可扩展性**：插件化架构，易于添加新功能

### 8.2 预期效果

| 指标 | 目标 |
|------|------|
| 查询准确率 | >95%（复杂场景） |
| 响应时间 | <2秒（万行数据） |
| 支持场景数 | 覆盖90%的常见查询 |
| AI调用率 | <30%（简单查询用规则） |

### 8.3 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| AI幻觉 | 查询错误 | 添加SQL验证和用户确认 |
| 性能问题 | 用户体验差 | 添加缓存和索引 |
| 复杂查询失败 | 功能不可用 | 提供降级方案（手动配置） |
