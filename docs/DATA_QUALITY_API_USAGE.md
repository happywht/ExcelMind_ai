# 数据质量分析 API 使用指南

## 概述

数据质量分析API提供了智能的数据质量检测、清洗建议生成和自动修复功能。

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

创建 `.env` 文件：

```env
# 智谱AI配置
ZHIPU_API_KEY=your_zhipu_api_key_here
API_KEY=your_api_key_here

# 服务配置
PORT=3000
NODE_ENV=development
```

### 3. 初始化服务

```typescript
import { createDataQualityController } from './api/controllers/dataQualityController';
import { createMemoryStorageService } from './services/storage/memoryStorageService';
import { createWebSocketService } from './services/websocket/websocketService';

// 创建服务实例
const storageService = createMemoryStorageService();
const websocketService = createWebSocketService();
const dataQualityController = createDataQualityController(storageService, websocketService);
```

## API端点

### 1. 分析数据质量

**端点**: `POST /api/v2/data-quality/analyze`

**请求头**:
```http
Content-Type: application/json
X-Request-ID: unique-request-id
X-Client-ID: client-identifier  // 可选，用于WebSocket推送
```

**请求体**:
```json
{
  "fileId": "file_1737820800000_abc123",
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

**响应示例**:
```json
{
  "success": true,
  "data": {
    "analysisId": "qa_1737820800000_xyz789",
    "fileId": "file_1737820800000_abc123",
    "sheetName": "Sheet1",
    "summary": {
      "totalRows": 1000,
      "totalColumns": 15,
      "completeness": 0.95,
      "qualityScore": 85
    },
    "issues": [
      {
        "id": "issue_001",
        "type": "missing_value",
        "severity": "high",
        "location": {
          "column": "客户邮箱",
          "affectedRows": [5, 12, 23, 45]
        },
        "description": "发现4条缺失的客户邮箱记录",
        "impact": "无法发送邮件通知",
        "affectedPercentage": 0.4
      }
    ],
    "statistics": {
      "missingValues": {
        "total": 50,
        "byColumn": {
          "客户邮箱": 4,
          "联系电话": 8
        }
      },
      "duplicates": {
        "total": 10,
        "duplicateSets": 2
      },
      "formatIssues": {
        "total": 15,
        "byType": {
          "date": 8,
          "phone": 5
        }
      },
      "outliers": {
        "total": 3,
        "byColumn": {
          "销售额": 1
        }
      }
    },
    "recommendations": [
      "建议填充缺失的客户邮箱信息",
      "建议删除重复的订单记录"
    ]
  },
  "meta": {
    "requestId": "req_20260125_001",
    "timestamp": "2026-01-25T10:30:00Z",
    "version": "2.0.0",
    "executionTime": 350
  }
}
```

### 2. 获取清洗建议

**端点**: `POST /api/v2/data-quality/recommendations`

**请求体**:
```json
{
  "analysisId": "qa_1737820800000_xyz789",
  "options": {
    "includeAutoFix": true,
    "priority": "high"
  }
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "analysisId": "qa_1737820800000_xyz789",
    "suggestions": [
      {
        "id": "sugg_001",
        "issueId": "issue_001",
        "priority": "high",
        "title": "填充缺失的客户邮箱",
        "description": "发现4条缺失的客户邮箱记录",
        "impact": "缺失邮箱将影响客户通知发送",
        "estimatedTime": 5,
        "canAutoFix": false,
        "steps": [
          "检查CRM系统是否有客户邮箱信息",
          "如找到，导入并更新数据",
          "如未找到，添加标记字段"
        ]
      },
      {
        "id": "sugg_002",
        "issueId": "issue_002",
        "priority": "medium",
        "title": "统一日期格式",
        "description": "将所有日期统一为YYYY-MM-DD格式",
        "impact": "统一格式后可正确排序",
        "estimatedTime": 2,
        "canAutoFix": true,
        "autoFixCode": "data.forEach(row => { row['日期'] = new Date(row['日期']).toISOString().split('T')[0]; });",
        "steps": [
          "识别日期列中的不同格式",
          "统一转换为YYYY-MM-DD格式",
          "验证转换后的日期有效性"
        ],
        "preview": {
          "affectedRows": 8,
          "examples": [
            { "original": "25/01/2026", "converted": "2026-01-25" }
          ]
        }
      }
    ],
    "totalSuggestions": 2,
    "canAutoFixCount": 1,
    "estimatedTotalTime": 7
  },
  "meta": {
    "requestId": "req_20260125_002",
    "timestamp": "2026-01-25T10:30:05Z",
    "version": "2.0.0",
    "executionTime": 1250
  }
}
```

### 3. 执行自动修复

**端点**: `POST /api/v2/data-quality/auto-fix`

**请求体**:
```json
{
  "analysisId": "qa_1737820800000_xyz789",
  "suggestions": [
    {
      "suggestionId": "sugg_001",
      "action": "auto_fix"
    },
    {
      "suggestionId": "sugg_002",
      "action": "skip"
    }
  ],
  "options": {
    "createBackup": true,
    "validateAfterClean": true
  }
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "cleanId": "clean_1737820800000_def456",
    "analysisId": "qa_1737820800000_xyz789",
    "status": "completed",
    "results": [
      {
        "suggestionId": "sugg_001",
        "status": "success",
        "affectedRows": 10,
        "message": "成功修复10条记录"
      },
      {
        "suggestionId": "sugg_002",
        "status": "skipped",
        "message": "已跳过"
      }
    ],
    "summary": {
      "totalProcessed": 2,
      "successful": 1,
      "skipped": 1,
      "failed": 0,
      "finalQualityScore": 92,
      "qualityImprovement": 7
    },
    "backupFile": {
      "fileId": "backup_1737820800000_original",
      "fileName": "销售数据_backup_20260125.xlsx",
      "expiresAt": "2026-02-25T10:30:00Z"
    }
  },
  "meta": {
    "requestId": "req_20260125_003",
    "timestamp": "2026-01-25T10:30:10Z",
    "version": "2.0.0",
    "executionTime": 2500
  }
}
```

## WebSocket实时推送

### 连接WebSocket

```javascript
const ws = new WebSocket('ws://localhost:3000/ws?clientId=your-client-id');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('收到消息:', message);
};
```

### 消息类型

#### 1. 分析开始

```json
{
  "type": "analysis_started",
  "payload": {
    "requestId": "req_123",
    "fileId": "file_123",
    "sheetName": "Sheet1",
    "timestamp": 1737820800000
  }
}
```

#### 2. 分析进度

```json
{
  "type": "analysis_progress",
  "payload": {
    "requestId": "req_123",
    "progress": {
      "stage": "analyzing",
      "percentage": 50,
      "message": "正在分析数据...",
      "timestamp": 1737820800500
    }
  }
}
```

#### 3. 分析完成

```json
{
  "type": "analysis_completed",
  "payload": {
    "requestId": "req_123",
    "analysisId": "qa_123",
    "result": { /* 分析结果 */ },
    "timestamp": 1737820801000
  }
}
```

#### 4. 分析错误

```json
{
  "type": "analysis_error",
  "payload": {
    "requestId": "req_123",
    "error": "错误消息",
    "timestamp": 1737820801500
  }
}
```

## 错误处理

### 错误响应格式

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
    "requestId": "req_20260125_004",
    "timestamp": "2026-01-25T10:30:00Z",
    "helpUrl": "https://docs.excelmind.ai/errors/validation"
  }
}
```

### 常见错误代码

| 错误代码 | HTTP状态 | 描述 |
|---------|----------|------|
| VALIDATION_ERROR | 400 | 请求参数验证失败 |
| FILE_NOT_FOUND | 404 | 文件不存在 |
| DATA_QUALITY_ANALYSIS_FAILED | 500 | 数据质量分析失败 |
| DATA_CLEANING_FAILED | 500 | 数据清洗失败 |

## 完整示例

### 前端调用示例

```typescript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api/v2';

// 1. 上传文件
async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post(`${API_BASE_URL}/files/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

  return response.data.data.fileId;
}

// 2. 分析数据质量
async function analyzeDataQuality(fileId: string, sheetName: string) {
  const response = await axios.post(`${API_BASE_URL}/data-quality/analyze`, {
    fileId,
    sheetName,
    options: {
      checkMissingValues: true,
      checkDuplicates: true,
      checkFormats: true,
      checkOutliers: true
    }
  }, {
    headers: {
      'X-Request-ID': generateUUID(),
      'X-Client-ID': 'client-123'
    }
  });

  return response.data;
}

// 3. 获取清洗建议
async function getRecommendations(analysisId: string) {
  const response = await axios.post(`${API_BASE_URL}/data-quality/recommendations`, {
    analysisId,
    options: {
      includeAutoFix: true
    }
  });

  return response.data;
}

// 4. 执行自动修复
async function executeAutoFix(analysisId: string, suggestions: any[]) {
  const response = await axios.post(`${API_BASE_URL}/data-quality/auto-fix`, {
    analysisId,
    suggestions,
    options: {
      createBackup: true,
      validateAfterClean: true
    }
  });

  return response.data;
}

// 完整工作流
async function cleanDataWorkflow(file: File) {
  try {
    // 1. 上传文件
    const fileId = await uploadFile(file);
    console.log('文件上传成功:', fileId);

    // 2. 分析数据质量
    const analysisResult = await analyzeDataQuality(fileId, 'Sheet1');
    console.log('分析完成:', analysisResult.data.summary);

    // 3. 获取清洗建议
    const recommendations = await getRecommendations(analysisResult.data.analysisId);
    console.log('获取到建议:', recommendations.data.totalSuggestions);

    // 4. 选择可自动修复的建议
    const autoFixSuggestions = recommendations.data.suggestions
      .filter(s => s.canAutoFix)
      .map(s => ({
        suggestionId: s.id,
        action: 'auto_fix'
      }));

    // 5. 执行修复
    if (autoFixSuggestions.length > 0) {
      const cleanResult = await executeAutoFix(
        analysisResult.data.analysisId,
        autoFixSuggestions
      );
      console.log('清洗完成:', cleanResult.data.summary);
    }

  } catch (error) {
    console.error('工作流执行失败:', error.response?.data || error.message);
  }
}

// 生成UUID
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 使用示例
const fileInput = document.getElementById('file-input') as HTMLInputElement;
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (file) {
    await cleanDataWorkflow(file);
  }
});
```

## 测试

### 运行单元测试

```bash
npm test -- api/controllers/dataQualityController.test.ts
```

### 运行集成测试

```bash
npm run test:integration
```

### API测试示例

```bash
# 分析数据质量
curl -X POST http://localhost:3000/api/v2/data-quality/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "fileId": "test_file_123",
    "sheetName": "Sheet1",
    "options": {
      "checkMissingValues": true,
      "checkDuplicates": true
    }
  }'

# 获取清洗建议
curl -X POST http://localhost:3000/api/v2/data-quality/recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "analysisId": "qa_1737820800000_xyz789"
  }'

# 执行自动修复
curl -X POST http://localhost:3000/api/v2/data-quality/auto-fix \
  -H "Content-Type: application/json" \
  -d '{
    "analysisId": "qa_1737820800000_xyz789",
    "suggestions": [
      {
        "suggestionId": "sugg_001",
        "action": "auto_fix"
      }
    ]
  }'
```

## 性能优化

### 缓存策略

分析结果默认缓存30分钟，可以通过配置调整：

```typescript
const controller = createDataQualityController(storageService, websocketService);

// 自定义缓存配置
const analyzer = new DataQualityAnalyzer(
  aiServiceAdapter,
  cacheService,
  {
    enableCache: true,
    cacheTTL: 3600000, // 1小时
    parallelDetection: true,
    maxSampleSize: 10000
  }
);
```

### 采样分析

对于大数据集，可以使用采样来加速分析：

```json
{
  "fileId": "large_file_123",
  "sheetName": "Sheet1",
  "options": {
    "sampleSize": 1000,
    "samplingMethod": "random"
  }
}
```

## 故障排查

### 常见问题

1. **文件未找到错误**
   - 确保文件已上传并获取到fileId
   - 检查存储服务是否正常工作

2. **AI服务调用失败**
   - 检查智谱AI API密钥是否正确配置
   - 查看网络连接和API配额

3. **分析速度慢**
   - 使用采样分析减少数据量
   - 启用缓存避免重复分析

### 日志调试

```typescript
// 启用详细日志
process.env.LOG_LEVEL = 'debug';

// 查看控制器日志
console.log('[DataQualityController] 执行分析...');
```

## 贡献指南

欢迎提交Issue和Pull Request！

## 许可证

MIT License
