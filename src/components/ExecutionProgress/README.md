# 执行进度组件文档

## 概述

执行进度组件用于实时展示 AI �任务的执行状态，包括四阶段进度、详细日志和错误提示。

## 组件

### ExecutionProgressPanel

核心进度面板组件，展示执行任务的完整生命周期。

## 功能特性

### 1. 四阶段进度显示

```
侦察阶段 → 预审阶段 → 分析阶段 → 生成阶段
```

每个阶段显示：
- 阶段名称和描述
- 当前状态（等待/运行/完成/失败）
- 进度百分比
- 执行时长
- 详细信息列表
- 警告和错误信息

### 2. 实时日志

- 按时间倒序显示
- 日志级别区分（info/warning/error/success/debug）
- 日志来源标记
- 自动滚动到最新日志
- 日志详情弹窗

### 3. 交互功能

- 点击阶段卡片展开/折叠详情
- 点击日志条目查看详细信息
- 响应式设计，支持移动端

## Props 定义

```typescript
interface ExecutionProgressPanelProps {
  executionId: string;              // 执行任务ID
  showLogs?: boolean;               // 是否显示日志（默认 true）
  autoScroll?: boolean;             // 是否自动滚动（默认 true）
  maxLogEntries?: number;           // 最大日志条数（默认 100）
  compact?: boolean;                // 紧凑模式（默认 false）
  onStageClick?: (stage: ExecutionStage) => void;
  onLogEntryClick?: (log: LogEntry) => void;
}
```

## 使用示例

### 基础用法

```tsx
import { ExecutionProgressPanel } from './components/ExecutionProgress';

function App() {
  return (
    <ExecutionProgressPanel
      executionId="exec-123"
    />
  );
}
```

### 高级用法

```tsx
import { ExecutionProgressPanel } from './components/ExecutionProgress';

function App() {
  const handleStageClick = (stage) => {
    console.log('Stage clicked:', stage);
  };

  const handleLogClick = (log) => {
    console.log('Log clicked:', log);
  };

  return (
    <ExecutionProgressPanel
      executionId="exec-123"
      showLogs={true}
      autoScroll={true}
      maxLogEntries={200}
      compact={false}
      onStageClick={handleStageClick}
      onLogEntryClick={handleLogClick}
    />
  );
}
```

## 数据结构

### ExecutionContext

```typescript
interface ExecutionContext {
  executionId: string;
  stages: StageInfo[];
  logs: LogEntry[];
  currentStage?: ExecutionStage;
  totalProgress: number;
  status: ExecutionStatus;
  startTime?: number;
  endTime?: number;
  totalDuration?: number;
}
```

### StageInfo

```typescript
interface StageInfo {
  stage: ExecutionStage;
  name: string;
  description: string;
  status: ExecutionStatus;
  startTime?: number;
  endTime?: number;
  duration?: number;
  progress: number;
  details?: string[];
  errors?: string[];
  warnings?: string[];
}
```

### LogEntry

```typescript
interface LogEntry {
  id: string;
  timestamp: number;
  level: 'info' | 'warning' | 'error' | 'success' | 'debug';
  message: string;
  details?: string;
  source?: string;
  metadata?: Record<string, any>;
}
```

## 执行阶段

### 1. 侦察阶段 (Reconnaissance)

扫描文件结构，识别数据源。

**图标**: 🔍
**颜色**: 蓝色

**典型日志**:
- `开始扫描文件结构...`
- `已扫描 3 个 Sheet`
- `发现 15 个数据点`

### 2. 预审阶段 (Pre-Audit)

验证数据完整性和一致性。

**图标**: ✓
**颜色**: 紫色

**典型日志**:
- `开始预审数据...`
- `已验证 10 个引用`
- `检测到 2 个警告`

### 3. 分析阶段 (Analysis)

AI 智能分析数据并生成处理方案。

**图标**: 🧠
**颜色**: 绿色

**典型日志**:
- `AI 正在分析数据...`
- `已识别 5 个关键模式`
- `生成处理方案中...`

### 4. 生成阶段 (Generation)

根据分析结果生成输出文件。

**图标**: ⚡
**颜色**: 橙色

**典型日志**:
- `开始生成文档...`
- `已完成 5/10`
- `文档生成完成`

## 样式定制

### 阶段状态颜色

```css
/* 等待中 */
.stage-pending {
  @apply bg-slate-100 text-slate-700;
}

/* 运行中 */
.stage-running {
  @apply bg-blue-100 text-blue-700;
}

/* 已完成 */
.stage-completed {
  @apply bg-green-100 text-green-700;
}

/* 失败 */
.stage-failed {
  @apply bg-red-100 text-red-700;
}

/* 已暂停 */
.stage-paused {
  @apply bg-yellow-100 text-yellow-700;
}
```

### 日志级别颜色

```css
/* 信息 */
.log-info {
  @apply text-blue-600;
}

/* 警告 */
.log-warning {
  @apply text-yellow-600;
}

/* 错误 */
.log-error {
  @apply text-red-600;
}

/* 成功 */
.log-success {
  @apply text-green-600;
}

/* 调试 */
.log-debug {
  @apply text-gray-600;
}
```

## 集成后端服务

### WebSocket 集成

```tsx
import { useEffect, useState } from 'react';
import { ExecutionProgressPanel } from './components/ExecutionProgress';

function App() {
  const [context, setContext] = useState(null);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3000/execution');

    ws.onmessage = (event) => {
      const update = JSON.parse(event.data);
      // 更新执行上下文
      setContext(prev => ({
        ...prev,
        ...update,
      }));
    };

    return () => ws.close();
  }, []);

  return (
    <ExecutionProgressPanel
      executionId="exec-123"
      // 将 context 传入组件
    />
  );
}
```

### REST API 集成

```tsx
import { useEffect, useState } from 'react';
import { ExecutionProgressPanel } from './components/ExecutionProgress';

function App() {
  const [context, setContext] = useState(null);

  useEffect(() => {
    // 轮询执行状态
    const interval = setInterval(async () => {
      const response = await fetch(`/api/execution/exec-123`);
      const data = await response.json();
      setContext(data);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <ExecutionProgressPanel
      executionId="exec-123"
      // 将 context 传入组件
    />
  );
}
```

## 性能优化

### 1. 日志限制

设置 `maxLogEntries` 限制显示的日志条数：

```tsx
<ExecutionProgressPanel
  executionId="exec-123"
  maxLogEntries={100}
/>
```

### 2. 节流更新

使用节流减少频繁更新：

```tsx
import { throttle } from 'lodash';

const throttledUpdate = throttle((newContext) => {
  setContext(newContext);
}, 500);
```

### 3. 虚拟滚动

对于大量日志，考虑使用虚拟滚动：

```tsx
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={logs.length}
  itemSize={50}
>
  {({ index, style }) => (
    <div style={style}>
      <LogEntry log={logs[index]} />
    </div>
  )}
</FixedSizeList>
```

## 测试

### 单元测试

```tsx
import { render, screen } from '@testing-library/react';
import { ExecutionProgressPanel } from './ExecutionProgressPanel';

describe('ExecutionProgressPanel', () => {
  test('renders stages', () => {
    render(<ExecutionProgressPanel executionId="test" />);
    expect(screen.getByText('侦察阶段')).toBeInTheDocument();
  });

  test('renders logs', () => {
    render(<ExecutionProgressPanel executionId="test" showLogs />);
    expect(screen.getByText('实时日志')).toBeInTheDocument();
  });
});
```

## 故障排除

### 日志不更新

1. 检查 WebSocket 连接状态
2. 确认后端是否推送事件
3. 检查 executionId 是否正确

### 进度条不显示

1. 确认 context 数据已加载
2. 检查 stages 数组是否为空
3. 验证 progress 值是否在 0-100 范围内

### 阶段卡片无法展开

1. 检查 stage.details 是否有数据
2. 确认点击事件是否正确绑定
3. 检查 CSS 样式是否正确应用

## 更新日志

### v1.0.0 (2024-01-24)
- 初始版本发布
- 实现四阶段进度显示
- 实现实时日志
- 实现交互功能

## 许可证

MIT
