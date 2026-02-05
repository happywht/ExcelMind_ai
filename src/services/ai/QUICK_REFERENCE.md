# Few-Shot Engine 快速参考卡片

> 5分钟上手Few-Shot Learning引擎

## 🚀 快速开始（3步）

```typescript
// 1. 创建引擎
import { FewShotEngine } from './services/ai/fewShotEngine';
import { allQueryExamples } from './services/ai/queryExamples';

const engine = new FewShotEngine();
engine.addExamples(allQueryExamples);

// 2. 检索示例
const examples = engine.findRelevantExamples(
  '查询工资大于5000的员工',
  ['姓名', '工资'],
  5
);

// 3. 生成提示
const prompt = engine.buildFewShotPrompt(
  '查询工资大于5000的员工',
  examples
);
```

## 📊 核心API速查

### 示例管理

| 方法 | 说明 |
|------|------|
| `addExample(ex)` | 添加单个示例 |
| `addExamples(exs)` | 批量添加示例 |
| `getExample(id)` | 获取示例 |
| `getAllExamples()` | 获取所有示例 |
| `getExamplesByType(type)` | 按类型获取 |
| `getExamplesByDifficulty(level)` | 按难度获取 |
| `updateExample(id, updates)` | 更新示例 |
| `removeExample(id)` | 删除示例 |
| `clearExamples()` | 清空示例库 |

### 相似度计算

| 方法 | 说明 |
|------|------|
| `calculateSimilarity(q1, q2, method)` | 计算相似度 |
| `calculateDetailedSimilarity(q, ex)` | 详细相似度 |

### 检索方法

| 方法 | 说明 |
|------|------|
| `findRelevantExamples(query, fields, topK)` | 查找相关示例 |
| `getRetrievalResult(query, fields, topK)` | 获取检索结果 |

### 提示构建

| 方法 | 说明 |
|------|------|
| `buildFewShotPrompt(query, examples, config)` | 构建提示 |
| `buildBasePrompt(...)` | 基础提示 |
| `buildCoTPrompt(...)` | CoT提示 |
| `buildHybridPrompt(...)` | 混合提示 |

### 工具方法

| 方法 | 说明 |
|------|------|
| `getStatistics()` | 获取统计信息 |
| `validateExample(ex)` | 验证示例 |
| `generateReport()` | 生成报告 |
| `exportExamples()` | 导出示例 |
| `importExamples(exs)` | 导入示例 |

## 🔢 枚举类型

### SimilarityMethod

```typescript
COSINE      // 余弦相似度
JACCARD     // Jaccard相似度
LEVENSHTEIN // 编辑距离
SEMANTIC    // 语义相似度
HYBRID      // 混合相似度（推荐）
```

### RetrievalStrategy

```typescript
KEYWORD          // 关键词检索
TYPE_BASED       // 类型检索
DIFFICULTY_BASED // 难度检索
HYBRID           // 混合检索（推荐）
ADAPTIVE         // 自适应检索
```

### PromptTemplate

```typescript
BASE      // 基础提示
FEW_SHOT  // Few-Shot提示（推荐）
COT       // CoT提示
HYBRID    // 混合提示
```

## 💡 常见用法

### 基础查询生成

```typescript
const examples = engine.findRelevantExamples(
  '查询所有员工',
  ['员工'],
  3
);
const prompt = engine.buildFewShotPrompt(
  '查询所有员工',
  examples
);
```

### 复杂查询生成（CoT）

```typescript
const examples = engine.findRelevantExamples(
  '查询每个部门平均工资大于8000的部门',
  ['部门', '工资'],
  5
);
const prompt = engine.buildFewShotPrompt(
  '查询每个部门平均工资大于8000的部门',
  examples,
  { templateType: PromptTemplate.COT }
);
```

### JOIN查询生成

```typescript
const examples = engine.findRelevantExamples(
  '查询员工姓名和部门名称',
  ['姓名', '部门名称'],
  3,
  RetrievalStrategy.TYPE_BASED
);
const prompt = engine.buildFewShotPrompt(
  '查询员工姓名和部门名称',
  examples
);
```

### 批量处理

```typescript
const queries = ['查询1', '查询2', '查询3'];
const results = await engine.batchProcessQueries(
  queries,
  ['字段1', '字段2'],
  3
);
```

## 🎯 配置选项

### 推荐配置

```typescript
// 快速响应
const fastConfig = {
  retrieval: {
    defaultTopK: 3,
    enableCache: true
  }
};

// 高精度
const accurateConfig = {
  similarity: {
    defaultMethod: SimilarityMethod.HYBRID,
    threshold: 0.7
  },
  retrieval: {
    defaultStrategy: RetrievalStrategy.HYBRID,
    defaultTopK: 7
  }
};

// 持续学习
const learningConfig = {
  learning: {
    enableFeedback: true,
    autoUpdateExamples: true
  }
};
```

## 📈 性能优化

### 启用缓存

```typescript
const engine = new FewShotEngine({
  retrieval: { enableCache: true }
});
```

### 定期清理

```typescript
setInterval(() => {
  engine.clearCache();
}, 3600000);
```

### 批量处理

```typescript
await engine.batchProcessQueries(
  queries,
  fields,
  3
);
```

## 🐛 调试技巧

### 查看检索详情

```typescript
const result = engine.getRetrievalResult(query, fields, 5);
console.log(result.metadata);
console.log(result.scores);
```

### 验证示例质量

```typescript
const validation = engine.validateAllExamples();
console.log(validation);
```

### 生成报告

```typescript
const report = engine.generateReport();
console.log(report);
```

## 📚 文档索引

| 文档 | 路径 |
|------|------|
| 完整文档 | `services/ai/fewShotEngine.README.md` |
| 集成指南 | `services/ai/INTEGRATION_GUIDE.md` |
| 使用示例 | `services/ai/fewShotEngine.demo.ts` |
| 单元测试 | `services/ai/fewShotEngine.test.ts` |
| 实施总结 | `services/ai/IMPLEMENTATION_SUMMARY.md` |

## ⚡ 常见问题

### Q: 如何提高检索准确率？

A: 使用混合策略和更多示例
```typescript
const examples = engine.findRelevantExamples(
  query,
  fields,
  7,  // 增加数量
  RetrievalStrategy.HYBRID
);
```

### Q: 如何处理复杂查询？

A: 使用CoT提示
```typescript
const prompt = engine.buildFewShotPrompt(
  query,
  examples,
  { templateType: PromptTemplate.COT }
);
```

### Q: 如何优化性能？

A: 启用缓存和批量处理
```typescript
const engine = new FewShotEngine({
  retrieval: { enableCache: true }
);
```

## 🎓 最佳实践

1. **选择合适的检索策略**：根据查询类型选择
2. **使用适量示例**：3-5个通常最佳
3. **启用缓存**：提高重复查询性能
4. **收集反馈**：持续优化示例库
5. **定期验证**：确保示例质量

## 🔗 集成示例

### REST API

```typescript
app.post('/api/generate-sql', async (req, res) => {
  const { naturalQuery, availableFields } = req.body;

  const examples = engine.findRelevantExamples(
    naturalQuery,
    availableFields,
    5
  );

  const prompt = engine.buildFewShotPrompt(
    naturalQuery,
    examples
  );

  const sql = await callAI(prompt);
  res.json({ sql });
});
```

### SDK使用

```typescript
import { createFewShotEngine } from './fewShotEngine';

const engine = createFewShotEngine();
const sql = await generateSQL(engine, naturalQuery);
```

## 📞 获取帮助

- 📖 查看完整文档
- 💻 运行使用示例
- 🧪 运行单元测试
- 📧 联系技术支持

---

**版本：** 1.0.0
**更新：** 2025-12-28
