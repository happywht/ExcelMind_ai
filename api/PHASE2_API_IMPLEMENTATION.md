# Phase 2 API 实施说明

> **版本**: v2.0.0
> **更新日期**: 2026-01-25
> **状态**: 实现阶段

## 目录

- [概述](#概述)
- [架构设计](#架构设计)
- [文件结构](#文件结构)
- [控制器实现](#控制器实现)
- [中间件实现](#中间件实现)
- [路由配置](#路由配置)
- [测试策略](#测试策略)
- [部署指南](#部署指南)
- [下一步工作](#下一步工作)

---

## 概述

Phase 2 API 实现了数据质量分析、模板管理、批量文档生成和审计规则引擎等核心功能。本文档说明API的实施细节和集成方式。

### 核心特性

1. **模块化设计** - 每个功能模块独立封装
2. **统一错误处理** - 标准化的错误响应格式
3. **请求验证** - 完整的输入验证机制
4. **认证授权** - 基于API密钥和权限的控制
5. **速率限制** - 防止API滥用的保护机制
6. **类型安全** - 完整的TypeScript类型定义

---

## 架构设计

### 分层架构

```
┌─────────────────────────────────────────────────┐
│              路由层 (Routes)                      │
│   - 路由定义                                      │
│   - 中间件应用                                    │
│   - 端点映射                                      │
└───────────────────┬─────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────┐
│            控制器层 (Controllers)                 │
│   - 请求处理                                      │
│   - 参数验证                                      │
│   - 响应组装                                      │
│   - 错误转换                                      │
└───────────────────┬─────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────┐
│             中间件层 (Middleware)                  │
│   - 认证授权                                      │
│   - 请求验证                                      │
│   - 速率限制                                      │
│   - 错误处理                                      │
└───────────────────┬─────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────┐
│              服务层 (Services)                     │
│   - 业务逻辑                                      │
│   - 数据处理                                      │
│   - 外部集成                                      │
└─────────────────────────────────────────────────┘
```

---

## 文件结构

```
api/
├── controllers/                    # 控制器层
│   ├── dataQualityController.ts   # 数据质量控制器
│   ├── templateController.ts      # 模板管理控制器
│   ├── batchGenerationController.ts # 批量生成控制器
│   └── auditController.ts         # 审计控制器
├── middleware/                     # 中间件层
│   ├── validationMiddleware.ts    # 验证中间件
│   ├── errorHandler.ts            # 错误处理中间件
│   ├── authMiddleware.ts          # 认证中间件
│   ├── rateLimiter.ts             # 速率限制中间件
│   └── index.ts                   # 中间件导出
├── routes/                         # 路由层
│   ├── v2.ts                      # v2 API路由
│   └── index.ts                   # 路由入口
└── PHASE2_API_IMPLEMENTATION.md   # 本文档

tests/
├── api/
│   └── controllers/               # 控制器测试
│       ├── dataQualityController.test.ts
│       └── templateController.test.ts
```

---

## 控制器实现

### 1. 数据质量控制器 (dataQualityController.ts)

**端点：**
- `POST /api/v2/data-quality/analyze` - 分析数据质量
- `GET /api/v2/data-quality/analysis/:id` - 获取分析结果
- `POST /api/v2/data-quality/recommendations` - 获取清洗建议
- `POST /api/v2/data-quality/auto-fix` - 执行自动修复
- `GET /api/v2/data-quality/statistics` - 获取统计信息

**使用示例：**

```typescript
import { dataQualityController } from './api/controllers/dataQualityController';

// 分析数据质量
app.post('/api/v2/data-quality/analyze', dataQualityController.analyze);
```

**依赖服务：**

需要实现以下服务（标记为TODO）：
- `DataQualityAnalyzer` - 数据质量分析器
- `CleaningRecommendationEngine` - 清洗建议引擎
- `DataCleaningService` - 数据清洗服务

### 2. 模板控制器 (templateController.ts)

**端点：**
- `POST /api/v2/templates` - 上传模板
- `GET /api/v2/templates` - 列出模板
- `GET /api/v2/templates/:id` - 获取模板详情
- `PUT /api/v2/templates/:id` - 更新模板
- `DELETE /api/v2/templates/:id` - 删除模板
- `POST /api/v2/templates/:id/preview` - 预览模板
- `GET /api/v2/templates/:id/variables` - 获取模板变量
- `GET /api/v2/templates/:id/download` - 下载模板

**文件上传配置：**

使用 `multer` 处理文件上传：

```typescript
import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});
```

**依赖服务：**

- `TemplateService` - 模板服务
- `TemplateParser` - 模板解析器

### 3. 批量生成控制器 (batchGenerationController.ts)

**端点：**
- `POST /api/v2/batch/tasks` - 创建批量任务
- `GET /api/v2/batch/tasks` - 列出任务
- `GET /api/v2/batch/tasks/:id` - 获取任务详情
- `POST /api/v2/batch/tasks/:id/start` - 启动任务
- `POST /api/v2/batch/tasks/:id/pause` - 暂停任务
- `POST /api/v2/batch/tasks/:id/cancel` - 取消任务
- `GET /api/v2/batch/tasks/:id/progress` - 获取任务进度
- `GET /api/v2/batch/tasks/:id/download/:templateId/:documentId` - 下载文档
- `GET /api/v2/batch/tasks/:id/download/zip` - 下载ZIP

**任务状态：**

- `pending` - 等待中
- `processing` - 处理中
- `completed` - 已完成
- `failed` - 失败
- `cancelled` - 已取消
- `paused` - 已暂停

**依赖服务：**

- `BatchGenerationService` - 批量生成服务
- `TaskManager` - 任务管理器

### 4. 审计控制器 (auditController.ts)

**端点：**
- `POST /api/v2/audit/rules` - 创建审计规则
- `GET /api/v2/audit/rules` - 列出审计规则
- `GET /api/v2/audit/rules/:id` - 获取规则详情
- `PUT /api/v2/audit/rules/:id` - 更新规则
- `DELETE /api/v2/audit/rules/:id` - 删除规则
- `POST /api/v2/audit/execute` - 执行审计
- `GET /api/v2/audit/reports/:auditId` - 获取审计报告
- `GET /api/v2/audit/reports/:auditId/:format` - 下载报告

**依赖服务：**

- `AuditRuleEngine` - 审计规则引擎
- `AuditReportGenerator` - 审计报告生成器

---

## 中间件实现

### 1. 验证中间件 (validationMiddleware.ts)

**功能：**
- 请求数据验证
- 类型检查
- 格式验证
- 自定义验证规则

**使用示例：**

```typescript
import { ValidationMiddleware, PredefinedValidators } from './api/middleware';

// 自定义验证
app.post('/api/endpoint',
  ValidationMiddleware.validate({
    body: {
      fileId: { required: true, type: 'string' },
      sheetName: { required: true, type: 'string', minLength: 1 },
    },
  })
);

// 使用预定义验证器
app.post('/api/v2/data-quality/analyze',
  PredefinedValidators.dataQualityAnalyze
);
```

### 2. 错误处理中间件 (errorHandler.ts)

**功能：**
- 统一错误响应格式
- 错误代码映射
- 错误日志记录
- HTTP状态码映射

**使用示例：**

```typescript
import { errorHandler, ApiErrors, asyncHandler } from './api/middleware/errorHandler';

// 应用错误处理
app.use(errorHandler());

// 在路由中使用
app.get('/api/resource',
  asyncHandler(async (req, res) => {
    // 业务逻辑
    if (!resource) {
      throw ApiErrors.notFound('Resource');
    }
    res.json(resource);
  })
);
```

**快捷错误抛出：**

```typescript
import { ApiErrors } from './api/middleware/errorHandler';

// 各种错误类型
throw ApiErrors.badRequest('Invalid input');
throw ApiErrors.unauthorized('Invalid API key');
throw ApiErrors.forbidden('Insufficient permissions');
throw ApiErrors.notFound('Resource not found');
throw ApiErrors.fileNotFound('file_123');
throw ApiErrors.templateNotFound('tmpl_001');
```

### 3. 认证中间件 (authMiddleware.ts)

**功能：**
- API密钥验证
- 权限范围检查
- 用户层级验证
- Bearer token支持

**认证方式：**

```http
# X-API-Key 头部
X-API-Key: your_api_key_here

# Authorization 头部（Bearer token）
Authorization: Bearer your_api_key_here

# 查询参数（不推荐）
?api_key=your_api_key_here
```

**权限范围：**

- `read` - 读取权限
- `write` - 写入权限
- `delete` - 删除权限
- `execute` - 执行权限
- `admin` - 管理员权限

**用户层级：**

- `free` - 免费用户
- `basic` - 基础用户
- `professional` - 专业用户
- `enterprise` - 企业用户

**使用示例：**

```typescript
import {
  requireAuth,
  requireRead,
  requireWrite,
  requireDelete,
  requireExecute,
  requireBasic,
  requireProfessional,
  requireEnterprise
} from './api/middleware/authMiddleware';

// 基础认证
app.get('/api/resource', requireAuth, handler);

// 权限检查
app.post('/api/resource', requireAuth, requireWrite, handler);
app.delete('/api/resource', requireAuth, requireDelete, handler);

// 层级检查
app.get('/api/premium', requireAuth, requireBasic, handler);
app.get('/api/pro', requireAuth, requireProfessional, handler);
app.get('/api/enterprise', requireAuth, requireEnterprise, handler);
```

### 4. 速率限制中间件 (rateLimiter.ts)

**功能：**
- 基于IP的速率限制
- 基于用户的速率限制
- 基于层级的速率限制
- 端点特定速率限制
- 自定义速率限制

**速率限制规则：**

| 层级 | 请求限制 | 时间窗口 |
|------|----------|----------|
| 免费用户 | 60 requests | 1 minute |
| 基础用户 | 300 requests | 1 minute |
| 专业用户 | 1000 requests | 1 minute |
| 企业用户 | 5000 requests | 1 minute |

**特殊端点限制：**

| 端点类型 | 限制 | 时间窗口 |
|----------|------|----------|
| AI调用 | 30 requests | 1 minute |
| 批量生成 | 5 tasks | 1 hour |
| 文档下载 | 100 requests | 1 minute |

**使用示例：**

```typescript
import {
  ipRateLimiter,
  userRateLimiter,
  predefinedRateLimiters,
  createRateLimiter,
  createTierRateLimiter
} from './api/middleware/rateLimiter';

// IP速率限制
app.use('/api', ipRateLimiter.middleware);

// 用户速率限制
app.use('/api', userRateLimiter.middleware);

// 特殊端点限制
app.post('/api/v2/ai/call',
  predefinedRateLimiters.aiCalls.middleware,
  handler
);

app.post('/api/v2/batch/tasks',
  predefinedRateLimiters.batchGeneration.middleware,
  handler
);

// 自定义速率限制
const customLimiter = createRateLimiter({
  windowMs: 60000,
  maxRequests: 100,
  standardHeaders: true,
});

app.use('/api/custom', customLimiter.middleware);
```

**响应头：**

```http
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 295
X-RateLimit-Reset: 1737820860
X-RateLimit-Reset-After: 45
```

---

## 路由配置

### 路由结构

```typescript
// api/routes/v2.ts
export function createV2Router(): Router {
  const router = Router();

  // 数据质量模块
  router.use('/data-quality', dataQualityRouter);

  // 模板管理模块
  router.use('/templates', templateRouter);

  // 批量生成模块
  router.use('/generation', batchRouter);

  // 审计规则模块
  router.use('/audit', auditRouter);

  return router;
}
```

### 中间件应用顺序

```typescript
// 1. 全局安全头部
app.use(securityHeaders);

// 2. 请求ID生成
app.use(generateRequestId);

// 3. 基础速率限制
app.use(ipRateLimiter.middleware);

// 4. 认证（如果需要）
app.use('/api', requireAuth);

// 5. 具体端点速率限制
app.post('/api/v2/batch/tasks', batchRateLimiter.middleware, handler);

// 6. 请求验证
app.post('/api/v2/data-quality/analyze', validationMiddleware, handler);

// 7. 控制器处理
app.post('/api/v2/data-quality/analyze', controller.analyze);

// 8. 错误处理（最后）
app.use(errorHandler());
```

---

## 测试策略

### 单元测试

每个控制器都有对应的测试文件：

```typescript
// api/controllers/dataQualityController.test.ts
describe('DataQualityController', () => {
  it('应该成功分析数据质量', async () => {
    // 测试代码
  });

  it('应该在缺少fileId时返回验证错误', async () => {
    // 测试代码
  });
});
```

### 集成测试

测试完整的请求-响应流程：

```typescript
describe('POST /api/v2/data-quality/analyze', () => {
  it('应该返回200和有效的分析结果', async () => {
    const response = await request(app)
      .post('/api/v2/data-quality/analyze')
      .set('X-API-Key', testApiKey)
      .send({
        fileId: 'file_123_abc',
        sheetName: 'Sheet1',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('analysisId');
  });
});
```

### 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试文件
npm test -- dataQualityController.test.ts

# 运行测试并查看覆盖率
npm run test:coverage

# 监视模式
npm run test:watch
```

---

## 部署指南

### 环境变量

```bash
# 认证配置
AUTH_ENABLED=true
API_KEYS=key1,key2,key3

# 速率限制配置
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=300

# WebSocket配置
WEBSOCKET_URL=ws://localhost:3000

# 日志配置
LOG_LEVEL=info
NODE_ENV=production
```

### 启动服务器

```typescript
import express from 'express';
import { appRouter } from './api/routes';

const app = express();

// 基础中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API路由
app.use(appRouter);

// 启动服务器
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});
```

### Docker部署

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

### Nginx反向代理

```nginx
server {
    listen 80;
    server_name api.excelmind.ai;

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 速率限制响应头
        proxy_pass_header X-RateLimit-Limit;
        proxy_pass_header X-RateLimit-Remaining;
        proxy_pass_header X-RateLimit-Reset;
    }
}
```

---

## 下一步工作

### 待实现的服务层

1. **数据质量服务**
   - `services/quality/DataQualityAnalyzer.ts`
   - `services/quality/CleaningRecommendationEngine.ts`
   - `services/quality/DataCleaningService.ts`

2. **模板服务**
   - `services/TemplateService.ts`
   - `services/quality/TemplateParser.ts`

3. **批量生成服务**
   - `services/generation/BatchGenerationService.ts`
   - `services/generation/TaskManager.ts`

4. **审计服务**
   - `services/audit/AuditRuleEngine.ts`
   - `services/audit/AuditReportGenerator.ts`

### 待实现的控制器

5. **性能监控控制器**
   - `api/controllers/monitoringController.ts`

6. **质量控制控制器**
   - `api/controllers/qualityController.ts`

### 待实现的功能

7. **WebSocket支持**
   - `api/websocket/streamHandler.ts`
   - 实时进度推送
   - 事件订阅机制

8. **文件存储**
   - 模板文件存储
   - 生成文档存储
   - 备份文件管理

9. **数据库集成**
   - PostgreSQL/MySQL集成
   - 数据持久化
   - 查询优化

10. **缓存优化**
    - Redis缓存
    - 查询结果缓存
    - 会话管理

---

## 参考文档

- [API_SPECIFICATION_PHASE2.md](../docs/API_SPECIFICATION_PHASE2.md) - 完整API规范
- [types/apiTypes.ts](../types/apiTypes.ts) - API类型定义
- [types/errorCodes.ts](../types/errorCodes.ts) - 错误码定义
- [ARCHITECTURE_ANALYSIS_PHASE2.md](../ARCHITECTURE_ANALYSIS_PHASE2.md) - 架构分析

---

**文档版本**: v2.0.0
**最后更新**: 2026-01-25
**维护者**: ExcelMind AI API Team
