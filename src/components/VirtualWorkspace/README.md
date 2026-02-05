# 虚拟工作区组件文档

## 概述

虚拟工作区组件提供了一套完整的前端 UI，用于管理和可视化虚拟文件系统、监控执行进度以及恢复工作状态。

## 组件架构

```
VirtualWorkspace/
├── VirtualFileBrowser.tsx      # 文件浏览器组件
├── RelationshipGraph.tsx       # 关系图谱组件
├── WorkspaceRecovery.tsx       # 工作区恢复组件
├── VirtualWorkspace.tsx        # 主工作区组件
├── FileCard.tsx                # 文件卡片组件
├── FileTree.tsx                # 文件树组件
├── types.ts                    # 类型定义
├── utils.ts                    # 工具函数
└── index.ts                    # 导出文件

ExecutionProgress/
├── ExecutionProgressPanel.tsx  # 执行进度面板组件
└── index.ts                    # 导出文件
```

## 核心组件

### 1. VirtualFileBrowser (文件浏览器)

**功能特性：**
- 树形视图和网格视图切换
- 文件搜索和过滤
- 拖拽上传文件
- 文件选择（单选/多选）
- 文件操作（下载、删除、重命名）
- 按名称、大小、日期、类型、角色排序

**Props：**
```typescript
interface VirtualFileBrowserProps {
  workspaceId: string;
  rootPath?: string;
  onFileSelect?: (file: ExtendedVirtualFileInfo) => void;
  onFileUpload?: (files: File[]) => Promise<void>;
  onFileDelete?: (fileId: string) => Promise<void>;
  onFileUpdate?: (fileId: string, updates: any) => Promise<void>;
  selectable?: boolean;
  multiSelect?: boolean;
  dragAndDrop?: boolean;
}
```

**使用示例：**
```tsx
import { VirtualFileBrowser } from './components/VirtualWorkspace';

<VirtualFileBrowser
  workspaceId="workspace-1"
  onFileUpload={async (files) => {
    // 处理文件上传
  }}
  onFileDelete={async (fileId) => {
    // 处理文件删除
  }}
  selectable
  multiSelect
  dragAndDrop
/>
```

### 2. RelationshipGraph (关系图谱)

**功能特性：**
- 多种布局算法（层次、力导向、圆形、网格）
- 交互式缩放和平移
- 节点和边的详细信息展示
- 全屏模式
- 导出为图片

**Props：**
```typescript
interface RelationshipGraphProps {
  rootFileId?: string;
  maxDepth?: number;
  layout?: GraphLayout;
  viewOptions?: Partial<GraphViewOptions>;
  onNodeClick?: (node: GraphNode) => void;
  onEdgeClick?: (edge: GraphEdge) => void;
  onNodeDoubleClick?: (node: GraphNode) => void;
}
```

**使用示例：**
```tsx
import { RelationshipGraph } from './components/VirtualWorkspace';

<RelationshipGraph
  layout="hierarchical"
  onNodeClick={(node) => {
    console.log('Node clicked:', node);
  }}
/>
```

### 3. ExecutionProgressPanel (执行进度面板)

**功能特性：**
- 四阶段进度显示（侦察→预审→分析→生成）
- 实时日志输出
- 阶段详情展开/折叠
- 错误和警告提示
- 自动滚动

**Props：**
```typescript
interface ExecutionProgressPanelProps {
  executionId: string;
  showLogs?: boolean;
  autoScroll?: boolean;
  maxLogEntries?: number;
  compact?: boolean;
  onStageClick?: (stage: ExecutionStage) => void;
  onLogEntryClick?: (log: LogEntry) => void;
}
```

**使用示例：**
```tsx
import { ExecutionProgressPanel } from './components/ExecutionProgress';

<ExecutionProgressPanel
  executionId="exec-123"
  showLogs
  autoScroll
  onStageClick={(stage) => {
    console.log('Stage clicked:', stage);
  }}
/>
```

### 4. WorkspaceRecovery (工作区恢复)

**功能特性：**
- 历史会话列表
- 会话状态显示
- 恢复和删除会话
- 自动清理过期会话
- 按状态过滤

**Props：**
```typescript
interface WorkspaceRecoveryProps {
  maxSessions?: number;
  autoCleanup?: boolean;
  onRestore?: (sessionId: string, options?: RecoveryOptions) => Promise<void>;
  onDelete?: (sessionId: string) => Promise<void>;
  onClearAll?: () => Promise<void>;
}
```

**使用示例：**
```tsx
import { WorkspaceRecovery } from './components/VirtualWorkspace';

<WorkspaceRecovery
  maxSessions={20}
  autoCleanup
  onRestore={async (sessionId, options) => {
    // 处理会话恢复
  }}
/>
```

### 5. VirtualWorkspace (主工作区)

**功能特性：**
- 整合所有子组件
- 标签页导航
- 统一状态管理

**使用示例：**
```tsx
import { VirtualWorkspace } from './components/VirtualWorkspace';

<VirtualWorkspace workspaceId="workspace-1" />
```

## 类型定义

### ExtendedVirtualFileInfo
```typescript
interface ExtendedVirtualFileInfo {
  id: string;
  name: string;
  role: FileRole;
  type: 'excel' | 'word' | 'pdf' | 'json' | 'csv' | 'txt' | 'unknown';
  path: string;
  size: number;
  uploadTime: number;
  lastModified: number;
  checksum?: string;
  metadata?: Record<string, any>;
  referenceCount?: number;
  isSelected?: boolean;
}
```

### GraphNode
```typescript
interface GraphNode {
  id: string;
  label: string;
  type: 'excel' | 'word' | 'pdf' | 'json' | 'csv' | 'txt' | 'unknown';
  role: FileRole;
  size?: number;
  color?: string;
  metadata?: Record<string, any>;
}
```

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

## 工具函数

### 文件工具
- `getFileIcon(fileType: string): string` - 获取文件图标
- `getFileRoleLabel(role: FileRole): string` - 获取角色标签
- `getFileRoleColor(role: FileRole): string` - 获取角色颜色
- `formatFileSize(bytes: number): string` - 格式化文件大小
- `formatTimestamp(timestamp: number): string` - 格式化时间戳
- `formatDuration(ms: number): string` - 格式化持续时间

### 文件树工具
- `buildFileTree(files: ExtendedVirtualFileInfo[]): FileTreeNode[]` - 构建文件树
- `expandAllNodes(nodes: FileTreeNode[]): FileTreeNode[]` - 展开所有节点
- `collapseAllNodes(nodes: FileTreeNode[]): FileTreeNode[]` - 折叠所有节点
- `toggleNode(nodes: FileTreeNode[], nodeId: string): FileTreeNode[]` - 切换节点状态

### 排序和过滤工具
- `sortFiles(files: ExtendedVirtualFileInfo[], sortBy: SortOption, ascending?: boolean): ExtendedVirtualFileInfo[]` - 排序文件
- `filterFiles(files: ExtendedVirtualFileInfo[], filters: FilterOptions): ExtendedVirtualFileInfo[]` - 过滤文件

### 会话管理工具
- `saveSession(session: SessionInfo): void` - 保存会话
- `getSessions(): SessionInfo[]` - 获取所有会话
- `deleteSession(sessionId: string): void` - 删除会话
- `clearAllSessions(): void` - 清除所有会话
- `cleanupExpiredSessions(maxAge?: number): void` - 清理过期会话

## 样式定制

组件使用 Tailwind CSS 进行样式定制。主要颜色类：

- 主色调：`blue-500`
- 成功色：`emerald-500`
- 警告色：`yellow-500`
- 错误色：`red-500`
- 中性色：`slate-*`

## 性能优化

1. **虚拟滚动**：文件列表支持虚拟滚动以提升大量文件时的性能
2. **懒加载**：组件按需加载，减少初始包大小
3. **记忆化**：使用 `useMemo` 和 `useCallback` 优化渲染性能
4. **防抖**：搜索和过滤操作使用防抖减少不必要的计算

## 无障碍访问

所有组件都支持键盘导航和屏幕阅读器：
- 使用语义化 HTML 标签
- 提供 ARIA 标签
- 支持焦点管理
- 键盘快捷键支持

## 浏览器兼容性

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## 依赖项

- React 18+
- lucide-react (图标)
- 后端服务：
  - VirtualFileSystem (虚拟文件系统)
  - PyodideService (Python 沙箱)

## 开发指南

### 添加新功能

1. 在 `types.ts` 中添加类型定义
2. 在 `utils.ts` 中添加工具函数
3. 创建或更新组件
4. 更新 `index.ts` 导出

### 测试

组件建议使用 Jest 和 React Testing Library 进行测试：

```tsx
import { render, screen } from '@testing-library/react';
import { VirtualFileBrowser } from './VirtualFileBrowser';

test('renders file browser', () => {
  render(<VirtualFileBrowser workspaceId="test" />);
  expect(screen.getByText('虚拟工作台')).toBeInTheDocument();
});
```

## 故障排除

### 常见问题

**Q: 文件上传失败**
A: 检查 VirtualFileSystem 服务是否已正确初始化

**Q: 图谱显示异常**
A: 确保节点和边数据格式正确，检查布局算法参数

**Q: 日志不更新**
A: 检查 WebSocket 连接状态，确认后端是否推送日志事件

## 更新日志

### v1.0.0 (2024-01-24)
- 初始版本发布
- 实现文件浏览器
- 实现关系图谱
- 实现执行进度监控
- 实现工作区恢复

## 贡献指南

欢迎提交问题和拉取请求！

## 许可证

MIT
