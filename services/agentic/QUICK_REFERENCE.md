# 多步分析系统 - 快速参考

## 🚀 快速开始

```typescript
import { executeMultiStepAnalysis } from './services/agentic';

const result = await executeMultiStepAnalysis(
  '用户指令',
  dataFiles
);
```

## 📦 主要 API

### 执行函数
```typescript
// 基础执行
executeMultiStepAnalysis(prompt, files, config?)

// 带进度监控
executeMultiStepAnalysisWithProgress(prompt, files, callback, config?)
```

### 编排器类
```typescript
const orchestrator = new AgenticOrchestrator(config);

// 执行任务
await orchestrator.executeTask(prompt, files)

// 进度监控
orchestrator.updateProgress(callback)

// 获取状态
orchestrator.getTaskState()
orchestrator.getLogs()
orchestrator.getStatistics()

// 任务控制
orchestrator.cancelTask()
orchestrator.clearLogs()
```

## 🔧 配置模式

```typescript
// 默认
DEFAULT_ORCHESTRATOR_CONFIG

// 快速模式（简单任务）
FAST_MODE_CONFIG

// 高质量模式（复杂任务）
HIGH_QUALITY_MODE_CONFIG

// 调试模式
DEBUG_MODE_CONFIG
```

## 🛠️ 工具函数

```typescript
// 验证数据
validateDataFiles(files)

// 格式化
formatExecutionTime(ms)
formatQualityScore(score)

// 报告
getTaskSummary(result)
generateTaskReport(result)

// 辅助
createProgressLogger(prefix)
analyzeError(message)
estimateExecutionTime(files, rows, complexity)
```

## 📊 数据结构

```typescript
interface DataFileInfo {
  id: string;
  fileName: string;
  sheets: { [sheetName: string]: any[] };
  currentSheetName?: string;
  metadata?: { /* ... */ };
}

interface TaskResult {
  success: boolean;
  data?: { [fileName: string]: any[] };
  logs: string[];
  qualityReport?: QualityReport;
  executionSummary: { /* ... */ };
}
```

## 🎯 常见场景

```typescript
// 数据转换
await executeMultiStepAnalysis('转换日期格式', files)

// 数据计算
await executeMultiStepAnalysis('计算平均值', files)

// 数据分析
await executeMultiStepAnalysis('分析趋势', files)

// 数据验证
await executeMultiStepAnalysis('检查异常值', files)

// 审计分析
await executeMultiStepAnalysis('执行审计程序', files)
```

## 🔍 进度监控

```typescript
orchestrator.updateProgress((state) => {
  console.log(state.progress.percentage);
  console.log(state.progress.message);
  console.log(state.status);

  if (state.status === TaskStatus.REPAIRING) {
    console.log('正在修复...');
  }
});
```

## ❌ 错误处理

```typescript
try {
  const result = await orchestrator.executeTask(prompt, files);

  if (!result.success) {
    const logs = orchestrator.getLogs();
    logs.filter(l => l.level === 'error').forEach(log => {
      console.error(log.message);
    });
  }
} catch (error) {
  console.error('执行失败:', error);
}
```

## 📈 性能优化

```typescript
// 采样数据
const sampled = data.slice(0, 100);

// 快速模式
const result = await executeMultiStepAnalysis(
  prompt,
  sampled,
  FAST_MODE_CONFIG
);

// 并行处理
const results = await Promise.all([
  executeMultiStepAnalysis(prompt1, data1),
  executeMultiStepAnalysis(prompt2, data2)
]);
```

## 🧪 测试

```bash
# 运行测试
ts-node services/agentic/AgenticOrchestrator.test.ts

# 查看示例
ts-node services/agentic/example.ts

# 查看演示
ts-node services/agentic/demo.ts
```

## 📚 文档

- `README.md` - 用户文档
- `IMPLEMENTATION_GUIDE.md` - 实现指南
- `example.ts` - 使用示例
- `demo.ts` - 集成演示

## 💡 最佳实践

1. ✅ 提供清晰的数据列名
2. ✅ 编写具体的用户指令
3. ✅ 根据任务选择配置模式
4. ✅ 启用进度监控
5. ✅ 处理错误情况
6. ✅ 查看日志调试
7. ✅ 使用采样优化性能

## 🎨 示例代码

完整示例请参考：
- `services/agentic/example.ts` - 6 个基础示例
- `services/agentic/demo.ts` - 6 个集成演示

---

**版本**: 1.0.0 | **更新**: 2025-01-21
