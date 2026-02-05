# Few-Shot Engine 集成指南

> 快速集成Few-Shot Learning引擎到你的项目中

## 📦 文件清单

已创建的文件：

```
services/ai/
├── fewShotEngine.ts              # Few-Shot引擎核心实现 (46KB)
├── queryExamples.ts              # 100+查询示例库 (62KB)
├── fewShotEngine.test.ts         # 单元测试 (28KB)
├── fewShotEngine.README.md       # 完整文档 (25KB)
├── fewShotEngine.demo.ts         # 使用示例 (17KB)
└── INTEGRATION_GUIDE.md          # 本文件
```

## 🚀 5分钟快速开始

### 步骤1：创建引擎实例

```typescript
import { FewShotEngine } from './services/ai/fewShotEngine';
import { allQueryExamples } from './services/ai/queryExamples';

// 创建引擎
const engine = new FewShotEngine();

// 加载示例库
engine.addExamples(allQueryExamples);
```

### 步骤2：检索相关示例

```typescript
// 用户查询
const userQuery = '查询工资大于5000的员工姓名';

// 检索相关示例
const relevantExamples = engine.findRelevantExamples(
  userQuery,
  ['姓名', '工资', '员工'],
  5  // Top-5
);
```

### 步骤3：构建Few-Shot提示

```typescript
// 构建提示
const prompt = engine.buildFewShotPrompt(
  userQuery,
  relevantExamples,
  {
    templateType: PromptTemplate.FEW_SHOT,
    maxExamples: 5,
    includeReasoning: true,
    includeSQL: true
  }
);
```

### 步骤4：调用AI生成SQL

```typescript
// 调用智谱AI
const response = await anthropic.messages.create({
  model: 'glm-4.6',
  max_tokens: 1024,
  messages: [{ role: 'user', content: prompt }]
});

const sql = response.content[0].text;
console.log('生成的SQL:', sql);
```

## 🔌 与现有系统集成

### 集成到AI编排服务

在 `services/ai/aiOrchestrationService.ts` 中添加：

```typescript
import { FewShotEngine } from './fewShotEngine';
import { allQueryExamples } from './queryExamples';

export class AIOrchestrationService {
  private fewShotEngine: FewShotEngine;

  constructor(
    private readonly config: AIOrchestrationConfig,
    private readonly cacheService: ICacheService,
    private readonly eventBus: IEventBus
  ) {
    // 初始化Few-Shot引擎
    this.fewShotEngine = new FewShotEngine();
    this.fewShotEngine.addExamples(allQueryExamples);

    // ... 其他初始化代码
  }

  async analyze(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    // 如果是SQL生成任务，使用Few-Shot
    if (request.context.userInstruction?.includes('SQL')) {
      return await this.analyzeWithFewShot(request);
    }

    // ... 原有逻辑
  }

  private async analyzeWithFewShot(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    // 1. 获取用户查询
    const userQuery = request.context.userInstruction || '';

    // 2. 检索相关示例
    const examples = this.fewShotEngine.findRelevantExamples(
      userQuery,
      request.context.dataSources?.[0]?.schema?.columns?.map(c => c.name) || [],
      5
    );

    // 3. 构建Few-Shot提示
    const prompt = this.fewShotEngine.buildFewShotPrompt(
      userQuery,
      examples,
      {
        templateType: PromptTemplate.HYBRID,
        maxExamples: 5,
        includeReasoning: true
      }
    );

    // 4. 调用AI
    const result = await this.callAI(prompt, request.round);

    // 5. 解析响应
    return await this.parseResponse(request.round, result);
  }
}
```

### 创建SQL生成专用服务

创建 `services/ai/sqlGenerationService.ts`：

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { FewShotEngine, PromptTemplate } from './fewShotEngine';
import { allQueryExamples } from './queryExamples';

interface SQLGenerationRequest {
  naturalQuery: string;
  availableFields?: string[];
  options?: {
    topK?: number;
    useCoT?: boolean;
    maxExamples?: number;
  };
}

interface SQLGenerationResponse {
  sql: string;
  confidence: number;
  examples: QueryExample[];
  reasoning?: string;
}

export class SQLGenerationService {
  private engine: FewShotEngine;
  private client: Anthropic;

  constructor() {
    this.engine = new FewShotEngine();
    this.engine.addExamples(allQueryExamples);

    this.client = new Anthropic({
      apiKey: 'your-api-key',
      baseURL: 'https://open.bigmodel.cn/api/anthropic'
    });
  }

  async generateSQL(request: SQLGenerationRequest): Promise<SQLGenerationResponse> {
    // 1. 检索示例
    const examples = this.engine.findRelevantExamples(
      request.naturalQuery,
      request.availableFields || [],
      request.options?.topK || 5
    );

    // 2. 构建提示
    const prompt = this.engine.buildFewShotPrompt(
      request.naturalQuery,
      examples,
      {
        templateType: request.options?.useCoT
          ? PromptTemplate.COT
          : PromptTemplate.FEW_SHOT,
        maxExamples: request.options?.maxExamples || 5,
        includeReasoning: true,
        includeSQL: true
      }
    );

    // 3. 调用AI
    const response = await this.client.messages.create({
      model: 'glm-4.6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    });

    // 4. 解析结果
    const text = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    return {
      sql: this.extractSQL(text),
      confidence: this.calculateConfidence(examples),
      examples,
      reasoning: this.extractReasoning(text)
    };
  }

  private extractSQL(text: string): string {
    // 提取SQL查询
    const sqlMatch = text.match(/```sql\n([\s\S]*?)\n```/);
    return sqlMatch ? sqlMatch[1].trim() : text.trim();
  }

  private calculateConfidence(examples: QueryExample[]): number {
    // 基于示例相似度计算置信度
    return 0.85; // 简化示例
  }

  private extractReasoning(text: string): string {
    // 提取推理过程
    const reasoningMatch = text.match(/推理过程：([\s\S]*?)\nSQL/);
    return reasoningMatch ? reasoningMatch[1].trim() : '';
  }
}
```

## 📊 API使用示例

### REST API端点

```typescript
// API路由示例
app.post('/api/generate-sql', async (req, res) => {
  try {
    const { naturalQuery, availableFields, options } = req.body;

    const service = new SQLGenerationService();
    const result = await service.generateSQL({
      naturalQuery,
      availableFields,
      options
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

### 请求示例

```bash
curl -X POST http://localhost:3000/api/generate-sql \
  -H "Content-Type: application/json" \
  -d '{
    "naturalQuery": "查询工资大于5000的员工姓名和部门",
    "availableFields": ["姓名", "部门", "工资"],
    "options": {
      "topK": 5,
      "useCoT": true,
      "maxExamples": 3
    }
  }'
```

### 响应示例

```json
{
  "success": true,
  "data": {
    "sql": "SELECT e.name, d.department_name FROM employees e INNER JOIN departments d ON e.department_id = d.department_id WHERE e.salary > 5000;",
    "confidence": 0.85,
    "examples": [
      {
        "id": "where_002",
        "naturalQuery": "查询年龄大于30岁的员工",
        "sqlQuery": "SELECT * FROM employees WHERE age > 30;"
      }
    ],
    "reasoning": "1. 理解需求：查询高薪员工信息\n2. 识别字段：姓名、部门、工资\n3. 确定条件：工资 > 5000\n4. 设计查询：使用JOIN连接员工和部门表"
  }
}
```

## 🎯 使用场景

### 场景1：Excel数据分析

```typescript
// 用户上传Excel文件后，提供自然语言查询功能
const excelColumns = ['姓名', '部门', '工资', '年龄', '入职日期'];
const userQuery = '找出工资最高的3名销售部员工';

const service = new SQLGenerationService();
const result = await service.generateSQL({
  naturalQuery: userQuery,
  availableFields: excelColumns
});

// 将SQL转换为Excel过滤
const filteredData = filterExcelData(excelData, result.sql);
```

### 场景2：智能文档填充

```typescript
// 在Word文档生成时，智能选择数据
const template = documentTemplate;
const dataSource = excelData;

const service = new SQLGenerationService();
const result = await service.generateSQL({
  naturalQuery: template.instructions,
  availableFields: Object.keys(dataSource[0])
});

// 使用生成的SQL查询数据
const selectedData = executeQueryOnData(dataSource, result.sql);
```

### 场景3：数据可视化

```typescript
// 用户通过自然语言选择图表数据
const userQuery = '显示各部门平均工资的柱状图';

const service = new SQLGenerationService();
const result = await service.generateSQL({
  naturalQuery: userQuery,
  availableFields: ['部门', '工资']
});

// 查询数据并生成图表
const chartData = executeQueryOnData(data, result.sql);
renderBarChart(chartData);
```

## 🔧 高级配置

### 自定义相似度权重

```typescript
const engine = new FewShotEngine({
  similarity: {
    defaultMethod: SimilarityMethod.HYBRID,
    threshold: 0.6,
    weights: {
      cosine: 0.4,      // 提高余弦相似度权重
      jaccard: 0.1,
      levenshtein: 0.1,
      semantic: 0.4     // 提高语义相似度权重
    }
  }
});
```

### 自定义检索策略

```typescript
const engine = new FewShotEngine({
  retrieval: {
    defaultStrategy: RetrievalStrategy.ADAPTIVE,
    defaultTopK: 7,          // 返回更多示例
    maxCandidates: 200,      // 增加候选数量
    enableCache: true        // 启用缓存
  }
});
```

### 自定义提示模板

```typescript
const customSystemPrompt = `
你是一个专业的SQL专家。
请根据用户需求生成准确的SQL查询。
注意：
1. 确保SQL语法正确
2. 优化查询性能
3. 添加必要的注释
`;

const prompt = engine.buildFewShotPrompt(userQuery, examples, {
  systemMessage: customSystemPrompt,
  templateType: PromptTemplate.HYBRID,
  maxExamples: 5,
  includeReasoning: true,
  includeSQL: true,
  includeExplanation: true
});
```

## 📈 性能优化建议

### 1. 启用缓存

```typescript
const engine = new FewShotEngine({
  retrieval: {
    enableCache: true
  }
});

// 定期清理缓存
setInterval(() => {
  engine.clearCache();
}, 3600000); // 每小时
```

### 2. 批量处理

```typescript
// 处理多个查询
const queries = ['查询1', '查询2', '查询3'];
const results = await engine.batchProcessQueries(
  queries,
  availableFields,
  3
);
```

### 3. 预加载示例库

```typescript
// 应用启动时预加载
let engineInstance: FewShotEngine;

export async function initializeFewShotEngine() {
  if (!engineInstance) {
    engineInstance = new FewShotEngine();
    engineInstance.addExamples(allQueryExamples);
    console.log('Few-Shot引擎初始化完成');
  }
  return engineInstance;
}

export function getFewShotEngine() {
  return engineInstance;
}
```

## 🐛 调试技巧

### 启用详细日志

```typescript
// 创建带日志的引擎
const engine = new FewShotEngine();

// 监控检索过程
const result = engine.getRetrievalResult(userQuery, fields, 5);
console.log('检索详情:', {
  query: result.metadata.query,
  strategy: result.metadata.strategy,
  time: result.metadata.retrievalTime,
  examples: result.examples.map(ex => ({
    id: ex.id,
    query: ex.naturalQuery,
    similarity: result.scores.find(s => s.exampleId === ex.id)?.score
  }))
});
```

### 测试相似度计算

```typescript
// 测试不同查询的相似度
const testQueries = [
  '查询所有员工',
  '查找所有员工',
  '显示员工信息'
];

testQueries.forEach(q1 => {
  testQueries.forEach(q2 => {
    const sim = engine.calculateSimilarity(q1, q2);
    console.log(`"${q1}" vs "${q2}": ${(sim * 100).toFixed(2)}%`);
  });
});
```

## 📝 注意事项

### 1. API密钥安全

```typescript
// 不要硬编码API密钥
// 使用环境变量
const client = new Anthropic({
  apiKey: process.env.ZHIPU_API_KEY,
  baseURL: process.env.ZHIPU_BASE_URL
});
```

### 2. 错误处理

```typescript
try {
  const result = await service.generateSQL(request);
} catch (error) {
  if (error.message.includes('API')) {
    // API错误，降级处理
    return fallbackSQLGeneration(request);
  } else {
    // 其他错误
    throw error;
  }
}
```

### 3. 资源管理

```typescript
// 应用关闭时清理
process.on('SIGTERM', () => {
  engine.clearCache();
  engine.clearExamples();
});
```

## 🚀 下一步

1. **运行测试**：`npm test fewShotEngine.test.ts`
2. **查看示例**：`node services/ai/fewShotEngine.demo.ts`
3. **阅读文档**：`services/ai/fewShotEngine.README.md`
4. **集成到项目**：按照上述指南集成

## 📞 支持

如有问题，请参考：
- 完整文档：`services/ai/fewShotEngine.README.md`
- 单元测试：`services/ai/fewShotEngine.test.ts`
- 使用示例：`services/ai/fewShotEngine.demo.ts`

---

**最后更新：** 2025-12-28
**版本：** 1.0.0
