# 常用指令库的设计原则和评估方法

## 核心问题

> **用户质疑**：如何评估哪些指令是常用的、通用的、可复用的？否则还不如让AI单独生成。

这个质疑非常深刻！指令库的设计必须基于**数据驱动**的方法，而非主观臆断。

---

## 第一部分：什么是指令的"常用性"？

### 多维度评估框架

#### 1. 使用频率 (Frequency)
**定义**：用户在数据处理操作中的使用频次

**量化指标**：
```typescript
interface FrequencyMetrics {
  dailyCount: number;        // 每日使用次数
  weeklyCount: number;       // 每周使用次数
  userPenetration: number;   // 用户渗透率（使用该指令的用户占比）
  trend: 'rising' | 'stable' | 'declining';  // 使用趋势
}
```

**评估方法**：
- 分析后端日志，统计 `smartProcess` API 的调用模式
- 统计用户指令的语义相似度聚类
- 识别高频操作模式

#### 2. 通用性 (Generality)
**定义**：指令适用于不同场景和数据的程度

**量化指标**：
```typescript
interface GeneralityMetrics {
  scenarioApplicability: number;  // 场景适用性（0-1）
  dataStructureIndependence: number;  // 数据结构独立性
  domainNeutrality: number;  // 领域中立性（跨行业适用性）
}
```

**示例对比**：
```typescript
// 高通用性
"筛选出{列名}{条件}{值}"  // 可应用于任何列名、任何条件、任何值

// 低通用性
"筛选出年龄大于30的记录"  // 只适用于年龄列和特定值
```

#### 3. AI生成难度 (AI Difficulty)
**定义**：AI生成该指令的准确率和稳定性

**量化指标**：
```typescript
interface AIDifficultyMetrics {
  successRate: number;        // AI成功率
  avgRetries: number;         // 平均重试次数
  avgGenerationTime: number;  // 平均生成时间（ms）
  errorRate: number;          // 错误率
  variance: number;           // 结果方差（一致性）
}
```

**评估方法**：
- A/B测试：指令库 vs AI生成
- 统计AI生成失败后的用户修改率
- 分析用户满意度评分

---

## 第二部分：数据驱动的指令发现方法

### 方法1：分析AI历史生成记录

**实施步骤**：

```typescript
// 1. 收集数据
interface CommandLog {
  timestamp: Date;
  userId: string;
  userInstruction: string;
  aiGeneratedCode: string;
  success: boolean;
  executionTime: number;
  userModified: boolean;
  rating?: number;  // 用户评分 1-5
}

// 2. 语义聚类
async function clusterCommands(logs: CommandLog[]) {
  // 使用嵌入模型将指令向量化
  const embeddings = await embedInstructions(logs.map(l => l.userInstruction));

  // 使用聚类算法（如K-means）分组
  const clusters = await kMeans(embeddings, k = 10);

  // 分析每个簇的特征
  return clusters.map(cluster => ({
    centroid: cluster.center,
    count: cluster.points.length,
    avgSuccessRate: average(cluster.points.map(p => p.success)),
    avgRating: average(cluster.points.map(p => p.rating)),
    commonPattern: extractCommonPattern(cluster.points)
  }));
}

// 3. 识别高频模式
async function identifyHighFrequencyPatterns(clusters: Cluster[]) {
  return clusters
    .filter(c => c.count >= 10)  // 至少出现10次
    .filter(c => c.avgSuccessRate >= 0.8)  // AI成功率>=80%
    .filter(c => c.avgRating >= 4.0)  // 用户评分>=4.0
    .sort((a, b) => b.count - a.count);  // 按频率排序
}
```

**实际代码示例**：
```typescript
// scripts/analyze-command-patterns.ts
export async function analyzeCommandPatterns() {
  // 从数据库或日志文件读取历史记录
  const logs = await loadCommandLogs();

  // 统计高频指令
  const instructionFrequency = new Map<string, number>();

  logs.forEach(log => {
    // 提取指令的核心模式（去除具体数值）
    const pattern = extractInstructionPattern(log.userInstruction);
    instructionFrequency.set(pattern, (instructionFrequency.get(pattern) || 0) + 1);
  });

  // 排序并输出
  const sortedPatterns = Array.from(instructionFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);  // 取前20个

  console.log('Top 20 Common Instruction Patterns:');
  sortedPatterns.forEach(([pattern, count], index) => {
    console.log(`${index + 1}. ${pattern}: ${count}次`);
  });
}

// 提取指令模式
function extractInstructionPattern(instruction: string): string {
  // "筛选出年龄大于30的记录" -> "筛选出{列名}{条件}{值}"
  // 使用正则表达式替换具体值
  return instruction
    .replace(/\d+/g, '{值}')
    .replace(/["'][^"']*["']/g, '{文本}')
    .replace(/[A-Za-z]\w*/g, (match) => {
      // 如果是常见列名，保留；否则替换
      const commonColumns = ['年龄', '工资', '日期', '部门'];
      return commonColumns.includes(match) ? match : '{列名}';
    });
}
```

### 方法2：用户行为分析

**关键指标**：

```typescript
interface UserBehaviorMetrics {
  // 重复使用率
  repeatUsageRate: number;  // 用户重复使用相同操作的频率

  // 修改率
  modificationRate: number;  // 用户修改AI生成结果的频率
  avgModificationTime: number;  // 平均修改时间

  // 搜索和探索
  searchFrequency: number;  // 用户搜索特定操作的频率
  explorationRate: number;  // 用户尝试新功能的频率

  // 成功率
  taskCompletionRate: number;  // 任务完成率
  timeToCompletion: number;  // 完成任务的平均时间
}
```

**数据收集方法**：

```typescript
// 前端埋点示例
export function trackUserBehavior(event: UserBehaviorEvent) {
  // 发送到后端分析系统
  analytics.track({
    eventType: event.type,
    userId: event.userId,
    sessionId: event.sessionId,
    timestamp: Date.now(),
    properties: {
      instruction: event.instruction,
      success: event.success,
      modified: event.modified,
      modificationTime: event.modificationTime,
      rating: event.rating
    }
  });
}

// 使用场景
// 1. 用户提交指令
trackUserBehavior({
  type: 'instruction_submitted',
  instruction: userInstruction,
  userId: currentUserId
});

// 2. 用户修改AI生成结果
trackUserBehavior({
  type: 'result_modified',
  instruction: originalInstruction,
  modified: true,
  modificationTime: timeSpent
});

// 3. 用户评分
trackUserBehavior({
  type: 'result_rated',
  rating: userRating,
  instruction: originalInstruction
});
```

### 方法3：行业最佳实践参考

**Excel最常用的操作**（基于Microsoft官方数据）：

```typescript
const EXCEL_COMMON_OPERATIONS = {
  // 数据筛选（使用频率：45%）
  filter: {
    frequency: 0.45,
    patterns: [
      '筛选出{列名}{条件}{值}',
      '多条件筛选{列1}{条件1}{值1},{列2}{条件2}{值2}',
      '筛选前/后{N}条记录'
    ]
  },

  // 数据排序（使用频率：38%）
  sort: {
    frequency: 0.38,
    patterns: [
      '按{列名}升序/降序排列',
      '多列排序{列1},{列2}'
    ]
  },

  // 数据统计（使用频率：62%）
  aggregate: {
    frequency: 0.62,
    patterns: [
      '计算{列名}的平均值',
      '统计{列名}的总和',
      '计数{列名}的非空值',
      '计算{列名}的最大值/最小值'
    ]
  },

  // 数据查找（使用频率：29%）
  lookup: {
    frequency: 0.29,
    patterns: [
      '查找{列名}等于{值}的记录',
      '多条件查找'
    ]
  },

  // 数据转换（使用频率：25%）
  transform: {
    frequency: 0.25,
    patterns: [
      '将{列名}格式转换为{格式}',
      '拆分{列名}为多列',
      '合并多列为一列'
    ]
  },

  // 数据分组（使用频率：34%）
  group: {
    frequency: 0.34,
    patterns: [
      '按{列名}分组统计',
      '创建数据透视表'
    ]
  }
};
```

---

## 第三部分：指令库的分类体系设计

### 按操作复杂度分类

```typescript
enum InstructionComplexity {
  SIMPLE = 'simple',      // 单步操作
  MEDIUM = 'medium',      // 2-3步操作
  COMPLEX = 'complex'     // 4步以上操作
}

interface InstructionCategory {
  id: string;
  name: string;
  complexity: InstructionComplexity;
  patterns: InstructionPattern[];
  examples: string[];
  useCases: string[];
}
```

### 典型分类结构

```typescript
const INSTRUCTION_CATEGORIES: InstructionCategory[] = [
  // ========== 简单操作 ==========
  {
    id: 'filter-simple',
    name: '简单筛选',
    complexity: InstructionComplexity.SIMPLE,
    patterns: [
      {
        template: '筛选出{列名}{条件}{值}',
        parameters: [
          { name: '列名', type: 'column', required: true },
          { name: '条件', type: 'operator', required: true, options: ['大于', '小于', '等于', '包含'] },
          { name: '值', type: 'value', required: true }
        ]
      }
    ],
    examples: [
      '筛选出年龄大于30的记录',
      '筛选出部门等于"销售"的记录',
      '筛选出姓名包含"张"的记录'
    ],
    useCases: ['数据清洗', '异常值检测', '特定群体分析']
  },

  {
    id: 'sort-simple',
    name: '简单排序',
    complexity: InstructionComplexity.SIMPLE,
    patterns: [
      {
        template: '按{列名}{顺序}排列',
        parameters: [
          { name: '列名', type: 'column', required: true },
          { name: '顺序', type: 'sortOrder', required: true, options: ['升序', '降序'] }
        ]
      }
    ],
    examples: [
      '按工资降序排列',
      '按入职日期升序排列'
    ],
    useCases: ['排名分析', '趋势识别', '数据整理']
  },

  // ========== 中等操作 ==========
  {
    id: 'filter-sort-combo',
    name: '筛选后排序',
    complexity: InstructionComplexity.MEDIUM,
    patterns: [
      {
        template: '筛选出{列名1}{条件}{值}，按{列名2}{顺序}排列',
        parameters: [
          { name: '列名1', type: 'column', required: true },
          { name: '条件', type: 'operator', required: true },
          { name: '值', type: 'value', required: true },
          { name: '列名2', type: 'column', required: true },
          { name: '顺序', type: 'sortOrder', required: true }
        ]
      }
    ],
    examples: [
      '筛选出年龄大于30的记录，按工资降序排列',
      '筛选出部门等于"销售"的记录，按入职日期升序排列'
    ],
    useCases: ['分层分析', '绩效评估', '数据报告']
  },

  {
    id: 'aggregate-group',
    name: '分组统计',
    complexity: InstructionComplexity.MEDIUM,
    patterns: [
      {
        template: '按{分组列}统计{统计列}的{统计函数}',
        parameters: [
          { name: '分组列', type: 'column', required: true },
          { name: '统计列', type: 'column', required: true },
          { name: '统计函数', type: 'aggregate', required: true, options: ['平均值', '总和', '计数', '最大值', '最小值'] }
        ]
      }
    ],
    examples: [
      '按部门统计工资的平均值',
      '按职位统计人数',
      '按地区统计销售额的总和'
    ],
    useCases: ['报表生成', 'KPI统计', '数据汇总']
  },

  // ========== 复杂操作 ==========
  {
    id: 'multi-step-analysis',
    name: '多步骤分析',
    complexity: InstructionComplexity.COMPLEX,
    patterns: [
      {
        template: '筛选{条件}，分组统计{分组列}的{统计函数}，按{排序列}{顺序}排列',
        parameters: [
          { name: '条件', type: 'filterCondition', required: true },
          { name: '分组列', type: 'column', required: true },
          { name: '统计函数', type: 'aggregate', required: true },
          { name: '排序列', type: 'column', required: true },
          { name: '顺序', type: 'sortOrder', required: true }
        ]
      }
    ],
    examples: [
      '筛选出2024年的数据，按部门统计销售额总和，按销售额降序排列',
      '筛选出年龄大于30的员工，按职位统计工资平均值，按工资降序排列'
    ],
    useCases: ['深度分析', '决策支持', '复杂报表']
  }
];
```

---

## 第四部分：指令库 vs AI生成的边界

### 决策树

```
是否需要加入指令库？
│
├─ 1. 使用频率如何？
│   ├─ 高频（>10次/天） → 继续判断
│   └─ 低频（<10次/天） → 不加入，让AI生成
│
├─ 2. AI生成成功率如何？
│   ├─ 成功率高（>90%） → 考虑加入（提升用户体验）
│   ├─ 成功率中等（70-90%） → 强烈建议加入
│   └─ 成功率低（<70%） → 必须加入
│
├─ 3. 操作复杂度如何？
│   ├─ 简单操作 → 考虑加入（用户可能更喜欢直接选择）
│   ├─ 中等操作 → 根据使用频率决定
│   └─ 复杂操作 → 不加入，让AI生成
│
└─ 4. 用户反馈如何？
    ├─ 满意度高（>4.5/5） → 考虑加入
    ├─ 满意度中等（3.5-4.5） → 根据频率决定
    └─ 满意度低（<3.5） → 不加入，需要优化
```

### 量化决策模型

```typescript
interface InstructionScore {
  frequency: number;        // 使用频率得分 (0-100)
  aiDifficulty: number;     // AI难度得分 (0-100，越高越难)
  complexity: number;       // 复杂度得分 (0-100)
  userSatisfaction: number; // 用户满意度得分 (0-100)
}

function calculateShouldInclude(score: InstructionScore): {
  include: boolean;
  reason: string;
  priority: number;
} {
  // 加权计算总分
  const totalScore =
    score.frequency * 0.3 +
    score.aiDifficulty * 0.3 +
    (100 - score.complexity) * 0.2 +  // 复杂度越低越好
    score.userSatisfaction * 0.2;

  // 决策阈值
  if (totalScore >= 70) {
    return {
      include: true,
      reason: '高频、AI难生成、简单、用户满意',
      priority: Math.round(totalScore)
    };
  } else if (totalScore >= 50) {
    return {
      include: true,
      reason: '中等优先级，考虑加入',
      priority: Math.round(totalScore)
    };
  } else {
    return {
      include: false,
      reason: '低频或AI已能很好生成',
      priority: Math.round(totalScore)
    };
  }
}
```

---

## 第五部分：可复用指令模板设计

### 参数化设计原则

**错误示例**（过于复杂）：
```typescript
// ❌ 用户难以理解
{
  "category": "filter",
  "column": "age",
  "operator": ">",
  "value": 30
}
```

**正确示例**（自然语言模板）：
```typescript
// ✅ 用户能理解
interface InstructionTemplate {
  id: string;
  name: string;
  description: string;
  template: string;  // 自然语言模板
  parameters: TemplateParameter[];
  examples: string[];
  aiGeneratedCode?: string;  // 预生成的代码（可选）
}

// 实际示例
const filterTemplate: InstructionTemplate = {
  id: 'filter-simple',
  name: '简单筛选',
  description: '根据条件筛选数据',
  template: '筛选出{列名}{条件}{值}的记录',
  parameters: [
    {
      name: '列名',
      type: 'column',
      description: '要筛选的列',
      required: true,
      placeholder: '例如：年龄、工资'
    },
    {
      name: '条件',
      type: 'operator',
      description: '筛选条件',
      required: true,
      options: [
        { value: '大于', label: '>', example: '筛选出年龄大于30的记录' },
        { value: '小于', label: '<', example: '筛选出工资小于5000的记录' },
        { value: '等于', label: '=', example: '筛选出部门等于销售的记录' },
        { value: '包含', label: 'CONTAINS', example: '筛选出姓名包含"张"的记录' }
      ]
    },
    {
      name: '值',
      type: 'value',
      description: '筛选的值',
      required: true,
      placeholder: '例如：30、"销售"、"张三"'
    }
  ],
  examples: [
    '筛选出年龄大于30的记录',
    '筛选出工资小于5000的记录',
    '筛选出部门等于"销售"的记录',
    '筛选出姓名包含"张"的记录'
  ],
  aiGeneratedCode: `
# 筛选出年龄大于30的记录
def filter_data(data):
    return [row for row in data if row.get('年龄', 0) > 30]
  `
};
```

### 智能推荐系统

```typescript
// 基于数据结构的智能推荐
export function recommendInstructions(
  dataColumns: string[],
  dataSample: any[]
): InstructionTemplate[] {
  const recommendations: InstructionTemplate[] = [];

  // 分析数据特征
  const numericColumns = dataColumns.filter(col =>
    typeof dataSample[0][col] === 'number'
  );

  const textColumns = dataColumns.filter(col =>
    typeof dataSample[0][col] === 'string'
  );

  const dateColumns = dataColumns.filter(col =>
    String(dataSample[0][col]).match(/\d{4}-\d{2}-\d{2}/)
  );

  // 推荐筛选指令
  if (numericColumns.length > 0) {
    recommendations.push({
      ...filterTemplate,
      customizedName: `筛选${numericColumns[0]}`,
      customizedTemplate: `筛选出${numericColumns[0]}{条件}{值}的记录`
    });
  }

  // 推荐排序指令
  if (numericColumns.length > 0) {
    recommendations.push({
      ...sortTemplate,
      customizedName: `按${numericColumns[0]}排序`,
      customizedTemplate: `按${numericColumns[0]}{顺序}排列`
    });
  }

  // 推荐分组统计
  if (textColumns.length > 0 && numericColumns.length > 0) {
    recommendations.push({
      ...aggregateTemplate,
      customizedName: `按${textColumns[0]}统计${numericColumns[0]}`,
      customizedTemplate: `按${textColumns[0]}统计${numericColumns[0]}的{统计函数}`
    });
  }

  return recommendations;
}
```

---

## 第六部分：实际项目实施方案

### 阶段1：数据收集（第1-2周）

```typescript
// 1. 添加日志收集
export async function logCommandUsage(data: {
  instruction: string;
  success: boolean;
  executionTime: number;
  userModified?: boolean;
  rating?: number;
}) {
  // 存储到数据库或日志文件
  await database.insert('command_logs', {
    timestamp: new Date(),
    ...data,
    pattern: extractPattern(data.instruction)
  });
}

// 2. 在smartProcessController中集成
// api/controllers/smartProcessController.ts
export class SmartProcessController {
  async execute(req: Request, res: Response) {
    // ... 现有逻辑 ...

    const result = await orchestrator.executeTask(command, dataFiles);

    // 记录日志
    await logCommandUsage({
      instruction: command,
      success: result.success,
      executionTime: result.executionSummary.totalTime,
      rating: req.body.rating
    });

    // ... 返回结果 ...
  }
}
```

### 阶段2：数据分析（第3周）

```typescript
// scripts/analyze-instruction-patterns.ts
export async function analyzeInstructionPatterns() {
  const logs = await loadCommandLogs();

  // 1. 频率分析
  const frequencyAnalysis = analyzeFrequency(logs);

  // 2. AI性能分析
  const aiPerformance = analyzeAIPerformance(logs);

  // 3. 用户满意度分析
  const satisfaction = analyzeUserSatisfaction(logs);

  // 4. 综合评分
  const rankedInstructions = rankInstructions({
    frequency: frequencyAnalysis,
    aiPerformance,
    satisfaction
  });

  // 输出报告
  generateReport(rankedInstructions);
}

function analyzeFrequency(logs: CommandLog[]) {
  const patterns = new Map<string, number>();

  logs.forEach(log => {
    const pattern = extractPattern(log.instruction);
    patterns.set(pattern, (patterns.get(pattern) || 0) + 1);
  });

  return Array.from(patterns.entries())
    .map(([pattern, count]) => ({
      pattern,
      count,
      frequency: count / logs.length
    }))
    .sort((a, b) => b.count - a.count);
}
```

### 阶段3：指令库构建（第4-5周）

```typescript
// services/instructionLibraryService.ts
export class InstructionLibraryService {
  private library: Map<string, InstructionTemplate>;

  constructor() {
    this.library = new Map();
    this.initializeLibrary();
  }

  private async initializeLibrary() {
    // 1. 加载预定义指令（基于最佳实践）
    const predefinedInstructions = await loadPredefinedInstructions();

    // 2. 加载数据驱动发现的指令
    const discoveredInstructions = await loadDiscoveredInstructions();

    // 3. 合并去重
    const allInstructions = mergeAndDeduplicate(
      predefinedInstructions,
      discoveredInstructions
    );

    // 4. 存储到库中
    allInstructions.forEach(instruction => {
      this.library.set(instruction.id, instruction);
    });
  }

  // 根据上下文推荐指令
  recommend(context: {
    dataColumns: string[];
    dataSample: any[];
    userHistory?: string[];
  }): InstructionTemplate[] {
    const recommendations: InstructionTemplate[] = [];

    // 1. 基于数据结构的推荐
    const dataBased = this.recommendByDataStructure(context);
    recommendations.push(...dataBased);

    // 2. 基于用户历史的推荐
    if (context.userHistory) {
      const historyBased = this.recommendByHistory(context.userHistory);
      recommendations.push(...historyBased);
    }

    // 3. 基于全局频率的推荐
    const popularBased = this.getPopularInstructions(5);
    recommendations.push(...popularBased);

    // 去重并排序
    return uniqueBy(recommendations, 'id')
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 10);  // 返回前10个
  }
}
```

### 阶段4：A/B测试（第6-8周）

```typescript
// 测试方案
interface ABTestConfig {
  // A组：仅使用AI生成
  groupA: {
    useInstructionLibrary: false;
    useAIGeneration: true;
  };

  // B组：指令库 + AI生成
  groupB: {
    useInstructionLibrary: true;
    useAIGeneration: true;
  };

  // C组：仅使用指令库（对照组）
  groupC: {
    useInstructionLibrary: true;
    useAIGeneration: false;
  };
}

// 收集A/B测试数据
export async function trackABTestMetrics(userId: string, group: keyof ABTestConfig, metrics: {
  taskCompletionTime: number;
  successRate: number;
  userSatisfaction: number;
  instructionUsed: string;
}) {
  await database.insert('ab_test_results', {
    timestamp: new Date(),
    userId,
    group,
    ...metrics
  });
}

// 分析A/B测试结果
export async function analyzeABTestResults() {
  const results = await loadABTestResults();

  const metrics = {
    groupA: calculateGroupMetrics(results.filter(r => r.group === 'groupA')),
    groupB: calculateGroupMetrics(results.filter(r => r.group === 'groupB')),
    groupC: calculateGroupMetrics(results.filter(r => r.group === 'groupC'))
  };

  // 统计显著性检验
  const significance = performStatisticalTest(metrics);

  return {
    metrics,
    significance,
    recommendation: generateRecommendation(metrics, significance)
  };
}
```

### 阶段5：持续优化（长期）

```typescript
// 定期更新指令库
export async function updateInstructionLibrary() {
  // 1. 分析最近30天的数据
  const recentLogs = await loadRecentLogs(30);

  // 2. 识别新兴模式
  const emergingPatterns = identifyEmergingPatterns(recentLogs);

  // 3. 评估是否需要添加新指令
  const newInstructions = emergingPatterns
    .filter(pattern => pattern.score > 70)
    .map(pattern => createInstructionFromPattern(pattern));

  // 4. 识别需要移除的指令
  const outdatedInstructions = await identifyOutdatedInstructions();

  // 5. 更新库
  await applyUpdates({
    add: newInstructions,
    remove: outdatedInstructions,
    update: []  // 需要更新的现有指令
  });
}
```

---

## 第七部分：评估指标体系

### 核心指标

```typescript
interface InstructionLibraryMetrics {
  // 业务指标
  userEngagement: {
    libraryUsageRate: number;        // 指令库使用率
    avgInstructionsPerSession: number;  // 每会话平均使用指令数
    repeatUsageRate: number;         // 重复使用率
  };

  // 性能指标
  performance: {
    avgExecutionTime: number;        // 平均执行时间
    successRate: number;             // 成功率
    errorRate: number;               // 错误率
  };

  // 用户体验指标
  userExperience: {
    satisfactionScore: number;       // 满意度评分
    taskCompletionRate: number;      // 任务完成率
    timeToCompletion: number;        // 完成时间
    modificationRate: number;        // 修改率
  };

  // AI对比指标
  aiComparison: {
    speedImprovement: number;        // 速度提升（vs AI生成）
    accuracyImprovement: number;     // 准确率提升（vs AI生成）
    costSavings: number;            // 成本节省（减少AI调用）
  };
}
```

### 评估周期

```typescript
// 每周报告
export async function generateWeeklyReport() {
  const metrics = await calculateMetrics();

  return {
    period: 'week',
    date: new Date(),
    metrics,
    trends: calculateTrends(metrics),  // 与上周对比
    recommendations: generateRecommendations(metrics)
  };
}

// 每月深度分析
export async function generateMonthlyReport() {
  const weeklyReports = await loadWeeklyReports(4);  // 最近4周

  return {
    period: 'month',
    date: new Date(),
    summary: summarizeWeeklyReports(weeklyReports),
    deepDive: {
      instructionPerformance: analyzeInstructionPerformance(),
      userSegmentation: analyzeUserSegments(),
      emergingPatterns: identifyEmergingPatterns()
    },
    actionItems: generateActionItems()
  };
}
```

---

## 结论和建议

### 核心建议

1. **数据驱动**：不要凭空设计指令库，必须基于实际使用数据
2. **渐进式构建**：从高频、简单指令开始，逐步扩展
3. **持续优化**：建立反馈循环，定期更新和优化
4. **平衡策略**：指令库和AI生成互补，而非替代

### 实施路线图

```
第1-2周：数据收集和基础设施
├─ 添加日志收集
├─ 建立数据分析管道
└─ 设计评估指标体系

第3-4周：数据分析和发现
├─ 分析历史数据
├─ 识别高频模式
└─ 评估AI生成性能

第5-6周：指令库原型
├─ 构建第一批指令（Top 10）
├─ 开发推荐系统
└─ 集成到现有系统

第7-8周：A/B测试
├─ 设计测试方案
├─ 收集测试数据
└─ 分析测试结果

第9周+：持续优化
├─ 根据数据迭代
├─ 扩展指令库
└─ 优化用户体验
```

### 关键成功因素

1. **高层支持**：确保有足够的资源和时间投入
2. **用户参与**：早期邀请核心用户参与测试
3. **技术基础**：建立完善的数据收集和分析系统
4. **敏捷迭代**：小步快跑，根据数据快速调整

---

**最后更新**：2026-01-28
**版本**：v1.0
**作者**：产品团队
