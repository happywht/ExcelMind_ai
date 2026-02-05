# 多步分析和自我修复系统

## 概述

这是一个基于 **Observe-Think-Act-Evaluate (OTAE)** 循环的智能任务编排系统，专为复杂数据分析场景设计。系统具备自动错误检测和修复能力，能够处理数据转换、计算、分析等复杂任务。

## 核心特性

### 1. 智能任务编排
- **Observe（观察）**: 深度分析数据结构、质量、模式
- **Think（思考）**: 基于AI生成最优执行计划
- **Act（执行）**: 自动生成并执行数据处理代码
- **Evaluate（评估）**: 全方位质量评估和验证

### 2. 自动错误修复
- 错误分类和根因分析
- 智能修复策略选择
- 自动重试和降级处理
- 用户干预建议

### 3. 质量保证
- 多维度质量评估
- 完整性、准确性、一致性检查
- 可配置的质量阈值
- 优化建议生成

### 4. 灵活配置
- 多种预设模式（快速、高质量、调试）
- 可扩展的错误处理策略
- 详细的日志记录
- 进度回调支持

## 快速开始

### 安装依赖

```bash
# 无需额外依赖，使用现有服务
npm install
```

### 基础使用

```typescript
import { executeMultiStepAnalysis } from './services/agentic';

// 准备数据
const dataFiles = [
  {
    id: 'file-1',
    fileName: 'sales.xlsx',
    sheets: {
      'Sheet1': [
        { product: 'A', amount: 100 },
        { product: 'B', amount: 200 }
      ]
    },
    currentSheetName: 'Sheet1'
  }
];

// 执行分析
const result = await executeMultiStepAnalysis(
  '计算总销售额',
  dataFiles
);

console.log('结果:', result.data);
```

### 带进度监控

```typescript
import {
  executeMultiStepAnalysisWithProgress,
  createProgressLogger
} from './services/agentic';

const progressLogger = createProgressLogger('[分析进度] ');

const result = await executeMultiStepAnalysisWithProgress(
  '分析销售数据',
  dataFiles,
  progressLogger
);
```

### 高级用法

```typescript
import { AgenticOrchestrator } from './services/agentic';

const orchestrator = new AgenticOrchestrator({
  maxRetries: 5,
  timeoutPerStep: 60000,
  qualityThreshold: 0.9,
  enableAutoRepair: true,
  logLevel: 'debug'
});

orchestrator.updateProgress((state) => {
  console.log(`${state.progress.percentage}% - ${state.progress.message}`);
});

const result = await orchestrator.executeTask(
  '复杂的分析任务',
  dataFiles
);
```

## 配置选项

### OrchestratorConfig

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `maxRetries` | number | 3 | 最大重试次数 |
| `timeoutPerStep` | number | 30000 | 每步超时时间（毫秒） |
| `totalTimeout` | number | 300000 | 总超时时间（毫秒） |
| `qualityThreshold` | number | 0.8 | 质量阈值（0-1） |
| `enableAutoRepair` | boolean | true | 是否启用自动修复 |
| `enableCaching` | boolean | true | 是否启用缓存 |
| `logLevel` | string | 'info' | 日志级别 |
| `aiModel` | string | 'glm-4.6' | AI模型 |
| `maxTokens` | number | 4096 | 最大token数 |

### 预设模式

```typescript
import {
  FAST_MODE_CONFIG,
  HIGH_QUALITY_MODE_CONFIG,
  DEBUG_MODE_CONFIG
} from './services/agentic/config';

// 快速模式 - 适合简单任务
const orchestrator = new AgenticOrchestrator(FAST_MODE_CONFIG);

// 高质量模式 - 适合复杂任务
const orchestrator = new AgenticOrchestrator(HIGH_QUALITY_MODE_CONFIG);

// 调试模式 - 开发调试用
const orchestrator = new AgenticOrchestrator(DEBUG_MODE_CONFIG);
```

## API 参考

### executeMultiStepAnalysis

执行多步分析的便捷函数。

```typescript
async function executeMultiStepAnalysis(
  userPrompt: string,
  dataFiles: DataFileInfo[],
  config?: Partial<OrchestratorConfig>
): Promise<TaskResult>
```

**参数：**
- `userPrompt`: 用户的自然语言指令
- `dataFiles`: 数据文件列表
- `config`: 可选配置

**返回：**
- `TaskResult`: 任务执行结果

### AgenticOrchestrator

核心编排器类。

```typescript
class AgenticOrchestrator {
  constructor(config?: Partial<OrchestratorConfig>)

  async executeTask(
    userPrompt: string,
    dataFiles: DataFileInfo[]
  ): Promise<TaskResult>

  updateProgress(callback: ProgressCallback): void

  getTaskState(): MultiStepTask | null

  cancelTask(): void

  getLogs(): LogEntry[]

  clearLogs(): void

  getStatistics(): Statistics
}
```

### 工具函数

```typescript
// 验证数据文件
validateDataFiles(files: DataFileInfo[]): { valid: boolean; errors: string[] }

// 格式化执行时间
formatExecutionTime(milliseconds: number): string

// 格式化质量分数
formatQualityScore(score: number): string

// 判断任务是否成功
isTaskSuccessful(result: TaskResult): boolean

// 获取任务摘要
getTaskSummary(result: TaskResult): object

// 生成任务报告
generateTaskReport(result: TaskResult): string

// 创建进度日志器
createProgressLogger(prefix?: string): (state: any) => void

// 错误分析
analyzeError(errorMessage: string): { category: string; suggestion: string }

// 估算执行时间
estimateExecutionTime(
  fileCount: number,
  dataRowCount: number,
  complexity?: number
): number
```

## 数据结构

### DataFileInfo

```typescript
interface DataFileInfo {
  id: string;
  fileName: string;
  sheets?: { [sheetName: string]: any[] };
  currentSheetName?: string;
  metadata?: {
    [sheetName: string]: {
      comments?: { [cellAddress: string]: string };
      notes?: { [cellAddress: string]: string };
      rowCount?: number;
      columnCount?: number;
    };
  };
}
```

### TaskResult

```typescript
interface TaskResult {
  success: boolean;
  data?: { [fileName: string]: any[] };
  outputFiles?: string[];
  logs: string[];
  qualityReport?: QualityReport;
  executionSummary: {
    totalSteps: number;
    successfulSteps: number;
    failedSteps: number;
    retriedSteps: number;
    totalTime: number;
    averageStepTime: number;
  };
  metadata: {
    completedAt: number;
    sessionId: string;
    taskId: string;
  };
}
```

## 工作流程

### OTAE 循环

```
┌─────────────────────────────────────────────────────────┐
│                    用户提交任务                           │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  1. OBSERVE（观察）                                      │
│  - 分析数据结构                                         │
│  - 检测数据质量                                         │
│  - 识别模式和异常                                       │
│  - 提取元数据                                           │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  2. THINK（思考）                                        │
│  - 理解用户意图                                         │
│  - 分析观察结果                                         │
│  - 制定执行计划                                         │
│  - 识别潜在风险                                         │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  3. ACT（执行）                                          │
│  - 获取处理代码（AI生成）                                │
│  - 执行代码                                             │
│  - 收集结果                                             │
│  - 处理错误                                             │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  4. EVALUATE（评估）                                     │
│  - 验证输出数据                                         │
│  - 检查数据质量                                         │
│  - 生成质量报告                                         │
│  - 提供优化建议                                         │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
                    质量达标？
                         │
            ┌────────────┴────────────┐
            │                         │
           Yes                       No
            │                         │
            ▼                         ▼
       任务完成              自动修复/重试
                                    │
                                    └──► 返回评估阶段
```

### 错误处理流程

```
错误发生
   │
   ▼
分析错误类型
   │
   ├─ 可重试错误 → 自动重试
   ├─ 可修复错误 → 应用修复策略
   └─ 严重错误   → 请求用户干预
```

## 错误分类

| 类别 | 说明 | 可重试 | 严重程度 |
|------|------|--------|----------|
| `VALIDATION_ERROR` | 输入验证失败 | 否 | 中 |
| `COLUMN_NOT_FOUND` | 列未找到 | 否 | 中 |
| `AI_SERVICE_ERROR` | AI服务错误 | 是 | 高 |
| `CODE_EXECUTION_ERROR` | 代码执行错误 | 是 | 严重 |
| `NETWORK_ERROR` | 网络错误 | 是 | 中 |
| `TIMEOUT_ERROR` | 超时 | 是 | 中 |

## 使用场景

### 1. 数据转换
```typescript
const result = await executeMultiStepAnalysis(
  '将所有日期格式转换为 YYYY-MM-DD',
  dataFiles
);
```

### 2. 数据计算
```typescript
const result = await executeMultiStepAnalysis(
  '计算每个部门的平均薪资，并找出薪资最高的部门',
  dataFiles
);
```

### 3. 数据分析
```typescript
const result = await executeMultiStepAnalysis(
  '分析销售趋势，找出增长最快的产品类别',
  dataFiles
);
```

### 4. 数据验证
```typescript
const result = await executeMultiStepAnalysis(
  '检查所有交易记录，找出金额异常的交易',
  dataFiles
);
```

### 5. 审计分析
```typescript
const result = await executeMultiStepAnalysis(
  '执行审计程序：识别大额交易、检查审批流程、标记异常记录',
  dataFiles
);
```

## 最佳实践

### 1. 数据准备
- 确保数据格式正确
- 提供清晰的列名
- 包含必要的元数据（注释、标注）

### 2. 指令编写
- 使用清晰、具体的语言
- 明确说明期望的输出
- 提供上下文信息

### 3. 配置选择
- 简单任务使用快速模式
- 复杂任务使用高质量模式
- 开发调试使用调试模式

### 4. 错误处理
- 启用自动修复
- 监控进度和日志
- 提供降级策略

### 5. 性能优化
- 限制数据量（采样）
- 使用缓存
- 合理设置超时

## 文件结构

```
services/agentic/
├── index.ts           # 导出索引
├── config.ts          # 配置文件
├── utils.ts           # 工具函数
├── example.ts         # 使用示例
└── README.md          # 本文档

types/
└── agenticTypes.ts    # 类型定义
```

## 依赖关系

- `services/zhipuService.ts` - AI服务调用
- `services/excelService.ts` - 代码执行
- `config/samplingConfig.ts` - 采样配置

## 扩展开发

### 添加新的修复策略

在 `AgenticOrchestrator.ts` 中的 `applyRepairStrategy` 方法中添加：

```typescript
case 'my_custom_strategy':
  return this.applyMyCustomStrategy(error);
```

### 自定义质量评估

继承 `AgenticOrchestrator` 并重写 `assessOutputQuality` 方法：

```typescript
class CustomOrchestrator extends AgenticOrchestrator {
  protected assessOutputQuality(output: any) {
    // 自定义质量评估逻辑
  }
}
```

### 添加新的AI提供商

修改 `callAIService` 方法以支持不同的AI提供商。

## 故障排除

### 问题：任务执行失败
- 检查数据格式是否正确
- 查看日志了解具体错误
- 尝试降低质量阈值
- 增加重试次数

### 问题：执行超时
- 增加 `timeoutPerStep` 配置
- 检查数据量是否过大
- 使用采样减少数据量

### 问题：质量评分低
- 检查用户指令是否清晰
- 提供更多上下文信息
- 使用高质量模式

### 问题：AI调用失败
- 检查API密钥配置
- 验证网络连接
- 查看AI服务状态

## 性能指标

- **平均执行时间**: 5-30秒（取决于数据量和复杂度）
- **内存占用**: < 100MB
- **成功率**: > 90%（在正常使用情况下）
- **自动修复成功率**: > 70%

## 许可证

MIT

## 贡献

欢迎提交问题和拉取请求！

## 更新日志

### v1.0.0 (2025-01-21)
- 初始版本
- 实现 OTAE 循环
- 支持自动错误修复
- 质量评估系统
- 进度监控
- 详细的日志记录
