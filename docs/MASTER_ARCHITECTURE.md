# ExcelMind AI - 文档空间全局架构设计

> **主控智能体整合方案** - 基于3个专业agent的深度分析
>
> - 后端开发专家：复杂查询引擎方案
> - 全栈开发专家：docx格式保持方案
> - API架构专家：智能填充接口方案

---

## 🎯 核心问题重定义

这**不是**简单的字段映射问题，而是需要AI深度介入的**智能文档生成系统**：

### 复杂度矩阵

| 场景 | 复杂度 | AI介入程度 | 当前方案 |
|------|--------|-----------|---------|
| 简单1对1映射 | ⭐ | 0% | ✅ 已实现 |
| 多Sheet联合查询 | ⭐⭐⭐ | 70% | ❌ 需开发 |
| 复杂聚合查询 | ⭐⭐⭐⭐ | 90% | ❌ 需开发 |
| 上下文关联 | ⭐⭐⭐⭐⭐ | 100% | ❌ 需开发 |
| 格式精确保持 | ⭐⭐⭐ | 技术方案 | ⚠️ 需升级 |

---

## 🏗️ 全局架构设计

### 系统分层架构

```
┌─────────────────────────────────────────────────────────────┐
│                    用户交互层 (Presentation Layer)            │
│  React UI组件 (DocumentSpace.tsx + 配置面板)                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                   API网关层 (API Gateway)                    │
│  RESTful API + WebSocket实时推送                            │
│  - 请求验证、路由分发、结果聚合                               │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                  业务编排层 (Orchestration Layer)             │
│  AI工作流编排器 (6轮交互流程)                                │
│  - 任务分解、流程控制、状态管理                               │
└─────────────┬──────────────────────────────┬────────────────┘
              │                              │
┌─────────────▼──────────────┐  ┌──────────▼──────────────────┐
│    智能决策层 (AI Layer)    │  │  数据查询层 (Query Layer)   │
│  - 模板语义理解             │  │  - 多Sheet管理              │
│  - 需求意图分析             │  │  - SQL生成与执行            │
│  - 映射策略生成             │  │  - 辅助函数库               │
│  智谱GLM-4.6               │  │  AlaSQL引擎                 │
└─────────────┬──────────────┘  └──────────┬──────────────────┘
              │                            │
              └────────────┬───────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│               文档生成层 (Generation Layer)                  │
│  - docxtemplater (95-98%格式保持)  └─► 备用: docx-templates │
│  - 批量处理、并发控制                                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              基础设施层 (Infrastructure Layer)                │
│  - 缓存服务 (内存/IndexedDB/持久化)                          │
│  - 重试策略 (指数退避 + 降级)                                │
│  - 事件总线 (发布-订阅)                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🤖 六轮AI交互流程

### 流程图

```
┌──────────────────────────────────────────────────────────────┐
│  用户输入：模板 + Excel + 自然语言指令                        │
└────────────────────────────┬─────────────────────────────────┘
                             │
        ┌────────────────────▼────────────────────┐
        │  Round 1: 模板分析                       │
        │  - 解析占位符                            │
        │  - 识别上下文和指代关系                   │
        │  - 检测复杂格式（表格、列表）             │
        └────────────────────┬────────────────────┘
                             │
        ┌────────────────────▼────────────────────┐
        │  Round 2: 数据分析                       │
        │  - 分析Sheet结构                         │
        │  - 检测列名冲突                          │
        │  - 推断表间关系                          │
        └────────────────────┬────────────────────┘
                             │
        ┌────────────────────▼────────────────────┐
        │  Round 3: 语义理解                       │
        │  - 理解用户指令意图                      │
        │  - 提取实体和条件                        │
        │  - 识别复杂查询模式                      │
        └────────────────────┬────────────────────┘
                             │
        ┌────────────────────▼────────────────────┐
        │  Round 4: 映射规划                       │
        │  - 生成数据查询方案                      │
        │  - 确定数据转换规则                      │
        │  - 处理字段冲突和路由                    │
        └────────────────────┬────────────────────┘
                             │
        ┌────────────────────▼────────────────────┐
        │  Round 5: 代码生成                       │
        │  - 生成SQL查询语句                       │
        │  - 生成数据转换代码                      │
        │  - 生成条件筛选逻辑                      │
        └────────────────────┬────────────────────┘
                             │
        ┌────────────────────▼────────────────────┐
        │  Round 6: 验证与优化                     │
        │  - 验证SQL正确性                         │
        │  - 优化查询性能                          │
        │  - 生成说明文档                          │
        └────────────────────┬────────────────────┘
                             │
                             ▼
                    输出：完整映射方案
```

### 交互示例

**用户输入**：
```
模板：产品介绍.docx
Excel：2023年销售数据.xlsx
指令：生成所有销售额大于10万的产品介绍文档，包含产品名称、销售额、排名
```

**AI交互过程**：

```typescript
// Round 1: 模板分析
{
  "placeholders": ["{{产品名称}}", "{{销售额}}", "{{排名}}"],
  "context": "产品介绍文档",
  "complexity": "medium"
}

// Round 2: 数据分析
{
  "sheets": ["销售明细", "产品信息"],
  "conflicts": [],
  "relationships": [
    {"from": "销售明细.产品ID", "to": "产品信息.产品ID"}
  ]
}

// Round 3: 语义理解
{
  "intent": "filter_and_aggregate",
  "entities": {
    "threshold": 100000,
    "fields": ["产品名称", "销售额", "排名"],
    "condition": "销售额 > 100000"
  }
}

// Round 4: 映射规划
{
  "mappings": [
    {
      "placeholder": "{{产品名称}}",
      "source": "产品信息.产品名称",
      "query": "SELECT 产品名称 FROM 产品信息 WHERE ..."
    },
    {
      "placeholder": "{{销售额}}",
      "source": "销售明细.销售额",
      "query": "SELECT SUM(销售额) FROM 销售明细 WHERE ...",
      "aggregation": "SUM"
    },
    {
      "placeholder": "{{排名}}",
      "source": "computed",
      "query": "RANK() OVER (ORDER BY 销售额 DESC)"
    }
  ]
}

// Round 5-6: 代码生成与验证
{
  "sql_queries": [...],
  "transform_code": "...",
  "optimized": true,
  "estimated_time": "1.2s"
}
```

---

## 📦 核心技术栈

### 基于专业agent的推荐方案

| 层级 | 技术选型 | 提供者 | 优势 |
|------|---------|--------|------|
| **查询引擎** | **AlaSQL** | 后端专家 | 标准SQL、支持JOIN、零依赖 |
| **AI服务** | **智谱GLM-4.6** | 后端专家 | 已集成、性能好、成本低 |
| **文档生成** | **docxtemplater** | 全栈专家 | 95-98%格式保持、10年+验证 |
| **文档备用** | **docx-templates** | 全栈专家 | 保留原方案、降低风险 |
| **缓存** | **三层缓存** | API专家 | 自动选择最优存储 |
| **重试** | **指数退避** | API专家 | 弹性设计、降级策略 |

### 依赖包清单

```json
{
  "dependencies": {
    "alasql": "^4.3.1",              // SQL查询引擎
    "docxtemplater": "^3.45.0",       // 高级文档生成
    "pizzip": "^3.1.7",               // ZIP解压（docxtemplater依赖）
    "@anthropic-ai/sdk": "^0.27.0"    // 智谱AI SDK
  },
  "devDependencies": {
    "@types/pizzip": "^3.0.5"         // TypeScript类型
  }
}
```

---

## 🎯 四大复杂场景解决方案

### 场景1：多Sheet联合查询

**问题**：模板中的`{{姓名}}`、`{{部门}}`从Sheet1取，`{{绩效}}`从Sheet2取

**解决方案**：
```typescript
// 自动检测表间关系
dataSource.detectRelationships();
// 输出: [{from: "Sheet1.姓名", to: "Sheet2.姓名"}]

// 智能字段路由
const result = await engine.query("张三的绩效分数");
// AI生成SQL:
// SELECT t2.绩效
// FROM [Sheet1] AS t1
// JOIN [Sheet2] AS t2 ON t1.姓名 = t2.姓名
// WHERE t1.姓名 = '张三'
```

**涉及模块**：
- `MultiSheetDataSource` - 数据源管理
- `AIQueryParser` - AI解析表间关系
- `SQLGenerator` - 生成JOIN语句

---

### 场景2：复杂聚合查询

**问题**：`{{张三在2023年的总销售额}}` - 需要筛选+聚合

**解决方案**：
```typescript
const result = await engine.query("张三在2023年的总销售额");

// AI分析步骤:
// 1. 意图识别 → 聚合查询 (SUM)
// 2. 实体提取 → 姓名="张三", 年份=2023, 字段="销售额"
// 3. 生成SQL:
//    SELECT SUM(销售额) AS 总销售额
//    FROM [销售明细]
//    WHERE 姓名 = '张三' AND 年份 = 2023
```

**涉及模块**：
- `AIQueryParser` - Few-Shot Learning识别聚合意图
- `QueryHelperFunctions` - 条件解析
- `AlaSQL` - 执行聚合查询

---

### 场景3：单元格多值提取

**问题**：`联系方式 = "电话:021-12345678 邮箱:zhangsan@company.com"` 需要分别提取

**解决方案**：
```typescript
// 内置辅助函数
const phone = extractPhone('电话:021-12345678 邮箱:xxx');
// → '021-12345678'

const email = extractEmail('电话:021-12345678 邮箱:xxx');
// → 'zhangsan@company.com'

// 在SQL中使用
const result = await engine.query(`
  SELECT
    姓名,
    extractPhone(联系方式) AS 电话,
    extractEmail(联系方式) AS 邮箱
  FROM [员工信息]
`);
```

**涉及模块**：
- `QueryHelperFunctions` - 辅助函数库
  - `extractPhone()` - 正则提取电话
  - `extractEmail()` - 正则提取邮箱
  - `multiValueSplit()` - 分割多值
  - `regexExtract()` - 通用正则提取

---

### 场景4：上下文关联查询

**问题**：文档中"该员工所在的部门..." - 需要理解"该员工"指代前面的姓名

**解决方案**：
```typescript
// Round 1: 模板分析 - 识别上下文
{
  "context_analysis": {
    "references": ["该员工", "该产品"],
    "antecedents": ["{{姓名}}", "{{产品名称}}"]
  }
}

// Round 3-4: 语义理解 + 映射规划
{
  "mappings": [
    {
      "placeholder": "{{该员工所在部门}}",
      "resolved_to": "{{姓名}}",
      "query": "SELECT 部门 FROM [员工表] WHERE 姓名 = ?",
      "depends_on": "{{姓名}}"
    }
  ]
}
```

**涉及模块**：
- `AIOrchestrationService` - 多轮上下文管理
- Few-Shot Learning with Context Examples
- 指代消解 (Coreference Resolution)

---

## 📊 docx格式保持方案

### 格式保持率对比

| 方案 | 格式保持率 | 速度 | 复杂度 | 推荐度 |
|------|-----------|------|--------|--------|
| **docx-templates (当前)** | 70-80% | 快 | 低 | ⭐⭐ |
| **docxtemplater (推荐)** | **95-98%** | 中 | 中 | ⭐⭐⭐⭐⭐ |
| python-docx | 98-99% | 快 | 高 | ⭐⭐⭐ |
| OpenXML SDK | 100% | 慢 | 高 | ⭐⭐ |

### 渐进式迁移策略

```typescript
// 用户可选择引擎
interface GenerationConfig {
  engine: 'docx-templates' | 'docxtemplater' | 'auto';
  preserveFormatting: 'basic' | 'advanced' | 'maximum';

  // auto模式自动选择
  // 简单文档 → docx-templates (快)
  // 复杂文档 → docxtemplater (准)
}

const config: GenerationConfig = {
  engine: 'auto',
  preserveFormatting: 'maximum'
};

await generateDocuments(config);
```

**优势**：
- ✅ 降低迁移风险
- ✅ 用户可选择
- ✅ 性能与质量平衡

---

## 🔄 API接口架构

### 核心接口

```typescript
// 统一服务门面
interface IntelligentDocumentService {
  // 创建任务（并行执行Round 1-2）
  createTask(request: CreateTaskRequest): Promise<Task>;

  // 生成映射方案（执行Round 3-6）
  generateMapping(taskId: string): Promise<MappingResult>;

  // 批量生成文档
  generateDocuments(taskId: string, config: GenerationConfig): Promise<GeneratedDocuments>;

  // 查询任务状态
  getTaskStatus(taskId: string): Promise<TaskStatus>;
}
```

### 事件驱动架构

```typescript
// WebSocket推送实时进度
eventBus.subscribe('task.progress', (event) => {
  console.log(`${event.round}: ${event.message}`);
});

// 输出示例:
// [Round 1] 模板分析完成，检测到5个占位符
// [Round 2] 数据分析完成，识别2个Sheet关联
// [Round 3] 语义理解完成，识别为复杂聚合查询
// [Round 4] 映射规划完成，生成3个SQL查询
// [Round 5] 代码生成完成
// [Round 6] 验证完成，预计耗时1.2s
```

---

## ⚡ 性能优化策略

### 1. 三级缓存系统

```typescript
interface CacheStrategy {
  level1: 'memory';          // 内存缓存（最快，5分钟）
  level2: 'indexedDB';       // 浏览器存储（中等，持久化）
  level3: 'remote';          // 远程缓存（慢，可共享）
}
```

**缓存内容**：
- AI解析结果（相同指令不重复调用）
- SQL查询结果（相同查询直接返回）
- 生成的映射方案

### 2. AI调用优化

```typescript
// 分级AI介入策略
interface AIStrategy {
  // Level 1: 规则引擎（80%场景）
  ruleBased: {
    patterns: ['简单映射', '标准筛选'],
    noAICall: true
  },

  // Level 2: Few-Shot（15%场景）
  fewShot: {
    examples: ['标准聚合查询', '常见多值提取'],
    oneShotCall: true
  },

  // Level 3: Chain-of-Thought（5%场景）
  deepReasoning: {
    multiStep: true,
    requiresValidation: true
  }
}
```

**目标**：AI调用率 < 30%

### 3. 批量处理优化

```typescript
// 并发控制
await batchGenerate({
  documents: [...],
  concurrency: 3,    // 同时生成3个文档
  batchSize: 10      // 分批处理
});

// 预计性能
// 100个文档：docx-templates 5秒 → docxtemplater 8秒
```

---

## 🎯 实施路线图

### Phase 1: 基础架构（2-3周）

**目标**：搭建核心架构，支持简单场景

- [ ] 安装依赖（AlaSQL、docxtemplater）
- [ ] 实现`MultiSheetDataSource`
- [ ] 实现`DataQueryEngine`基础版
- [ ] 实现`AIOrchestrationService`框架
- [ ] 迁移到docxtemplater（保留docx-templates备选）

**交付物**：
- ✅ 支持简单1对1映射
- ✅ 支持基础筛选条件
- ✅ 格式保持率提升到90%+

---

### Phase 2: AI增强（3-4周）

**目标**：实现智能语义理解和复杂查询

- [ ] 实现`AIQueryParser`完整版
- [ ] Few-Shot Learning示例库
- [ ] 实现复杂聚合查询
- [ ] 实现多Sheet联合查询
- [ ] 实现辅助函数库

**交付物**：
- ✅ 支持复杂聚合查询（场景2）
- ✅ 支持多Sheet联合（场景1）
- ✅ AI调用准确率 > 90%

---

### Phase 3: 高级功能（3-4周）

**目标**：支持上下文关联和复杂场景

- [ ] 实现上下文理解
- [ ] 指代消解 (Coreference Resolution)
- [ ] 实现单元格多值提取（场景3）
- [ ] 实现跨列关联查询（场景4）
- [ ] 优化Few-Shot Prompt

**交付物**：
- ✅ 支持上下文关联（场景4）
- ✅ 支持多值提取（场景3）
- ✅ 覆盖90%+常见场景

---

### Phase 4: 优化与集成（2-3周）

**目标**：性能优化和用户体验提升

- [ ] 实现三级缓存系统
- [ ] 实现重试和降级策略
- [ ] 添加SQL预览功能
- [ ] 添加性能监控
- [ ] 完整集成测试

**交付物**：
- ✅ 响应时间 < 2秒（万行数据）
- ✅ AI调用率 < 30%
- ✅ 格式保持率 95-98%

---

**总工期：10-14周（2.5-3.5个月）**

---

## ⚠️ 风险与缓解

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| **AI幻觉（SQL错误）** | 功能失败 | 中 | 1. SQL验证和沙箱执行<br>2. 用户确认机制<br>3. 降级到规则引擎 |
| **性能问题** | 体验差 | 中 | 1. 三级缓存<br>2. AI调用分级<br>3. 并发控制 |
| **复杂查询失败** | 功能受限 | 低 | 1. 提供手动配置模式<br>2. 逐步降级策略<br>3. 错误友好提示 |
| **docxtemplater兼容性** | 迁移困难 | 低 | 1. 保留docx-templates备选<br>2. 渐进式迁移<br>3. 完整测试 |
| **AlaSQL限制（大数据）** | 性能瓶颈 | 低 | 1. 数据量阈值警告<br>2. 分页查询<br>3. 未来可升级到SQLite |

---

## 📚 参考文档

### 专业Agent详细方案

1. **[复杂查询引擎方案]** `docs/architecture/advanced-data-query-engine-design.md`
   - 后端开发专家提供
   - AlaSQL技术选型分析
   - 四大场景详细解决方案

2. **[docx格式保持方案]** `docs/word-format-preservation-solution.md`
   - 全栈开发专家提供
   - docxtemplater迁移指南
   - 格式保持率对比和测试

3. **[API架构设计]** `API_SPECIFICATION.md`
   - API架构专家提供
   - 六轮AI交互流程
   - RESTful API规范

### 技术文档

- **AlaSQL官方文档**: https://github.com/AlaSQL/alasql
- **docxtemplater官方文档**: https://docxtemplater.com/
- **智谱AI文档**: https://open.bigmodel.cn/

---

## 🎯 核心建议

### 给产品决策

1. **优先级排序**：
   - P0（必须）：多Sheet查询、格式保持升级
   - P1（重要）：复杂聚合、多值提取
   - P2（可选）：上下文关联

2. **MVP范围**：
   - Phase 1-2（5-7周）
   - 覆盖80%常见场景
   - 格式保持率90%+

3. **技术风险**：
   - 低风险：docxtemplater迁移
   - 中风险：AI准确率
   - 需要充分测试

### 给技术团队

1. **架构优先**：不要急于实现代码，先理清架构
2. **分阶段交付**：每个Phase都有可演示的成果
3. **测试驱动**：每个模块都有完整的单元测试
4. **文档先行**：API文档、实施指南、测试用例

---

## 📞 后续行动

### 立即启动

1. **技术评审会议**：讨论并确认技术栈
2. **组建开发团队**：2-3名开发工程师
3. **搭建开发环境**：依赖安装、代码仓库

### 本周完成

4. **详细设计文档**：各模块的详细设计
5. **接口定义**：API接口的TypeScript定义
6. **测试环境**：测试用例和测试数据

### 下周启动

7. **Phase 1开发**：基础架构实现
8. **每周进度同步**：确保按计划推进

---

**文档状态**: ✅ 完成
**版本**: v1.0
**最后更新**: 2025-12-28
**主控智能体**: Claude Code (Anthropic)
