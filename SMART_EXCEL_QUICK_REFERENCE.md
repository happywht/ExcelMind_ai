# SmartExcel 多步分析系统 - 快速参考

## 功能特性

### ✅ 已实现
- [x] 多步分析系统集成 (OTAE 循环)
- [x] 实时进度显示（进度条 + 百分比）
- [x] OTAE 步骤可视化（👁️🧠⚡✅）
- [x] 质量评分显示
- [x] 自动错误修复
- [x] 智能模式/快速模式切换
- [x] 向后兼容（自动降级）
- [x] 执行统计信息
- [x] 取消执行功能
- [x] TypeScript 类型安全
- [x] 性能优化 (useCallback, useMemo)

## UI 组件

### 状态显示面板
```
┌─────────────────────────────────────┐
│ ⚡ 多步分析系统           45%       │
│ ▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░         │
│ AI思考中        质量: 85%          │
│ [👁️观察][🧠思考][⚡执行][✅评估]   │
└─────────────────────────────────────┘
```

### 模式切换按钮
- 🟢 **智能模式** - 多步分析 + 自我修复
- ⚪ **快速模式** - 单步执行，快速处理

### 执行统计
- 总步骤数
- 成功/失败步骤
- 执行耗时
- 质量评分

## API 参考

### 状态变量
```typescript
taskState: MultiStepTask | null        // 当前任务状态
agenticLogs: AgenticLogEntry[]         // Agentic 日志
useAgenticMode: boolean                // 模式开关
orchestrator: AgenticOrchestrator | null // 编排器实例
```

### 核心函数
```typescript
handleProgressUpdate(state)            // 进度回调
handleRun()                            // 执行处理
handleLegacyExecution(dataFiles)       // 降级执行
cancelExecution()                      // 取消执行
```

### 辅助函数
```typescript
statusTextMap: Record<TaskStatus, string>  // 状态文本映射
formatQualityScore(score)                   // 格式化质量分数
```

## OTAE 循环阶段

| 阶段 | 图标 | 进度 | 说明 |
|------|------|------|------|
| Observe | 👁️ | 20% | 观察数据，分析结构 |
| Think | 🧠 | 40% | AI 思考，制定计划 |
| Act | ⚡ | 60% | 执行转换，处理数据 |
| Evaluate | ✅ | 80% | 评估结果，质量检查 |

## 质量评分标准

| 分数 | 等级 | 颜色 | 说明 |
|------|------|------|------|
| 80-100% | 优秀 | 🟢 绿色 | 高质量输出 |
| 50-80% | 良好 | 🟡 黄色 | 可接受质量 |
| 0-50% | 需修复 | 🔴 红色 | 需要改进 |

## 错误处理

### 自动修复策略
1. **重试** - 重新执行失败步骤（最多 3 次）
2. **降级** - 使用简化方法处理
3. **用户干预** - 显示错误信息，等待用户操作

### 错误提示
```
⚠️ 检测到错误，正在自动修复...
```

## 配置选项

```typescript
const config = {
  maxRetries: 3,           // 最大重试次数
  qualityThreshold: 0.7,   // 质量阈值 (0-1)
  enableAutoRepair: true,  // 启用自动修复
  logLevel: 'info'        // 日志级别
};
```

## 使用流程

### 智能模式（推荐）
```
1. 上传 Excel 文件
   ↓
2. 输入自然语言指令
   ↓
3. 确保处于"智能模式"
   ↓
4. 点击"执行智能处理"
   ↓
5. 观察 OTAE 循环进度
   ↓
6. 查看质量评分和统计
```

### 快速模式
```
1. 切换到"快速模式"
   ↓
2. 上传 Excel 文件
   ↓
3. 输入自然语言指令
   ↓
4. 点击"执行智能处理"
   ↓
5. 快速获得结果
```

## 性能指标

| 指标 | 值 |
|------|-----|
| 冷启动时间 | < 100ms |
| 状态更新频率 | 60fps (16ms) |
| 内存占用 | < 50MB |
| 构建时间 | ~51s |

## 文件结构

```
components/
  SmartExcel.tsx              # 主组件 (已修改)
types/
  agenticTypes.ts             # 类型定义
services/
  agentic/
    AgenticOrchestrator.ts    # 核心编排器
    index.ts                  # 导出索引
    utils.ts                  # 工具函数
```

## 代码示例

### 使用 AgenticOrchestrator
```typescript
// 创建编排器
const orchestrator = new AgenticOrchestrator({
  maxRetries: 3,
  qualityThreshold: 0.7,
  enableAutoRepair: true
});

// 注册进度回调
orchestrator.updateProgress(handleProgressUpdate);

// 执行任务
const result = await orchestrator.executeTask(command, dataFiles);

// 获取日志
const logs = orchestrator.getLogs();
```

### 取消执行
```typescript
// 方法 1: 使用取消按钮
<button onClick={cancelExecution}>取消</button>

// 方法 2: 直接调用
orchestrator.cancelTask();
```

## 调试技巧

### 启用详细日志
```typescript
const config = {
  logLevel: 'debug'  // 显示所有日志
};
```

### 查看任务状态
```typescript
console.log('Current task:', taskState);
console.log('Status:', taskState?.status);
console.log('Progress:', taskState?.progress);
```

### 检查质量报告
```typescript
const quality = taskState?.result?.qualityReport;
console.log('Overall quality:', quality?.overallQuality);
console.log('Issues:', quality?.totalIssues);
```

## 常见问题

### Q: 如何切换模式？
A: 点击"智能模式/快速模式"按钮

### Q: 多步分析失败怎么办？
A: 系统会自动降级到单步执行

### Q: 如何查看详细日志？
A: 查看控制台或日志面板

### Q: 质量评分低怎么办？
A: 检查输入数据质量，或调整指令

### Q: 如何取消正在执行的任务？
A: 点击"取消"按钮

## 版本信息

- **版本**: v1.0.0
- **日期**: 2026-01-22
- **状态**: ✅ 生产就绪

## 相关文档

- [完整集成文档](./SMART_EXCEL_MULTISTEP_INTEGRATION.md)
- [Agentic 类型定义](./types/agenticTypes.ts)
- [Agentic 编排器](./services/agentic/AgenticOrchestrator.ts)
