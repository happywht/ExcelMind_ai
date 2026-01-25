# 高级数据查询引擎 - 技术分析与实现指南

## 一、核心架构概述

基于您的ExcelMind AI项目，我设计了一个**三层架构**的数据查询引擎，完美解决您提出的四个复杂场景：

```
┌─────────────────────────────────────────────────────┐
│   表现层 (Presentation Layer)                        │
│   - 自然语言输入                                      │
│   - SQL预览                                          │
│   - 结果可视化                                        │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│   智能层 (Intelligence Layer)                        │
│   - AI语义解析 (智谱GLM-4.6)                          │
│   - Few-Shot Learning                                │
│   - Chain-of-Thought推理                             │
│   - 字段名语义匹配                                    │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│   执行层 (Execution Layer)                           │
│   - AlaSQL内存数据库                                  │
│   - 自定义辅助函数库                                  │
│   - 查询优化器                                        │
│   - 结果缓存                                          │
└─────────────────────────────────────────────────────┘
```

## 二、四大复杂场景解决方案

### 场景1: 多Sheet联合查询

**问题**: 模板中的`{{姓名}}`、`{{部门}}`从Sheet1取，`{{绩效}}`从Sheet2取

**解决方案**:

```typescript
// 1. 自动识别表间关系
const engine = new DataQueryEngine();
engine.loadExcelData(excelData);

// 系统自动检测并建立关系:
// Sheet1 ←→ Sheet2 通过 "姓名" 字段关联

// 2. 智能字段路由
await engine.query("张三的绩效分数");

// AI自动生成SQL:
// SELECT t2.绩效
// FROM [Sheet1] AS t1
// INNER JOIN [Sheet2] AS t2 ON t1.姓名 = t2.姓名
// WHERE t1.姓名 = '张三'
```

**技术亮点**:
- ✅ **自动关系检测**: 分析所有Sheet的共同字段，自动建立JOIN关系
- ✅ **智能字段定位**: 根据字段名自动路由到正确的Sheet
- ✅ **优先级排序**: 当多个Sheet有同名字段时，优先选择主表

**核心代码** (`MultiSheetDataSource.ts`):

```typescript
// 自动检测表间关系
private autoDetectRelationships(): void {
  const sheetNames = this.dataSource.getSheetNames();

  for (let i = 0; i < sheetNames.length; i++) {
    for (let j = i + 1; j < sheetNames.length; j++) {
      const commonColumns = this.findCommonColumns(
        sheetNames[i],
        sheetNames[j]
      );

      // 为每个共同字段创建关系
      commonColumns.forEach(col => {
        this.dataSource.createRelationship(
          sheetNames[i],
          sheetNames[j],
          col
        );
      });
    }
  }
}
```

---

### 场景2: 复杂聚合查询

**问题**: `{{张三在2023年的总销售额}}` - 需要筛选+聚合

**解决方案**:

```typescript
// 自然语言查询
const result = await engine.query("张三在2023年的总销售额");

// AI解析步骤:
// Step 1: 意图识别 → 聚合查询
// Step 2: 提取实体 → 姓名="张三", 年份=2023, 字段="销售额"
// Step 3: 推断聚合函数 → "总" → SUM()

// 生成的SQL:
// SELECT SUM(销售额) AS 总销售额
// FROM [Sheet1]
// WHERE 姓名 = '张三' AND 年份 = 2023
```

**技术亮点**:
- ✅ **意图识别**: AI自动识别查询类型（简单/聚合/关联/复杂）
- ✅ **条件提取**: 从自然语言中提取WHERE条件
- ✅ **聚合函数推断**: 根据"总"、"平均"、"数量"等关键词自动选择函数

**AI提示词工程** (`AIQueryParser.ts`):

```typescript
const prompt = `
你是一个查询意图分析专家。

【用户查询】
"${query}"

【分析维度】
1. 查询类型: simple | aggregate | join | complex
2. 是否需要聚合: true | false
3. 筛选条件: 姓名=张三, 年份=2023
4. 聚合函数: SUM | AVG | COUNT | MAX | MIN

【输出格式】
{
  "queryType": "aggregate",
  "needsAggregation": true,
  "targetFields": ["销售额"],
  "conditions": ["姓名=张三", "年份=2023"]
}
`;
```

---

### 场景3: 单元格多值提取

**问题**: `联系方式 = "电话:021-12345678 邮箱:zhangsan@company.com"` 需要分别提取

**解决方案**:

```typescript
// 使用内置辅助函数
await engine.query("所有员工的电话号码");

// 生成的SQL:
// SELECT 姓名, extractPhone(联系方式) AS 电话
// FROM [Sheet1]

// 辅助函数实现:
extractPhone('电话:021-12345678 邮箱:xxx')
// → 返回: '021-12345678'
```

**技术亮点**:
- ✅ **正则表达式匹配**: 智能识别电话、邮箱等模式
- ✅ **多标签支持**: 支持"电话:"、"手机:"、"联系电话:"等多种标签
- ✅ **容错处理**: 提取失败时返回null，不影响整体查询

**辅助函数库** (`QueryHelperFunctions.ts`):

```typescript
const extractPhone: HelperFunction = {
  name: 'extractPhone',
  description: '从文本中提取电话号码',
  handler: (text: string): string | null => {
    if (!text) return null;

    // 优先匹配带标签的
    const labeledRegex = /(?:电话|手机)[：:]\s*(\d{3,4}-\d{7,8}|\d{11})/;
    let match = text.match(labeledRegex);
    if (match) return match[1];

    // 匹配固定电话
    const phoneRegex = /(\d{3,4}-\d{7,8})/;
    match = text.match(phoneRegex);
    if (match) return match[1];

    // 匹配手机号
    const mobileRegex = /(1[3-9]\d{9})/;
    match = text.match(mobileRegex);
    if (match) return match[1];

    return null;
  }
};
```

---

### 场景4: 跨列关联查询

**问题**: `{{员工部门经理姓名}}` - 需要先查员工的部门，再查该部门的经理

**解决方案**:

```typescript
// 两跳关联查询
await engine.query("张三部门的经理姓名");

// AI自动生成链式JOIN:
// SELECT t2.经理姓名
// FROM [Sheet1] AS t1           -- 员工表
// INNER JOIN [Sheet2] AS t2     -- 部门表
//   ON t1.部门 = t2.部门
// WHERE t1.姓名 = '张三'

// 支持多跳关联:
// 员工 → 部门 → 公司 → 集团
```

**技术亮点**:
- ✅ **自动路径发现**: AI自动找到关联路径
- ✅ **关系推理**: 理解"X的Y的Z"这种嵌套关系
- ✅ **性能优化**: 自动选择最优JOIN顺序

---

## 三、技术栈选型理由

### 3.1 为什么选择AlaSQL？

| 特性 | AlaSQL | Linq2JS | 自研DSL |
|------|--------|---------|---------|
| **学习成本** | 低（标准SQL） | 高（TypeScript特定） | 极高（需要文档） |
| **功能完整性** | ✅ 完整 | ⚠️ 部分 | ❌ 需要开发 |
| **JOIN支持** | ✅ 原生支持 | ⚠️ 复杂 | ❌ 需要实现 |
| **聚合函数** | ✅ SUM/AVG等 | ⚠️ 需要扩展 | ❌ 需要实现 |
| **包大小** | 200KB | 50KB | 0KB（但开发成本高） |
| **AI友好度** | ✅ SQL是标准 | ⚠️ 需要转换 | ❌ AI无法理解 |

**结论**: AlaSQL在功能完整性、开发效率和AI友好度之间达到最佳平衡。

### 3.2 为什么需要AI介入？

```typescript
// 纯规则方案的问题
function parseQuery(query: string): SQL {
  if (query.includes('总销售额')) {
    return 'SELECT SUM(销售额) ...';
  }
  // ❌ 无法覆盖所有情况
  // ❌ 无法理解语义变化（"总计"、"合计"、"全部加起来"）
}

// AI增强方案
async function parseQuery(query: string): SQL {
  const intent = await ai.analyze(query);
  // ✅ 理解语义
  // ✅ 泛化能力强
  // ✅ 自动适应新场景
}
```

**介入策略**:
- **简单场景**（80%）: 模板匹配，无需AI
- **中等场景**（15%）: Few-Shot Learning
- **复杂场景**（5%）: Chain-of-Thought深度推理

---

## 四、AI介入策略详解

### 4.1 三级AI介入

#### Level 1: 规则引擎（无需AI）

```typescript
const RULES = [
  { pattern: /(.+)的(.+)/, action: 'simple_select' },
  { pattern: /(.+)的总(.+)/, action: 'aggregate_sum' },
  { pattern: /(.+)在(.+)年的(.+)/, action: 'aggregate_with_filter' }
];

function matchRule(query: string): QueryPlan | null {
  for (const rule of RULES) {
    if (rule.pattern.test(query)) {
      return buildPlanFromRule(rule, query);
    }
  }
  return null;
}
```

#### Level 2: Few-Shot Learning（标准AI）

```typescript
const prompt = `
你是SQL生成专家。请参考以下示例：

示例1:
输入: "张三的总销售额"
输出: {"sql": "SELECT SUM(销售额) FROM t WHERE 姓名='张三'"}

示例2:
输入: "2023年各部门平均绩效"
输出: {"sql": "SELECT 部门, AVG(绩效) FROM t WHERE 年份=2023 GROUP BY 部门"}

现在处理: "${query}"
`;
```

#### Level 3: Chain-of-Thought（复杂推理）

```typescript
const prompt = `
让我们一步步分析这个查询：
"${query}"

步骤1: 识别查询意图（聚合/筛选/关联）
步骤2: 确定涉及的数据表
步骤3: 提取字段名和条件
步骤4: 构建SQL语句
步骤5: 验证SQL的正确性

请按照上述步骤思考并输出结果。
`;
```

### 4.2 AI Prompt优化技巧

#### 技巧1: 结构化输出

```typescript
// ❌ 不好的prompt
"生成SQL查询"

// ✅ 好的prompt
"生成SQL查询，输出JSON格式:
{
  'sql': 'SELECT语句',
  'explanation': '查询说明',
  'confidence': 0.95
}"
```

#### 技巧2: 上下文注入

```typescript
const prompt = `
【当前上下文】
可用表: ${JSON.stringify(sheetNames)}
所有字段: ${JSON.stringify(allColumns)}

【用户查询】
"${query}"

请基于上述上下文生成SQL。
`;
```

#### 技巧3: 错误恢复

```typescript
async function robustParse(query: string): QueryPlan {
  try {
    // 尝试AI解析
    return await ai.parse(query);
  } catch (error) {
    // 降级到规则匹配
    const rulePlan = matchRule(query);
    if (rulePlan) return rulePlan;

    // 最终降级: 手动配置
    return createManualConfigPrompt(query);
  }
}
```

---

## 五、集成到现有项目

### 5.1 与文档映射服务集成

```typescript
// 修改 documentMappingService.ts
import { DataQueryEngine } from './queryEngine';

export async function generateFieldMapping(
  params: GenerateMappingParams
): Promise<MappingScheme> {
  // 1. 初始化查询引擎
  const engine = new DataQueryEngine();
  await engine.initialize();
  engine.loadExcelData(excelData);

  // 2. 使用AI理解用户需求
  const enhancedPrompt = buildEnhancedPrompt(params);

  // 3. AI生成映射方案（支持复杂查询）
  const response = await client.messages.create({
    model: "glm-4.6",
    messages: [{
      role: "user",
      content: enhancedPrompt
    }]
  });

  // 4. 解析响应
  const scheme = parseMappingResponse(response);

  // 5. 验证复杂查询
  for (const mapping of scheme.mappings) {
    if (mapping.transform && mapping.transform.includes('aggregate')) {
      // 验证聚合查询
      const testResult = await engine.query(mapping.transform);
      if (!testResult.success) {
        // 查询失败，修正映射
        mapping.transform = await fixMappingWithAI(mapping, testResult.error);
      }
    }
  }

  return scheme;
}
```

### 5.2 增强文档生成服务

```typescript
// 修改 docxGeneratorService.ts
import { DataQueryEngine } from './queryEngine';

export async function generateMultipleDocuments(
  params: BatchGenerateParams
): Promise<GeneratedDocument[]> {
  const engine = new DataQueryEngine();
  await engine.initialize();
  engine.loadExcelData(excelData);

  const documents: GeneratedDocument[] = [];

  for (const rowData of filteredData) {
    const documentData: Record<string, any> = {};

    // 原有逻辑: 简单字段映射
    for (const mapping of mappingScheme.mappings) {
      if (!mapping.transform) {
        documentData[placeholderName] = rowData[mapping.excelColumn];
      } else {
        // 新增: 支持复杂查询
        const query = mapping.transform
          .replace(/\$\{row\./g, '')  // 移除变量前缀
          .replace(/\}/g, '');

        const result = await engine.query(query);
        documentData[placeholderName] = result.data;
      }
    }

    // 生成文档...
  }

  return documents;
}
```

---

## 六、性能优化策略

### 6.1 查询缓存

```typescript
class CachedQueryEngine extends DataQueryEngine {
  private cache = new Map<string, QueryResult>();

  async query(naturalLanguage: string): Promise<QueryResult> {
    // 检查缓存
    if (this.cache.has(naturalLanguage)) {
      return this.cache.get(naturalLanguage)!;
    }

    // 执行查询
    const result = await super.query(naturalLanguage);

    // 缓存结果
    if (result.success) {
      this.cache.set(naturalLanguage, result);
    }

    return result;
  }
}
```

### 6.2 预计算聚合

```typescript
// 在加载Excel时预计算常用聚合
class PreAggregatedEngine extends DataQueryEngine {
  async loadExcelData(excelData: ExcelData): void {
    super.loadExcelData(excelData);

    // 预计算常用聚合
    const commonAggregations = [
      'SELECT SUM(销售额) FROM [Sheet1]',
      'SELECT AVG(绩效) FROM [Sheet1]'
    ];

    for (const sql of commonAggregations) {
      this.preAggregate(sql, await this.executeSQL(sql));
    }
  }
}
```

### 6.3 索引优化

```typescript
// 为常用查询字段创建索引
function optimizeDatabase(dataSource: MultiSheetDataSource): void {
  // 分析查询历史
  const frequentlyQueriedColumns = analyzeQueryHistory();

  // 创建索引
  frequentlyQueriedColumns.forEach(col => {
    alasql(`CREATE INDEX ON [Sheet1] (${col})`);
  });
}
```

---

## 七、测试用例

```typescript
describe('DataQueryEngine', () => {
  test('场景1: 多Sheet联合查询', async () => {
    const excelData = {
      sheets: {
        'Sheet1': [{ 姓名: '张三', 部门: '销售部' }],
        'Sheet2': [{ 姓名: '张三', 绩效: 95 }]
      }
    };

    const engine = new DataQueryEngine();
    await engine.initialize();
    engine.loadExcelData(excelData);

    const result = await engine.query('张三的绩效分数');
    expect(result.data).toEqual([{ 绩效: 95 }]);
  });

  test('场景2: 复杂聚合查询', async () => {
    const result = await engine.query('张三在2023年的总销售额');
    expect(result.sql).toContain('SUM(销售额)');
    expect(result.sql).toContain("姓名 = '张三'");
    expect(result.sql).toContain('年份 = 2023');
  });

  test('场景3: 单元格多值提取', async () => {
    const result = await engine.query('所有员工的电话号码');
    expect(result.sql).toContain('extractPhone(联系方式)');
  });

  test('场景4: 跨列关联查询', async () => {
    const result = await engine.query('张三部门的经理姓名');
    expect(result.sql).toContain('JOIN');
    expect(result.sql).toContain('经理姓名');
  });
});
```

---

## 八、总结与建议

### 8.1 核心优势

1. **AI驱动**: 理解自然语言，降低使用门槛
2. **SQL标准**: 利用成熟的SQL生态，学习成本低
3. **渐进式**: 简单场景用规则，复杂场景用AI
4. **可扩展**: 插件化架构，易于添加新功能

### 8.2 实施路线

**Phase 1 (1-2周)**: 基础架构
- 集成AlaSQL
- 实现MultiSheetDataSource
- 基础SQL生成器

**Phase 2 (2-3周)**: AI增强
- 实现AIQueryParser
- Few-Shot Learning
- 字段名语义匹配

**Phase 3 (2-3周)**: 高级功能
- 辅助函数库
- 自动关系检测
- 查询优化

**Phase 4 (持续)**: 优化
- 性能优化
- 用户体验提升
- 错误处理完善

### 8.3 风险提示

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| AI幻觉 | SQL错误 | 添加SQL验证和测试 |
| 性能问题 | 用户体验差 | 缓存+索引+限制数据量 |
| 复杂查询失败 | 功能不可用 | 提供手动配置降级方案 |
| AlaSQL限制 | 无法处理大数据 | 设置数据量阈值警告 |

### 8.4 关键成功因素

1. ✅ **优质Prompt**: 投入时间优化AI提示词
2. ✅ **渐进降级**: AI失败时能自动降级到规则
3. ✅ **用户反馈**: 收集实际使用数据持续优化
4. ✅ **性能监控**: 追踪查询耗时和成功率
