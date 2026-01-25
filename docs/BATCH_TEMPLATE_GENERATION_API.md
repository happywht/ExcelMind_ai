# 多模板文档生成系统 - API规范文档

## 文档版本

- **版本**: 2.0.0
- **日期**: 2025-01-25
- **作者**: API架构专家
- **状态**: API规范定义完成

---

## 目录

1. [API概述](#api概述)
2. [通用规范](#通用规范)
3. [模板管理API](#模板管理api)
4. [批量任务API](#批量任务api)
5. [历史记录API](#历史记录api)
6. [WebSocket协议](#websocket协议)
7. [错误代码](#错误代码)

---

## API概述

### 基础URL

```
生产环境: https://api.excelmind.ai/v2
开发环境: http://localhost:3000/api/v2
```

### 认证方式

```http
Authorization: Bearer {access_token}
```

### 请求格式

- Content-Type: `application/json`
- Accept: `application/json`
- 编码: UTF-8

### 响应格式

所有API响应遵循统一格式：

**成功响应**:
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "requestId": "req_20250125_abc123",
    "timestamp": "2025-01-25T10:30:00Z",
    "version": "2.0.0"
  }
}
```

**错误响应**:
```json
{
  "success": false,
  "error": {
    "code": "TEMPLATE_NOT_FOUND",
    "message": "模板不存在",
    "details": {
      "templateId": "tpl_123"
    },
    "requestId": "req_20250125_abc123",
    "timestamp": "2025-01-25T10:30:00Z"
  }
}
```

---

## 通用规范

### 分页参数

| 参数 | 类型 | 必填 | 默认值 | 描述 |
|------|------|------|--------|------|
| page | integer | 否 | 1 | 页码 |
| limit | integer | 否 | 20 | 每页数量 (最大100) |
| sortBy | string | 否 | createdAt | 排序字段 |
| sortOrder | string | 否 | desc | 排序方向: asc, desc |

**分页响应**:
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 156,
      "totalPages": 8
    }
  }
}
```

### 状态过滤

| 参数 | 类型 | 描述 |
|------|------|------|
| status | string | 任务状态: pending, running, paused, completed, failed, cancelled |
| dateFrom | timestamp | 开始日期筛选 |
| dateTo | timestamp | 结束日期筛选 |

---

## 模板管理API

### 1. 上传模板

上传新的Word模板文件。

**端点**: `POST /api/v2/templates/upload`

**请求体**:

```json
{
  "name": "销售合同模板",
  "description": "用于生成销售合同的Word模板",
  "category": "合同",
  "tags": ["销售", "合同", "2024"],
  "file": "<base64_encoded_file>",
  "version": "1.0.0"
}
```

**字段说明**:

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| name | string | ✓ | 模板名称 (最大100字符) |
| description | string | ✗ | 模板描述 (最大500字符) |
| category | string | ✗ | 分类 (最大50字符) |
| tags | string[] | ✗ | 标签列表 (最多10个) |
| file | string/base64 | ✓ | Base64编码的文件内容 |
| version | string | ✗ | 版本号 (默认1.0.0) |

**成功响应**: `201 Created`

```json
{
  "success": true,
  "data": {
    "templateId": "tpl_20250125_abc123",
    "metadata": {
      "id": "tpl_20250125_abc123",
      "name": "销售合同模板",
      "description": "用于生成销售合同的Word模板",
      "category": "合同",
      "tags": ["销售", "合同", "2024"],
      "version": "1.0.0",
      "status": "active",
      "createdAt": 1737778800000,
      "updatedAt": 1737778800000,
      "fileSize": 45678,
      "placeholderCount": 15,
      "complexity": "complex"
    },
    "placeholders": [
      "{{合同编号}}",
      "{{甲方名称}}",
      "{{乙方名称}}",
      "{{合同金额}}",
      "{{签订日期}}",
      ...
    ],
    "previewHtml": "<html>...</html>",
    "validationResult": {
      "valid": true,
      "errors": [],
      "warnings": []
    }
  },
  "meta": { ... }
}
```

**错误响应**:

| 错误代码 | HTTP状态 | 描述 |
|----------|----------|------|
| INVALID_FILE_FORMAT | 400 | 文件格式不支持（仅支持.docx） |
| FILE_TOO_LARGE | 400 | 文件超过大小限制（最大10MB） |
| TEMPLATE_PARSE_FAILED | 400 | 模板解析失败 |
| DUPLICATE_TEMPLATE_NAME | 409 | 同名模板已存在 |

---

### 2. 获取模板详情

获取指定模板的完整信息。

**端点**: `GET /api/v2/templates/{templateId}`

**路径参数**:

| 参数 | 类型 | 描述 |
|------|------|------|
| templateId | string | 模板ID |

**成功响应**: `200 OK`

```json
{
  "success": true,
  "data": {
    "metadata": { ... },
    "config": {
      "metadata": { ... },
      "fileBuffer": "<array_buffer>",
      "placeholders": [...],
      "defaultMappings": {
        "{{合同编号}}": "contract_id",
        "{{甲方名称}}": "party_a_name"
      },
      "validationRules": [
        {
          "field": "{{合同金额}}",
          "type": "required",
          "errorMessage": "合同金额不能为空"
        }
      ],
      "sampleData": {
        "合同编号": "CT2025001",
        "甲方名称": "示例公司A"
      },
      "previewHtml": "<html>...</html>"
    }
  }
}
```

**错误响应**:

| 错误代码 | HTTP状态 | 描述 |
|----------|----------|------|
| TEMPLATE_NOT_FOUND | 404 | 模板不存在 |

---

### 3. 列出模板

获取模板列表，支持分页和筛选。

**端点**: `GET /api/v2/templates`

**查询参数**:

| 参数 | 类型 | 必填 | 默认值 | 描述 |
|------|------|------|--------|------|
| page | integer | ✗ | 1 | 页码 |
| limit | integer | ✗ | 20 | 每页数量 |
| category | string | ✗ | - | 按分类筛选 |
| tags | string[] | ✗ | - | 按标签筛选 |
| status | string | ✗ | active | 按状态筛选 |
| search | string | ✗ | - | 搜索关键词 |
| sortBy | string | ✗ | createdAt | 排序字段 |
| sortOrder | string | ✗ | desc | 排序方向 |

**成功响应**: `200 OK`

```json
{
  "success": true,
  "data": {
    "templates": [
      {
        "metadata": {
          "id": "tpl_123",
          "name": "销售合同模板",
          "category": "合同",
          "tags": ["销售", "合同"],
          "version": "1.0.0",
          "status": "active",
          "createdAt": 1737778800000,
          "updatedAt": 1737778800000,
          "fileSize": 45678,
          "placeholderCount": 15,
          "complexity": "complex"
        },
        "placeholderCount": 15,
        "complexity": "complex"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    },
    "categories": ["合同", "报告", "证书"],
    "tags": ["销售", "合同", "2024", "报告"]
  }
}
```

---

### 4. 更新模板

更新模板的元数据和配置。

**端点**: `PATCH /api/v2/templates/{templateId}`

**请求体**:

```json
{
  "name": "销售合同模板（更新版）",
  "description": "更新后的描述",
  "category": "销售合同",
  "tags": ["销售", "合同", "2025"],
  "status": "active",
  "defaultMappings": {
    "{{合同编号}}": "contract_id",
    "{{甲方名称}}": "party_a_name",
    "{{乙方名称}}": "party_b_name"
  },
  "validationRules": [
    {
      "field": "{{合同金额}}",
      "type": "required",
      "errorMessage": "合同金额不能为空"
    },
    {
      "field": "{{合同金额}}",
      "type": "range",
      "condition": "value > 0",
      "errorMessage": "合同金额必须大于0"
    }
  ]
}
```

**成功响应**: `200 OK`

```json
{
  "success": true,
  "data": {
    "templateId": "tpl_123",
    "metadata": { ... },
    "message": "模板更新成功"
  }
}
```

---

### 5. 删除模板

删除指定模板（软删除）。

**端点**: `DELETE /api/v2/templates/{templateId}`

**成功响应**: `204 No Content`

---

### 6. 验证模板

验证模板的有效性。

**端点**: `POST /api/v2/templates/{templateId}/validate`

**成功响应**: `200 OK`

```json
{
  "success": true,
  "data": {
    "valid": true,
    "errors": [],
    "warnings": [
      "某些占位符可能缺少默认映射"
    ],
    "placeholderCount": 15,
    "complexity": "complex",
    "estimatedSuccessRate": 0.95
  }
}
```

---

### 7. 提取占位符

提取模板中的所有占位符。

**端点**: `GET /api/v2/templates/{templateId}/placeholders`

**成功响应**: `200 OK`

```json
{
  "success": true,
  "data": {
    "placeholders": [
      {
        "name": "合同编号",
        "rawPlaceholder": "{{合同编号}}",
        "dataType": "string",
        "required": true,
        "context": {
          "section": "基本信息",
          "position": 1
        }
      },
      ...
    ],
    "total": 15
  }
}
```

---

## 批量任务API

### 1. 创建批量任务

创建新的批量生成任务。

**端点**: `POST /api/v2/batch/tasks`

**请求体**:

```json
{
  "mode": "multi_template",
  "templateIds": ["tpl_123", "tpl_456"],
  "dataSource": {
    "type": "excel",
    "source": {
      "file": {
        "name": "sales_data.xlsx",
        "buffer": "<base64_encoded_file>"
      }
    },
    "filter": "row['amount'] > 10000",
    "sort": {
      "field": "amount",
      "order": "desc"
    },
    "limit": 100
  },
  "parameters": {
    "fileNameTemplate": "{{name}}_合同_{{date}}.docx",
    "dateFormat": "YYYY-MM-DD",
    "numberFormat": "#,##0.00",
    "compressOutput": true,
    "outputFormat": "docx"
  },
  "output": {
    "type": "download",
    "download": {
      "fileName": "销售合同_批量",
      "zipFileName": "销售合同_{{timestamp}}.zip"
    }
  },
  "options": {
    "concurrency": 3,
    "batchSize": 10,
    "continueOnError": true,
    "retryCount": 2,
    "retryDelay": 1000,
    "memoryLimit": 512,
    "timeout": 300,
    "enableWebSocket": true,
    "progressInterval": 500
  },
  "priority": "normal",
  "scheduledAt": 1737778800000
}
```

**字段说明**:

#### mode (生成模式)

| 值 | 描述 |
|----|------|
| single_template | 单模板多数据（每个模板生成所有数据对应的文档） |
| multi_template | 多模板单数据（每个数据项使用所有模板生成文档） |
| cross_product | 多模板多数据（笛卡尔积，每个模板×每个数据项） |

#### dataSource (数据源配置)

| type | 描述 | source结构 |
|------|------|------------|
| excel | Excel文件 | `{ file: { name, buffer } }` |
| csv | CSV文件 | `{ file: { name, buffer } }` |
| json | JSON数据 | `{ inline: [...] }` 或 `{ endpoint: { url } }` |
| database | 数据库查询 | `{ connection: {...}, query: "..." }` |
| api | API接口 | `{ endpoint: { url, headers } }` |

#### options (任务选项)

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| concurrency | integer | 3 | 并发生成数量 |
| batchSize | integer | 10 | 每批处理数量 |
| continueOnError | boolean | true | 遇到错误是否继续 |
| retryCount | integer | 2 | 失败重试次数 |
| retryDelay | integer | 1000 | 重试延迟（毫秒） |
| memoryLimit | integer | 512 | 内存限制（MB） |
| timeout | integer | 300 | 任务超时（秒） |
| enableWebSocket | boolean | true | 是否启用WebSocket |
| progressInterval | integer | 500 | 进度推送间隔（毫秒） |

**成功响应**: `201 Created`

```json
{
  "success": true,
  "data": {
    "taskId": "task_20250125_xyz789",
    "status": "pending",
    "estimatedDuration": 45000,
    "estimatedCompletionAt": 1737778845000,
    "message": "任务创建成功，等待执行",
    "nextSteps": [
      "任务已加入队列",
      "预计等待时间: 2分钟",
      "完成后将通过WebSocket通知"
    ]
  }
}
```

---

### 2. 启动任务

启动已创建的任务。

**端点**: `POST /api/v2/batch/tasks/{taskId}/start`

**成功响应**: `202 Accepted`

```json
{
  "success": true,
  "data": {
    "taskId": "task_123",
    "status": "running",
    "startedAt": 1737778800000,
    "message": "任务已启动"
  }
}
```

---

### 3. 获取任务状态

获取任务的当前状态和进度。

**端点**: `GET /api/v2/batch/tasks/{taskId}/status`

**成功响应**: `200 OK`

```json
{
  "success": true,
  "data": {
    "taskId": "task_123",
    "status": "running",
    "progress": 45,
    "stage": "generating_documents",
    "execution": {
      "totalDocuments": 100,
      "completedDocuments": 45,
      "failedDocuments": 2,
      "skippedDocuments": 0,
      "currentBatch": 5,
      "totalBatches": 10,
      "currentIndex": 45,
      "estimatedTimeRemaining": 24750,
      "estimatedCompletionAt": 1737778827500
    },
    "stats": {
      "startTime": 1737778800000,
      "avgTimePerDocument": 250,
      "successRate": 0.956,
      "totalFileSize": 2056320,
      "avgFileSize": 45696,
      "generationSpeed": 240
    },
    "timestamps": {
      "createdAt": 1737778790000,
      "startedAt": 1737778800000
    }
  }
}
```

---

### 4. 暂停任务

暂停正在运行的任务。

**端点**: `POST /api/v2/batch/tasks/{taskId}/pause`

**成功响应**: `200 OK`

```json
{
  "success": true,
  "data": {
    "taskId": "task_123",
    "status": "paused",
    "pausedAt": 1737778850000,
    "message": "任务已暂停",
    "resumeUrl": "/api/v2/batch/tasks/task_123/resume"
  }
}
```

---

### 5. 恢复任务

恢复已暂停的任务。

**端点**: `POST /api/v2/batch/tasks/{taskId}/resume`

**成功响应**: `200 OK`

```json
{
  "success": true,
  "data": {
    "taskId": "task_123",
    "status": "running",
    "resumedAt": 1737778860000,
    "message": "任务已恢复"
  }
}
```

---

### 6. 取消任务

取消正在运行或等待的任务。

**端点**: `POST /api/v2/batch/tasks/{taskId}/cancel`

**成功响应**: `200 OK`

```json
{
  "success": true,
  "data": {
    "taskId": "task_123",
    "status": "cancelled",
    "cancelledAt": 1737778870000,
    "message": "任务已取消",
    "cleanup": {
      "deleteGeneratedFiles": true,
      "clearCache": true
    }
  }
}
```

---

### 7. 获取任务详情

获取任务的完整信息。

**端点**: `GET /api/v2/batch/tasks/{taskId}`

**成功响应**: `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "task_123",
    "status": "completed",
    "mode": "multi_template",
    "priority": "normal",
    "progress": 100,
    "config": { ... },
    "execution": { ... },
    "stats": { ... },
    "timestamps": { ... },
    "result": {
      "downloadUrl": "https://cdn.excelmind.ai/downloads/task_123.zip?token=xxx",
      "expiresAt": 1737865200000,
      "fileSize": 10240000,
      "documentCount": 100
    }
  }
}
```

---

### 8. 列出任务

获取任务列表，支持筛选和排序。

**端点**: `GET /api/v2/batch/tasks`

**查询参数**:

| 参数 | 类型 | 描述 |
|------|------|------|
| status | string | 状态筛选 |
| mode | string | 生成模式筛选 |
| dateFrom | timestamp | 开始日期 |
| dateTo | timestamp | 结束日期 |
| page | integer | 页码 |
| limit | integer | 每页数量 |
| sortBy | string | 排序字段 |
| sortOrder | string | 排序方向 |

**成功响应**: `200 OK`

```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": "task_123",
        "status": "completed",
        "mode": "multi_template",
        "progress": 100,
        "createdAt": 1737778790000,
        "completedAt": 1737778835000
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 156,
      "totalPages": 8
    }
  }
}
```

---

### 9. 下载任务结果

下载生成的文档。

**端点**: `GET /api/v2/batch/tasks/{taskId}/download`

**查询参数**:

| 参数 | 类型 | 描述 |
|------|------|------|
| format | string | 下载格式: zip, individual |

**成功响应**: `200 OK`

```
Content-Type: application/zip
Content-Disposition: attachment; filename="documents_batch_20250125.zip"
Content-Length: 10240000

<binary data>
```

---

## 历史记录API

### 1. 获取历史记录

获取任务历史记录列表。

**端点**: `GET /api/v2/history`

**查询参数**:

| 参数 | 类型 | 描述 |
|------|------|------|
| page | integer | 页码 |
| limit | integer | 每页数量 |
| status | string | 状态筛选 |
| mode | string | 生成模式筛选 |
| templateId | string | 模板ID筛选 |
| dateFrom | timestamp | 开始日期 |
| dateTo | timestamp | 结束日期 |
| userId | string | 用户ID筛选 |
| sortBy | string | 排序字段 |
| sortOrder | string | 排序方向 |
| search | string | 搜索关键词 |

**成功响应**: `200 OK`

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "task_123",
        "taskId": "task_123",
        "status": "completed",
        "mode": "multi_template",
        "config": {
          "templateIds": ["tpl_123", "tpl_456"],
          "templateNames": ["销售合同", "采购合同"],
          "dataSourceType": "excel",
          "dataSourceName": "sales_data.xlsx",
          "totalDocuments": 100
        },
        "stats": {
          "startTime": 1737778800000,
          "endTime": 1737778835000,
          "duration": 35000,
          "avgTimePerDocument": 350,
          "successRate": 0.98
        },
        "timestamps": {
          "createdAt": 1737778790000,
          "startedAt": 1737778800000,
          "completedAt": 1737778835000
        },
        "userId": "user_123",
        "userName": "张三"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 234,
      "totalPages": 12
    },
    "summary": {
      "totalTasks": 234,
      "completedTasks": 200,
      "failedTasks": 15,
      "totalDocuments": 23400,
      "avgSuccessRate": 0.95
    }
  }
}
```

---

### 2. 获取历史详情

获取单个历史记录的详细信息。

**端点**: `GET /api/v2/history/{taskId}`

**成功响应**: `200 OK`

```json
{
  "success": true,
  "data": {
    "item": { ... },
    "documents": [
      {
        "id": "doc_123",
        "templateId": "tpl_123",
        "templateName": "销售合同",
        "dataIndex": 1,
        "fileName": "张三_销售合同_20250125.docx",
        "fileSize": 45678,
        "status": "success",
        "generatedAt": 1737778805000
      }
    ],
    "errors": [
      {
        "documentId": "doc_456",
        "dataIndex": 5,
        "error": {
          "code": "GENERATION_ERROR",
          "message": "缺少必需字段: 合同金额"
        }
      }
    ]
  }
}
```

---

### 3. 重新生成

重新执行历史任务。

**端点**: `POST /api/v2/history/{taskId}/regenerate`

**请求体**:

```json
{
  "options": {
    "useLatestTemplate": false,
    "overrideDataSource": {
      "type": "excel",
      "source": {
        "file": {
          "name": "new_data.xlsx",
          "buffer": "<base64>"
        }
      }
    }
  }
}
```

**成功响应**: `201 Created`

```json
{
  "success": true,
  "data": {
    "newTaskId": "task_456",
    "message": "已创建新任务",
    "originalTaskId": "task_123"
  }
}
```

---

### 4. 删除历史记录

删除指定的历史记录。

**端点**: `DELETE /api/v2/history/{taskId}`

**成功响应**: `204 No Content`

---

## WebSocket协议

### 连接端点

```
wss://api.excelmind.ai/v2/stream
```

### 订阅任务

客户端连接后发送订阅消息：

```json
{
  "action": "subscribe",
  "taskIds": ["task_123", "task_456"]
}
```

### 取消订阅

```json
{
  "action": "unsubscribe",
  "taskIds": ["task_123"]
}
```

### 服务端推送事件

#### 1. 进度更新

```json
{
  "type": "progress",
  "taskId": "task_123",
  "progress": 45,
  "stage": "generating_documents",
  "message": "正在生成文档 45/100",
  "timestamp": 1737778805000
}
```

#### 2. 文档生成完成

```json
{
  "type": "document_generated",
  "taskId": "task_123",
  "documentId": "doc_456",
  "templateId": "tpl_123",
  "dataIndex": 45,
  "status": "success",
  "fileName": "张三_销售合同.docx",
  "timestamp": 1737778805000
}
```

#### 3. 任务状态变更

```json
{
  "type": "status_changed",
  "taskId": "task_123",
  "oldStatus": "running",
  "newStatus": "completed",
  "timestamp": 1737778835000,
  "reason": "所有文档生成完成"
}
```

#### 4. 错误通知

```json
{
  "type": "error",
  "taskId": "task_123",
  "error": {
    "code": "GENERATION_ERROR",
    "message": "文档生成失败: 缺少必需字段",
    "details": {
      "documentId": "doc_789",
      "dataIndex": 67,
      "missingFields": ["合同金额"]
    }
  },
  "timestamp": 1737778810000,
  "fatal": false
}
```

#### 5. 任务完成

```json
{
  "type": "completed",
  "taskId": "task_123",
  "status": "completed",
  "result": {
    "downloadUrl": "https://cdn.excelmind.ai/downloads/task_123.zip",
    "expiresAt": 1737865200000,
    "stats": {
      "total": 100,
      "successful": 98,
      "failed": 2,
      "duration": 35000
    }
  },
  "timestamp": 1737778835000
}
```

---

## 错误代码

### 客户端错误 (4xx)

| 错误代码 | HTTP状态 | 描述 | 解决方案 |
|----------|----------|------|----------|
| INVALID_REQUEST | 400 | 请求参数无效 | 检查请求格式和参数 |
| INVALID_FILE_FORMAT | 400 | 文件格式不支持 | 使用支持的文件格式 |
| FILE_TOO_LARGE | 400 | 文件超过大小限制 | 压缩文件或分批上传 |
| TEMPLATE_PARSE_FAILED | 400 | 模板解析失败 | 检查模板格式 |
| UNAUTHORIZED | 401 | 未授权 | 提供有效的认证令牌 |
| FORBIDDEN | 403 | 禁止访问 | 检查权限 |
| TEMPLATE_NOT_FOUND | 404 | 模板不存在 | 检查模板ID |
| TASK_NOT_FOUND | 404 | 任务不存在 | 检查任务ID |
| DUPLICATE_TEMPLATE_NAME | 409 | 同名模板已存在 | 使用不同的名称 |
| TASK_ALREADY_RUNNING | 409 | 任务已在运行 | 不要重复启动 |
| RATE_LIMIT_EXCEEDED | 429 | 超出速率限制 | 降低请求频率 |

### 服务器错误 (5xx)

| 错误代码 | HTTP状态 | 描述 | 解决方案 |
|----------|----------|------|----------|
| INTERNAL_ERROR | 500 | 服务器内部错误 | 联系技术支持 |
| GENERATION_ERROR | 500 | 文档生成失败 | 检查数据和模板 |
| STORAGE_ERROR | 500 | 存储错误 | 联系技术支持 |
| DATA_LOAD_ERROR | 500 | 数据加载失败 | 检查数据源 |
| OUT_OF_MEMORY | 500 | 内存不足 | 减少批次大小 |
| TIMEOUT | 500 | 任务超时 | 增加超时时间 |
| SERVICE_UNAVAILABLE | 503 | 服务不可用 | 稍后重试 |

---

## 附录

### 任务状态图

```
                    ┌──────────┐
                    │ PENDING  │
                    └────┬─────┘
                         │ start
                    ┌────▼─────┐
                    │ RUNNING  │
                    └────┬─────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
    pause│         complete│         cancel│
        │                │                │
   ┌────▼─────┐     ┌────▼─────┐    ┌────▼────┐
   │  PAUSED  │     │ COMPLETED│    │CANCELLED│
   └────┬─────┘     └──────────┘    └─────────┘
        │
        │ resume
        │
   ┌────▼─────┐
   │ RUNNING  │
   └──────────┘
```

### 生成模式示例

#### Single Template (单模板多数据)

```
模板: A
数据: [1, 2, 3]

结果:
- A-1.docx
- A-2.docx
- A-3.docx
```

#### Multi Template (多模板单数据)

```
模板: [A, B]
数据: 1

结果:
- A-1.docx
- B-1.docx
```

#### Cross Product (多模板多数据)

```
模板: [A, B]
数据: [1, 2, 3]

结果:
- A-1.docx
- A-2.docx
- A-3.docx
- B-1.docx
- B-2.docx
- B-3.docx
```

### 请求示例 (cURL)

**上传模板**:

```bash
curl -X POST https://api.excelmind.ai/v2/templates/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "销售合同模板",
    "description": "用于生成销售合同",
    "category": "合同",
    "file": "'"$(base64 -w 0 template.docx)"'"
  }'
```

**创建批量任务**:

```bash
curl -X POST https://api.excelmind.ai/v2/batch/tasks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "multi_template",
    "templateIds": ["tpl_123", "tpl_456"],
    "dataSource": {
      "type": "excel",
      "source": {
        "file": {
          "name": "data.xlsx",
          "buffer": "'"$(base64 -w 0 data.xlsx)"'"
        }
      }
    },
    "options": {
      "concurrency": 3,
      "continueOnError": true
    }
  }'
```

---

## 更新日志

### v2.0.0 (2025-01-25)

**新增功能**:
- ✅ 多模板批量生成
- ✅ 实时进度推送（WebSocket）
- ✅ 任务队列和调度
- ✅ 历史记录管理
- ✅ 任务暂停/恢复
- ✅ 优先级调度

**API变更**:
- 🔄 重构API路径结构 (/api/v2)
- ➕ 新增批量任务API
- ➕ 新增历史记录API
- ➕ 新增WebSocket协议

**计划中的功能**:
- [ ] 分布式任务队列
- [ ] 任务依赖管理
- [ ] 定时任务调度
- [ ] 更多数据源支持
- [ ] API Webhook通知
