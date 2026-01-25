# 多模板文档生成系统 - 快速参考指南

## 🎯 核心概念

### 系统定位
- **Phase 2核心功能**: 支持多个Word模板批量生成文档
- **复用现有服务**: 基于docxtemplaterService构建
- **实时进度追踪**: WebSocket推送生成状态
- **高性能并发**: 可配置的并发生成和批处理

### 核心能力矩阵

| 功能模块 | 能力 | 关键指标 |
|---------|------|----------|
| 模板管理 | 上传、配置、版本控制 | 支持复杂模板（95%+格式保持） |
| 批量生成 | 多模板×多数据 | 默认3并发，可扩展到10+ |
| 进度追踪 | 实时推送 | <500ms延迟 |
| 历史记录 | 查询、重新生成 | 支持筛选和导出 |

---

## 📁 文件结构

```
excelmind-ai/
├── types/
│   └── templateGeneration.ts          # ✅ 完整类型定义
├── docs/
│   ├── BATCH_TEMPLATE_GENERATION_ARCHITECTURE.md  # ✅ 架构设计
│   ├── BATCH_TEMPLATE_GENERATION_API.md           # ✅ API规范
│   └── BATCH_TEMPLATE_QUICK_REFERENCE.md          # 本文件
├── services/
│   ├── templateManagement/            # 待实现
│   │   ├── TemplateManager.ts
│   │   ├── TemplateValidator.ts
│   │   └── TemplateStorage.ts
│   ├── batchGeneration/               # 待实现
│   │   ├── BatchGenerationService.ts
│   │   ├── BatchGenerationScheduler.ts
│   │   ├── DocumentGenerator.ts       # 封装现有docxtemplaterService
│   │   └── TaskQueue.ts
│   ├── progress/                      # 待实现
│   │   ├── ProgressTracker.ts
│   │   └── WebSocketService.ts
│   └── history/                       # 待实现
│       ├── GenerationHistoryManager.ts
│       └── HistoryStorage.ts
└── api/
    └── controllers/                   # 待实现
        ├── TemplateController.ts
        ├── BatchTaskController.ts
        └── HistoryController.ts
```

---

## 🏗️ 架构分层

```
┌─────────────────────────────────────────────┐
│              Presentation Layer              │
│         React UI + WebSocket Client          │
└──────────────────┬──────────────────────────┘
                   │ REST + WebSocket
┌──────────────────▼──────────────────────────┐
│              API Gateway Layer               │
│    Auth + Rate Limit + Validation           │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│            Controller Layer                  │
│  TemplateController | BatchTaskController  │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│             Service Layer                    │
│  ┌──────────────────────────────────────┐  │
│  │     BatchGenerationService (门面)    │  │
│  └──────────────────────────────────────┘  │
│  TemplateManager | Scheduler | Tracker     │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│         Infrastructure Layer                 │
│  DocxtemplaterService (复用)                 │
│  Storage | Cache | WebSocket | Queue        │
└─────────────────────────────────────────────┘
```

---

## 🔄 数据流向

### 批量生成完整流程

```
1. 用户请求
   POST /api/v2/batch/tasks
   {
     "templateIds": ["tpl_1", "tpl_2"],
     "dataSource": { "type": "excel", ... },
     "options": { "concurrency": 3 }
   }

2. 创建任务
   - 验证请求
   - 创建任务对象
   - 加入优先级队列

3. 任务调度
   - 按优先级排序
   - 检查并发限制
   - 分配执行器

4. 执行循环
   for each batch:
     a. 加载数据源 (Excel → Array<Object>)
     b. 加载模板 (从缓存或存储)
     c. 并发生成 (concurrency=3)
        - 调用 docxtemplaterService
        - 处理失败重试
     d. 更新进度 (WebSocket推送)

5. 输出处理
   - 打包ZIP
   - 上传存储
   - 生成下载URL

6. 历史记录
   - 保存执行结果
   - 更新统计信息
```

---

## 🎨 核心类设计

### 1. TemplateManager (模板管理器)

**职责**: 模板文件生命周期管理

```typescript
class TemplateManager implements ITemplateManager {
  // 核心方法
  async uploadTemplate(req: UploadTemplateRequest): Promise<UploadTemplateResponse>;
  async getTemplate(id: string): Promise<TemplateConfig>;
  async listTemplates(params: ListTemplatesParams): Promise<ListTemplatesResponse>;
  async updateTemplate(req: UpdateTemplateRequest): Promise<void>;
  async deleteTemplate(id: string): Promise<void>;
  async validateTemplate(id: string): Promise<ValidationResult>;
  async extractPlaceholders(id: string): Promise<string[]>;

  // 复用现有服务
  private async validateTemplateFile(file: File | ArrayBuffer) {
    return await TemplateValidator.validate(buffer);
  }
}
```

### 2. BatchGenerationScheduler (批量生成调度器)

**职责**: 任务调度、并发控制、进度管理

```typescript
class BatchGenerationScheduler implements IBatchGenerationScheduler {
  // 核心方法
  async createTask(req: CreateBatchTaskRequest): Promise<CreateBatchTaskResponse>;
  async startTask(taskId: string): Promise<void>;
  async pauseTask(taskId: string): Promise<void>;
  async resumeTask(taskId: string): Promise<void>;
  async cancelTask(taskId: string): Promise<void>;
  async getTaskStatus(taskId: string): Promise<TaskStatusResponse>;

  // 调度逻辑
  private async runScheduleLoop(task: BatchGenerationTask) {
    // 1. 加载数据源
    const data = await this.loadDataSource(task.config.dataSource);

    // 2. 加载模板
    const templates = await this.loadTemplates(task.config.templateIds);

    // 3. 分批处理
    for (let i = 0; i < data.length; i += batchSize) {
      await this.processBatch(data.slice(i, i + batchSize), templates);
      await this.tracker.updateProgress(task.id, this.calculateProgress(task));
    }
  }

  // 并发处理
  private async processBatch(batch: DataRow[], templates: TemplateConfig[]) {
    const concurrency = task.config.options.concurrency || 3;

    for (let i = 0; i < batch.length; i += concurrency) {
      const concurrentBatch = batch.slice(i, i + concurrency);
      await Promise.all(
        concurrentBatch.map(data => this.generateDocument(data, templates))
      );
    }
  }
}
```

### 3. DocumentGenerator (文档生成器)

**职责**: 封装docxtemplaterService

```typescript
class DocumentGenerator implements IDocumentGenerator {
  // 复用现有服务
  async generateSingle(context: GenerateContext): Promise<Blob> {
    return await generateWithDocxtemplater({
      templateBuffer: context.templateBuffer,
      data: context.data,
      imageOptions: context.options?.imageOptions,
      parserOptions: context.options?.parserOptions
    });
  }

  async generateBatch(context: BatchContext): Promise<Blob[]> {
    const result = await batchGenerateWithDocxtemplater({
      templateBuffer: context.templateBuffer,
      dataList: context.dataList,
      baseFileName: context.options?.baseFileName || 'document',
      concurrency: context.options?.concurrency || 3
    });

    return result.documents.map(doc => doc.blob);
  }
}
```

### 4. ProgressTracker (进度追踪器)

**职责**: 进度追踪和WebSocket推送

```typescript
class ProgressTracker implements IProgressTracker {
  async updateProgress(
    taskId: string,
    progress: number,
    metadata?: ProgressMetadata
  ): Promise<void> {
    // 1. 更新缓存
    await this.cache.set(`progress:${taskId}`, { progress, ...metadata }, 300);

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
    this.notifySubscribers(taskId, event);
  }

  subscribe(taskId: string, callback: ProgressCallback): () => void {
    if (!this.subscribers.has(taskId)) {
      this.subscribers.set(taskId, new Set());
    }

    this.subscribers.get(taskId)!.add(callback);

    return () => this.subscribers.get(taskId)!.delete(callback);
  }
}
```

---

## 🔌 API端点速查

### 模板管理API

| 端点 | 方法 | 描述 |
|------|------|------|
| /api/v2/templates/upload | POST | 上传模板 |
| /api/v2/templates/{id} | GET | 获取模板详情 |
| /api/v2/templates | GET | 列出模板 |
| /api/v2/templates/{id} | PATCH | 更新模板 |
| /api/v2/templates/{id} | DELETE | 删除模板 |
| /api/v2/templates/{id}/validate | POST | 验证模板 |
| /api/v2/templates/{id}/placeholders | GET | 提取占位符 |

### 批量任务API

| 端点 | 方法 | 描述 |
|------|------|------|
| /api/v2/batch/tasks | POST | 创建批量任务 |
| /api/v2/batch/tasks/{id}/start | POST | 启动任务 |
| /api/v2/batch/tasks/{id}/status | GET | 获取任务状态 |
| /api/v2/batch/tasks/{id}/pause | POST | 暂停任务 |
| /api/v2/batch/tasks/{id}/resume | POST | 恢复任务 |
| /api/v2/batch/tasks/{id}/cancel | POST | 取消任务 |
| /api/v2/batch/tasks/{id} | GET | 获取任务详情 |
| /api/v2/batch/tasks | GET | 列出任务 |
| /api/v2/batch/tasks/{id}/download | GET | 下载结果 |

### 历史记录API

| 端点 | 方法 | 描述 |
|------|------|------|
| /api/v2/history | GET | 获取历史记录 |
| /api/v2/history/{id} | GET | 获取历史详情 |
| /api/v2/history/{id}/regenerate | POST | 重新生成 |
| /api/v2/history/{id} | DELETE | 删除历史记录 |

---

## 📡 WebSocket事件

### 订阅任务

```javascript
const ws = new WebSocket('wss://api.excelmind.ai/v2/stream');

ws.onopen = () => {
  ws.send(JSON.stringify({
    action: 'subscribe',
    taskIds: ['task_123', 'task_456']
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  switch (data.type) {
    case 'progress':
      console.log(`进度: ${data.progress}%`);
      console.log(`阶段: ${data.stage}`);
      console.log(`消息: ${data.message}`);
      break;

    case 'document_generated':
      console.log(`文档生成: ${data.fileName}`);
      break;

    case 'status_changed':
      console.log(`状态: ${data.oldStatus} → ${data.newStatus}`);
      break;

    case 'error':
      console.error(`错误: ${data.error.message}`);
      if (data.fatal) {
        console.error('致命错误，任务已终止');
      }
      break;

    case 'completed':
      console.log('任务完成！');
      console.log(`下载: ${data.result.downloadUrl}`);
      break;
  }
};
```

### 事件类型

| 事件类型 | 触发时机 | 关键字段 |
|---------|---------|---------|
| progress | 进度更新 | progress, stage, message |
| document_generated | 文档生成完成 | documentId, fileName, status |
| status_changed | 任务状态变更 | oldStatus, newStatus |
| error | 错误发生 | error.code, error.message, fatal |
| completed | 任务完成 | result.downloadUrl, result.stats |

---

## ⚡ 性能优化要点

### 1. 并发控制

**默认配置**:
```typescript
{
  concurrency: 3,      // 3个文档并发生成
  batchSize: 10,       // 每批10个文档
  maxConcurrency: 10   // 最大10个并发
}
```

**动态调整**:
```typescript
class AdaptiveConcurrencyController {
  adjustConcurrency(metrics: {
    avgTimePerDocument: number;
    successRate: number;
    memoryUsage: number;
  }) {
    if (metrics.successRate < 0.8) {
      // 降低并发
      this.concurrency = Math.max(1, this.concurrency - 1);
    } else if (metrics.successRate > 0.95 && metrics.memoryUsage < 0.5) {
      // 提高并发
      this.concurrency = Math.min(this.maxConcurrency, this.concurrency + 1);
    }
  }
}
```

### 2. 内存管理

**分批处理**:
```typescript
// ✗ 错误：一次加载所有数据
const allData = await loadAllData(); // 可能100MB+
for (const row of allData) {
  await generateDocument(row);
}

// ✓ 正确：分批加载
const batchSize = 100;
for (let i = 0; i < totalRows; i += batchSize) {
  const batch = await loadDataBatch(i, batchSize);
  await processBatch(batch);
  batch = null; // 释放内存
}
```

**内存监控**:
```typescript
class MemoryManager {
  private memoryLimit: number = 512 * 1024 * 1024; // 512MB

  canAllocate(size: number): boolean {
    const currentUsage = process.memoryUsage().heapUsed;
    return (currentUsage + size) < this.memoryLimit;
  }
}
```

### 3. 缓存策略

**模板缓存**:
```typescript
// LRU缓存，最多10个模板，TTL=1小时
class TemplateCache {
  private cache = new Map<string, TemplateConfig>();
  private maxSize = 10;
  private ttl = 3600000;

  async get(id: string): Promise<TemplateConfig | null> {
    const cached = this.cache.get(id);
    if (!cached) return null;

    // 检查过期
    if (Date.now() - cached.metadata.updatedAt > this.ttl) {
      this.cache.delete(id);
      return null;
    }

    return cached;
  }
}
```

---

## 🛡️ 错误处理

### 错误分类

| 类别 | 错误代码 | HTTP状态 | 是否可重试 |
|------|---------|----------|-----------|
| 用户错误 | VALIDATION_ERROR | 400 | ❌ |
| 用户错误 | TEMPLATE_NOT_FOUND | 404 | ❌ |
| 系统错误 | GENERATION_ERROR | 500 | ✅ |
| 系统错误 | OUT_OF_MEMORY | 500 | ❌ |
| 资源错误 | TIMEOUT | 500 | ✅ |

### 重试策略

```typescript
class RetryStrategy {
  async execute<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxRetries) {
          throw new RetryExhaustedError(error);
        }

        // 指数退避 + 抖动
        const delay = 1000 * Math.pow(2, attempt) + Math.random() * 500;
        await sleep(delay);
      }
    }
  }
}
```

### 降级策略

```typescript
class FallbackStrategy {
  async generateDocument(context: GenerateContext): Promise<Blob> {
    try {
      // 主策略：docxtemplater
      return await this.generateWithDocxtemplater(context);
    } catch (primaryError) {
      try {
        // 降级策略1：简化模板
        return await this.generateWithSimplifiedTemplate(context);
      } catch (fallbackError) {
        // 降级策略2：返回原始模板
        return await this.returnOriginalTemplate(context);
      }
    }
  }
}
```

---

## 🚀 实施路线图

### Phase 1: 核心功能 (1-2周)

- [x] 类型定义 (`types/templateGeneration.ts`)
- [x] 架构设计文档
- [x] API规范文档
- [ ] TemplateManager 实现
- [ ] BatchGenerationScheduler 实现
- [ ] DocumentGenerator 实现（封装现有服务）
- [ ] ProgressTracker 实现
- [ ] 基础API端点

### Phase 2: WebSocket集成 (1周)

- [ ] WebSocket服务实现
- [ ] 前端订阅逻辑
- [ ] 事件格式定义
- [ ] 实时进度UI

### Phase 3: 任务队列 (1周)

- [ ] 优先级队列实现
- [ ] 并发控制实现
- [ ] 任务持久化
- [ ] 任务监控

### Phase 4: 历史记录 (1周)

- [ ] 历史记录存储
- [ ] 查询和筛选
- [ ] 重新生成功能
- [ ] 统计分析

### Phase 5: 优化和扩展 (2周)

- [ ] 性能优化
- [ ] 错误处理完善
- [ ] 单元测试
- [ ] 集成测试
- [ ] 文档完善

---

## 📊 关键指标

### 性能指标

| 指标 | 目标值 | 测量方法 |
|------|--------|---------|
| 单个文档生成时间 | <500ms | 性能监控 |
| 批量生成吞吐量 | >200文档/分钟 | 任务统计 |
| WebSocket延迟 | <500ms | 网络监控 |
| 内存使用 | <512MB | 资源监控 |
| 任务成功率 | >98% | 错误追踪 |

### 质量指标

| 指标 | 目标值 | 测量方法 |
|------|--------|---------|
| 代码覆盖率 | >80% | 单元测试 |
| API响应时间 | <200ms | 性能测试 |
| 错误率 | <2% | 日志分析 |
| 用户满意度 | >4.5/5 | 反馈调查 |

---

## 🔗 相关文档

- [架构设计文档](./BATCH_TEMPLATE_GENERATION_ARCHITECTURE.md) - 完整的架构设计
- [API规范文档](./BATCH_TEMPLATE_GENERATION_API.md) - 详细的API定义
- [类型定义](../types/templateGeneration.ts) - TypeScript类型
- [现有服务](../services/docxtemplaterService.ts) - 文档生成服务

---

## 💡 最佳实践

### 1. 模板设计

- ✅ 使用清晰的占位符命名：`{{合同编号}}` 而非 `{{id}}`
- ✅ 提供默认映射配置，减少AI推理
- ✅ 添加验证规则，确保数据质量
- ✅ 使用条件块和循环，提高模板灵活性

### 2. 数据准备

- ✅ 数据清洗：去除空行、无效数据
- ✅ 数据标准化：统一日期、数字格式
- ✅ 添加筛选条件，减少无效生成
- ✅ 使用合适的数据源（Excel/CSV/JSON）

### 3. 任务配置

- ✅ 根据服务器性能调整并发数
- ✅ 设置合理的超时时间
- ✅ 启用错误重试，提高成功率
- ✅ 使用WebSocket获取实时进度

### 4. 错误处理

- ✅ 检查任务状态，处理部分失败
- ✅ 下载错误日志，分析失败原因
- ✅ 使用重新生成功能，修复数据后重试
- ✅ 监控任务执行，及时发现异常

---

**版本**: 2.0.0
**最后更新**: 2025-01-25
**维护者**: 首席架构师
