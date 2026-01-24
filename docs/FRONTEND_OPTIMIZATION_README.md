# ExcelMind AI 前端优化组件文档

本文档介绍基于 `EXCEL_MIND_COMPREHENSIVE_EVALUATION.md` 实施的前端优化组件。

## 目录

- [概述](#概述)
- [组件列表](#组件列表)
- [快速开始](#快速开始)
- [组件详解](#组件详解)
- [类型定义](#类型定义)
- [工具函数](#工具函数)
- [使用示例](#使用示例)
- [后端接口需求](#后端接口需求)

---

## 概述

本次前端优化实施了以下四个核心功能模块：

1. **审计轨迹报告** - 记录和展示 AI 操作历史
2. **实时执行可视化** - 展示 AI 执行过程的实时状态
3. **错误自愈 UI** - 展示 AI 自动修复错误的进度
4. **智能验证系统** - 验证 AI 生成结果的质量

所有组件遵循以下设计原则：
- ✅ 使用 Tailwind CSS 进行样式设计
- ✅ 支持 Electron 和浏览器环境
- ✅ 响应式布局，适配不同屏幕
- ✅ 遵循 KISS 原则，代码简洁易维护
- ✅ TypeScript 完整类型支持
- ✅ 深色/浅色主题支持

---

## 组件列表

### UI 组件

| 组件 | 文件路径 | 功能 |
|------|---------|------|
| `AuditTrailReport` | `components/ExecutionVisualizer/AuditTrailReport.tsx` | 审计轨迹报告展示 |
| `ExecutionVisualizer` | `components/ExecutionVisualizer/ExecutionVisualizer.tsx` | 实时执行可视化 |
| `ErrorSelfHealingUI` | `components/ExecutionVisualizer/ErrorSelfHealingUI.tsx` | 错误自愈 UI |
| `ValidationResultUI` | `components/ExecutionVisualizer/ValidationResultUI.tsx` | 智能验证结果展示 |

### 工具函数

| 工具 | 文件路径 | 功能 |
|------|---------|------|
| `AuditTrailLogger` | `utils/auditTrailLogger.ts` | 审计日志记录和报告生成 |
| `validateResult` | `utils/resultValidator.ts` | 结果验证 |
| `FileFerryService` | `utils/fileFerry.ts` | 文件摆渡机制（前端部分） |

### 类型定义

| 文件 | 描述 |
|------|------|
| `types/auditTrailTypes.ts` | 审计轨迹相关类型 |
| `types/executionTypes.ts` | 执行可视化相关类型 |
| `types/validationTypes.ts` | 验证系统相关类型 |

---

## 快速开始

### 安装依赖

确保项目已安装以下依赖：

```bash
npm install lucide-react
# 或
pnpm add lucide-react
```

### 导入组件

```typescript
import {
  AuditTrailReport,
  ExecutionVisualizer,
  ErrorSelfHealingUI,
  ValidationResultUI
} from '@/components/ExecutionVisualizer';

import {
  AuditTrailLogger,
  validateResult,
  FileFerryService
} from '@/utils';
```

### 基础使用

```typescript
// 1. 创建审计日志器
const logger = new AuditTrailLogger('task-id');

// 2. 记录操作
logger.log('代码生成', { model: 'glm-4.6' }, 'success');

// 3. 验证结果
const result = await validateResult(executionResult, metadata);

// 4. 展示组件
<AuditTrailReport report={logger.generateReport()} />
<ValidationResultUI result={result} />
```

---

## 组件详解

### 1. AuditTrailReport（审计轨迹报告）

**功能**：展示完整的 AI 操作历史，包括成功、失败、警告等状态。

**Props**：

```typescript
interface AuditTrailReportProps {
  report: AuditTrailReport;        // 审计报告数据
  onExport?: (format: 'txt' | 'json') => void;  // 导出回调
  expanded?: boolean;              // 默认展开
  showDetails?: boolean;           // 显示详情
  compact?: boolean;               // 紧凑模式
  className?: string;              // 自定义类名
}
```

**使用示例**：

```typescript
const logger = new AuditTrailLogger('my-task');

logger.log('文件上传', { fileName: 'data.xlsx', size: 1024 }, 'success');
logger.log('代码生成', { tokens: 1500 }, 'success');
logger.log('代码执行', { error: 'KeyError' }, 'error');

const report = logger.generateReport();

<AuditTrailReport
  report={report}
  onExport={(format) => console.log('导出格式:', format)}
  expanded={true}
/>
```

### 2. ExecutionVisualizer（实时执行可视化）

**功能**：实时展示 AI 执行的各个步骤，包括观察、思考、执行、评估等阶段。

**Props**：

```typescript
interface ExecutionVisualizerProps {
  steps: ExecutionStep[];          // 执行步骤列表
  state: ExecutionState;           // 执行状态
  showCode?: boolean;              // 显示代码
  showResult?: boolean;            // 显示结果
  compact?: boolean;               // 紧凑模式
  theme?: 'light' | 'dark';        // 主题
}
```

**使用示例**：

```typescript
const [steps, setSteps] = useState<ExecutionStep[]>([]);
const [state, setState] = useState<ExecutionState>({
  currentStepId: null,
  totalSteps: 0,
  completedSteps: 0,
  percentage: 0,
  isRunning: false,
  isCompleted: false,
  isFailed: false,
  startTime: Date.now()
});

<ExecutionVisualizer
  steps={steps}
  state={state}
  showCode={true}
  showResult={true}
/>
```

### 3. ErrorSelfHealingUI（错误自愈 UI）

**功能**：展示 AI 自动修复错误的进度，包括重试次数、修复策略等。

**Props**：

```typescript
interface ErrorSelfHealingProps {
  retryCount: number;              // 当前重试次数
  maxRetries: number;              // 最大重试次数
  currentError?: string;           // 当前错误信息
  isRetrying: boolean;             // 是否正在重试
  lastError?: string;              // 上一次错误
  repairStrategy?: string;         // 修复策略描述
  onManualRetry?: () => void;      // 手动重试回调
  onCancel?: () => void;           // 取消回调
  className?: string;              // 自定义类名
}
```

**使用示例**：

```typescript
<ErrorSelfHealingUI
  retryCount={retryCount}
  maxRetries={3}
  currentError="KeyError: 'column_not_found'"
  isRetrying={isRetrying}
  repairStrategy="AI 正在重新分析列名..."
  onManualRetry={() => handleRetry()}
  onCancel={() => handleCancel()}
/>
```

**紧凑版本**：

```typescript
import { ErrorSelfHealingCompact } from '@/components/ExecutionVisualizer';

<ErrorSelfHealingCompact
  retryCount={1}
  maxRetries={3}
  isRetrying={true}
/>
```

### 4. ValidationResultUI（智能验证结果）

**功能**：展示 AI 执行结果的验证信息，包括得分、警告、指标等。

**Props**：

```typescript
interface ValidationResultUIProps {
  result: ValidationResult;        // 验证结果
  onApplyFix?: (warningCode: string) => void;  // 应用修复
  onIgnore?: (warningCode: string) => void;    // 忽略警告
  compact?: boolean;               // 紧凑模式
  showScore?: boolean;             // 显示得分
  className?: string;              // 自定义类名
}
```

**使用示例**：

```typescript
const result = await validateResult(executionResult, metadata);

<ValidationResultUI
  result={result}
  onApplyFix={(code) => console.log('修复:', code)}
  onIgnore={(code) => console.log('忽略:', code)}
/>
```

---

## 类型定义

### AuditTrailEntry

```typescript
interface AuditTrailEntry {
  id: string;
  timestamp: string;
  action: string;
  details: {
    inputFile?: string;
    outputFile?: string;
    operation?: string;
    rowsProcessed?: number;
    executionTime?: number;
    code?: string;
    errorMessage?: string;
    [key: string]: any;
  };
  status: 'success' | 'warning' | 'error' | 'pending';
  errorMessage?: string;
  stepNumber?: number;
}
```

### ExecutionStep

```typescript
interface ExecutionStep {
  id: string;
  type: 'observe' | 'think' | 'act' | 'evaluate' | 'repair' | 'complete';
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  title: string;
  description: string;
  code?: string;
  result?: any;
  error?: string;
  startTime?: number;
  endTime?: number;
  duration?: number;
  metadata?: { [key: string]: any };
}
```

### ValidationResult

```typescript
interface ValidationResult {
  valid: boolean;
  warnings: ValidationWarning[];
  score: number;  // 0-100
  metrics: {
    rowCount?: number;
    columnCount?: number;
    numericSummary?: {
      sum?: number;
      min?: number;
      max?: number;
      avg?: number;
    };
    dataQuality?: {
      missingValues: number;
      duplicateRows: number;
      inconsistentTypes: number;
    };
  };
}
```

---

## 工具函数

### AuditTrailLogger

```typescript
const logger = new AuditTrailLogger(taskId?);

// 记录事件
logger.log(action, details, status);

// 生成报告
const report = logger.generateReport();

// 清空日志
logger.clear();

// 获取所有条目
const entries = logger.getEntries();
```

### validateResult

```typescript
// 完整验证
const result = await validateResult(
  executionResult,
  metadata,
  config?,  // 可选配置
  options?  // 可选选项
);

// 快速验证
const { valid, issues } = quickValidate(result);
```

### FileFerryService

```typescript
// 创建服务
const ferry = new FileFerryService(pyodideInstance?);

// 初始化文件系统
await ferry.initFileSystem();

// 挂载文件
const result = await ferry.mountFile(file, targetPath, {
  onProgress: (progress) => console.log(progress),
  onLog: (message) => console.log(message),
  validateFile: true
});

// 读取文件
const blob = await ferry.retrieveFile(sourcePath, options);

// 清理临时文件
await ferry.cleanupTempFiles();
```

---

## 使用示例

### 完整的执行流程示例

参考 `components/ExecutionVisualizer/ExecutionVisualizer.example.tsx` 获取完整示例。

```typescript
import { ExcelMindExecutionFlow } from '@/components/ExecutionVisualizer/ExecutionVisualizer.example';

function App() {
  return <ExcelMindExecutionFlow />;
}
```

### 集成到现有组件

```typescript
import React, { useState } from 'react';
import { ExecutionVisualizer, ErrorSelfHealingUI, ValidationResultUI } from '@/components/ExecutionVisualizer';
import { AuditTrailLogger, validateResult } from '@/utils';

export const MyExcelProcessor: React.FC = () => {
  const [steps, setSteps] = useState([]);
  const [state, setState] = useState({ isRunning: false, isCompleted: false });
  const [logger] = useState(() => new AuditTrailLogger());

  const processExcel = async (file: File) => {
    // 1. 记录文件上传
    logger.log('文件上传', { fileName: file.name, size: file.size }, 'success');

    // 2. 执行 AI 处理
    // ...

    // 3. 验证结果
    const validation = await validateResult(result, metadata);

    // 4. 生成报告
    const report = logger.generateReport();
  };

  return (
    <div>
      <ExecutionVisualizer steps={steps} state={state} />
      <ValidationResultUI result={validation} />
    </div>
  );
};
```

---

## 后端接口需求

以下是前端组件依赖的后端接口（TODO）：

### 1. Pyodide 初始化服务

**接口**：`POST /api/pyodide/init`

**功能**：初始化 Pyodide 环境

**响应**：
```json
{
  "success": true,
  "pyodideReady": true
}
```

### 2. 代码执行接口

**接口**：`POST /api/execute`

**请求**：
```json
{
  "code": "import pandas as pd\n...",
  "datasets": {},
  "timeout": 30000
}
```

**响应**：
```json
{
  "success": true,
  "data": { "output.xlsx": [...] },
  "executionTime": 1500
}
```

### 3. 文件验证接口

**接口**：`POST /api/validate-file`

**请求**：
```json
{
  "fileName": "data.xlsx",
  "fileSize": 1024000
}
```

**响应**：
```json
{
  "valid": true,
  "metadata": {
    "sheetNames": ["Sheet1"],
    "rowCount": 100,
    "columnCount": 5
  }
}
```

### 4. AI 分析接口

**接口**：`POST /api/ai/analyze`

**请求**：
```json
{
  "query": "计算总和",
  "metadata": {...}
}
```

**响应**：
```json
{
  "success": true,
  "code": "import pandas as pd\n...",
  "reasoning": "..."
}
```

### 5. 错误修复接口

**接口**：`POST /api/ai/repair`

**请求**：
```json
{
  "originalCode": "...",
  "error": "KeyError: 'column'",
  "context": {...}
}
```

**响应**：
```json
{
  "success": true,
  "repairedCode": "...",
  "strategy": "..."
}
```

---

## 样式规范

所有组件使用 Tailwind CSS，遵循以下规范：

- **颜色**：
  - 主色：`blue-600` / `violet-600`
  - 成功：`emerald-600`
  - 警告：`amber-600`
  - 错误：`red-600`
  - 信息：`blue-600`

- **间距**：
  - 小：`p-2`, `gap-2`
  - 中：`p-4`, `gap-3`
  - 大：`p-6`, `gap-4`

- **圆角**：
  - 小：`rounded`
  - 中：`rounded-lg`
  - 大：`rounded-xl`

- **阴影**：
  - 浮层：`shadow-sm`
  - 卡片：`shadow-md`
  - 模态：`shadow-lg`

---

## 注意事项

### Electron 环境适配

所有组件已针对 Electron 环境进行优化：

- 使用 `window.open` 替代直接链接
- 文件下载使用 Electron API
- 本地存储使用 `localStorage` 或 Electron 的 `ipcRenderer`

### 性能优化

- 使用 `React.memo` 优化组件渲染
- 大列表使用虚拟滚动（如需要）
- 防抖和节流用户输入

### 可访问性

- 所有按钮和链接都有适当的 `title` 属性
- 使用语义化 HTML
- 支持键盘导航

---

## 开发指南

### 添加新组件

1. 在 `components/ExecutionVisualizer/` 目录创建新组件
2. 使用 TypeScript 定义 Props 接口
3. 使用 Tailwind CSS 进行样式设计
4. 在 `index.ts` 中导出组件

### 添加新类型

1. 在 `types/` 目录创建新的类型文件
2. 导出所有类型定义
3. 在 `types/index.ts` 中统一导出

### 测试

```bash
# 运行单元测试
npm test

# 运行示例
npm run dev
```

---

## 常见问题

### Q: 如何自定义组件样式？

A: 所有组件都支持 `className` prop，可以传递自定义类名：

```typescript
<AuditTrailReport report={report} className="my-custom-class" />
```

### Q: 如何集成到现有项目？

A: 按照以下步骤：

1. 复制组件文件到项目
2. 安装依赖 `lucide-react`
3. 导入并使用组件
4. 根据需要调整样式

### Q: FileFerryService 需要 Pyodide 吗？

A: 是的，FileFerryService 依赖 Pyodide。在使用前需要：

1. 初始化 Pyodide
2. 调用 `setPyodideInstance()` 设置实例
3. 初始化虚拟文件系统

---

## 贡献

欢迎提交 Issue 和 Pull Request！

---

## 许可证

MIT License

---

**文档版本**：v1.0
**最后更新**：2025-01-24
