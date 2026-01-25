# 数据质量分析 API 快速参考

## API端点一览

| 端点 | 方法 | 功能 | 状态 |
|------|------|------|------|
| `/api/v2/data-quality/analyze` | POST | 分析数据质量 | ✅ |
| `/api/v2/data-quality/analysis/:id` | GET | 获取分析结果 | ✅ |
| `/api/v2/data-quality/recommendations` | POST | 获取清洗建议 | ✅ |
| `/api/v2/data-quality/auto-fix` | POST | 执行自动修复 | ✅ |
| `/api/v2/data-quality/statistics` | GET | 获取统计信息 | ✅ |

## 快速开始

### 1. 安装和配置

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，添加智谱AI密钥
```

### 2. 初始化

```typescript
import { createDataQualityController } from './api/controllers/dataQualityController';
import { createMemoryStorageService } from './services/storage/memoryStorageService';
import { createWebSocketService } from './services/websocket/websocketService';

const storageService = createMemoryStorageService();
const websocketService = createWebSocketService();
const controller = createDataQualityController(storageService, websocketService);
```

### 3. 使用

```typescript
// 分析数据
const result = await controller.analyze(request, response);
```

## 请求格式

### 分析请求

```json
POST /api/v2/data-quality/analyze
{
  "fileId": "file_123",
  "sheetName": "Sheet1",
  "options": {
    "checkMissingValues": true,
    "checkDuplicates": true,
    "checkFormats": true,
    "checkOutliers": true,
    "sampleSize": 1000
  }
}
```

### 建议请求

```json
POST /api/v2/data-quality/recommendations
{
  "analysisId": "qa_123",
  "options": {
    "includeAutoFix": true,
    "priority": "high"
  }
}
```

### 修复请求

```json
POST /api/v2/data-quality/auto-fix
{
  "analysisId": "qa_123",
  "suggestions": [
    { "suggestionId": "sugg_001", "action": "auto_fix" },
    { "suggestionId": "sugg_002", "action": "skip" }
  ],
  "options": {
    "createBackup": true,
    "validateAfterClean": true
  }
}
```

## 响应格式

### 成功响应

```json
{
  "success": true,
  "data": { /* 响应数据 */ },
  "meta": {
    "requestId": "req_123",
    "timestamp": "2026-01-25T10:30:00Z",
    "version": "2.0.0",
    "executionTime": 350
  }
}
```

### 错误响应

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数验证失败",
    "details": [
      { "field": "fileId", "message": "fileId is required" }
    ],
    "requestId": "req_123",
    "timestamp": "2026-01-25T10:30:00Z"
  }
}
```

## WebSocket事件

| 事件类型 | 触发时机 |
|---------|----------|
| `analysis_started` | 开始分析 |
| `analysis_progress` | 分析进度更新 |
| `analysis_completed` | 分析完成 |
| `analysis_error` | 分析出错 |
| `recommendations_started` | 开始生成建议 |
| `recommendations_completed` | 建议生成完成 |

## 错误代码

| 代码 | HTTP状态 | 描述 |
|------|----------|------|
| `VALIDATION_ERROR` | 400 | 请求参数验证失败 |
| `FILE_NOT_FOUND` | 404 | 文件不存在 |
| `DATA_QUALITY_ANALYSIS_FAILED` | 500 | 数据质量分析失败 |
| `DATA_CLEANING_FAILED` | 500 | 数据清洗失败 |

## 文件结构

```
api/
├── controllers/
│   ├── dataQualityController.ts          # 主控制器
│   └── dataQualityController.test.ts     # 单元测试
├── routes/
│   └── dataQuality.ts                    # 路由定义
└── ...

services/
├── agentic/
│   └── aiServiceAdapter.ts               # AI服务适配器
├── ai/
│   ├── dataQualityAnalyzer.ts            # 数据质量分析器
│   └── cleaningRecommendationEngine.ts  # 清洗建议引擎
├── storage/
│   └── memoryStorageService.ts           # 内存存储服务
└── websocket/
    └── websocketService.ts               # WebSocket服务

types/
├── dataQuality.ts                        # 数据质量类型
├── apiTypes.ts                           # API类型
└── errorCodes.ts                         # 错误代码

docs/
└── DATA_QUALITY_API_USAGE.md             # 详细使用文档
```

## 测试

```bash
# 运行所有测试
npm test

# 运行单元测试
npm test -- api/controllers/dataQualityController.test.ts

# 运行测试并查看覆盖率
npm test -- --coverage
```

## 常见问题

**Q: 如何处理大文件？**
A: 使用采样选项：`options.sampleSize = 1000`

**Q: 如何启用WebSocket进度推送？**
A: 在请求头添加：`X-Client-ID: your-client-id`

**Q: 如何获取历史分析结果？**
A: 调用 `GET /api/v2/data-quality/analysis/:id`

**Q: AI调用失败怎么办？**
A: 系统会返回降级建议，不影响基本功能

## 相关文档

- [详细使用指南](./DATA_QUALITY_API_USAGE.md)
- [实现总结](./DATA_QUALITY_API_IMPLEMENTATION_SUMMARY.md)
- [API规范](./API_SPECIFICATION_PHASE2.md)
- [架构设计](./INTELLIGENT_DATA_PROCESSING_ARCHITECTURE.md)
