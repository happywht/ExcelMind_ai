# AI驱动智能文档填充系统 - REST API规范

## 目录

- [概述](#概述)
- [架构设计](#架构设计)
- [通用规范](#通用规范)
- [API端点](#api端点)
- [数据模型](#数据模型)
- [错误处理](#错误处理)
- [速率限制](#速率限制)
- [认证授权](#认证授权)

---

## 概述

本文档定义了AI驱动智能文档填充系统的REST API接口。该系统通过多轮AI交互，实现从Excel数据到Word文档的智能填充。

### 核心特性

- **多阶段AI工作流**: 分析 -> 规划 -> 生成 -> 验证
- **用户干预**: 支持在任何阶段进行人工调整
- **缓存优化**: 多层缓存策略提升响应速度
- **弹性设计**: 重试、降级机制保证系统稳定性
- **可扩展性**: 支持多种数据源和文档格式

### 基础URL

```
生产环境: https://api.excelmind.ai/v1
开发环境: http://localhost:3000/api/v1
```

---

## 架构设计

### 分层架构

```
┌─────────────────────────────────────────────────────────┐
│                    API Gateway Layer                     │
│         (认证、限流、监控、日志)                          │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│                    Controller Layer                      │
│              (请求处理、响应组装)                         │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│                    Service Layer                         │
│   (IntelligentDocumentService + 各专业服务)              │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│                  Orchestration Layer                     │
│          (AI编排、任务编排、缓存管理)                     │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│                   Infrastructure                         │
│         (重试、降级、事件总线、持久化)                    │
└─────────────────────────────────────────────────────────┘
```

### 服务依赖图

```
IntelligentDocumentService
├── TemplateAnalysisService
├── DataSourceAnalysisService
├── MappingPlanningService
├── DocumentGenerationService
├── AIOrchestrationService
│   └── Anthropic SDK (智谱AI)
├── CacheService
│   ├── MemoryCache
│   ├── LocalStorageCache
│   └── IndexedDBCache
├── RetryStrategy
├── FallbackStrategy
├── EventBus
└── TaskRepository
```

---

## 通用规范

### 请求格式

所有API端点使用标准HTTP方法：

| 方法 | 用途 |
|------|------|
| GET | 获取资源 |
| POST | 创建资源 |
| PUT | 完整更新资源 |
| PATCH | 部分更新资源 |
| DELETE | 删除资源 |

### 请求头

```http
Content-Type: application/json
Authorization: Bearer {access_token}
X-Request-ID: {unique_request_id}
X-Client-Version: {client_version}
Accept: application/json
```

### 响应格式

#### 成功响应

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "requestId": "req_123456",
    "timestamp": "2025-01-15T10:30:00Z",
    "version": "1.0"
  }
}
```

#### 错误响应

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数验证失败",
    "details": [
      {
        "field": "userInstruction",
        "message": "用户指令不能为空"
      }
    ],
    "requestId": "req_123456",
    "timestamp": "2025-01-15T10:30:00Z"
  }
}
```

### 分页

```http
GET /api/v1/tasks?page=1&limit=20&sort=-createdAt
```

响应头：
```http
X-Total-Count: 100
X-Page: 1
X-Per-Page: 20
X-Total-Pages: 5
```

---

## API端点

### 1. 任务管理

#### 1.1 创建任务

创建新的文档生成任务。

```http
POST /api/v1/tasks
```

**请求体：**

```json
{
  "templateFile": "<base64_encoded_file>",
  "templateFileName": "contract_template.docx",
  "dataFiles": [
    {
      "file": "<base64_encoded_file>",
      "fileName": "sales_data.xlsx"
    }
  ],
  "userInstruction": "把销售额大于10万的产品信息填入模板，生成产品介绍文档",
  "options": {
    "outputFormat": "docx",
    "batchSize": 100
  }
}
```

**响应：** `201 Created`

```json
{
  "success": true,
  "data": {
    "taskId": "task_1736939400000_abc123",
    "status": "pending",
    "estimatedDuration": 45000,
    "nextSteps": [
      "模板分析",
      "数据分析",
      "语义理解",
      "映射规划",
      "文档生成"
    ]
  },
  "meta": { ... }
}
```

#### 1.2 启动任务

启动已创建的任务。

```http
POST /api/v1/tasks/{taskId}/start
```

**响应：** `202 Accepted`

```json
{
  "success": true,
  "data": {
    "taskId": "task_1736939400000_abc123",
    "status": "in_progress",
    "currentStage": "template_analysis",
    "startedAt": "2025-01-15T10:30:00Z"
  },
  "meta": { ... }
}
```

#### 1.3 获取任务状态

获取任务的执行状态。

```http
GET /api/v1/tasks/{taskId}/status
```

**响应：** `200 OK`

```json
{
  "success": true,
  "data": {
    "taskId": "task_1736939400000_abc123",
    "status": "in_progress",
    "progress": 55,
    "currentStage": "mapping_planning",
    "completedStages": [
      "template_analysis",
      "data_analysis",
      "semantic_analysis"
    ],
    "remainingStages": [
      "transformation_generation",
      "document_generation",
      "validation"
    ],
    "metadata": {
      "startedAt": "2025-01-15T10:30:00Z",
      "estimatedCompletionAt": "2025-01-15T10:31:30Z",
      "currentAIRound": "mapping_planning"
    }
  },
  "meta": { ... }
}
```

#### 1.4 获取任务详情

获取任务的完整信息。

```http
GET /api/v1/tasks/{taskId}
```

**响应：** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "task_1736939400000_abc123",
    "status": "completed",
    "progress": 100,
    "currentStage": "completed",
    "startedAt": "2025-01-15T10:30:00Z",
    "completedAt": "2025-01-15T10:31:15Z",
    "template": {
      "format": "docx",
      "fileName": "contract_template.docx",
      "placeholders": [...]
    },
    "dataSources": [...],
    "mappingScheme": {...},
    "generatedDocuments": [...],
    "aiRounds": [...]
  },
  "meta": { ... }
}
```

#### 1.5 列出任务

获取任务列表。

```http
GET /api/v1/tasks?status=in_progress&stage=mapping_planning&page=1&limit=20
```

**查询参数：**

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| status | string | 否 | 筛选状态: pending, in_progress, completed, failed |
| stage | string | 否 | 筛选阶段 |
| page | integer | 否 | 页码，默认1 |
| limit | integer | 否 | 每页数量，默认20 |
| sort | string | 否 | 排序，如 -createdAt |

**响应：** `200 OK`

```json
{
  "success": true,
  "data": {
    "tasks": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  },
  "meta": { ... }
}
```

#### 1.6 取消任务

取消正在执行的任务。

```http
POST /api/v1/tasks/{taskId}/cancel
```

**响应：** `200 OK`

```json
{
  "success": true,
  "data": {
    "taskId": "task_1736939400000_abc123",
    "status": "cancelled",
    "cancelledAt": "2025-01-15T10:30:45Z"
  },
  "meta": { ... }
}
```

#### 1.7 暂停任务

暂停任务执行（等待用户输入）。

```http
POST /api/v1/tasks/{taskId}/pause
```

**响应：** `200 OK`

```json
{
  "success": true,
  "data": {
    "taskId": "task_1736939400000_abc123",
    "status": "awaiting_user_input",
    "pausedAt": "2025-01-15T10:30:45Z"
  },
  "meta": { ... }
}
```

#### 1.8 恢复任务

恢复暂停的任务。

```http
POST /api/v1/tasks/{taskId}/resume
```

**响应：** `200 OK`

```json
{
  "success": true,
  "data": {
    "taskId": "task_1736939400000_abc123",
    "status": "in_progress",
    "resumedAt": "2025-01-15T10:31:00Z"
  },
  "meta": { ... }
}
```

#### 1.9 删除任务

删除已完成的任务。

```http
DELETE /api/v1/tasks/{taskId}
```

**响应：** `204 No Content`

#### 1.10 重试阶段

重试失败的特定阶段。

```http
POST /api/v1/tasks/{taskId}/retry/{stage}
```

**路径参数：**

- `stage`: template_analysis, data_analysis, semantic_analysis, mapping_planning, transformation_generation, document_generation, validation

**响应：** `202 Accepted`

```json
{
  "success": true,
  "data": {
    "taskId": "task_1736939400000_abc123",
    "status": "in_progress",
    "retryStage": "mapping_planning",
    "restartedAt": "2025-01-15T10:31:00Z"
  },
  "meta": { ... }
}
```

### 2. 用户反馈

#### 2.1 提交用户反馈

提供对AI分析结果的反馈。

```http
POST /api/v1/tasks/{taskId}/feedback
```

**请求体（批准）：**

```json
{
  "round": "mapping_planning",
  "feedback": {
    "approved": true
  }
}
```

**请求体（修改）：**

```json
{
  "round": "mapping_planning",
  "feedback": {
    "approved": false,
    "modifications": {
      "mappings": [
        {
          "placeholder": "{{产品名称}}",
          "excelColumn": "product_name",
          "confidence": 1.0
        }
      ],
      "filterCondition": "row['sales'] > 100000"
    },
    "answers": {
      "q1": "是"
    }
  }
}
```

**响应：** `200 OK`

```json
{
  "success": true,
  "data": {
    "received": true,
    "nextRound": "transformation_generation",
    "updatedTask": { ... }
  },
  "meta": { ... }
}
```

### 3. 文档下载

#### 3.1 下载单个文档

下载生成的单个文档。

```http
GET /api/v1/tasks/{taskId}/documents/{documentId}
```

**响应：** `200 OK`

```
Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document
Content-Disposition: attachment; filename="product_1.docx"
Content-Length: 24568

<binary data>
```

#### 3.2 下载全部文档（ZIP）

下载打包的全部文档。

```http
GET /api/v1/tasks/{taskId}/documents/zip
```

**响应：** `200 OK`

```
Content-Type: application/zip
Content-Disposition: attachment; filename="documents_batch_1736939400000.zip"
Content-Length: 1024000

<binary data>
```

#### 3.3 获取下载URL

获取文档的临时下载URL。

```http
GET /api/v1/tasks/{taskId}/documents/{documentId}/url
```

**响应：** `200 OK`

```json
{
  "success": true,
  "data": {
    "url": "https://cdn.excelmind.ai/downloads/doc_123456?token=xxx&expires=1736940000",
    "expiresAt": "2025-01-15T11:00:00Z"
  },
  "meta": { ... }
}
```

### 4. 模板分析

#### 4.1 分析模板（独立端点）

独立分析模板结构，不创建任务。

```http
POST /api/v1/templates/analyze
```

**请求体：**

```json
{
  "templateFile": "<base64_encoded_file>",
  "fileName": "template.docx",
  "options": {
    "detectFeatures": true,
    "generatePreview": true
  }
}
```

**响应：** `200 OK`

```json
{
  "success": true,
  "data": {
    "format": "docx",
    "fileName": "template.docx",
    "placeholders": [
      {
        "id": "ph_1",
        "name": "产品名称",
        "rawPlaceholder": "{{产品名称}}",
        "dataType": "string",
        "required": true,
        "context": {
          "section": "产品信息",
          "position": 1,
          "surroundingText": "产品名称：___，型号..."
        }
      }
    ],
    "sections": [...],
    "hasConditionalBlocks": false,
    "hasLoops": false,
    "htmlPreview": "<html>...</html>"
  },
  "meta": { ... }
}
```

### 5. 数据源分析

#### 5.1 分析数据源（独立端点）

独立分析数据源结构。

```http
POST /api/v1/datasources/analyze
```

**请求体：**

```json
{
  "dataFile": "<base64_encoded_file>",
  "fileName": "data.xlsx",
  "options": {
    "inferTypes": true,
    "detectRelationships": true,
    "sampleSize": 10
  }
}
```

**响应：** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "ds_123",
    "type": "excel",
    "name": "data.xlsx",
    "schema": {
      "columns": [
        {
          "name": "产品名称",
          "dataType": "string",
          "nullable": false,
          "sampleValues": ["产品A", "产品B"],
          "semanticHints": ["product name", "产品名"]
        }
      ],
      "relationships": [...]
    },
    "sampleData": [...]
  },
  "meta": { ... }
}
```

### 6. 映射方案管理

#### 6.1 生成映射方案（独立端点）

独立生成映射方案。

```http
POST /api/v1/mappings/generate
```

**请求体：**

```json
{
  "template": {
    "placeholders": ["{{产品名称}}", "{{销售额}}"]
  },
  "dataSources": [
    {
      "columns": ["product_name", "sales"],
      "sampleData": [...]
    }
  ],
  "userInstruction": "把销售额大于10万的产品填入模板"
}
```

**响应：** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "mapping_123",
    "mappings": [
      {
        "placeholder": "{{产品名称}}",
        "excelColumn": "product_name",
        "confidence": 0.95,
        "reasoning": "列名相似度高"
      }
    ],
    "filterCondition": "row['sales'] > 100000",
    "unmappedPlaceholders": [],
    "confidence": 0.9,
    "reasoning": "基于语义匹配和数据结构分析"
  },
  "meta": { ... }
}
```

#### 6.2 验证映射方案

```http
POST /api/v1/mappings/validate
```

**请求体：**

```json
{
  "mappingScheme": { ... },
  "template": { ... },
  "dataSources": [ ... ]
}
```

**响应：** `200 OK`

```json
{
  "success": true,
  "data": {
    "valid": true,
    "errors": [],
    "warnings": [
      "某些占位符可能无法填充数据"
    ],
    "estimatedSuccessRate": 0.95
  },
  "meta": { ... }
}
```

### 7. 系统信息

#### 7.1 健康检查

```http
GET /api/v1/health
```

**响应：** `200 OK`

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-01-15T10:30:00Z",
    "services": {
      "ai": "healthy",
      "cache": "healthy",
      "storage": "healthy"
    }
  },
  "meta": { ... }
}
```

#### 7.2 获取系统配置

```http
GET /api/v1/config
```

**响应：** `200 OK`

```json
{
  "success": true,
  "data": {
    "ai": {
      "provider": "zhipu",
      "model": "glm-4.6",
      "maxTokens": 8192
    },
    "limits": {
      "maxFileSize": 10485760,
      "maxConcurrentTasks": 5,
      "maxDocumentsPerBatch": 100
    },
    "features": {
      "supportedFormats": ["docx", "xlsx", "csv"],
      "cacheEnabled": true,
      "streamingEnabled": false
    }
  },
  "meta": { ... }
}
```

#### 7.3 获取API版本

```http
GET /api/v1/version
```

**响应：** `200 OK`

```json
{
  "success": true,
  "data": {
    "version": "1.0.0",
    "apiVersion": "v1",
    "buildDate": "2025-01-15T00:00:00Z",
    "changelog": "https://docs.excelmind.ai/changelog"
  },
  "meta": { ... }
}
```

---

## 数据模型

### 任务状态枚举

```typescript
enum ExecutionStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  AWAITING_USER_INPUT = 'awaiting_user_input'
}
```

### 处理阶段枚举

```typescript
enum ProcessingStage {
  INITIALIZATION = 'initialization',
  TEMPLATE_ANALYSIS = 'template_analysis',
  DATA_ANALYSIS = 'data_analysis',
  SEMANTIC_ANALYSIS = 'semantic_analysis',
  MAPPING_PLANNING = 'mapping_planning',
  TRANSFORMATION_GENERATION = 'transformation_generation',
  DOCUMENT_GENERATION = 'document_generation',
  VALIDATION = 'validation',
  COMPLETED = 'completed'
}
```

### 完整任务对象

```typescript
interface DocumentGenerationTask {
  id: string;
  status: ExecutionStatus;
  progress: number; // 0-100
  currentStage: ProcessingStage;
  startedAt: number;
  completedAt?: number;
  error?: ErrorInfo;

  // 输入
  template: TemplateStructure;
  dataSources: DataSourceConfig[];
  userInstruction: string;

  // 输出
  mappingScheme?: MappingSchemeV2;
  generatedDocuments?: GeneratedDocumentInfo[];

  // AI交互轮次记录
  aiRounds: AIRoundRecord[];
}
```

---

## 错误处理

### 错误代码

| 代码 | HTTP状态 | 描述 |
|------|----------|------|
| VALIDATION_ERROR | 400 | 请求参数验证失败 |
| UNAUTHORIZED | 401 | 未授权 |
| FORBIDDEN | 403 | 禁止访问 |
| NOT_FOUND | 404 | 资源不存在 |
| CONFLICT | 409 | 资源冲突 |
| RATE_LIMIT_EXCEEDED | 429 | 超出速率限制 |
| INTERNAL_ERROR | 500 | 服务器内部错误 |
| SERVICE_UNAVAILABLE | 503 | 服务不可用 |
| AI_SERVICE_ERROR | 500 | AI服务错误 |
| TASK_EXECUTION_FAILED | 500 | 任务执行失败 |

### 错误响应格式

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数验证失败",
    "details": [
      {
        "field": "templateFile",
        "message": "模板文件格式不支持，仅支持.docx格式"
      }
    ],
    "requestId": "req_1736939400000_abc",
    "timestamp": "2025-01-15T10:30:00Z",
    "helpUrl": "https://docs.excelmind.ai/errors/validation"
  }
}
```

---

## 速率限制

### 限制规则

| 级别 | 请求限制 | 窗口 |
|------|----------|------|
| 匿名用户 | 10 requests | 1 minute |
| 认证用户 | 100 requests | 1 minute |
| 企业用户 | 1000 requests | 1 minute |

### 响应头

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1736939460
```

### 超限响应

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1736939460
```

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "超出速率限制",
    "retryAfter": 60
  }
}
```

---

## 认证授权

### API密钥认证

```http
Authorization: Bearer your_api_key_here
```

### 获取API密钥

1. 登录 ExcelMind AI 控制台
2. 进入 "API密钥" 页面
3. 点击 "创建密钥"
4. 复制密钥（仅显示一次）

### 密钥权限

| 权限 | 描述 |
|------|------|
| read | 读取任务和文档 |
| write | 创建和管理任务 |
| delete | 删除任务和文档 |
| admin | 管理员权限 |

---

## 附录

### 状态转换图

```
                    ┌──────────┐
                    │ PENDING  │
                    └────┬─────┘
                         │ start
                    ┌────▼─────┐
                    │IN_PROGRESS│
                    └────┬─────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
   pause│           complete│         cancel│
        │                │                │
   ┌────▼─────┐     ┌────▼─────┐    ┌────▼────┐
   │AWAITING  │     │ COMPLETED│    │CANCELLED│
   │USER_INPUT│     └──────────┘    └─────────┘
   └────┬─────┘
        │ feedback/resume
        │
   ┌────▼─────┐
   │IN_PROGRESS│
   └──────────┘
```

### WebSocket事件流

对于需要实时更新的场景，支持WebSocket连接：

```javascript
const ws = new WebSocket('wss://api.excelmind.ai/v1/stream');

ws.onopen = () => {
  ws.send(JSON.stringify({
    action: 'subscribe',
    taskId: 'task_123'
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  switch (data.type) {
    case 'task:progress':
      updateProgress(data.progress);
      break;
    case 'task:completed':
      handleCompletion(data.result);
      break;
    case 'task:failed':
      handleError(data.error);
      break;
  }
};
```

---

## 更新日志

### v1.0.0 (2025-01-15)
- 初始API版本
- 支持基础任务管理
- 支持AI多轮交互
- 支持用户反馈机制
- 支持文档批量生成

### 计划中的功能
- [ ] WebSocket实时推送
- [ ] 异步任务队列
- [ ] Webhook通知
- [ ] 更多文档格式支持
- [ ] 自定义AI模型配置
