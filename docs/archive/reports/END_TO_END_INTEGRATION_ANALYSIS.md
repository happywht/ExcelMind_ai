# ExcelMind AI 端到端集成架构分析报告

## 📋 文档信息

- **版本**: 1.0.0
- **日期**: 2026-01-24
- **作者**: 全栈架构师
- **基于**: 高级顾问交流记录 (guanyu2.txt)
- **状态**: 深度分析完成

---

## 🎯 执行摘要

本报告基于与高级顾问的深度交流记录，从**端到端集成**角度全面分析 ExcelMind AI 的第二阶段优化方案。核心围绕 **Wasm 沙箱 + AI 编排 + 多文档协同** 的技术架构，提供完整的用户体验设计方案。

### 核心发现

1. **技术架构优势**: 采用 WebAssembly (Pyodide) 实现浏览器本地数据处理，确保审计数据的隐私安全
2. **智能化程度**: 通过多轮 AI 交互和自愈机制，实现从"机械工具"到"智能助手"的跃升
3. **业务价值**: 覆盖审计工作流 80% 的场景，包括多文件匹配、内控评价、报告生成
4. **实施风险**: Wasm 内存限制、大文档处理、AI 幻觉等需要技术预案

---

## 📐 一、完整工作流设计

### 1.1 四阶段执行模型

基于顾问的建议，我们设计了一个清晰的四阶段流水线：

```
┌─────────────────────────────────────────────────────────────────┐
│                    ExcelMind AI 执行流程                          │
└─────────────────────────────────────────────────────────────────┘

阶段 1: 侦察 (Reconnaissance)
   ├─ Excel 侦察兵: 提取表头、数据类型、样本 (前3行)
   ├─ Word 侦察兵: 识别占位符、表格结构、章节划分
   ├─ 规则提取器: 从制度文档中提取内控红线
   └─ 产出: 结构化元数据 JSON

阶段 2: 过滤 (Filtering)
   ├─ 预审引擎: 根据规则筛选异常数据
   ├─ 数据浓缩: 从海量数据中提取"嫌疑点"
   ├─ 降维处理: 只将异常摘要喂给 AI (节省 Token)
   └─ 产出: 浓缩异常 JSON (典型 50-200 条)

阶段 3: 分析 (Analysis)
   ├─ 三维校验: 规则 vs 证据 vs 陈述
   ├─ AI 推理: Gemini 1.5 Pro 深度分析
   ├─ 风险评分: f × ∑E (频率 × 影响金额)
   └─ 产出: 审计发现 + 风险评级

阶段 4: 填充 (Filling)
   ├─ 跨文档填充: DataFrame → Word 表格
   ├─ 格式保持: Run 级别样式克隆
   ├─ 证据溯源: 批注添加 Excel 坐标
   └─ 产出: 最终审计报告 (.docx)
```

### 1.2 多文件协同处理流程

**场景**: 银行对账 (凭证.xlsx + 流水.xlsx)

```javascript
// 用户上传 → 虚拟文件系统挂载
async function prepareAuditEnvironment(files) {
  await pyodide.FS.mkdirTree("/mnt");

  const fileMetadata = [];
  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const path = `/mnt/${file.name}`;
    pyodide.FS.writeFile(path, data);
    fileMetadata.push(path);
  }

  // 统一命名规范
  // /mnt/source_A.xlsx (原始账套)
  // /mnt/source_B.xlsx (银行流水)
  // /mnt/mapping_config.json (可选)

  return fileMetadata;
}
```

**数据流示意图**:

```
用户上传 Excel A + Excel B
        ↓
[侦察阶段] 并行提取 Schema
   ├─ A.xlsx: [凭证号, 日期, 借方, 摘要]
   └─ B.xlsx: [流水号, 时间, 支出, 备注]
        ↓
[分析阶段] AI 生成匹配代码
   "通过'日期'和'金额'模糊匹配，容差±2天"
        ↓
[执行阶段] Wasm 运行 Python 代码
   for 凭证 in A:
     for 流水 in B:
       if abs(日期差) <= 2 and 金额相等:
         标记为"已对勾"
        ↓
[输出阶段] 分类结果
   ├─ 已对勾: 双方都有
   ├─ 银有企无: 异常支出
   └─ 企有银无: 未达账项
```

### 1.3 AI 闭环执行流程 (OTAE Cycle)

基于现有的 `AgenticOrchestrator.ts`，增强为完整的 OTAE 循环：

```typescript
// 增强版 OTAE 循环 (包含顾问建议的自愈机制)
class EnhancedAuditWorkflow {
  async executeTask(userPrompt: string, dataFiles: DataFileInfo[]) {
    // Observe (观察)
    const observation = await this.observeWithScout(dataFiles);

    // Think (思考)
    const thinking = await this.thinkWithAI(observation);

    // Act (执行) - 包含自愈逻辑
    let actionResult = await this.actWithCodeGeneration(thinking.plan);

    if (!actionResult.success) {
      // 自愈循环 (最多3次)
      for (let i = 0; i < 3; i++) {
        const repairResult = await this.handleSelfCorrection(
          actionResult.error,
          actionResult.generatedCode,
          observation
        );

        if (repairResult.success) {
          actionResult = await this.retryAct(repairResult.correctedCode);
          break;
        }
      }
    }

    // Evaluate (评估)
    const evaluation = await this.evaluateQuality(actionResult);

    // 三维校验 (内控评价模式)
    if (this.mode === 'internal_control') {
      await this.performTripleValidation(
        observation.rules,      // 规则文档
        observation.evidence,   // Excel 数据
        observation.report      // 报告草稿
      );
    }

    return this.generateFinalResult(actionResult, evaluation);
  }
}
```

### 1.4 用户交互全流程

**典型审计场景** (完整用户体验):

```
┌─────────────────────────────────────────────────────────────┐
│  ExcelMind AI - 审计工作台                                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [步骤 1] 上传材料                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ 银行流水.xlsx │  │ 凭证账.xlsx   │  │ 报告模板.docx │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  [步骤 2] AI 自动侦察                                          │
│  ✓ 已识别 2 个 Excel 文件                                     │
│  ✓ 已提取 15 个表头                                           │
│  ✓ 已发现 3 个潜在占位符                                       │
│                                                              │
│  [步骤 3] 智能建议                                            │
│  💡 AI: "检测到这两份文件可能是银行对账数据，是否需要自动对账？" │
│  [是，开始对账] [手动配置规则]                                  │
│                                                              │
│  [步骤 4] 实时进度                                            │
│  🔍 正在核对差异... (45%)                                     │
│  ├─ 已扫描 1,234 条记录                                        │
│  ├─ 发现 12 笔异常                                            │
│  └─ 预计剩余 30 秒                                            │
│                                                              │
│  [步骤 5] 结果预览                                            │
│  ┌────────────────────────────────────────────────┐         │
│  │ 对账结果                                          │         │
│  ├────────────────────────────────────────────────┤         │
│  │ ✅ 已对勾: 1,200 笔                              │         │
│  │ ⚠️  银有企无: 8 笔 (需核查)                       │         │
│  | ❌ 企有银无: 5 笔 (未达账项)                       │         │
│  └────────────────────────────────────────────────┘         │
│                                                              │
│  [步骤 6] 一键生成报告                                        │
│  [生成 Word 报告] [导出 Excel 差异表] [保存映射方案]          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 二、数据流设计

### 2.1 前端 → Wasm → AI → Wasm → 前端

完整的数据流转闭环：

```
┌──────────────┐
│   前端 UI    │
│  (React)     │
└──────┬───────┘
       │ 1. 上传文件
       ▼
┌─────────────────────────────────────────────────────────┐
│          虚拟文件系统 (Pyodide FS)                        │
│  /mnt/source_A.xlsx  (原始数据)                          │
│  /mnt/source_B.xlsx  (银行流水)                          │
│  /mnt/template.docx  (报告模板)                          │
└──────┬──────────────────────────────────────────────────┘
       │ 2. 侦察脚本提取元数据
       ▼
┌─────────────────────────────────────────────────────────┐
│           元数据 JSON (Schema)                           │
│  [{                                                      │
│    "filename": "流水.xlsx",                              │
│    "sheets": [{                                          │
│      "name": "Sheet1",                                   │
│      "columns": ["日期", "金额(元)", "对方户名"],         │
│      "sample": {"金额(元)": "1,200.00"}                  │
│    }]                                                    │
│  }]                                                      │
└──────┬──────────────────────────────────────────────────┘
       │ 3. 发送给 AI (Gemini API)
       ▼
┌─────────────────────────────────────────────────────────┐
│           AI 分析 + 代码生成                              │
│  Input: 元数据 + 用户指令                                 │
│  Process: 理解语义 → 生成匹配逻辑 → 编写 Python 代码       │
│  Output:                                                  │
│    {                                                     │
│      "analysis": "需要通过日期和金额模糊匹配",             │
│      "code": "import pandas as pd\n..."                 │
│    }                                                     │
└──────┬──────────────────────────────────────────────────┘
       │ 4. 在 Wasm 中执行代码
       ▼
┌─────────────────────────────────────────────────────────┐
│           Python 代码执行 (Pyodide)                       │
│  - 数据清洗: 去逗号、转类型                               │
│  - 模糊匹配: 日期容差±2天                                 │
│  - 结果分类: 已对勾 / 异常 / 未达                         │
│  Output: /mnt/output.json                                │
└──────┬──────────────────────────────────────────────────┘
       │ 5. 读取结果并填充 Word
       ▼
┌─────────────────────────────────────────────────────────┐
│           Word 文档填充 (python-docx)                     │
│  - 读取模板: /mnt/template.docx                          │
│  - 填充数据: output.json → 表格                          │
│  - 保持格式: Run 级样式克隆                               │
│  - 添加批注: 证据溯源                                     │
│  Output: /mnt/Final_Report.docx                          │
└──────┬──────────────────────────────────────────────────┘
       │ 6. 返回给用户
       ▼
┌──────────────┐
│   前端下载    │
│  Final_Report │
└──────────────┘
```

### 2.2 虚拟文件系统管理

**目录结构设计**:

```python
/mnt/
├── inputs/              # 用户上传的原始文件
│   ├── source_a.xlsx   # 凭证账
│   ├── source_b.xlsx   # 银行流水
│   └── rules.docx      # 内控制度
│
├── processed/           # 中间处理结果
│   ├── cleaned_a.csv   # 清洗后的数据
│   ├── cleaned_b.csv
│   └── merged.json     # 合并后的数据
│
├── analysis/            # 分析结果
│   ├── exceptions.json # 异常数据摘要
│   └── audit_report.json
│
├── templates/           # 文档模板
│   └── report_template.docx
│
└── outputs/             # 最终输出
    ├── final_report.docx
    └── evidence.xlsx
```

**文件挂载实现**:

```javascript
// 前端文件挂载服务
class VirtualFileSystemManager {
  constructor(pyodide) {
    this.pyodide = pyodide;
    this.mountedFiles = new Map();
  }

  async mountFile(file, targetPath) {
    // 1. 转换为 Uint8Array
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);

    // 2. 写入虚拟文件系统
    this.pyodide.FS.writeFile(targetPath, data);

    // 3. 记录元数据
    this.mountedFiles.set(targetPath, {
      name: file.name,
      size: file.size,
      type: file.type,
      mountedAt: Date.now()
    });

    return targetPath;
  }

  async mountMultipleFiles(files, baseDir = '/mnt/inputs') {
    // 确保目录存在
    this.pyodide.FS.mkdirTree(baseDir);

    const paths = [];
    for (const file of files) {
      const path = `${baseDir}/${this.sanitizeFilename(file.name)}`;
      await this.mountFile(file, path);
      paths.push(path);
    }

    return paths;
  }

  readFile(sourcePath) {
    return this.pyodide.FS.readFile(sourcePath);
  }

  downloadFile(sourcePath, filename) {
    const data = this.readFile(sourcePath);
    const blob = new Blob([data], {
      type: this.getMimeType(filename)
    });
    const url = URL.createObjectURL(blob);

    // 触发下载
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
  }

  sanitizeFilename(name) {
    return name.replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  getMimeType(filename) {
    const ext = filename.split('.').pop();
    const mimeTypes = {
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'csv': 'text/csv',
      'json': 'application/json'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }
}
```

### 2.3 中间数据总线 (JSON)

**标准化的中间数据格式**:

```typescript
// 侦察结果元数据
interface ScoutMetadata {
  timestamp: number;
  files: FileMetadata[];
  session_id: string;
}

interface FileMetadata {
  filename: string;
  path: string;
  type: 'excel' | 'word' | 'pdf';
  size: number;

  // Excel 特有
  sheets?: SheetMetadata[];

  // Word 特有
  placeholders?: Placeholder[];
  tables?: TableMetadata[];
}

interface SheetMetadata {
  name: string;
  columns: ColumnMetadata[];
  sampleRows: Record<string, any>[];
  rowCount: number;
}

interface ColumnMetadata {
  name: string;
  dataType: 'string' | 'number' | 'date' | 'boolean';
  nullable: boolean;
  sampleValue: any;
  semanticHints?: string[]; // AI 推断的语义
}

// 异常数据摘要 (浓缩后)
interface ExceptionSummary {
  rule_id: string;
  rule_description: string;
  violations: ViolationRecord[];
  total_violations: number;
  total_amount: number;
  risk_score: number;
}

interface ViolationRecord {
  row_index: number;      // Excel 行号
  source_file: string;    // 来源文件
  source_sheet: string;   // 来源 Sheet
  data: Record<string, any>;  // 违规数据
  violated_fields: string[];  // 违规字段
}
```

**数据流转示例**:

```json
// 阶段 1: 侦察输出
{
  "stage": "scout",
  "output": {
    "files": [
      {
        "filename": "银行流水.xlsx",
        "sheets": [{
          "name": "2025年1月",
          "columns": [
            {"name": "交易日期", "dataType": "date", "sampleValue": "2025-01-15"},
            {"name": "交易金额", "dataType": "string", "sampleValue": "1,200.00"}  // 注意: 字符串!
          ]
        }]
      }
    ]
  }
}

// 阶段 2: 过滤输出 (浓缩)
{
  "stage": "filter",
  "output": {
    "exceptions": [
      {
        "rule_id": "RULE_001",
        "rule_description": "单笔超过5000元需经理审批",
        "violations": [
          {
            "row_index": 145,
            "source_file": "银行流水.xlsx",
            "data": {"交易日期": "2025-01-15", "交易金额": "8,900.00", "审批人": ""},
            "violated_fields": ["审批人"]
          }
        ],
        "total_violations": 12,
        "risk_score": 0.85
      }
    ]
  }
}

// 阶段 3: 分析输出
{
  "stage": "analysis",
  "output": {
    "findings": [
      {
        "category": "内控缺陷",
        "severity": "高",
        "description": "存在大额报销未经经理审批",
        "evidence": [
          {"file": "银行流水.xlsx", "rows": [145, 167, 189]},
          {"amount": "总计 45,600 元"}
        ],
        "recommendation": "建议在报告'重大事项'部分披露"
      }
    ]
  }
}

// 阶段 4: 填充输出
{
  "stage": "filling",
  "output": {
    "generated_documents": [
      {
        "filename": "审计报告.docx",
        "path": "/mnt/outputs/final_report.docx",
        "size": 24568,
        "download_url": "blob:..."
      }
    ]
  }
}
```

### 2.4 结果返回和下载

**用户体验优化**:

```typescript
class ResultDeliveryService {
  constructor(private vfs: VirtualFileSystemManager) {}

  async generateDownloadPackage(taskResult: TaskResult) {
    // 1. 准备下载包
    const package = {
      documents: [] as DownloadableItem[],
      metadata: this.generateMetadata(taskResult),
      summary: this.generateSummary(taskResult)
    };

    // 2. 主文档
    if (taskResult.data?.final_report) {
      package.documents.push({
        name: '审计报告.docx',
        blob: await this.vfs.readFileAsBlob('/mnt/outputs/final_report.docx'),
        icon: '📄',
        description: '完整的审计报告'
      });
    }

    // 3. 附件
    if (taskResult.data?.evidence_excel) {
      package.documents.push({
        name: '差异明细.xlsx',
        blob: await this.vfs.readFileAsBlob('/mnt/outputs/evidence.xlsx'),
        icon: '📊',
        description: '详细的差异分析数据'
      });
    }

    // 4. 审计轨迹
    package.documents.push({
      name: '审计轨迹.json',
      blob: new Blob([JSON.stringify(taskResult.logs, null, 2)], {
        type: 'application/json'
      }),
      icon: '📝',
      description: '完整的处理日志和证据链'
    });

    return package;
  }

  showDownloadModal(package: DownloadPackage) {
    // 显示精美的下载弹窗
    return `
      <div class="download-modal">
        <h2>✅ 审计任务完成</h2>

        <div class="summary">
          <p>发现 ${package.summary.exceptions_count} 处异常</p>
          <p>风险评分: ${package.summary.risk_score}</p>
        </div>

        <div class="documents">
          ${package.documents.map(doc => `
            <div class="doc-item">
              <span class="icon">${doc.icon}</span>
              <span class="name">${doc.name}</span>
              <span class="desc">${doc.description}</span>
              <button onclick="download('${doc.name}')">⬇️ 下载</button>
            </div>
          `).join('')}
        </div>

        <div class="actions">
          <button onclick="downloadAll()">📦 打包下载全部</button>
          <button onclick="viewReport()">👁️ 预览报告</button>
        </div>
      </div>
    `;
  }

  async downloadAll(package: DownloadPackage) {
    // 使用 JSZip 打包
    const JSZip = await import('jszip');
    const zip = new JSZip();

    for (const doc of package.documents) {
      zip.file(doc.name, doc.blob);
    }

    // 添加元数据
    zip.file('任务信息.json', JSON.stringify(package.metadata, null, 2));

    // 生成 ZIP
    const blob = await zip.generateAsync({ type: 'blob' });

    // 触发下载
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `审计报告_${Date.now()}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
```

---

## 🏗️ 三、集成架构

### 3.1 前端 + Pyodide + Gemini

**完整的系统架构图**:

```
┌─────────────────────────────────────────────────────────────────┐
│                         表现层 (UI Layer)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Excel 工作台 │  │  文档空间    │  │  审计助手    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└────────────────────────────┬────────────────────────────────────┘
                             │ REST API
┌────────────────────────────▼────────────────────────────────────┐
│                         API 网关层                               │
│  - 认证授权 (JWT)                                               │
│  - 速率限制 (Token Bucket)                                      │
│  - 请求日志 (Request Tracing)                                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                       服务编排层 (Orchestration)                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           AuditWorkflowManager (总控制器)                 │  │
│  │  - 管理四阶段流水线                                        │  │
│  │  - 协调各子服务                                            │  │
│  │  - 处理用户干预                                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Excel 侦察兵  │  │  过滤引擎     │  │  填充器       │          │
│  │ (Scout Excel) │  │ (Pre-Filter) │  │ (Fill Word)   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐                             │
│  │  AI 编排器    │  │  自愈引擎     │                             │
│  │ (Orchestrator)│  │ (Self-Heal)  │                             │
│  └──────────────┘  └──────────────┘                             │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                       执行沙箱层 (Sandbox)                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Pyodide Wasm Runtime                   │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐         │  │
│  │  │   pandas   │  │ python-docx│  │  openpyxl  │         │  │
│  │  └────────────┘  └────────────┘  └────────────┘         │  │
│  │                                                          │  │
│  │  /mnt/ 虚拟文件系统                                      │  │
│  │  ├─ inputs/     (原始文件)                              │  │
│  │  ├─ processed/  (中间结果)                              │  │
│  │  └─ outputs/    (最终输出)                              │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                       智能层 (Intelligence)                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Gemini 1.5 Pro API (智谱 AI)                 │  │
│  │  - 多轮对话管理                                           │  │
│  │  - 代码生成                                               │  │
│  │  - 语义理解                                               │  │
│  │  - 推理分析                                               │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 模块间通信机制

**事件驱动架构**:

```typescript
// 事件总线 (基于现有 services/infrastructure/eventBus.ts)
interface AuditEvents {
  // 文件事件
  'file:uploaded': { file: File; path: string };
  'file:scout:completed': ScoutMetadata;
  'file:scout:failed': { error: Error };

  // 任务事件
  'task:created': { taskId: string };
  'task:started': { taskId: string };
  'task:progress': { taskId: string; progress: number; stage: string };
  'task:completed': { taskId: string; result: TaskResult };
  'task:failed': { taskId: string; error: Error };

  // AI 事件
  'ai:request:sent': { round: string; prompt: string };
  'ai:response:received': { round: string; response: any };
  'ai:code:generated': { code: string; explanation: string };
  'ai:error:occurred': { error: Error; retryAttempt: number };

  // 执行事件
  'execution:started': { code: string };
  'execution:completed': { output: any };
  'execution:error:occurred': { error: Error; traceback: string };

  // 自愈事件
  'self_heal:triggered': { error: Error; strategy: string };
  'self_heal:success': { attempt: number };
  'self_heal:failed': { attempt: number; maxAttempts: number };
}

// 使用示例
class AuditWorkflowManager {
  constructor(private eventBus: EventBus<AuditEvents>) {}

  async executeTask(userPrompt: string, dataFiles: DataFileInfo[]) {
    const taskId = this.generateId();

    // 发布任务创建事件
    this.eventBus.emit('task:created', { taskId });

    try {
      // 侦察阶段
      this.eventBus.emit('task:progress', {
        taskId,
        progress: 10,
        stage: 'scouting'
      });

      const scoutResult = await this.scoutFiles(dataFiles);
      this.eventBus.emit('file:scout:completed', scoutResult);

      // AI 分析阶段
      this.eventBus.emit('ai:request:sent', {
        round: 'analysis',
        prompt: userPrompt
      });

      const aiResponse = await this.callAI(scoutResult);
      this.eventBus.emit('ai:response:received', {
        round: 'analysis',
        response: aiResponse
      });

      // 执行阶段
      const result = await this.executeCode(aiResponse.code);
      this.eventBus.emit('execution:completed', { output: result });

      // 完成
      this.eventBus.emit('task:completed', { taskId, result });

    } catch (error) {
      this.eventBus.emit('task:failed', { taskId, error });
      throw error;
    }
  }
}
```

### 3.3 错误传递和自愈

**完整的错误处理链**:

```typescript
// 错误分类和处理策略
enum ErrorCategory {
  // 用户输入错误
  VALIDATION_ERROR = 'validation_error',
  INVALID_INPUT = 'invalid_input',

  // 数据处理错误
  DATA_PARSING_ERROR = 'data_parsing_error',
  DATA_TRANSFORMATION_ERROR = 'data_transformation_error',
  COLUMN_NOT_FOUND = 'column_not_found',
  DATA_ERROR = 'data_error',

  // AI 服务错误
  AI_SERVICE_ERROR = 'ai_service_error',
  AI_TIMEOUT = 'ai_timeout',
  AI_RATE_LIMIT = 'ai_rate_limit',

  // 代码执行错误
  CODE_EXECUTION_ERROR = 'code_execution_error',
  CODE_SYNTAX_ERROR = 'code_syntax_error',
  RUNTIME_ERROR = 'runtime_error',

  // 系统错误
  NETWORK_ERROR = 'network_error',
  STORAGE_ERROR = 'storage_error',
  TIMEOUT_ERROR = 'timeout_error',
  UNKNOWN_ERROR = 'unknown_error'
}

// 自愈处理器
class SelfHealingEngine {
  async handleSelfCorrection(
    error: TaskError,
    failedCode: string,
    originalContext: ScoutMetadata
  ): Promise<RepairResult> {
    const MAX_RETRIES = 3;

    // 1. 分析错误
    const errorAnalysis = await this.analyzeError(error);

    // 2. 选择修复策略
    const strategies = this.selectRepairStrategies(errorAnalysis);

    // 3. 尝试修复
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      for (const strategy of strategies) {
        try {
          this.log('info', `尝试修复策略: ${strategy.type}`, { attempt });

          const result = await this.applyStrategy(
            strategy,
            error,
            failedCode,
            originalContext
          );

          if (result.success) {
            return {
              success: true,
              appliedStrategy: strategy,
              result: result.output,
              attemptNumber: attempt + 1,
              maxAttempts: MAX_RETRIES,
              canContinue: true
            };
          }
        } catch (repairError) {
          this.log('warn', `修复策略失败: ${strategy.type}`, { error: repairError });
        }
      }
    }

    // 所有策略都失败
    return {
      success: false,
      appliedStrategy: strategies[0],
      remainingErrors: [error],
      attemptNumber: MAX_RETRIES,
      maxAttempts: MAX_RETRIES,
      canContinue: false
    };
  }

  private async applyStrategy(
    strategy: RepairStrategy,
    error: TaskError,
    failedCode: string,
    context: ScoutMetadata
  ) {
    switch (strategy.type) {
      case 'code_fix':
        // 让 AI 分析错误并修复代码
        return await this.fixCodeWithAI(error, failedCode, context);

      case 'simple_approach':
        // 使用简化的处理方式
        return await this.useSimplifiedProcessing(error, context);

      case 'data_cleaning':
        // 清洗数据后重试
        return await this.cleanDataAndRetry(error, context);

      case 'retry':
        // 简单重试
        return await this.retryWithNewContext(context);

      default:
        throw new Error(`未知的修复策略: ${strategy.type}`);
    }
  }

  private async fixCodeWithAI(
    error: TaskError,
    failedCode: string,
    context: ScoutMetadata
  ) {
    // 构建修复提示词
    const repairPrompt = `
你编写的 Python 代码在 Pyodide 沙箱中运行失败了。

【原始任务】：
${context.userPrompt}

【文件元数据】：
${JSON.stringify(context, null, 2)}

【失败的代码】：
\`\`\`python
${failedCode}
\`\`\`

【错误堆栈 (Traceback)】：
${error.message}

【修复指令】：
1. 仔细分析错误原因（例如：列名不存在、数据类型不匹配、语法错误）
2. 结合文件元数据，修正代码中的逻辑
3. 在代码末尾添加 assert 语句验证结果
4. 请只输出修正后的【完整代码块】，不要包含任何解释
    `;

    // 调用 AI 生成修复后的代码
    const response = await this.callAI(repairPrompt);

    // 执行修复后的代码
    return await this.executeCode(response.code);
  }
}
```

### 3.4 状态同步

**前端状态管理** (使用 Zustand 或 Recoil):

```typescript
// 审计任务状态管理
interface AuditTaskState {
  // 当前任务
  currentTask: MultiStepTask | null;

  // 文件列表
  files: DataFileInfo[];

  // 执行阶段
  stage: 'idle' | 'scouting' | 'filtering' | 'analyzing' | 'filling' | 'completed' | 'failed';

  // 进度
  progress: {
    percentage: number;
    message: string;
    estimatedTimeRemaining?: number;
  };

  // 结果
  result: {
    output?: any;
    logs?: string[];
    errors?: Error[];
    downloadUrl?: string;
  };

  // UI 状态
  ui: {
    showPreview: boolean;
    showLogs: boolean;
    selectedErrorIndex?: number;
  };
}

// 使用示例
const useAuditTaskStore = create<AuditTaskState>((set) => ({
  currentTask: null,
  files: [],
  stage: 'idle',
  progress: {
    percentage: 0,
    message: '准备就绪'
  },
  result: {},
  ui: {
    showPreview: false,
    showLogs: false
  }
}));

// React 组件中使用
function AuditWorkflowComponent() {
  const { stage, progress, result } = useAuditTaskStore();

  return (
    <div className="audit-workflow">
      {/* 进度条 */}
      <ProgressBar
        percentage={progress.percentage}
        message={progress.message}
      />

      {/* 实时日志 */}
      <LogViewer logs={result.logs || []} />

      {/* 结果预览 */}
      {stage === 'completed' && (
        <ResultPreview result={result} />
      )}
    </div>
  );
}
```

---

## 🎯 四、关键场景实现

### 4.1 银行对账场景

**完整实现**:

```typescript
class BankReconciliationService {
  async executeReconciliation(
    voucherFile: File,
    bankStatementFile: File
  ): Promise<ReconciliationResult> {

    // 1. 挂载文件到虚拟文件系统
    const vfs = new VirtualFileSystemManager(pyodide);
    const [voucherPath, bankPath] = await vfs.mountMultipleFiles([
      voucherFile,
      bankStatementFile
    ], '/mnt/inputs');

    // 2. 侦察阶段：提取元数据
    const scoutService = new ExcelScoutService(pyodide);
    const [voucherMeta, bankMeta] = await Promise.all([
      scoutService.scout(voucherPath),
      scoutService.scout(bankPath)
    ]);

    // 3. 构建 AI 提示词
    const prompt = this.buildReconciliationPrompt({
      voucher: voucherMeta,
      bank: bankMeta,
      requirement: '找出两边金额相等且日期接近（误差±2天）的记录'
    });

    // 4. AI 生成匹配代码
    const aiResponse = await this.callGemini(prompt);

    // 5. 执行匹配代码（包含自愈）
    let result = await this.executeWithSelfHeal(aiResponse.code, {
      voucherPath,
      bankPath
    });

    // 6. 结果分类
    const classified = await this.classifyResults(result);

    // 7. 生成报告
    const report = await this.generateReconciliationReport(classified);

    return {
      matched: classified.matched,
      bankOnly: classified.bankOnly,
      voucherOnly: classified.voucherOnly,
      reportPath: report.path,
      summary: this.generateSummary(classified)
    };
  }

  private buildReconciliationPrompt(metadata: any): string {
    return `
# 角色
你是一位严谨的资深审计经理。你现在的任务是使用 Python (Pandas) 在 Wasm 沙箱中完成银行流水与企业序时账的自动化勾稽。

# 任务需求
请对比以下两个文件，找出两边金额相等且日期接近（误差 ±2 天内）的记录。

# 文件元数据
${JSON.stringify(metadata, null, 2)}

# 核心执行逻辑

1. **数据标准化**：
   - 将两表的日期列转换为 datetime 格式
   - 清理金额列：处理字符串中的逗号（,）、空格，并将"银行表"的负号金额转为绝对值
   - 确保两表金额类型一致

2. **模糊匹配算法**：
   - 不要使用简单的 merge
   - 请遍历"序时账"的每一笔借方金额，在"银行流水"中寻找金额完全一致，且 abs(日期A - 日期B) <= 2天 的记录

3. **结果分类**：
   - 已对勾：两边都能找到匹配
   - 银行有账企业无账：银行流水里有，但序时账没找到
   - 企业有账银行无账：序时账里有，但银行流水没找到

4. **输出要求**：
   - 最终结果保存为 JSON，包含三个分类
   - 每条记录包含：来源文件、日期、金额、匹配状态

# 防错断言 (Python Assert)
- assert 结果表的总行数不能超过两表原始行数之和
- assert 匹配成功的总金额不能超过任意一张表的总支出

# 输出代码
请直接输出 Python 代码，不要解释，确保包含 try...except 捕获异常。
    `;
  }

  private async classifyResults(rawResult: any) {
    // 将原始执行结果分类
    const matched = [];
    const bankOnly = [];
    const voucherOnly = [];

    for (const record of rawResult) {
      if (record.matched) {
        matched.push(record);
      } else if (record.source === 'bank') {
        bankOnly.push(record);
      } else {
        voucherOnly.push(record);
      }
    }

    return { matched, bankOnly, voucherOnly };
  }

  private async generateReconciliationReport(classified: any) {
    // 使用 python-docx 生成报告
    const reportCode = `
from docx import Document
from docx.shared import Pt, RGBColor
import json

# 读取分类结果
with open('/mnt/processed/result.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# 创建文档
doc = Document()

# 标题
title = doc.add_heading('银行对账报告', 0)

# 摘要
summary = doc.add_paragraph()
summary.add_run(f'对账日期: {data.date}').bold = True
summary.add_run(f'\\n已对勾: {len(data.matched)} 笔')
summary.add_run(f'\\n银行有账企业无账: {len(data.bankOnly)} 笔')
summary.add_run(f'\\n企业有账银行无账: {len(data.voucherOnly)} 笔')

# 详细表格
if data.bankOnly:
    doc.add_heading('银行有账企业无账明细', 1)
    table = doc.add_table(rows=1, cols=4)
    table.style = 'Light Grid Accent 1'

    # 表头
    headers = table.rows[0].cells
    headers[0].text = '日期'
    headers[1].text = '金额'
    headers[2].text = '对方户名'
    headers[3].text = '备注'

    # 数据行
    for item in data.bankOnly:
        row = table.add_row().cells
        row[0].text = str(item['日期'])
        row[1].text = str(item['金额'])
        row[2].text = str(item['对方户名'])
        row[3].text = '需核查'

        # 标红
        for cell in row:
            for paragraph in cell.paragraphs:
                for run in paragraph.runs:
                    run.font.color.rgb = RGBColor(255, 0, 0)

# 保存
doc.save('/mnt/outputs/银行对账报告.docx')
'/mnt/outputs/银行对账报告.docx'
    `;

    return await this.executeCode(reportCode);
  }
}
```

### 4.2 内控评价模式 (三维校验矩阵)

**完整实现**:

```typescript
class InternalControlEvaluationService {
  async performTripleValidation(
    ruleDocs: File[],      // 规则文档
    excelFiles: File[],    // Excel 底稿
    reportDraft: File      // 报告草稿
  ): Promise<ControlEvaluationResult> {

    const vfs = new VirtualFileSystemManager(pyodide);

    // 1. 挂载所有文档
    const rulePaths = await vfs.mountMultipleFiles(ruleDocs, '/mnt/rules');
    const excelPaths = await vfs.mountMultipleFiles(excelFiles, '/mnt/data');
    const reportPath = await vfs.mountFile(reportDraft, '/mnt/report.docx');

    // 2. 阶段一：规则提取 (Rule Miner)
    const rules = await this.extractRules(rulePaths);

    // 3. 阶段二：证据比对 (Evidence Matcher)
    const exceptions = await this.findExceptions(rules, excelPaths);

    // 4. 阶段三：综合判定 (Final Auditor)
    const findings = await this.auditReport(reportPath, exceptions, rules);

    return {
      rules: rules,
      exceptions: exceptions,
      findings: findings,
      riskScore: this.calculateRiskScore(findings)
    };
  }

  // 阶段一：规则提取
  private async extractRules(rulePaths: string[]): Promise<ControlRule[]> {
    const prompt = `
# 角色
你是一位 CIA（国际内控注册审计师）和 CISA 资质的审计专家。

# 任务
从以下制度文档中提取所有内控红线（即必须遵守的控制规则）。

# 输入文档路径
${rulePaths.join('\n')}

# 输出格式 (JSON)
[
  {
    "rule_id": "RULE_001",
    "category": "费用审批",
    "description": "单笔报销超过5000元需经理审批",
    "keywords": ["报销", "审批", "5000"],
    "severity": "高",
    "test_procedure": "检查报销单中金额>5000的记录是否有经理签字"
  }
]
    `;

    const response = await this.callGemini(prompt);
    return JSON.parse(response.content);
  }

  // 阶段二：证据比对
  private async findExceptions(
    rules: ControlRule[],
    excelPaths: string[]
  ): Promise<ExceptionSummary[]> {

    const summaries = [];

    for (const rule of rules) {
      // 为每条规则构建测试代码
      const testCode = await this.generateTestCode(rule, excelPaths);

      // 执行测试
      const result = await this.executeWithSelfHeal(testCode, {
        rule,
        excelPaths
      });

      if (result.violations.length > 0) {
        summaries.push({
          rule_id: rule.rule_id,
          rule_description: rule.description,
          violations: result.violations,
          total_violations: result.violations.length,
          total_amount: result.violations.reduce((sum, v) => sum + v.amount, 0),
          risk_score: this.calculateRuleRiskScore(rule, result)
        });
      }
    }

    return summaries;
  }

  private async generateTestCode(rule: ControlRule, excelPaths: string[]): Promise<string> {
    const prompt = `
# 任务
为以下内控规则编写 Python 测试代码，检查 Excel 数据中是否存在违规记录。

# 内控规则
${JSON.stringify(rule, null, 2)}

# 数据文件
${excelPaths.join('\n')}

# 要求
1. 读取所有 Excel 文件
2. 根据规则编写测试逻辑
3. 违规记录必须包含：row_index, source_file, data, violated_fields
4. 输出 JSON 到 /mnt/analysis/exceptions_{rule_id}.json
5. 添加 assert 验证结果合理性

# 输出
只输出 Python 代码，不要解释。
    `;

    const response = await this.callGemini(prompt);
    return response.code;
  }

  // 阶段三：综合判定
  private async auditReport(
    reportPath: string,
    exceptions: ExceptionSummary[],
    rules: ControlRule[]
  ): Promise<AuditFinding[]> {

    // 读取报告草稿
    const reportContent = await this.extractReportContent(reportPath);

    const prompt = `
# 角色
你是一位审计质量复核专家。

# 任务
对比【报告草稿】与【实际违规数据】，找出报告中的漏报、错报或矛盾之处。

# 报告草稿内容
${reportContent}

# 实际违规数据
${JSON.stringify(exceptions, null, 2)}

# 评价规则
${JSON.stringify(rules, null, 2)}

# 输出格式 (JSON)
[
  {
    "category": "漏报" | "错报" | "矛盾",
    "severity": "高" | "中" | "低",
    "description": "报告称'费用审批执行良好'，但发现12笔未经审批的大额报销",
    "evidence": [
      {"file": "报销明细.xlsx", "rows": [145, 167, 189]},
      {"rule": "RULE_001", "violations": 12}
    ],
    "suggested_text": "本年度费用审批存在重大缺陷，发现12笔单笔超过5000元的报销未经经理审批，涉及金额45,600元。"
  }
]
    `;

    const response = await this.callGemini(prompt);
    return JSON.parse(response.content);
  }

  private calculateRiskScore(findings: AuditFinding[]): number {
    let totalScore = 0;

    for (const finding of findings) {
      const severityWeight = {
        '高': 3,
        '中': 2,
        '低': 1
      };

      const categoryWeight = {
        '漏报': 3,
        '错报': 2,
        '矛盾': 2
      };

      totalScore += severityWeight[finding.severity] * categoryWeight[finding.category];
    }

    // 归一化到 0-100
    return Math.min(100, totalScore);
  }
}
```

### 4.3 报告自动生成

**完整实现**:

```typescript
class AutoReportGenerator {
  async generateAuditReport(
    template: File,
    dataSources: File[],
    userInstruction: string
  ): Promise<GeneratedReport> {

    const vfs = new VirtualFileSystemManager(pyodide);

    // 1. 挂载模板
    const templatePath = await vfs.mountFile(template, '/mnt/templates/report.docx');

    // 2. 分析模板结构
    const templateStructure = await this.analyzeTemplate(templatePath);

    // 3. 分析数据源
    const dataSourceAnalysis = await this.analyzeDataSources(dataSources);

    // 4. AI 生成填充方案
    const mappingScheme = await this.generateMappingScheme({
      template: templateStructure,
      dataSources: dataSourceAnalysis,
      userInstruction
    });

    // 5. 用户确认映射方案
    const confirmedScheme = await this.requestUserConfirmation(mappingScheme);

    // 6. 生成填充代码
    const fillCode = await this.generateFillCode(confirmedScheme);

    // 7. 执行填充
    const result = await this.executeWithSelfHeal(fillCode, {
      templatePath,
      dataSources: dataSourceAnalysis
    });

    // 8. 添加审计轨迹
    await this.addAuditTrail(result.outputPath, {
      template: templateStructure,
      mapping: confirmedScheme,
      dataSource: dataSourceAnalysis
    });

    return {
      outputPath: result.outputPath,
      downloadUrl: vfs.getDownloadUrl(result.outputPath),
      metadata: {
        template: template.name,
        dataFiles: dataSources.map(f => f.name),
        generatedAt: new Date().toISOString(),
        mappingScheme: confirmedScheme
      }
    };
  }

  private async analyzeTemplate(templatePath: string): Promise<TemplateStructure> {
    const scoutCode = `
from docx import Document
import json

doc = Document('${templatePath}')

# 提取占位符
placeholders = []
for para in doc.paragraphs:
    if '{{' in para.text:
        placeholders.append({
            'text': para.text,
            'context': para.text[:100]
        })

# 提取表格
tables = []
for i, table in enumerate(doc.tables):
    tables.append({
        'index': i,
        'rows': len(table.rows),
        'cols': len(table.columns),
        'headers': [cell.text for cell in table.rows[0].cells]
    })

# 提取章节
sections = []
for i, para in enumerate(doc.paragraphs):
    if para.style.name.startswith('Heading'):
        sections.append({
            'level': para.style.name,
            'text': para.text,
            'index': i
        })

# 输出
json.dumps({
    'placeholders': placeholders,
    'tables': tables,
    'sections': sections
}, ensure_ascii=False)
    `;

    const result = await pyodide.runPythonAsync(scoutCode);
    return JSON.parse(result);
  }

  private async generateFillCode(scheme: MappingScheme): Promise<string> {
    const prompt = `
# 任务
根据以下映射方案，生成 Python 代码将数据填充到 Word 文档中。

# 映射方案
${JSON.stringify(scheme, null, 2)}

# 要求
1. 使用 python-docx 库
2. 文本占位符使用 Run 级替换（保留格式）
3. 表格填充需要自动扩展行数
4. 添加审计批注（标注数据来源）
5. 保存到 /mnt/outputs/filled_report.docx

# 输出
只输出 Python 代码。
    `;

    const response = await this.callGemini(prompt);
    return response.code;
  }

  private async addAuditTrail(
    docPath: string,
    metadata: any
  ): Promise<void> {
    const code = `
from docx import Document
from docx.shared import RGBColor
import json

doc = Document('${docPath}')

# 添加审计轨迹段落
para = doc.add_paragraph()
run = para.add_run('\\n\\n--- 审计轨迹 ---\\n')
run.bold = True
run.font.size = Pt(10)

# 添加元数据
trail = json.dumps(${JSON.stringify(metadata)}, indent=2, ensure_ascii=False)
doc.add_paragraph(trail)

# 保存
doc.save('${docPath}')
    `;

    await pyodide.runPythonAsync(code);
  }
}
```

### 4.4 Chatbot 对话式操作

**完整实现** (基于现有的审计助手模块):

```typescript
class AuditAssistantWithTools {
  private tools: Tool[] = [
    {
      name: 'analyze_excel',
      description: '分析 Excel 文件结构和内容',
      parameters: {
        type: 'object',
        properties: {
          filePath: { type: 'string', description: '文件路径' }
        },
        required: ['filePath']
      }
    },
    {
      name: 'find_exceptions',
      description: '根据规则查找异常数据',
      parameters: {
        type: 'object',
        properties: {
          rule: { type: 'string', description: '规则描述' },
          threshold: { type: 'number', description: '阈值' }
        },
        required: ['rule']
      }
    },
    {
      name: 'fill_word_table',
      description: '填充 Word 表格',
      parameters: {
        type: 'object',
        properties: {
          tableIndex: { type: 'integer', description: '表格索引' },
          dataCategory: { type: 'string', description: '数据类别' }
        },
        required: ['tableIndex', 'dataCategory']
      }
    },
    {
      name: 'generate_report',
      description: '生成审计报告',
      parameters: {
        type: 'object',
        properties: {
          templatePath: { type: 'string' },
          includeFindings: { type: 'boolean' }
        },
        required: ['templatePath']
      }
    }
  ];

  async chat(userMessage: string, context: ConversationContext): Promise<ChatResponse> {
    // 1. 构建对话上下文
    const augmentedContext = {
      ...context,
      currentFiles: this.getMountedFiles(),
      recentAnalysis: this.getRecentAnalysis()
    };

    // 2. 调用 Gemini (带 Function Calling)
    const response = await this.callGeminiWithTools(
      userMessage,
      augmentedContext,
      this.tools
    );

    // 3. 如果 AI 调用了工具
    if (response.toolCalls) {
      const toolResults = [];

      for (const toolCall of response.toolCalls) {
        const result = await this.executeTool(toolCall);
        toolResults.push({
          toolCallId: toolCall.id,
          result: result
        });
      }

      // 4. 将工具结果反馈给 AI
      const finalResponse = await this.callGeminiWithTools(
        userMessage,
        {
          ...augmentedContext,
          toolResults: toolResults
        },
        this.tools
      );

      return {
        message: finalResponse.content,
        toolExecuted: true,
        attachments: this.extractAttachments(finalResponse)
      };
    }

    return {
      message: response.content,
      toolExecuted: false
    };
  }

  private async executeTool(toolCall: ToolCall): Promise<any> {
    const { name, args } = toolCall;

    switch (name) {
      case 'analyze_excel':
        return await this.analyzeExcel(args.filePath);

      case 'find_exceptions':
        return await this.findExceptions(args.rule, args.threshold);

      case 'fill_word_table':
        return await this.fillWordTable(
          args.tableIndex,
          args.dataCategory
        );

      case 'generate_report':
        return await this.generateReport(
          args.templatePath,
          args.includeFindings
        );

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private async findExceptions(rule: string, threshold?: number): Promise<ExceptionResult> {
    // 1. 将自然语言规则转换为测试代码
    const prompt = `
# 任务
将以下审计规则转换为 Python 测试代码。

# 规则
${rule}

# 数据文件
${this.getMountedFiles().join('\n')}

${threshold ? `# 阈值\n${threshold}` : ''}

# 输出
只输出 Python 代码，返回异常记录的 JSON。
    `;

    const response = await this.callGemini(prompt);

    // 2. 执行代码
    const result = await this.executeWithSelfHeal(response.code, {});

    // 3. 返回结果
    return {
      rule: rule,
      exceptions: JSON.parse(result.output),
      summary: `${result.count} 条异常记录`,
      downloadUrl: this.getDownloadUrl(result.outputPath)
    };
  }

  private async fillWordTable(
    tableIndex: number,
    dataCategory: string
  ): Promise<FillResult> {
    // 获取数据
    const data = this.getCachedData(dataCategory);

    // 生成填充代码
    const prompt = `
# 任务
将以下数据填充到 Word 文档的第 ${tableIndex} 个表格中。

# 数据
${JSON.stringify(data, null, 2)}

# 要求
1. 保持表格格式
2. 添加审计批注
3. 保存到 /mnt/outputs/filled_report.docx
    `;

    const response = await this.callGemini(prompt);

    // 执行
    await this.executeWithSelfHeal(response.code, {});

    return {
      success: true,
      outputPath: '/mnt/outputs/filled_report.docx',
      downloadUrl: this.getDownloadUrl('/mnt/outputs/filled_report.docx')
    };
  }
}
```

---

## ⚠️ 五、技术风险评估

### 5.1 Wasm 内存限制

**风险描述**:
- Pyodide 运行在浏览器沙箱中，内存受限（通常 512MB-2GB）
- 大文件处理可能导致内存溢出

**缓解措施**:

```typescript
class MemoryManagementService {
  private MAX_MEMORY_USAGE = 1024 * 1024 * 1024; // 1GB

  async checkMemoryStatus(): Promise<MemoryStatus> {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        usagePercent: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
      };
    }

    // 降级：估算内存使用
    return {
      used: estimateMemoryUsage(),
      total: this.MAX_MEMORY_USAGE,
      limit: this.MAX_MEMORY_USAGE,
      usagePercent: 50
    };
  }

  async processLargeFile(file: File, strategy: 'chunk' | 'stream' = 'chunk') {
    const fileSize = file.size;

    if (fileSize > 50 * 1024 * 1024) { // > 50MB
      // 使用分块处理
      return await this.processInChunks(file);
    } else if (fileSize > 10 * 1024 * 1024) { // > 10MB
      // 使用采样处理
      return await this.processWithSampling(file);
    } else {
      // 直接处理
      return await this.processDirectly(file);
    }
  }

  private async processInChunks(file: File): Promise<any> {
    const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB per chunk
    const chunks = Math.ceil(file.size / CHUNK_SIZE);

    const results = [];

    for (let i = 0; i < chunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      // 处理分块
      const result = await this.processChunk(chunk, i);
      results.push(result);

      // 释放内存
      await this.gc();
    }

    return this.mergeChunkResults(results);
  }

  private async gc() {
    // 手动触发垃圾回收
    if (global.gc) {
      global.gc();
    }

    // 清理 Pyodide 缓存
    await pyodide.runPythonAsync(`
import gc
gc.collect()
    `);
  }
}
```

### 5.2 大文档处理

**风险描述**:
- Word 文档包含大量图片时加载缓慢
- 复杂表格嵌套可能导致解析错误

**缓解措施**:

```typescript
class LargeDocumentHandler {
  async processLargeWordDoc(docPath: string): Promise<ProcessResult> {
    // 1. 预检查文档大小
    const docSize = await this.getDocSize(docPath);

    if (docSize > 20 * 1024 * 1024) { // > 20MB
      const userChoice = await this.promptUser({
        message: '文档较大，建议仅处理文字部分',
        options: [
          { label: '仅处理文字', value: 'text_only' },
          { label: '完整处理', value: 'full' },
          { label: '取消', value: 'cancel' }
        ]
      });

      if (userChoice === 'text_only') {
        return await this.processTextOnly(docPath);
      } else if (userChoice === 'cancel') {
        throw new Error('用户取消操作');
      }
    }

    // 2. 正常处理
    return await this.processDocument(docPath);
  }

  private async processTextOnly(docPath: string): Promise<ProcessResult> {
    const code = `
from docx import Document

# 仅读取文本，不加载图片
doc = Document('${docPath}')

# 提取文本段落
paragraphs = [p.text for p in doc.paragraphs]

# 提取表格文本
tables_text = []
for table in doc.tables:
    table_data = []
    for row in table.rows:
        row_data = [cell.text for cell in row.cells]
        table_data.append(row_data)
    tables_text.append(table_data)

# 输出
{
    'paragraphs': paragraphs,
    'tables': tables_text,
    'mode': 'text_only'
}
    `;

    return await pyodide.runPythonAsync(code);
  }

  private async handleComplexTables(doc: Document): Promise<void> {
    // 检测复杂表格
    for (let i = 0; i < doc.tables.length; i++) {
      const table = doc.tables[i];

      if (this.isComplexTable(table)) {
        // 使用简化的处理方式
        await this.processTableSimplified(table, i);
      } else {
        // 正常处理
        await this.processTable(table, i);
      }
    }
  }

  private isComplexTable(table: any): boolean {
    // 检测合并单元格
    const hasMergedCells = table.rows.some(row =>
      row.cells.some(cell => cell._element.xpath('.//w:vMerge')))
    ;

    // 检测嵌套表格
    const hasNestedTables = table.rows.some(row =>
      row.cells.some(cell => cell._element.xpath('.//w:tbl'))
    );

    return hasMergedCells || hasNestedTables;
  }
}
```

### 5.3 浏览器兼容性

**风险描述**:
- WebAssembly 在旧浏览器中不支持
- Pyodide 需要 SharedArrayBuffer（需要特定 HTTP 头）

**缓解措施**:

```typescript
class BrowserCompatibilityChecker {
  async checkCompatibility(): Promise<CompatibilityReport> {
    const report: CompatibilityReport = {
      wasmSupported: this.checkWasmSupport(),
      sharedArrayBufferSupported: this.checkSharedArrayBuffer(),
      crossOriginIsolated: this.checkCrossOriginIsolated(),
      recommendations: []
    };

    // 生成建议
    if (!report.wasmSupported) {
      report.recommendations.push({
        severity: 'critical',
        message: '您的浏览器不支持 WebAssembly，请升级到最新版本的 Chrome、Firefox 或 Edge'
      });
    }

    if (!report.sharedArrayBufferSupported) {
      report.recommendations.push({
        severity: 'warning',
        message: 'SharedArrayBuffer 不可用，多线程性能将受影响'
      });
    }

    if (!report.crossOriginIsolated) {
      report.recommendations.push({
        severity: 'critical',
        message: '需要设置 COOP/COEP 响应头',
        fix: 'Cross-Origin-Opener-Policy: same-origin\nCross-Origin-Embedder-Policy: require-corp'
      });
    }

    return report;
  }

  private checkWasmSupport(): boolean {
    try {
      return typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function';
    } catch (e) {
      return false;
    }
  }

  private checkSharedArrayBuffer(): boolean {
    return typeof SharedArrayBuffer !== 'undefined';
  }

  private checkCrossOriginIsolated(): boolean {
    return crossOriginIsolated;
  }

  async applyWorkarounds(report: CompatibilityReport): Promise<void> {
    for (const recommendation of report.recommendations) {
      if (recommendation.severity === 'warning') {
        // 应用降级方案
        await this.enableFallbackMode();
      }
    }
  }

  private async enableFallbackMode() {
    // 禁用多线程
    this.config.useThreads = false;

    // 减少并发处理
    this.config.maxConcurrentOperations = 1;

    // 使用简化的 UI
    this.config.enableAdvancedFeatures = false;
  }
}
```

### 5.4 降级方案

**多层降级策略**:

```typescript
class GracefulDegradationService {
  async executeWithFallback(
    primaryStrategy: () => Promise<any>,
    fallbackStrategies: (() => Promise<any>)[]
  ): Promise<any> {
    let lastError: Error | null = null;

    // 尝试主要策略
    try {
      return await primaryStrategy();
    } catch (error) {
      lastError = error as Error;
      this.log('warn', '主要策略失败，尝试降级方案', { error });
    }

    // 尝试降级策略
    for (const fallback of fallbackStrategies) {
      try {
        this.log('info', '尝试降级方案');
        return await fallback();
      } catch (error) {
        lastError = error as Error;
        this.log('warn', '降级方案失败', { error });
      }
    }

    // 所有方案都失败，返回最小可用功能
    return this.getMinimalFunctionality(lastError!);
  }

  private async getMinimalFunctionality(error: Error): Promise<any> {
    // 提供基本的文件下载功能
    return {
      success: false,
      message: '由于技术限制，无法完成完整处理，但您仍可以下载原始文件',
      rawData: this.getRawData(),
      error: error.message,
      suggestions: [
        '尝试使用较小的文件',
        '关闭其他浏览器标签以释放内存',
        '使用最新版本的 Chrome 或 Firefox 浏览器'
      ]
    };
  }
}
```

---

## 📊 六、实施路线图

### 6.1 短期目标 (1-2 个月)

**核心功能**:
- ✅ Excel 侦察兵 (已完成部分)
- ✅ Word 侦察兵 (待实现)
- ✅ 自愈引擎 (已有框架)
- ⏳ 基础填充功能

**优先级**:
1. 完成 Excel 和 Word 侦察脚本
2. 实现基础的自愈循环
3. 集成现有的 AgenticOrchestrator

### 6.2 中期目标 (3-4 个月)

**增强功能**:
- ⏳ 内控评价模式 (三维校验)
- ⏳ 银行对账场景
- ⏳ 审计助手 Chatbot 集成

**优先级**:
1. 实现规则提取引擎
2. 构建异常检测框架
3. 集成 Function Calling

### 6.3 长期目标 (5-6 个月)

**完整生态**:
- ⏳ 多文档批量处理
- ⏳ 审计知识库
- ⏳ 协作功能

**优先级**:
1. 优化大文件处理性能
2. 构建审计规则库
3. 添加团队协作功能

---

## 🎯 七、关键成功指标

### 7.1 技术指标

| 指标 | 目标 | 测量方式 |
|------|------|----------|
| 代码自愈成功率 | > 80% | 统计自愈循环的成功次数 |
| 平均任务完成时间 | < 2 分钟 | 从上传到下载的端到端时间 |
| 内存使用峰值 | < 1GB | 浏览器性能监控 |
| 错误率 | < 5% | 失败任务占总任务的比例 |

### 7.2 业务指标

| 指标 | 目标 | 测量方式 |
|------|------|----------|
| 用户满意度 | > 4.5/5 | 用户反馈评分 |
| 任务覆盖率 | > 80% | 支持的审计场景比例 |
| 时间节省 | > 60% | 对比手工处理时间 |
| 错误减少 | > 70% | 对比手工处理错误率 |

---

## 📝 八、结论与建议

### 8.1 核心优势

1. **技术创新**: Wasm + AI 的结合实现了隐私安全与智能化的平衡
2. **业务价值**: 覆盖审计工作流 80% 的核心场景
3. **用户体验**: 从"工具"升级为"助手"，降低学习成本
4. **可扩展性**: 模块化设计支持快速迭代和功能扩展

### 8.2 潜在挑战

1. **性能限制**: Wasm 内存和大文件处理需要精心优化
2. **AI 幻觉**: 需要完善的验证和人工审核机制
3. **学习曲线**: 新技术栈需要团队培训和文档支持
4. **兼容性**: 浏览器差异需要充分测试

### 8.3 最终建议

**立即行动**:
1. ✅ 优先实现 Excel 和 Word 侦察脚本
2. ✅ 完善自愈引擎的错误分类和修复策略
3. ✅ 构建基础的 UI 框架和状态管理

**短期优化**:
1. 🔄 实现内控评价模式的核心功能
2. 🔄 添加更多预设的审计场景模板
3. 🔄 优化错误提示和用户引导

**长期规划**:
1. 🚀 构建审计知识库和规则库
2. 🚀 支持更多文档格式 (PDF、图片)
3. 🚀 添加团队协作和版本控制功能

---

## 📚 附录

### A. 参考文档

- `guanyu2.txt` - 高级顾问交流记录
- `ARCHITECTURE.md` - 系统架构设计
- `API_SPECIFICATION.md` - API 接口规范
- `AgenticOrchestrator.ts` - 现有编排器实现

### B. 技术栈总结

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| 前端 | React 19 + TypeScript | UI 框架 |
| 执行引擎 | Pyodide (Wasm) | Python 沙箱 |
| AI 服务 | Gemini 1.5 Pro (智谱) | 代码生成和分析 |
| 文档处理 | python-docx, openpyxl | Word/Excel 处理 |
| 状态管理 | Zustand | 前端状态 |

### C. 代码示例索引

- `VirtualFileSystemManager` - 虚拟文件系统管理
- `AuditWorkflowManager` - 审计工作流编排
- `SelfHealingEngine` - 自愈引擎
- `BankReconciliationService` - 银行对账服务
- `InternalControlEvaluationService` - 内控评价服务
- `AutoReportGenerator` - 自动报告生成
- `AuditAssistantWithTools` - 对话式审计助手

---

**报告结束**

*本报告基于高级顾问的深度交流，从端到端集成角度全面分析了 ExcelMind AI 的第二阶段优化方案。建议优先实施核心功能，逐步完善高级特性，确保系统稳定性和用户体验。*
