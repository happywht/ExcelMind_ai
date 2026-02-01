# 🚀 后端文档生成快速参考

**版本**: 1.0.0
**日期**: 2026-02-01
**目标**: 在8小时内完成核心功能迁移

---

## 📋 5分钟快速开始

### 1. 创建核心服务文件

```bash
# 创建后端服务
mkdir -p server/services
touch server/services/documentGenerationService.ts

# 创建控制器
mkdir -p api/controllers
touch api/controllers/documentGenerationController.ts

# 创建前端服务
touch services/backendDocumentService.ts
```

### 2. 复制核心代码

从实施指南复制以下文件的内容：

1. `server/services/documentGenerationService.ts`
2. `api/controllers/documentGenerationController.ts`
3. `services/backendDocumentService.ts`

### 3. 修改路由配置

在 `api/routes/v2.ts` 中添加：

```typescript
import { documentGenerationController } from '../controllers/documentGenerationController';

// 在 createV2Router 函数中添加
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

generationRouter.get(
  '/download/:documentId',
  requireAuth,
  requireRead,
  asyncHandler(documentGenerationController.downloadDocument.bind(documentGenerationController))
);

generationRouter.get(
  '/batch/download/zip/:taskId',
  requireAuth,
  requireRead,
  asyncHandler(documentGenerationController.downloadZip.bind(documentGenerationController))
);

router.use('/generation', generationRouter);
```

### 4. 修改前端组件

在 `components/DocumentSpace/DocumentSpace.tsx` 中：

1. 添加导入：
```typescript
import { BackendDocumentService } from '../../services/backendDocumentService';
```

2. 修改 `handleGenerateDocs` 函数，替换现有的 `DocxtemplaterService.batchGenerate` 调用为：

```typescript
const backendService = new BackendDocumentService();
const documents = await backendService.batchGenerate({
  templateFile: templateFile.arrayBuffer,
  dataList: mappedDataList,
  mappingScheme,
  baseFileName: baseFileName,
  options: {
    concurrency: 3,
    batchSize: 10,
    onProgress: (current, total) => {
      const percentage = Math.round((current / total) * 100);
      updateProgress(percentage);
      addLogWithMetrics('generating', 'pending',
        `正在生成文档: ${current}/${total} (${percentage}%)`
      );
    }
  }
});
```

### 5. 测试

```bash
# 启动后端服务器
npm run dev:api

# 启动前端开发服务器
npm run dev

# 在浏览器中测试
# 1. 上传模板
# 2. 上传数据
# 3. 生成映射
# 4. 生成文档
```

---

## 🔥 常见问题解决

### Q1: Base64编码问题

**问题**: `Invalid Base64 string`

**解决**:
```typescript
// 错误方式
const base64 = file.toString('base64'); // ❌

// 正确方式
const buffer = Buffer.from(file);
const base64 = buffer.toString('base64'); // ✅
```

### Q2: ArrayBuffer和Buffer转换

**问题**: `arrayBuffer.buffer is not defined`

**解决**:
```typescript
// ArrayBuffer -> Buffer
const buffer = Buffer.from(arrayBuffer);

// Buffer -> ArrayBuffer
const arrayBuffer = buffer.buffer.slice(
  buffer.byteOffset,
  buffer.byteOffset + buffer.byteLength
);
```

### Q3: Blob和Buffer互转

**问题**: `Cannot convert Blob to Buffer`

**解决**:
```typescript
// Blob -> Buffer
const arrayBuffer = await blob.arrayBuffer();
const buffer = Buffer.from(arrayBuffer);

// Buffer -> Blob
const blob = new Blob([buffer], {
  type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
});
```

### Q4: CORS错误

**问题**: `CORS policy blocked the request`

**解决**:
```typescript
// 在 server/app.ts 中添加
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
```

### Q5: 内存溢出

**问题**: `JavaScript heap out of memory`

**解决**:
```typescript
// 减少并发数
const options = {
  concurrency: 1, // 降低并发
  batchSize: 5    // 减少批次大小
};

// 增加Node.js内存限制
NODE_OPTIONS="--max-old-space-size=4096" npm run dev:api
```

---

## 🧪 快速测试脚本

### 测试单个文档生成

```typescript
// scripts/test-single-document-generation.ts
import { documentGenerationService } from '../server/services/documentGenerationService';

async function testSingleGeneration() {
  const templateBuffer = await fetch('template.docx')
    .then(res => res.arrayBuffer());

  const result = await documentGenerationService.generateDocument({
    templateBuffer,
    data: {
      name: '张三',
      company: '测试公司',
      amount: 10000
    }
  });

  console.log('生成成功:', result.fileName, result.size);
}

testSingleGeneration();
```

### 测试批量文档生成

```typescript
// scripts/test-batch-document-generation.ts
import { documentGenerationService } from '../server/services/documentGenerationService';

async function testBatchGeneration() {
  const templateBuffer = await fetch('template.docx')
    .then(res => res.arrayBuffer());

  const result = await documentGenerationService.batchGenerate({
    templateBuffer,
    dataList: [
      { name: '张三', company: '公司A' },
      { name: '李四', company: '公司B' },
      { name: '王五', company: '公司C' }
    ],
    options: {
      baseFileName: '合同',
      concurrency: 2
    }
  });

  console.log('批量生成完成:', {
    successful: result.stats.successful,
    failed: result.stats.failed,
    duration: result.stats.totalDuration
  });
}

testBatchGeneration();
```

### 测试API端点

```bash
# 测试单个文档生成
curl -X POST http://localhost:3001/api/v2/generation/generate \
  -H "Content-Type: application/json" \
  -d '{
    "templateFile": "base64_encoded_template",
    "data": {
      "name": "张三",
      "company": "测试公司"
    }
  }'

# 测试批量文档生成
curl -X POST http://localhost:3001/api/v2/generation/batch \
  -H "Content-Type: application/json" \
  -d '{
    "templateFile": "base64_encoded_template",
    "dataList": [
      {"name": "张三"},
      {"name": "李四"}
    ],
    "options": {
      "baseFileName": "合同"
    }
  }'
```

---

## 📊 性能优化建议

### 1. 启用模板缓存

```typescript
const result = await documentGenerationService.generateDocument({
  templateBuffer,
  data,
  options: {
    enableCache: true // ✅ 启用缓存
  }
});
```

### 2. 调整并发参数

```typescript
// 小数据量 (< 100)
const options = {
  concurrency: 3,
  batchSize: 10
};

// 大数据量 (> 100)
const options = {
  concurrency: 2,  // 降低并发
  batchSize: 20    // 增大批次
};
```

### 3. 使用流式传输（P2阶段）

```typescript
// 未来实现
const stream = await documentGenerationService.generateAsStream({
  templateBuffer,
  dataList
});
```

---

## 🛠️ 调试技巧

### 1. 启用详细日志

```typescript
// 在 .env 中设置
LOG_LEVEL=debug
DEBUG=document-generation:*
```

### 2. 查看中间结果

```typescript
// 在关键点添加日志
logger.debug('[Debug] Template size:', templateBuffer.byteLength);
logger.debug('[Debug] Data fields:', Object.keys(data));
logger.debug('[Debug] Mappings:', mappingScheme.mappings);
```

### 3. 性能分析

```typescript
// 使用 performance API
const startTime = performance.now();
const result = await generateDocument(params);
const duration = performance.now() - startTime;
logger.info(`Generation took ${duration}ms`);
```

---

## 📝 代码片段库

### Base64编码/解码

```typescript
// 编码
function toBase64(buffer: ArrayBuffer): string {
  const buf = Buffer.from(buffer);
  return buf.toString('base64');
}

// 解码
function fromBase64(base64: string): ArrayBuffer {
  const buf = Buffer.from(base64, 'base64');
  return buf.buffer.slice(
    buf.byteOffset,
    buf.byteOffset + buf.byteLength
  );
}
```

### 文件名清理

```typescript
function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 100);
}
```

### 错误处理

```typescript
async function safeGenerate(params: GenerationParams) {
  try {
    return await generateDocument(params);
  } catch (error) {
    if (error.message.includes('模板')) {
      throw new Error('模板文件无效，请检查格式');
    } else if (error.message.includes('数据')) {
      throw new Error('数据格式错误，请检查字段');
    } else {
      throw new Error('文档生成失败，请稍后重试');
    }
  }
}
```

---

## 🎯 实施时间表

| 时间 | 任务 | 状态 |
|------|------|------|
| 0:00-0:30 | 创建文件和基础结构 | ⏳ 待开始 |
| 0:30-2:00 | 实现后端服务 | ⏳ 待开始 |
| 2:00-3:00 | 实现API控制器 | ⏳ 待开始 |
| 3:00-3:30 | 配置路由 | ⏳ 待开始 |
| 3:30-4:30 | 实现前端服务 | ⏳ 待开始 |
| 4:30-5:30 | 修改前端组件 | ⏳ 待开始 |
| 5:30-6:30 | 单元测试 | ⏳ 待开始 |
| 6:30-7:30 | 集成测试 | ⏳ 待开始 |
| 7:30-8:00 | 修复bug和优化 | ⏳ 待开始 |

---

## ✅ 验收标准

### 功能验收

- [ ] 单个文档生成成功
- [ ] 批量文档生成成功
- [ ] 错误处理正确
- [ ] 进度显示正常
- [ ] 文件下载正常

### 性能验收

- [ ] 单个文档 < 2秒
- [ ] 批量100个文档 < 30秒
- [ ] 内存使用 < 500MB
- [ ] API响应 < 500ms

### 质量验收

- [ ] 代码审查通过
- [ ] 单元测试覆盖率 > 80%
- [ ] 集成测试通过
- [ ] 文档完整

---

## 📞 获取帮助

### 文档资源

- [架构设计文档](./BACKEND_DOCUMENT_GENERATION_ARCHITECTURE.md)
- [实施指南](./BACKEND_DOCUMENT_GENERATION_IMPLEMENTATION_GUIDE.md)
- [API规范](./API_SPECIFICATION_PHASE2.md)

### 技术支持

- **架构师**: Chief Architect
- **工程负责人**: Head of Engineering
- **产品协调**: Head of Product

---

**快速参考版本**: 1.0.0
**最后更新**: 2026-02-01
**状态**: ✅ 准备就绪
