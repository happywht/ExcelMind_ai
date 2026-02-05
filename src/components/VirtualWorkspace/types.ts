/**
 * 虚拟工作区组件类型定义
 *
 * @module VirtualWorkspace
 * @version 1.0.0
 */

import { FileRole, RelationType } from '../../services/infrastructure/vfs/VirtualFileSystem';

// ============================================================================
// 文件浏览器类型
// ============================================================================

/**
 * 虚拟文件信息（扩展版）
 */
export interface ExtendedVirtualFileInfo {
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
  // 扩展字段
  referenceCount?: number;      // 被引用次数
  isSelected?: boolean;         // 是否被选中
  isExpanded?: boolean;         // 是否展开（目录）
}

/**
 * 文件树节点
 */
export interface FileTreeNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  fileType?: 'excel' | 'word' | 'pdf' | 'json' | 'csv' | 'txt' | 'unknown';
  role?: FileRole;
  size?: number;
  uploadTime?: number;
  referenceCount?: number;
  children?: FileTreeNode[];
  isExpanded?: boolean;
  level: number;
}

/**
 * 文件操作
 */
export type FileOperation = 'download' | 'delete' | 'rename' | 'view' | 'copy' | 'move';

/**
 * 排序选项
 */
export type SortOption = 'name' | 'size' | 'date' | 'type' | 'role';

/**
 * 过滤选项
 */
export interface FilterOptions {
  searchQuery?: string;
  fileTypes?: string[];
  roles?: FileRole[];
  dateRange?: {
    start: number;
    end: number;
  };
}

// ============================================================================
// 关系图谱类型
// ============================================================================

/**
 * 图节点
 */
export interface GraphNode {
  id: string;
  label: string;
  type: 'excel' | 'word' | 'pdf' | 'json' | 'csv' | 'txt' | 'unknown';
  role: FileRole;
  size?: number;
  color?: string;
  metadata?: Record<string, any>;
}

/**
 * 图边
 */
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: RelationType;
  label?: string;
  color?: string;
  animated?: boolean;
  metadata?: Record<string, any>;
}

/**
 * 图布局类型
 */
export type GraphLayout = 'hierarchical' | 'force' | 'circular' | 'grid';

/**
 * 图视图选项
 */
export interface GraphViewOptions {
  layout: GraphLayout;
  showLabels: boolean;
  showEdgeLabels: boolean;
  nodeSize: 'small' | 'medium' | 'large';
  edgeWidth: number;
  enableZoom: boolean;
  enablePan: boolean;
  enableDrag: boolean;
}

// ============================================================================
// 执行进度类型
// ============================================================================

/**
 * 执行阶段
 */
export enum ExecutionStage {
  RECONNAISSANCE = 'reconnaissance',  // 侦察阶段
  PRE_AUDIT = 'pre_audit',            // 预审阶段
  ANALYSIS = 'analysis',              // 分析阶段
  GENERATION = 'generation',          // 生成阶段
}

/**
 * 执行状态
 */
export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'paused';

/**
 * 阶段信息
 */
export interface StageInfo {
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

/**
 * 日志条目
 */
export interface LogEntry {
  id: string;
  timestamp: number;
  level: 'info' | 'warning' | 'error' | 'success' | 'debug';
  message: string;
  details?: string;
  source?: string;
  metadata?: Record<string, any>;
}

/**
 * 执行上下文
 */
export interface ExecutionContext {
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

// ============================================================================
// 工作区恢复类型
// ============================================================================

/**
 * 会话信息
 */
export interface SessionInfo {
  id: string;
  name: string;
  timestamp: number;
  files: SessionFileInfo[];
  executionState?: Partial<ExecutionContext>;
  status: 'completed' | 'failed' | 'in_progress' | 'interrupted';
  error?: string;
}

/**
 * 会话文件信息
 */
export interface SessionFileInfo {
  id: string;
  name: string;
  role: FileRole;
  type: string;
  path: string;
}

/**
 * 恢复选项
 */
export interface RecoveryOptions {
  restoreFiles: boolean;
  restoreExecutionState: boolean;
  restoreMappings: boolean;
  restoreConfig: boolean;
}

// ============================================================================
// 组件 Props 类型
// ============================================================================

/**
 * 虚拟文件浏览器 Props
 */
export interface VirtualFileBrowserProps {
  workspaceId: string;
  rootPath?: string;
  // 测试支持：允许直接传入文件列表
  files?: ExtendedVirtualFileInfo[];
  onFileSelect?: (file: ExtendedVirtualFileInfo) => void;
  onFileUpload?: (files: File[]) => Promise<void>;
  onFileDelete?: (fileId: string) => Promise<void>;
  onFileUpdate?: (fileId: string, updates: any) => Promise<void>;
  selectable?: boolean;
  multiSelect?: boolean;
  dragAndDrop?: boolean;
}

/**
 * 关系图谱 Props
 */
export interface RelationshipGraphProps {
  rootFileId?: string;
  maxDepth?: number;
  layout?: GraphLayout;
  // 测试支持：允许直接传入图数据
  data?: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  viewOptions?: Partial<GraphViewOptions>;
  onNodeClick?: (node: GraphNode) => void;
  onEdgeClick?: (edge: GraphEdge) => void;
  onNodeDoubleClick?: (node: GraphNode) => void;
}

/**
 * 执行进度面板 Props
 */
export interface ExecutionProgressPanelProps {
  executionId: string;
  // 测试支持：允许直接传入进度数据
  progress?: ExecutionContext;
  showLogs?: boolean;
  autoScroll?: boolean;
  maxLogEntries?: number;
  compact?: boolean;
  onStageClick?: (stage: ExecutionStage) => void;
  onLogEntryClick?: (log: LogEntry) => void;
}

/**
 * 工作区恢复 Props
 */
export interface WorkspaceRecoveryProps {
  maxSessions?: number;
  autoCleanup?: boolean;
  onRestore?: (sessionId: string, options?: RecoveryOptions) => Promise<void>;
  onDelete?: (sessionId: string) => Promise<void>;
  onClearAll?: () => Promise<void>;
}

// ============================================================================
// 事件类型
// ============================================================================

/**
 * 文件浏览器事件
 */
export interface FileBrowserEvent {
  type: 'file:selected' | 'file:uploaded' | 'file:deleted' | 'file:updated' | 'file:renamed';
  fileId: string;
  fileInfo?: ExtendedVirtualFileInfo;
  timestamp: number;
}

/**
 * 关系图谱事件
 */
export interface RelationshipGraphEvent {
  type: 'node:clicked' | 'edge:clicked' | 'node:doubleClicked' | 'layout:changed';
  data?: GraphNode | GraphEdge | GraphLayout;
  timestamp: number;
}

/**
 * 执行进度事件
 */
export interface ExecutionProgressEvent {
  type: 'stage:started' | 'stage:completed' | 'stage:failed' | 'log:added' | 'progress:updated';
  stage?: ExecutionStage;
  log?: LogEntry;
  progress?: number;
  timestamp: number;
}
