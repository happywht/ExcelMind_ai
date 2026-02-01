# 🏗️ 后端文档生成架构设计方案

**版本**: 1.0.0
**日期**: 2026-02-01
**架构师**: Chief Architect
**状态**: 设计阶段

---

## 📋 执行摘要

### 问题定义

当前系统在前端浏览器中直接使用 `docx-templates` 和 `docxtemplater` 库生成Word文档，但这些库依赖Node.js专用模块（`vm`、`stream`），导致在浏览器环境中完全失效。

**核心错误**:
```
Error: vm.Script is not a constructor
Module "vm" has been externalized for browser compatibility
```

### 解决方案概述

将文档生成逻辑从前端迁移到后端Node.js服务器，通过RESTful API提供文档生成服务。前端仅负责UI交互和调用后端API，后端负责实际的文档生成。

**关键优势**:
- ✅ 完全支持Node.js环境（vm、stream等模块）
- ✅ 集中式文档生成服务，便于监控和维护
- ✅ 支持大文件和批量生成
- ✅ 统一错误处理和日志记录
- ✅ 可扩展为异步任务队列

---

## 🎯 架构设计原则

### 1. 前后端分离原则

**前端职责**:
- UI交互和用户体验
- 文件上传和下载
- 调用后端API
- 显示进度和状态

**后端职责**:
- 文档生成逻辑
- 模板处理
- 数据转换
- 批量任务调度

### 2. 渐进式迁移策略

**阶段1 (P0 - 立即实施)**:
- 单个文档生成API
- 基础批量生成API
- 同步模式（立即返回结果）

**阶段2 (P1 - 后续优化)**:
- 异步任务队列
- WebSocket实时进度推送
- 大文件流式传输

**阶段3 (P2 - 长期规划)**:
- 分布式任务调度
- 缓存优化
- 性能监控和分析

### 3. 兼容性保证

- 保持现有API接口不变
- 前端调用方式最小化修改
- 支持现有数据格式和映射方案

---

## 🏛️ 系统架构设计

### 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                         前端 (Browser)                          │
├─────────────────────────────────────────────────────────────────┤
│  DocumentSpace Component                                        │
│    ├─ handleTemplateUpload()                                    │
│    ├─ handleDataUpload()                                        │
│    ├─ handleGenerateMapping()                                   │
│    └─ handleGenerateDocs() ──┐                                  │
│                              │                                  │
│                              │ HTTP API 调用                    │
└──────────────────────────────┼──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      后端 API 网关层                              │
├─────────────────────────────────────────────────────────────────┤
│  Express Router (api/routes/v2.ts)                             │
│    └─ /api/v2/generation/*                                      │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    控制器层 (Controllers)                        │
├─────────────────────────────────────────────────────────────────┤
│  DocumentGenerationController                                   │
│    ├─ generateSingle()        // 单个文档生成                   │
│    ├─ generateBatch()         // 批量文档生成                   │
│    ├─ getProgress()           // 获取任务进度                   │
│    └─ downloadResult()        // 下载生成的文档                 │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    服务层 (Services)                             │
├─────────────────────────────────────────────────────────────────┤
│  DocumentGenerationService (NEW)                                │
│    ├─ generateDocument()      // 核心文档生成逻辑               │
│    ├─ batchGenerate()         // 批量生成协调                   │
│    ├─ applyMapping()          // 应用映射方案                   │
│    └─ validateTemplate()      // 模板验证                       │
│                                                                  │
│  DocxtemplaterService (EXISTS - 重用)                           │
│    ├─ generateDocument()      // docxtemplater引擎              │
│    └─ batchGenerate()         // 批量生成                       │
│                                                                  │
│  TemplateManager (EXISTS - 重用)                                │
│    └─ getTemplate()           // 模板管理                       │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                   核心引擎层 (Engines)                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐    ┌─────────────────────┐            │
│  │   Docxtemplater     │    │   docx-templates    │            │
│  │   (pizzip)          │    │   (降级选项)        │            │
│  └─────────────────────┘    └─────────────────────┘            │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                   存储层 (Storage)                               │
├─────────────────────────────────────────────────────────────────┤
│  LocalStorageService (临时文件存储)                             │
│  ├─ template_*.docx                                            │
│  └─ results_*.zip                                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📡 API接口设计

### 1. 单个文档生成 API

**端点**: `POST /api/v2/generation/generate`

**请求格式**:
```json
{
  "templateFile": "base64_encoded_template",
  "templateName": "合同模板.docx",
  "data": {
    "name": "张三",
    "company": "某某公司",
    "amount": 10000
  },
  "mappingScheme": {
    "mappings": [
      {
        "placeholder": "{{name}}",
        "excelColumn": "姓名"
      },
      {
        "placeholder": "{{company}}",
        "excelColumn": "公司名称"
      }
    ]
  },
  "options": {
    "engine": "docxtemplater",
    "outputFormat": "docx"
  }
}
```

**响应格式 (成功)**:
```json
{
  "success": true,
  "data": {
    "documentId": "doc_123456",
    "fileName": "张三_合同.docx",
    "fileSize": 45678,
    "downloadUrl": "/api/v2/generation/download/doc_123456",
    "base64": "base64_encoded_document"
  },
  "meta": {
    "requestId": "req_789",
    "timestamp": "2026-02-01T10:00:00Z",
    "executionTime": 1250
  }
}
```

**响应格式 (失败)**:
```json
{
  "success": false,
  "error": {
    "code": "GENERATION_FAILED",
    "message": "文档生成失败: 模板解析错误",
    "details": [
      {
        "field": "templateFile",
        "message": "无效的Word文档格式"
      }
    ]
  },
  "meta": {
    "requestId": "req_789",
    "timestamp": "2026-02-01T10:00:00Z"
  }
}
```

### 2. 批量文档生成 API

**端点**: `POST /api/v2/generation/batch`

**请求格式**:
```json
{
  "templateFile": "base64_encoded_template",
  "templateName": "合同模板.docx",
  "dataList": [
    {
      "name": "张三",
      "company": "公司A"
    },
    {
      "name": "李四",
      "company": "公司B"
    }
  ],
  "mappingScheme": {
    "mappings": [...],
    "filterCondition": null
  },
  "options": {
    "engine": "docxtemplater",
    "concurrency": 3,
    "baseFileName": "合同"
  }
}
```

**响应格式**:
```json
{
  "success": true,
  "data": {
    "taskId": "task_abc123",
    "status": "completed",
    "documentCount": 2,
    "documents": [
      {
        "documentId": "doc_001",
        "fileName": "张三_合同.docx",
        "dataIndex": 0
      },
      {
        "documentId": "doc_002",
        "fileName": "李四_合同.docx",
        "dataIndex": 1
      }
    ],
    "downloadUrl": "/api/v2/generation/batch/download/task_abc123",
    "zipUrl": "/api/v2/generation/batch/download/zip/task_abc123"
  },
  "meta": {
    "requestId": "req_789",
    "executionTime": 3500
  }
}
```

### 3. 下载生成的文档

**单个文档**:
```
GET /api/v2/generation/download/:documentId
```

**批量ZIP**:
```
GET /api/v2/generation/batch/download/zip/:taskId
```

---

## 💾 数据流设计

### 1. 单个文档生成流程

```
1. 前端: handleGenerateDocs()
   ├─ 读取 templateFile.arrayBuffer
   ├─ 转换为 Base64
   └─ 构建请求数据

2. API: POST /api/v2/generation/generate
   ├─ 接收 Base64 模板
   ├─ 解码为 ArrayBuffer
   └─ 调用服务层

3. 服务: DocumentGenerationService.generateDocument()
   ├─ 验证模板
   ├─ 应用映射方案
   ├─ 调用 DocxtemplaterService
   └─ 生成文档

4. 响应: Base64 编码的文档
   └─ 前端解码并下载
```

### 2. 批量文档生成流程

```
1. 前端: handleGenerateDocs()
   ├─ 读取 Excel 数据
   ├─ 应用映射方案
   ├─ 构建 dataList
   └─ 调用批量API

2. API: POST /api/v2/generation/batch
   ├─ 接收批量数据
   ├─ 调用批量生成服务
   └─ 返回任务ID

3. 服务: DocumentGenerationService.batchGenerate()
   ├─ 并发控制 (concurrency: 3)
   ├─ 进度回调
   ├─ 生成所有文档
   └─ 创建ZIP

4. 响应: 任务结果
   └─ 前端显示进度
   └─ 下载ZIP
```

---

## 🔧 实施计划

### 阶段1: 核心功能 (P0 - 立即实施)

#### 1.1 后端服务层

**新建文件**: `server/services/documentGenerationService.ts`

```typescript
/**
 * 文档生成服务 (Node.js环境)
 */
export class DocumentGenerationService {
  /**
   * 生成单个文档
   */
  async generateDocument(params: {
    templateBuffer: ArrayBuffer;
    data: Record<string, any>;
    options?: GenerationOptions;
  }): Promise<{
    buffer: Buffer;
    fileName: string;
    size: number;
  }>;

  /**
   * 批量生成文档
   */
  async batchGenerate(params: {
    templateBuffer: ArrayBuffer;
    dataList: Record<string, any>[];
    baseFileName: string;
    options?: BatchOptions;
  }): Promise<{
    documents: GeneratedDocument[];
    zipBuffer: Buffer;
  }>;
}
```

#### 1.2 API控制器

**新建文件**: `api/controllers/documentGenerationController.ts`

```typescript
/**
 * 文档生成控制器
 */
export class DocumentGenerationController {
  async generateSingle(req: Request, res: Response): Promise<void>;
  async generateBatch(req: Request, res: Response): Promise<void>;
  async downloadDocument(req: Request, res: Response): Promise<void>;
  async downloadZip(req: Request, res: Response): Promise<void>;
}
```

#### 1.3 路由配置

**修改文件**: `api/routes/v2.ts`

添加新路由:
```typescript
const generationRouter = Router();

generationRouter.post(
  '/generate',
  requireAuth,
  requireExecute,
  asyncHandler(documentGenerationController.generateSingle.bind(documentGenerationController))
);

generationRouter.post(
  '/batch',
  requireAuth,
  requireExecute,
  asyncHandler(documentGenerationController.generateBatch.bind(documentGenerationController))
);

router.use('/generation', generationRouter);
```

#### 1.4 前端服务层

**新建文件**: `services/backendDocumentService.ts`

```typescript
/**
 * 后端文档生成服务 (前端调用)
 */
export class BackendDocumentService {
  /**
   * 生成单个文档
   */
  async generateDocument(params: {
    templateFile: File | ArrayBuffer;
    data: Record<string, any>;
    mappingScheme: MappingScheme;
  }): Promise<Blob>;

  /**
   * 批量生成文档
   */
  async batchGenerate(params: {
    templateFile: File | ArrayBuffer;
    dataList: Record<string, any>[];
    mappingScheme: MappingScheme;
    baseFileName: string;
    onProgress?: (current: number, total: number) => void;
  }): Promise<GeneratedDocument[]>;
}
```

#### 1.5 前端组件修改

**修改文件**: `components/DocumentSpace/DocumentSpace.tsx`

修改 `handleGenerateDocs` 函数:
```typescript
const handleGenerateDocs = useCallback(async () => {
  // ... 前置检查

  try {
    // 使用后端服务生成文档
    const backendService = new BackendDocumentService();

    if (generationMode === 'aggregate') {
      // 汇总模式
      const documents = await backendService.batchGenerate({
        templateFile: templateFile.arrayBuffer,
        dataList: [aggregateData],
        mappingScheme,
        baseFileName: templateFile.name.replace('.docx', '_汇总'),
      });
      setGeneratedDocs(documents);
    } else {
      // 普通批量模式
      const documents = await backendService.batchGenerate({
        templateFile: templateFile.arrayBuffer,
        dataList: mappedDataList,
        mappingScheme,
        baseFileName: templateFile.name.replace('.docx', ''),
        onProgress: (current, total) => {
          const percentage = Math.round((current / total) * 100);
          updateProgress(percentage);
          addLogWithMetrics('generating', 'pending',
            `正在生成文档: ${current}/${total} (${percentage}%)`
          );
        }
      });
      setGeneratedDocs(documents);
    }

    setActiveTab('generate');
    // ... 成功日志
  } catch (error) {
    // ... 错误处理
  }
}, [/* dependencies */]);
```

### 阶段2: 异步任务队列 (P1 - 后续优化)

#### 2.1 任务队列服务

**新建文件**: `server/services/taskQueue.ts`

```typescript
/**
 * 文档生成任务队列
 */
export class DocumentGenerationQueue {
  private queue: Queue<Task>;

  async addTask(task: GenerationTask): Promise<string>;
  async getTaskStatus(taskId: string): Promise<TaskStatus>;
  async cancelTask(taskId: string): Promise<void>;
}
```

#### 2.2 WebSocket进度推送

**修改文件**: `server/websocket/progressBroadcaster.ts`

添加文档生成进度推送:
```typescript
progressBroadcaster.broadcast('document_generation', {
  taskId: 'task_123',
  progress: 45,
  current: 5,
  total: 10,
  status: 'processing'
});
```

### 阶段3: 性能优化 (P2 - 长期规划)

- 模板缓存
- 并发优化
- 分布式任务调度
- 监控和分析

---

## 📁 文件清单

### 需要新建的文件

```
server/services/
  └─ documentGenerationService.ts      # 核心文档生成服务

api/controllers/
  └─ documentGenerationController.ts   # 文档生成控制器

services/
  └─ backendDocumentService.ts         # 前端调用服务

types/
  └─ documentGeneration.ts             # 类型定义
```

### 需要修改的文件

```
api/routes/v2.ts                       # 添加新路由

components/DocumentSpace/
  DocumentSpace.tsx                    # 修改生成逻辑

services/docxtemplaterService.ts       # 可能需要调整 (如果需要)

stores/documentSpaceStore.ts           # 可能需要调整 (如果需要)
```

---

## 🔐 安全性考虑

### 1. 文件大小限制

```typescript
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});
```

### 2. 输入验证

```typescript
// 验证模板文件
if (!templateBuffer || templateBuffer.byteLength === 0) {
  throw new Error('模板文件不能为空');
}

// 验证数据
if (!data || typeof data !== 'object') {
  throw new Error('数据格式无效');
}
```

### 3. 恶意模板防护

```typescript
// 限制模板复杂度
const complexity = await TemplateValidator.detectComplexity(templateBuffer);
if (complexity === 'complex' && templateSize > 5 * 1024 * 1024) {
  throw new Error('复杂模板大小不能超过5MB');
}
```

---

## ⚡ 性能考虑

### 1. 并发控制

```typescript
// 批量生成并发控制
const concurrency = options.concurrency || 3;
for (let i = 0; i < dataList.length; i += concurrency) {
  const batch = dataList.slice(i, i + concurrency);
  await Promise.all(batch.map(data => generateDocument(data)));
}
```

### 2. 内存管理

```typescript
// 流式处理大文件
const zip = new JSZip();
// 逐个添加文档
for (const doc of documents) {
  zip.file(doc.fileName, doc.buffer);
}
// 生成ZIP
const zipBuffer = await zip.generateAsync({
  type: 'nodebuffer',
  compression: 'DEFLATE'
});
```

### 3. 缓存策略

```typescript
// 模板缓存
private templateCache = new Map<string, ArrayBuffer>();

async getCachedTemplate(templateId: string): Promise<ArrayBuffer> {
  if (this.templateCache.has(templateId)) {
    return this.templateCache.get(templateId)!;
  }
  const template = await this.loadTemplate(templateId);
  this.templateCache.set(templateId, template);
  return template;
}
```

---

## 🧪 测试策略

### 1. 单元测试

```typescript
// services/documentGenerationService.test.ts
describe('DocumentGenerationService', () => {
  it('should generate single document', async () => {
    const service = new DocumentGenerationService();
    const result = await service.generateDocument({
      templateBuffer: mockTemplate,
      data: mockData
    });
    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.fileName).toMatch(/\.docx$/);
  });

  it('should handle batch generation', async () => {
    // ... 批量测试
  });
});
```

### 2. 集成测试

```typescript
// tests/integration/documentGeneration.integration.test.ts
describe('Document Generation API', () => {
  it('POST /api/v2/generation/generate', async () => {
    const response = await request(app)
      .post('/api/v2/generation/generate')
      .send(mockRequest)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.documentId).toBeDefined();
  });
});
```

### 3. 端到端测试

```typescript
// tests/e2e/documentGeneration.e2e.spec.ts
test('complete document generation flow', async ({ page }) => {
  await page.goto('/document-space');
  await page.uploadFile('#template-upload', 'template.docx');
  await page.uploadFile('#data-upload', 'data.xlsx');
  await page.click('[data-testid="generate-btn"]');
  await expect(page.locator('.generated-docs')).toBeVisible();
});
```

---

## 📊 监控和日志

### 1. 性能指标

```typescript
// 记录生成时间
const startTime = Date.now();
const result = await generateDocument(params);
const duration = Date.now() - startTime;

logger.info('[DocumentGeneration] Generation completed', {
  documentId: result.documentId,
  duration,
  templateSize: templateBuffer.byteLength,
  dataSize: JSON.stringify(data).length
});

// 发送到监控系统
recordMetric({
  type: 'document_generation',
  value: duration,
  unit: 'ms',
  tags: {
    engine: options.engine,
    template_complexity: complexity
  }
});
```

### 2. 错误追踪

```typescript
try {
  await generateDocument(params);
} catch (error) {
  logger.error('[DocumentGeneration] Generation failed', {
    error: error.message,
    stack: error.stack,
    templateSize: templateBuffer.byteLength,
    dataKeys: Object.keys(data)
  });

  // 发送到错误追踪服务
  captureException(error, {
    context: {
      templateSize: templateBuffer.byteLength,
      dataFieldCount: Object.keys(data).length
    }
  });
}
```

---

## 🚀 部署考虑

### 1. 环境变量

```env
# .env.production
DOCUMENT_GENERATION_MAX_FILE_SIZE=10485760
DOCUMENT_GENERATION_MAX_CONCURRENCY=5
DOCUMENT_GENERATION_CACHE_SIZE=100
DOCUMENT_GENERATION_TIMEOUT=300000
```

### 2. Docker配置

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "run", "server:start"]
```

### 3. 负载均衡

```yaml
# docker-compose.yml
services:
  api:
    image: excelmind-api:latest
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1'
          memory: 1G
```

---

## 📝 迁移检查清单

### 开发阶段

- [ ] 创建 `documentGenerationService.ts`
- [ ] 创建 `documentGenerationController.ts`
- [ ] 创建 `backendDocumentService.ts`
- [ ] 修改 `api/routes/v2.ts`
- [ ] 修改 `DocumentSpace.tsx`
- [ ] 添加单元测试
- [ ] 添加集成测试

### 测试阶段

- [ ] 本地开发环境测试
- [ ] 单个文档生成测试
- [ ] 批量文档生成测试
- [ ] 错误处理测试
- [ ] 性能测试
- [ ] 端到端测试

### 部署阶段

- [ ] 环境变量配置
- [ ] 生产环境部署
- [ ] 监控配置
- [ ] 日志配置
- [ ] 回滚方案准备

### 验证阶段

- [ ] 功能验证
- [ ] 性能验证
- [ ] 安全性验证
- [ ] 用户体验验证
- [ ] 文档更新

---

## 🎯 成功标准

### 功能标准

- ✅ 单个文档生成成功率 > 99%
- ✅ 批量生成支持 >= 1000 个文档
- ✅ 错误消息清晰准确
- ✅ 所有现有功能保持可用

### 性能标准

- ✅ 单个文档生成时间 < 2秒
- ✅ 批量生成吞吐量 > 10文档/秒
- ✅ API响应时间 < 500ms (不含生成时间)
- ✅ 内存使用 < 500MB (100个文档批量)

### 质量标准

- ✅ 单元测试覆盖率 > 80%
- ✅ 集成测试覆盖关键路径
- ✅ 代码审查通过
- ✅ 文档完整

---

## 📚 参考资料

### 相关文档

- [API_SPECIFICATION_PHASE2.md](./API_SPECIFICATION_PHASE2.md)
- [FRONTEND_REFACTORING_GUIDE.md](./FRONTEND_REFACTORING_GUIDE.md)
- [COMPONENT_ARCHITECTURE.md](./COMPONENT_ARCHITECTURE.md)

### 技术文档

- [docxtemplater官方文档](https://docxtemplater.com/)
- [Express最佳实践](https://expressjs.com/en/advanced/best-practices.html)
- [Node.js性能优化](https://nodejs.org/en/docs/guides/simple-profiling/)

---

## 📞 联系方式

**架构师**: Chief Architect
**技术支持**: Head of Engineering
**产品协调**: Head of Product

---

**版本历史**:

| 版本 | 日期 | 作者 | 变更说明 |
|------|------|------|----------|
| 1.0.0 | 2026-02-01 | Chief Architect | 初始版本 |

---

**文档状态**: ✅ 设计完成，待审核
**下一步**: 开始实施阶段1 (P0核心功能)
