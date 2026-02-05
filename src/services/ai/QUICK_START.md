# 智能数据处理模块 - 快速开始指南

## 📚 目录

- [安装](#安装)
- [快速开始](#快速开始)
- [核心概念](#核心概念)
- [API 参考](#api-参考)
- [常见问题](#常见问题)

---

## 🚀 安装

模块已集成到项目中，无需额外安装。

### 依赖项

```json
{
  "dependencies": {
    "typescript": "^5.x"
  }
}
```

---

## ⚡ 快速开始

### 1. 导入服务

```typescript
import {
  DataQualityAnalyzer,
  CleaningRecommendationEngine,
  createDataQualityAnalyzer,
  createCleaningRecommendationEngine
} from '../services';
```

### 2. 创建实例

```typescript
// 使用现有的 AI 服务和缓存服务
const analyzer = createDataQualityAnalyzer(
  aiService,    // IAIService 实例
  cacheService  // ICacheService 实例（可选）
);

const recommendationEngine = createCleaningRecommendationEngine(
  aiService,    // IAIService 实例
  cacheService  // ICacheService 实例（可选）
);
```

### 3. 分析数据质量

```typescript
// 读取 Excel 文件
const excelData = await readExcelFile(file);

// 分析数据质量
const report = await analyzer.analyze(excelData, {
  detectMissing: true,
  detectOutliers: true,
  detectDuplicates: true,
  detectFormat: true
});

console.log('质量评分:', report.qualityScore);
console.log('发现问题:', report.issues.length);
```

### 4. 生成清洗建议

```typescript
// 生成清洗建议
const suggestions = await recommendationEngine.generateRecommendations(
  report,
  {
    maxSuggestions: 3,
    explainReasoning: true,
    generateCode: true
  }
);

// 查看建议
suggestions.forEach(suggestion => {
  console.log('策略:', suggestion.strategy.name);
  console.log('优先级:', suggestion.priority);
  console.log('理由:', suggestion.reasoning);
});
```

---

## 🎯 核心概念

### 数据质量报告

```typescript
interface DataQualityReport {
  reportId: string;           // 报告ID
  fileName: string;           // 文件名
  sheetName: string;          // Sheet名称
  totalRows: number;          // 总行数
  totalColumns: number;       // 总列数
  timestamp: number;          // 检测时间戳
  qualityScore: number;       // 质量评分 (0-100)
  issues: DataQualityIssue[]; // 检测到的问题
  columnStats: ColumnStatistics[]; // 列统计信息
  dataSample?: any[];         // 数据样本
}
```

### 数据质量问题

```typescript
interface DataQualityIssue {
  issueId: string;                          // 问题ID
  issueType: DataQualityIssueType;          // 问题类型
  severity: 'critical' | 'high' | 'medium' | 'low'; // 严重程度
  affectedColumns: string[];                // 影响的列
  affectedRows: number[];                   // 影响的行索引
  description: string;                      // 问题描述
  statistics: IssueStatistics;              // 问题统计
}
```

### 问题类型

- `MISSING_VALUE` - 缺失值
- `OUTLIER` - 异常值
- `DUPLICATE_ROW` - 重复行
- `FORMAT_INCONSISTENCY` - 格式不一致
- `INVALID_TYPE` - 无效类型
- `DATA_INCONSISTENCY` - 数据不一致

### 清洗建议

```typescript
interface CleaningSuggestion {
  suggestionId: string;              // 建议ID
  issueId: string;                   // 关联的问题ID
  strategy: CleaningStrategy;        // 建议的策略
  priority: number;                  // 优先级 (0-1)
  reasoning: string;                 // AI生成的推荐理由
  expectedImpact: ImpactAssessment;   // 预期效果
  riskLevel: 'low' | 'medium' | 'high'; // 风险等级
  executionEstimate: ExecutionEstimate; // 执行估算
}
```

---

## 📖 API 参考

### DataQualityAnalyzer

#### `analyze(data, options?)`

分析 Excel 数据的质量。

**参数**:
- `data: ExcelData` - Excel 数据对象
- `options?: AnalysisOptions` - 分析选项

**返回**: `Promise<DataQualityReport>`

**示例**:
```typescript
const report = await analyzer.analyze(excelData, {
  detectMissing: true,
  detectOutliers: true,
  detectDuplicates: true,
  detectFormat: true,
  outlierMethod: 'iqr',
  outlierThreshold: 1.5,
  sampleSize: 10000,
  samplingMethod: 'random',
  customRules: [
    {
      ruleId: 'custom_1',
      name: '自定义规则',
      description: '检测自定义问题',
      rule: (row) => row.value < 0,
      severity: 'high'
    }
  ]
});
```

### CleaningRecommendationEngine

#### `generateRecommendations(report, options?)`

基于数据质量报告生成清洗建议。

**参数**:
- `report: DataQualityReport` - 数据质量报告
- `options?: SuggestionOptions` - 建议生成选项

**返回**: `Promise<CleaningSuggestion[]>`

**示例**:
```typescript
const suggestions = await recommendationEngine.generateRecommendations(
  report,
  {
    maxSuggestions: 5,
    explainReasoning: true,
    generateCode: true,
    userPreferences: {
      preferDataRetention: true,
      preferQualityImprovement: true,
      riskTolerance: 'medium',
      excludedStrategies: [StrategyType.DELETE]
    }
  }
);
```

---

## 🔧 配置选项

### AnalysisOptions

```typescript
interface AnalysisOptions {
  // 采样配置
  sampleSize?: number;                              // 采样大小
  samplingMethod?: 'random' | 'systematic' | 'stratified'; // 采样方法

  // 检测开关
  detectMissing?: boolean;                          // 检测缺失值
  detectOutliers?: boolean;                         // 检测异常值
  detectDuplicates?: boolean;                       // 检测重复行
  detectFormat?: boolean;                           // 检测格式不一致

  // 异常值检测配置
  outlierMethod?: 'iqr' | 'zscore' | 'isolation_forest'; // 检测方法
  outlierThreshold?: number;                        // 阈值

  // 自定义规则
  customRules?: CustomRule[];                       // 自定义检测规则
}
```

### SuggestionOptions

```typescript
interface SuggestionOptions {
  maxSuggestions?: number;              // 每个问题最多建议数量
  considerUserContext?: boolean;        // 考虑用户上下文
  explainReasoning?: boolean;           // 解释推理过程
  generateCode?: boolean;               // 生成执行代码
  userPreferences?: UserPreferences;    // 用户偏好
}
```

### UserPreferences

```typescript
interface UserPreferences {
  preferDataRetention?: boolean;        // 优先数据保留
  preferQualityImprovement?: boolean;   // 优先质量改善
  riskTolerance?: 'low' | 'medium' | 'high'; // 风险容忍度
  excludedStrategies?: StrategyType[];  // 排除的策略类型
}
```

---

## ❓ 常见问题

### Q1: 如何提高分析速度？

**A**: 使用采样分析：

```typescript
const report = await analyzer.analyze(excelData, {
  sampleSize: 5000,  // 只分析前 5000 行
  samplingMethod: 'random'
});
```

### Q2: 如何只检测特定类型的问题？

**A**: 使用检测开关：

```typescript
const report = await analyzer.analyze(excelData, {
  detectMissing: true,
  detectOutliers: false,
  detectDuplicates: false,
  detectFormat: false
});
```

### Q3: 如何添加自定义检测规则？

**A**: 使用 customRules 参数：

```typescript
const customRule: CustomRule = {
  ruleId: 'age_validation',
  name: '年龄验证',
  description: '年龄必须在 18-65 之间',
  rule: (row: any) => row.age < 18 || row.age > 65,
  severity: 'high'
};

const report = await analyzer.analyze(excelData, {
  customRules: [customRule]
});
```

### Q4: 如何过滤高风险的建议？

**A**: 过滤建议列表：

```typescript
const suggestions = await recommendationEngine.generateRecommendations(report);

const lowRiskSuggestions = suggestions.filter(
  s => s.riskLevel === 'low'
);
```

### Q5: 如何获取特定列的问题？

**A**: 过滤问题列表：

```typescript
const emailIssues = report.issues.filter(
  issue => issue.affectedColumns.includes('email')
);
```

### Q6: 如何禁用缓存？

**A**: 创建分析器时传入配置：

```typescript
const analyzer = createDataQualityAnalyzer(
  aiService,
  cacheService,
  { enableCache: false }
);
```

### Q7: 生成的执行代码如何使用？

**A**: 使用现有的 Python 执行环境：

```typescript
import { executeTransformation } from '../services/excelService';

const code = suggestion.strategy.executionCode;
const datasets = {
  'data.xlsx': excelData.sheets['Sheet1']
};

const result = await executeTransformation(code, datasets);
```

### Q8: 如何评估数据质量？

**A**: 查看质量评分：

```typescript
const report = await analyzer.analyze(excelData);

if (report.qualityScore >= 90) {
  console.log('数据质量优秀');
} else if (report.qualityScore >= 70) {
  console.log('数据质量良好');
} else if (report.qualityScore >= 50) {
  console.log('数据质量一般，需要改进');
} else {
  console.log('数据质量较差，急需清洗');
}
```

---

## 📝 示例项目

完整的使用示例请参考：
- `services/ai/USAGE_EXAMPLE.ts` - 详细的使用示例
- `services/ai/dataQualityAnalyzer.test.ts` - 单元测试示例

---

## 🔗 相关文档

- [实施文档](./DATA_QUALITY_IMPLEMENT.md) - 详细的实施说明
- [架构设计](../../docs/INTELLIGENT_DATA_PROCESSING_ARCHITECTURE.md) - 完整的架构设计
- [类型定义](../../types/dataQuality.ts) - TypeScript 类型定义

---

## 💡 最佳实践

1. **大数据集处理**: 使用采样分析提高性能
2. **自定义规则**: 根据业务需求添加特定规则
3. **缓存利用**: 启用缓存避免重复分析
4. **建议筛选**: 根据用户偏好筛选建议
5. **代码生成**: 使用 AI 生成的代码确保准确性

---

## 🆘 获取帮助

如有问题，请参考：
- GitHub Issues
- 项目文档
- 架构设计文档

---

**版本**: 1.0.0
**最后更新**: 2025-01-25
