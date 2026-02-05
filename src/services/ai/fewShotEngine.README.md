# Few-Shot Learning Engine

> AI智能查询核心组件 - Few-Shot学习引擎

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Coverage](https://img.shields.io/badge/Coverage->90%25-brightgreen.svg)](coverage/)

## 📋 目录

- [概述](#概述)
- [核心特性](#核心特性)
- [架构设计](#架构设计)
- [快速开始](#快速开始)
- [API文档](#api文档)
- [使用示例](#使用示例)
- [配置选项](#配置选项)
- [性能优化](#性能优化)
- [测试](#测试)
- [最佳实践](#最佳实践)
- [故障排除](#故障排除)
- [贡献指南](#贡献指南)

## 🎯 概述

Few-Shot Learning Engine 是一个强大的AI辅助查询生成引擎，通过示例学习的方式，将自然语言查询转换为准确的SQL查询。它是 **excelmind-ai** 项目Phase 2的核心组件。

### 核心能力

- **智能示例检索**：基于多种相似度算法，快速找到最相关的查询示例
- **Few-Shot提示构建**：自动生成高质量的Few-Shot学习提示
- **Chain-of-Thought推理**：支持思维链提示，提升复杂查询的生成质量
- **自适应学习**：通过用户反馈持续优化示例库
- **高性能**：100+示例库，检索时间<500ms

## ✨ 核心特性

### 1. 多种相似度计算算法

- **余弦相似度**：基于TF-IDF的向量空间模型
- **Jaccard相似度**：词袋模型的集合相似度
- **编辑距离**：字符串级别的相似度
- **语义相似度**：基于关键词匹配的语义理解
- **混合算法**：综合多种方法的加权组合

### 2. 智能检索策略

- **关键词检索**：基于关键词匹配的快速检索
- **类型检索**：根据查询类型（简单/聚合/连接/复杂）检索
- **难度检索**：根据难度级别（初级/中级/高级）检索
- **混合检索**：综合多种策略的高精度检索
- **自适应检索**：根据查询特征自动选择最优策略

### 3. 灵活的提示模板

- **基础提示**：简单的系统消息和用户查询
- **Few-Shot提示**：包含多个示例的标准提示
- **CoT提示**：包含推理过程的思维链提示
- **混合提示**：结合多种提示策略的混合模板

### 4. 完善的示例管理

- **100+高质量示例**：覆盖各种SQL查询场景
- **分类组织**：按类型、难度、标签多维度组织
- **动态更新**：支持运行时添加、修改、删除示例
- **质量验证**：自动验证示例的完整性和正确性
- **导入导出**：支持JSON格式的示例库导入导出

## 🏗️ 架构设计

### 核心组件

```
┌─────────────────────────────────────────────────────────┐
│                    FewShotEngine                         │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ 示例管理器   │  │ 相似度计算器  │  │ 检索策略引擎   │ │
│  └─────────────┘  └──────────────┘  └────────────────┘ │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ 提示构建器   │  │ 缓存管理器    │  │ 反馈学习器     │ │
│  └─────────────┘  └──────────────┘  └────────────────┘ │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                   Query Examples Library                 │
│  (100+ examples across 4 types and 3 difficulty levels) │
└─────────────────────────────────────────────────────────┘
```

### 数据流

```
用户查询
    ↓
预处理（分词、关键词提取）
    ↓
相似度计算（多种算法）
    ↓
示例检索（混合策略）
    ↓
提示构建（Few-Shot/CoT）
    ↓
AI调用（智谱GLM-4.6）
    ↓
SQL生成
    ↓
反馈收集（质量评分）
    ↓
示例优化（持续学习）
```

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 基础使用

```typescript
import { FewShotEngine } from './services/ai/fewShotEngine';
import { allQueryExamples } from './services/ai/queryExamples';

// 1. 创建引擎实例
const engine = new FewShotEngine();

// 2. 加载示例库
engine.addExamples(allQueryExamples);

// 3. 用户查询
const userQuery = '查找销售额大于10万的员工姓名和部门';

// 4. 检索相关示例
const relevantExamples = engine.findRelevantExamples(
  userQuery,
  ['姓名', '部门', '销售额'],
  5  // Top-5
);

// 5. 构建提示
const prompt = engine.buildFewShotPrompt(userQuery, relevantExamples);

// 6. 调用AI（使用智谱GLM-4.6）
const aiResponse = await callAI(prompt);

console.log('生成的SQL:', aiResponse);
```

### 高级使用

```typescript
// 自定义配置
const engine = new FewShotEngine({
  similarity: {
    defaultMethod: SimilarityMethod.HYBRID,
    threshold: 0.6,
    weights: {
      cosine: 0.3,
      jaccard: 0.2,
      levenshtein: 0.2,
      semantic: 0.3
    }
  },
  retrieval: {
    defaultStrategy: RetrievalStrategy.ADAPTIVE,
    defaultTopK: 5,
    maxCandidates: 100,
    enableCache: true
  },
  prompting: {
    defaultTemplate: PromptTemplate.COT,
    maxExamples: 5,
    minExamples: 3
  }
});

// 使用高级检索策略
const result = engine.getRetrievalResult(
  userQuery,
  availableFields,
  5,
  RetrievalStrategy.HYBRID
);

console.log('示例:', result.examples);
console.log('分数:', result.scores);
console.log('元数据:', result.metadata);
```

## 📚 API文档

### FewShotEngine类

#### 构造函数

```typescript
constructor(config?: Partial<FewShotEngineConfig>)
```

创建Few-Shot引擎实例。

**参数：**
- `config` - 可选的配置对象

#### 示例管理方法

##### addExample

```typescript
addExample(example: QueryExample): void
```

添加单个示例到示例库。

**参数：**
- `example` - 查询示例对象

##### addExamples

```typescript
addExamples(examples: QueryExample[]): void
```

批量添加示例。

**参数：**
- `examples` - 查询示例数组

##### getExample

```typescript
getExample(id: string): QueryExample | undefined
```

根据ID获取示例。

**参数：**
- `id` - 示例ID

**返回：** 示例对象或undefined

##### getAllExamples

```typescript
getAllExamples(): QueryExample[]
```

获取所有示例。

**返回：** 示例数组

##### getExamplesByType

```typescript
getExamplesByType(queryType: QueryType): QueryExample[]
```

按类型获取示例。

**参数：**
- `queryType` - 查询类型（'simple' | 'aggregate' | 'join' | 'complex'）

##### getExamplesByDifficulty

```typescript
getExamplesByDifficulty(difficulty: DifficultyLevel): QueryExample[]
```

按难度获取示例。

**参数：**
- `difficulty` - 难度级别（'beginner' | 'intermediate' | 'advanced'）

##### updateExample

```typescript
updateExample(id: string, updates: Partial<QueryExample>): boolean
```

更新示例。

**参数：**
- `id` - 示例ID
- `updates` - 更新内容

**返回：** 是否成功

##### removeExample

```typescript
removeExample(id: string): boolean
```

删除示例。

**参数：**
- `id` - 示例ID

**返回：** 是否成功

##### clearExamples

```typescript
clearExamples(): void
```

清空示例库。

#### 相似度计算方法

##### calculateSimilarity

```typescript
calculateSimilarity(
  query1: string,
  query2: string,
  method?: SimilarityMethod
): number
```

计算两个查询的相似度。

**参数：**
- `query1` - 查询1
- `query2` - 查询2
- `method` - 相似度计算方法（默认：HYBRID）

**返回：** 相似度分数（0-1）

##### calculateDetailedSimilarity

```typescript
calculateDetailedSimilarity(
  query: string,
  example: QueryExample
): SimilarityScore
```

计算详细相似度（包含各方法的分数）。

**参数：**
- `query` - 用户查询
- `example` - 查询示例

**返回：** 详细相似度分数对象

#### 检索方法

##### findRelevantExamples

```typescript
findRelevantExamples(
  userQuery: string,
  availableFields?: string[],
  topK?: number,
  strategy?: RetrievalStrategy
): QueryExample[]
```

查找相关示例（核心方法）。

**参数：**
- `userQuery` - 用户查询
- `availableFields` - 可用字段列表
- `topK` - 返回前K个示例（默认：5）
- `strategy` - 检索策略（默认：HYBRID）

**返回：** 相关示例数组

##### getRetrievalResult

```typescript
getRetrievalResult(
  userQuery: string,
  availableFields?: string[],
  topK?: number,
  strategy?: RetrievalStrategy
): RetrievalResult
```

获取检索结果（包含分数和元数据）。

**参数：**
- `userQuery` - 用户查询
- `availableFields` - 可用字段列表
- `topK` - 返回数量
- `strategy` - 检索策略

**返回：** 检索结果对象

#### 提示构建方法

##### buildFewShotPrompt

```typescript
buildFewShotPrompt(
  userQuery: string,
  examples: QueryExample[],
  config?: Partial<FewShotPromptConfig>
): string
```

构建Few-Shot提示。

**参数：**
- `userQuery` - 用户查询
- `examples` - 查询示例数组
- `config` - 提示构建配置

**返回：** 提示字符串

##### buildBasePrompt

```typescript
buildBasePrompt(
  userQuery: string,
  examples: QueryExample[],
  config: FewShotPromptConfig
): string
```

构建基础提示。

##### buildCoTPrompt

```typescript
buildCoTPrompt(
  userQuery: string,
  examples: QueryExample[],
  config: FewShotPromptConfig
): string
```

构建Chain-of-Thought提示。

##### buildHybridPrompt

```typescript
buildHybridPrompt(
  userQuery: string,
  examples: QueryExample[],
  config: FewShotPromptConfig
): string
```

构建混合提示。

#### 反馈学习方法

##### recordFeedback

```typescript
recordFeedback(exampleId: string, score: number): void
```

记录用户反馈。

**参数：**
- `exampleId` - 示例ID
- `score` - 反馈分数（0-1）

##### getStatistics

```typescript
getStatistics(): {
  totalExamples: number;
  examplesByType: Record<QueryType, number>;
  examplesByDifficulty: Record<DifficultyLevel, number>;
  examplesBySource: Record<ExampleSource, number>;
  averageFeedbackScore: number;
}
```

获取统计信息。

**返回：** 统计对象

#### 质量评估方法

##### validateExample

```typescript
validateExample(example: QueryExample): {
  valid: boolean;
  errors: string[];
}
```

验证示例质量。

**参数：**
- `example` - 查询示例

**返回：** 验证结果

##### evaluateExampleQuality

```typescript
evaluateExampleQuality(): {
  overall: number;
  byType: Record<QueryType, number>;
  byDifficulty: Record<DifficultyLevel, number>;
  issues: string[];
}
```

评估示例库质量。

**返回：** 质量评估对象

##### generateReport

```typescript
generateReport(): string
```

生成统计报告。

**返回：** 报告字符串

#### 缓存管理方法

##### clearCache

```typescript
clearCache(): void
```

清空缓存。

##### getCacheSize

```typescript
getCacheSize(): number
```

获取缓存大小。

**返回：** 缓存条目数

#### 导入导出方法

##### exportExamples

```typescript
exportExamples(): QueryExample[]
```

导出示例库。

**返回：** 示例数组

##### importExamples

```typescript
importExamples(examples: QueryExample[]): void
```

导入示例库。

**参数：**
- `examples` - 示例数组

### 类型定义

#### QueryExample

```typescript
interface QueryExample {
  id: string;
  naturalQuery: string;
  sqlQuery: string;
  queryType: 'simple' | 'aggregate' | 'join' | 'complex';
  intent: string;
  fields: string[];
  conditions?: string[];
  reasoningSteps?: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  source: 'manual' | 'generated' | 'user';
}
```

#### SimilarityMethod

```typescript
enum SimilarityMethod {
  COSINE = 'cosine',
  JACCARD = 'jaccard',
  LEVENSHTEIN = 'levenshtein',
  SEMANTIC = 'semantic',
  HYBRID = 'hybrid'
}
```

#### RetrievalStrategy

```typescript
enum RetrievalStrategy {
  KEYWORD = 'keyword',
  TYPE_BASED = 'type_based',
  DIFFICULTY_BASED = 'difficulty_based',
  HYBRID = 'hybrid',
  ADAPTIVE = 'adaptive'
}
```

#### PromptTemplate

```typescript
enum PromptTemplate {
  BASE = 'base',
  FEW_SHOT = 'few_shot',
  COT = 'cot',
  HYBRID = 'hybrid'
}
```

## 💡 使用示例

### 示例1：基础查询生成

```typescript
// 场景：用户想查询特定条件的员工信息
const userQuery = '查询年龄大于30岁的销售部员工姓名';

// 检索相关示例
const examples = engine.findRelevantExamples(
  userQuery,
  ['姓名', '年龄', '部门'],
  3
);

// 构建提示
const prompt = engine.buildFewShotPrompt(userQuery, examples, {
  templateType: PromptTemplate.FEW_SHOT,
  maxExamples: 3,
  includeReasoning: false,
  includeSQL: true,
  includeExplanation: true
});

// 调用AI
const sql = await callAI(prompt);
console.log('生成的SQL:', sql);
// 输出: SELECT name FROM employees WHERE age > 30 AND department = '销售部';
```

### 示例2：复杂查询生成

```typescript
// 场景：用户需要复杂的聚合查询
const userQuery = '查询每个部门的平均工资，并只显示平均工资大于8000的部门';

// 使用CoT提示
const examples = engine.findRelevantExamples(userQuery, ['部门', '工资'], 3);

// 使用CoT提示模板
const prompt = engine.buildFewShotPrompt(userQuery, examples, {
  templateType: PromptTemplate.COT,
  maxExamples: 3,
  includeReasoning: true
});

// 调用AI
const sql = await callAI(prompt);
console.log('生成的SQL:', sql);
/*
输出:
SELECT department, AVG(salary) as avg_salary
FROM employees
GROUP BY department
HAVING AVG(salary) > 8000;
*/
```

### 示例3：JOIN查询生成

```typescript
// 场景：用户需要多表连接查询
const userQuery = '查询员工姓名及其所属部门名称';

// 检索JOIN相关示例
const examples = engine.findRelevantExamples(
  userQuery,
  ['姓名', '部门名称'],
  3,
  RetrievalStrategy.TYPE_BASED
);

// 构建提示
const prompt = engine.buildFewShotPrompt(userQuery, examples);

// 调用AI
const sql = await callAI(prompt);
console.log('生成的SQL:', sql);
/*
输出:
SELECT e.name, d.department_name
FROM employees e
INNER JOIN departments d ON e.department_id = d.department_id;
*/
```

### 示例4：批量查询处理

```typescript
// 场景：批量处理多个查询
const queries = [
  '查询所有员工',
  '统计部门人数',
  '查找最高工资',
  '分析销售趋势'
];

// 批量检索
const results = await engine.batchProcessQueries(queries, ['员工', '部门', '工资'], 3);

// 处理结果
results.forEach((examples, query) => {
  console.log(`查询: ${query}`);
  console.log(`找到 ${examples.length} 个相关示例`);

  // 生成SQL
  const prompt = engine.buildFewShotPrompt(query, examples);
  const sql = await callAI(prompt);
  console.log(`SQL: ${sql}\n`);
});
```

### 示例5：流式处理大量查询

```typescript
// 场景：处理大量查询（100+）
const queries = Array.from({ length: 100 }, (_, i) => `查询${i} 操作...`);

// 流式处理
for await (const { query, examples } of engine.streamProcessQueries(queries, [], 3, 10)) {
  console.log(`处理查询: ${query}`);
  console.log(`找到 ${examples.length} 个示例`);

  // 生成SQL
  const prompt = engine.buildFewShotPrompt(query, examples);
  const sql = await callAI(prompt);
  console.log(`SQL: ${sql}`);
}
```

### 示例6：自定义相似度计算

```typescript
// 场景：使用特定的相似度算法
const userQuery = '查找数据...';

// 使用不同的相似度方法
const cosineSim = engine.calculateSimilarity(
  userQuery,
  '查询数据...',
  SimilarityMethod.COSINE
);

const jaccardSim = engine.calculateSimilarity(
  userQuery,
  '查询数据...',
  SimilarityMethod.JACCARD
);

console.log(`余弦相似度: ${cosineSim}`);
console.log(`Jaccard相似度: ${jaccardSim}`);
```

### 示例7：示例库质量管理

```typescript
// 评估示例库质量
const evaluation = engine.evaluateExampleQuality();
console.log(`整体质量: ${evaluation.overall.toFixed(2)}`);
console.log(`问题: ${evaluation.issues.join(', ')}`);

// 获取补全建议
const suggestions = engine.generateCompletionSuggestions();
console.log(`需要添加 ${suggestions.totalNeeded} 个示例`);

suggestions.neededExamples.forEach(item => {
  console.log(`- ${item.type}/${item.difficulty}: ${item.count} 个`);
});

// 优化示例库
const optimizationResult = await engine.optimizeExamples();
console.log(`删除了 ${optimizationResult.removed} 个低质量示例`);
```

### 示例8：用户反馈循环

```typescript
// 用户查询并生成SQL
const userQuery = '查询...';
const examples = engine.findRelevantExamples(userQuery, [], 5);
const prompt = engine.buildFewShotPrompt(userQuery, examples);
const sql = await callAI(prompt);

// 用户反馈SQL质量
const userFeedback = promptUser('这个SQL是否正确? (1-5分): ');
const score = parseInt(userFeedback) / 5;

// 记录反馈
examples.forEach(example => {
  engine.recordFeedback(example.id, score);
});

// 长期优化示例库
if (score < 0.6) {
  console.log('建议添加更多类似示例以改进质量');
}
```

## ⚙️ 配置选项

### FewShotEngineConfig

```typescript
interface FewShotEngineConfig {
  similarity: {
    defaultMethod: SimilarityMethod;
    threshold: number;
    weights: {
      cosine: number;
      jaccard: number;
      levenshtein: number;
      semantic: number;
    };
  };
  retrieval: {
    defaultStrategy: RetrievalStrategy;
    defaultTopK: number;
    maxCandidates: number;
    enableCache: boolean;
  };
  prompting: {
    defaultTemplate: PromptTemplate;
    maxExamples: number;
    minExamples: number;
  };
  learning: {
    enableFeedback: boolean;
    autoUpdateExamples: boolean;
    feedbackThreshold: number;
  };
}
```

### 推荐配置

```typescript
// 快速响应配置（适合实时应用）
const fastConfig: Partial<FewShotEngineConfig> = {
  retrieval: {
    defaultTopK: 3,
    maxCandidates: 50,
    enableCache: true
  },
  prompting: {
    maxExamples: 3
  }
};

// 高精度配置（适合离线应用）
const accurateConfig: Partial<FewShotEngineConfig> = {
  similarity: {
    defaultMethod: SimilarityMethod.HYBRID,
    threshold: 0.7
  },
  retrieval: {
    defaultStrategy: RetrievalStrategy.HYBRID,
    defaultTopK: 7,
    maxCandidates: 200
  },
  prompting: {
    maxExamples: 7
  }
};

// 学习型配置（适合持续优化）
const learningConfig: Partial<FewShotEngineConfig> = {
  learning: {
    enableFeedback: true,
    autoUpdateExamples: true,
    feedbackThreshold: 5
  }
};
```

## 🚀 性能优化

### 1. 缓存策略

```typescript
// 启用缓存
const engine = new FewShotEngine({
  retrieval: {
    enableCache: true
  }
});

// 定期清理缓存
setInterval(() => {
  engine.clearCache();
}, 3600000); // 每小时清理一次
```

### 2. 批量处理

```typescript
// 使用批量API提高吞吐量
const queries = [...]; // 大量查询
const results = await engine.batchProcessQueries(queries, fields, 3);
```

### 3. 流式处理

```typescript
// 使用流式API处理大规模查询
for await (const { query, examples } of engine.streamProcessQueries(queries, fields, 3, 10)) {
  // 处理每个查询
}
```

### 4. 示例库优化

```typescript
// 定期优化示例库
const optimize = async () => {
  const result = await engine.optimizeExamples();
  console.log(`优化完成: 删除${result.removed}个, 更新${result.updated}个, 添加${result.added}个`);
};

setInterval(optimize, 86400000); // 每天优化一次
```

## 🧪 测试

### 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试文件
npm test fewShotEngine.test.ts

# 运行测试并生成覆盖率报告
npm test -- --coverage

# 观察模式
npm test -- --watch
```

### 测试覆盖率

目标覆盖率：>90%

```bash
# 查看覆盖率报告
npm run test:coverage
```

### 性能基准测试

```typescript
// 基准测试脚本
import { FewShotEngine } from './fewShotEngine';
import { allQueryExamples } from './queryExamples';

const engine = new FewShotEngine();
engine.addExamples(allQueryExamples);

// 测试检索性能
console.time('检索100次');
for (let i = 0; i < 100; i++) {
  engine.findRelevantExamples('查询员工信息', ['员工'], 5);
}
console.timeEnd('检索100次');

// 测试批量处理性能
const queries = Array(50).fill('查询员工信息');
console.time('批量处理50个查询');
await engine.batchProcessQueries(queries, ['员工'], 3);
console.timeEnd('批量处理50个查询');
```

## 📖 最佳实践

### 1. 示例库管理

- **定期更新**：根据实际使用情况，定期添加新示例
- **质量优先**：确保示例的正确性和代表性
- **多样性**：覆盖各种查询场景和难度级别
- **标签化**：使用有意义的标签便于检索

### 2. 提示构建

- **适量示例**：3-5个示例通常最佳
- **相关性**：选择与当前查询最相关的示例
- **渐进难度**：从简单到复杂排列示例
- **清晰推理**：复杂查询应包含推理步骤

### 3. 性能优化

- **启用缓存**：对重复查询启用缓存
- **批量处理**：对大量查询使用批量API
- **异步处理**：使用异步API避免阻塞
- **定期优化**：定期清理和优化示例库

### 4. 用户反馈

- **收集反馈**：记录用户对生成SQL的评价
- **持续学习**：根据反馈优化示例库
- **质量监控**：监控生成质量并调整策略
- **迭代改进**：持续改进相似度和检索算法

## 🔧 故障排除

### 常见问题

#### Q1: 检索结果不准确

**解决方案：**
1. 调整相似度权重：`config.similarity.weights`
2. 使用更多示例：`config.retrieval.defaultTopK`
3. 尝试不同检索策略：`RetrievalStrategy.HYBRID`
4. 添加更多相关示例到示例库

#### Q2: 性能较慢

**解决方案：**
1. 启用缓存：`config.retrieval.enableCache = true`
2. 减少候选示例：`config.retrieval.maxCandidates`
3. 减少返回数量：`topK` 参数
4. 使用批量或流式API

#### Q3: 生成的SQL质量不佳

**解决方案：**
1. 使用CoT提示：`PromptTemplate.COT`
2. 选择更相关的示例
3. 增加示例数量
4. 添加推理步骤到示例

#### Q4: 内存占用过高

**解决方案：**
1. 定期清理缓存：`engine.clearCache()`
2. 优化示例库大小
3. 使用流式处理而非批量处理
4. 调整缓存策略

### 调试技巧

```typescript
// 启用详细日志
const engine = new FewShotEngine();

// 查看检索详情
const result = engine.getRetrievalResult(query, fields, 5);
console.log('检索结果:', result);
console.log('相似度分数:', result.scores);
console.log('检索时间:', result.metadata.retrievalTime);

// 查看示例统计
const stats = engine.getStatistics();
console.log('统计信息:', stats);

// 验证示例质量
const validation = engine.validateAllExamples();
console.log('验证结果:', validation);
```

## 🤝 贡献指南

欢迎贡献代码、报告问题或提出建议！

### 开发环境设置

```bash
# 克隆仓库
git clone https://github.com/yourusername/excelmind-ai.git
cd excelmind-ai

# 安装依赖
npm install

# 运行测试
npm test

# 运行构建
npm run build
```

### 代码风格

- 使用TypeScript类型注解
- 遵循ESLint规则
- 添加JSDoc注释
- 编写单元测试

### 提交PR

1. Fork仓库
2. 创建特性分支
3. 提交更改
4. 推送到分支
5. 创建Pull Request

## 📄 许可证

MIT License - 详见 LICENSE 文件

## 📞 联系方式

- 作者：excelmind-ai团队
- 邮箱：support@excelmind-ai.com
- 官网：https://excelmind-ai.com

## 🙏 致谢

- 智谱AI提供GLM-4.6模型支持
- Anthropic提供Claude API参考
- 开源社区的宝贵建议和反馈

---

**最后更新：** 2025-12-28
**版本：** 1.0.0
