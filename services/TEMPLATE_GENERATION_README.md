# 多模板文档生成模块 - 快速开始

## 📦 模块概述

多模板文档生成模块是 ExcelMind AI Phase 2 的核心功能，支持用户批量生成 Word 文档，并提供实时进度追踪。

### 核心能力

- 📄 **模板管理**: 上传、配置、版本控制多个 Word 模板
- 🔄 **批量生成**: 选择多个模板和数据源，批量生成文档
- 📊 **实时追踪**: WebSocket 推送生成进度和状态
- 📜 **历史管理**: 查看历史任务、重新生成、下载文档
- ⚡ **高性能**: 并发生成、分批处理、智能缓存

---

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 导入模块

```typescript
import {
  TemplateManager,
  BatchGenerationScheduler,
  WebSocketManager,
  DefaultDocumentGenerator,
  GenerationMode,
  Priority
} from '@/services';
```

### 3. 初始化服务

```typescript
// 创建存储服务（需要实现 IStorageService 接口）
const storageService = new MyStorageService();

// 创建缓存服务
const cacheService = createCacheService();

// 创建模板管理器
const templateManager = new TemplateManager(storageService, cacheService);

// 创建 WebSocket 管理器
const websocketManager = new WebSocketManager({
  heartbeatInterval: 30000,
  connectionTimeout: 60000
});

// 创建文档生成器
const documentGenerator = new DefaultDocumentGenerator();

// 创建批量调度器
const scheduler = new BatchGenerationScheduler(
  templateManager,
  documentGenerator,
  websocketManager,
  {
    maxConcurrency: 3,
    progressInterval: 500
  }
);
```

### 4. 上传模板

```typescript
const template = await templateManager.createTemplate({
  name: '标准合同模板',
  description: '用于生成标准合同文档',
  category: '合同',
  tags: ['标准', '合同'],
  fileBuffer: templateFileBuffer,
  version: '1.0.0'
});

console.log('模板ID:', template.metadata.id);
console.log('占位符:', template.placeholders);
```

### 5. 创建批量任务

```typescript
const response = await scheduler.createTask({
  mode: GenerationMode.SINGLE_TEMPLATE,
  templateIds: [template.metadata.id],
  dataSource: {
    type: 'excel',
    source: {
      file: {
        name: 'data.xlsx',
        buffer: excelFileBuffer
      }
    }
  },
  parameters: {
    fileNameTemplate: '{{名称}}_合同.docx',
    dateFormat: 'YYYY-MM-DD'
  },
  output: {
    type: 'download',
    download: {
      fileName: '批量合同',
      zipFileName: 'contracts.zip'
    }
  },
  options: {
    concurrency: 3,
    batchSize: 10,
    continueOnError: true,
    retryCount: 2,
    enableWebSocket: true
  },
  priority: Priority.NORMAL
});

console.log('任务ID:', response.taskId);
```

### 6. 监听进度 (WebSocket)

```typescript
const ws = new WebSocket('ws://localhost:8080');

ws.onopen = () => {
  // 订阅任务
  ws.send(JSON.stringify({
    action: 'subscribe',
    taskIds: [response.taskId]
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  switch (data.type) {
    case 'progress':
      console.log(`进度: ${data.progress}% - ${data.message}`);
      break;

    case 'document_generated':
      console.log(`文档已生成: ${data.documentId}`);
      break;

    case 'completed':
      console.log('任务完成:', data.result);
      break;
  }
};
```

---

## 📁 文件结构

```
services/
├── TemplateManager.ts                 # 模板管理器
├── BatchGenerationScheduler.ts        # 批量生成调度器
├── websocket/
│   └── websocketManager.ts            # WebSocket管理器
├── TemplateManager.test.ts            # 单元测试
├── BatchGenerationScheduler.test.ts   # 单元测试
├── TEMPLATE_GENERATION_IMPLEMENTATION.md  # 实施说明
├── TEMPLATE_GENERATION_EXAMPLES.ts    # 使用示例
├── quick-test-template-generation.ts  # 快速测试
└── TEMPLATE_GENERATION_SUMMARY.md     # 实施总结
```

---

## 🧪 运行测试

### 运行所有测试

```bash
npm test
```

### 运行快速测试脚本

```bash
npx ts-node services/quick-test-template-generation.ts
```

---

## 📖 文档

- [架构设计文档](../docs/BATCH_TEMPLATE_GENERATION_ARCHITECTURE.md) - 完整的系统架构设计
- [实施说明文档](./TEMPLATE_GENERATION_IMPLEMENTATION.md) - 详细的实施指南
- [实施总结文档](./TEMPLATE_GENERATION_SUMMARY.md) - 实施成果总结
- [使用示例代码](./TEMPLATE_GENERATION_EXAMPLES.ts) - 完整的使用示例

---

## 🎯 核心特性

### 三种生成模式

1. **单模板多数据** (`SINGLE_TEMPLATE`)
   - 一个模板 + 多条数据
   - 生成多个相同格式的文档

2. **多模板单数据** (`MULTI_TEMPLATE`)
   - 多个模板 + 一条数据
   - 生成多个不同格式的文档

3. **多模板多数据** (`CROSS_PRODUCT`)
   - 多个模板 + 多条数据
   - 生成笛卡尔积组合的文档

### 任务状态管理

```
PENDING → RUNNING → COMPLETED
    ↓         ↓
  PAUSED   FAILED / CANCELLED
```

### 并发控制

- 默认并发数: 3
- 可配置范围: 1-10
- 自动队列管理
- 优先级调度

### 实时进度推送

WebSocket 推送的事件类型:
- `progress` - 进度更新 (0-100%)
- `document_generated` - 文档生成完成
- `status_changed` - 任务状态变更
- `error` - 错误通知
- `completed` - 任务完成

---

## 🔧 配置选项

### TemplateManager 配置

```typescript
const templateManager = new TemplateManager(
  storageService,
  cacheService  // 可选，默认创建
);
```

### BatchGenerationScheduler 配置

```typescript
const scheduler = new BatchGenerationScheduler(
  templateManager,
  documentGenerator,
  websocketManager,
  {
    maxConcurrency: 3,        // 最大并发数
    progressInterval: 500     // 进度推送间隔（毫秒）
  }
);
```

### WebSocketManager 配置

```typescript
const websocketManager = new WebSocketManager({
  heartbeatInterval: 30000,        // 心跳间隔（毫秒）
  connectionTimeout: 60000,        // 连接超时（毫秒）
  maxMessageQueueSize: 1000,       // 消息队列最大长度
  enableCompression: false,        // 启用压缩
  reconnect: {
    maxAttempts: 5,                // 最大重连次数
    delay: 1000,                   // 重连延迟（毫秒）
    exponentialBackoff: true       // 指数退避
  }
});
```

---

## ⚠️ 注意事项

### 需要实现的服务

`IStorageService` 接口需要根据实际环境实现：

```typescript
interface IStorageService {
  store(key: string, data: ArrayBuffer | Blob): Promise<string>;
  retrieve(key: string): Promise<ArrayBuffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}
```

### 性能建议

1. **大批量任务**: 使用较小的 `batchSize` (5-10)
2. **内存限制**: 设置合理的 `memoryLimit` (默认512MB)
3. **并发控制**: 根据服务器性能调整 `concurrency`
4. **缓存策略**: 启用多层缓存提升性能

### 错误处理

所有服务都实现了完整的错误处理：

```typescript
try {
  const template = await templateManager.createTemplate(request);
} catch (error) {
  if (error instanceof TemplateValidationError) {
    console.error('模板验证失败:', error.errors);
  } else if (error instanceof TemplateNotFoundError) {
    console.error('模板不存在:', error.templateId);
  }
}
```

---

## 📊 性能指标

| 指标 | 目标值 | 说明 |
|------|--------|------|
| 单个文档生成 | < 2秒 | 使用 docxtemplater 引擎 |
| 并发生成 | 3个并发 | 默认配置，可调整 |
| 内存使用 | < 512MB | 单任务内存限制 |
| 任务吞吐量 | 100文档/分钟 | 取决于文档复杂度 |
| WebSocket延迟 | < 100ms | 本地网络 |

---

## 🔄 下一步

1. **实现存储服务** - LocalStorage/IndexedDB/远程存储
2. **创建 API 控制器** - RESTful API 端点
3. **前端集成** - React 组件和 WebSocket 客户端
4. **历史记录管理** - 任务历史查询和重新生成

---

## 📝 许可证

MIT License

---

## 👥 贡献

欢迎提交 Issue 和 Pull Request！

---

**最后更新**: 2025-01-25
**版本**: 2.0.0
**状态**: ✅ 核心服务实现完成
