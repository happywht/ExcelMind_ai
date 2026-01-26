# 状态管理快速开始指南

## 📦 安装依赖

依赖已安装：
- ✅ zustand@5.0.10
- ✅ @tanstack/react-query@5.90.20
- ✅ @tanstack/react-query-devtools@5.91.2

## 🚀 快速开始

### 1. 在应用根组件中集成

```typescript
// App.tsx 或 main.tsx
import { QueryProvider } from './stores';
import { useAutoSync } from './hooks';

function App() {
  // 启用WebSocket自动同步
  useAutoSync();

  return (
    <QueryProvider>
      {/* 你的应用组件 */}
    </QueryProvider>
  );
}
```

### 2. 在组件中使用

```typescript
import {
  useTasks,
  useTaskStats,
  useTaskActions,
  useUIStore,
  useUIActions
} from './stores';

function MyComponent() {
  // 获取任务列表（自动过滤和排序）
  const tasks = useTasks();

  // 获取任务统计
  const stats = useTaskStats();

  // 获取操作方法
  const { updateTask, removeTask } = useTaskActions();

  // UI操作
  const { showSuccess, showError } = useUIActions();

  // 使用...
}
```

## 📚 文档索引

### 核心文档
- **实施报告**: `/docs/STATE_MANAGEMENT_IMPLEMENTATION_REPORT.md`
- **迁移指南**: `/docs/STATE_MIGRATION_GUIDE.md`

### 示例代码
- **TaskList V2**: `/components/BatchGeneration/TaskList.v2.tsx`

### 测试和演示
- **单元测试**: `/tests/stores/taskStore.test.ts`
- **演示脚本**: `/scripts/demo-state-management.ts`

## 🔑 核心API

### Task Store

```typescript
// 获取过滤后的任务列表
const tasks = useTasks();

// 获取任务统计
const stats = useTaskStats();

// 获取操作方法
const {
  addTask,
  updateTask,
  removeTask,
  setFilters,
  syncFromWebSocket
} = useTaskActions();
```

### UI Store

```typescript
// 显示通知
const { showSuccess, showError } = useUIActions();

// 管理加载状态
const { setLoading, isLoading } = useUIActions();

// 管理模态框
const { openModal, closeModal } = useUIActions();

// 管理主题
const { setTheme, toggleTheme } = useUIActions();
```

### WebSocket同步

```typescript
// 自动同步（推荐）
import { useAutoSync } from './hooks';

const { isConnected, reconnect } = useAutoSync();

// 手动控制
import { useWebSocketSync } from './hooks';

const { isConnected, reconnect, disconnect } = useWebSocketSync({
  wsUrl: 'ws://localhost:3001',
  autoReconnect: true
});
```

## 💡 常见用例

### 1. 显示任务列表

```typescript
function TaskList() {
  const tasks = useTasks();
  const stats = useTaskStats();

  return (
    <div>
      <p>总计: {stats.total}</p>
      {tasks.map(task => (
        <TaskItem key={task.id} task={task} />
      ))}
    </div>
  );
}
```

### 2. 更新任务状态

```typescript
function TaskActions({ taskId }) {
  const { updateTask } = useTaskActions();
  const { showSuccess, showError } = useUIActions();

  const handleUpdate = async () => {
    try {
      await api.updateTask(taskId, { status: 'completed' });
      updateTask(taskId, { status: 'completed' });
      showSuccess('成功', '任务已完成');
    } catch (error) {
      showError('失败', '无法更新任务');
    }
  };

  return <button onClick={handleUpdate}>完成任务</button>;
}
```

### 3. 过滤和搜索

```typescript
function TaskFilters() {
  const filters = useTaskFilters();
  const { setFilters } = useTaskActions();

  return (
    <input
      value={filters.search}
      onChange={(e) => setFilters({ search: e.target.value })}
      placeholder="搜索任务..."
    />
  );
}
```

### 4. 批量操作

```typescript
function BatchActions() {
  const selectedIds = useSelectedTaskIds();
  const { selectAllTasks, deleteSelected } = useTaskActions();

  return (
    <>
      <button onClick={selectAllTasks}>全选</button>
      <button onClick={deleteSelected}>
        删除选中 ({selectedIds.length})
      </button>
    </>
  );
}
```

## 🎯 性能优化技巧

### 1. 选择性订阅

```typescript
// ✅ 好：只订阅需要的切片
const tasks = useTasks();
const filters = useTaskFilters();

// ❌ 不好：订阅整个store
const store = useTaskStore();
```

### 2. 使用计算属性

```typescript
// Store中已经内置了过滤和排序
const tasks = useTasks(); // 已经过滤和排序

// 不需要组件内部再处理
```

### 3. 批量更新

```typescript
// ✅ 好：批量添加
const { addTasks } = useTaskActions();
addTasks(taskArray);

// ❌ 不好：多次单独添加
tasks.forEach(task => addTask(task));
```

## 🧪 测试

运行单元测试：
```bash
pnpm test tests/stores/taskStore.test.ts
```

运行演示脚本：
```bash
npx ts-node scripts/demo-state-management.ts
```

## 🔧 开发工具

### Zustand DevTools
开发模式下自动启用，可以在浏览器DevTools中查看状态变化。

### React Query DevTools
开发模式下自动启用，可以查看查询状态和缓存。

## 📖 更多信息

查看完整文档：
- [迁移指南](../docs/STATE_MIGRATION_GUIDE.md)
- [实施报告](../docs/STATE_MANAGEMENT_IMPLEMENTATION_REPORT.md)

## 🆘 需要帮助？

1. 查看迁移指南中的常见问题
2. 参考示例组件实现
3. 运行测试验证功能
4. 查看演示脚本了解用法

---

**版本**: 2.0.0
**最后更新**: 2026-01-25
**状态**: ✅ 已完成
