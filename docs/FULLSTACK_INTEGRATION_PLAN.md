# ExcelMind AI 全栈集成优化实施计划

> **基于 PHASE2_COMPREHENSIVE_EVALUATION.md 的全栈协同方案**
>
> **制定日期**: 2026-01-24
> **制定人**: 全栈技术负责人
> **文档状态**: ✅ 全栈集成规划完成

---

## 📋 执行摘要

### 规划背景

基于 `guanyu2.txt` 顾问交流记录的综合评估，ExcelMind AI 需要从**单点工具**升级为**智能审计工作台**。本计划从**全栈集成视角**，协调前后端任务，确保端到端的用户体验。

### 核心目标

1. **无缝集成**: 前后端接口对接顺畅，数据流设计清晰
2. **用户体验**: 四阶段执行模型可视化，进度实时反馈
3. **系统可靠性**: 自愈逻辑 + 错误处理统一 + 降级策略完善
4. **可扩展性**: Function Calling 机制，支持未来工具扩展

### 实施周期

- **总工期**: 10-12 周
- **Phase 1** (基础增强): 2-3 周
- **Phase 2** (核心功能): 3-4 周
- **Phase 3** (高级功能): 3-4 周
- **Phase 4** (完善优化): 2-3 周

---

## 🎯 第一部分：全栈集成任务清单

### 1.1 前后端接口对接（P0）

#### 虚拟工作台 API

**后端任务**:

```typescript
// services/infrastructure/virtualWorkspaceService.ts

interface VirtualWorkspaceService {
  // 挂载文件到工作区
  mountFile(file: File, role: FileRole): Promise<MountedFileInfo>;

  // 获取工作区文件列表
  listFiles(): Promise<MountedFileInfo[]>;

  // 更新文件角色
  updateFileRole(fileId: string, role: FileRole): Promise<void>;

  // 构建文件关系图谱
  buildRelationshipGraph(): Promise<FileRelationshipGraph>;

  // 卸载文件
  unmountFile(fileId: string): Promise<void>;
}

interface FileRole {
  role: 'source' | 'reference' | 'template' | 'rules' | 'output';
  category?: string;
  relationships?: FileRelationship[];
}
```

**前端任务**:

```tsx
// components/VirtualWorkspace/index.tsx

interface VirtualWorkspaceProps {
  files: MountedFileInfo[];
  relationships: FileRelationshipGraph;
  onMountFile: (file: File, role: FileRole) => Promise<void>;
  onUpdateRole: (fileId: string, role: FileRole) => Promise<void>;
  onUnmountFile: (fileId: string) => Promise<void>;
}

// 功能需求:
// 1. 文件拖放上传区域
// 2. 文件角色选择器（下拉菜单）
// 3. 文件关系可视化（力导向图）
// 4. 实时状态同步
```

**API 端点**:

```http
POST   /api/workspace/mount
GET    /api/workspace/files
PUT    /api/workspace/files/:id/role
DELETE /api/workspace/files/:id
GET    /api/workspace/relationships
```

#### 四阶段执行 API

**后端任务**:

```typescript
// services/agentic/fourPhaseOrchestrator.ts

interface FourPhaseOrchestrator {
  // 启动四阶段工作流
  executeWorkflow(request: AuditWorkflowRequest): Promise<WorkflowExecution>;

  // 获取工作流状态
  getWorkflowStatus(workflowId: string): Promise<WorkflowStatus>;

  // 暂停工作流（等待用户输入）
  pauseWorkflow(workflowId: string): Promise<void>;

  // 恢复工作流
  resumeWorkflow(workflowId: string, userInput?: any): Promise<void>;

  // 从断点恢复
  resumeFromCheckpoint(workflowId: string, stageId: string): Promise<void>;
}

interface AuditWorkflowRequest {
  userPrompt: string;
  files: DataFileInfo[];
  options?: {
    enableInternalControl?: boolean;
    auditDepth?: 'basic' | 'standard' | 'deep';
  };
}
```

**前端任务**:

```tsx
// components/ExecutionProgress/Visualizer.tsx

interface ExecutionProgressVisualizerProps {
  workflowId: string;
  stages: WorkflowStage[];
  currentStage: string;
  logs: ExecutionLog[];
  onResumeFrom?: (stageId: string) => Promise<void>;
}

// 功能需求:
// 1. 四阶段进度展示（步骤条）
// 2. 实时日志流（虚拟滚动）
// 3. 错误/警告高亮
// 4. 断点续传支持
// 5. 性能指标展示
```

**API 端点**:

```http
POST /api/audit/execute
GET  /api/audit/workflows/:id/status
POST /api/audit/workflows/:id/pause
POST /api/audit/workflows/:id/resume
POST /api/audit/workflows/:id/resume-from/:stageId
```

#### 侦察兵 API

**后端任务**:

```typescript
// services/scout/excelScoutService.ts

interface ExcelScoutService {
  // 侦察 Excel 文件
  scoutExcel(filePath: string, options?: ScoutOptions): Promise<ExcelScoutReport>;
}

interface ExcelScoutReport {
  sheets: SheetScoutInfo[];
  patterns: PatternInfo;
  qualityIssues: QualityIssue[];
}

interface SheetScoutInfo {
  name: string;
  columns: ColumnScoutInfo[];
  sampleRows: Record<string, any>[];
}
```

**前端任务**:

```tsx
// components/Scout/ExcelScoutResult.tsx

interface ExcelScoutResultProps {
  report: ExcelScoutReport;
  onApplyMapping?: (mapping: MappingScheme) => void;
}

// 功能需求:
// 1. Sheet 结构展示（表格）
// 2. 列信息卡片（数据类型、样本值）
// 3. 模式识别结果（标签）
// 4. 质量问题警告（徽章）
```

**API 端点**:

```http
POST /api/scout/excel
POST /api/scout/word
```

### 1.2 数据流设计（P0）

#### 前后端数据流向

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户界面层                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ 文件上传组件  │  │ 映射编辑器    │  │ 执行可视化器  │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼─────────────────┼─────────────────┼───────────────────┘
          │                 │                 │
          │ REST API        │ WebSocket       │ Server-Sent Events
          │                 │ (实时更新)       │ (进度推送)
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API 网关层                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ 认证中间件    │  │ 速率限制      │  │ 请求日志      │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼─────────────────┼─────────────────┼───────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                        服务层                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         IntelligentDocumentService (门面)                  │  │
│  │  - 协调各子服务                                            │  │
│  │  - 管理任务生命周期                                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│  │ Template    │ │  Mapping    │ │  Document   │              │
│  │ Analysis    │ │  Planning   │ │ Generation  │              │
│  └─────────────┘ └─────────────┘ └─────────────┘              │
│                                                                  │
│  ┌─────────────┐ ┌─────────────┐                                │
│  │  DataSource │ │    AI       │                                │
│  │  Analysis   │ │Orchestration│                                │
│  └─────────────┘ └─────────────┘                                │
└─────────────────────────────────────────────────────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    编排层 (Orchestration)                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         FourPhaseOrchestrator                             │  │
│  │  1. 侦察 (Scouting)                                       │  │
│  │  2. 预审 (Pre-Filtering)                                  │  │
│  │  3. 分析 (AI Reasoning)                                   │  │
│  │  4. 输出 (Generating)                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         SelfHealingEngine                                │  │
│  │  - 错误分类                                               │  │
│  │  - 修复策略选择                                           │  │
│  │  - 自动重试                                               │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    基础设施层                                    │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│  │    Cache    │ │   Retry     │ │   Event     │              │
│  │   Service   │ │  Strategy   │ │    Bus      │              │
│  └─────────────┘ └─────────────┘ └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

#### 状态管理模式

**前端状态管理** (使用 Zustand):

```typescript
// stores/workspaceStore.ts

interface WorkspaceStore {
  // 文件状态
  files: MountedFileInfo[];
  selectedFileId: string | null;

  // 工作流状态
  workflow: WorkflowState | null;

  // UI 状态
  ui: {
    sidebarOpen: boolean;
    currentView: 'workspace' | 'mapping' | 'execution';
    notifications: Notification[];
  };

  // Actions
  mountFile: (file: File, role: FileRole) => Promise<void>;
  unmountFile: (fileId: string) => Promise<void>;
  selectFile: (fileId: string) => void;

  startWorkflow: (request: AuditWorkflowRequest) => Promise<void>;
  pauseWorkflow: () => Promise<void>;
  resumeWorkflow: (userInput?: any) => Promise<void>;

  updateWorkflowStage: (stage: WorkflowStage) => void;
  addLog: (log: ExecutionLog) => void;
}

// 使用示例
const workspaceStore = useWorkspaceStore();

// 挂载文件
await workspaceStore.mountFile(file, { role: 'source' });

// 启动工作流
await workspaceStore.startWorkflow({
  userPrompt: '检查报销数据',
  files: workspaceStore.files
});
```

**后端状态管理** (使用 Redis + PostgreSQL):

```typescript
// services/infrastructure/taskRepository.ts

interface TaskRepository {
  // 保存任务状态
  saveTask(task: DocumentGenerationTask): Promise<void>;

  // 获取任务状态
  getTask(taskId: string): Promise<DocumentGenerationTask | null>;

  // 更新任务状态
  updateTaskStatus(taskId: string, status: TaskStatus): Promise<void>;

  // 保存检查点
  saveCheckpoint(workflowId: string, stageId: string, data: any): Promise<void>;

  // 获取检查点
  getCheckpoint(workflowId: string, stageId: string): Promise<any | null>;
}

// Redis 缓存层
interface CacheService {
  // 缓存任务状态 (TTL: 1小时)
  cacheTaskState(taskId: string, state: WorkflowState): Promise<void>;

  // 获取缓存
  getTaskState(taskId: string): Promise<WorkflowState | null>;

  // 缓存侦察结果 (TTL: 30分钟)
  cacheScoutResult(fileId: string, result: ScoutReport): Promise<void>;
}
```

### 1.3 状态管理策略（P0）

#### 客户端状态分类

```typescript
// stores/types.ts

enum StatePersistence {
  NONE,              // 内存中，刷新丢失
  SESSION,           // SessionStorage，关闭浏览器丢失
  LOCAL,             // LocalStorage，持久化
  SYNC               // 与服务器同步
}

interface StateConfig {
  persistence: StatePersistence;
  syncInterval?: number; // 同步间隔（毫秒）
  retrySync?: boolean;   // 失败后是否重试
}

// 状态配置示例
const STATE_CONFIGS: Record<string, StateConfig> = {
  // 工作区文件状态 - 与服务器同步
  workspaceFiles: {
    persistence: StatePersistence.SYNC,
    syncInterval: 5000,
    retrySync: true
  },

  // 工作流执行状态 - Session 存储 + 实时同步
  workflowExecution: {
    persistence: StatePersistence.SESSION,
    syncInterval: 1000,
    retrySync: true
  },

  // UI 偏好设置 - LocalStorage
  uiPreferences: {
    persistence: StatePersistence.LOCAL
  },

  // 临时编辑状态 - 内存
  draftMapping: {
    persistence: StatePersistence.NONE
  }
};
```

#### 服务端状态管理

```typescript
// services/infrastructure/stateManager.ts

class ServerStateManager {
  private redis: Redis;
  private db: PostgreSQL;

  /**
   * 保存任务状态到多层存储
   */
  async saveTaskState(taskId: string, state: WorkflowState): Promise<void> {
    // 1. Redis (快速访问，TTL: 1小时)
    await this.redis.setex(
      `task:${taskId}`,
      3600,
      JSON.stringify(state)
    );

    // 2. PostgreSQL (持久化)
    await this.db.workflowState.upsert({
      where: { taskId },
      update: { state: JSON.stringify(state), updatedAt: new Date() },
      create: { taskId, state: JSON.stringify(state) }
    });
  }

  /**
   * 获取任务状态（优先从 Redis）
   */
  async getTaskState(taskId: string): Promise<WorkflowState | null> {
    // 1. 尝试从 Redis 获取
    const cached = await this.redis.get(`task:${taskId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // 2. 从数据库获取
    const record = await this.db.workflowState.findUnique({
      where: { taskId }
    });

    if (record) {
      // 回填 Redis
      await this.redis.setex(`task:${taskId}`, 3600, record.state);
      return JSON.parse(record.state);
    }

    return null;
  }

  /**
   * 发布状态更新事件
   */
  async publishStateUpdate(
    taskId: string,
    eventType: 'stage_progress' | 'log_added' | 'error_occurred',
    data: any
  ): Promise<void> {
    await this.redis.publish(`task:${taskId}:events`, JSON.stringify({
      type: eventType,
      timestamp: Date.now(),
      data
    }));
  }
}
```

### 1.4 错误处理统一（P0）

#### 错误分类体系

```typescript
// types/errors.ts

enum ErrorSeverity {
  LOW = 'low',           // 信息性警告，不影响执行
  MEDIUM = 'medium',     // 需要注意，可能影响结果
  HIGH = 'high',         // 严重错误，需要处理
  CRITICAL = 'critical'  // 致命错误，必须停止
}

enum ErrorCategory {
  // 用户错误
  VALIDATION_ERROR = 'validation_error',
  FILE_NOT_FOUND = 'file_not_found',
  INVALID_FORMAT = 'invalid_format',

  // 系统错误
  AI_SERVICE_ERROR = 'ai_service_error',
  CODE_EXECUTION_ERROR = 'code_execution_error',
  NETWORK_ERROR = 'network_error',

  // 业务错误
  MAPPING_ERROR = 'mapping_error',
  GENERATION_ERROR = 'generation_error',
  TIMEOUT_ERROR = 'timeout_error'
}

interface AppError {
  code: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  details?: any;
  retryable: boolean;
  userAction?: string; // 用户可执行的修复动作
  timestamp: number;
  stackTrace?: string;
}
```

#### 统一错误处理中间件

**后端错误处理**:

```typescript
// middleware/errorHandler.ts

export class ErrorHandler {
  static handle(error: Error | AppError): AppError {
    if (error instanceof AppError) {
      return error;
    }

    // 分类标准错误
    if (error.message.includes('KeyError')) {
      return {
        code: 'COLUMN_NOT_FOUND',
        category: ErrorCategory.CODE_EXECUTION_ERROR,
        severity: ErrorSeverity.MEDIUM,
        message: '列名未找到',
        retryable: true,
        userAction: '请检查列名拼写或选择正确的列',
        timestamp: Date.now(),
        details: { originalError: error.message }
      };
    }

    if (error.message.includes('timeout')) {
      return {
        code: 'EXECUTION_TIMEOUT',
        category: ErrorCategory.TIMEOUT_ERROR,
        severity: ErrorSeverity.HIGH,
        message: '执行超时',
        retryable: true,
        userAction: '请减少数据量或联系技术支持',
        timestamp: Date.now(),
        details: { originalError: error.message }
      };
    }

    // 未知错误
    return {
      code: 'UNKNOWN_ERROR',
      category: ErrorCategory.GENERATION_ERROR,
      severity: ErrorSeverity.HIGH,
      message: error.message,
      retryable: false,
      timestamp: Date.now(),
      details: { stack: error.stack }
    };
  }
}

// Express/Koa 错误处理中间件
export function errorMiddleware(err, req, res, next) {
  const appError = ErrorHandler.handle(err);

  // 记录错误
  logger.error('Request error', {
    error: appError,
    request: {
      method: req.method,
      path: req.path,
      body: req.body
    }
  });

  // 返回统一格式
  res.status(appError.severity === ErrorSeverity.CRITICAL ? 500 : 400).json({
    success: false,
    error: {
      code: appError.code,
      message: appError.message,
      severity: appError.severity,
      userAction: appError.userAction,
      retryable: appError.retryable
    }
  });
}
```

**前端错误处理**:

```tsx
// components/ErrorBoundary/index.tsx

interface ErrorBoundaryState {
  error: AppError | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props) {
    super(props);
    this.state = { error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error: ErrorHandler.handle(error) };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });

    // 上报错误到服务器
    this.reportError(error, errorInfo);
  }

  async reportError(error: Error, errorInfo: React.ErrorInfo) {
    await fetch('/api/errors/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: error.toString(),
        componentStack: errorInfo.componentStack,
        userAgent: navigator.userAgent,
        timestamp: Date.now()
      })
    });
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorDisplay
          error={this.state.error}
          onRetry={() => window.location.reload()}
          onReset={() => this.setState({ error: null, errorInfo: null })}
        />
      );
    }

    return this.props.children;
  }
}

// 错误显示组件
interface ErrorDisplayProps {
  error: AppError;
  onRetry: () => void;
  onReset: () => void;
}

function ErrorDisplay({ error, onRetry, onReset }: ErrorDisplayProps) {
  const severityColors = {
    [ErrorSeverity.LOW]: 'blue',
    [ErrorSeverity.MEDIUM]: 'yellow',
    [ErrorSeverity.HIGH]: 'orange',
    [ErrorSeverity.CRITICAL]: 'red'
  };

  return (
    <div className="error-boundary">
      <Alert severity={severityColors[error.severity]}>
        <AlertTitle>{error.message}</AlertTitle>

        {error.userAction && (
          <Typography variant="body2">
            建议操作: {error.userAction}
          </Typography>
        )}

        {error.retryable && (
          <Box mt={2}>
            <Button onClick={onRetry} variant="contained">
              重试
            </Button>
          </Box>
        )}

        <Box mt={2}>
          <Button onClick={onReset} size="small">
            返回首页
          </Button>
        </Box>
      </Alert>

      {/* 开发模式下显示详情 */}
      {process.env.NODE_ENV === 'development' && (
        <pre className="error-details">
          {JSON.stringify(error.details, null, 2)}
        </pre>
      )}
    </div>
  );
}
```

---

## 🏗️ 第二部分：集成架构设计

### 2.1 前后端数据流向详细设计

#### 文件上传流程

```
用户选择文件
    │
    ├─ 前端验证 (文件大小、格式)
    │   └─ 失败 → 显示错误提示
    │
    ├─ 前端生成文件 ID
    │
    ├─ 上传到服务器 (/api/files/upload)
    │   ├─ 服务器保存到临时目录
    │   ├─ 返回文件 ID 和路径
    │   └─ 更新前端状态
    │
    ├─ 调用侦察兵 API (/api/scout/excel)
    │   ├─ 后端分析文件结构
    │   ├─ 返回元数据
    │   └─ 前端显示预览
    │
    ├─ 用户选择文件角色
    │
    ├─ 挂载到工作区 (/api/workspace/mount)
    │   ├─ 后端创建文件记录
    │   ├─ 建立文件关系
    │   └─ 前端更新工作区
    │
    └─ 完成
```

#### 工作流执行流程

```
用户启动工作流
    │
    ├─ 创建工作流 (/api/audit/execute)
    │   ├─ 后端初始化工作流状态
    │   ├─ 返回 workflowId
    │   └─ 前端建立 WebSocket 连接
    │
    ├─ Phase 1: 环境侦察 (Scouting)
    │   ├─ 后端调用侦察兵服务
    │   ├─ 实时推送进度 (WebSocket)
    │   ├─ 前端更新进度条
    │   └─ 完成后推送结果
    │
    ├─ Phase 2: 内控预审 (Pre-Filtering) [可选]
    │   ├─ 后端执行规则检查
    │   ├─ 实时推送异常记录
    │   ├─ 前端显示异常列表
    │   └─ 用户可暂停/调整
    │
    ├─ Phase 3: AI 深度审计 (AI Reasoning)
    │   ├─ 后端调用 AI 服务
    │   ├─ 实时推送思考过程
    │   ├─ 前端显示分析日志
    │   └─ 完成后推送结果
    │
    ├─ Phase 4: 成果输出 (Generating)
    │   ├─ 后端生成文档
    │   ├─ 实时推送进度
    │   ├─ 前端显示生成进度
    │   └─ 完成后提供下载链接
    │
    └─ 工作流完成
        ├─ 前端显示完整报告
        ├─ 用户提供反馈
        └─ 后端记录反馈
```

### 2.2 事件总线设计

#### 前端事件总线

```typescript
// services/eventBus.ts

type EventHandler = (data: any) => void;

class FrontendEventBus {
  private listeners: Map<string, Set<EventHandler>> = new Map();

  /**
   * 订阅事件
   */
  on(event: string, handler: EventHandler): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    // 返回取消订阅函数
    return () => this.off(event, handler);
  }

  /**
   * 取消订阅
   */
  off(event: string, handler: EventHandler): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * 发布事件
   */
  emit(event: string, data?: any): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * 清除所有监听器
   */
  clear(): void {
    this.listeners.clear();
  }
}

export const eventBus = new FrontendEventBus();

// 使用示例
eventBus.on('file:mounted', (file) => {
  console.log('File mounted:', file);
});

eventBus.on('workflow:stage:progress', (progress) => {
  console.log('Stage progress:', progress);
});

eventBus.emit('file:mounted', { id: 'file1', name: 'data.xlsx' });
```

#### 后端事件总线

```typescript
// services/infrastructure/eventBus.ts

import { EventEmitter } from 'events';

interface EventPayload {
  type: string;
  timestamp: number;
  data: any;
  metadata?: Record<string, any>;
}

class BackendEventBus extends EventEmitter {
  /**
   * 发布领域事件
   */
  async publish(event: string, payload: EventPayload): Promise<void> {
    // 1. 本地事件分发
    this.emit(event, payload);

    // 2. Redis Pub/Sub (跨实例通信)
    await redis.publish(`events:${event}`, JSON.stringify(payload));

    // 3. 持久化事件日志
    await this.persistEvent(event, payload);
  }

  /**
   * 订阅领域事件
   */
  subscribe(event: string, handler: (payload: EventPayload) => void): void {
    this.on(event, handler);

    // 订阅 Redis 频道
    redis.subscribe(`events:${event}`, (message) => {
      const payload = JSON.parse(message);
      handler(payload);
    });
  }

  /**
   * 持久化事件
   */
  private async persistEvent(event: string, payload: EventPayload): Promise<void> {
    await db.eventLog.create({
      data: {
        event,
        payload: JSON.stringify(payload),
        timestamp: new Date(payload.timestamp)
      }
    });
  }
}

export const eventBus = new BackendEventBus();

// 使用示例
eventBus.publish('workflow.stage.completed', {
  type: 'workflow.stage.completed',
  timestamp: Date.now(),
  data: {
    workflowId: 'wf1',
    stage: 'scouting',
    duration: 5000
  }
});

eventBus.subscribe('workflow.stage.completed', (payload) => {
  console.log('Stage completed:', payload);
});
```

### 2.3 实时通信机制

#### WebSocket 连接管理

```typescript
// services/websocket.ts

class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageHandlers: Map<string, (data: any) => void> = new Map();

  /**
   * 连接到 WebSocket 服务器
   */
  connect(url: string, token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(`${url}?token=${token}`);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('WebSocket closed');
          this.attemptReconnect(url, token);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 尝试重连
   */
  private attemptReconnect(url: string, token: string): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

      console.log(`Attempting to reconnect in ${delay}ms...`);

      setTimeout(() => {
        this.connect(url, token);
      }, delay);
    }
  }

  /**
   * 处理收到的消息
   */
  private handleMessage(message: any): void {
    const { type, data } = message;

    const handler = this.messageHandlers.get(type);
    if (handler) {
      handler(data);
    }
  }

  /**
   * 注册消息处理器
   */
  on(type: string, handler: (data: any) => void): void {
    this.messageHandlers.set(type, handler);
  }

  /**
   * 发送消息
   */
  send(type: string, data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }));
    } else {
      console.warn('WebSocket is not connected');
    }
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.messageHandlers.clear();
  }
}

export const wsManager = new WebSocketManager();

// 使用示例
wsManager.connect('wss://api.excelmind.ai/ws', 'your_token');

wsManager.on('workflow:progress', (data) => {
  console.log('Workflow progress:', data);
});

wsManager.on('workflow:completed', (data) => {
  console.log('Workflow completed:', data);
});

wsManager.send('workflow:subscribe', { workflowId: 'wf1' });
```

#### Server-Sent Events (SSE) 备选方案

```typescript
// 后端 SSE 端点
// routes/sse.ts

router.get('/api/events/:workflowId', async (req, res) => {
  const { workflowId } = req.params;

  // 设置 SSE 响应头
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // 发送初始连接消息
  res.write(`data: ${JSON.stringify({ type: 'connected', workflowId })}\n\n`);

  // 订阅工作流事件
  const handler = (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  eventBus.subscribe(`workflow:${workflowId}`, handler);

  // 客户端断开时取消订阅
  req.on('close', () => {
    eventBus.off(`workflow:${workflowId}`, handler);
  });
});

// 前端 SSE 客户端
// services/sseClient.ts

class SSEClient {
  private eventSource: EventSource | null = null;

  connect(workflowId: string): void {
    this.eventSource = new EventSource(`/api/events/${workflowId}`);

    this.eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleEvent(data);
    };

    this.eventSource.onerror = (error) => {
      console.error('SSE error:', error);
    };
  }

  private handleEvent(data: any): void {
    // 分发事件到处理器
    eventBus.emit(data.type, data);
  }

  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}

export const sseClient = new SSEClient();
```

### 2.4 API 契约定义

#### RESTful API 规范

```typescript
// types/api.ts

/**
 * 统一 API 响应格式
 */
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

interface ApiError {
  code: string;
  message: string;
  details?: any;
  severity?: ErrorSeverity;
  userAction?: string;
  retryable?: boolean;
}

interface ApiMeta {
  requestId: string;
  timestamp: string;
  version: string;
}

/**
 * 分页响应
 */
interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * 任务相关 API
 */
interface TaskApi {
  // 创建任务
  createTask(request: CreateTaskRequest): Promise<ApiResponse<Task>>;

  // 获取任务状态
  getTaskStatus(taskId: string): Promise<ApiResponse<TaskStatus>>;

  // 列出任务
  listTasks(query: TaskQuery): Promise<ApiResponse<PaginatedResponse<Task>>>;

  // 取消任务
  cancelTask(taskId: string): Promise<ApiResponse<void>>;

  // 重试任务
  retryTask(taskId: string, stage?: string): Promise<ApiResponse<void>>;
}

/**
 * 工作区 API
 */
interface WorkspaceApi {
  // 挂载文件
  mountFile(request: MountFileRequest): Promise<ApiResponse<MountedFileInfo>>;

  // 列出文件
  listFiles(): Promise<ApiResponse<MountedFileInfo[]>>;

  // 更新文件角色
  updateFileRole(fileId: string, role: FileRole): Promise<ApiResponse<void>>;

  // 卸载文件
  unmountFile(fileId: string): Promise<ApiResponse<void>>;

  // 获取关系图谱
  getRelationships(): Promise<ApiResponse<FileRelationshipGraph>>;
}

/**
 * 侦察 API
 */
interface ScoutApi {
  // 侦察 Excel
  scoutExcel(request: ScoutExcelRequest): Promise<ApiResponse<ExcelScoutReport>>;

  // 侦察 Word
  scoutWord(request: ScoutWordRequest): Promise<ApiResponse<WordScoutReport>>;
}
```

#### API 客户端实现

```typescript
// services/apiClient.ts

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  /**
   * 设置认证令牌
   */
  setToken(token: string): void {
    this.token = token;
  }

  /**
   * 通用请求方法
   */
  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options?.headers
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const data = await response.json();

      if (!response.ok) {
        throw new ApiError(data.error);
      }

      return data;

    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError({
        code: 'NETWORK_ERROR',
        message: '网络请求失败',
        retryable: true
      });
    }
  }

  /**
   * GET 请求
   */
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'GET'
    });
  }

  /**
   * POST 请求
   */
  async post<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * PUT 请求
   */
  async put<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  /**
   * DELETE 请求
   */
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE'
    });
  }
}

export const apiClient = new ApiClient('/api/v1');

// 便捷方法
export const taskApi = {
  createTask: (request: CreateTaskRequest) =>
    apiClient.post<Task>('/tasks', request),

  getTaskStatus: (taskId: string) =>
    apiClient.get<TaskStatus>(`/tasks/${taskId}/status`),

  listTasks: (query: TaskQuery) =>
    apiClient.get<PaginatedResponse<Task>>(
      `/tasks?${new URLSearchParams(query as any)}`
    ),

  cancelTask: (taskId: string) =>
    apiClient.post<void>(`/tasks/${taskId}/cancel`, {}),

  retryTask: (taskId: string, stage?: string) =>
    apiClient.post<void>(`/tasks/${taskId}/retry${stage ? `/${stage}` : ''}`, {})
};

export const workspaceApi = {
  mountFile: (request: MountFileRequest) =>
    apiClient.post<MountedFileInfo>('/workspace/mount', request),

  listFiles: () =>
    apiClient.get<MountedFileInfo[]>('/workspace/files'),

  updateFileRole: (fileId: string, role: FileRole) =>
    apiClient.put<void>(`/workspace/files/${fileId}/role`, { role }),

  unmountFile: (fileId: string) =>
    apiClient.delete<void>(`/workspace/files/${fileId}`),

  getRelationships: () =>
    apiClient.get<FileRelationshipGraph>('/workspace/relationships')
};

export const scoutApi = {
  scoutExcel: (request: ScoutExcelRequest) =>
    apiClient.post<ExcelScoutReport>('/scout/excel', request),

  scoutWord: (request: ScoutWordRequest) =>
    apiClient.post<WordScoutReport>('/scout/word', request)
};
```

---

## 🧪 第三部分：集成测试计划

### 3.1 端到端测试场景

#### 场景 1: 基础文档生成工作流

```typescript
// e2e/basic-workflow.spec.ts

import { test, expect } from '@playwright/test';

test.describe('基础文档生成工作流', () => {
  test('完整流程测试', async ({ page }) => {
    // 1. 导航到应用
    await page.goto('/');

    // 2. 上传模板文件
    const templateInput = page.locator('input[type="file"][accept=".docx"]');
    await templateInput.setInputFiles('test-files/template.docx');

    // 验证模板已上传
    await expect(page.locator('.template-preview')).toBeVisible();
    await expect(page.locator('.placeholder-list')).toContainText('{{产品名称}}');

    // 3. 上传数据文件
    const dataInput = page.locator('input[type="file"][accept=".xlsx"]');
    await dataInput.setInputFiles('test-files/data.xlsx');

    // 验证数据已上传
    await expect(page.locator('.data-preview')).toBeVisible();
    await expect(page.locator('.sheet-selector')).toContainText('产品表');

    // 4. 输入用户指令
    const instructionInput = page.locator('textarea[placeholder*="输入您的需求"]');
    await instructionInput.fill('把销售额大于10万的产品填入模板');

    // 5. 点击生成按钮
    const generateBtn = page.locator('button:has-text("生成文档")');
    await generateBtn.click();

    // 6. 验证执行进度
    await expect(page.locator('.execution-progress')).toBeVisible();
    await expect(page.locator('.stage-scouting .status')).toHaveText('completed', { timeout: 30000 });
    await expect(page.locator('.stage-analysis .status')).toHaveText('completed', { timeout: 30000 });
    await expect(page.locator('.stage-generation .status')).toHaveText('completed', { timeout: 30000 });

    // 7. 验证生成结果
    await expect(page.locator('.generation-result')).toBeVisible();
    await expect(page.locator('.document-count')).toContainText('23');

    // 8. 下载文档
    const downloadPromise = page.waitForEvent('download');
    await page.locator('button:has-text("下载全部")').click();
    const download = await downloadPromise;

    // 验证下载的文件
    expect(download.suggestedFilename()).toMatch(/documents.*\.zip/);
  });
});
```

#### 场景 2: 四阶段审计工作流

```typescript
// e2e/four-phase-workflow.spec.ts

test.describe('四阶段审计工作流', () => {
  test('完整审计流程', async ({ page }) => {
    await page.goto('/audit');

    // 1. 上传审计文件
    await page.locator('input[type="file"]').setInputFiles([
      'test-files/ledger.xlsx',
      'test-files/bank-statement.xlsx',
      'test-files/rules.docx'
    ]);

    // 2. 选择文件角色
    await page.locator('.file-role-selector[data-file="ledger.xlsx"]').selectOption('source');
    await page.locator('.file-role-selector[data-file="bank-statement.xlsx"]').selectOption('reference');
    await page.locator('.file-role-selector[data-file="rules.docx"]').selectOption('rules');

    // 3. 输入审计需求
    await page.locator('textarea[placeholder*="审计需求"]').fill(
      '核对账簿和银行流水，查找差异'
    );

    // 4. 启动审计
    await page.locator('button:has-text("开始审计")').click();

    // 5. 验证阶段1: 环境侦察
    await expect(page.locator('.phase-scouting')).toHaveAttribute('data-status', 'running');
    await expect(page.locator('.scout-result')).toBeVisible();
    await expect(page.locator('.scout-result')).toContainText('发现3个Sheet');

    // 6. 验证阶段2: 内控预审
    await expect(page.locator('.phase-prefilter')).toHaveAttribute('data-status', 'running');
    await expect(page.locator('.prefilter-result')).toBeVisible();
    await expect(page.locator('.exception-count')).toContainText('5');

    // 7. 验证阶段3: AI 深度审计
    await expect(page.locator('.phase-analysis')).toHaveAttribute('data-status', 'running');
    await expect(page.locator('.analysis-log')).toBeVisible();
    await expect(page.locator('.ai-suggestions')).toBeVisible();

    // 8. 验证阶段4: 成果输出
    await expect(page.locator('.phase-generating')).toHaveAttribute('data-status', 'running');
    await expect(page.locator('.audit-report')).toBeVisible();

    // 9. 验证完成状态
    await expect(page.locator('.workflow-status')).toHaveText('审计完成');
  });

  test('断点续传功能', async ({ page }) => {
    await page.goto('/audit');

    // 启动审计后，在第二阶段暂停
    // ... 上传文件和启动流程 ...

    // 点击暂停
    await page.locator('button:has-text("暂停")').click();

    // 验证状态
    await expect(page.locator('.workflow-status')).toHaveText('已暂停');

    // 刷新页面
    await page.reload();

    // 验证可以从断点恢复
    await expect(page.locator('.resume-prompt')).toBeVisible();
    await page.locator('button:has-text("继续")').click();

    // 验证从暂停点继续执行
    await expect(page.locator('.phase-prefilter')).toHaveAttribute('data-status', 'running');
  });
});
```

#### 场景 3: 错误处理和自愈

```typescript
// e2e/error-handling.spec.ts

test.describe('错误处理和自愈', () => {
  test('列名错误自动修复', async ({ page }) => {
    await page.goto('/');

    // 上传包含列名拼写错误的数据
    await page.locator('input[type="file"][accept=".xlsx"]')
      .setInputFiles('test-files/typo-data.xlsx');

    await page.locator('input[type="file"][accept=".docx"]')
      .setInputFiles('test-files/template.docx');

    await page.locator('textarea').fill('生成文档');
    await page.locator('button:has-text("生成")').click();

    // 观察自愈过程
    await expect(page.locator('.error-notification')).toBeVisible();
    await expect(page.locator('.error-notification')).toContainText('列名未找到');

    // 等待自动重试
    await expect(page.locator('.auto-retry-message')).toBeVisible();
    await expect(page.locator('.auto-retry-message')).toContainText('正在自动修复');

    // 验证修复成功
    await expect(page.locator('.success-message')).toBeVisible({ timeout: 60000 });
    await expect(page.locator('.success-message')).toContainText('已自动修复');
  });

  test('用户介入修复', async ({ page }) => {
    await page.goto('/');

    // 上传会导致无法自动修复错误的文件
    await page.locator('input[type="file"][accept=".xlsx"]')
      .setInputFiles('test-files/critical-error.xlsx');

    await page.locator('input[type="file"][accept=".docx"]')
      .setInputFiles('test-files/template.docx');

    await page.locator('textarea').fill('生成文档');
    await page.locator('button:has-text("生成")').click();

    // 验证显示用户介入提示
    await expect(page.locator('.manual-intervention-required')).toBeVisible();
    await expect(page.locator('.manual-intervention-required')).toContainText(
      '需要您的帮助'
    );

    // 用户手动修复
    await page.locator('.manual-fix-button').click();
    await page.locator('.fix-dialog').isVisible();

    // 选择正确的列
    await page.locator('.column-selector').selectOption('product_name_corrected');

    // 提交修复
    await page.locator('button:has-text("应用修复")').click();

    // 验证继续执行
    await expect(page.locator('.execution-progress')).toHaveAttribute('data-status', 'running');
  });
});
```

#### 场景 4: Function Calling

```typescript
// e2e/function-calling.spec.ts

test.describe('Function Calling 功能', () => {
  test('自然语言触发工具调用', async ({ page }) => {
    await page.goto('/chat');

    // 用户输入自然语言指令
    await page.locator('.chat-input').fill(
      '帮我检查一下报销数据里有没有超过5000元的异常记录'
    );
    await page.locator('button:has-text("发送")').click();

    // 验证 AI 识别出需要调用工具
    await expect(page.locator('.tool-call-detection')).toBeVisible();
    await expect(page.locator('.tool-call-detection')).toContainText('detect_anomalies');

    // 验证工具调用参数
    await expect(page.locator('.tool-call-params')).toBeVisible();
    await expect(page.locator('.tool-call-params')).toContainText('amount > 5000');

    // 验证工具执行结果
    await expect(page.locator('.tool-result')).toBeVisible();
    await expect(page.locator('.tool-result')).toContainText('23');

    // 验证 AI 的总结回复
    await expect(page.locator('.ai-response')).toContainText('发现了 23 笔');
  });

  test('多工具链式调用', async ({ page }) => {
    await page.goto('/chat');

    // 复杂指令需要多个工具
    await page.locator('.chat-input').fill(
      '分析 Excel 结构，然后生成审计报告'
    );
    await page.locator('button:has-text("发送")').click();

    // 验证第一个工具调用
    await expect(page.locator('.tool-call-1')).toContainText('analyze_excel_structure');
    await expect(page.locator('.tool-call-1 .status')).toHaveText('completed');

    // 验证第二个工具调用
    await expect(page.locator('.tool-call-2')).toContainText('generate_audit_report');
    await expect(page.locator('.tool-call-2 .status')).toHaveText('completed');

    // 验证最终结果
    await expect(page.locator('.final-result')).toBeVisible();
  });
});
```

### 3.2 集成测试策略

#### 测试分层

```
┌─────────────────────────────────────────────────────────┐
│                    E2E 测试                               │
│  - Playwright                                            │
│  - 真实浏览器环境                                         │
│  - 完整用户流程                                           │
│  - 覆盖率: 核心路径 100%                                  │
└─────────────────────────────────────────────────────────┘
                          ↑
┌─────────────────────────────────────────────────────────┐
│                    集成测试                               │
│  - Jest + Supertest                                      │
│  - 真实后端服务                                           │
│  - Mock 外部依赖 (AI、文件系统)                           │
│  - 覆盖率: API 端点 90%                                   │
└─────────────────────────────────────────────────────────┘
                          ↑
┌─────────────────────────────────────────────────────────┐
│                    单元测试                               │
│  - Jest                                                  │
│  - 隔离测试单个函数/类                                    │
│  - 全部 Mock                                             │
│  - 覆盖率: 代码 85%                                       │
└─────────────────────────────────────────────────────────┘
```

#### API 集成测试

```typescript
// integration/api/workspace.spec.ts

import request from 'supertest';
import app from '../../app';

describe('Workspace API Integration Tests', () => {
  let authToken: string;

  beforeAll(async () => {
    // 登录获取令牌
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'test', password: 'test' });
    authToken = response.body.data.token;
  });

  describe('POST /api/workspace/mount', () => {
    it('should mount file successfully', async () => {
      const response = await request(app)
        .post('/api/v1/workspace/mount')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          fileId: 'file123',
          role: 'source'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: expect.any(String),
        fileId: 'file123',
        role: 'source',
        mountedAt: expect.any(String)
      });
    });

    it('should return 400 for invalid role', async () => {
      const response = await request(app)
        .post('/api/v1/workspace/mount')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          fileId: 'file123',
          role: 'invalid_role'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/workspace/files', () => {
    it('should return list of mounted files', async () => {
      const response = await request(app)
        .get('/api/v1/workspace/files')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});
```

#### 服务集成测试

```typescript
// integration/services/fourPhase.spec.ts

import { FourPhaseOrchestrator } from '../../services/agentic/fourPhaseOrchestrator';
import { mockAIResponse } from '../mocks/aiService';

describe('Four Phase Orchestrator Integration', () => {
  let orchestrator: FourPhaseOrchestrator;

  beforeEach(() => {
    orchestrator = new FourPhaseOrchestrator({
      aiService: mockAIResponse,
      enableAutoRepair: true
    });
  });

  it('should execute complete workflow', async () => {
    const request = {
      userPrompt: '核对账簿和银行流水',
      files: [
        { fileName: 'ledger.xlsx', path: '/data/ledger.xlsx' },
        { fileName: 'bank.xlsx', path: '/data/bank.xlsx' }
      ]
    };

    const result = await orchestrator.executeWorkflow(request);

    expect(result.success).toBe(true);
    expect(result.stages).toHaveLength(4);
    expect(result.stages[0].name).toBe('scouting');
    expect(result.stages[0].status).toBe('completed');
    expect(result.stages[3].name).toBe('generating');
    expect(result.stages[3].status).toBe('completed');
  });

  it('should pause and resume workflow', async () => {
    const request = {
      userPrompt: '核对账簿',
      files: [{ fileName: 'ledger.xlsx', path: '/data/ledger.xlsx' }],
      options: { pauseAfterStage: 'prefilter' }
    };

    // 启动工作流
    const workflow = await orchestrator.executeWorkflow(request);
    expect(workflow.status).toBe('paused');

    // 恢复工作流
    const resumed = await orchestrator.resumeWorkflow(workflow.id);
    expect(resumed.status).toBe('completed');
  });

  it('should handle errors and auto-repair', async () => {
    // Mock AI 返回错误代码
    mockAIResponse.shouldFail = true;

    const request = {
      userPrompt: '生成文档',
      files: [{ fileName: 'data.xlsx', path: '/data/data.xlsx' }]
    };

    const result = await orchestrator.executeWorkflow(request);

    expect(result.repairAttempts).toBeGreaterThan(0);
    expect(result.success).toBe(true);
  });
});
```

### 3.3 性能测试基准

#### 性能指标

```typescript
// performance/benchmarks.ts

interface PerformanceBenchmark {
  name: string;
  target: number; // 目标值（毫秒）
  actual: number; // 实际值
  status: 'pass' | 'fail';
}

const benchmarks: PerformanceBenchmark[] = [
  // 文件上传
  {
    name: '10MB 文件上传时间',
    target: 5000,
    actual: 0,
    status: 'fail'
  },
  {
    name: '50MB 文件上传时间',
    target: 20000,
    actual: 0,
    status: 'fail'
  },

  // 侦察阶段
  {
    name: 'Excel 侦察 (1000行)',
    target: 3000,
    actual: 0,
    status: 'fail'
  },
  {
    name: 'Excel 侦察 (10000行)',
    target: 10000,
    actual: 0,
    status: 'fail'
  },
  {
    name: 'Word 侦察 (10页)',
    target: 2000,
    actual: 0,
    status: 'fail'
  },

  // AI 分析
  {
    name: 'AI 语义分析 (简单)',
    target: 5000,
    actual: 0,
    status: 'fail'
  },
  {
    name: 'AI 语义分析 (复杂)',
    target: 15000,
    actual: 0,
    status: 'fail'
  },

  // 文档生成
  {
    name: '生成单个文档',
    target: 1000,
    actual: 0,
    status: 'fail'
  },
  {
    name: '批量生成 100 文档',
    target: 30000,
    actual: 0,
    status: 'fail'
  },

  // 完整工作流
  {
    name: '端到端工作流 (小规模)',
    target: 30000,
    actual: 0,
    status: 'fail'
  },
  {
    name: '端到端工作流 (大规模)',
    target: 120000,
    actual: 0,
    status: 'fail'
  }
];

// 性能测试脚本
describe('Performance Benchmarks', () => {
  benchmarks.forEach(benchmark => {
    it(`should meet benchmark: ${benchmark.name}`, async () => {
      const startTime = Date.now();

      // 执行测试
      await runBenchmark(benchmark.name);

      const actual = Date.now() - startTime;
      benchmark.actual = actual;
      benchmark.status = actual <= benchmark.target ? 'pass' : 'fail';

      if (benchmark.status === 'fail') {
        console.warn(`Benchmark failed: ${benchmark.name}`);
        console.warn(`  Target: ${benchmark.target}ms`);
        console.warn(`  Actual: ${actual}ms`);
      }

      expect(actual).toBeLessThanOrEqual(benchmark.target);
    });
  });
});
```

#### 负载测试

```typescript
// performance/load-test.ts

import { check } from 'k6';
import http from 'k6/http';

export let options = {
  stages: [
    { duration: '1m', target: 10 },   // 1分钟爬升到10用户
    { duration: '3m', target: 10 },   // 维持10用户3分钟
    { duration: '1m', target: 50 },   // 1分钟爬升到50用户
    { duration: '3m', target: 50 },   // 维持50用户3分钟
    { duration: '1m', target: 0 },    // 1分钟降到0
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95%请求在2秒内
    http_req_failed: ['rate<0.05'],    // 错误率<5%
  },
};

export default function () {
  // 模拟文件上传
  const file = open('./test-files/data.xlsx', 'b');
  const uploadRes = http.post('http://localhost:3000/api/v1/files/upload', {
    file: http.file(file, 'data.xlsx'),
  });

  check(uploadRes, {
    'upload status is 200': (r) => r.status === 200,
    'upload time < 5s': (r) => r.timings.duration < 5000,
  });

  // 模拟创建任务
  const taskRes = http.post('http://localhost:3000/api/v1/tasks', JSON.stringify({
    templateFile: '...',
    dataFiles: ['...'],
    userInstruction: '生成文档'
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(taskRes, {
    'task created': (r) => r.status === 201,
  });

  // 等待任务完成
  const taskId = taskRes.json('data.taskId');
  const statusRes = http.get(`http://localhost:3000/api/v1/tasks/${taskId}/status`);

  check(statusRes, {
    'status retrieved': (r) => r.status === 200,
  });
}
```

---

## 📅 第四部分：实施路线图

### 4.1 与前端、后端的任务协同

#### Phase 1: 基础增强（2-3周）

**目标**: 夯实基础能力，为高级功能铺路

| 周次 | 前端任务 | 后端任务 | 全栈协调任务 |
|-----|---------|---------|-------------|
| **第1周** | 1. 设计虚拟工作台 UI<br>2. 实现文件拖放组件<br>3. 文件角色选择器 | 1. 扩展 FileSystemService<br>2. 实现文件角色标记<br>3. 创建文件关系图谱 | 1. 定义 API 契约<br>2. 设置 CI/CD 流水线<br>3. 建立前后端联调机制 |
| **第2周** | 1. 实现文件预览组件<br>2. Sheet 选择器增强<br>3. 响应式布局优化 | 1. Excel 侦察兵增强<br>2. 数据类型推断<br>3. 模式检测 | 1. API 端点开发<br>2. WebSocket 连接测试<br>3. 集成测试编写 |
| **第3周** | 1. 工作区状态管理<br>2. 错误处理 UI<br>3. 用户反馈机制 | 1. Word 侦察兵实现<br>2. Prompt 增强服务<br>3. 缓存优化 | 1. 端到端测试<br>2. 性能基准测试<br>3. 文档更新 |

**里程碑**:
- ✅ 虚拟工作台可用
- ✅ 侦察兵功能完整
- ✅ 前后端 API 对接完成

---

#### Phase 2: 核心功能（3-4周）

**目标**: 实现四阶段执行模型和数据流编排

| 周次 | 前端任务 | 后端任务 | 全栈协调任务 |
|-----|---------|---------|-------------|
| **第4周** | 1. 四阶段进度可视化<br>2. 实时日志流组件<br>3. 性能指标展示 | 1. 数据流编排器<br>2. Pipeline 引擎<br>3. 检查点机制 | 1. 工作流 API 设计<br>2. SSE/WebSocket 实现<br>3. 状态同步机制 |
| **第5周** | 1. 断点续传 UI<br>2. 审计轨迹查看器<br>3. 阶段结果展示 | 1. 四阶段总控引擎<br>2. OTAE 循环融合<br>3. 阶段状态管理 | 1. 工作流状态机<br>2. 事件总线集成<br>3. 集成测试 |
| **第6周** | 1. 映射编辑器增强<br>2. 数据预览优化<br>3. 实时反馈 UI | 1. 自愈逻辑引擎<br>2. 错误分类系统<br>3. 自动重试机制 | 1. 错误处理统一<br>2. 降级策略实现<br>3. 端到端测试 |
| **第7周** | 1. 用户体验优化<br>2. 性能监控面板<br>3. 帮助文档 | 1. 性能优化<br>2. 内存管理<br>3. 并发控制 | 1. 性能调优<br>2. 负载测试<br>3. 安全审计 |

**里程碑**:
- ✅ 四阶段工作流可用
- ✅ 自愈逻辑生效
- ✅ 用户体验显著提升

---

#### Phase 3: 高级功能（3-4周）

**目标**: 打造差异化竞争力

| 周次 | 前端任务 | 后端任务 | 全栈协调任务 |
|-----|---------|---------|-------------|
| **第8周** | 1. Function Calling UI<br>2. 智能对话界面<br>3. 工具调用可视化 | 1. Function Calling 适配器<br>2. 工具注册表<br>3. 调用链管理 | 1. Function Calling API<br>2. 工具调用监控<br>3. 安全验证 |
| **第9周** | 1. 内控三维校验视图<br>2. 异常预审仪表板<br>3. 风险评分展示 | 1. 内控预审引擎<br>2. 规则解析器<br>3. 异常检测器 | 1. 预审 API 设计<br>2. 规则管理界面<br>3. 集成测试 |
| **第10周** | 1. 高级图表组件<br>2. 数据可视化增强<br>3. 导出功能 | 1. Python-docx 集成<br>2. 高级文档生成<br>3. 模板管理 | 1. 文档生成 API<br>2. 模板管理系统<br>3. 性能优化 |
| **第11周** | 1. 用户引导流程<br>2. 示例项目<br>3. 视频教程 | 1. 示例数据集<br>2. 最佳实践库<br>3. API 文档 | 1. 文档生成<br>2. 培训材料<br>3. 发布准备 |

**里程碑**:
- ✅ Function Calling 可用
- ✅ 内控预审完成
- ✅ 差异化竞争力形成

---

#### Phase 4: 完善优化（2-3周）

**目标**: 生产就绪，准备发布

| 周次 | 前端任务 | 后端任务 | 全栈协调任务 |
|-----|---------|---------|-------------|
| **第12周** | 1. 用户体验细节打磨<br>2. 无障碍功能<br>3. 国际化支持 | 1. 代码重构<br>2. 技术债务清理<br>3. 安全加固 | 1. 代码审查<br>2. 安全测试<br>3. 渗透测试 |
| **第13周** | 1. 性能优化<br>2. Bundle 优化<br>3. 加载优化 | 1. 数据库优化<br>2. 缓存策略调优<br>3. 监控完善 | 1. 性能调优<br>2. 压力测试<br>3. 容量规划 |
| **第14周** | 1. 最终测试<br>2. Bug 修复<br>3. 发布准备 | 1. 最终测试<br>2. Bug 修复<br>3. 部署脚本 | 1. 发布检查<br>2. 回滚计划<br>3. 上线 |

**里程碑**:
- ✅ 生产环境部署
- ✅ 监控告警就绪
- ✅ 正式发布 v2.0

---

### 4.2 里程碑定义

#### M1: 基础能力达成（第3周末）

**验收标准**:
- ✅ 虚拟工作台可用，支持文件上传和角色标记
- ✅ 侦察兵可分析 Excel 和 Word 文件
- ✅ 前后端 API 完整对接
- ✅ 集成测试覆盖率 > 80%

**演示场景**:
1. 上传 Excel 文件
2. 系统自动侦察，显示结构信息
3. 用户标记文件角色
4. 工作区显示文件关系

---

#### M2: 核心功能可用（第7周末）

**验收标准**:
- ✅ 四阶段工作流完整执行
- ✅ 自愈逻辑成功修复 > 70% 错误
- ✅ 断点续传功能可用
- ✅ 端到端测试通过率 100%

**演示场景**:
1. 用户启动审计工作流
2. 系统执行四阶段分析
3. 遇到错误自动修复
4. 用户可暂停/恢复
5. 最终生成审计报告

---

#### M3: 差异化竞争力形成（第11周末）

**验收标准**:
- ✅ Function Calling 识别并调用工具
- ✅ 内控预审检测异常
- ✅ 三维校验视图展示
- ✅ 用户满意度 > 4.0/5.0

**演示场景**:
1. 用户用自然语言描述需求
2. AI 识别需要调用工具
3. 自动执行异常检测
4. 生成可视化报告

---

#### M4: 生产就绪（第14周末）

**验收标准**:
- ✅ 所有测试通过
- ✅ 性能指标达标
- ✅ 安全扫描无高危漏洞
- ✅ 监控告警配置完成

**发布检查清单**:
- [ ] 代码审查完成
- [ ] 安全测试通过
- [ ] 性能测试通过
- [ ] 文档完整
- [ ] 监控配置
- [ ] 备份方案
- [ ] 回滚计划
- [ ] 发布公告

---

### 4.3 风险控制点

#### 高风险项

**1. Pyodide 内存限制** (风险等级: 🔴 高)

**风险描述**:
- 浏览器内存有限（通常 < 2GB）
- 大文件处理可能导致崩溃

**缓解措施**:
- ✅ 实施流式处理（分块读取）
- ✅ 显式内存清理
- ✅ 文件大小限制（建议 < 50MB）
- ✅ 提供降级方案（后端处理）

**监控指标**:
- 浏览器内存使用率
- 文件处理时间
- 崩溃率

**应急预案**:
1. 检测到内存压力 → 暂停处理
2. 提示用户使用后端模式
3. 自动切换到服务器处理

---

**2. AI 输出稳定性** (风险等级: 🟡 中)

**风险描述**:
- AI 生成的代码可能不正确
- 需要多轮迭代

**缓解措施**:
- ✅ 自愈逻辑
- ✅ Few-Shot 示例
- ✅ 输出验证
- ✅ 人工确认机制

**监控指标**:
- 首次生成成功率
- 平均重试次数
- 用户修复率

**应急预案**:
1. 连续失败 3 次 → 暂停并请求用户介入
2. 提供"手动编辑"选项
3. 记录失败案例用于改进

---

**3. Function Calling 复杂度** (风险等级: 🟡 中)

**风险描述**:
- 工具调用链可能很复杂
- 错误处理难度大

**缓解措施**:
- ✅ 渐进式实施
- ✅ 充分的测试
- ✅ 详细的日志
- ✅ 人工干预机制

**监控指标**:
- 工具调用成功率
- 平均调用链长度
- 错误恢复率

**应急预案**:
1. 调用链过长 → 强制中断并请求确认
2. 工具失败 → 提供替代方案
3. 记录完整调用轨迹用于调试

---

#### 中风险项

**4. WebSocket 连接稳定性** (风险等级: 🟡 中)

**风险描述**:
- 网络波动导致连接断开
- 重连可能丢失消息

**缓解措施**:
- ✅ 心跳检测
- ✅ 自动重连
- ✅ 消息确认机制
- ✅ SSE 备选方案

**监控指标**:
- 连接断开频率
- 重连成功率
- 消息丢失率

---

**5. 前后端状态同步** (风险等级: 🟡 中)

**风险描述**:
- 前后端状态不一致
- 竞态条件

**缓解措施**:
- ✅ 单一数据源（后端）
- ✅ 乐观更新 + 回滚
- ✅ 版本控制
- ✅ 冲突解决策略

**监控指标**:
- 状态不一致次数
- 同步延迟
- 冲突解决成功率

---

#### 低风险项

**6. UI 响应性能** (风险等级: 🟢 低)

**风险描述**:
- 大数据量渲染卡顿
- 交互延迟

**缓解措施**:
- ✅ 虚拟滚动
- ✅ 懒加载
- ✅ 防抖/节流
- ✅ Web Worker

**监控指标**:
- 页面加载时间
- 交互响应时间
- FPS

---

## 📊 第五部分：成功指标与监控

### 5.1 技术指标

| 指标类别 | 指标名称 | 当前值 | 目标值 | 测量方式 |
|---------|---------|--------|--------|---------|
| **可靠性** | 代码生成成功率 | ~60% | >85% | 统计首次执行成功率 |
| | 自愈修复率 | 0% | >70% | 统计自动修复成功次数 |
| | 系统可用性 | N/A | >99.5% | Uptime 监控 |
| **性能** | 文件上传时间 (10MB) | N/A | <5s | 性能测试 |
| | 侦察时间 (1000行) | N/A | <3s | 性能测试 |
| | AI 分析时间 | N/A | <15s | 性能测试 |
| | 端到端工作流时间 | N/A | <30s | 端到端测试 |
| **质量** | 代码覆盖率 | ~30% | >85% | Jest 覆盖率报告 |
| | 集成测试覆盖率 | 0% | >90% | 集成测试报告 |
| | E2E 测试覆盖率 | 0% | 100% (核心路径) | E2E 测试报告 |
| **安全** | 高危漏洞 | 0 | 0 | 安全扫描 |
| | 依赖漏洞 | N/A | 0 | npm audit |

### 5.2 业务指标

| 指标名称 | 目标值 | 测量方式 |
|---------|--------|---------|
| 用户满意度 | >4.0/5.0 | 用户调研 |
| 功能使用率 | >60% | 行为分析 |
| 审计效率提升 | +200% | 用户反馈 |
| 错误减少率 | >80% | 用户反馈 |
| 用户留存率 | >80% | 用户分析 |

### 5.3 监控方案

#### 前端监控

```typescript
// services/monitoring/frontend.ts

class FrontendMonitoring {
  /**
   * 记录用户行为
   */
  trackEvent(event: string, properties?: Record<string, any>): void {
    // 发送到分析平台（如 Google Analytics, Mixpanel）
    if (window.analytics) {
      window.analytics.track(event, properties);
    }
  }

  /**
   * 记录性能指标
   */
  trackPerformance(metricName: string, value: number): void {
    // 发送到监控平台（如 Datadog, New Relic）
    if (window.performanceMonitor) {
      window.performanceMonitor.record(metricName, value);
    }

    // Web Vitals
    if (metricName === 'FCP' || metricName === 'LCP' || metricName === 'CLS') {
      console.log(`[Performance] ${metricName}: ${value}ms`);
    }
  }

  /**
   * 记录错误
   */
  trackError(error: Error, context?: Record<string, any>): void {
    // 发送到错误追踪平台（如 Sentry, Bugsnag）
    if (window.Sentry) {
      window.Sentry.captureException(error, {
        tags: context,
        extra: { stack: error.stack }
      });
    }

    // 本地日志
    console.error('[Error]', error, context);
  }

  /**
   * 记录页面浏览
   */
  trackPageView(page: string): void {
    this.trackEvent('page_view', { page });
  }
}

export const monitoring = new FrontendMonitoring();

// 使用示例
monitoring.trackEvent('file_uploaded', {
  fileType: 'excel',
  fileSize: 1024000
});

monitoring.trackPerformance('file_upload_time', 1234);

try {
  // some code
} catch (error) {
  monitoring.trackError(error, { component: 'VirtualWorkspace' });
}
```

#### 后端监控

```typescript
// services/monitoring/backend.ts

import { Logger } from 'winston';

class BackendMonitoring {
  private logger: Logger;

  constructor() {
    this.logger = createLogger({
      level: 'info',
      format: format.json(),
      transports: [
        new transports.File({ filename: 'logs/error.log', level: 'error' }),
        new transports.File({ filename: 'logs/combined.log' })
      ]
    });
  }

  /**
   * 记录 API 请求
   */
  logRequest(req: any, res: any, duration: number): void {
    this.logger.info('API Request', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 记录业务事件
   */
  logEvent(event: string, data: any): void {
    this.logger.info('Business Event', {
      event,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 记录性能指标
   */
  logMetric(metricName: string, value: number, tags?: Record<string, string>): void {
    // 发送到时序数据库（如 Prometheus, InfluxDB）
    this.logger.info('Metric', {
      metric: metricName,
      value,
      tags,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 记录错误
   */
  logError(error: Error, context?: Record<string, any>): void {
    this.logger.error('Error', {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 记录工作流阶段
   */
  logWorkflowStage(workflowId: string, stage: string, status: string, duration?: number): void {
    this.logEvent('workflow_stage', {
      workflowId,
      stage,
      status,
      duration
    });
  }
}

export const monitoring = new BackendMonitoring();

// 使用示例
monitoring.logEvent('task_created', {
  taskId: 'task123',
  userId: 'user456'
});

monitoring.logMetric('task_completion_time', 15000, {
  task_type: 'audit'
});

monitoring.logWorkflowStage('wf1', 'scouting', 'completed', 3000);
```

#### 告警规则

```yaml
# monitoring/alerts.yaml

groups:
  - name: api_alerts
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: rate(api_errors_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "API 错误率过高"
          description: "5分钟内错误率 > 5%"

      - alert: SlowResponseTime
        expr: histogram_quantile(0.95, api_request_duration_seconds) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "API 响应时间过长"
          description: "95分位响应时间 > 2秒"

  - name: workflow_alerts
    interval: 1m
    rules:
      - alert: WorkflowFailureRate
        expr: rate(workflow_failures_total[10m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "工作流失败率过高"
          description: "10分钟内失败率 > 10%"

      - alert: WorkflowTimeout
        expr: workflow_timeouts_total > 5
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "工作流超时次数过多"
          description: "1分钟内超时 > 5次"

  - name: system_alerts
    interval: 1m
    rules:
      - alert: HighMemoryUsage
        expr: process_resident_memory_bytes / 1024 / 1024 > 1024
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "内存使用率过高"
          description: "内存使用 > 1GB"

      - alert: HighCPUUsage
        expr: rate(process_cpu_seconds_total[5m]) * 100 > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "CPU 使用率过高"
          description: "CPU 使用率 > 80%"
```

---

## 🎯 第六部分：总结与下一步

### 核心价值

本全栈集成计划提供了**端到端的协调方案**，确保前后端无缝协作：

1. **系统集成** - 从数据库到 UI 的完整数据流设计
2. **用户体验** - 四阶段可视化、实时反馈、断点续传
3. **系统可靠性** - 统一错误处理、自愈逻辑、降级策略
4. **可扩展性** - Function Calling 机制、事件总线、插件系统

### 实施建议

#### 必须实施 (P0)
1. ✅ 虚拟工作台 API + UI
2. ✅ 四阶段工作流引擎 + 可视化
3. ✅ 侦察兵服务增强
4. ✅ 统一错误处理
5. ✅ 自愈逻辑引擎

#### 应该实施 (P1)
1. ⭐ Function Calling 适配器 + UI
2. ⭐ 内控预审引擎
3. ⭐ 实时通信机制
4. ⭐ 性能优化

#### 可以延后 (P2)
1. 💡 高级图表功能
2. 💡 多语言支持
3. 💡 插件系统

### 下一步行动

#### 立即执行
1. **全栈团队同步会议** (1小时)
   - 审查本计划
   - 分配任务
   - 确认优先级

2. **建立协作机制** (第1周)
   - 设置前后端联调环境
   - 配置 CI/CD 流水线
   - 建立每日站会

3. **启动 Phase 1** (第1周)
   - 前端：虚拟工作台 UI 设计
   - 后端：FileSystemService 扩展
   - 全栈：API 契约定义

#### 本周目标
- [ ] API 契约文档完成
- [ ] 虚拟工作台原型可演示
- [ ] 侦察兵 API 开发完成
- [ ] 第一次前后端联调成功

---

## 📁 附录：相关文档

### 架构文档
- 📄 `ARCHITECTURE.md` - 系统架构设计
- 📄 `API_SPECIFICATION.md` - REST API 规范
- 📄 `types/mappingSchemaV2.ts` - 类型定义

### 评估文档
- 📄 `PHASE2_COMPREHENSIVE_EVALUATION.md` - 综合评估
- 📄 `FRONTEND_OPTIMIZATION_SUMMARY.md` - 前端优化
- 📄 `BACKEND_OPTIMIZATION_GUIDE.md` - 后端优化

### 实施文档
- 📄 `FULLSTACK_INTEGRATION_PLAN.md` - 本文档
- 📄 `TESTING_STRATEGY.md` - 测试策略（待创建）
- 📄 `DEPLOYMENT_GUIDE.md` - 部署指南（待创建）

---

**文档版本**: v1.0
**生成日期**: 2026-01-24
**制定人**: 全栈技术负责人
**状态**: ✅ 全栈集成规划完成

🎯 **下一步**: 组织全栈团队同步会议，启动 Phase 1 实施。
