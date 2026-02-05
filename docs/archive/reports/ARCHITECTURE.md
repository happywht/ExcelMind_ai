# AI驱动智能文档填充系统 - 架构设计文档

## 文档版本

- **版本**: 1.0.0
- **日期**: 2025-01-15
- **作者**: API架构专家
- **状态**: 设计完成

---

## 目录

1. [系统概述](#系统概述)
2. [架构设计原则](#架构设计原则)
3. [分层架构](#分层架构)
4. [核心数据流](#核心数据流)
5. [AI交互流程](#ai交互流程)
6. [缓存策略](#缓存策略)
7. [错误处理与降级](#错误处理与降级)
8. [扩展性设计](#扩展性设计)
9. [安全考虑](#安全考虑)
10. [性能优化](#性能优化)

---

## 系统概述

### 定位

这是一个**AI驱动的智能文档填充系统**，不是简单的字段映射工具。系统通过多轮AI交互，深度理解Word模板语义、Excel数据结构和用户自然语言指令，自动生成复杂的数据查询和转换逻辑。

### 核心挑战

1. **单次AI调用无法处理所有复杂性**
   - 需要分阶段分析：模板 -> 数据 -> 语义 -> 映射 -> 转换 -> 生成

2. **需要多轮交互**
   - 分析 → 规划 → 生成 → 验证
   - 每个阶段可能需要用户干预

3. **用户可干预性**
   - 支持用户在任何阶段介入调整
   - AI置信度低时自动请求用户确认

### 系统能力

```
输入：
- Word模板（含占位符、条件块、循环）
- Excel数据（多工作表、复杂关系）
- 自然语言指令

输出：
- 填充完成的Word文档（批量）
- 映射方案（可编辑、可重用）
- 执行日志（可追溯）
```

---

## 架构设计原则

### 1. 分层职责 (Layered Architecture)

每个层只关注自己的职责：

- **API层**: 处理HTTP请求/响应
- **服务层**: 业务逻辑编排
- **编排层**: AI交互、任务调度
- **基础设施层**: 缓存、重试、日志

### 2. 依赖倒置 (Dependency Inversion)

高层模块不依赖低层模块，都依赖抽象：

```typescript
// 服务依赖接口，不依赖具体实现
class IntelligentDocumentService {
  constructor(
    private readonly aiService: IAIService,           // 接口
    private readonly cacheService: ICacheService,     // 接口
    private readonly retryStrategy: IRetryStrategy    // 接口
  ) {}
}
```

### 3. 开闭原则 (Open-Closed)

对扩展开放，对修改关闭：

- 新增数据源：实现 `IDataSourceAnalysisService`
- 新增文档格式：实现 `IDocumentGenerationService`
- 新增AI提供商：实现 `IAIService`

### 4. 单一职责 (Single Responsibility)

每个类只有一个变更的理由：

- `TemplateAnalysisService`: 只负责模板分析
- `MappingPlanningService`: 只负责映射规划
- `CacheService`: 只负责缓存管理

### 5. 接口隔离 (Interface Segregation)

客户端不应依赖它不需要的接口：

```typescript
// 小而专注的接口
interface ITemplateAnalysisService {
  analyzeTemplate(file: File): Promise<TemplateStructure>;
  extractPlaceholders(content: string): Promise<string[]>;
}

// 而不是大而全的
interface IService {
  // ... 几十个方法
}
```

---

## 分层架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        UI Layer (React)                         │
│  - DocumentSpace Component                                      │
│  - 状态管理、用户交互、结果展示                                   │
└─────────────────────────────┬───────────────────────────────────┘
                              │ REST API / WebSocket
┌─────────────────────────────▼───────────────────────────────────┐
│                      API Gateway Layer                          │
│  - 认证授权 (JWT)                                                │
│  - 速率限制 (Token Bucket)                                      │
│  - 请求日志 (Request Tracing)                                   │
│  - 响应缓存 (HTTP Cache)                                        │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                    Controller Layer                             │
│  - TaskController: 任务管理                                      │
│  - DocumentController: 文档下载                                  │
│  - AnalysisController: 分析服务                                  │
│  - 请求验证、响应组装、错误处理                                   │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                     Service Layer                               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │      IntelligentDocumentService (门面服务)                 │  │
│  │  - 协调各子服务                                             │  │
│  │  - 管理任务生命周期                                          │  │
│  │  - 提供统一API                                               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐           │
│  │  Template    │ │   Mapping    │ │  Document    │           │
│  │  Analysis    │ │   Planning   │ │ Generation   │           │
│  │  Service     │ │   Service    │ │  Service     │           │
│  └──────────────┘ └──────────────┘ └──────────────┘           │
│                                                                  │
│  ┌──────────────┐ ┌──────────────┐                             │
│  │   DataSource │ │     AI       │                             │
│  │  Analysis    │ │ Orchestration│                             │
│  │  Service     │ │   Service    │                             │
│  └──────────────┘ └──────────────┘                             │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                   Orchestration Layer                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           TaskOrchestrationService                        │  │
│  │  - 管理任务执行流水线                                        │  │
│  │  - 处理AI交互轮次                                            │  │
│  │  - 协调用户干预                                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │             AIOrchestrationService                        │  │
│  │  - 管理AI会话状态                                            │  │
│  │  - 构建提示词                                                │  │
│  │  - 解析AI响应                                                │  │
│  │  - 重试和降级                                                │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                  Infrastructure Layer                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│  │    Cache    │ │   Retry     │ │   Event     │              │
│  │   Service   │ │  Strategy   │ │    Bus      │              │
│  │             │ │             │ │             │              │
│  │ - Memory    │ │ - Exponential│ │ - Pub/Sub   │              │
│  │ - LocalStg  │ │ - Linear    │ │ - History   │              │
│  │ - IndexedDB │ │ - Jitter    │ │ - Replay    │              │
│  └─────────────┘ └─────────────┘ └─────────────┘              │
│                                                                  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│  │  Fallback   │ │   Task      │ │   Logger    │              │
│  │  Strategy   │ │ Repository  │ │   Service   │              │
│  └─────────────┘ └─────────────┘ └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 核心数据流

### 任务执行流程

```
用户请求
  │
  ▼
创建任务 (Task)
  │
  ├─ 解析模板 → TemplateStructure
  │   └─ 占位符提取、章节分析、特性检测
  │
  ├─ 分析数据源 → DataSourceConfig[]
  │   └─ 数据类型推断、关系检测、样本生成
  │
  ▼
启动任务
  │
  ▼
┌─────────────────────────────────────────────────────────────┐
│                     AI多轮交互循环                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐                                        │
│  │ 1. 模板分析      │ → AI理解模板结构、占位符语义            │
│  └────────┬────────┘                                        │
│           │                                                 │
│  ┌────────▼────────┐                                        │
│  │ 2. 数据分析      │ → AI理解数据结构、列语义、关系          │
│  └────────┬────────┘                                        │
│           │                                                 │
│  ┌────────▼────────┐                                        │
│  │ 3. 语义理解      │ → AI理解用户指令意图、所需操作          │
│  └────────┬────────┘                                        │
│           │                                                 │
│  ┌────────▼────────┐                                        │
│  │ 4. 映射规划      │ → AI生成字段映射、筛选条件              │
│  │                 │ → [可能需要用户确认]                     │
│  └────────┬────────┘                                        │
│           │                                                 │
│  ┌────────▼────────┐                                        │
│  │ 5. 转换生成      │ → AI生成数据转换JavaScript代码          │
│  └────────┬────────┘                                        │
│           │                                                 │
│  ┌────────▼────────┐                                        │
│  │ 6. 文档生成      │ → 执行代码、填充模板、批量生成          │
│  └────────┬────────┘                                        │
│           │                                                 │
│  ┌────────▼────────┐                                        │
│  │ 7. 验证优化      │ → AI验证结果、提供优化建议              │
│  └────────┬────────┘                                        │
│           │                                                 │
│           ▼                                                 │
│      完成任务                                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
  │
  ▼
返回结果
  │
  ├─ 生成的文档 (Blob/URL)
  ├─ 映射方案 (JSON)
  ├─ 执行日志
  └─ AI分析记录
```

---

## AI交互流程

### 六轮AI交互

| 轮次 | 目标 | 输入 | 输出 | 可能的用户干预 |
|------|------|------|------|----------------|
| 1️⃣ 模板分析 | 理解模板结构 | 模板文件 | TemplateStructure | - |
| 2️⃣ 数据分析 | 理解数据结构 | 数据文件 | DataSourceConfig[] | - |
| 3️⃣ 语义理解 | 理解用户意图 | 模板+数据+指令 | Intent分析 | - |
| 4️⃣ 映射规划 | 生成字段映射 | 所有前期结果 | MappingScheme | ✅ 高概率需要 |
| 5️⃣ 转换生成 | 生成转换代码 | 映射方案 | JavaScript代码 | - |
| 6️⃣ 验证优化 | 验证和优化 | 所有结果 | 验证报告+建议 | ✅ 可能需要 |

### AI会话状态管理

```typescript
interface AISessionState {
  sessionId: string;
  currentRound: AIRound;
  completedRounds: AIRound[];
  context: AnalysisContext;  // 累积的上下文
  history: AIRoundMessage[]; // 完整对话历史
  metadata: {
    totalTokensUsed: number;
    estimatedCost: number;
  };
}
```

### 提示词策略

每轮AI调用使用专门的提示词模板：

1. **系统提示词**: 定义AI角色和职责
2. **上下文提示词**: 提供模板、数据、指令信息
3. **Few-Shot示例**: 提供输入输出示例
4. **输出格式要求**: 严格的JSON Schema

---

## 缓存策略

### 三层缓存架构

```
┌─────────────────────────────────────────────────────────┐
│                    缓存决策树                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  数据大小 < 10KB?                                        │
│     │                                                   │
│     ├─ 是 → Memory Cache (最快)                         │
│     │                                                   │
│     └─ 否                                               │
│         │                                               │
│         ▼                                               │
│     数据大小 < 100KB?                                    │
│         │                                               │
│         ├─ 是 → LocalStorage (中等)                     │
│         │                                               │
│         └─ 否 → IndexedDB (大容量)                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 可缓存内容

| 内容类型 | 缓存键 | TTL | 缓存层 |
|---------|--------|-----|--------|
| 模板分析结果 | `template_analysis:{hash}` | 1h | Memory + LocalStorage |
| 数据源分析结果 | `data_analysis:{hash}` | 30m | Memory + LocalStorage |
| AI响应 | `ai_response:{round}:{hash}` | 1h | Memory + IndexedDB |
| 映射方案 | `mapping:{hash}` | 24h | IndexedDB |
| 生成的文档 | `document:{id}` | 7d | IndexedDB |

### 缓存失效策略

1. **时间失效**: TTL到期自动失效
2. **LRU淘汰**: Memory缓存满时淘汰最少使用的
3. **手动清除**: 用户更新数据时清除相关缓存
4. **版本控制**: 数据结构变更时版本号更新

---

## 错误处理与降级

### 错误分类

```typescript
enum ErrorCategory {
  // 用户错误
  VALIDATION_ERROR = 'validation_error',      // 输入验证失败
  NOT_FOUND_ERROR = 'not_found_error',        // 资源不存在

  // 系统错误
  AI_SERVICE_ERROR = 'ai_service_error',      // AI服务错误
  NETWORK_ERROR = 'network_error',            // 网络错误
  STORAGE_ERROR = 'storage_error',            // 存储错误

  // 业务错误
  MAPPING_ERROR = 'mapping_error',            // 映射错误
  GENERATION_ERROR = 'generation_error',      // 生成错误
  TIMEOUT_ERROR = 'timeout_error'             // 超时错误
}

interface ErrorInfo {
  category: ErrorCategory;
  code: string;
  message: string;
  retryable: boolean;
  retryAfter?: number;
  fallbackAvailable: boolean;
}
```

### 重试策略

```typescript
// 指数退避 + 抖动
const retryConfig = {
  type: 'exponential_backoff',
  maxRetries: 3,
  initialDelay: 1000,    // 1秒
  maxDelay: 10000,       // 10秒
  backoffMultiplier: 2,  // 每次翻倍
  jitter: true,          // 添加随机抖动
  jitterAmount: 500      // ±500ms
};

// 重试延迟序列: 1s → 2s → 4s (实际: 0.8s → 2.1s → 4.2s)
```

### 降级策略

```typescript
const fallbackStrategies = {
  // AI服务失败 → 使用缓存的响应
  aiService: {
    primary: () => aiService.analyze(request),
    fallback: async () => {
      const cached = await cache.get(request);
      if (cached) return cached;
      throw new Error('No cached response available');
    }
  },

  // 模板分析失败 → 使用简单正则提取
  templateAnalysis: {
    primary: () => aiService.analyzeTemplate(file),
    fallback: () => simpleRegexExtraction(file)
  },

  // 文档生成失败 → 返回原始模板
  documentGeneration: {
    primary: () => generateDocument(data),
    fallback: () => originalTemplate
  }
};
```

---

## 扩展性设计

### 数据源扩展

新增数据源只需实现接口：

```typescript
// 1. 实现接口
class MongoDBDataSourceService implements IDataSourceAnalysisService {
  async analyzeDataSource(source: DataSourceConfig): Promise<DataSourceConfig> {
    // MongoDB特定的分析逻辑
  }
}

// 2. 注册
serviceRegistry.register('mongodb', new MongoDBDataSourceService());

// 3. 使用
POST /api/v1/datasources/analyze
{
  "type": "mongodb",
  "connection": {
    "uri": "mongodb://...",
    "collection": "products"
  }
}
```

### 文档格式扩展

新增文档格式：

```typescript
// 1. 实现接口
class PDFDocumentGenerator implements IDocumentGenerationService {
  async generateSingleDocument(context: GenerateContext): Promise<Blob> {
    // PDF生成逻辑
  }
}

// 2. 注册
documentGeneratorRegistry.register('pdf', new PDFDocumentGenerator());
```

### AI提供商扩展

新增AI提供商：

```typescript
// 1. 实现接口
class OpenAIService implements IAIService {
  async analyze(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    // OpenAI API调用
  }
}

// 2. 使用
const aiOrchestration = new AIOrchestrationService({
  provider: {
    name: 'openai',
    apiKey: 'sk-...',
    baseURL: 'https://api.openai.com/v1',
    model: 'gpt-4'
  }
});
```

---

## 安全考虑

### 1. 输入验证

```typescript
// 文件大小限制
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// 文件类型白名单
const ALLOWED_TEMPLATE_TYPES = ['.docx'];
const ALLOWED_DATA_TYPES = ['.xlsx', '.xls', '.csv'];

// 用户指令长度限制
const MAX_INSTRUCTION_LENGTH = 2000;
```

### 2. 代码执行安全

```typescript
// AI生成的JavaScript代码在Web Worker中执行
// 限制执行时间和内存

const worker = new Worker(codeExecutorWorker, {
  type: 'module'
});

worker.postMessage({
  code: aiGeneratedCode,
  data: excelData,
  timeout: 5000, // 5秒超时
  memoryLimit: 50 * 1024 * 1024 // 50MB内存限制
});
```

### 3. API密钥管理

```typescript
// 前端：使用环境变量
const apiKey = process.env.ZHIPU_API_KEY;

// 后端：使用密钥管理服务 (KMS)
const encryptedKey = await kms.encrypt(apiKey);

// 传输：HTTPS + JWT
Authorization: Bearer <signed_jwt>
```

### 4. 敏感数据处理

```typescript
// 不记录敏感数据到日志
const sanitizeLog = (data: any): any => {
  const sanitized = { ...data };
  delete sanitized.userToken;
  delete sanitized.apiKey;
  return sanitized;
};

// 文档URL签名 + 过期时间
const downloadUrl = signUrl({
  path: `/documents/${docId}`,
  expires: Date.now() + 3600000, // 1小时后过期
  userId: currentUser.id
});
```

---

## 性能优化

### 1. 流水线并行

```typescript
// 模板分析和数据分析可以并行执行
const [template, dataSources] = await Promise.all([
  templateService.analyzeTemplate(templateFile),
  ...dataFiles.map(file => dataSourceService.analyzeDataSource(file))
]);
```

### 2. 批量操作

```typescript
// 批量生成文档（而非逐个）
const documents = await documentService.generateBatchDocuments({
  template,
  dataSource,
  mapping,
  batchSize: 100 // 每批100个
});
```

### 3. 增量处理

```typescript
// 仅处理变化的数据
const delta = await calculateDelta(previousData, currentData);
const incrementalDocs = await generateDocuments(delta);
```

### 4. 压缩传输

```typescript
// 大文件使用压缩
const compressed = await compressBlob(docBlob, 'gzip');
// 节省约70%带宽
```

---

## 文件清单

创建的文件：

1. **类型定义**
   - `D:\家庭\青聪赋能\excelmind-ai\types\mappingSchemaV2.ts`
   - 完整的类型系统，支持多阶段AI工作流

2. **核心服务**
   - `D:\家庭\青聪赋能\excelmind-ai\services\intelligentDocumentService.ts`
   - 统一的服务门面，协调各子服务

3. **AI编排**
   - `D:\家庭\青聪赋能\excelmind-ai\services\ai\aiOrchestrationService.ts`
   - 管理AI交互的完整生命周期

4. **基础设施**
   - `D:\家庭\青聪赋能\excelmind-ai\services\infrastructure\cacheService.ts`
   - `D:\家庭\青聪赋能\excelmind-ai\services\infrastructure\retryService.ts`
   - `D:\家庭\青聪赋能\excelmind-ai\services\infrastructure\eventBus.ts`

5. **API文档**
   - `D:\家庭\青聪赋能\excelmind-ai\API_SPECIFICATION.md`
   - 完整的REST API规范

6. **架构文档**
   - `D:\家庭\青聪赋能\excelmind-ai\ARCHITECTURE.md` (本文件)

---

## 下一步建议

### 短期 (1-2周)
1. 实现基础服务接口
2. 集成现有代码到新架构
3. 编写单元测试

### 中期 (1个月)
1. 实现完整的AI交互流程
2. 添加WebSocket实时推送
3. 完善错误处理和日志

### 长期 (3个月)
1. 支持更多数据源和文档格式
2. 实现任务队列和异步处理
3. 添加Webhook通知功能

---

## 总结

本架构设计提供了一个**可扩展、可维护、高性能**的AI驱动文档填充系统。通过分层架构、依赖倒置、接口隔离等原则，确保系统易于扩展和演进。多轮AI交互、缓存优化、重试降级等机制，保证系统的稳定性和用户体验。

**核心优势：**
- ✅ 模块化设计，易于扩展
- ✅ AI深度理解，非简单映射
- ✅ 用户可干预，保证准确性
- ✅ 多层缓存，提升性能
- ✅ 弹性设计，稳定可靠
