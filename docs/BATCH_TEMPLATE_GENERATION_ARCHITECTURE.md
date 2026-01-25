# 多模板文档生成系统 - 架构设计文档

## 文档版本

- **版本**: 2.0.0
- **日期**: 2025-01-25
- **作者**: 首席架构师
- **状态**: 架构设计完成

---

## 目录

1. [系统概述](#系统概述)
2. [架构设计原则](#架构设计原则)
3. [系统分层架构](#系统分层架构)
4. [核心模块设计](#核心模块设计)
5. [数据流向设计](#数据流向设计)
6. [批量任务调度](#批量任务调度)
7. [实时进度推送](#实时进度推送)
8. [性能优化策略](#性能优化策略)
9. [错误处理与容错](#错误处理与容错)
10. [可扩展性设计](#可扩展性设计)

---

## 系统概述

### 功能定位

多模板文档生成系统是ExcelMind AI的Phase 2核心功能，支持用户：

1. **模板管理**: 上传、配置、版本控制多个Word模板
2. **批量生成**: 选择多个模板和数据源，批量生成文档
3. **实时追踪**: WebSocket推送生成进度和状态
4. **历史管理**: 查看历史任务、重新生成、下载文档

### 核心能力

```
输入：
- 多个Word模板（.docx）
- Excel/CSV/JSON数据源
- 生成参数配置

输出：
- 批量生成的Word文档
- ZIP压缩包
- 实时进度更新
- 详细执行报告

特性：
✅ 并发生成（默认3个并发）
✅ 断点续传（任务暂停/恢复）
✅ 失败重试（自动重试机制）
✅ 内存优化（分批处理大文件）
✅ 实时推送（WebSocket）
```

### 技术约束

- **必须复用**现有的`docxtemplaterService`进行单个文档生成
- **必须支持**WebSocket实时进度推送
- **必须支持**并发生成（可配置并发数）
- **必须考虑**性能和内存管理

---

## 架构设计原则

### 1. 单一职责原则 (SRP)

每个模块只负责一个明确的功能：

```
TemplateManager          → 模板文件管理
BatchGenerationScheduler → 任务调度和编排
DocumentGenerator        → 单个文档生成（复用现有服务）
ProgressTracker          → 进度追踪和状态管理
GenerationHistoryManager → 历史记录管理
```

### 2. 开闭原则 (OCP)

对扩展开放，对修改关闭：

- **新增模板格式**: 实现`ITemplateParser`接口
- **新增数据源**: 实现`IDataSourceLoader`接口
- **新增输出方式**: 实现`IOutputHandler`接口
- **新增通知渠道**: 实现`INotificationChannel`接口

### 3. 依赖倒置原则 (DIP)

高层模块不依赖低层模块，都依赖抽象：

```typescript
// ✓ 正确：依赖接口
class BatchGenerationScheduler {
  constructor(
    private readonly generator: IDocumentGenerator,
    private readonly tracker: IProgressTracker,
    private readonly notifier: INotificationService
  ) {}
}

// ✗ 错误：依赖具体实现
class BatchGenerationScheduler {
  constructor(
    private readonly generator: DocxtemplaterService, // 具体类
    private readonly tracker: WebSocketProgressTracker // 具体类
  ) {}
}
```

### 4. 接口隔离原则 (ISP)

接口小而专注，不强迫实现不需要的方法：

```typescript
// ✓ 正确：小接口
interface IDocumentGenerator {
  generateSingle(context: GenerateContext): Promise<Blob>;
}

interface IBatchGenerator {
  generateBatch(context: BatchContext): Promise<Blob[]>;
}

// ✗ 错误：大而全的接口
interface IGenerator {
  generateSingle(): Promise<Blob>;
  generateBatch(): Promise<Blob[]>;
  manageTemplates(): void;
  trackProgress(): void;
  // ... 不相关的方法
}
```

### 5. 里氏替换原则 (LSP)

子类可以替换父类而不影响程序正确性：

```typescript
// 所有IDocumentGenerator的实现都可以互相替换
const generator: IDocumentGenerator =
  environment === 'production'
    ? new DocxtemplaterGenerator()
    : new MockGenerator();
```

---

## 系统分层架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         Presentation Layer                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              React UI Components                         │   │
│  │  - TemplateUploader                                      │   │
│  │  - BatchTaskConfigurator                                 │   │
│  │  - ProgressMonitor (Real-time)                           │   │
│  │  - HistoryViewer                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────┬───────────────────────────────────┘
                              │ REST API + WebSocket
┌─────────────────────────────▼───────────────────────────────────┐
│                         API Gateway Layer                       │
│  - Authentication (JWT)                                         │
│  - Rate Limiting                                                │
│  - Request Validation                                           │
│  - Response Formatting                                          │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                      Controller Layer                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ TemplateController│  │  BatchTask     │  │  History        │ │
│  │                 │  │  Controller    │  │  Controller     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                       Service Layer                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │            BatchGenerationService (门面)                  │   │
│  │  - 统一API接口                                            │   │
│  │  - 协调各子服务                                            │   │
│  │  - 事务管理                                               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐           │
│  │   Template   │ │   Batch      │ │  Progress    │           │
│  │   Manager    │ │  Scheduler   │ │   Tracker    │           │
│  └──────────────┘ └──────────────┘ └──────────────┘           │
│                                                                  │
│  ┌──────────────┐ ┌──────────────┐                             │
│  │  Document    │ │   History    │                             │
│  │  Generator   │ │   Manager    │                             │
│  └──────────────┘ └──────────────┘                             │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                    Infrastructure Layer                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              DocxtemplaterService (复用)                   │  │
│  │  - generateWithDocxtemplater()                            │  │
│  │  - batchGenerateWithDocxtemplater()                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│  │  Storage    │ │   Cache     │ │  WebSocket  │              │
│  │  Service    │ │   Service   │ │   Service   │              │
│  └─────────────┘ └─────────────┘ └─────────────┘              │
│                                                                  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│  │    Queue    │ │   Logger    │ │    Event    │              │
│  │   Service   │ │   Service   │ │     Bus     │              │
│  └─────────────┘ └─────────────┘ └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 核心模块设计

### 1. TemplateManager (模板管理器)

**职责**: 管理模板文件的生命周期

**核心接口**:

```typescript
interface ITemplateManager {
  // 上传模板
  uploadTemplate(request: UploadTemplateRequest): Promise<UploadTemplateResponse>;

  // 获取模板配置
  getTemplate(templateId: string): Promise<TemplateConfig>;

  // 列出模板
  listTemplates(params: ListTemplatesParams): Promise<ListTemplatesResponse>;

  // 更新模板
  updateTemplate(request: UpdateTemplateRequest): Promise<void>;

  // 删除模板
  deleteTemplate(templateId: string): Promise<void>;

  // 验证模板
  validateTemplate(templateId: string): Promise<ValidationResult>;

  // 提取占位符
  extractPlaceholders(templateId: string): Promise<string[]>;
}
```

**关键方法实现**:

```typescript
class TemplateManager implements ITemplateManager {
  private storage: IStorageService;
  private cache: ICacheService;

  async uploadTemplate(request: UploadTemplateRequest): Promise<UploadTemplateResponse> {
    // 1. 验证文件格式
    const validation = await this.validateTemplateFile(request.file);
    if (!validation.valid) {
      throw new TemplateValidationError(validation.errors);
    }

    // 2. 提取占位符
    const placeholders = await this.extractPlaceholdersFromFile(request.file);

    // 3. 生成模板ID
    const templateId = this.generateTemplateId();

    // 4. 存储文件
    const fileUrl = await this.storage.store(
      `templates/${templateId}.docx`,
      request.file
    );

    // 5. 保存元数据
    const metadata: TemplateMetadata = {
      id: templateId,
      name: request.name,
      description: request.description,
      category: request.category,
      tags: request.tags || [],
      version: request.version || '1.0.0',
      status: TemplateStatus.ACTIVE,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      fileSize: request.file.size,
      placeholderCount: placeholders.length,
      complexity: validation.complexity
    };

    // 6. 缓存模板配置
    const config: TemplateConfig = {
      metadata,
      fileBuffer: await request.file.arrayBuffer(),
      placeholders,
      previewHtml: validation.previewHtml
    };

    await this.cache.set(`template:${templateId}`, config, 3600);

    return {
      templateId,
      metadata,
      placeholders,
      previewHtml: validation.previewHtml
    };
  }

  private async validateTemplateFile(file: File | ArrayBuffer): Promise<{
    valid: boolean;
    errors: string[];
    complexity: 'simple' | 'complex';
    previewHtml?: string;
  }> {
    // 复用现有的 TemplateValidator
    const buffer = file instanceof File
      ? await file.arrayBuffer()
      : file;

    return await TemplateValidator.validate(buffer);
  }

  private async extractPlaceholdersFromFile(
    file: File | ArrayBuffer
  ): Promise<string[]> {
    const buffer = file instanceof File
      ? await file.arrayBuffer()
      : file;

    return await TemplateValidator.extractPlaceholders(buffer);
  }
}
```

### 2. BatchGenerationScheduler (批量生成调度器)

**职责**: 任务调度、并发控制、进度管理

**核心接口**:

```typescript
interface IBatchGenerationScheduler {
  // 创建任务
  createTask(request: CreateBatchTaskRequest): Promise<CreateBatchTaskResponse>;

  // 启动任务
  startTask(taskId: string): Promise<void>;

  // 暂停任务
  pauseTask(taskId: string): Promise<void>;

  // 恢复任务
  resumeTask(taskId: string): Promise<void>;

  // 取消任务
  cancelTask(taskId: string): Promise<void>;

  // 获取任务状态
  getTaskStatus(taskId: string): Promise<TaskStatusResponse>;

  // 列出任务
  listTasks(filter?: TaskFilter): Promise<BatchGenerationTask[]>;
}
```

**调度逻辑**:

```typescript
class BatchGenerationScheduler implements IBatchGenerationScheduler {
  private generator: IDocumentGenerator;
  private tracker: IProgressTracker;
  private queue: ITaskQueue;
  private notifier: INotificationService;

  async createTask(
    request: CreateBatchTaskRequest
  ): Promise<CreateBatchTaskResponse> {
    // 1. 验证请求
    await this.validateRequest(request);

    // 2. 创建任务对象
    const task: BatchGenerationTask = {
      id: this.generateTaskId(),
      status: TaskStatus.PENDING,
      mode: request.mode,
      priority: request.priority || Priority.NORMAL,
      progress: 0,
      config: {
        templateIds: request.templateIds,
        dataSource: request.dataSource,
        parameters: request.parameters || {},
        output: request.output || { type: 'download' },
        options: request.options || {}
      },
      execution: {
        totalDocuments: 0,
        completedDocuments: 0,
        failedDocuments: 0,
        skippedDocuments: 0,
        currentBatch: 0,
        totalBatches: 0,
        currentIndex: 0,
        currentStage: GenerationStage.INITIALIZING
      },
      stats: {},
      timestamps: {
        createdAt: Date.now()
      }
    };

    // 3. 加入队列
    await this.queue.enqueue(task);

    // 4. 估算任务持续时间
    const estimatedDuration = await this.estimateDuration(task);

    return {
      taskId: task.id,
      status: task.status,
      estimatedDuration,
      estimatedCompletionAt: Date.now() + estimatedDuration
    };
  }

  async startTask(taskId: string): Promise<void> {
    const task = await this.queue.getTask(taskId);
    if (!task) {
      throw new TaskNotFoundError(taskId);
    }

    // 更新状态
    task.status = TaskStatus.RUNNING;
    task.timestamps.startedAt = Date.now();
    await this.queue.updateTask(task);

    // 通知
    await this.notifier.notify({
      type: 'status_changed',
      taskId,
      oldStatus: TaskStatus.PENDING,
      newStatus: TaskStatus.RUNNING,
      timestamp: Date.now()
    });

    // 启动调度循环
    this.runScheduleLoop(task);
  }

  private async runScheduleLoop(task: BatchGenerationTask): Promise<void> {
    try {
      // 1. 加载数据源
      const dataSource = await this.loadDataSource(task.config.dataSource);
      task.execution.totalDocuments = dataSource.length;
      task.execution.totalBatches = Math.ceil(
        dataSource.length / (task.config.options.batchSize || 10)
      );

      // 2. 加载模板
      const templates = await Promise.all(
        task.config.templateIds.map(id => this.templateManager.getTemplate(id))
      );

      // 3. 开始分批处理
      const concurrency = task.config.options.concurrency || 3;
      const batchSize = task.config.options.batchSize || 10;

      for (let i = 0; i < dataSource.length; i += batchSize * concurrency) {
        // 检查任务状态
        if (task.status === TaskStatus.PAUSED) {
          await this.waitForResume(task);
        } else if (task.status === TaskStatus.CANCELLED) {
          break;
        }

        // 处理当前批次
        const batch = dataSource.slice(i, i + batchSize * concurrency);
        await this.processBatch(task, batch, templates, concurrency);
      }

      // 4. 完成任务
      await this.completeTask(task);

    } catch (error) {
      await this.failTask(task, error);
    }
  }

  private async processBatch(
    task: BatchGenerationTask,
    batch: Array<Record<string, any>>,
    templates: TemplateConfig[],
    concurrency: number
  ): Promise<void> {
    task.execution.currentBatch++;
    task.execution.currentStage = GenerationStage.GENERATING_DOCUMENTS;

    // 分批并发处理
    for (let i = 0; i < batch.length; i += concurrency) {
      const concurrentBatch = batch.slice(i, i + concurrency);

      const promises = concurrentBatch.map(async (data, index) => {
        const globalIndex = task.execution.currentIndex + index;
        return await this.generateDocument(
          task,
          data,
          templates,
          globalIndex
        );
      });

      await Promise.all(promises);

      task.execution.currentIndex += concurrentBatch.length;

      // 更新进度
      task.progress = Math.floor(
        (task.execution.currentIndex / task.execution.totalDocuments) * 100
      );

      // 推送进度
      await this.tracker.updateProgress(task.id, task.progress, {
        stage: task.execution.currentStage,
        message: `正在生成文档 ${task.execution.currentIndex}/${task.execution.totalDocuments}`
      });
    }
  }

  private async generateDocument(
    task: BatchGenerationTask,
    data: Record<string, any>,
    templates: TemplateConfig[],
    dataIndex: number
  ): Promise<DocumentGenerationResult> {
    const results: DocumentGenerationResult[] = [];

    // 根据模式生成文档
    for (const template of templates) {
      try {
        // 复用现有的 docxtemplaterService
        const blob = await this.generator.generate({
          templateBuffer: template.fileBuffer,
          data,
          options: {
            fileName: this.generateFileName(task, template, data, dataIndex)
          }
        });

        results.push({
          id: this.generateDocumentId(),
          taskId: task.id,
          templateId: template.metadata.id,
          dataIndex,
          status: 'success',
          output: {
            blob,
            fileName: this.generateFileName(task, template, data, dataIndex),
            fileSize: blob.size
          },
          inputData: data,
          generatedAt: Date.now()
        });

        task.execution.completedDocuments++;

      } catch (error) {
        task.execution.failedDocuments++;

        results.push({
          id: this.generateDocumentId(),
          taskId: task.id,
          templateId: template.metadata.id,
          dataIndex,
          status: 'failed',
          error: {
            code: error.code,
            message: error.message
          }
        });

        // 检查是否继续
        if (!task.config.options.continueOnError) {
          throw error;
        }
      }
    }

    return results[0];
  }
}
```

### 3. DocumentGenerator (文档生成器)

**职责**: 封装docxtemplaterService，提供统一接口

**核心接口**:

```typescript
interface IDocumentGenerator {
  generateSingle(context: GenerateContext): Promise<Blob>;
  generateBatch(context: BatchContext): Promise<Blob[]>;
}

interface GenerateContext {
  templateBuffer: ArrayBuffer;
  data: Record<string, any>;
  options?: {
    fileName?: string;
    imageOptions?: ImageOptions;
    parserOptions?: ParserOptions;
  };
}
```

**实现**:

```typescript
class DocumentGenerator implements IDocumentGenerator {
  // 复用现有的 docxtemplaterService
  async generateSingle(context: GenerateContext): Promise<Blob> {
    return await generateWithDocxtemplater({
      templateBuffer: context.templateBuffer,
      data: context.data,
      imageOptions: context.options?.imageOptions,
      parserOptions: context.options?.parserOptions
    });
  }

  async generateBatch(context: BatchContext): Promise<Blob[]> {
    const { templateBuffer, dataList, options } = context;

    // 复用现有的批量生成方法
    const result = await batchGenerateWithDocxtemplater({
      templateBuffer,
      dataList,
      baseFileName: options?.baseFileName || 'document',
      concurrency: options?.concurrency || 3,
      imageOptions: options?.imageOptions,
      parserOptions: options?.parserOptions
    });

    return result.documents.map(doc => doc.blob);
  }
}
```

### 4. ProgressTracker (进度追踪器)

**职责**: 追踪任务进度，通过WebSocket推送更新

**核心接口**:

```typescript
interface IProgressTracker {
  updateProgress(taskId: string, progress: number, metadata?: ProgressMetadata): Promise<void>;
  completeTask(taskId: string, result: BatchGenerationResult): Promise<void>;
  failTask(taskId: string, error: TaskError): Promise<void>;
  subscribe(taskId: string, callback: ProgressCallback): () => void; // 返回取消订阅函数
}

interface ProgressMetadata {
  stage: GenerationStage;
  message?: string;
  documentId?: string;
}

type ProgressCallback = (event: WebSocketEvent) => void;
```

**实现**:

```typescript
class ProgressTracker implements IProgressTracker {
  private webSocketService: IWebSocketService;
  private cache: ICacheService;
  private subscribers: Map<string, Set<ProgressCallback>>;

  async updateProgress(
    taskId: string,
    progress: number,
    metadata?: ProgressMetadata
  ): Promise<void> {
    // 1. 更新缓存
    await this.cache.set(
      `progress:${taskId}`,
      { progress, ...metadata },
      300 // 5分钟过期
    );

    // 2. 推送WebSocket事件
    const event: ProgressUpdateEvent = {
      type: 'progress',
      taskId,
      progress,
      stage: metadata?.stage || GenerationStage.GENERATING_DOCUMENTS,
      message: metadata?.message,
      timestamp: Date.now()
    };

    await this.webSocketService.broadcast(taskId, event);

    // 3. 通知本地订阅者
    const callbacks = this.subscribers.get(taskId);
    if (callbacks) {
      callbacks.forEach(callback => callback(event));
    }
  }

  subscribe(taskId: string, callback: ProgressCallback): () => void {
    if (!this.subscribers.has(taskId)) {
      this.subscribers.set(taskId, new Set());
    }

    this.subscribers.get(taskId)!.add(callback);

    // 返回取消订阅函数
    return () => {
      const callbacks = this.subscribers.get(taskId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscribers.delete(taskId);
        }
      }
    };
  }
}
```

### 5. GenerationHistoryManager (历史记录管理器)

**职责**: 管理任务历史记录

**核心接口**:

```typescript
interface IGenerationHistoryManager {
  saveHistory(task: BatchGenerationTask, result: BatchGenerationResult): Promise<void>;
  getHistory(params: HistoryQueryParams): Promise<HistoryListResponse>;
  getHistoryItem(taskId: string): Promise<GenerationHistoryItem>;
  deleteHistoryItem(taskId: string): Promise<void>;
  regenerate(taskId: string): Promise<string>; // 返回新任务ID
}
```

---

## 数据流向设计

### 完整的批量生成流程

```
┌─────────────────────────────────────────────────────────────┐
│                    1. 用户发起请求                           │
│  POST /api/v1/batch/tasks                                   │
│  {                                                           │
│    "mode": "multi_template",                                │
│    "templateIds": ["tpl_1", "tpl_2"],                       │
│    "dataSource": { ... },                                   │
│    "options": { "concurrency": 3 }                          │
│  }                                                           │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              2. BatchGenerationService                       │
│  - 验证请求                                                   │
│  - 创建任务对象                                               │
│  - 加入任务队列                                               │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              3. TaskQueue                                    │
│  - 按优先级排序                                               │
│  - 检查并发限制                                               │
│  - 分配任务执行器                                             │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              4. BatchGenerationScheduler                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  4.1 加载数据源                                         │ │
│  │      - Excel/CSV/JSON → Array<Object>                   │ │
│  │      - 应用筛选条件                                      │ │
│  │      - 计算总文档数                                      │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  4.2 加载模板                                           │ │
│  │      - 从存储加载模板文件                               │ │
│  │      - 验证模板有效性                                   │ │
│  │      - 提取占位符                                       │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  4.3 分批处理                                           │ │
│  │      for each batch:                                    │ │
│  │        - 并发生成文档（concurrency=3）                  │ │
│  │        - 更新进度                                       │ │
│  │        - 推送WebSocket事件                              │ │
│  │        - 处理失败重试                                   │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              5. DocumentGenerator (复用)                     │
│  - 调用 docxtemplaterService.generateWithDocxtemplater()    │
│  - 返回生成的文档Blob                                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              6. ProgressTracker                              │
│  - 更新进度缓存                                              │
│  - 推送WebSocket事件                                         │
│  - 通知订阅者                                                │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              7. OutputHandler                                │
│  - 打包ZIP文件                                               │
│  - 上传到存储                                                │
│  - 生成下载URL                                               │
│  - 发送邮件通知                                              │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              8. GenerationHistoryManager                     │
│  - 保存历史记录                                              │
│  - 更新统计信息                                              │
│  - 清理过期数据                                              │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              9. 响应用户                                     │
│  {                                                           │
│    "taskId": "task_123",                                    │
│    "status": "completed",                                   │
│    "downloadUrl": "https://..."                             │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 批量任务调度

### 任务队列设计

```typescript
interface ITaskQueue {
  enqueue(task: BatchGenerationTask): Promise<void>;
  dequeue(): Promise<BatchGenerationTask | null>;
  getTask(taskId: string): Promise<BatchGenerationTask | null>;
  updateTask(task: BatchGenerationTask): Promise<void>;
  removeTask(taskId: string): Promise<void>;
  getSize(): Promise<number>;
}

class PriorityTaskQueue implements ITaskQueue {
  private queue: TaskQueueItem[] = [];

  async enqueue(task: BatchGenerationTask): Promise<void> {
    const item: TaskQueueItem = {
      task,
      priority: task.priority,
      scheduledAt: task.timestamps.createdAt
    };

    // 按优先级插入
    const index = this.findInsertIndex(item);
    this.queue.splice(index, 0, item);
  }

  private findInsertIndex(item: TaskQueueItem): number {
    // 优先级排序：URGENT > HIGH > NORMAL > LOW
    const priorityOrder = {
      [Priority.URGENT]: 0,
      [Priority.HIGH]: 1,
      [Priority.NORMAL]: 2,
      [Priority.LOW]: 3
    };

    let index = 0;
    for (let i = 0; i < this.queue.length; i++) {
      if (priorityOrder[item.priority] < priorityOrder[this.queue[i].priority]) {
        break;
      }
      if (priorityOrder[item.priority] === priorityOrder[this.queue[i].priority]) {
        if (item.scheduledAt! < this.queue[i].scheduledAt!) {
          break;
        }
      }
      index++;
    }

    return index;
  }
}
```

### 并发控制

```typescript
class ConcurrencyController {
  private runningTasks: Set<string> = new Set();
  private maxConcurrency: number;

  constructor(maxConcurrency: number = 3) {
    this.maxConcurrency = maxConcurrency;
  }

  async acquire(taskId: string): Promise<boolean> {
    if (this.runningTasks.size >= this.maxConcurrency) {
      return false;
    }

    this.runningTasks.add(taskId);
    return true;
  }

  release(taskId: string): void {
    this.runningTasks.delete(taskId);
  }

  getAvailableSlots(): number {
    return this.maxConcurrency - this.runningTasks.size;
  }
}
```

---

## 实时进度推送

### WebSocket事件流

```typescript
// 客户端订阅
const ws = new WebSocket('wss://api.excelmind.ai/v1/stream');

ws.onopen = () => {
  ws.send(JSON.stringify({
    action: 'subscribe',
    taskIds: ['task_123', 'task_456']
  }));
};

// 服务端推送事件
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  switch (data.type) {
    case 'progress':
      // 更新进度条
      updateProgressBar(data.progress);
      updateStatusText(data.message);
      break;

    case 'document_generated':
      // 添加到完成列表
      addDocumentToList(data);
      break;

    case 'status_changed':
      // 更新任务状态
      updateTaskStatus(data.newStatus);
      break;

    case 'error':
      // 显示错误
      showErrorNotification(data.error);
      if (data.fatal) {
        // 致命错误，停止任务
        stopTask();
      }
      break;

    case 'completed':
      // 任务完成
      showCompletionNotification(data.result);
      enableDownloadButton(data.result.downloadUrl);
      break;
  }
};
```

### 进度计算

```typescript
function calculateProgress(task: BatchGenerationTask): number {
  const { execution } = task;

  // 各阶段权重
  const stageWeights = {
    [GenerationStage.INITIALIZING]: 0.05,
    [GenerationStage.LOADING_DATA]: 0.10,
    [GenerationStage.VALIDATING_TEMPLATES]: 0.05,
    [GenerationStage.PREPARING_MAPPING]: 0.10,
    [GenerationStage.GENERATING_DOCUMENTS]: 0.60,
    [GenerationStage.COMPRESSING_OUTPUT]: 0.05,
    [GenerationStage.UPLOADING_RESULTS]: 0.03,
    [GenerationStage.FINALIZING]: 0.02
  };

  // 计算当前阶段进度
  const currentStageWeight = stageWeights[execution.currentStage];
  const stageProgress = execution.completedDocuments / execution.totalDocuments;

  // 计算总体进度
  let progress = 0;
  for (const stage of Object.values(GenerationStage)) {
    if (stage === execution.currentStage) {
      progress += currentStageWeight * stageProgress;
      break;
    }
    progress += stageWeights[stage] || 0;
  }

  return Math.floor(progress * 100);
}
```

---

## 性能优化策略

### 1. 内存优化

**分批处理**:

```typescript
// 不要一次加载所有数据
// ✗ 错误
const allData = await loadAllData(); // 可能100MB+
for (const row of allData) {
  await generateDocument(row);
}

// ✓ 正确：流式处理
const batchSize = 100;
for (let i = 0; i < totalRows; i += batchSize) {
  const batch = await loadDataBatch(i, batchSize);
  await processBatch(batch);
  batch = null; // 释放内存
}
```

**及时释放**:

```typescript
class MemoryManager {
  private memoryUsage: number = 0;
  private memoryLimit: number;

  constructor(memoryLimitMB: number) {
    this.memoryLimit = memoryLimitMB * 1024 * 1024;
  }

  canAllocate(size: number): boolean {
    return (this.memoryUsage + size) < this.memoryLimit;
  }

  allocate(size: number): void {
    if (!this.canAllocate(size)) {
      throw new Error('Memory limit exceeded');
    }
    this.memoryUsage += size;
  }

  release(size: number): void {
    this.memoryUsage = Math.max(0, this.memoryUsage - size);
  }

  getUsagePercentage(): number {
    return (this.memoryUsage / this.memoryLimit) * 100;
  }
}
```

### 2. 并发优化

**动态并发调整**:

```typescript
class AdaptiveConcurrencyController {
  private baseConcurrency: number = 3;
  private currentConcurrency: number = 3;
  private successRate: number = 1.0;

  adjustConcurrency(metrics: {
    avgTimePerDocument: number;
    successRate: number;
    memoryUsage: number;
  }): void {
    // 成功率低 → 降低并发
    if (metrics.successRate < 0.8) {
      this.currentConcurrency = Math.max(1, this.currentConcurrency - 1);
      return;
    }

    // 内存使用高 → 降低并发
    if (metrics.memoryUsage > 0.8) {
      this.currentConcurrency = Math.max(1, this.currentConcurrency - 1);
      return;
    }

    // 性能好且内存充足 → 提高并发
    if (metrics.successRate > 0.95 && metrics.memoryUsage < 0.5) {
      this.currentConcurrency = Math.min(
        this.baseConcurrency * 2,
        this.currentConcurrency + 1
      );
    }
  }
}
```

### 3. 缓存策略

**模板缓存**:

```typescript
class TemplateCache {
  private cache: Map<string, TemplateConfig> = new Map();
  private maxCacheSize: number = 10;
  private ttl: number = 3600000; // 1小时

  async get(templateId: string): Promise<TemplateConfig | null> {
    const cached = this.cache.get(templateId);

    if (!cached) {
      return null;
    }

    // 检查过期
    if (Date.now() - cached.metadata.updatedAt > this.ttl) {
      this.cache.delete(templateId);
      return null;
    }

    return cached;
  }

  async set(templateId: string, config: TemplateConfig): Promise<void> {
    // LRU淘汰
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(templateId, config);
  }
}
```

---

## 错误处理与容错

### 错误分类

```typescript
enum ErrorCategory {
  // 用户错误
  VALIDATION_ERROR = 'validation_error',       // 输入验证失败
  TEMPLATE_NOT_FOUND = 'template_not_found',   // 模板不存在
  DATA_LOAD_ERROR = 'data_load_error',         // 数据加载失败

  // 系统错误
  GENERATION_ERROR = 'generation_error',       // 文档生成失败
  STORAGE_ERROR = 'storage_error',             // 存储错误
  NETWORK_ERROR = 'network_error',             // 网络错误

  // 资源错误
  OUT_OF_MEMORY = 'out_of_memory',             // 内存不足
  TIMEOUT = 'timeout',                         // 超时
  CONCURRENCY_LIMIT = 'concurrency_limit'      // 并发限制
}

interface ErrorContext {
  category: ErrorCategory;
  code: string;
  message: string;
  taskId: string;
  templateId?: string;
  dataIndex?: number;
  retryable: boolean;
  fatal: boolean;
  details?: any;
}
```

### 重试策略

```typescript
class RetryStrategy {
  async execute<T>(
    fn: () => Promise<T>,
    context: ErrorContext
  ): Promise<T> {
    let lastError: Error | null = null;
    const maxRetries = 3;
    const baseDelay = 1000;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();

      } catch (error) {
        lastError = error;

        // 不可重试的错误 → 直接抛出
        if (!context.retryable) {
          throw error;
        }

        // 最后一次尝试 → 抛出错误
        if (attempt === maxRetries) {
          throw new RetryExhaustedError(context, lastError);
        }

        // 指数退避 + 抖动
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 500;
        await sleep(delay);
      }
    }

    throw lastError;
  }
}
```

### 降级策略

```typescript
class FallbackStrategy {
  async generateDocument(context: GenerateContext): Promise<Blob> {
    try {
      // 主策略：使用 docxtemplater
      return await this.generateWithDocxtemplater(context);

    } catch (primaryError) {
      console.warn('Primary generation failed, trying fallback:', primaryError);

      try {
        // 降级策略1：简化模板
        return await this.generateWithSimplifiedTemplate(context);

      } catch (fallbackError1) {
        console.warn('Fallback 1 failed, trying fallback 2:', fallbackError1);

        try {
          // 降级策略2：返回原始模板
          return await this.returnOriginalTemplate(context);

        } catch (fallbackError2) {
          // 所有策略都失败
          throw new AllStrategiesFailedError({
            primary: primaryError,
            fallback1: fallbackError1,
            fallback2: fallbackError2
          });
        }
      }
    }
  }
}
```

---

## 可扩展性设计

### 新增模板格式

```typescript
// 1. 定义接口
interface ITemplateParser {
  parse(file: File | ArrayBuffer): Promise<TemplateStructure>;
  validate(template: TemplateStructure): ValidationResult;
}

// 2. 实现接口
class PDFTemplateParser implements ITemplateParser {
  async parse(file: File | ArrayBuffer): Promise<TemplateStructure> {
    // PDF特定的解析逻辑
  }

  async validate(template: TemplateStructure): ValidationResult {
    // PDF特定的验证逻辑
  }
}

// 3. 注册
TemplateParserRegistry.register('pdf', new PDFTemplateParser());
```

### 新增数据源

```typescript
// 1. 定义接口
interface IDataSourceLoader {
  load(config: DataSourceConfig): Promise<Array<Record<string, any>>>;
  validate(config: DataSourceConfig): Promise<ValidationResult>;
}

// 2. 实现接口
class DatabaseDataSourceLoader implements IDataSourceLoader {
  async load(config: DataSourceConfig): Promise<Array<Record<string, any>>> {
    // 从数据库加载数据
  }

  async validate(config: DataSourceConfig): Promise<ValidationResult> {
    // 验证数据库连接
  }
}

// 3. 注册
DataSourceLoaderRegistry.register('database', new DatabaseDataSourceLoader());
```

### 新增输出方式

```typescript
// 1. 定义接口
interface IOutputHandler {
  handle(result: BatchGenerationResult, config: OutputConfig): Promise<OutputResult>;
}

// 2. 实现接口
class S3OutputHandler implements IOutputHandler {
  async handle(
    result: BatchGenerationResult,
    config: OutputConfig
  ): Promise<OutputResult> {
    // 上传到S3
  }
}

// 3. 注册
OutputHandlerRegistry.register('s3', new S3OutputHandler());
```

---

## 文件清单

创建的文件：

1. **类型定义**
   - `D:\家庭\青聪赋能\excelmind-ai\types\templateGeneration.ts`
   - 完整的类型系统，支持多模板批量生成

2. **架构文档**
   - `D:\家庭\青聪赋能\excelmind-ai\docs\BATCH_TEMPLATE_GENERATION_ARCHITECTURE.md` (本文件)

待实现的核心服务文件：

3. **模板管理**
   - `services/templateManagement/TemplateManager.ts`
   - `services/templateManagement/TemplateValidator.ts`
   - `services/templateManagement/TemplateStorage.ts`

4. **批量生成**
   - `services/batchGeneration/BatchGenerationService.ts`
   - `services/batchGeneration/BatchGenerationScheduler.ts`
   - `services/batchGeneration/DocumentGenerator.ts`
   - `services/batchGeneration/TaskQueue.ts`

5. **进度追踪**
   - `services/progress/ProgressTracker.ts`
   - `services/progress/WebSocketService.ts`

6. **历史记录**
   - `services/history/GenerationHistoryManager.ts`
   - `services/history/HistoryStorage.ts`

7. **API控制器**
   - `api/controllers/TemplateController.ts`
   - `api/controllers/BatchTaskController.ts`
   - `api/controllers/HistoryController.ts`

---

## 下一步建议

### 短期 (1-2周)

1. **核心服务实现**
   - [ ] 实现 TemplateManager
   - [ ] 实现 BatchGenerationScheduler
   - [ ] 实现 DocumentGenerator（封装现有服务）
   - [ ] 实现 ProgressTracker

2. **API端点**
   - [ ] POST /api/templates/upload
   - [ ] GET /api/templates
   - [ ] POST /api/batch/tasks
   - [ ] GET /api/batch/tasks/:id/status

3. **WebSocket集成**
   - [ ] 实现WebSocket服务
   - [ ] 定义事件格式
   - [ ] 前端订阅逻辑

### 中期 (1个月)

1. **任务队列**
   - [ ] 实现优先级队列
   - [ ] 实现并发控制
   - [ ] 实现任务持久化

2. **历史记录**
   - [ ] 实现历史记录存储
   - [ ] 实现查询和筛选
   - [ ] 实现重新生成功能

3. **错误处理**
   - [ ] 实现重试策略
   - [ ] 实现降级策略
   - [ ] 完善错误日志

### 长期 (3个月)

1. **性能优化**
   - [ ] 实现自适应并发
   - [ ] 实现内存管理
   - [ ] 实现缓存优化

2. **扩展功能**
   - [ ] 支持更多模板格式
   - [ ] 支持更多数据源
   - [ ] 支持分布式部署

3. **监控运维**
   - [ ] 实现性能监控
   - [ ] 实现告警机制
   - [ ] 实现日志分析

---

## 总结

本架构设计提供了一个**高性能、可扩展、容错性强**的多模板文档生成系统。通过模块化设计、接口抽象、分层架构等原则，确保系统易于扩展和维护。

**核心优势**：
- ✅ 复用现有docxtemplaterService，避免重复开发
- ✅ 并发生成 + 任务队列，提升性能
- ✅ WebSocket实时推送，优化用户体验
- ✅ 完善的错误处理和重试机制
- ✅ 灵活的扩展点，支持多种数据源和输出方式
- ✅ 内存优化设计，支持大批量生成

**技术亮点**：
- 🎯 优先级任务队列
- 🎯 自适应并发控制
- 🎯 多层降级策略
- 🎯 智能内存管理
- 🎯 完整的WebSocket事件流
- 🎯 详细的进度追踪
