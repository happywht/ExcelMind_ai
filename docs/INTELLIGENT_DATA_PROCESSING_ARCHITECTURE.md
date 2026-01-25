# 智能数据处理增强模块 - 技术架构设计

## 文档版本

- **版本**: 1.0.0
- **日期**: 2025-01-25
- **作者**: 首席架构师
- **状态**: 设计完成

---

## 目录

1. [系统概述](#系统概述)
2. [架构设计](#架构设计)
3. [数据模型设计](#数据模型设计)
4. [API接口设计](#api接口设计)
5. [核心类设计](#核心类设计)
6. [TypeScript类型定义](#typescript类型定义)
7. [与现有系统集成](#与现有系统集成)
8. [性能与扩展性](#性能与扩展性)
9. [安全考虑](#安全考虑)
10. [实施路线图](#实施路线图)

---

## 系统概述

### 功能定位

智能数据处理增强模块是ExcelMind AI系统的Phase 2核心功能，通过AI驱动的数据质量分析、清洗建议生成和自动化清洗执行，为用户提供智能化的数据预处理能力。

### 核心价值

- **智能化**: 基于AI理解数据特征，自动生成清洗策略
- **可解释**: 每个清洗建议都有详细的理由说明
- **可控性**: 用户可选择、调整和确认清洗策略
- **可追溯**: 完整的清洗历史记录，支持撤销操作
- **高性能**: 优化的算法和大数据处理能力

### 系统能力

```
输入: Excel文件 (单个或多个)
  │
  ├─ 自动检测数据问题
  │   ├─ 缺失值检测
  │   ├─ 异常值检测
  │   ├─ 重复行检测
  │   └─ 格式不一致检测
  │
  ├─ AI生成清洗建议
  │   ├─ 基于数据特征分析
  │   ├─ 多种策略供选择
  │   └─ 影响评估和解释
  │
  ├─ 一键执行清洗
  │   ├─ 用户确认策略
  │   ├─ 自动执行清洗
  │   └─ 生成清洗报告
  │
  └─ 输出: 清洗后的数据 + 清洗报告
```

---

## 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        UI Layer (React)                         │
│  - DataQualityPanel Component                                    │
│  - 问题可视化展示                                                │
│  - 清洗建议交互界面                                              │
│  - 清洗历史查看                                                  │
└─────────────────────────────┬───────────────────────────────────┘
                              │ REST API
┌─────────────────────────────▼───────────────────────────────────┐
│                    API Gateway Layer                            │
│  - 认证授权                                                      │
│  - 请求验证                                                      │
│  - 响应组装                                                      │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                   Controller Layer                              │
│  - DataQualityController                                        │
│  - 请求处理、响应封装                                            │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                    Service Layer                               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │     DataQualityService (门面服务)                         │  │
│  │  - 协调各子服务                                             │  │
│  │  - 管理清洗工作流                                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐           │
│  │  DataQuality │   Cleaning    │   Cleaning    │           │
│  │   Analyzer   │  Suggestion   │   Executor    │           │
│  │              │    Engine     │              │           │
│  └──────────────┘ └──────────────┘ └──────────────┘           │
│                                                                  │
│  ┌──────────────┐ ┌──────────────┐                             │
│  │   History    │     Pattern    │                             │
│  │   Manager    │   Detector    │                             │
│  └──────────────┘ └──────────────┘                             │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                  Infrastructure Layer                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│  │     AI      │    Cache     │   Storage    │              │
│  │   Service   │   Service    │   Service    │              │
│  │             │             │             │              │
│  │  - ZhipuAI  │  - Memory    │  - IndexedDB │              │
│  │  - Anthropic│  - LocalStg  │  - FileSyst  │              │
│  └─────────────┘ └─────────────┘ └─────────────┘              │
│                                                                  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│  │    Retry    │   Logger     │   Event      │              │
│  │  Strategy   │   Service    │    Bus       │              │
│  └─────────────┘ └─────────────┘ └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

### 模块划分

#### 1. 数据质量分析模块 (DataQualityAnalyzer)

**职责**: 自动检测Excel数据中的质量问题

**核心功能**:
- 缺失值检测 (MissingValueDetector)
- 异常值检测 (OutlierDetector)
- 重复行检测 (DuplicateDetector)
- 格式一致性检测 (FormatConsistencyDetector)

**输入**:
- Excel数据 (原始数据)
- 分析配置 (可选的检测规则)

**输出**:
- DataQualityReport (质量报告)
- Issue[] (检测到的问题列表)

#### 2. 清洗建议引擎 (CleaningSuggestionEngine)

**职责**: 基于检测结果和数据特征，生成AI驱动的清洗建议

**核心功能**:
- 问题严重性评估
- 多策略生成
- 影响预测
- 理由解释

**输入**:
- DataQualityReport
- 数据样本
- 用户偏好 (可选)

**输出**:
- CleaningSuggestion[] (清洗建议列表)
- Recommendation (推荐策略)

#### 3. 数据清洗执行器 (DataCleaner)

**职责**: 执行用户选择的清洗策略

**核心功能**:
- 策略执行
- 进度跟踪
- 结果验证
- 错误处理

**输入**:
- 原始数据
- CleaningStrategy (选定的清洗策略)

**输出**:
- 清洗后的数据
- ExecutionReport (执行报告)

#### 4. 清洗历史管理器 (CleaningHistoryManager)

**职责**: 管理清洗操作的历史记录

**核心功能**:
- 操作记录存储
- 历史查询
- 撤销操作
- 统计分析

**输入**:
- 清洗操作记录

**输出**:
- CleaningHistoryEntry[] (历史记录列表)
- 统计数据

### 数据流向

```
用户上传Excel文件
  │
  ▼
读取Excel数据 (使用现有的excelService)
  │
  ▼
DataQualityAnalyzer.analyze()
  ├─ MissingValueDetector
  ├─ OutlierDetector
  ├─ DuplicateDetector
  └─ FormatConsistencyDetector
  │
  ▼
生成 DataQualityReport
  │
  ▼
CleaningSuggestionEngine.generateSuggestions()
  ├─ 分析数据特征
  ├─ 调用AI服务生成策略
  └─ 评估影响
  │
  ▼
返回 CleaningSuggestion[] 给用户
  │
  ├─ 用户查看建议
  ├─ 用户选择策略
  └─ 用户确认执行
  │
  ▼
DataCleaner.execute()
  ├─ 应用清洗策略
  ├─ 验证结果
  └─ 生成报告
  │
  ▼
保存清洗历史 (CleaningHistoryManager)
  │
  ▼
返回清洗后的数据 + 清洗报告
```

---

## 数据模型设计

### 1. 数据质量报告

```typescript
interface DataQualityReport {
  /** 报告ID */
  reportId: string;
  /** 文件名 */
  fileName: string;
  /** Sheet名称 */
  sheetName: string;
  /** 总行数 */
  totalRows: number;
  /** 总列数 */
  totalColumns: number;
  /** 检测时间戳 */
  timestamp: number;
  /** 数据质量评分 (0-100) */
  qualityScore: number;
  /** 检测到的问题 */
  issues: DataQualityIssue[];
  /** 各列的统计信息 */
  columnStats: ColumnStatistics[];
  /** 数据样本 (用于AI分析) */
  dataSample?: any[];
}
```

### 2. 数据质量问题

```typescript
interface DataQualityIssue {
  /** 问题ID */
  issueId: string;
  /** 问题类型 */
  issueType: DataQualityIssueType;
  /** 严重程度 */
  severity: 'critical' | 'high' | 'medium' | 'low';
  /** 影响的列 */
  affectedColumns: string[];
  /** 影响的行 */
  affectedRows: number[];
  /** 问题描述 */
  description: string;
  /** 问题统计 */
  statistics: IssueStatistics;
  /** 建议的清洗策略 (预生成) */
  suggestedStrategies?: CleaningStrategy[];
}

enum DataQualityIssueType {
  MISSING_VALUE = 'missing_value',
  OUTLIER = 'outlier',
  DUPLICATE_ROW = 'duplicate_row',
  FORMAT_INCONSISTENCY = 'format_inconsistency',
  INVALID_TYPE = 'invalid_type',
  DATA_INCONSISTENCY = 'data_inconsistency'
}

interface IssueStatistics {
  /** 影响的行数 */
  affectedRowCount: number;
  /** 影响的百分比 */
  affectedPercentage: number;
  /** 问题分布 */
  distribution: { [key: string]: number };
}
```

### 3. 清洗建议

```typescript
interface CleaningSuggestion {
  /** 建议ID */
  suggestionId: string;
  /** 关联的问题ID */
  issueId: string;
  /** 建议的策略 */
  strategy: CleaningStrategy;
  /** 优先级 (0-1, 越高越推荐) */
  priority: number;
  /** AI生成的推荐理由 */
  reasoning: string;
  /** 预期效果 */
  expectedImpact: ImpactAssessment;
  /** 风险等级 */
  riskLevel: 'low' | 'medium' | 'high';
  /** 执行估算 */
  executionEstimate: {
    estimatedTime: number; // 毫秒
    complexity: 'simple' | 'moderate' | 'complex';
  };
}

interface CleaningStrategy {
  /** 策略ID */
  strategyId: string;
  /** 策略名称 */
  name: string;
  /** 策略类型 */
  type: StrategyType;
  /** 策略描述 */
  description: string;
  /** 策略参数 */
  parameters: StrategyParameters;
  /** 执行代码 (Python或JavaScript) */
  executionCode?: string;
}

enum StrategyType {
  /** 删除 */
  DELETE = 'delete',
  /** 填充 */
  FILL = 'fill',
  /** 替换 */
  REPLACE = 'replace',
  /** 标准化 */
  STANDARDIZE = 'standardize',
  /** 转换 */
  TRANSFORM = 'transform',
  /** 合并 */
  MERGE = 'merge',
  /** 拆分 */
  SPLIT = 'split'
}

interface StrategyParameters {
  /** 目标列 */
  targetColumn: string;
  /** 操作类型 */
  operation: string;
  /** 参数值 */
  value?: any;
  /** 条件 */
  condition?: string;
  /** 选项 */
  options?: { [key: string]: any };
}

interface ImpactAssessment {
  /** 数据保留率 */
  dataRetentionRate: number;
  /** 质量改善度 */
  qualityImprovement: number;
  /** 受影响的行数 */
  affectedRows: number;
  /** 副作用 */
  sideEffects?: string[];
}
```

### 4. 清洗历史

```typescript
interface CleaningHistoryEntry {
  /** 操作ID */
  operationId: string;
  /** 时间戳 */
  timestamp: number;
  /** 文件名 */
  fileName: string;
  /** Sheet名称 */
  sheetName: string;
  /** 执行的策略 */
  strategy: CleaningStrategy;
  /** 执行前状态 */
  beforeState: DataSnapshot;
  /** 执行后状态 */
  afterState: DataSnapshot;
  /** 执行报告 */
  executionReport: ExecutionReport;
  /** 用户反馈 */
  userFeedback?: {
    satisfied: boolean;
    rating?: number;
    comments?: string;
  };
}

interface DataSnapshot {
  /** 总行数 */
  totalRows: number;
  /** 质量评分 */
  qualityScore: number;
  /** 问题摘要 */
  issueSummary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

interface ExecutionReport {
  /** 状态 */
  status: 'success' | 'partial' | 'failed';
  /** 开始时间 */
  startTime: number;
  /** 结束时间 */
  endTime: number;
  /** 执行时长 */
  duration: number;
  /** 处理的行数 */
  processedRows: number;
  /** 成功处理的行数 */
  successRows: number;
  /** 失败的行数 */
  failedRows: number;
  /** 错误信息 */
  errors?: ExecutionError[];
  /** 警告信息 */
  warnings?: string[];
}

interface ExecutionError {
  /** 行号 */
  row: number;
  /** 列名 */
  column?: string;
  /** 错误消息 */
  message: string;
  /** 错误类型 */
  errorType: string;
}
```

---

## API接口设计

### 1. 分析数据质量

**端点**: `POST /api/v1/data-quality/analyze`

**描述**: 分析Excel文件的数据质量，检测各种问题

**请求体**:

```json
{
  "file": "<base64_encoded_file>",
  "fileName": "sales_data.xlsx",
  "sheetName": "Sheet1", // 可选，默认第一个sheet
  "options": {
    "sampleSize": 1000, // 采样大小，用于快速分析
    "detectMissing": true,
    "detectOutliers": true,
    "detectDuplicates": true,
    "detectFormat": true,
    "customRules": [] // 自定义检测规则
  }
}
```

**响应**: `200 OK`

```json
{
  "success": true,
  "data": {
    "reportId": "dq_report_1737820800000_abc123",
    "fileName": "sales_data.xlsx",
    "sheetName": "Sheet1",
    "totalRows": 5000,
    "totalColumns": 15,
    "timestamp": 1737820800000,
    "qualityScore": 72,
    "issues": [
      {
        "issueId": "issue_001",
        "issueType": "missing_value",
        "severity": "high",
        "affectedColumns": ["email", "phone"],
        "affectedRows": [3, 7, 15, 23, 45, ...],
        "description": "发现缺失的联系方式信息",
        "statistics": {
          "affectedRowCount": 234,
          "affectedPercentage": 4.68,
          "distribution": {
            "email": 120,
            "phone": 114
          }
        }
      },
      {
        "issueId": "issue_002",
        "issueType": "outlier",
        "severity": "medium",
        "affectedColumns": ["amount"],
        "affectedRows": [89, 234, 456],
        "description": "检测到异常的交易金额",
        "statistics": {
          "affectedRowCount": 3,
          "affectedPercentage": 0.06,
          "distribution": {
            "amount": 3
          }
        }
      }
    ],
    "columnStats": [
      {
        "columnName": "amount",
        "dataType": "number",
        "nullCount": 0,
        "uniqueCount": 4850,
        "min": 10.5,
        "max": 999999.99,
        "mean": 5423.67,
        "median": 3210.45,
        "stdDev": 12345.67
      }
    ]
  },
  "meta": {
    "requestId": "req_1737820800000_xyz",
    "timestamp": "2025-01-25T10:00:00Z",
    "version": "1.0"
  }
}
```

### 2. 生成清洗建议

**端点**: `POST /api/v1/data-quality/suggestions`

**描述**: 基于质量报告，使用AI生成清洗建议

**请求体**:

```json
{
  "reportId": "dq_report_1737820800000_abc123",
  "options": {
    "maxSuggestions": 3, // 每个问题最多建议数量
    "considerUserContext": true,
    "explainReasoning": true
  }
}
```

**响应**: `200 OK`

```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "suggestionId": "sugg_001",
        "issueId": "issue_001",
        "strategy": {
          "strategyId": "strat_fill_mean",
          "name": "使用平均值填充",
          "type": "fill",
          "description": "对于数值列，使用列的平均值填充缺失值",
          "parameters": {
            "targetColumn": "amount",
            "operation": "fill_mean",
            "options": {
              "onlyIfMissing": true
            }
          },
          "executionCode": "import pandas as pd\nimport json\n\ndef clean_data(files):\n    df = pd.DataFrame(files['sales_data.xlsx'])\n    df['amount'] = df['amount'].fillna(df['amount'].mean())\n    files['sales_data.xlsx'] = df.to_dict('records')\n    return json.dumps(files, ensure_ascii=False, default=str)\n\nprint(clean_data(files))"
        },
        "priority": 0.92,
        "reasoning": "该列的数据分布相对均匀（标准差较小），使用平均值填充不会显著影响整体统计特性。考虑到这是交易金额，平均值填充能保持总金额的准确性。",
        "expectedImpact": {
          "dataRetentionRate": 1.0,
          "qualityImprovement": 15,
          "affectedRows": 120,
          "sideEffects": ["略微改变平均值"]
        },
        "riskLevel": "low",
        "executionEstimate": {
          "estimatedTime": 500,
          "complexity": "simple"
        }
      },
      {
        "suggestionId": "sugg_002",
        "issueId": "issue_001",
        "strategy": {
          "strategyId": "strat_delete_rows",
          "name": "删除包含缺失值的行",
          "type": "delete",
          "description": "完全删除包含缺失值的行",
          "parameters": {
            "targetColumn": "email",
            "operation": "delete_rows",
            "condition": "email is null"
          }
        },
        "priority": 0.45,
        "reasoning": "虽然删除可以保证数据完整性，但会导致4.68%的数据丢失。如果这部分数据不重要，可以考虑删除。但建议优先考虑填充策略。",
        "expectedImpact": {
          "dataRetentionRate": 0.9532,
          "qualityImprovement": 20,
          "affectedRows": 234
        },
        "riskLevel": "medium",
        "executionEstimate": {
          "estimatedTime": 200,
          "complexity": "simple"
        }
      }
    ],
    "recommendation": {
      "suggestionId": "sugg_001",
      "reason": "该策略平衡了数据完整性和准确性，风险最低"
    }
  },
  "meta": {
    "requestId": "req_1737820800001_xyz",
    "timestamp": "2025-01-25T10:00:01Z",
    "version": "1.0"
  }
}
```

### 3. 执行数据清洗

**端点**: `POST /api/v1/data-quality/clean`

**描述**: 执行选定的清洗策略

**请求体**:

```json
{
  "fileData": {
    "fileName": "sales_data.xlsx",
    "data": [...] // 完整数据或部分数据
  },
  "strategies": [
    {
      "suggestionId": "sugg_001",
      "strategy": {
        "strategyId": "strat_fill_mean",
        "parameters": {
          "targetColumn": "amount",
          "operation": "fill_mean"
        }
      }
    }
  ],
  "options": {
    "validateAfterExecution": true,
    "generateReport": true,
    "saveToHistory": true
  }
}
```

**响应**: `200 OK`

```json
{
  "success": true,
  "data": {
    "operationId": "op_1737820800000_def456",
    "cleanedData": [...], // 清洗后的数据
    "executionReport": {
      "status": "success",
      "startTime": 1737820800000,
      "endTime": 1737820800523,
      "duration": 523,
      "processedRows": 5000,
      "successRows": 5000,
      "failedRows": 0,
      "warnings": []
    },
    "newQualityScore": 87,
    "qualityImprovement": 15
  },
  "meta": {
    "requestId": "req_1737820800002_xyz",
    "timestamp": "2025-01-25T10:00:05Z",
    "version": "1.0"
  }
}
```

### 4. 获取清洗历史

**端点**: `GET /api/v1/data-quality/history`

**描述**: 获取数据清洗操作的历史记录

**查询参数**:

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| fileName | string | 否 | 筛选特定文件 |
| startDate | number | 否 | 开始时间戳 |
| endDate | number | 否 | 结束时间戳 |
| limit | integer | 否 | 返回数量，默认20 |
| offset | integer | 否 | 偏移量，默认0 |

**响应**: `200 OK`

```json
{
  "success": true,
  "data": {
    "history": [
      {
        "operationId": "op_1737820800000_def456",
        "timestamp": 1737820800000,
        "fileName": "sales_data.xlsx",
        "sheetName": "Sheet1",
        "strategy": {
          "name": "使用平均值填充",
          "type": "fill"
        },
        "beforeState": {
          "totalRows": 5000,
          "qualityScore": 72,
          "issueSummary": {
            "critical": 0,
            "high": 2,
            "medium": 3,
            "low": 1
          }
        },
        "afterState": {
          "totalRows": 5000,
          "qualityScore": 87,
          "issueSummary": {
            "critical": 0,
            "high": 0,
            "medium": 1,
            "low": 1
          }
        },
        "executionReport": {
          "status": "success",
          "duration": 523
        }
      }
    ],
    "pagination": {
      "total": 45,
      "limit": 20,
      "offset": 0
    }
  },
  "meta": {
    "requestId": "req_1737820800003_xyz",
    "timestamp": "2025-01-25T10:01:00Z",
    "version": "1.0"
  }
}
```

### 5. 撤销清洗操作

**端点**: `POST /api/v1/data-quality/undo`

**描述**: 撤销指定的清洗操作

**请求体**:

```json
{
  "operationId": "op_1737820800000_def456",
  "restoreToSnapshot": true // 是否恢复到操作前的快照
}
```

**响应**: `200 OK`

```json
{
  "success": true,
  "data": {
    "operationId": "op_1737820800000_def456",
    "undone": true,
    "restoredData": [...], // 恢复的数据
    "message": "清洗操作已成功撤销"
  },
  "meta": {
    "requestId": "req_1737820800004_xyz",
    "timestamp": "2025-01-25T10:02:00Z",
    "version": "1.0"
  }
}
```

---

## 核心类设计

### 1. DataQualityAnalyzer

**职责**: 数据质量分析的核心类，协调各个检测器

```typescript
class DataQualityAnalyzer {
  constructor(
    private readonly detectors: DataQualityDetector[],
    private readonly aiService: IAIService,
    private readonly cacheService: ICacheService
  ) {}

  /**
   * 分析数据质量
   */
  async analyze(
    data: ExcelData,
    options?: AnalysisOptions
  ): Promise<DataQualityReport> {
    // 1. 检查缓存
    const cacheKey = this.generateCacheKey(data, options);
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    // 2. 并行执行所有检测器
    const detectionResults = await Promise.all(
      this.detectors.map(detector => detector.detect(data, options))
    );

    // 3. 聚合检测结果
    const issues = this.aggregateIssues(detectionResults);

    // 4. 生成列统计信息
    const columnStats = await this.generateColumnStats(data);

    // 5. 计算质量评分
    const qualityScore = this.calculateQualityScore(issues, data);

    // 6. 构建报告
    const report: DataQualityReport = {
      reportId: this.generateReportId(),
      fileName: data.fileName,
      sheetName: data.currentSheetName,
      totalRows: this.getTotalRows(data),
      totalColumns: this.getTotalColumns(data),
      timestamp: Date.now(),
      qualityScore,
      issues,
      columnStats,
      dataSample: this.extractSample(data)
    };

    // 7. 缓存报告
    await this.cacheService.set(cacheKey, report, 1800000); // 30分钟

    return report;
  }

  /**
   * 聚合检测结果
   */
  private aggregateIssues(
    results: DetectionResult[]
  ): DataQualityIssue[] {
    // 实现聚合逻辑
    // - 去重相似问题
    // - 合并相同类型的问题
    // - 计算严重程度
  }

  /**
   * 计算质量评分
   */
  private calculateQualityScore(
    issues: DataQualityIssue[],
    data: ExcelData
  ): number {
    // 基于问题的严重程度和数量计算评分
    const totalRows = this.getTotalRows(data);
    const penalty = issues.reduce((sum, issue) => {
      const severityWeight = {
        critical: 50,
        high: 20,
        medium: 10,
        low: 5
      };
      const affectedRatio = issue.statistics.affectedPercentage / 100;
      return sum + (severityWeight[issue.severity] * affectedRatio);
    }, 0);

    return Math.max(0, Math.min(100, 100 - penalty));
  }
}
```

### 2. CleaningSuggestionEngine

**职责**: 生成AI驱动的清洗建议

```typescript
class CleaningSuggestionEngine {
  constructor(
    private readonly aiService: IAIService,
    private readonly strategyLibrary: StrategyLibrary,
    private readonly cacheService: ICacheService
  ) {}

  /**
   * 生成清洗建议
   */
  async generateSuggestions(
    report: DataQualityReport,
    options?: SuggestionOptions
  ): Promise<CleaningSuggestion[]> {
    const suggestions: CleaningSuggestion[] = [];

    // 为每个问题生成建议
    for (const issue of report.issues) {
      const issueSuggestions = await this.generateSuggestionsForIssue(
        issue,
        report,
        options
      );
      suggestions.push(...issueSuggestions);
    }

    // 排序建议（按优先级）
    suggestions.sort((a, b) => b.priority - a.priority);

    return suggestions;
  }

  /**
   * 为单个问题生成建议
   */
  private async generateSuggestionsForIssue(
    issue: DataQualityIssue,
    report: DataQualityReport,
    options?: SuggestionOptions
  ): Promise<CleaningSuggestion[]> {
    // 1. 获取适用的策略模板
    const strategyTemplates = this.strategyLibrary.getStrategiesForIssue(
      issue.issueType
    );

    // 2. 使用AI生成个性化建议
    const aiPrompt = this.buildSuggestionPrompt(issue, report, strategyTemplates);
    const aiResponse = await this.aiService.analyze(aiPrompt);

    // 3. 解析AI响应
    const suggestions = this.parseAISuggestions(aiResponse, issue);

    // 4. 生成执行代码
    for (const suggestion of suggestions) {
      suggestion.strategy.executionCode = await this.generateExecutionCode(
        suggestion.strategy,
        report.dataSample
      );
    }

    return suggestions;
  }

  /**
   * 构建AI提示词
   */
  private buildSuggestionPrompt(
    issue: DataQualityIssue,
    report: DataQualityReport,
    strategies: CleaningStrategy[]
  ): string {
    return `
你是数据清洗专家。根据以下数据质量问题，提供清洗建议。

**问题描述**:
- 类型: ${issue.issueType}
- 严重程度: ${issue.severity}
- 影响列: ${issue.affectedColumns.join(', ')}
- 影响行数: ${issue.statistics.affectedRowCount} (${issue.statistics.affectedPercentage.toFixed(2)}%)

**数据统计**:
${JSON.stringify(report.columnStats.filter(col => issue.affectedColumns.includes(col.columnName)), null, 2)}

**可用策略**:
${strategies.map(s => `- ${s.name}: ${s.description}`).join('\n')}

**数据样本**:
${JSON.stringify(report.dataSample?.slice(0, 5), null, 2)}

请生成JSON格式的建议，包含：
1. 推荐的策略
2. 推荐理由（详细解释为什么选择这个策略）
3. 预期影响评估
4. 风险等级
5. 执行复杂度估算

输出格式：
{
  "recommendations": [
    {
      "strategy": "策略名称",
      "reasoning": "详细理由",
      "expectedImpact": {
        "dataRetentionRate": 0-1,
        "qualityImprovement": 0-100,
        "affectedRows": 数量
      },
      "riskLevel": "low|medium|high",
      "priority": 0-1
    }
  ]
}
`;
  }

  /**
   * 生成执行代码
   */
  private async generateExecutionCode(
    strategy: CleaningStrategy,
    dataSample?: any[]
  ): Promise<string> {
    const codePrompt = `
生成Python代码来执行以下数据清洗策略：

**策略**: ${strategy.name}
**类型**: ${strategy.type}
**参数**: ${JSON.stringify(strategy.parameters)}

**数据结构**:
- 变量 files 是字典，key是文件名，value是数据数组
- 每行数据是字典，key是列名

**要求**:
1. 使用pandas进行数据处理
2. 修改files字典中的数据
3. 最后输出JSON格式的files字典
4. 添加错误处理

**数据样本**:
${JSON.stringify(dataSample?.slice(0, 3), null, 2)}

生成完整的Python代码。
`;

    const response = await this.aiService.analyze(codePrompt);
    return this.extractCode(response);
  }
}
```

### 3. DataCleaner

**职责**: 执行清洗策略

```typescript
class DataCleaner {
  constructor(
    private readonly pythonExecutor: PythonExecutor,
    private readonly validator: ResultValidator
  ) {}

  /**
   * 执行清洗
   */
  async execute(
    data: ExcelData,
    strategies: CleaningStrategy[],
    options?: ExecutionOptions
  ): Promise<CleaningResult> {
    const startTime = Date.now();
    const errors: ExecutionError[] = [];
    const warnings: string[] = [];
    let processedData = { ...data };

    // 顺序执行每个策略
    for (const strategy of strategies) {
      try {
        const result = await this.executeStrategy(
          processedData,
          strategy,
          options
        );

        processedData = result.data;
        warnings.push(...result.warnings);

      } catch (error) {
        errors.push({
          row: -1,
          message: error.message,
          errorType: error.constructor.name
        });

        if (options?.stopOnError) {
          break;
        }
      }
    }

    // 验证结果
    let validationResult: ValidationResult | undefined;
    if (options?.validateAfterExecution) {
      validationResult = await this.validator.validate(processedData);
    }

    const endTime = Date.now();

    return {
      operationId: this.generateOperationId(),
      cleanedData: processedData,
      executionReport: {
        status: errors.length === 0 ? 'success' : 'partial',
        startTime,
        endTime,
        duration: endTime - startTime,
        processedRows: this.getTotalRows(data),
        successRows: this.getTotalRows(processedData),
        failedRows: errors.length,
        errors,
        warnings
      },
      validationResult
    };
  }

  /**
   * 执行单个策略
   */
  private async executeStrategy(
    data: ExcelData,
    strategy: CleaningStrategy,
    options?: ExecutionOptions
  ): Promise<{ data: ExcelData; warnings: string[] }> {
    // 如果有预生成的执行代码，使用它
    if (strategy.executionCode) {
      return await this.executeWithCode(data, strategy.executionCode);
    }

    // 否则，动态生成代码
    const code = this.generateCode(strategy);
    return await this.executeWithCode(data, code);
  }

  /**
   * 使用Python代码执行
   */
  private async executeWithCode(
    data: ExcelData,
    code: string
  ): Promise<{ data: ExcelData; warnings: string[] }> {
    // 使用现有的executeTransformation
    const datasets = { [data.fileName]: data.sheets[data.currentSheetName] };
    const result = await executeTransformation(code, datasets);

    return {
      data: {
        ...data,
        sheets: {
          ...data.sheets,
          [data.currentSheetName]: result[data.fileName]
        }
      },
      warnings: []
    };
  }
}
```

### 4. CleaningHistoryManager

**职责**: 管理清洗历史

```typescript
class CleaningHistoryManager {
  constructor(
    private readonly storageService: IStorageService,
    private readonly cacheService: ICacheService
  ) {}

  /**
   * 保存历史记录
   */
  async save(entry: CleaningHistoryEntry): Promise<void> {
    const key = `cleaning_history:${entry.operationId}`;
    await this.storageService.set(key, entry);

    // 更新索引
    await this.updateIndex(entry);
  }

  /**
   * 获取历史记录
   */
  async getHistory(filters: HistoryFilters): Promise<CleaningHistoryEntry[]> {
    // 从存储中查询符合条件的记录
    const entries = await this.storageService.query('cleaning_history', filters);

    // 排序（最新的在前）
    entries.sort((a, b) => b.timestamp - a.timestamp);

    return entries;
  }

  /**
   * 撤销操作
   */
  async undo(operationId: string): Promise<ExcelData> {
    const entry = await this.getEntry(operationId);
    if (!entry) {
      throw new Error('操作记录不存在');
    }

    // 恢复到操作前的状态
    return entry.beforeState as any;
  }

  /**
   * 获取统计信息
   */
  async getStatistics(filters?: HistoryFilters): Promise<CleaningStatistics> {
    const entries = await this.getHistory(filters || {});

    return {
      totalOperations: entries.length,
      averageQualityImprovement: this.calculateAverageImprovement(entries),
      mostUsedStrategies: this.getMostUsedStrategies(entries),
      operationFrequency: this.getOperationFrequency(entries)
    };
  }

  /**
   * 更新索引
   */
  private async updateIndex(entry: CleaningHistoryEntry): Promise<void> {
    // 更新文件名索引
    await this.storageService.addToSet('cleaning_history:files', entry.fileName);

    // 更新日期索引
    const date = new Date(entry.timestamp).toISOString().split('T')[0];
    await this.storageService.addToSet('cleaning_history:dates', date);
  }
}
```

---

## TypeScript类型定义

完整的类型定义将在 `types/dataQuality.ts` 文件中提供，包括：

### 核心类型

```typescript
// 数据质量报告
export interface DataQualityReport { ... }

// 数据质量问题
export interface DataQualityIssue { ... }
export enum DataQualityIssueType { ... }

// 清洗建议
export interface CleaningSuggestion { ... }
export interface CleaningStrategy { ... }
export enum StrategyType { ... }

// 清洗历史
export interface CleaningHistoryEntry { ... }
export interface ExecutionReport { ... }

// 列统计
export interface ColumnStatistics { ... }

// 配置选项
export interface AnalysisOptions { ... }
export interface SuggestionOptions { ... }
export interface ExecutionOptions { ... }
```

---

## 与现有系统集成

### 1. 使用现有的AI服务

```typescript
import { chatWithKnowledgeBase } from '../services/zhipuService';

class CleaningSuggestionEngine {
  async generateSuggestions(report: DataQualityReport) {
    // 使用现有的AI服务
    const prompt = this.buildPrompt(report);
    const response = await chatWithKnowledgeBase(
      prompt,
      [], // 历史对话
      '' // 知识库上下文
    );
    return this.parseResponse(response);
  }
}
```

### 2. 使用现有的Excel服务

```typescript
import { readExcelFile, exportToExcel } from '../services/excelService';

class DataQualityAnalyzer {
  async analyze(file: File) {
    // 读取Excel文件
    const excelData = await readExcelFile(file);

    // 执行分析
    const report = await this.analyzeData(excelData);

    return report;
  }
}

class DataCleaner {
  async executeCleaning(file: File, strategies: CleaningStrategy[]) {
    // 读取原始数据
    const originalData = await readExcelFile(file);

    // 执行清洗
    const result = await this.execute(originalData, strategies);

    // 导出清洗后的数据
    exportToExcel(result.cleanedData, 'cleaned_' + file.name);

    return result;
  }
}
```

### 3. 使用现有的类型系统

```typescript
import { ExcelData } from '../types';

// 直接使用现有的ExcelData类型
interface DataQualityReport {
  fileName: string;
  sheetName: string;
  // ... 其他字段
}
```

### 4. 与质量控制模块集成

```typescript
import { AIOutputValidator, QualityGate } from '../services/quality';

class DataCleaner {
  constructor(
    private readonly validator: AIOutputValidator,
    private readonly qualityGate: QualityGate
  ) {}

  async execute(data: ExcelData, strategies: CleaningStrategy[]) {
    // 执行清洗
    const result = await this.executeStrategies(data, strategies);

    // 使用质量门禁验证
    const qualityReport = await this.qualityGate.evaluate({
      aiOutput: result.cleanedData,
      queryContext: { originalData: data }
    });

    return {
      ...result,
      qualityReport
    };
  }
}
```

---

## 性能与扩展性

### 1. 性能优化策略

#### 1.1 采样分析

```typescript
interface AnalysisOptions {
  sampleSize?: number; // 采样大小
  samplingMethod?: 'random' | 'systematic' | 'stratified';
}

// 对于大文件，先进行采样分析
async analyze(data: ExcelData, options?: AnalysisOptions) {
  const shouldSample = data.sheets[data.currentSheetName].length > 10000;

  if (shouldSample && options?.sampleSize) {
    const sample = this.sampleData(data, options.sampleSize);
    return await this.analyzeInternal(sample, options);
  }

  return await this.analyzeInternal(data, options);
}
```

#### 1.2 并行处理

```typescript
// 并行执行多个检测器
async analyze(data: ExcelData) {
  const results = await Promise.all([
    this.missingValueDetector.detect(data),
    this.outlierDetector.detect(data),
    this.duplicateDetector.detect(data),
    this.formatDetector.detect(data)
  ]);

  return this.aggregateResults(results);
}
```

#### 1.3 增量分析

```typescript
// 只分析变化的部分
async reanalyzeChangedData(
  previousReport: DataQualityReport,
  changes: DataChange[]
): Promise<DataQualityReport> {
  // 只重新分析受影响的列和行
  const affectedColumns = this.getAffectedColumns(changes);
  const affectedRows = this.getAffectedRows(changes);

  return await this.analyzePartial(
    previousReport,
    affectedColumns,
    affectedRows
  );
}
```

### 2. 缓存策略

```typescript
class DataQualityAnalyzer {
  constructor(
    private readonly cacheService: ICacheService
  ) {}

  async analyze(data: ExcelData, options?: AnalysisOptions) {
    // 生成缓存键
    const cacheKey = this.generateCacheKey(data, options);

    // 检查缓存
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    // 执行分析
    const report = await this.analyzeInternal(data, options);

    // 缓存结果
    await this.cacheService.set(cacheKey, report, 1800000); // 30分钟

    return report;
  }

  private generateCacheKey(data: ExcelData, options?: AnalysisOptions): string {
    const dataHash = this.hashData(data);
    const optionsHash = this.hashOptions(options);
    return `dq_analysis:${dataHash}:${optionsHash}`;
  }
}
```

### 3. 扩展性设计

#### 3.1 可插拔的检测器

```typescript
interface DataQualityDetector {
  detect(data: ExcelData, options?: AnalysisOptions): Promise<DataQualityIssue[]>;
}

// 用户可以自定义检测器
class CustomDomainDetector implements DataQualityDetector {
  async detect(data: ExcelData): Promise<DataQualityIssue[]> {
    // 自定义检测逻辑
    const issues: DataQualityIssue[] = [];

    // 检测业务规则
    for (const row of data.sheets[data.currentSheetName]) {
      if (!this.isValidBusinessRule(row)) {
        issues.push({
          issueId: this.generateId(),
          issueType: DataQualityIssueType.DATA_INCONSISTENCY,
          severity: 'high',
          // ...
        });
      }
    }

    return issues;
  }

  private isValidBusinessRule(row: any): boolean {
    // 业务规则验证
    return true;
  }
}

// 注册自定义检测器
const analyzer = new DataQualityAnalyzer({
  detectors: [
    new MissingValueDetector(),
    new OutlierDetector(),
    new CustomDomainDetector() // 自定义检测器
  ]
});
```

#### 3.2 可扩展的策略库

```typescript
class StrategyLibrary {
  private strategies: Map<StrategyType, CleaningStrategy[]> = new Map();

  registerStrategy(type: StrategyType, strategy: CleaningStrategy) {
    if (!this.strategies.has(type)) {
      this.strategies.set(type, []);
    }
    this.strategies.get(type)!.push(strategy);
  }

  getStrategiesForIssue(issueType: DataQualityIssueType): CleaningStrategy[] {
    // 根据问题类型返回适用的策略
    const mapping = {
      [DataQualityIssueType.MISSING_VALUE]: [StrategyType.FILL, StrategyType.DELETE],
      [DataQualityIssueType.OUTLIER]: [StrategyType.REPLACE, StrategyType.DELETE],
      // ...
    };

    const types = mapping[issueType] || [];
    return types.flatMap(type => this.strategies.get(type) || []);
  }
}

// 用户可以注册自定义策略
const library = new StrategyLibrary();
library.registerStrategy(StrategyType.FILL, {
  strategyId: 'custom_fill',
  name: '使用中位数填充',
  type: StrategyType.FILL,
  description: '对于偏态分布，使用中位数填充',
  parameters: {
    operation: 'fill_median'
  }
});
```

---

## 安全考虑

### 1. 输入验证

```typescript
class DataQualityController {
  async analyze(req: Request, res: Response) {
    // 验证文件大小
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    if (req.body.file && req.body.file.length > MAX_FILE_SIZE) {
      throw new ValidationError('文件大小超过限制');
    }

    // 验证文件类型
    const ALLOWED_TYPES = ['.xlsx', '.xls', '.csv'];
    const fileExt = path.extname(req.body.fileName);
    if (!ALLOWED_TYPES.includes(fileExt)) {
      throw new ValidationError('不支持的文件类型');
    }

    // 验证分析选项
    const options = req.body.options || {};
    if (options.sampleSize && options.sampleSize > 100000) {
      throw new ValidationError('采样大小超过限制');
    }

    // 执行分析
    const result = await this.service.analyze(req.body.file, options);
    res.json({ success: true, data: result });
  }
}
```

### 2. 代码执行安全

```typescript
class DataCleaner {
  private async executeWithCode(data: ExcelData, code: string) {
    // 1. 代码静态检查
    const dangerousPatterns = [
      /import\s+os/,
      /import\s+subprocess/,
      /eval\s*\(/,
      /exec\s*\(/,
      /__import__/
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        throw new SecurityError('代码包含不安全的操作');
      }
    }

    // 2. 沙箱执行
    const result = await this.pythonExecutor.execute({
      code,
      data,
      timeout: 30000, // 30秒超时
      memoryLimit: 100 * 1024 * 1024 // 100MB内存限制
    });

    return result;
  }
}
```

### 3. 数据隐私

```typescript
class CleaningHistoryManager {
  async save(entry: CleaningHistoryEntry) {
    // 1. 不保存敏感数据的快照
    const sanitizedEntry = {
      ...entry,
      beforeState: this.sanitizeState(entry.beforeState),
      afterState: this.sanitizeState(entry.afterState)
    };

    // 2. 加密存储
    await this.storageService.set(
      `cleaning_history:${entry.operationId}`,
      this.encrypt(sanitizedEntry)
    );
  }

  private sanitizeState(state: DataSnapshot): DataSnapshot {
    // 只保留统计信息，不保留实际数据
    return {
      totalRows: state.totalRows,
      qualityScore: state.qualityScore,
      issueSummary: state.issueSummary
    };
  }
}
```

---

## 实施路线图

### Phase 1: 基础检测器 (2周)

**目标**: 实现核心的数据质量检测功能

**任务**:
1. 实现缺失值检测器
2. 实现异常值检测器（使用IQR方法）
3. 实现重复行检测器
4. 实现格式一致性检测器
5. 创建 DataQualityAnalyzer 类
6. 编写单元测试

**交付物**:
- `services/dataQuality/detectors/missingValueDetector.ts`
- `services/dataQuality/detectors/outlierDetector.ts`
- `services/dataQuality/detectors/duplicateDetector.ts`
- `services/dataQuality/detectors/formatConsistencyDetector.ts`
- `services/dataQuality/dataQualityAnalyzer.ts`
- 完整的测试套件

### Phase 2: AI建议引擎 (2周)

**目标**: 实现AI驱动的清洗建议生成

**任务**:
1. 创建策略库
2. 实现清洗建议引擎
3. 集成智谱AI服务
4. 实现执行代码生成器
5. 编写单元测试

**交付物**:
- `services/dataQuality/strategyLibrary.ts`
- `services/dataQuality/cleaningSuggestionEngine.ts`
- `services/dataQuality/codeGenerator.ts`
- 完整的测试套件

### Phase 3: 清洗执行器 (1周)

**目标**: 实现清洗策略的执行

**任务**:
1. 创建数据清洗执行器
2. 集成现有的Python执行环境
3. 实现结果验证
4. 编写单元测试

**交付物**:
- `services/dataQuality/dataCleaner.ts`
- 完整的测试套件

### Phase 4: 历史管理 (1周)

**目标**: 实现清洗历史的管理

**任务**:
1. 创建历史管理器
2. 实现撤销功能
3. 实现统计分析
4. 编写单元测试

**交付物**:
- `services/dataQuality/cleaningHistoryManager.ts`
- 完整的测试套件

### Phase 5: UI集成 (2周)

**目标**: 创建用户界面

**任务**:
1. 创建数据质量面板组件
2. 实现问题可视化
3. 实现建议展示和选择
4. 实现清洗进度跟踪
5. 实现历史查看

**交付物**:
- `components/DataQuality/`
  - `DataQualityPanel.tsx`
  - `IssueViewer.tsx`
  - `SuggestionViewer.tsx`
  - `CleaningProgress.tsx`
  - `HistoryViewer.tsx`

### Phase 6: API端点 (1周)

**目标**: 实现REST API

**任务**:
1. 创建API控制器
2. 实现所有API端点
3. 添加请求验证
4. 添加错误处理
5. 编写集成测试

**交付物**:
- `api/controllers/dataQualityController.ts`
- `api/routes/dataQualityRoutes.ts`
- 完整的API测试套件

### Phase 7: 优化和测试 (1周)

**目标**: 性能优化和全面测试

**任务**:
1. 性能优化
2. 缓存优化
3. 端到端测试
4. 用户验收测试
5. 文档完善

**交付物**:
- 性能报告
- 测试报告
- 用户手册
- API文档

---

## 总结

本架构设计提供了一个完整的、可扩展的、高性能的智能数据处理增强模块。通过AI驱动的清洗建议、灵活的策略执行和完整的历史追溯，为用户提供强大的数据预处理能力。

**核心优势**:

- ✅ **智能化**: AI理解数据特征，生成个性化建议
- ✅ **可扩展**: 插拔式检测器和策略库
- ✅ **高性能**: 并行处理、采样分析、多层缓存
- ✅ **安全可靠**: 代码沙箱、输入验证、数据加密
- ✅ **用户友好**: 详细解释、可视化展示、一键执行

**技术亮点**:

- 与现有系统无缝集成
- 使用现有的智谱AI服务
- 遵循现有的架构模式
- TypeScript类型安全
- 完整的错误处理和降级策略

该架构为Phase 2的成功实施提供了坚实的技术基础。
