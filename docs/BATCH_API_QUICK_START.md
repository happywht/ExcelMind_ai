# 批量文档生成API - 快速开始指南

## 概述

批量文档生成API提供了完整的批量文档生成功能，支持：
- 多模板批量生成
- 实时进度推送（WebSocket）
- 任务控制（启动、暂停、恢复、取消）
- ZIP打包下载

## 快速开始

### 1. 启动服务器

```bash
# 方式1：使用启动脚本
ts-node scripts/start-batch-generation-server.ts

# 方式2：设置环境变量后启动
HTTP_PORT=3000 WS_PORT=3001 ts-node scripts/start-batch-generation-server.ts
```

服务器启动后：
- **HTTP API**: http://localhost:3000/api/v2
- **WebSocket**: ws://localhost:3001/v2/stream

### 2. 验证服务器状态

```bash
curl http://localhost:3000/api/v2/health
```

响应：
```json
{
  "status": "healthy",
  "timestamp": "2026-01-25T10:00:00.000Z",
  "services": {
    "scheduler": "running",
    "templateManager": "running",
    "websocketServer": "running"
  }
}
```

## API使用示例

### 创建批量任务

**请求：**
```http
POST /api/v2/batch/tasks
Content-Type: application/json

{
  "dataSourceId": "ds-001",
  "templateIds": ["template-001", "template-002"],
  "outputFormat": "docx",
  "mode": "sequential",
  "data": [
    {
      "name": "张三",
      "age": 30,
      "email": "zhangsan@example.com"
    },
    {
      "name": "李四",
      "age": 25,
      "email": "lisi@example.com"
    }
  ],
  "options": {
    "batchSize": 10,
    "parallelProcessing": false,
    "createZip": true
  }
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "taskId": "task_1737820800000_abc123",
    "status": "pending",
    "estimatedTime": 300,
    "estimatedDocumentCount": 4,
    "items": [
      {
        "templateId": "template-001",
        "templateName": "销售合同模板",
        "estimatedCount": 2
      },
      {
        "templateId": "template-002",
        "templateName": "采购订单模板",
        "estimatedCount": 2
      }
    ],
    "websocketUrl": "ws://localhost:3001/v2/stream/task_1737820800000_abc123"
  },
  "meta": {
    "requestId": "req_20260125_001",
    "timestamp": "2026-01-25T10:00:00.000Z",
    "version": "2.0.0",
    "executionTime": 45
  }
}
```

### 启动任务

**请求：**
```http
POST /api/v2/batch/tasks/{taskId}/start
```

**响应：**
```json
{
  "success": true,
  "data": {
    "taskId": "task_1737820800000_abc123",
    "status": "running",
    "startedAt": "2026-01-25T10:00:05.000Z"
  },
  "meta": {
    "requestId": "req_20260125_002",
    "timestamp": "2026-01-25T10:00:05.000Z",
    "version": "2.0.0",
    "executionTime": 20
  }
}
```

### 获取任务进度

**请求：**
```http
GET /api/v2/batch/tasks/{taskId}/progress
```

**响应：**
```json
{
  "success": true,
  "data": {
    "taskId": "task_1737820800000_abc123",
    "progress": 50,
    "currentStep": "生成文档中",
    "completedSteps": 2,
    "totalSteps": 4,
    "estimatedTimeRemaining": 150,
    "currentItem": {
      "templateName": "销售合同模板",
      "documentIndex": 2,
      "totalDocuments": 4
    },
    "items": [
      {
        "templateId": "template-001",
        "templateName": "销售合同模板",
        "status": "processing",
        "progress": 50,
        "completedCount": 1,
        "totalCount": 2,
        "failedCount": 0
      }
    ]
  },
  "meta": {
    "requestId": "req_20260125_003",
    "timestamp": "2026-01-25T10:00:10.000Z",
    "version": "2.0.0",
    "executionTime": 15
  }
}
```

### 暂停任务

**请求：**
```http
POST /api/v2/batch/tasks/{taskId}/pause
```

**响应：**
```json
{
  "success": true,
  "data": {
    "taskId": "task_1737820800000_abc123",
    "status": "paused",
    "pausedAt": "2026-01-25T10:00:15.000Z"
  }
}
```

### 恢复任务

**请求：**
```http
POST /api/v2/batch/tasks/{taskId}/resume
```

**响应：**
```json
{
  "success": true,
  "data": {
    "taskId": "task_1737820800000_abc123",
    "status": "running",
    "resumedAt": "2026-01-25T10:00:20.000Z"
  }
}
```

### 取消任务

**请求：**
```http
POST /api/v2/batch/tasks/{taskId}/cancel
```

**响应：**
```json
{
  "success": true,
  "data": {
    "taskId": "task_1737820800000_abc123",
    "status": "cancelled",
    "cancelledAt": "2026-01-25T10:00:25.000Z",
    "completedDocuments": 2,
    "message": "任务已取消，已生成2个文档"
  }
}
```

### 下载ZIP压缩包

**请求：**
```http
GET /api/v2/batch/tasks/{taskId}/download/zip
```

**响应：**
```
Content-Type: application/zip
Content-Disposition: attachment; filename="batch_task_1737820800000_abc123.zip"
Content-Length: 204800

<binary data>
```

## WebSocket实时进度

### 连接WebSocket

```javascript
const ws = new WebSocket('ws://localhost:3001/v2/stream');

ws.onopen = () => {
  console.log('已连接到WebSocket服务器');

  // 订阅任务进度
  ws.send(JSON.stringify({
    action: 'subscribe',
    channels: ['task_progress'],
    filters: {
      taskId: 'task_1737820800000_abc123'
    }
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('收到消息:', data);

  switch (data.type) {
    case 'task_started':
      console.log('任务已启动');
      break;

    case 'task_progress':
      console.log(`进度: ${data.payload.progress}%`);
      console.log(`当前: ${data.payload.current}/${data.payload.total}`);
      console.log(`阶段: ${data.payload.stage}`);
      break;

    case 'task_completed':
      console.log('任务已完成');
      console.log('结果:', data.payload.result);
      break;

    case 'task_failed':
      console.error('任务失败:', data.payload.error);
      break;

    case 'task_paused':
      console.log('任务已暂停');
      break;

    case 'task_cancelled':
      console.log('任务已取消');
      break;
  }
};

ws.onerror = (error) => {
  console.error('WebSocket错误:', error);
};

ws.onclose = () => {
  console.log('WebSocket连接已关闭');
};
```

### WebSocket事件类型

| 事件类型 | 描述 | 负载字段 |
|---------|------|---------|
| `task_started` | 任务启动 | taskId, mode, totalDocuments, estimatedDuration |
| `task_progress` | 进度更新 | taskId, progress, current, total, stage, message |
| `task_completed` | 任务完成 | taskId, status, result |
| `task_failed` | 任务失败 | taskId, error |
| `task_paused` | 任务暂停 | taskId, progress, message |
| `task_cancelled` | 任务取消 | taskId, progress, message |

## 测试脚本使用

### 快速测试

```bash
# 运行快速测试（创建并启动任务）
ts-node scripts/test-batch-api.ts quick
```

### 完整测试

```bash
# 运行完整测试流程
ts-node scripts/test-batch-api.ts full
```

### 单独测试各功能

```bash
# 健康检查
ts-node scripts/test-batch-api.ts health

# 创建任务
ts-node scripts/test-batch-api.ts create

# 启动任务
ts-node scripts/test-batch-api.ts start <taskId>

# 获取进度
ts-node scripts/test-batch-api.ts progress <taskId>

# 暂停任务
ts-node scripts/test-batch-api.ts pause <taskId>

# 恢复任务
ts-node scripts/test-batch-api.ts resume <taskId>

# 取消任务
ts-node scripts/test-batch-api.ts cancel <taskId>

# 监听进度（30秒）
ts-node scripts/test-batch-api.ts monitor <taskId> 30000
```

## 请求参数说明

### CreateBatchTaskRequest

| 字段 | 类型 | 必填 | 描述 |
|-----|------|------|------|
| dataSourceId | string | 是 | 数据源ID |
| templateIds | string[] | 是 | 模板ID列表 |
| outputFormat | string | 是 | 输出格式（docx/pdf） |
| mode | string | 否 | 生成模式（sequential/parallel） |
| data | object[] | 是 | 数据数组 |
| options | object | 否 | 选项配置 |

### 选项配置（options）

| 字段 | 类型 | 默认值 | 描述 |
|-----|------|--------|------|
| batchSize | number | 10 | 批次大小 |
| parallelProcessing | boolean | false | 是否并行处理 |
| createZip | boolean | true | 是否创建ZIP |
| concurrency | number | 3 | 并发数 |
| continueOnError | boolean | false | 出错是否继续 |

## 错误处理

### 错误响应格式

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "验证失败",
    "details": [
      {
        "field": "templateIds",
        "message": "At least one templateId is required"
      }
    ],
    "requestId": "req_20260125_001",
    "timestamp": "2026-01-25T10:00:00.000Z"
  }
}
```

### 常见错误代码

| 错误代码 | HTTP状态 | 描述 |
|---------|----------|------|
| VALIDATION_ERROR | 400 | 请求参数验证失败 |
| TASK_NOT_FOUND | 404 | 任务不存在 |
| TEMPLATE_NOT_FOUND | 404 | 模板不存在 |
| GENERATION_FAILED | 500 | 文档生成失败 |
| DOWNLOAD_FAILED | 500 | 下载失败 |

## 性能优化建议

### 1. 批量大小调整

```json
{
  "options": {
    "batchSize": 50,  // 增加批次大小以提高吞吐量
    "parallelProcessing": true  // 启用并行处理
  }
}
```

### 2. 并发控制

```json
{
  "options": {
    "concurrency": 5  // 增加并发数（默认3）
  }
}
```

### 3. 数据预处理

在上传前对数据进行预处理：
- 验证数据完整性
- 填充默认值
- 清理无效数据

## 故障排查

### 问题：任务创建失败

**可能原因：**
- 模板不存在
- 数据格式错误
- 参数验证失败

**解决方法：**
1. 验证模板ID是否存在
2. 检查数据格式是否正确
3. 查看错误详情

### 问题：进度更新不及时

**可能原因：**
- WebSocket连接断开
- 网络延迟
- 服务器负载过高

**解决方法：**
1. 检查WebSocket连接状态
2. 使用轮询作为备用方案
3. 减少并发数

### 问题：下载失败

**可能原因：**
- 任务未完成
- 文件过大
- 存储空间不足

**解决方法：**
1. 确认任务状态为completed
2. 增加超时时间
3. 检查服务器磁盘空间

## 更多资源

- [完整API规范](./API_SPECIFICATION_PHASE2.md)
- [架构设计文档](./BATCH_TEMPLATE_GENERATION_ARCHITECTURE.md)
- [测试指南](./BATCH_API_TEST_GUIDE.md)
