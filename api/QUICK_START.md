# Phase 2 API 快速启动指南

> **版本**: v2.0.0
> **更新日期**: 2026-01-25
> **预计阅读时间**: 5分钟

---

## 前置要求

- Node.js 16+ （推荐 18+）
- npm 或 pnpm
- TypeScript 5+

---

## 第一步：安装依赖

```bash
# 安装核心依赖
npm install express multer uuid

# 安装类型定义
npm install -D @types/express @types/multer @types/uuid

# 可选：安装额外的生产依赖
npm install cors helmet compression morgan
npm install -D @types/cors @types/compression @types/morgan
```

---

## 第二步：配置环境变量

创建 `.env` 文件：

```bash
# 认证配置
AUTH_ENABLED=true
API_KEYS=your_test_api_key_here

# 服务器配置
PORT=3000
NODE_ENV=development

# 速率限制
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=300
```

---

## 第三步：创建Express应用

创建 `api-server.ts` 文件：

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { appRouter } from './api';

const app = express();

// 安全头部
app.use(helmet());

// CORS（如果需要）
app.use(cors());

// 请求体解析
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 压缩
app.use(compression());

// 日志（开发环境）
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// API路由
app.use(appRouter);

// 错误处理（已包含在appRouter中）

// 启动服务器
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 API server listening on port ${port}`);
  console.log(`📍 API endpoints: http://localhost:${port}/api`);
  console.log(`📊 Health check: http://localhost:${port}/api/health`);
  console.log(`📚 API docs: http://localhost:${port}/api/status`);
});
```

---

## 第四步：启动服务器

```bash
# 开发模式
npm run dev

# 或者使用 ts-node 直接运行
npx ts-node api-server.ts

# 或者编译后运行
npm run build
npm start
```

---

## 第五步：测试API

### 1. 健康检查

```bash
curl http://localhost:3000/api/health
```

**预期响应：**
```json
{
  "status": "healthy",
  "version": "2.0.0",
  "uptime": 123.456,
  "timestamp": "2026-01-25T10:30:00.000Z",
  "services": {
    "database": "unknown",
    "cache": "unknown",
    "ai": "unknown"
  }
}
```

### 2. 数据质量分析（需要API密钥）

```bash
curl -X POST http://localhost:3000/api/v2/data-quality/analyze \
  -H "X-API-Key: your_test_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "fileId": "file_123_abc",
    "sheetName": "Sheet1",
    "options": {
      "checkMissingValues": true,
      "checkDuplicates": true
    }
  }'
```

**预期响应：**
```json
{
  "success": true,
  "data": {
    "analysisId": "qa_1737820800000_xyz789",
    "fileId": "file_123_abc",
    "sheetName": "Sheet1",
    "summary": {
      "totalRows": 1000,
      "totalColumns": 15,
      "completeness": 0.95,
      "qualityScore": 85
    },
    "issues": [],
    "statistics": {...},
    "recommendations": []
  },
  "meta": {
    "requestId": "...",
    "timestamp": "...",
    "version": "2.0.0",
    "executionTime": 350
  }
}
```

### 3. 列出模板

```bash
curl http://localhost:3000/api/v2/templates \
  -H "X-API-Key: your_test_api_key_here"
```

---

## API端点总览

### 数据质量模块

```
POST   /api/v2/data-quality/analyze
GET    /api/v2/data-quality/analysis/:id
POST   /api/v2/data-quality/recommendations
POST   /api/v2/data-quality/auto-fix
GET    /api/v2/data-quality/statistics
```

### 模板管理模块

```
POST   /api/v2/templates
GET    /api/v2/templates
GET    /api/v2/templates/:id
PUT    /api/v2/templates/:id
DELETE /api/v2/templates/:id
POST   /api/v2/templates/:id/preview
GET    /api/v2/templates/:id/variables
GET    /api/v2/templates/:id/download
```

### 批量生成模块

```
POST   /api/v2/batch/tasks
GET    /api/v2/batch/tasks
GET    /api/v2/batch/tasks/:id
POST   /api/v2/batch/tasks/:id/start
POST   /api/v2/batch/tasks/:id/pause
POST   /api/v2/batch/tasks/:id/cancel
GET    /api/v2/batch/tasks/:id/progress
GET    /api/v2/batch/tasks/:id/download/:templateId/:documentId
GET    /api/v2/batch/tasks/:id/download/zip
```

### 审计规则模块

```
POST   /api/v2/audit/rules
GET    /api/v2/audit/rules
GET    /api/v2/audit/rules/:id
PUT    /api/v2/audit/rules/:id
DELETE /api/v2/audit/rules/:id
POST   /api/v2/audit/execute
GET    /api/v2/audit/reports/:auditId
GET    /api/v2/audit/reports/:auditId/:format
```

---

## 认证方式

### API密钥认证

```http
X-API-Key: your_api_key_here
```

### Bearer Token认证

```http
Authorization: Bearer your_api_key_here
```

### 查询参数认证（不推荐）

```
?api_key=your_api_key_here
```

---

## 错误响应格式

所有错误遵循统一格式：

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数验证失败",
    "details": [
      {
        "field": "fileId",
        "message": "fileId is required"
      }
    ],
    "requestId": "req_20260125_001",
    "timestamp": "2026-01-25T10:30:00Z",
    "helpUrl": "https://docs.excelmind.ai/errors/validation-error"
  },
  "meta": {
    "requestId": "req_20260125_001",
    "timestamp": "2026-01-25T10:30:00Z"
  }
}
```

---

## 速率限制

### 响应头

```http
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 295
X-RateLimit-Reset: 1737820860
X-RateLimit-Reset-After: 45
```

### 超出限制时

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "超出速率限制",
    "details": [
      {
        "message": "Rate limit exceeded. Try again in 45 seconds."
      }
    ]
  }
}
```

---

## 开发工具

### Postman集合

导入以下Postman集合进行API测试：

```json
{
  "info": {
    "name": "ExcelMind AI Phase 2 API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Data Quality",
      "item": [
        {
          "name": "Analyze Data Quality",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "X-API-Key",
                "value": "{{api_key}}"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"fileId\": \"file_123_abc\",\n  \"sheetName\": \"Sheet1\"\n}"
            },
            "url": {
              "raw": "{{base_url}}/api/v2/data-quality/analyze",
              "host": ["{{base_url}}"],
              "path": ["api", "v2", "data-quality", "analyze"]
            }
          }
        }
      ]
    }
  ],
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:3000"
    },
    {
      "key": "api_key",
      "value": "your_test_api_key_here"
    }
  ]
}
```

### 使用curl脚本

创建 `test-api.sh` 文件：

```bash
#!/bin/bash

BASE_URL="http://localhost:3000"
API_KEY="your_test_api_key_here"

# 健康检查
echo "Testing health check..."
curl -s $BASE_URL/api/health | jq .

# 数据质量分析
echo -e "\nTesting data quality analysis..."
curl -s -X POST $BASE_URL/api/v2/data-quality/analyze \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "fileId": "file_123_abc",
    "sheetName": "Sheet1"
  }' | jq .

# 列出模板
echo -e "\nListing templates..."
curl -s $BASE_URL/api/v2/templates \
  -H "X-API-Key: $API_KEY" | jq .
```

运行测试：

```bash
chmod +x test-api.sh
./test-api.sh
```

---

## 故障排除

### 端口被占用

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3000 | xargs kill -9
```

### API密钥无效

确保 `.env` 文件中的 `API_KEYS` 包含你的密钥：

```bash
API_KEYS=key1,key2,key3
```

### 模块未找到

清理 `node_modules` 并重新安装：

```bash
rm -rf node_modules
npm install
```

### TypeScript错误

确保 `tsconfig.json` 正确配置：

```bash
npx tsc --noEmit
```

---

## 下一步

1. **实现服务层**
   - 阅读服务层实现指南
   - 连接数据库
   - 实现业务逻辑

2. **添加WebSocket支持**
   - 实时进度推送
   - 事件订阅

3. **配置生产环境**
   - 设置HTTPS
   - 配置Nginx
   - 设置监控

4. **编写集成测试**
   - 端到端测试
   - 性能测试

---

## 相关文档

- [API_SPECIFICATION_PHASE2.md](../docs/API_SPECIFICATION_PHASE2.md) - 完整API规范
- [PHASE2_API_IMPLEMENTATION.md](./api/PHASE2_API_IMPLEMENTATION.md) - 实施指南
- [DEPENDENCIES.md](./api/DEPENDENCIES.md) - 依赖项说明
- [types/apiTypes.ts](../types/apiTypes.ts) - 类型定义

---

**文档版本**: v1.0.0
**最后更新**: 2026-01-25
**作者**: ExcelMind AI API Team
