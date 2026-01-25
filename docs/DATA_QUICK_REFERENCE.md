# 智能数据处理增强 - 快速参考指南

## 概述

智能数据处理增强模块通过AI驱动的数据分析、清洗建议生成和自动化执行，为用户提供强大的数据预处理能力。

## 核心文件位置

### 架构文档
- `docs/INTELLIGENT_DATA_PROCESSING_ARCHITECTURE.md` - 完整架构设计文档
- `docs/DATA_QUICK_REFERENCE.md` - 本快速参考指南

### 类型定义
- `types/dataQuality.ts` - 完整的TypeScript类型定义

### 服务层 (待实施)
- `services/dataQuality/dataQualityAnalyzer.ts` - 数据质量分析器
- `services/dataQuality/cleaningSuggestionEngine.ts` - 清洗建议引擎
- `services/dataQuality/dataCleaner.ts` - 数据清洗执行器
- `services/dataQuality/cleaningHistoryManager.ts` - 清洗历史管理器
- `services/dataQuality/detectors/` - 检测器目录
- `services/dataQuality/strategies/` - 策略库目录

### API层 (待实施)
- `api/controllers/dataQualityController.ts` - API控制器
- `api/routes/dataQualityRoutes.ts` - API路由

### UI组件 (待实施)
- `components/DataQuality/` - 数据质量面板组件目录

## 核心API端点

### 1. 分析数据质量
```
POST /api/v1/data-quality/analyze
```

**请求示例**:
```json
{
  "file": "<base64_encoded_file>",
  "fileName": "sales_data.xlsx",
  "sheetName": "Sheet1",
  "options": {
    "detectMissing": true,
    "detectOutliers": true,
    "detectDuplicates": true,
    "detectFormat": true
  }
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "reportId": "dq_report_1737820800000_abc123",
    "qualityScore": 72,
    "issues": [
      {
        "issueId": "issue_001",
        "issueType": "missing_value",
        "severity": "high",
        "affectedColumns": ["email", "phone"],
        "affectedRowCount": 234,
        "affectedPercentage": 4.68
      }
    ]
  }
}
```

### 2. 生成清洗建议
```
POST /api/v1/data-quality/suggestions
```

**请求示例**:
```json
{
  "reportId": "dq_report_1737820800000_abc123",
  "options": {
    "maxSuggestions": 3,
    "explainReasoning": true
  }
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "suggestionId": "sugg_001",
        "strategy": {
          "name": "使用平均值填充",
          "type": "fill",
          "parameters": {
            "targetColumn": "amount",
            "operation": "fill_mean"
          },
          "executionCode": "import pandas as pd\n..."
        },
        "priority": 0.92,
        "reasoning": "该列的数据分布相对均匀...",
        "expectedImpact": {
          "dataRetentionRate": 1.0,
          "qualityImprovement": 15
        },
        "riskLevel": "low"
      }
    ]
  }
}
```

### 3. 执行数据清洗
```
POST /api/v1/data-quality/clean
```

**请求示例**:
```json
{
  "fileData": {
    "fileName": "sales_data.xlsx",
    "data": [...]
  },
  "strategies": [
    {
      "strategyId": "strat_fill_mean",
      "parameters": {
        "targetColumn": "amount",
        "operation": "fill_mean"
      }
    }
  ],
  "options": {
    "validateAfterExecution": true,
    "saveToHistory": true
  }
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "operationId": "op_1737820800000_def456",
    "cleanedData": [...],
    "executionReport": {
      "status": "success",
      "duration": 523,
      "processedRows": 5000,
      "successRows": 5000,
      "failedRows": 0
    },
    "newQualityScore": 87,
    "qualityImprovement": 15
  }
}
```

### 4. 获取清洗历史
```
GET /api/v1/data-quality/history?fileName=sales_data.xlsx&limit=20
```

### 5. 撤销清洗操作
```
POST /api/v1/data-quality/undo
```

**请求示例**:
```json
{
  "operationId": "op_1737820800000_def456",
  "restoreToSnapshot": true
}
```

## 核心类型

### DataQualityReport
```typescript
interface DataQualityReport {
  reportId: string;
  fileName: string;
  sheetName: string;
  totalRows: number;
  totalColumns: number;
  timestamp: number;
  qualityScore: number;        // 0-100
  issues: DataQualityIssue[];
  columnStats: ColumnStatistics[];
  dataSample?: any[];
}
```

### DataQualityIssue
```typescript
interface DataQualityIssue {
  issueId: string;
  issueType: DataQualityIssueType;
  severity: 'critical' | 'high' | 'medium' | 'low';
  affectedColumns: string[];
  affectedRows: number[];
  description: string;
  statistics: IssueStatistics;
}
```

### CleaningSuggestion
```typescript
interface CleaningSuggestion {
  suggestionId: string;
  issueId: string;
  strategy: CleaningStrategy;
  priority: number;              // 0-1
  reasoning: string;             // AI生成的解释
  expectedImpact: ImpactAssessment;
  riskLevel: 'low' | 'medium' | 'high';
  executionEstimate: ExecutionEstimate;
}
```

### CleaningStrategy
```typescript
interface CleaningStrategy {
  strategyId: string;
  name: string;
  type: StrategyType;
  description: string;
  parameters: StrategyParameters;
  executionCode?: string;        // Python代码
}
```

## 数据质量检测器

### 1. 缺失值检测器
- 检测空值、null、undefined
- 统计每列的缺失值数量和比例
- 识别缺失模式

### 2. 异常值检测器
- IQR (四分位距) 方法
- Z-Score 方法
- 孤立森林 (Isolation Forest) 方法
- 自定义阈值

### 3. 重复行检测器
- 完全重复检测
- 部分重复检测
- 主键重复检测

### 4. 格式一致性检测器
- 日期格式一致性
- 数字格式一致性
- 文本模式一致性
- 数据类型验证

## 清洗策略库

### 删除策略
- 删除包含缺失值的行
- 删除异常值
- 删除重复行

### 填充策略
- 均值填充
- 中位数填充
- 众数填充
- 前向/后向填充
- 插值填充
- AI预测填充

### 替换策略
- 基于规则替换
- 基于模式替换
- 正则表达式替换

### 标准化策略
- 大小写标准化
- 日期格式标准化
- 数字格式标准化
- 单位转换

### 转换策略
- 数据类型转换
- 数据格式转换
- 自定义函数转换

## 实施优先级

### Phase 1: 核心检测器 (2周)
- [ ] MissingValueDetector
- [ ] OutlierDetector (IQR方法)
- [ ] DuplicateDetector
- [ ] FormatConsistencyDetector
- [ ] DataQualityAnalyzer

### Phase 2: AI建议引擎 (2周)
- [ ] StrategyLibrary
- [ ] CleaningSuggestionEngine
- [ ] CodeGenerator
- [ ] AI提示词优化

### Phase 3: 清洗执行器 (1周)
- [ ] DataCleaner
- [ ] Python代码执行集成
- [ ] 结果验证

### Phase 4: 历史管理 (1周)
- [ ] CleaningHistoryManager
- [ ] 撤销功能
- [ ] 统计分析

### Phase 5: UI组件 (2周)
- [ ] DataQualityPanel
- [ ] IssueViewer
- [ ] SuggestionViewer
- [ ] CleaningProgress
- [ ] HistoryViewer

### Phase 6: API端点 (1周)
- [ ] 数据质量API
- [ ] 建议生成API
- [ ] 清洗执行API
- [ ] 历史管理API

### Phase 7: 测试与优化 (1周)
- [ ] 单元测试
- [ ] 集成测试
- [ ] 性能优化
- [ ] 文档完善

## 与现有系统集成

### 使用现有AI服务
```typescript
import { chatWithKnowledgeBase } from '../services/zhipuService';

const response = await chatWithKnowledgeBase(
  prompt,
  [],
  context
);
```

### 使用现有Excel服务
```typescript
import { readExcelFile, exportToExcel } from '../services/excelService';

const data = await readExcelFile(file);
exportToExcel(cleanedData, 'cleaned.xlsx');
```

### 使用现有类型系统
```typescript
import { ExcelData } from '../types';
import { DataQualityReport } from '../types/dataQuality';
```

## 性能优化建议

### 1. 采样分析
- 对于大文件 (>10,000行)，使用采样分析
- 默认采样大小: 1,000-5,000行
- 支持多种采样方法

### 2. 并行处理
- 检测器并行执行
- 多个策略并行生成
- 批量处理数据

### 3. 缓存策略
- 分析结果缓存 (30分钟TTL)
- AI响应缓存 (1小时TTL)
- 策略模板缓存

### 4. 增量处理
- 只分析变化的部分
- 增量更新统计信息
- 智能缓存失效

## 安全考虑

### 1. 输入验证
- 文件大小限制 (50MB)
- 文件类型白名单
- 参数范围验证

### 2. 代码执行安全
- 静态代码检查
- 沙箱执行环境
- 超时限制 (30秒)
- 内存限制 (100MB)

### 3. 数据隐私
- 不保存敏感数据快照
- 历史记录脱敏
- 加密存储

## 测试策略

### 单元测试
- 每个检测器的测试
- 每个策略的测试
- AI响应解析测试
- 边界条件测试

### 集成测试
- 完整分析流程测试
- 建议生成流程测试
- 清洗执行流程测试
- 撤销操作测试

### 性能测试
- 大文件处理性能
- 并发处理能力
- 缓存效果验证
- 内存使用监控

## 常见问题

### Q: 如何添加自定义检测器?
A: 实现 `DataQualityDetector` 接口并注册到 `DataQualityAnalyzer`。

### Q: 如何添加自定义清洗策略?
A: 使用 `StrategyLibrary.registerStrategy()` 注册新策略。

### Q: AI建议的质量如何保证?
A: 使用Few-Shot提示词、输出验证和人工反馈机制。

### Q: 如何处理超大文件?
A: 系统自动使用采样分析，支持流式处理和增量分析。

### Q: 清洗操作可以撤销吗?
A: 是的，通过 `CleaningHistoryManager` 可以撤销任意历史操作。

## 技术栈

- **语言**: TypeScript
- **AI服务**: 智谱AI (glm-4.6)
- **数据处理**: pandas (Python)
- **代码执行**: Web Worker + Python IPC
- **存储**: IndexedDB
- **缓存**: Memory + LocalStorage
- **UI**: React + TailwindCSS

## 相关文档

- [完整架构设计](./INTELLIGENT_DATA_PROCESSING_ARCHITECTURE.md)
- [系统架构总览](./ARCHITECTURE.md)
- [API规范](../API_SPECIFICATION.md)
- [类型定义](../types/dataQuality.ts)

## 联系方式

如有问题或建议，请联系架构团队。
