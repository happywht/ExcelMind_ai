# Phase 2 前端组件 - 快速入门指南

> **版本**: 2.0.0
> **更新日期**: 2026-01-25

## 安装依赖

```bash
pnpm install clsx tailwind-merge
```

## 环境配置

创建 `.env` 文件：

```bash
VITE_API_BASE_URL=http://localhost:3000/api/v2
VITE_WS_BASE_URL=ws://localhost:3000/stream
```

## 快速使用

### 1. 数据质量分析

```tsx
import { DataQualityDashboard } from './components/DataQuality';

export default function App() {
  return (
    <div className="p-6">
      <DataQualityDashboard />
    </div>
  );
}
```

### 2. 模板管理

```tsx
import { TemplateList } from './components/TemplateManagement';

export default function TemplateManagement() {
  const handleSelect = (templateId: string) => {
    console.log('Selected template:', templateId);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">模板管理</h1>
      <TemplateList onSelectTemplate={handleSelect} />
    </div>
  );
}
```

### 3. 批量生成

```tsx
import { BatchTaskCreator, TaskList } from './components/BatchGeneration';
import { useState } from 'react';

export default function BatchGeneration() {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">批量文档生成</h1>

      {!activeTaskId ? (
        <BatchTaskCreator onTaskCreated={setActiveTaskId} />
      ) : (
        <TaskProgress taskId={activeTaskId} onComplete={() => setActiveTaskId(null)} />
      )}

      <TaskList onSelectTask={setActiveTaskId} />
    </div>
  );
}
```

### 4. 使用共享组件

```tsx
import { QualityGauge, IssueBadge, ProgressBar, StatusIndicator } from './components/Shared';

export default function SharedComponentsDemo() {
  return (
    <div className="p-6 space-y-6">
      {/* 质量评分仪表盘 */}
      <QualityGauge score={85} size={160} />

      {/* 问题徽章 */}
      <IssueBadge severity="high" count={5} />

      {/* 进度条 */}
      <ProgressBar progress={65} size="lg" color="blue" showLabel />

      {/* 状态指示器 */}
      <StatusIndicator status="loading" text="加载中..." />
    </div>
  );
}
```

## API调用示例

### 数据质量API

```typescript
import { dataQualityAPI } from './api/dataQualityAPI';

// 分析数据质量
const analysis = await dataQualityAPI.analyzeData(fileId, sheetName, {
  checkMissingValues: true,
  checkDuplicates: true,
  checkFormats: true,
  checkOutliers: true,
});

// 获取清洗建议
const suggestions = await dataQualityAPI.getSuggestions(analysis.analysisId);

// 执行清洗
const result = await dataQualityAPI.executeCleaning(analysis.analysisId, [
  { suggestionId: 'sugg_001', action: 'auto_fix' },
  { suggestionId: 'sugg_002', action: 'manual', manualValue: '待补充' },
]);
```

### 模板管理API

```typescript
import { templateAPI } from './api/templateAPI';

// 上传模板
const uploaded = await templateAPI.uploadTemplate(file, {
  name: '销售合同模板',
  description: '用于生成销售合同',
  category: '合同',
  tags: ['销售', '合同'],
});

// 获取模板列表
const templates = await templateAPI.listTemplates({
  category: '合同',
  page: 1,
  pageSize: 20,
});

// 下载模板
const blob = await templateAPI.downloadTemplate(templateId);
```

### 批量生成API

```typescript
import { batchGenerationAPI } from './api/batchGenerationAPI';

// 创建任务
const task = await batchGenerationAPI.createTask({
  dataSourceId: 'ds_001',
  templateIds: ['tpl_001', 'tpl_002'],
  outputFormat: 'docx',
  options: {
    batchSize: 100,
    parallelProcessing: true,
    createZip: true,
  },
});

// 获取任务进度
const progress = await batchGenerationAPI.getTaskProgress(task.taskId);

// 下载ZIP
const zip = await batchGenerationAPI.downloadZip(task.taskId);
```

## 组件Props参考

### DataQualityDashboard

```typescript
interface DataQualityDashboardProps {
  className?: string;
}
```

### IssueList

```typescript
interface IssueListProps {
  issues: DataQualityIssue[];
  className?: string;
}
```

### RecommendationPanel

```typescript
interface RecommendationPanelProps {
  suggestions: CleaningSuggestion[];
  onApply: (actions: CleaningAction[]) => void;
  className?: string;
}
```

### AutoFixDialog

```typescript
interface AutoFixDialogProps {
  suggestions: CleaningSuggestion[];
  onApply: (actions: CleaningAction[]) => void;
  onClose: () => void;
}
```

### TemplateList

```typescript
interface TemplateListProps {
  onSelectTemplate: (templateId: string) => void;
  className?: string;
}
```

### BatchTaskCreator

```typescript
interface BatchTaskCreatorProps {
  onTaskCreated: (taskId: string) => void;
  className?: string;
}
```

### TaskProgress

```typescript
interface TaskProgressProps {
  taskId: string;
  onComplete?: () => void;
  className?: string;
}
```

### TaskList

```typescript
interface TaskListProps {
  onSelectTask?: (taskId: string) => void;
  className?: string;
}
```

## 样式自定义

所有组件都支持 `className` prop用于自定义样式：

```tsx
<DataQualityDashboard className="custom-class" />
```

## 错误处理

组件内部有完整的错误处理，但你也可以在外部捕获：

```tsx
import { DataQualityDashboard } from './components/DataQuality';

export default function App() {
  const handleError = (error: Error) => {
    console.error('发生错误:', error);
    // 显示错误提示
  };

  return (
    <ErrorBoundary fallback={<div>出错了</div>}>
      <DataQualityDashboard />
    </ErrorBoundary>
  );
}
```

## WebSocket连接

TaskProgress组件会自动建立WebSocket连接：

```tsx
<TaskProgress
  taskId="task_123"
  onComplete={() => console.log('完成')}
/>
```

## 类型导入

所有类型都可以从各模块的 `types.ts` 文件导入：

```typescript
import type { DataQualityAnalysis, CleaningSuggestion } from './components/DataQuality/types';
import type { TemplateConfig, TemplateMetadata } from './components/TemplateManagement/types';
import type { TaskProgress, WebSocketEvent } from './components/BatchGeneration/types';
```

## 完整示例

```tsx
import { useState } from 'react';
import { DataQualityDashboard } from './components/DataQuality';
import { TemplateList } from './components/TemplateManagement';
import { BatchTaskCreator, TaskList } from './components/BatchGeneration';
import { AppView } from './types';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 侧边栏导航 */}
      <Sidebar currentView={currentView} setView={setCurrentView} />

      {/* 主内容区 */}
      <main className="ml-64 p-6">
        {currentView === AppView.DATA_QUALITY && <DataQualityDashboard />}
        {currentView === AppView.TEMPLATE_MANAGE && (
          <TemplateList onSelectTemplate={(id) => console.log(id)} />
        )}
        {currentView === AppView.BATCH_GENERATION && (
          <>
            <BatchTaskCreator onTaskCreated={(id) => console.log(id)} />
            <TaskList />
          </>
        )}
      </main>
    </div>
  );
}
```

## 故障排除

### 问题1: 导入错误

确保所有导入路径正确：

```tsx
// ✅ 正确
import { DataQualityDashboard } from './components/DataQuality';

// ❌ 错误
import { DataQualityDashboard } from './components/DataQuality/DataQualityDashboard';
```

### 问题2: 样式不生效

确保Tailwind CSS已正确配置：

```js
// tailwind.config.js
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // ...
}
```

### 问题3: WebSocket连接失败

检查环境变量配置：

```bash
# .env
VITE_WS_BASE_URL=ws://localhost:3000/stream
```

## 下一步

- 阅读 [完整实施文档](./PHASE2_FRONTEND_IMPLEMENTATION.md)
- 查看 [API规范](../docs/API_SPECIFICATION_PHASE2.md)
- 了解 [架构设计](../docs/INTELLIGENT_DATA_PROCESSING_ARCHITECTURE.md)

## 支持

如有问题，请查看项目文档或联系开发团队。
