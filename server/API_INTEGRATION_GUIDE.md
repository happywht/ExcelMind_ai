# API 集成指南

## 概述

本文档描述如何集成和使用 Phase 2 API 服务器，包括前后端通信、WebSocket 连接和错误处理。

## 目录结构

```
server/
├── app.ts                  # Express 应用配置
├── dev-server.ts           # 开发服务器启动脚本
├── websocket.ts            # WebSocket 服务器配置
└── API_INTEGRATION_GUIDE.md # 本文档

api/
├── routes/
│   ├── index.ts           # API 路由入口
│   └── v2.ts              # v2 API 路由配置
├── controllers/           # API 控制器
├── middleware/            # 中间件
└── config.ts              # API 配置

tests/
└── integration/
    └── api.integration.test.ts  # API 集成测试

scripts/
└── mock-api-server.ts     # Mock API 服务器
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务器

```bash
# 只启动 API 服务器
npm run dev:api

# 同时启动前端和 API 服务器
npm run dev:full

# 启动 Mock API 服务器（用于开发）
npm run dev:mock
```

### 3. 访问端点

API 服务器将在以下端口启动：
- **API 服务器**: `http://localhost:3001`
- **Mock 服务器**: `http://localhost:3002`

健康检查端点：
```bash
curl http://localhost:3001/health
```

## API 端点

### 数据质量分析

```
POST   /api/v2/data-quality/analyze          # 分析数据质量
GET    /api/v2/data-quality/analysis/:id     # 获取分析结果
POST   /api/v2/data-quality/recommendations  # 获取清洗建议
POST   /api/v2/data-quality/auto-fix         # 执行自动修复
GET    /api/v2/data-quality/statistics       # 获取统计信息
```

### 模板管理

```
POST   /api/v2/templates                     # 上传模板
GET    /api/v2/templates                     # 列出模板
GET    /api/v2/templates/:id                 # 获取模板详情
PUT    /api/v2/templates/:id                 # 更新模板
DELETE /api/v2/templates/:id                 # 删除模板
POST   /api/v2/templates/:id/preview         # 生成预览
GET    /api/v2/templates/:id/variables       # 获取模板变量
GET    /api/v2/templates/:id/download        # 下载模板文件
```

### 批量文档生成

```
POST   /api/v2/generation/tasks              # 创建批量任务
GET    /api/v2/generation/tasks              # 列出任务
GET    /api/v2/generation/tasks/:id          # 获取任务详情
POST   /api/v2/generation/tasks/:id/start    # 启动任务
POST   /api/v2/generation/tasks/:id/pause    # 暂停任务
POST   /api/v2/generation/tasks/:id/cancel   # 取消任务
GET    /api/v2/generation/tasks/:id/progress # 获取任务进度
GET    /api/v2/generation/tasks/:id/download/:templateId/:documentId  # 下载文档
GET    /api/v2/generation/tasks/:id/download/zip  # 下载 ZIP
```

### 审计规则引擎

```
POST   /api/v2/audit/rules                   # 创建审计规则
GET    /api/v2/audit/rules                   # 列出审计规则
GET    /api/v2/audit/rules/:id               # 获取规则详情
PUT    /api/v2/audit/rules/:id               # 更新规则
DELETE /api/v2/audit/rules/:id               # 删除规则
POST   /api/v2/audit/execute                 # 执行审计
GET    /api/v2/audit/reports/:auditId        # 获取审计报告
GET    /api/v2/audit/reports/:auditId/:format  # 下载报告
```

## WebSocket 连接

### 连接端点

```
ws://localhost:3001/api/v2/stream
```

### 订阅频道

```javascript
const ws = new WebSocket('ws://localhost:3001/api/v2/stream');

// 连接成功后订阅频道
ws.onopen = () => {
  ws.send(JSON.stringify({
    action: 'subscribe',
    channels: ['task_progress', 'generation_status', 'audit_alerts'],
    filters: {
      taskId: 'task_001'  // 可选的过滤器
    }
  }));
};

// 接收消息
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  switch (message.type) {
    case 'task_progress':
      console.log('进度更新:', message.data);
      break;
    case 'generation_status':
      console.log('生成状态:', message.data);
      break;
    case 'audit_alert':
      console.log('审计告警:', message.data);
      break;
  }
};
```

### 可用频道

- `task_progress` - 任务进度更新
- `generation_status` - 文档生成状态
- `audit_alerts` - 审计告警
- `performance_alerts` - 性能告警

## 前端集成

### API 客户端配置

```typescript
// api/config.ts
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v2';
export const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL ||
  (API_BASE_URL.replace('http', 'ws'));
```

### 使用示例

```typescript
import { API_BASE_URL } from './api/config';

// 数据质量分析
async function analyzeDataQuality(fileId: string, sheetName: string) {
  const response = await fetch(`${API_BASE_URL}/data-quality/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fileId, sheetName }),
  });

  const data = await response.json();
  return data;
}

// 创建批量任务
async function createBatchTask(request: BatchGenerationRequest) {
  const response = await fetch(`${API_BASE_URL}/generation/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  const data = await response.json();
  return data;
}
```

## 错误处理

### 错误响应格式

```typescript
{
  success: false,
  error: {
    code: "VALIDATION_ERROR",
    message: "请求验证失败",
    details: [
      {
        field: "fileId",
        message: "fileId is required"
      }
    ],
    requestId: "req_1234567890",
    timestamp: "2026-01-25T10:00:00Z"
  }
}
```

### 错误代码

| 代码 | HTTP 状态 | 描述 |
|-----|----------|------|
| VALIDATION_ERROR | 400 | 请求验证失败 |
| UNAUTHORIZED | 401 | 未授权 |
| FORBIDDEN | 403 | 禁止访问 |
| NOT_FOUND | 404 | 资源不存在 |
| INTERNAL_ERROR | 500 | 内部错误 |

## 测试

### 运行集成测试

```bash
# 运行所有集成测试
npm run test:integration:phase2

# 运行 API 集成测试
npm run test:integration:api

# 使用 UI 模式运行测试
npm run test:phase2:ui
```

### 测试覆盖率

```bash
npm run test:phase2:coverage
```

## 开发工具

### Mock API 服务器

用于在没有后端服务的情况下进行前端开发：

```bash
npm run dev:mock
```

Mock 服务器提供：
- 真实的测试数据
- 可配置的延迟
- 完整的错误模拟

### 环境变量

```bash
# API 配置
API_PORT=3001                  # API 服务器端口
API_HOST=localhost             # API 服务器主机
CORS_ORIGIN=*                  # CORS 允许的源

# WebSocket 配置
WEBSOCKET_URL=ws://localhost:3001  # WebSocket 服务器地址

# 开发模式
NODE_ENV=development           # 环境（development/production/test）
```

## 性能优化

### 请求压缩

API 服务器自动压缩响应体（gzip）。

### 速率限制

默认速率限制：
- IP 限制：100 请求/分钟
- 用户限制：200 请求/分钟
- 批量操作：10 请求/分钟

### 缓存策略

静态资源缓存：
- 模板文件：30 天
- 生成的文档：24 小时

## 部署

### 生产环境配置

```typescript
// server/app.ts
const app = createApp();

// 生产环境中间件
if (process.env.NODE_ENV === 'production') {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
      },
    },
  }));
}
```

### 环境变量

```bash
NODE_ENV=production
API_PORT=3001
CORS_ORIGIN=https://yourdomain.com
```

### 启动生产服务器

```bash
NODE_ENV=production npm run server:start
```

## 故障排查

### 常见问题

#### 1. CORS 错误

确保 `CORS_ORIGIN` 环境变量包含前端域名。

#### 2. WebSocket 连接失败

检查防火墙设置，确保 WebSocket 端口可访问。

#### 3. 文件上传失败

检查文件大小限制（默认 10MB）。

### 日志

开发环境会输出详细的请求日志：

```
[req_1234567890] POST /api/v2/data-quality/analyze 200 - 1234ms
```

## 监控

### 健康检查

```bash
curl http://localhost:3001/health
```

响应：
```json
{
  "status": "healthy",
  "timestamp": "2026-01-25T10:00:00Z",
  "uptime": 3600,
  "environment": "development",
  "version": "2.0.0"
}
```

### 性能指标

API 响应时间记录在每个响应的元数据中：

```json
{
  "success": true,
  "data": {...},
  "meta": {
    "requestId": "req_1234567890",
    "timestamp": "2026-01-25T10:00:00Z",
    "executionTime": 1234
  }
}
```

## 更多资源

- [API 规范文档](../docs/API_SPECIFICATION_PHASE2.md)
- [控制器实现](../api/controllers/)
- [中间件文档](../api/middleware/)
- [测试文档](../tests/)

## 更新日志

### v2.0.0 (2026-01-25)

- ✅ 实现 Phase 2 API 服务器
- ✅ 添加 WebSocket 支持
- ✅ 完成集成测试
- ✅ 添加 Mock API 服务器
- ✅ 更新文档

---

**维护者**: ExcelMind AI 团队
**最后更新**: 2026-01-25
