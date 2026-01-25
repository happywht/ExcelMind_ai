# Phase 2 前端实施文档

> **版本**: 2.0.0
> **更新日期**: 2026-01-25
> **状态**: 实施完成

## 目录

- [概述](#概述)
- [技术栈](#技术栈)
- [目录结构](#目录结构)
- [组件架构](#组件架构)
- [使用指南](#使用指南)
- [样式规范](#样式规范)
- [状态管理](#状态管理)
- [API集成](#api集成)
- [测试策略](#测试策略)

---

## 概述

Phase 2 前端实现了三个核心功能模块：

1. **数据质量分析模块** (`components/DataQuality/`)
   - 文件上传和质量分析
   - 问题可视化展示
   - AI清洗建议
   - 自动修复执行

2. **模板管理模块** (`components/TemplateManagement/`)
   - 模板上传和验证
   - 模板列表展示
   - 模板详情查看
   - 模板版本管理

3. **批量生成模块** (`components/BatchGeneration/`)
   - 批量任务创建
   - 实时进度追踪
   - 任务历史管理
   - WebSocket实时更新

---

## 技术栈

### 核心框架
- **React 19.2.3** - UI框架
- **TypeScript 5.8.2** - 类型安全
- **Vite 6.2.0** - 构建工具

### UI组件库
- **Tailwind CSS 4.1.18** - 样式框架
- **Lucide React 0.561.0** - 图标库
- **Recharts 3.6.0** - 图表库（可选）

### 工具库
- **clsx** - 条件类名
- **tailwind-merge** - 类名合并

---

## 目录结构

```
components/
├── DataQuality/              # 数据质量分析模块
│   ├── DataQualityDashboard.tsx    # 主仪表盘
│   ├── IssueList.tsx               # 问题列表
│   ├── RecommendationPanel.tsx     # 建议面板
│   ├── AutoFixDialog.tsx           # 自动修复对话框
│   ├── types.ts                    # 类型定义
│   └── index.ts                    # 导出索引
│
├── TemplateManagement/      # 模板管理模块
│   ├── TemplateList.tsx             # 模板列表
│   ├── TemplateEditor.tsx           # 模板编辑器（待实现）
│   ├── TemplatePreview.tsx          # 模板预览（待实现）
│   ├── VariableMapping.tsx          # 变量映射（待实现）
│   ├── TemplateUpload.tsx           # 模板上传（待实现）
│   ├── types.ts                     # 类型定义
│   └── index.ts                     # 导出索引
│
├── BatchGeneration/         # 批量生成模块
│   ├── BatchTaskCreator.tsx         # 任务创建器
│   ├── TaskProgress.tsx              # 任务进度
│   ├── TaskList.tsx                 # 任务列表
│   ├── TaskDetails.tsx              # 任务详情（待实现）
│   ├── BatchConfigForm.tsx          # 配置表单（已集成）
│   └── types.ts                     # 类型定义
│
└── Shared/                   # 共享组件
    ├── QualityGauge.tsx             # 质量评分仪表盘
    ├── IssueBadge.tsx               # 问题等级徽章
    ├── ProgressBar.tsx              # 进度条
    ├── StatusIndicator.tsx          # 状态指示器
    └── index.ts                     # 导出索引

api/
├── dataQualityAPI.ts        # 数据质量API
├── templateAPI.ts           # 模板管理API
├── batchGenerationAPI.ts    # 批量生成API
├── config.ts                # API配置
└── index.ts                 # 导出索引

utils/
└── cn.ts                    # Tailwind类名工具
```

---

## 组件架构

### 1. 数据质量分析模块

#### DataQualityDashboard (主仪表盘)

**功能**:
- 文件拖拽上传
- 质量分析执行
- 分析结果展示
- 快速操作入口

**Props**: 无特殊props

**状态**:
- `analysis: DataQualityAnalysis | null` - 分析结果
- `suggestions: CleaningSuggestion[]` - 清洗建议
- `progress: AnalysisProgress | null` - 分析进度

**示例**:
```tsx
import { DataQualityDashboard } from './components/DataQuality';

function App() {
  return (
    <div className="p-6">
      <DataQualityDashboard />
    </div>
  );
}
```

#### IssueList (问题列表)

**功能**:
- 按严重程度分组显示
- 问题详情展开/折叠
- 位置和影响比例展示

**Props**:
```typescript
interface IssueListProps {
  issues: DataQualityIssue[];
  className?: string;
}
```

#### RecommendationPanel (建议面板)

**功能**:
- AI清洗建议展示
- 批量选择操作
- 预览效果显示
- 一键应用修复

**Props**:
```typescript
interface RecommendationPanelProps {
  suggestions: CleaningSuggestion[];
  onApply: (actions: CleaningAction[]) => void;
  className?: string;
}
```

#### AutoFixDialog (自动修复对话框)

**功能**:
- 修复操作确认
- 预计时间显示
- 重要提示展示

**Props**:
```typescript
interface AutoFixDialogProps {
  suggestions: CleaningSuggestion[];
  onApply: (actions: CleaningAction[]) => void;
  onClose: () => void;
}
```

### 2. 模板管理模块

#### TemplateList (模板列表)

**功能**:
- 模板网格展示
- 搜索和筛选
- 快速操作菜单
- 模板详情查看

**Props**:
```typescript
interface TemplateListProps {
  onSelectTemplate: (templateId: string) => void;
  className?: string;
}
```

**示例**:
```tsx
import { TemplateList } from './components/TemplateManagement';

function TemplateManagement() {
  const handleSelectTemplate = (templateId: string) => {
    console.log('Selected template:', templateId);
  };

  return <TemplateList onSelectTemplate={handleSelectTemplate} />;
}
```

### 3. 批量生成模块

#### BatchTaskCreator (任务创建器)

**功能**:
- 三步创建流程
- 模板选择
- 数据源选择
- 配置选项

**Props**:
```typescript
interface BatchTaskCreatorProps {
  onTaskCreated: (taskId: string) => void;
  className?: string;
}
```

**使用示例**:
```tsx
import { BatchTaskCreator } from './components/BatchGeneration';

function BatchGeneration() {
  const handleTaskCreated = (taskId: string) => {
    console.log('Task created:', taskId);
    // 导航到任务详情页
  };

  return <BatchTaskCreator onTaskCreated={handleTaskCreated} />;
}
```

#### TaskProgress (任务进度)

**功能**:
- 实时进度显示
- WebSocket更新
- 任务控制（暂停/恢复/取消）
- 批量下载

**Props**:
```typescript
interface TaskProgressProps {
  taskId: string;
  onComplete?: () => void;
  className?: string;
}
```

#### TaskList (任务列表)

**功能**:
- 历史任务展示
- 状态筛选
- 搜索功能
- 快速操作

**Props**:
```typescript
interface TaskListProps {
  onSelectTask?: (taskId: string) => void;
  className?: string;
}
```

### 4. 共享组件

#### QualityGauge (质量评分仪表盘)

显示圆形质量评分仪表盘。

**Props**:
```typescript
interface QualityGaugeProps {
  score: number;              // 0-100
  size?: number;              // 默认120
  strokeWidth?: number;       // 默认8
  showLabel?: boolean;        // 默认true
  className?: string;
}
```

**示例**:
```tsx
<QualityGauge score={85} size={160} showLabel />
```

#### IssueBadge (问题等级徽章)

显示问题严重程度徽章。

**Props**:
```typescript
interface IssueBadgeProps {
  severity: 'critical' | 'high' | 'medium' | 'low';
  count?: number;
  showIcon?: boolean;
  className?: string;
}
```

**示例**:
```tsx
<IssueBadge severity="high" count={5} />
```

#### ProgressBar (进度条)

通用进度条组件。

**Props**:
```typescript
interface ProgressBarProps {
  progress: number;           // 0-100
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'green' | 'orange' | 'red';
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
  className?: string;
}
```

**示例**:
```tsx
<ProgressBar progress={65} size="lg" color="blue" showLabel label="处理中..." />
```

#### StatusIndicator (状态指示器)

显示任务状态的指示器。

**Props**:
```typescript
interface StatusIndicatorProps {
  status: 'loading' | 'success' | 'error' | 'pending' | 'paused' | 'warning';
  text?: string;
  size?: number;
  className?: string;
}
```

**示例**:
```tsx
<StatusIndicator status="loading" text="加载中..." size={20} />
```

---

## 使用指南

### 集成到现有应用

1. **更新侧边栏导航**

在 `components/Sidebar.tsx` 中添加Phase 2功能入口：

```typescript
const menuItems = [
  // ... 现有菜单项
  { id: AppView.DATA_QUALITY, label: '数据质量', icon: Shield },
  { id: AppView.TEMPLATE_MANAGE, label: '模板管理', icon: FileText },
  { id: AppView.BATCH_GENERATION, label: '批量生成', icon: Layers },
];
```

2. **在App.tsx中添加路由**

```typescript
import { DataQualityDashboard } from './components/DataQuality';
import { TemplateList } from './components/TemplateManagement';
import { BatchTaskCreator, TaskList } from './components/BatchGeneration';

// 在路由配置中
case AppView.DATA_QUALITY:
  return <DataQualityDashboard />;

case AppView.TEMPLATE_MANAGE:
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">模板管理</h1>
      <TemplateList onSelectTemplate={(id) => console.log(id)} />
    </div>
  );

case AppView.BATCH_GENERATION:
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">批量生成</h1>
      <BatchTaskCreator onTaskCreated={(id) => console.log(id)} />
      <TaskList />
    </div>
  );
```

### API配置

创建环境变量文件 `.env`:

```bash
VITE_API_BASE_URL=http://localhost:3000/api/v2
VITE_WS_BASE_URL=ws://localhost:3000/stream
```

### 依赖安装

```bash
# 安装新增的依赖
pnpm install clsx tailwind-merge
```

---

## 样式规范

### 颜色系统

```css
/* 主色调 */
--emerald-500: #10b981;   /* 主色 */
--emerald-600: #059669;   /* 深色 */

/* 语义色 */
--red-500: #ef4444;       /* 错误/严重 */
--orange-500: #f97316;    /* 警告/高 */
--yellow-500: #eab308;    /* 中等 */
--blue-500: #3b82f6;      /* 信息/低 */
--green-500: #22c55e;     /* 成功 */

/* 中性色 */
--slate-50: #f8fafc;
--slate-100: #f1f5f9;
--slate-200: #e2e8f0;
--slate-500: #64748b;
--slate-600: #475569;
--slate-700: #334155;
--slate-800: #1e293b;
--slate-900: #0f172a;
```

### 间距系统

```css
/* Tailwind 默认间距 */
--spacing-1: 0.25rem;  /* 4px */
--spacing-2: 0.5rem;   /* 8px */
--spacing-3: 0.75rem;  /* 12px */
--spacing-4: 1rem;     /* 16px */
--spacing-6: 1.5rem;   /* 24px */
--spacing-8: 2rem;     /* 32px */
```

### 圆角

```css
--radius-lg: 0.5rem;    /* 8px */
--radius-xl: 0.75rem;   /* 12px */
--radius-2xl: 1rem;     /* 16px */
--radius-full: 9999px;
```

### 阴影

```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
```

---

## 状态管理

### 本地状态管理

使用React Hooks管理组件内部状态：

```typescript
const [state, setState] = useState<Type>(initialValue);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
```

### 状态提升

对于需要跨组件共享的状态，使用状态提升模式：

```typescript
// 父组件
const Parent = () => {
  const [taskId, setTaskId] = useState<string | null>(null);

  return (
    <>
      <BatchTaskCreator onTaskCreated={setTaskId} />
      {taskId && <TaskProgress taskId={taskId} />}
    </>
  );
};
```

### Context API（可选）

对于更复杂的状态管理，可以使用React Context：

```typescript
// 创建Context
const TaskContext = createContext<TaskContextValue | null>(null);

// 提供Context
<TaskContext.Provider value={{ taskId, setTaskId }}>
  {children}
</TaskContext.Provider>

// 消费Context
const { taskId, setTaskId } = useContext(TaskContext);
```

---

## API集成

### API客户端使用

所有API调用通过统一的API客户端：

```typescript
import { dataQualityAPI } from './api/dataQualityAPI';

// 分析数据质量
const analysis = await dataQualityAPI.analyzeData(fileId, sheetName);

// 获取清洗建议
const suggestions = await dataQualityAPI.getSuggestions(analysisId);

// 执行清洗
const result = await dataQualityAPI.executeCleaning(analysisId, actions);
```

### 错误处理

统一的错误处理模式：

```typescript
const handleOperation = async () => {
  try {
    setLoading(true);
    const result = await apiCall();
    // 处理成功
  } catch (error) {
    console.error('操作失败:', error);
    setError(error instanceof Error ? error.message : '未知错误');
    // 显示错误提示
  } finally {
    setLoading(false);
  }
};
```

### 请求拦截（可选）

可以添加请求拦截器来统一处理认证、超时等：

```typescript
class APIBase {
  protected async request(url: string, options?: RequestInit) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
}
```

---

## 测试策略

### 单元测试

使用Jest和React Testing Library：

```typescript
// DataQualityDashboard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { DataQualityDashboard } from './DataQualityDashboard';

describe('DataQualityDashboard', () => {
  it('renders upload area initially', () => {
    render(<DataQualityDashboard />);
    expect(screen.getByText('上传Excel文件进行质量分析')).toBeInTheDocument();
  });

  it('handles file upload', async () => {
    render(<DataQualityDashboard />);
    const file = new File(['content'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    // ... 测试逻辑
  });
});
```

### 集成测试

测试组件间的交互：

```typescript
describe('Batch Generation Flow', () => {
  it('creates task and shows progress', async () => {
    const { getByText, findByText } = render(<BatchGeneration />);

    // 创建任务
    fireEvent.click(getByText('创建任务'));

    // 等待进度显示
    expect(await findByText('任务进度')).toBeInTheDocument();
  });
});
```

### E2E测试

使用Playwright进行端到端测试：

```typescript
// e2e/data-quality.spec.ts
import { test, expect } from '@playwright/test';

test('data quality analysis flow', async ({ page }) => {
  await page.goto('/data-quality');

  // 上传文件
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('test-files/sample.xlsx');

  // 等待分析完成
  await expect(page.locator('text=分析完成')).toBeVisible();

  // 检查质量评分
  await expect(page.locator('text=85')).toBeVisible();
});
```

---

## 性能优化

### 代码分割

使用React.lazy进行路由级别的代码分割：

```typescript
const DataQualityDashboard = React.lazy(() =>
  import('./components/DataQuality').then(m => ({ default: m.DataQualityDashboard }))
);

// 使用Suspense包裹
<Suspense fallback={<Loading />}>
  <DataQualityDashboard />
</Suspense>
```

### 虚拟滚动

对于长列表，考虑使用虚拟滚动：

```typescript
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={items.length}
  itemSize={80}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      {items[index].name}
    </div>
  )}
</FixedSizeList>
```

### 防抖和节流

对于频繁触发的事件，使用防抖和节流：

```typescript
import { debounce } from 'lodash-es';

const handleSearch = debounce((value: string) => {
  // 搜索逻辑
}, 300);
```

---

## 可访问性

### ARIA标签

确保所有交互元素都有适当的ARIA标签：

```tsx
<button
  aria-label="关闭对话框"
  onClick={onClose}
>
  <X className="w-5 h-5" />
</button>
```

### 键盘导航

支持键盘操作：

```tsx
<div
  role="button"
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }}
  onClick={handleClick}
>
  可点击区域
</div>
```

### 焦点管理

对话框打开时管理焦点：

```tsx
useEffect(() => {
  if (isOpen) {
    const focusableElements = dialogRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements?.[0] as HTMLElement;
    firstElement?.focus();
  }
}, [isOpen]);
```

---

## 浏览器兼容性

### 目标浏览器

- Chrome/Edge: 最新两个版本
- Firefox: 最新两个版本
- Safari: 最新两个版本

### Polyfills

如果需要支持旧浏览器，添加polyfills：

```typescript
// main.tsx
import 'core-js/stable';
import 'regenerator-runtime/runtime';
```

---

## 下一步开发

### 待实现组件

1. **模板管理模块**
   - `TemplateEditor.tsx` - 模板编辑器
   - `TemplatePreview.tsx` - 模板预览
   - `VariableMapping.tsx` - 变量映射编辑器
   - `TemplateUpload.tsx` - 拖拽上传组件

2. **批量生成模块**
   - `TaskDetails.tsx` - 任务详情页
   - `BatchConfigForm.tsx` - 高级配置表单

3. **高级功能**
   - 数据质量趋势图表
   - 任务对比功能
   - 批量操作优化

### 性能优化

- [ ] 实现虚拟滚动
- [ ] 添加请求缓存
- [ ] 优化大文件上传
- [ ] 实现增量更新

### 测试覆盖

- [ ] 单元测试覆盖率 > 80%
- [ ] 集成测试关键流程
- [ ] E2E测试主要用户路径

---

## 文档参考

- [API规范](../docs/API_SPECIFICATION_PHASE2.md)
- [数据质量架构](../docs/INTELLIGENT_DATA_PROCESSING_ARCHITECTURE.md)
- [批量生成架构](../docs/BATCH_TEMPLATE_GENERATION_ARCHITECTURE.md)
- [Tailwind CSS文档](https://tailwindcss.com/docs)
- [React文档](https://react.dev/)

---

**文档版本**: 2.0.0
**最后更新**: 2026-01-25
**维护者**: ExcelMind AI Frontend Team
