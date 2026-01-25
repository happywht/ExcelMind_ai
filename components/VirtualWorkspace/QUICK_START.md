# 前端工作区 UI 快速使用指南

## 安装完成

恭喜！前端工作区 UI 组件已成功安装到项目中。

## 组件位置

```
components/
├── VirtualWorkspace/          # 虚拟工作区组件
│   ├── VirtualFileBrowser.tsx    # 文件浏览器
│   ├── RelationshipGraph.tsx     # 关系图谱
│   ├── WorkspaceRecovery.tsx     # 工作区恢复
│   ├── VirtualWorkspace.tsx      # 主工作区（整合所有功能）
│   ├── FileCard.tsx              # 文件卡片
│   ├── FileTree.tsx              # 文件树
│   ├── types.ts                  # 类型定义
│   ├── utils.ts                  # 工具函数
│   ├── index.ts                  # 导出文件
│   └── README.md                 # 详细文档
│
└── ExecutionProgress/          # 执行进度组件
    ├── ExecutionProgressPanel.tsx  # 进度面板
    ├── index.ts                    # 导出文件
    └── README.md                   # 详细文档
```

## 快速开始

### 方式 1: 使用完整工作区

```tsx
import { VirtualWorkspace } from './components/VirtualWorkspace';

function App() {
  return (
    <div style={{ height: '100vh' }}>
      <VirtualWorkspace workspaceId="my-workspace" />
    </div>
  );
}
```

### 方式 2: 单独使用各个组件

#### 文件浏览器

```tsx
import { VirtualFileBrowser } from './components/VirtualWorkspace';

function FileManager() {
  return (
    <VirtualFileBrowser
      workspaceId="my-workspace"
      onFileUpload={async (files) => {
        // 处理文件上传
        console.log('Uploading files:', files);
      }}
      onFileDelete={async (fileId) => {
        // 处理文件删除
        console.log('Deleting file:', fileId);
      }}
      selectable
      multiSelect
      dragAndDrop
    />
  );
}
```

#### 关系图谱

```tsx
import { RelationshipGraph } from './components/VirtualWorkspace';

function GraphView() {
  return (
    <RelationshipGraph
      layout="hierarchical"
      onNodeClick={(node) => {
        console.log('Node clicked:', node);
      }}
    />
  );
}
```

#### 执行进度

```tsx
import { ExecutionProgressPanel } from './components/ExecutionProgress';

function ProgressView() {
  return (
    <ExecutionProgressPanel
      executionId="exec-123"
      showLogs
      autoScroll
    />
  );
}
```

#### 工作区恢复

```tsx
import { WorkspaceRecovery } from './components/VirtualWorkspace';

function RecoveryView() {
  return (
    <WorkspaceRecovery
      maxSessions={20}
      onRestore={async (sessionId) => {
        console.log('Restoring session:', sessionId);
      }}
    />
  );
}
```

## 集成到现有应用

### 添加到路由

```tsx
import { VirtualWorkspace } from './components/VirtualWorkspace';

function App() {
  return (
    <Routes>
      <Route path="/workspace" element={<VirtualWorkspace workspaceId="main" />} />
      {/* 其他路由 */}
    </Routes>
  );
}
```

### 添加到侧边栏

```tsx
import { Sidebar } from './components/Sidebar';
import { AppView } from './types';

// 在 Sidebar.tsx 中添加菜单项
const menuItems = [
  // ... 现有菜单项
  {
    id: 'workspace' as AppView,
    label: '虚拟工作区',
    icon: FolderOpen, // 从 lucide-react 导入
  },
];
```

### 更新类型定义

在 `types/index.ts` 中添加：

```typescript
export enum AppView {
  DASHBOARD = 'dashboard',
  SMART_OPS = 'smart_ops',
  FORMULA = 'formula',
  KNOWLEDGE_CHAT = 'knowledge_chat',
  DOCUMENT_SPACE = 'document_space',
  VIRTUAL_WORKSPACE = 'workspace', // 新增
}
```

## 核心功能

### 1. 虚拟文件浏览器

- 📁 **树形视图**: 层级显示文件和目录
- 🎯 **网格视图**: 卡片式展示文件
- 🔍 **搜索过滤**: 快速定位文件
- 📤 **拖拽上传**: 直接拖拽文件上传
- ✅ **多选支持**: 批量操作文件

### 2. 关系图谱

- 🔗 **可视化依赖**: 清晰展示文件关系
- 🎨 **多种布局**: 层次、力导向、圆形、网格
- 🔍 **交互操作**: 缩放、平移、点击详情
- 📷 **导出图片**: 保存图谱为 PNG

### 3. 执行进度

- 📊 **四阶段显示**: 侦察→预审→分析→生成
- 📝 **实时日志**: 动态显示执行日志
- ⚠️ **错误提示**: 清晰标注警告和错误
- 📈 **进度追踪**: 总体和分阶段进度

### 4. 工作区恢复

- 📚 **历史会话**: 保存和恢复工作状态
- 🔄 **快速恢复**: 一键恢复之前的会话
- 🗑️ **会话管理**: 删除和清理过期会话
- 🔍 **状态过滤**: 按完成状态筛选

## 样式定制

组件使用 Tailwind CSS，可以通过以下方式定制：

### 1. 全局样式覆盖

```css
/* 在 index.css 中 */
.virtual-workspace {
  --primary-color: #3b82f6;
  --success-color: #22c55e;
  --warning-color: #f59e0b;
  --error-color: #ef4444;
}
```

### 2. Props 定制

```tsx
<VirtualFileBrowser
  workspaceId="my-workspace"
  // 通过 props 传递自定义类名
  className="custom-file-browser"
/>
```

### 3. 主题切换

组件支持暗色模式，自动跟随系统主题：

```tsx
// 在根组件添加 dark 类
<html className="dark">
```

## 数据集成

### 连接后端服务

组件已经集成了以下后端服务：

1. **VirtualFileSystem**: 虚拟文件系统服务
2. **PyodideService**: Python 沙箱服务
3. **RedisService**: 状态持久化服务

确保这些服务已正确初始化：

```tsx
import { getVirtualFileSystem } from './services/infrastructure/vfs/VirtualFileSystem';

// 初始化 VFS
const vfs = getVirtualFileSystem();
await vfs.initialize();
```

### WebSocket 集成

对于实时更新，集成 WebSocket：

```tsx
useEffect(() => {
  const ws = new WebSocket('ws://localhost:3000/workspace');

  ws.onmessage = (event) => {
    const update = JSON.parse(event.data);
    // 处理更新
  };

  return () => ws.close();
}, []);
```

## 性能优化建议

### 1. 大文件列表优化

```tsx
<VirtualFileBrowser
  workspaceId="my-workspace"
  // 使用虚拟滚动（需要额外配置）
  virtualScroll
  pageSize={50}
/>
```

### 2. 图谱性能优化

```tsx
<RelationshipGraph
  layout="hierarchical"
  // 限制最大深度
  maxDepth={3}
  // 简化节点显示
  viewOptions={{
    nodeSize: 'small',
    showLabels: false,
  }}
/>
```

### 3. 日志优化

```tsx
<ExecutionProgressPanel
  executionId="exec-123"
  // 限制日志条数
  maxLogEntries={100}
  // 关闭自动滚动
  autoScroll={false}
/>
```

## 常见问题

### Q: 如何自定义文件图标？

A: 修改 `utils.ts` 中的 `getFileIcon` 函数：

```typescript
export const getFileIcon = (fileType: string): string => {
  // 添加自定义图标映射
  const customIcons = {
    mytype: '🎯',
  };
  return customIcons[fileType] || '📁';
};
```

### Q: 如何添加新的文件操作？

A: 在 `FileCard.tsx` 的 `menuItems` 数组中添加：

```typescript
const menuItems = [
  // ... 现有菜单项
  {
    operation: 'custom' as FileOperation,
    icon: CustomIcon,
    label: '自定义操作',
  },
];
```

### Q: 如何自定义布局算法？

A: 在 `RelationshipGraph.tsx` 中添加新的布局：

```typescript
const calculateCustomLayout = () => {
  // 自定义布局逻辑
  return positions;
};
```

## 调试技巧

### 1. 启用调试日志

```tsx
// 在组件中添加
useEffect(() => {
  console.log('Files loaded:', files);
  console.log('Graph nodes:', nodes);
}, [files, nodes]);
```

### 2. 检查服务状态

```tsx
const vfs = getVirtualFileSystem();
console.log('VFS initialized:', vfs.initialized);
```

### 3. 监控性能

```tsx
import { usePerformanceMonitor } from './hooks/usePerformanceMonitor';

const { metrics } = usePerformanceMonitor();
console.log('Render time:', metrics.renderTime);
```

## 下一步

1. 阅读详细文档：
   - `components/VirtualWorkspace/README.md`
   - `components/ExecutionProgress/README.md`

2. 查看类型定义：
   - `components/VirtualWorkspace/types.ts`

3. 探索工具函数：
   - `components/VirtualWorkspace/utils.ts`

4. 运行示例：
   ```bash
   npm run dev
   ```

## 支持

如有问题，请查看：
- GitHub Issues
- 项目 Wiki
- 技术文档

祝使用愉快！🎉
