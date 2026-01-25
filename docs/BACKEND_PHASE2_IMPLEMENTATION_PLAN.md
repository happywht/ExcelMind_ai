# ExcelMind AI 后端优化实施计划

> **基于 PHASE2_COMPREHENSIVE_EVALUATION.md 的后端技术实施方案**
>
> **文档版本**: v1.0
> **创建日期**: 2026-01-24
> **技术负责人**: Backend Technical Lead
> **预估总工期**: 10-12周

---

## 📋 目录

1. [执行摘要](#执行摘要)
2. [后端优化任务清单](#后端优化任务清单)
3. [技术实施方案](#技术实施方案)
4. [风险评估与缓解](#风险评估与缓解)
5. [交付物清单](#交付物清单)
6. [实施时间表](#实施时间表)

---

## 🎯 执行摘要

### 战略目标

基于顾问交流记录的综合评估，后端系统需要从**单文件处理工具**升级为**智能审计工作流引擎**。核心转变包括：

1. **从静态处理到动态编排** - 引入数据流编排器和四阶段执行模型
2. **从被动响应到主动预审** - 实现内控预审引擎
3. **从单次调用到 Function Calling** - 将 Chatbot 升级为执行助手
4. **从简单重试到智能自愈** - 完善自愈逻辑引擎

### 关键指标

| 指标 | 当前值 | 目标值 | 提升幅度 |
|------|--------|--------|----------|
| 代码生成成功率 | ~60% | >85% | +42% |
| 自愈修复率 | 0% | >70% | 新增能力 |
| 多文件支持 | ❌ | ✅ | 新增能力 |
| 审计工作流完整性 | 25% | 95% | +280% |
| Function Calling | ❌ | ✅ | 新增能力 |

---

## 📊 后端优化任务清单

### P0 优先级任务（核心能力，必须实施）

#### P0-1: 虚拟工作台优化服务
**任务描述**: 扩展现有文件系统服务，支持文件角色标记和关系图谱

**功能需求**:
- 文件角色标记（source/reference/template/rules/output）
- 文件关系图谱构建
- Schema 动态注入
- 虚拟工作台状态管理

**预计工期**: 5-7天
**依赖关系**: 无
**技术复杂度**: 中等

**验收标准**:
- ✅ 支持至少5种文件角色
- ✅ 可视化文件关系图谱
- ✅ Schema 自动注入成功率 >90%
- ✅ 单元测试覆盖率 >80%

---

#### P0-2: Excel 侦察兵服务增强
**任务描述**: 增强 Excel 元数据提取能力，支持数据类型推断和格式检测

**功能需求**:
- 多 Sheet 深度分析
- 数据类型推断（数值/日期/文本/公式）
- 格式模式检测（千分位/百分比/货币符号）
- 样例数据提取（前3行标准化）
- 数据质量报告生成

**预计工期**: 5-7天
**依赖关系**: P0-1
**技术复杂度**: 中等

**验收标准**:
- ✅ 支持 10+ 种数据类型推断
- ✅ 识别 5+ 种格式模式
- ✅ 数据质量报告准确率 >90%
- ✅ 处理速度 >1000 行/秒

---

#### P0-3: 数据流编排器
**任务描述**: 实现管道式数据处理引擎，支持断点续传和中间态持久化

**功能需求**:
- 管道阶段定义和管理
- 中间态自动保存
- 断点续传机制
- 数据血缘追踪
- 流程可视化支持

**预计工期**: 8-10天
**依赖关系**: P0-1, P0-2
**技术复杂度**: 高

**验收标准**:
- ✅ 支持 5+ 个管道阶段串联
- ✅ 断点续传成功率 100%
- ✅ 数据血缘完整追踪
- ✅ 中间态自动持久化
- ✅ 性能：<500ms/阶段

---

#### P0-4: 四阶段总控引擎
**任务描述**: 扩展现有 AgenticOrchestrator，实现侦察→预审→分析→填充四阶段模型

**功能需求**:
- 阶段状态管理
- 阶段间数据流转
- 阶段执行监控
- 错误处理和回退
- 进度实时推送

**预计工期**: 10-12天
**依赖关系**: P0-3
**技术复杂度**: 高

**验收标准**:
- ✅ 四阶段完整执行
- ✅ 阶段间数据流转正确率 100%
- ✅ 错误自动回退成功率 >80%
- ✅ WebSocket 实时进度推送

---

#### P0-5: Function Calling 适配器
**任务描述**: 实现 Function Calling 框架，将 Chatbot 升级为执行助手

**功能需求**:
- 工具注册表管理
- Function Calling 协议实现
- 工具调用链管理
- 对话上下文维护
- 工具执行结果反馈

**预计工期**: 12-15天
**依赖关系**: P0-4
**技术复杂度**: 高

**验收标准**:
- ✅ 支持 10+ 种工具注册
- ✅ 工具调用成功率 >90%
- ✅ 支持嵌套工具调用（3层深度）
- ✅ 上下文保持准确率 >95%

---

#### P0-6: 自愈逻辑引擎完善
**任务描述**: 增强现有错误处理机制，实现智能自愈

**功能需求**:
- 错误分类和识别
- 修复策略选择
- 自动代码修复
- 修复结果验证
- 修复历史记录

**预计工期**: 8-10天
**依赖关系**: P0-5
**技术复杂度**: 中高

**验收标准**:
- ✅ 错误分类准确率 >85%
- ✅ 自愈修复成功率 >70%
- ✅ 修复时间 <30秒
- ✅ 支持至少 5 种修复策略

---

### P1 优先级任务（重要功能，应该实施）

#### P1-1: 内控预审引擎
**任务描述**: 实现基于内控规则的异常数据预筛选引擎

**功能需求**:
- 规则解析和验证
- 规则执行引擎
- 异常数据检测
- 风险评分机制
- 异常报告生成

**预计工期**: 10-14天
**依赖关系**: P0-2, P0-3
**技术复杂度**: 高

**验收标准**:
- ✅ 支持 10+ 种比较运算符
- ✅ 规则执行速度 >10000 行/秒
- ✅ 风险评分准确率 >80%
- ✅ 异常报告完整性 100%

---

#### P1-2: Word 侦察兵服务
**任务描述**: 实现 Word 文档结构分析和占位符识别

**功能需求**:
- 文档结构解析
- 占位符识别（{{placeholder}}）
- 表格结构分析
- 样式信息提取
- 模板版本识别

**预计工期**: 7-10天
**依赖关系**: 无
**技术复杂度**: 中等

**验收标准**:
- ✅ 占位符识别准确率 >95%
- ✅ 支持复杂表格结构
- ✅ 样式信息提取完整度 >90%

---

#### P1-3: 性能优化
**任务描述**: 系统级性能优化，提升吞吐量和响应速度

**功能需求**:
- 内存优化（Pyodide 限制）
- 并行处理优化
- 缓存策略优化
- 流式处理实现
- 资源清理机制

**预计工期**: 7-10天
**依赖关系**: 所有 P0 任务
**技术复杂度**: 中高

**验收标准**:
- ✅ 内存占用降低 30%
- ✅ 响应时间提升 40%
- ✅ 支持 50MB+ 大文件
- ✅ 缓存命中率 >60%

---

### P2 优先级任务（增强功能，可以延后）

#### P2-1: Python-docx 集成
**任务描述**: 集成 python-docx 库，增强 Word 文档处理能力

**功能需求**:
- python-docx WASM 构建
- 文档读取和修改
- 样式保持
- 批量处理支持

**预计工期**: 5-7天
**依赖关系**: P1-2
**技术复杂度**: 中等

**验收标准**:
- ✅ 成功集成 python-docx
- ✅ 样式保持准确率 >90%
- ✅ 批量处理性能 >10 文档/分钟

---

#### P2-2: 高级图表功能
**任务描述**: 支持图表数据提取和生成

**功能需求**:
- 图表数据提取
- 图表类型识别
- 数据可视化
- 图表模板管理

**预计工期**: 7-10天
**依赖关系**: P0-2
**技术复杂度**: 中等

**验收标准**:
- ✅ 支持 5+ 种图表类型
- ✅ 数据提取准确率 >85%
- ✅ 生成图表美观度 >4.0/5.0

---

## 🏗️ 技术实施方案

### 1. 虚拟工作台服务架构

#### 1.1 核心接口设计

```typescript
/**
 * 文件角色定义
 */
interface FileRole {
  role: 'source' | 'reference' | 'template' | 'rules' | 'output';
  category?: string;
  priority?: number;
}

/**
 * 文件关系定义
 */
interface FileRelationship {
  targetFileId: string;
  relationshipType: 'data_source' | 'template' | 'reference' | 'output';
  metadata?: Record<string, any>;
}

/**
 * 增强的文件元数据
 */
interface EnhancedFileMetadata {
  id: string;
  name: string;
  role: FileRole;
  type: 'excel' | 'word' | 'pdf';
  path: string;
  size: number;
  uploadTime: Date;
  relationships: FileRelationship[];
  schema?: DataSchema;
  quality?: DataQualityReport;
}

/**
 * 虚拟工作台状态
 */
interface VirtualWorkspaceState {
  files: Map<string, EnhancedFileMetadata>;
  topology: RelationshipGraph;
  checkpointId?: string;
  lastModified: Date;
}
```

#### 1.2 服务类设计

```typescript
/**
 * 增强的文件系统服务
 */
class EnhancedFileSystemService extends FileSystemService {
  private workspace: VirtualWorkspaceState;
  private roleRegistry: Map<string, FileRole>;

  /**
   * 挂载文件并分配角色
   */
  async mountWithRole(
    file: File,
    role: FileRole,
    options?: { targetPath?: string; analyzeSchema?: boolean }
  ): Promise<string> {
    const path = options?.targetPath || `/data/${file.name}`;

    // 保存文件
    await super.saveFile(file, path);

    // 创建元数据
    const metadata: EnhancedFileMetadata = {
      id: this.generateId(),
      name: file.name,
      role,
      type: this.getFileType(file.name),
      path,
      size: file.size,
      uploadTime: new Date(),
      relationships: [],
      schema: options?.analyzeSchema ? await this.analyzeSchema(file) : undefined
    };

    // 注册到工作区
    this.workspace.files.set(metadata.id, metadata);

    return path;
  }

  /**
   * 建立文件关系
   */
  async establishRelationship(
    sourceFileId: string,
    targetFileId: string,
    relationshipType: FileRelationship['relationshipType'],
    metadata?: Record<string, any>
  ): Promise<void> {
    const sourceFile = this.workspace.files.get(sourceFileId);
    if (!sourceFile) {
      throw new Error(`Source file not found: ${sourceFileId}`);
    }

    const relationship: FileRelationship = {
      targetFileId,
      relationshipType,
      metadata
    };

    sourceFile.relationships.push(relationship);
    this.workspace.lastModified = new Date();
  }

  /**
   * 获取文件关系图谱
   */
  getFileTopology(): RelationshipGraph {
    return this.buildRelationshipGraph(this.workspace.files);
  }

  /**
   * 保存工作区检查点
   */
  async saveCheckpoint(checkpointId: string): Promise<void> {
    const state = {
      files: Array.from(this.workspace.files.entries()),
      topology: this.workspace.topology,
      timestamp: Date.now()
    };

    await this.checkpointService.save(`workspace_${checkpointId}`, state);
    this.workspace.checkpointId = checkpointId;
  }

  /**
   * 从检查点恢复工作区
   */
  async restoreCheckpoint(checkpointId: string): Promise<void> {
    const state = await this.checkpointService.load(`workspace_${checkpointId}`);
    this.workspace = {
      files: new Map(state.files),
      topology: state.topology,
      checkpointId,
      lastModified: new Date(state.timestamp)
    };
  }
}
```

#### 1.3 API 端点设计

```typescript
/**
 * API 路由定义
 */
const workspaceApiRoutes = {
  // 获取工作区文件列表
  'GET /api/workspace/files': async (req, res) => {
    const files = await fileSystemService.getMountedFiles();
    res.json({ success: true, files });
  },

  // 挂载文件到工作区
  'POST /api/workspace/mount': async (req, res) => {
    const { file, role, options } = req.body;
    const path = await fileSystemService.mountWithRole(file, role, options);
    res.json({ success: true, path });
  },

  // 获取文件关系图谱
  'GET /api/workspace/relationships': async (req, res) => {
    const topology = await fileSystemService.getFileTopology();
    res.json({ success: true, topology });
  },

  // 更新文件角色
  'PUT /api/workspace/files/:id/role': async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    await fileSystemService.updateFileRole(id, role);
    res.json({ success: true });
  },

  // 建立文件关系
  'POST /api/workspace/relationships': async (req, res) => {
    const { sourceId, targetId, type, metadata } = req.body;
    await fileSystemService.establishRelationship(sourceId, targetId, type, metadata);
    res.json({ success: true });
  }
};
```

---

### 2. Excel 侦察兵服务架构

#### 2.1 核心接口设计

```typescript
/**
 * 侦察选项
 */
interface ScoutOptions {
  sampleRows?: number;
  detectPatterns?: boolean;
  analyzeQuality?: boolean;
  inferTypes?: boolean;
  extractMetadata?: boolean;
}

/**
 * 列信息
 */
interface ColumnInfo {
  name: string;
  dataType: 'string' | 'number' | 'date' | 'boolean' | 'formula';
  nullRatio: number;
  sampleValues: any[];
  patterns?: PatternInfo[];
  statistics?: {
    min?: number;
    max?: number;
    mean?: number;
    median?: number;
    uniqueCount?: number;
  };
}

/**
 * Sheet 信息
 */
interface SheetInfo {
  name: string;
  rowCount: number;
  columnCount: number;
  columns: Record<string, ColumnInfo>;
  sampleRows: Record<string, any>[];
  quality?: DataQualityReport;
}

/**
 * Excel 侦察报告
 */
interface ExcelScoutReport {
  fileName: string;
  filePath: string;
  sheets: SheetInfo[];
  patterns: Record<string, PatternInfo[]>;
  qualityIssues: string[];
  warnings: string[];
  metadata: {
    hasMacros: boolean;
    hasFormulas: boolean;
    hasCharts: boolean;
    protectedSheets: string[];
  };
}

/**
 * 模式信息
 */
interface PatternInfo {
  type: 'date' | 'currency' | 'percentage' | 'phone' | 'email' | 'custom';
  pattern: string;
  confidence: number;
  examples: string[];
}
```

#### 2.2 服务类设计

```typescript
/**
 * Excel 侦察兵服务
 */
class ExcelScoutService {
  constructor(
    private pyodideService: PyodideService,
    private cacheService: CacheService
  ) {}

  /**
   * 侦察 Excel 文件
   */
  async scoutExcelFile(filePath: string, options?: ScoutOptions): Promise<ExcelScoutReport> {
    // 检查缓存
    const cacheKey = this.generateCacheKey(filePath, options);
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    // 构建侦察脚本
    const script = this.buildScoutScript(filePath, options || {
      sampleRows: 3,
      detectPatterns: true,
      analyzeQuality: true,
      inferTypes: true,
      extractMetadata: true
    });

    // 执行侦察
    const result = await this.pyodideService.runPython(script);
    const report: ExcelScoutReport = JSON.parse(result);

    // 缓存结果
    await this.cacheService.set(cacheKey, report, { ttl: 3600 });

    return report;
  }

  /**
   * 构建 Python 侦察脚本
   */
  private buildScoutScript(filePath: string, options: ScoutOptions): string {
    return `
import pandas as pd
import json
import re
from datetime import datetime

def scout_excel(path, sample_rows=3, detect_patterns=True, analyze_quality=True, infer_types=True):
    """深度侦察 Excel 文件"""

    report = {
        "fileName": "${path.split('/').pop()}",
        "filePath": "${path}",
        "sheets": [],
        "patterns": {},
        "qualityIssues": [],
        "warnings": [],
        "metadata": {
            "hasMacros": False,
            "hasFormulas": False,
            "hasCharts": False,
            "protectedSheets": []
        }
    }

    try:
        xl = pd.ExcelFile(path)

        # 检测元数据
        report["metadata"]["hasMacros"] = hasattr(xl, 'vbascript')
        report["metadata"]["protectedSheets"] = [
            sheet for sheet in xl.sheet_names
            if xl.book.sheet_by_name(sheet).protected
        ]

        # 分析每个 sheet
        for sheet_name in xl.sheet_names:
            sheet_info = analyze_sheet(
                path, sheet_name, sample_rows,
                detect_patterns, analyze_quality, infer_types
            )
            report["sheets"].append(sheet_info)

        # 汇总质量问题
        all_issues = []
        for sheet in report["sheets"]:
            if sheet.get("quality"):
                all_issues.extend(sheet["quality"].get("issues", []))

        report["qualityIssues"] = all_issues[:10]  # 最多显示10个

    except Exception as e:
        report["warnings"].append(f"分析失败: {str(e)}")

    return json.dumps(report, ensure_ascii=False, default=str)

def analyze_sheet(path, sheet_name, sample_rows, detect_patterns, analyze_quality, infer_types):
    """分析单个 sheet"""

    df = pd.read_excel(path, sheet_name=sheet_name, nrows=sample_rows)

    sheet_info = {
        "name": sheet_name,
        "rowCount": len(df),
        "columnCount": len(df.columns),
        "columns": {},
        "sampleRows": df.to_dict('records') if len(df) > 0 else []
    }

    # 分析每一列
    for col in df.columns:
        col_info = analyze_column(df[col], detect_patterns, infer_types)
        sheet_info["columns"][col] = col_info

    # 数据质量分析
    if analyze_quality:
        sheet_info["quality"] = analyze_data_quality(df)

    return sheet_info

def analyze_column(series, detect_patterns, infer_types):
    """分析列"""

    col_info = {
        "name": series.name,
        "dataType": infer_data_type(series) if infer_types else "unknown",
        "nullRatio": series.isna().sum() / len(series),
        "sampleValues": series.dropna().head(3).tolist()
    }

    # 检测模式
    if detect_patterns:
        col_info["patterns"] = detect_column_patterns(series)

    # 统计信息
    if pd.api.types.is_numeric_dtype(series):
        col_info["statistics"] = {
            "min": series.min(),
            "max": series.max(),
            "mean": series.mean(),
            "median": series.median()
        }

    col_info["statistics"]["uniqueCount"] = series.nunique()

    return col_info

def infer_data_type(series):
    """推断数据类型"""

    # 尝试转换为数值
    try:
        pd.to_numeric(series)
        return "number"
    except:
        pass

    # 尝试转换为日期
    try:
        pd.to_datetime(series)
        return "date"
    except:
        pass

    # 检查是否为布尔值
    if series.dropna().isin([True, False, 'true', 'false', 'yes', 'no']).all():
        return "boolean"

    # 默认为字符串
    return "string"

def detect_column_patterns(series):
    """检测列中的模式"""

    patterns = []
    sample_values = series.dropna().head(20).astype(str)

    # 检测日期格式
    date_pattern = r'^\\d{4}-\\d{2}-\\d{2}$'
    if sample_values.str.match(date_pattern).sum() / len(sample_values) > 0.8:
        patterns.append({
            "type": "date",
            "pattern": date_pattern,
            "confidence": 0.9,
            "examples": sample_values.head(3).tolist()
        })

    # 检测货币格式
    currency_pattern = r'^¥?\\$?\\s*\\d{1,3}(,\\d{3})*(\\.\\d{2})?$'
    if sample_values.str.match(currency_pattern).sum() / len(sample_values) > 0.8:
        patterns.append({
            "type": "currency",
            "pattern": currency_pattern,
            "confidence": 0.85,
            "examples": sample_values.head(3).tolist()
        })

    # 检测百分比格式
    percent_pattern = r'^\\d+\\.?\\d*%$'
    if sample_values.str.match(percent_pattern).sum() / len(sample_values) > 0.8:
        patterns.append({
            "type": "percentage",
            "pattern": percent_pattern,
            "confidence": 0.9,
            "examples": sample_values.head(3).tolist()
        })

    return patterns

def analyze_data_quality(df):
    """分析数据质量"""

    issues = []

    # 检查缺失值
    missing_cols = df.columns[df.isna().any()].tolist()
    if missing_cols:
        issues.append(f"缺失值列: {', '.join(missing_cols)}")

    # 检查重复行
    duplicate_count = df.duplicated().sum()
    if duplicate_count > 0:
        issues.append(f"重复行数: {duplicate_count}")

    # 检查空数据
    if len(df) == 0:
        issues.append("空数据")

    return {
        "issues": issues,
        "completeness": 1 - (df.isna().sum().sum() / (len(df) * len(df.columns))),
        "uniqueness": 1 - (df.duplicated().sum() / len(df))
    }

# 执行侦察
scout_excel("${filePath}", ${options.sampleRows}, ${options.detectPatterns}, ${options.analyzeQuality}, ${options.inferTypes})
    `;
  }
}
```

---

### 3. 数据流编排器架构

#### 3.1 核心接口设计

```typescript
/**
 * 管道阶段定义
 */
interface PipelineStageDefinition {
  id: string;
  name: string;
  description: string;
  handler: (input: any) => Promise<any>;
  timeout?: number;
  retryConfig?: RetryConfig;
}

/**
 * 管道阶段状态
 */
interface PipelineStage extends PipelineStageDefinition {
  status: 'pending' | 'running' | 'completed' | 'failed';
  input: any;
  output: any;
  startTime: number;
  endTime: number;
  error: Error | null;
}

/**
 * 管道结果
 */
interface PipelineResult {
  success: boolean;
  finalOutput: any;
  stages: PipelineStage[];
  executionTime: number;
  checkpointId?: string;
}

/**
 * 断点续传选项
 */
interface ResumeOptions {
  fromStage: string;
  checkpointId: string;
}

/**
 * 检查点数据
 */
interface CheckpointData {
  stageId: string;
  output: any;
  timestamp: number;
}
```

#### 3.2 服务类设计

```typescript
/**
 * 数据流编排器
 */
class DataFlowOrchestrator {
  private pipeline: PipelineStage[] = [];
  private checkpoints: Map<string, CheckpointData> = new Map();
  private currentStageIndex = 0;

  constructor(
    private checkpointService: CheckpointService,
    private eventBus: EventBus
  ) {}

  /**
   * 定义处理管道
   */
  definePipeline(stages: PipelineStageDefinition[]): void {
    this.pipeline = stages.map(def => ({
      ...def,
      status: 'pending',
      input: null,
      output: null,
      startTime: 0,
      endTime: 0,
      error: null
    }));
    this.currentStageIndex = 0;
  }

  /**
   * 执行管道
   */
  async execute(
    inputData: any,
    options?: {
      resumeFrom?: string;
      checkpoint?: boolean;
      checkpointPrefix?: string;
    }
  ): Promise<PipelineResult> {
    const {
      resumeFrom,
      checkpoint = true,
      checkpointPrefix = 'pipeline'
    } = options || {};

    const startTime = Date.now();
    let currentData = inputData;
    let checkpointId = resumeFrom || this.generateCheckpointId();

    // 确定起始阶段
    const startIndex = resumeFrom
      ? this.pipeline.findIndex(s => s.id === resumeFrom)
      : 0;

    if (startIndex === -1) {
      throw new Error(`Stage not found: ${resumeFrom}`);
    }

    // 执行每个阶段
    for (let i = startIndex; i < this.pipeline.length; i++) {
      const stage = this.pipeline[i];

      try {
        // 更新状态
        stage.status = 'running';
        stage.startTime = Date.now();
        stage.input = currentData;

        // 发送事件
        this.eventBus.emit('stage:started', { stageId: stage.id, stageName: stage.name });

        // 执行阶段处理
        currentData = await this.executeStage(stage, currentData);

        // 保存检查点
        if (checkpoint) {
          await this.saveCheckpoint(`${checkpointPrefix}_${stage.id}`, {
            stageId: stage.id,
            output: currentData,
            timestamp: Date.now()
          });
        }

        // 更新状态
        stage.output = currentData;
        stage.status = 'completed';
        stage.endTime = Date.now();

        // 发送事件
        this.eventBus.emit('stage:completed', {
          stageId: stage.id,
          stageName: stage.name,
          duration: stage.endTime - stage.startTime
        });

      } catch (error) {
        // 处理失败
        stage.status = 'failed';
        stage.error = error as Error;
        stage.endTime = Date.now();

        // 发送事件
        this.eventBus.emit('stage:failed', {
          stageId: stage.id,
          stageName: stage.name,
          error: error.message
        });

        throw new PipelineExecutionError(
          `Pipeline failed at stage: ${stage.name}`,
          {
            failedStage: stage.id,
            canResume: true,
            checkpointId: `${checkpointPrefix}_${this.pipeline[Math.max(0, i - 1)].id}`
          }
        );
      }
    }

    const executionTime = Date.now() - startTime;

    return {
      success: true,
      finalOutput: currentData,
      stages: this.pipeline,
      executionTime,
      checkpointId
    };
  }

  /**
   * 从断点恢复执行
   */
  async resume(checkpointId: string, stageId: string): Promise<PipelineResult> {
    // 加载检查点
    const checkpoint = await this.checkpointService.load(checkpointId);
    if (!checkpoint) {
      throw new Error(`Checkpoint not found: ${checkpointId}`);
    }

    // 从检查点恢复执行
    return this.execute(checkpoint.output, {
      resumeFrom: stageId,
      checkpoint: true,
      checkpointPrefix: checkpointId.split('_')[0]
    });
  }

  /**
   * 执行单个阶段
   */
  private async executeStage(stage: PipelineStage, input: any): Promise<any> {
    const { handler, timeout = 30000 } = stage;

    // 设置超时
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Stage timeout')), timeout);
    });

    // 执行处理
    const result = await Promise.race([
      handler(input),
      timeoutPromise
    ]);

    return result;
  }

  /**
   * 保存检查点
   */
  private async saveCheckpoint(key: string, data: CheckpointData): Promise<void> {
    await this.checkpointService.save(key, data);
    this.checkpoints.set(key, data);
  }

  /**
   * 生成检查点 ID
   */
  private generateCheckpointId(): string {
    return `cp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

---

### 4. 四阶段总控引擎架构

#### 4.1 核心接口设计

```typescript
/**
 * 审计工作流配置
 */
interface AuditWorkflowConfig {
  enableInternalControl?: boolean;
  auditDepth?: 'basic' | 'standard' | 'deep';
  enablePreFiltering?: boolean;
  maxRetries?: number;
}

/**
 * 审计工作流状态
 */
interface AuditWorkflowState {
  id: string;
  status: 'scouting' | 'prefilter' | 'analyzing' | 'generating' | 'completed' | 'failed';
  currentStage: string;
  stages: WorkflowStage[];
  checkpoints: Checkpoint[];
  results: WorkflowResults;
  errors: Error[];
}

/**
 * 侦察阶段结果
 */
interface ScoutingResult {
  metadata: ExcelScoutReport[];
  documentTemplates: DocumentTemplate[];
  fileRelationships: FileRelationship[];
  executionTime: number;
}

/**
 * 预审阶段结果
 */
interface PreFilterResult {
  exceptions: ExceptionRecord[];
  riskAssessment: RiskAssessment;
  summary: SummaryReport;
  executionTime: number;
}

/**
 * 分析阶段结果
 */
interface AnalysisResult {
  findings: Finding[];
  recommendations: Recommendation[];
  confidence: number;
  executionTime: number;
}

/**
 * 生成阶段结果
 */
interface GenerationResult {
  documents: GeneratedDocument[];
  reportUrl: string;
  executionTime: number;
}

/**
 * 工作流结果
 */
interface WorkflowResults {
  scouting?: ScoutingResult;
  preFilter?: PreFilterResult;
  analysis?: AnalysisResult;
  generation?: GenerationResult;
}
```

#### 4.2 增强的编排器设计

```typescript
/**
 * 增强的智能体编排器
 */
class EnhancedAgenticOrchestrator extends AgenticOrchestrator {
  private excelScout: ExcelScoutService;
  private wordScout: WordScoutService;
  private preFilterEngine: InternalControlPreFilterEngine;
  private dataFlowOrchestrator: DataFlowOrchestrator;

  /**
   * 执行审计工作流
   */
  public async executeAuditWorkflow(
    userPrompt: string,
    files: DataFileInfo[],
    options?: AuditWorkflowConfig
  ): Promise<TaskResult> {
    const workflowId = this.generateId();
    const startTime = Date.now();

    this.log('info', 'Starting audit workflow', {
      workflowId,
      prompt: userPrompt,
      fileCount: files.length,
      options
    });

    try {
      // ===== Phase 1: 环境侦察 =====
      this.updateWorkflowStatus(workflowId, 'scouting');
      const scoutingResult = await this.executeScoutingPhase(files);
      this.log('info', 'Scouting phase completed', {
        duration: scoutingResult.executionTime
      });

      // ===== Phase 2: 内控预审（可选）=====
      let preFilterResult: PreFilterResult | null = null;
      if (options?.enableInternalControl || options?.enablePreFiltering) {
        this.updateWorkflowStatus(workflowId, 'prefilter');
        preFilterResult = await this.executePreFilterPhase({
          metadata: scoutingResult.metadata,
          rules: await this.extractControlRules(files)
        });
        this.log('info', 'Pre-filter phase completed', {
          duration: preFilterResult.executionTime,
          exceptionsFound: preFilterResult.exceptions.length
        });
      }

      // ===== Phase 3: AI 深度审计 =====
      this.updateWorkflowStatus(workflowId, 'analyzing');
      const analysisResult = await this.executeAIAnalysisPhase({
        userPrompt,
        scoutingData: scoutingResult.metadata,
        preFilterData: preFilterResult?.exceptions,
        auditDepth: options?.auditDepth || 'standard'
      });
      this.log('info', 'Analysis phase completed', {
        duration: analysisResult.executionTime,
        findingsCount: analysisResult.findings.length
      });

      // ===== Phase 4: 成果输出 =====
      this.updateWorkflowStatus(workflowId, 'generating');
      const generationResult = await this.executeGenerationPhase({
        analysis: analysisResult,
        scouting: scoutingResult,
        preFilter: preFilterResult
      });
      this.log('info', 'Generation phase completed', {
        duration: generationResult.executionTime,
        documentsGenerated: generationResult.documents.length
      });

      // 构建最终结果
      const finalResult = this.buildFinalResult({
        scouting: scoutingResult,
        preFilter: preFilterResult,
        analysis: analysisResult,
        generation: generationResult
      });

      this.updateWorkflowStatus(workflowId, 'completed');

      return finalResult;

    } catch (error) {
      this.log('error', 'Audit workflow failed', {
        workflowId,
        error: error instanceof Error ? error.message : String(error)
      });

      this.updateWorkflowStatus(workflowId, 'failed');

      return this.handleTaskFailure(error as Error);
    }
  }

  /**
   * 侦察阶段
   */
  private async executeScoutingPhase(files: DataFileInfo[]): Promise<ScoutingResult> {
    const startTime = Date.now();
    const metadata: ExcelScoutReport[] = [];
    const documentTemplates: DocumentTemplate[] = [];
    const fileRelationships: FileRelationship[] = [];

    // 并行侦察所有文件
    const scoutPromises = files.map(async (file) => {
      if (file.fileName.endsWith('.xlsx') || file.fileName.endsWith('.xls')) {
        return await this.excelScout.scoutExcelFile(file.filePath || file.fileName);
      } else if (file.fileName.endsWith('.docx')) {
        return await this.wordScout.scoutDocument(file.filePath || file.fileName);
      }
      return null;
    });

    const results = await Promise.all(scoutPromises);

    // 分类结果
    for (const result of results) {
      if (result && 'sheets' in result) {
        metadata.push(result as ExcelScoutReport);
      } else if (result && 'placeholders' in result) {
        documentTemplates.push(result as DocumentTemplate);
      }
    }

    // 构建文件关系
    for (let i = 0; i < files.length; i++) {
      for (let j = i + 1; j < files.length; j++) {
        const relationship = this.detectFileRelationship(files[i], files[j]);
        if (relationship) {
          fileRelationships.push(relationship);
        }
      }
    }

    return {
      metadata,
      documentTemplates,
      fileRelationships,
      executionTime: Date.now() - startTime
    };
  }

  /**
   * 预审阶段
   */
  private async executePreFilterPhase(context: {
    metadata: ExcelScoutReport[];
    rules: InternalControlRule[];
  }): Promise<PreFilterResult> {
    return await this.preFilterEngine.executePreFilter(
      context.metadata.map(m => ({
        fileName: m.fileName,
        filePath: m.filePath,
        sheets: m.sheets
      })),
      context.rules
    );
  }

  /**
   * AI 分析阶段
   */
  private async executeAIAnalysisPhase(context: {
    userPrompt: string;
    scoutingData: ExcelScoutReport[];
    preFilterData?: ExceptionRecord[];
    auditDepth: 'basic' | 'standard' | 'deep';
  }): Promise<AnalysisResult> {
    // 构建分析提示
    const prompt = this.buildAnalysisPrompt({
      userIntent: context.userPrompt,
      dataStructure: context.scoutingData,
      exceptions: context.preFilterData,
      depth: context.auditDepth
    });

    // 调用 AI 分析
    const analysisResponse = await this.callAIService({
      prompt,
      context: {
        depth: context.auditDepth,
        preFiltered: !!context.preFilterData
      },
      maxTokens: 4096
    });

    // 解析结果
    return {
      findings: analysisResponse.findings || [],
      recommendations: analysisResponse.recommendations || [],
      confidence: analysisResponse.confidence || 0.8,
      executionTime: 0 // TODO: 实际测量
    };
  }

  /**
   * 生成阶段
   */
  private async executeGenerationPhase(context: {
    analysis: AnalysisResult;
    scouting: ScoutingResult;
    preFilter?: PreFilterResult;
  }): Promise<GenerationResult> {
    // 准备数据
    const data = this.prepareGenerationData(context);

    // 生成文档
    const documents = await this.generateDocuments(data);

    // 生成报告
    const reportUrl = await this.generateReport({
      analysis: context.analysis,
      preFilter: context.preFilter,
      documents
    });

    return {
      documents,
      reportUrl,
      executionTime: 0 // TODO: 实际测量
    };
  }

  /**
   * 检测文件关系
   */
  private detectFileRelationship(
    file1: DataFileInfo,
    file2: DataFileInfo
  ): FileRelationship | null {
    // TODO: 实现关系检测逻辑
    return null;
  }

  /**
   * 提取内控规则
   */
  private async extractControlRules(files: DataFileInfo[]): Promise<InternalControlRule[]> {
    // TODO: 实现规则提取逻辑
    return [];
  }

  /**
   * 更新工作流状态
   */
  private updateWorkflowStatus(workflowId: string, status: AuditWorkflowState['status']): void {
    this.eventBus.emit('workflow:status:updated', { workflowId, status });
    this.log('info', `Workflow status updated: ${status}`, { workflowId });
  }

  /**
   * 构建最终结果
   */
  private buildFinalResult(phases: {
    scouting: ScoutingResult;
    preFilter?: PreFilterResult;
    analysis: AnalysisResult;
    generation: GenerationResult;
  }): TaskResult {
    return {
      success: true,
      data: {
        scouting: phases.scouting,
        preFilter: phases.preFilter,
        analysis: phases.analysis,
        generation: phases.generation
      },
      logs: this.getLogs(),
      qualityReport: {
        overallQuality: phases.analysis.confidence,
        stepReports: {},
        totalIssues: 0,
        criticalIssues: 0,
        suggestions: phases.analysis.recommendations.map(r => r.description),
        metrics: {
          totalSteps: 4,
          successfulSteps: 4,
          failedSteps: 0,
          retriedSteps: 0,
          totalTime: 0
        }
      },
      executionSummary: {
        totalSteps: 4,
        successfulSteps: 4,
        failedSteps: 0,
        retriedSteps: 0,
        totalTime: 0,
        averageStepTime: 0
      },
      metadata: {
        completedAt: Date.now(),
        sessionId: this.sessionId,
        taskId: this.generateId()
      }
    };
  }
}
```

---

### 5. Function Calling 适配器架构

#### 5.1 核心接口设计

```typescript
/**
 * 工具定义
 */
interface ToolDefinition {
  name: string;
  description: string;
  parameters?: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
      required?: boolean;
    }>;
    required?: string[];
  };
  handler: ToolHandler;
}

/**
 * 工具处理器
 */
interface ToolHandler {
  (args: any, context: ConversationContext): Promise<any>;
}

/**
 * 工具调用
 */
interface ToolCall {
  id: string;
  name: string;
  arguments: any;
}

/**
 * 工具调用结果
 */
interface ToolCallResult {
  id: string;
  success: boolean;
  output?: any;
  error?: string;
}

/**
 * 对话上下文
 */
interface ConversationContext {
  sessionId: string;
  userId?: string;
  history: ConversationMessage[];
  metadata: Record<string, any>;
}

/**
 * 对话消息
 */
interface ConversationMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}
```

#### 5.2 服务类设计

```typescript
/**
 * Function Calling 适配器
 */
class FunctionCallingAdapter {
  private tools: Map<string, ToolDefinition> = new Map();
  private conversationContexts: Map<string, ConversationContext> = new Map();

  constructor(
    private aiService: IAIService,
    private eventBus: EventBus
  ) {
    this.registerDefaultTools();
  }

  /**
   * 注册默认工具
   */
  private registerDefaultTools(): void {
    // Excel 分析工具
    this.registerTool({
      name: 'analyze_excel_structure',
      description: '分析 Excel 文件的结构，包括 sheets、columns、data types 等',
      parameters: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'Excel 文件路径'
          },
          options: {
            type: 'object',
            description: '侦察选项',
            properties: {
              sampleRows: { type: 'number', description: '采样行数' },
              detectPatterns: { type: 'boolean', description: '是否检测模式' }
            }
          }
        },
        required: ['filePath']
      },
      handler: async (args, context) => {
        return await this.excelScout.scoutExcelFile(
          args.filePath,
          args.options
        );
      }
    });

    // 异常检测工具
    this.registerTool({
      name: 'detect_anomalies',
      description: '根据内控规则检测数据中的异常',
      parameters: {
        type: 'object',
        properties: {
          dataSource: {
            type: 'array',
            description: '数据源信息',
            items: { type: 'object' }
          },
          rules: {
            type: 'array',
            description: '内控规则列表',
            items: { type: 'object' }
          }
        },
        required: ['dataSource', 'rules']
      },
      handler: async (args, context) => {
        return await this.preFilterEngine.executePreFilter(
          args.dataSource,
          args.rules
        );
      }
    });

    // 文档填充工具
    this.registerTool({
      name: 'fill_document',
      description: '将数据填充到 Word 模板中',
      parameters: {
        type: 'object',
        properties: {
          templatePath: {
            type: 'string',
            description: '模板文件路径'
          },
          data: {
            type: 'object',
            description: '填充数据'
          },
          outputPath: {
            type: 'string',
            description: '输出文件路径'
          }
        },
        required: ['templatePath', 'data']
      },
      handler: async (args, context) => {
        return await this.documentFiller.fill(args);
      }
    });

    // 数据查询工具
    this.registerTool({
      name: 'query_data',
      description: '查询和分析 Excel 数据',
      parameters: {
        type: 'object',
        properties: {
          dataSource: {
            type: 'object',
            description: '数据源'
          },
          query: {
            type: 'string',
            description: '自然语言查询'
          }
        },
        required: ['dataSource', 'query']
      },
      handler: async (args, context) => {
        return await this.queryEngine.query(args.dataSource, args.query);
      }
    });
  }

  /**
   * 注册工具
   */
  registerTool(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
    this.log('info', `Tool registered: ${tool.name}`);
  }

  /**
   * 处理对话
   */
  async handleConversation(
    userMessage: string,
    context?: Partial<ConversationContext>
  ): Promise<ConversationMessage> {
    // 获取或创建对话上下文
    const sessionId = context?.sessionId || this.generateSessionId();
    let conversationContext = this.conversationContexts.get(sessionId);

    if (!conversationContext) {
      conversationContext = {
        sessionId,
        history: [],
        metadata: context?.metadata || {}
      };
      this.conversationContexts.set(sessionId, conversationContext);
    }

    // 添加用户消息
    conversationContext.history.push({
      role: 'user',
      content: userMessage
    });

    // 调用 AI
    const response = await this.callAI(conversationContext);

    // 处理工具调用
    if (response.toolCalls && response.toolCalls.length > 0) {
      const toolResults = await this.handleToolCalls(
        response.toolCalls,
        conversationContext
      );

      // 添加工具调用和结果到历史
      conversationContext.history.push({
        role: 'assistant',
        content: response.content,
        toolCalls: response.toolCalls
      });

      for (const result of toolResults) {
        conversationContext.history.push({
          role: 'tool',
          content: JSON.stringify(result.output || result.error),
          toolCallId: result.id
        });
      }

      // 再次调用 AI 获取最终响应
      const finalResponse = await this.callAI(conversationContext);

      conversationContext.history.push({
        role: 'assistant',
        content: finalResponse.content
      });

      return finalResponse;
    }

    // 添加助手响应到历史
    conversationContext.history.push({
      role: 'assistant',
      content: response.content
    });

    return response;
  }

  /**
   * 处理工具调用
   */
  async handleToolCalls(
    toolCalls: ToolCall[],
    context: ConversationContext
  ): Promise<ToolCallResult[]> {
    const results: ToolCallResult[] = [];

    for (const call of toolCalls) {
      const tool = this.tools.get(call.name);

      if (!tool) {
        results.push({
          id: call.id,
          success: false,
          error: `Unknown tool: ${call.name}`
        });
        continue;
      }

      this.log('info', `Executing tool: ${call.name}`, {
        arguments: call.arguments
      });

      // 发送事件
      this.eventBus.emit('tool:started', {
        toolName: call.name,
        toolCallId: call.id
      });

      try {
        const output = await tool.handler(call.arguments, context);

        results.push({
          id: call.id,
          success: true,
          output
        });

        // 发送事件
        this.eventBus.emit('tool:completed', {
          toolName: call.name,
          toolCallId: call.id,
          output
        });

      } catch (error) {
        results.push({
          id: call.id,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });

        // 发送事件
        this.eventBus.emit('tool:failed', {
          toolName: call.name,
          toolCallId: call.id,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return results;
  }

  /**
   * 调用 AI
   */
  private async callAI(
    context: ConversationContext
  ): Promise<ConversationMessage> {
    // 构建工具定义
    const tools = Array.from(this.tools.values()).map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }));

    // 调用 AI 服务
    const response = await this.aiService.analyze({
      prompt: context.history[context.history.length - 1].content,
      context: {
        history: context.history,
        tools
      },
      maxTokens: 4096
    });

    // 解析响应
    const message: ConversationMessage = {
      role: 'assistant',
      content: response.content || ''
    };

    // 检查是否有工具调用
    if (response.toolCalls) {
      message.toolCalls = response.toolCalls;
    }

    return message;
  }

  /**
   * 生成会话 ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 记录日志
   */
  private log(level: string, message: string, context?: any): void {
    // TODO: 实现日志记录
    console.log(`[FunctionCallingAdapter] ${message}`, context);
  }
}
```

---

### 6. 自愈逻辑引擎架构

#### 6.1 核心接口设计

```typescript
/**
 * 错误类别
 */
interface ErrorCategory {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  autoFixable: boolean;
  suggestedFix: string;
  confidence: number;
}

/**
 * 修复策略
 */
interface RepairStrategy {
  type: string;
  description: string;
  action: string;
  priority: number;
  estimatedSuccessRate: number;
}

/**
 * 修复结果
 */
interface HealingResult {
  success: boolean;
  appliedStrategy: RepairStrategy;
  result?: any;
  remainingErrors: Error[];
  attemptNumber: number;
  maxAttempts: number;
  canContinue: boolean;
}

/**
 * 执行上下文
 */
interface ExecutionContext {
  sessionId: string;
  taskId: string;
  code?: string;
  data?: any;
  metadata: Record<string, any>;
}
```

#### 6.2 服务类设计

```typescript
/**
 * 自愈引擎
 */
class SelfHealingEngine {
  private errorPatterns: Map<string, ErrorCategory> = new Map();
  private repairStrategies: Map<string, RepairStrategy[]> = new Map();

  constructor(
    private aiService: IAIService,
    private codeGenerator: CodeGeneratorService
  ) {
    this.initializeErrorPatterns();
  }

  /**
   * 初始化错误模式
   */
  private initializeErrorPatterns(): void {
    // KeyError - 列名问题
    this.errorPatterns.set('KeyError', {
      type: 'ColumnNotFound',
      severity: 'medium',
      autoFixable: true,
      suggestedFix: '检查列名拼写或使用可用列名',
      confidence: 0.8
    });

    // TypeError - 类型不匹配
    this.errorPatterns.set('TypeError', {
      type: 'TypeMismatch',
      severity: 'medium',
      autoFixable: true,
      suggestedFix: '添加类型转换',
      confidence: 0.7
    });

    // NameError - 变量未定义
    this.errorPatterns.set('NameError', {
      type: 'VariableNotFound',
      severity: 'medium',
      autoFixable: true,
      suggestedFix: '检查变量名是否正确定义',
      confidence: 0.75
    });

    // SyntaxError - 语法错误
    this.errorPatterns.set('SyntaxError', {
      type: 'SyntaxError',
      severity: 'high',
      autoFixable: true,
      suggestedFix: '检查代码语法',
      confidence: 0.6
    });

    // IndentationError - 缩进错误
    this.errorPatterns.set('IndentationError', {
      type: 'IndentationError',
      severity: 'medium',
      autoFixable: true,
      suggestedFix: '检查代码缩进',
      confidence: 0.85
    });

    // AttributeError - 属性错误
    this.errorPatterns.set('AttributeError', {
      type: 'AttributeError',
      severity: 'medium',
      autoFixable: false,
      suggestedFix: '检查对象是否有该属性',
      confidence: 0.5
    });
  }

  /**
   * 处理执行错误
   */
  async handleExecutionError(
    error: Error,
    failedCode: string,
    context: ExecutionContext
  ): Promise<HealingResult> {
    this.log('info', 'Starting error healing', {
      error: error.message,
      code: failedCode.substring(0, 200)
    });

    // 1. 错误分类
    const errorCategory = this.classifyError(error);

    this.log('info', 'Error classified', {
      category: errorCategory.type,
      severity: errorCategory.severity,
      autoFixable: errorCategory.autoFixable
    });

    // 2. 选择修复策略
    const strategies = this.selectRepairStrategies(errorCategory);

    this.log('info', 'Repair strategies selected', {
      count: strategies.length,
      strategies: strategies.map(s => ({ type: s.type, priority: s.priority }))
    });

    // 3. 尝试修复
    let attemptNumber = 0;
    const maxAttempts = 3;

    for (const strategy of strategies) {
      attemptNumber++;

      this.log('info', `Attempting repair strategy ${attemptNumber}: ${strategy.type}`);

      try {
        const result = await this.applyRepairStrategy(
          strategy,
          error,
          failedCode,
          context
        );

        if (result.success) {
          this.log('info', 'Repair successful', {
            strategy: strategy.type,
            attemptNumber
          });

          return {
            success: true,
            appliedStrategy: strategy,
            result: result.output,
            remainingErrors: [],
            attemptNumber,
            maxAttempts,
            canContinue: true
          };
        }
      } catch (repairError) {
        this.log('warn', `Repair attempt ${attemptNumber} failed`, {
          error: repairError instanceof Error ? repairError.message : String(repairError)
        });
      }

      if (attemptNumber >= maxAttempts) {
        break;
      }
    }

    // 所有修复策略都失败
    this.log('error', 'All repair strategies failed');

    return {
      success: false,
      appliedStrategy: strategies[strategies.length - 1],
      remainingErrors: [error],
      attemptNumber,
      maxAttempts,
      canContinue: false
    };
  }

  /**
   * 错误分类
   */
  private classifyError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();

    // 检查已知错误模式
    for (const [pattern, category] of this.errorPatterns.entries()) {
      if (message.includes(pattern.toLowerCase())) {
        return category;
      }
    }

    // 未知错误
    return {
      type: 'UnknownError',
      severity: 'low',
      autoFixable: false,
      suggestedFix: '需要人工干预',
      confidence: 0.3
    };
  }

  /**
   * 选择修复策略
   */
  private selectRepairStrategies(category: ErrorCategory): RepairStrategy[] {
    const strategies: RepairStrategy[] = [];

    if (!category.autoFixable) {
      strategies.push({
        type: 'user_intervention',
        description: '需要用户手动修复',
        action: 'request_user_help',
        priority: 1,
        estimatedSuccessRate: 1.0
      });
      return strategies;
    }

    // 根据错误类型选择策略
    switch (category.type) {
      case 'ColumnNotFound':
        strategies.push({
          type: 'column_name_fix',
          description: '分析并修复列名引用',
          action: 'fix_column_reference',
          priority: 1,
          estimatedSuccessRate: 0.8
        });
        strategies.push({
          type: 'use_available_columns',
          description: '使用可用的列名',
          action: 'map_available_columns',
          priority: 2,
          estimatedSuccessRate: 0.7
        });
        break;

      case 'TypeMismatch':
        strategies.push({
          type: 'type_conversion',
          description: '添加类型转换',
          action: 'convert_types',
          priority: 1,
          estimatedSuccessRate: 0.75
        });
        break;

      case 'SyntaxError':
      case 'IndentationError':
        strategies.push({
          type: 'code_fix',
          description: '使用 AI 修复语法错误',
          action: 'ai_fix_syntax',
          priority: 1,
          estimatedSuccessRate: 0.65
        });
        break;

      default:
        strategies.push({
          type: 'regenerate_code',
          description: '重新生成代码',
          action: 'regenerate',
          priority: 1,
          estimatedSuccessRate: 0.6
        });
    }

    return strategies;
  }

  /**
   * 应用修复策略
   */
  private async applyRepairStrategy(
    strategy: RepairStrategy,
    error: Error,
    failedCode: string,
    context: ExecutionContext
  ): Promise<{ success: boolean; output?: any }> {
    switch (strategy.type) {
      case 'column_name_fix':
        return await this.fixColumnNameError(error, failedCode, context);

      case 'type_conversion':
        return await this.fixTypeError(error, failedCode, context);

      case 'code_fix':
        return await this.fixSyntaxError(error, failedCode, context);

      case 'regenerate_code':
        return await this.regenerateCode(error, failedCode, context);

      case 'user_intervention':
        return {
          success: false
        };

      default:
        return {
          success: false
        };
    }
  }

  /**
   * 修复列名错误
   */
  private async fixColumnNameError(
    error: Error,
    failedCode: string,
    context: ExecutionContext
  ): Promise<{ success: boolean; output?: any }> {
    // 提取错误中的列名
    const match = error.message.match(/key "?(\w+)"?/i);
    if (!match) {
      return { success: false };
    }

    const wrongColumnName = match[1];

    // 获取可用的列名
    const availableColumns = Object.keys(context.data || {});

    // 使用 AI 找到最接近的列名
    const prompt = `
错误的列名: ${wrongColumnName}

可用的列名: ${availableColumns.join(', ')}

请找到最匹配的列名并返回修复建议。
    `;

    const response = await this.aiService.analyze({
      prompt,
      context: { availableColumns, wrongColumnName },
      maxTokens: 256
    });

    // 替换列名
    const fixedCode = failedCode.replace(
      new RegExp(`'?${wrongColumnName}'?`, 'g'),
      response.content
    );

    // 重新执行修复后的代码
    const result = await this.executeCode(fixedCode, context);

    return {
      success: true,
      output: result
    };
  }

  /**
   * 修复类型错误
   */
  private async fixTypeError(
    error: Error,
    failedCode: string,
    context: ExecutionContext
  ): Promise<{ success: boolean; output?: any }> {
    // 使用 AI 添加类型转换
    const prompt = `
代码执行时出现类型错误: ${error.message}

原始代码:
${failedCode}

请修复类型错误，添加必要的类型转换。
    `;

    const response = await this.codeGenerator.generateCode({
      prompt,
      context: { originalCode: failedCode, error: error.message },
      maxTokens: 2048
    });

    // 执行修复后的代码
    const result = await this.executeCode(response.code, context);

    return {
      success: true,
      output: result
    };
  }

  /**
   * 修复语法错误
   */
  private async fixSyntaxError(
    error: Error,
    failedCode: string,
    context: ExecutionContext
  ): Promise<{ success: boolean; output?: any }> {
    // 使用 AI 修复语法错误
    const prompt = `
代码执行时出现语法错误: ${error.message}

原始代码:
${failedCode}

请修复语法错误。
    `;

    const response = await this.codeGenerator.generateCode({
      prompt,
      context: { originalCode: failedCode, error: error.message },
      maxTokens: 2048
    });

    // 执行修复后的代码
    const result = await this.executeCode(response.code, context);

    return {
      success: true,
      output: result
    };
  }

  /**
   * 重新生成代码
   */
  private async regenerateCode(
    error: Error,
    failedCode: string,
    context: ExecutionContext
  ): Promise<{ success: boolean; output?: any }> {
    // 使用原始提示重新生成代码
    const response = await this.codeGenerator.generateCode({
      prompt: context.metadata.originalPrompt || '',
      context: {
        ...context.metadata,
        previousError: error.message,
        previousCode: failedCode
      },
      maxTokens: 2048
    });

    // 执行新代码
    const result = await this.executeCode(response.code, context);

    return {
      success: true,
      output: result
    };
  }

  /**
   * 执行代码
   */
  private async executeCode(code: string, context: ExecutionContext): Promise<any> {
    // TODO: 实现代码执行逻辑
    return null;
  }

  /**
   * 记录日志
   */
  private log(level: string, message: string, context?: any): void {
    console.log(`[SelfHealingEngine] ${message}`, context);
  }
}
```

---

## ⚠️ 风险评估与缓解

### 1. 技术风险

#### 1.1 Pyodide 内存限制（🔴 高风险）

**问题描述**:
- 浏览器内存限制（通常 < 2GB）
- 大文件处理可能导致页面崩溃
- Python WASM 模块占用较大内存

**影响范围**:
- Excel 侦察兵服务
- 数据流编排器
- 四阶段总控引擎

**缓解措施**:
1. **流式处理** (实施优先级: P0)
   ```typescript
   // 分块读取和处理大文件
   async processLargeFileInChunks(filePath: string, chunkSize = 10000) {
     const chunks = await this.splitFileIntoChunks(filePath, chunkSize);
     for (const chunk of chunks) {
       await this.processChunk(chunk);
       // 显式释放内存
       await this.pyodideService.runPython('import gc; gc.collect()');
     }
   }
   ```

2. **文件大小限制** (实施优先级: P0)
   ```typescript
   const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
   if (file.size > MAX_FILE_SIZE) {
     throw new Error('File too large. Please use backend processing mode.');
   }
   ```

3. **内存监控** (实施优先级: P1)
   ```typescript
   // 定期检查内存使用
   setInterval(() => {
     const usage = performance.memory?.usedJSHeapSize || 0;
     if (usage > WARNING_THRESHOLD) {
       this.triggerMemoryCleanup();
     }
   }, 5000);
   ```

4. **降级方案** (实施优先级: P0)
   ```typescript
   // 提供后端处理选项
   if (file.size > MAX_FILE_SIZE) {
     return await this.processViaBackend(file);
   }
   ```

**成功指标**:
- ✅ 内存峰值 < 80% 可用内存
- ✅ 50MB 文件稳定处理
- ✅ 内存泄漏 < 1MB/小时

---

#### 1.2 AI 输出稳定性（🟡 中风险）

**问题描述**:
- AI 生成的代码可能不正确
- 代码执行失败率较高
- 需要多轮迭代才能成功

**影响范围**:
- 所有 AI 驱动的服务
- Function Calling 适配器
- 自愈逻辑引擎

**缓解措施**:
1. **Few-Shot 示例** (实施优先级: P0)
   ```typescript
   const prompt = `
请根据以下示例生成数据处理代码：

示例1:
输入: "计算所有行的总和"
输出:
\`\`\`python
result = data.sum()
\`\`\`

示例2:
输入: "筛选金额大于1000的记录"
输出:
\`\`\`python
result = data[data['金额'] > 1000]
\`\`\`

任务: ${userPrompt}
   `;
   ```

2. **输出验证** (实施优先级: P0)
   ```typescript
   // 验证生成的代码
   async validateGeneratedCode(code: string): Promise<ValidationResult> {
     // 语法检查
     const syntaxCheck = await this.checkSyntax(code);
     if (!syntaxCheck.valid) {
       return { valid: false, errors: syntaxCheck.errors };
     }

     // 安全检查
     const securityCheck = await this.checkSecurity(code);
     if (!securityCheck.safe) {
       return { valid: false, errors: securityCheck.violations };
     }

     return { valid: true };
   }
   ```

3. **自愈逻辑** (实施优先级: P0)
   - 已在 P0-6 中实现

4. **人工确认机制** (实施优先级: P1)
   ```typescript
   // 对于复杂操作，请求用户确认
   if (complexity > HIGH_COMPLEXITY_THRESHOLD) {
     const confirmed = await this.requestUserConfirmation(plan);
     if (!confirmed) {
       return await this.generateSimplifiedPlan();
     }
   }
   ```

**成功指标**:
- ✅ 代码生成成功率 >85%
- ✅ 自愈修复率 >70%
- ✅ 平均重试次数 <2

---

#### 1.3 Function Calling 复杂度（🟡 中风险）

**问题描述**:
- 工具调用链可能很复杂
- 错误处理难度大
- 上下文管理复杂

**影响范围**:
- Function Calling 适配器
- 对话管理
- 工具注册表

**缓解措施**:
1. **渐进式实施** (实施优先级: P0)
   ```typescript
   // Phase 1: 单层工具调用
   // Phase 2: 双层工具调用
   // Phase 3: 多层工具调用（最多3层）
   const MAX_TOOL_CALL_DEPTH = 3;
   ```

2. **详细的日志** (实施优先级: P0)
   ```typescript
   // 记录所有工具调用
   this.eventBus.on('tool:*', (event) => {
     this.logger.info('Tool event', {
       type: event.type,
       toolName: event.toolName,
       timestamp: event.timestamp,
       duration: event.duration
     });
   });
   ```

3. **工具调用超时** (实施优先级: P0)
   ```typescript
   // 设置工具调用超时
   const TOOL_CALL_TIMEOUT = 30000; // 30秒
   const result = await Promise.race([
     tool.handler(args, context),
     timeout(TOOL_CALL_TIMEOUT)
   ]);
   ```

4. **人工干预机制** (实施优先级: P1)
   ```typescript
   // 在关键步骤请求用户确认
   if (tool.requiresConfirmation) {
     const confirmed = await this.requestUserConfirmation(tool, args);
     if (!confirmed) {
       return { success: false, error: 'User cancelled' };
     }
   }
   ```

**成功指标**:
- ✅ 工具调用成功率 >90%
- ✅ 平均调用时间 <5秒
- ✅ 错误恢复率 >80%

---

### 2. 性能风险

#### 2.1 大文件处理性能（🟡 中风险）

**问题描述**:
- 大文件处理时间过长
- 用户等待体验差
- 可能导致超时

**缓解措施**:
1. **并行处理** (实施优先级: P0)
   ```typescript
   // 并行处理多个文件
   const results = await Promise.all([
     this.processFile(file1),
     this.processFile(file2),
     this.processFile(file3)
   ]);
   ```

2. **增量处理** (实施优先级: P1)
   ```typescript
   // 只处理变化的数据
   const delta = await this.calculateDelta(previousData, currentData);
   const result = await this.processDelta(delta);
   ```

3. **进度反馈** (实施优先级: P0)
   ```typescript
   // 实时反馈处理进度
   for (const [index, chunk] of chunks.entries()) {
     await this.processChunk(chunk);
     this.reportProgress({
       current: index + 1,
       total: chunks.length,
       percentage: ((index + 1) / chunks.length) * 100
     });
   }
   ```

**成功指标**:
- ✅ 10MB 文件处理 <30秒
- ✅ 实时进度更新
- ✅ 用户满意度 >4.0/5.0

---

### 3. 安全风险

#### 3.1 代码执行安全（🔴 高风险）

**问题描述**:
- AI 生成的代码可能包含恶意操作
- 代码注入攻击风险
- 数据泄露风险

**缓解措施**:
1. **代码沙箱** (实施优先级: P0)
   ```typescript
   // 在 Web Worker 中执行代码
   const worker = new Worker(codeExecutorWorker, {
     type: 'module'
   });
   ```

2. **代码审查** (实施优先级: P0)
   ```typescript
   // 检查危险操作
   const dangerousPatterns = [
     /import\s+os/,
     /import\s+subprocess/,
     /eval\s*\(/,
     /exec\s*\(/,
     /__import__/
   ];

   for (const pattern of dangerousPatterns) {
     if (pattern.test(code)) {
       throw new Error('Dangerous code detected');
     }
   }
   ```

3. **资源限制** (实施优先级: P0)
   ```typescript
   // 限制执行时间和内存
   const executionConfig = {
     timeout: 5000, // 5秒
     memoryLimit: 50 * 1024 * 1024, // 50MB
     maxOutputSize: 10 * 1024 * 1024 // 10MB
   };
   ```

**成功指标**:
- ✅ 0 安全事故
- ✅ 100% 代码通过安全检查
- ✅ 资源使用 <限制

---

## 📦 交付物清单

### 1. 需要创建的服务文件

| 文件路径 | 功能描述 | 预估代码行数 | 依赖 |
|---------|---------|------------|------|
| `services/workspace/EnhancedFileSystemService.ts` | 虚拟工作台服务 | ~800 | FileSystemService |
| `services/scout/ExcelScoutService.ts` | Excel 侦察兵服务 | ~1200 | PyodideService |
| `services/scout/WordScoutService.ts` | Word 侦察兵服务 | ~600 | docxtemplaterService |
| `services/orchestration/DataFlowOrchestrator.ts` | 数据流编排器 | ~900 | EventBus, CheckpointService |
| `services/agentic/EnhancedAgenticOrchestrator.ts` | 增强的编排器 | ~1500 | AgenticOrchestrator, ExcelScoutService |
| `services/prefilter/InternalControlPreFilterEngine.ts` | 内控预审引擎 | ~1100 | PyodideService |
| `services/functionCalling/FunctionCallingAdapter.ts` | Function Calling 适配器 | ~1000 | IAIService, EventBus |
| `services/healing/SelfHealingEngine.ts` | 自愈逻辑引擎 | ~900 | IAIService, CodeGeneratorService |
| `services/performance/PerformanceOptimizer.ts` | 性能优化器 | ~500 | - |
| `types/workspaceTypes.ts` | 工作区类型定义 | ~300 | - |
| `types/scoutTypes.ts` | 侦察类型定义 | ~250 | - |
| `types/orchestrationTypes.ts` | 编排类型定义 | ~400 | - |
| `types/prefilterTypes.ts` | 预审类型定义 | ~300 | - |
| `types/functionCallingTypes.ts` | Function Calling 类型定义 | ~250 | - |

**总计**: ~10,000 行代码

---

### 2. 需要修改的服务文件

| 文件路径 | 修改内容 | 预估代码行数 |
|---------|---------|------------|
| `services/agentic/AgenticOrchestrator.ts` | 集成四阶段模型 | +500 |
| `services/wasm/PyodideService.ts` | 内存优化 | +200 |
| `services/infrastructure/cacheService.ts` | 增强缓存策略 | +150 |
| `services/index.ts` | 导出新服务 | +100 |

**总计**: ~950 行新增代码

---

### 3. 测试文件

| 文件路径 | 测试内容 | 预估代码行数 |
|---------|---------|------------|
| `services/workspace/__tests__/EnhancedFileSystemService.test.ts` | 单元测试 | ~600 |
| `services/scout/__tests__/ExcelScoutService.test.ts` | 单元测试 | ~800 |
| `services/orchestration/__tests__/DataFlowOrchestrator.test.ts` | 单元测试 | ~700 |
| `services/agentic/__tests__/EnhancedAgenticOrchestrator.test.ts` | 单元测试 | ~900 |
| `services/prefilter/__tests__/InternalControlPreFilterEngine.test.ts` | 单元测试 | ~750 |
| `services/functionCalling/__tests__/FunctionCallingAdapter.test.ts` | 单元测试 | ~850 |
| `services/healing/__tests__/SelfHealingEngine.test.ts` | 单元测试 | ~700 |
| `integration/__tests__/auditWorkflow.test.ts` | 集成测试 | ~1200 |

**总计**: ~6,500 行测试代码

---

### 4. 文档文件

| 文件路径 | 文档内容 | 预估字数 |
|---------|---------|---------|
| `docs/BACKEND_PHASE2_API_REFERENCE.md` | API 参考文档 | ~8000 |
| `docs/BACKEND_PHASE2_ARCHITECTURE.md` | 架构设计文档 | ~6000 |
| `docs/BACKEND_PHASE2_DEPLOYMENT_GUIDE.md` | 部署指南 | ~4000 |
| `docs/BACKEND_PHASE2_TESTING_GUIDE.md` | 测试指南 | ~5000 |
| `services/workspace/README.md` | 服务说明 | ~1500 |
| `services/scout/README.md` | 服务说明 | ~1200 |
| `services/orchestration/README.md` | 服务说明 | ~1500 |
| `services/prefilter/README.md` | 服务说明 | ~1200 |
| `services/functionCalling/README.md` | 服务说明 | ~1500 |
| `services/healing/README.md` | 服务说明 | ~1200 |

**总计**: ~32,400 字文档

---

## 📅 实施时间表

### Phase 1: 基础增强（第1-3周）

**目标**: 夯实基础能力

| 任务 | 负责人 | 开始 | 结束 | 状态 |
|------|--------|------|------|------|
| 虚拟工作台优化 | Backend | Week 1 Day 1 | Week 1 Day 5 | ⏳ 待开始 |
| Excel 侦察兵增强 | Backend | Week 2 Day 1 | Week 2 Day 5 | ⏳ 待开始 |
| Word 侦察兵实现 | Backend | Week 2 Day 1 | Week 2 Day 5 | ⏳ 待开始 |
| Prompt 增强服务 | Backend | Week 1 Day 1 | Week 1 Day 3 | ⏳ 待开始 |

**里程碑**: 基础侦察能力完成

---

### Phase 2: 核心功能（第4-7周）

**目标**: 实现关键能力

| 任务 | 负责人 | 开始 | 结束 | 状态 |
|------|--------|------|------|------|
| 数据流编排器 | Backend | Week 4 Day 1 | Week 5 Day 3 | ⏳ 待开始 |
| 总控引擎四阶段模型 | Backend | Week 5 Day 1 | Week 6 Day 3 | ⏳ 待开始 |
| 自愈逻辑完善 | Backend | Week 6 Day 1 | Week 6 Day 5 | ⏳ 待开始 |

**里程碑**: 核心编排能力完成

---

### Phase 3: 高级功能（第8-10周）

**目标**: 打造差异化竞争力

| 任务 | 负责人 | 开始 | 结束 | 状态 |
|------|--------|------|------|------|
| 内控预审引擎 | Backend | Week 8 Day 1 | Week 9 Day 4 | ⏳ 待开始 |
| Function Calling 适配器 | Backend | Week 8 Day 1 | Week 10 Day 2 | ⏳ 待开始 |

**里程碑**: 高级功能完成

---

### Phase 4: 完善优化（第11-12周）

**目标**: 生产就绪

| 任务 | 负责人 | 开始 | 结束 | 状态 |
|------|--------|------|------|------|
| 性能优化 | Backend | Week 11 Day 1 | Week 11 Day 5 | ⏳ 待开始 |
| 测试和部署 | Fullstack | Week 12 Day 1 | Week 12 Day 5 | ⏳ 待开始 |

**里程碑**: 系统上线

---

## 🎯 成功标准

### 技术指标

| 指标 | 当前值 | 目标值 | 测量方式 |
|------|--------|--------|---------|
| 代码生成成功率 | ~60% | >85% | 统计首次执行成功率 |
| 自愈修复率 | 0% | >70% | 统计自动修复成功次数 |
| 多文件支持 | ❌ | ✅ | 功能验收 |
| 审计工作流 | ❌ | ✅ | 功能验收 |
| Function Calling | ❌ | ✅ | 功能验收 |
| 单元测试覆盖率 | ~40% | >80% | Codecov |
| 集成测试覆盖率 | ~20% | >60% | Codecov |

### 业务指标

| 指标 | 目标值 | 测量方式 |
|------|--------|---------|
| 用户满意度 | >4.0/5.0 | 用户调研 |
| 功能使用率 | >60% | 行为分析 |
| 审计效率提升 | +200% | 用户反馈 |
| 系统稳定性 | >99% | 监控数据 |

---

## 📝 总结

本实施计划基于综合评估文档，为 ExcelMind AI 后端系统提供了详细的优化路线图。通过实施本计划，系统将从**单文件处理工具**升级为**智能审计工作流引擎**，在市场上形成显著竞争优势。

### 核心价值

1. **系统性提升** - 从工具到生态系统的完整升级
2. **审计专业性** - 深度理解审计工作本质
3. **技术可行性** - 方案务实，风险可控
4. **架构优雅性** - 与现有架构高度兼容

### 关键成功因素

- ✅ 严格遵循 SOLID 原则
- ✅ 充分的测试覆盖
- ✅ 渐进式实施策略
- ✅ 持续的风险监控
- ✅ 及时的用户反馈

### 下一步行动

1. 立即启动 Phase 1 任务
2. 组建后端开发团队
3. 建立每日站会机制
4. 设置 CI/CD 流程
5. 准备开发环境和测试数据

---

**文档版本**: v1.0
**创建日期**: 2026-01-24
**最后更新**: 2026-01-24
**技术负责人**: Backend Technical Lead
**状态**: ✅ 计划完成，待审批

🎯 **准备就绪，等待启动指令！**
