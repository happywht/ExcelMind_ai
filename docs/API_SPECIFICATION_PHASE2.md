# ExcelMind AI - Phase 2 REST API 规范

> **版本**: v2.0.0
> **更新日期**: 2026-01-25
> **状态**: 设计阶段

## 目录

- [概述](#概述)
- [架构设计](#架构设计)
- [通用规范](#通用规范)
- [API端点](#api端点)
  - [1. 智能数据处理模块](#1-智能数据处理模块)
  - [2. 多模板文档生成模块](#2-多模板文档生成模块)
  - [3. 审计规则引擎模块](#3-审计规则引擎模块)
  - [4. 性能监控模块](#4-性能监控模块)
  - [5. 质量控制模块](#5-质量控制模块)
- [WebSocket接口](#websocket接口)
- [错误处理](#错误处理)
- [速率限制](#速率限制)
- [认证授权](#认证授权)

---

## 概述

### Phase 2 核心特性

Phase 2 API在Phase 1基础上，新增以下核心功能：

1. **智能数据处理增强**
   - 数据质量自动分析
   - AI驱动的清洗建议
   - 数据转换规则管理
   - 跨Sheet数据关联

2. **多模板文档生成**
   - 模板库管理
   - 批量文档生成
   - 多格式输出支持
   - 生成进度实时追踪

3. **审计规则引擎**
   - 自定义审计规则
   - 规则模板管理
   - 实时审计执行
   - 审计报告生成

4. **性能监控系统**
   - 实时性能指标
   - 查询性能分析
   - AI调用追踪
   - 资源使用监控

5. **质量控制体系**
   - AI输出验证
   - 幻觉检测
   - 自动修复建议
   - 质量门禁

### 基础URL

```
生产环境: https://api.excelmind.ai/v2
开发环境: http://localhost:3000/api/v2
```

---

## 架构设计

### 分层架构

```
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway Layer                        │
│         (认证、限流、监控、日志、CORS)                        │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                    Controller Layer                          │
│              (请求处理、响应组装、参数验证)                   │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                    Service Layer                             │
│  ┌───────────────────┐  ┌───────────────────┐              │
│  │ DataQualityService│  │ TemplateService   │              │
│  │ AuditRuleEngine   │  │ MonitorService    │              │
│  │ QualityService    │  │ GenerationService │              │
│  └───────────────────┘  └───────────────────┘              │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                   Orchestration Layer                        │
│  ┌───────────────────┐  ┌───────────────────┐              │
│  │ AgenticOrchestrator│ │ EventBus          │              │
│  │ CacheService      │  │ RetryStrategy     │              │
│  └───────────────────┘  └───────────────────┘              │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                   Infrastructure                             │
│  ┌───────────────────┐  ┌───────────────────┐              │
│  │ VirtualFileSystem │  │ WASM Execution    │              │
│  │ Persistence       │  │ AI Integration     │              │
│  └───────────────────┘  └───────────────────┘              │
└─────────────────────────────────────────────────────────────┘
```

---

## 通用规范

### 请求格式

#### HTTP方法

| 方法 | 用途 | 幂等性 |
|------|------|--------|
| GET | 获取资源 | 是 |
| POST | 创建资源 | 否 |
| PUT | 完整更新资源 | 是 |
| PATCH | 部分更新资源 | 否 |
| DELETE | 删除资源 | 是 |

#### 请求头

```http
Content-Type: application/json
Authorization: Bearer {access_token}
X-Request-ID: {unique_request_id}
X-Client-Version: {client_version}
Accept: application/json
Accept-Language: zh-CN
```

### 响应格式

#### 成功响应

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "requestId": "req_20260125_001",
    "timestamp": "2026-01-25T10:30:00Z",
    "version": "2.0.0",
    "executionTime": 125
  }
}
```

#### 错误响应

```json
{
  "success": false,
  "error": {
    "code": "DATA_QUALITY_ANALYSIS_FAILED",
    "message": "数据质量分析失败",
    "details": [
      {
        "field": "sheetName",
        "message": "Sheet不存在"
      }
    ],
    "requestId": "req_20260125_001",
    "timestamp": "2026-01-25T10:30:00Z",
    "helpUrl": "https://docs.excelmind.ai/errors/data-quality"
  }
}
```

#### 分页响应

```json
{
  "success": true,
  "data": {
    "items": [ ... ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 100,
      "totalPages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  },
  "meta": { ... }
}
```

### 分页参数

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| page | integer | 1 | 页码（从1开始） |
| pageSize | integer | 20 | 每页数量（1-100） |
| sortBy | string | createdAt | 排序字段 |
| order | string | desc | 排序方向：asc/desc |

---

## API端点

## 1. 智能数据处理模块

### 1.1 数据质量分析

分析Excel数据质量，检测缺失值、重复值、格式不一致等问题。

```http
POST /api/v2/data-quality/analyze
```

**请求体：**

```json
{
  "fileId": "file_1737820800000_abc123",
  "sheetName": "销售数据",
  "options": {
    "checkMissingValues": true,
    "checkDuplicates": true,
    "checkFormats": true,
    "checkOutliers": true,
    "sampleSize": 1000
  }
}
```

**响应：** `200 OK`

```json
{
  "success": true,
  "data": {
    "analysisId": "qa_1737820800000_xyz789",
    "fileId": "file_1737820800000_abc123",
    "sheetName": "销售数据",
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
      },
      {
        "id": "issue_002",
        "type": "duplicate",
        "severity": "medium",
        "location": {
          "rows": [10, 11],
          "columns": ["产品ID", "订单号"]
        },
        "description": "发现重复的订单记录",
        "impact": "可能导致统计错误"
      },
      {
        "id": "issue_003",
        "type": "inconsistent_format",
        "severity": "medium",
        "location": {
          "column": "日期",
          "affectedRows": [3, 7, 15]
        },
        "description": "日期格式不一致，发现YYYY-MM-DD和DD/MM/YYYY两种格式",
        "impact": "无法正确排序和筛选"
      },
      {
        "id": "issue_004",
        "type": "outlier",
        "severity": "low",
        "location": {
          "column": "销售额",
          "affectedRows": [88],
          "value": 9999999
        },
        "description": "发现异常值：销售额为9999999，远超正常范围",
        "impact": "可能影响统计平均值"
      }
    ],
    "statistics": {
      "missingValues": {
        "total": 50,
        "byColumn": {
          "客户邮箱": 4,
          "联系电话": 8,
          "地址": 38
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
          "phone": 5,
          "email": 2
        }
      },
      "outliers": {
        "total": 3,
        "byColumn": {
          "销售额": 1,
          "数量": 2
        }
      }
    },
    "recommendations": [
      "建议填充缺失的客户邮箱信息",
      "建议删除重复的订单记录",
      "建议统一日期格式为YYYY-MM-DD",
      "建议检查销售额为9999999的记录是否正确"
    ]
  },
  "meta": {
    "requestId": "req_20260125_001",
    "timestamp": "2026-01-25T10:30:00Z",
    "executionTime": 350
  }
}
```

### 1.2 获取清洗建议

基于数据质量分析结果，获取AI生成的清洗建议。

```http
POST /api/v2/data-quality/suggestions
```

**请求体：**

```json
{
  "analysisId": "qa_1737820800000_xyz789",
  "options": {
    "includeAutoFix": true,
    "priority": "high"
  }
}
```

**响应：** `200 OK`

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
        "description": "发现4条缺失的客户邮箱记录，建议从其他系统获取或标记为待补充",
        "impact": "缺失邮箱将影响客户通知发送",
        "estimatedTime": "5分钟",
        "canAutoFix": false,
        "steps": [
          "检查CRM系统是否有客户邮箱信息",
          "如找到，导入并更新数据",
          "如未找到，添加标记字段 'email_pending'"
        ],
        "manualAction": {
          "type": "lookup",
          "source": "CRM系统",
          "mapping": "customer_id -> email"
        }
      },
      {
        "id": "sugg_002",
        "issueId": "issue_002",
        "priority": "high",
        "title": "删除重复订单",
        "description": "发现2组重复的订单记录（共10条），建议保留最新的一条",
        "impact": "重复记录会导致销售额统计错误",
        "estimatedTime": "1分钟",
        "canAutoFix": true,
        "autoFixCode": "data.filter((row, index, self) => \n  index === self.findIndex((r) => r['订单号'] === row['订单号'] && r['产品ID'] === row['产品ID'])\n)",
        "steps": [
          "按订单号和产品ID分组",
          "每组保留创建时间最新的记录",
          "删除其他重复记录"
        ],
        "preview": {
          "affectedRows": 10,
          "afterFixRows": 990
        }
      },
      {
        "id": "sugg_003",
        "issueId": "issue_003",
        "priority": "medium",
        "title": "统一日期格式",
        "description": "将所有日期统一为YYYY-MM-DD格式",
        "impact": "统一格式后可正确排序和筛选",
        "estimatedTime": "2分钟",
        "canAutoFix": true,
        "autoFixCode": "row['日期'] = new Date(row['日期']).toISOString().split('T')[0]",
        "steps": [
          "识别日期列中的不同格式",
          "统一转换为YYYY-MM-DD格式",
          "验证转换后的日期有效性"
        ],
        "preview": {
          "affectedRows": 8,
          "examples": [
            { "original": "25/01/2026", "converted": "2026-01-25" },
            { "original": "01/15/2026", "converted": "2026-01-15" }
          ]
        }
      },
      {
        "id": "sugg_004",
        "issueId": "issue_004",
        "priority": "low",
        "title": "检查异常销售额",
        "description": "销售额为9999999的记录可能是输入错误，建议人工核实",
        "impact": "异常值会影响统计平均值",
        "estimatedTime": "3分钟",
        "canAutoFix": false,
        "steps": [
          "定位到第88行记录",
          "核实原始订单或发票",
          "如确认错误，更正为正确值",
          "如确认正确，添加备注说明"
        ],
        "manualAction": {
          "type": "verify",
          "rowId": 88,
          "field": "销售额",
          "suggestedValues": [9999.99, 99999.99]
        }
      }
    ],
    "totalSuggestions": 4,
    "canAutoFixCount": 2,
    "estimatedTotalTime": 11
  },
  "meta": { ... }
}
```

### 1.3 执行数据清洗

应用清洗建议，自动或手动执行数据清洗操作。

```http
POST /api/v2/data-quality/clean
```

**请求体：**

```json
{
  "analysisId": "qa_1737820800000_xyz789",
  "suggestions": [
    {
      "suggestionId": "sugg_002",
      "action": "auto_fix"
    },
    {
      "suggestionId": "sugg_003",
      "action": "auto_fix"
    },
    {
      "suggestionId": "sugg_001",
      "action": "manual",
      "manualValue": "待补充"
    },
    {
      "suggestionId": "sugg_004",
      "action": "skip"
    }
  ],
  "options": {
    "createBackup": true,
    "validateAfterClean": true
  }
}
```

**响应：** `200 OK`

```json
{
  "success": true,
  "data": {
    "cleanId": "clean_1737820800000_def456",
    "analysisId": "qa_1737820800000_xyz789",
    "status": "completed",
    "results": [
      {
        "suggestionId": "sugg_002",
        "status": "success",
        "affectedRows": 10,
        "message": "成功删除10条重复记录"
      },
      {
        "suggestionId": "sugg_003",
        "status": "success",
        "affectedRows": 8,
        "message": "成功统一8条记录的日期格式"
      },
      {
        "suggestionId": "sugg_001",
        "status": "success",
        "affectedRows": 4,
        "message": "已标记4条记录为待补充邮箱"
      },
      {
        "suggestionId": "sugg_004",
        "status": "skipped",
        "message": "已跳过异常值检查"
      }
    ],
    "summary": {
      "totalProcessed": 22,
      "successful": 3,
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
  "meta": { ... }
}
```

### 1.4 转换规则管理

创建和管理数据转换规则。

#### 1.4.1 创建转换规则

```http
POST /api/v2/data-quality/transform-rules
```

**请求体：**

```json
{
  "name": "电话号码标准化",
  "description": "将各种格式的电话号码统一为138-0000-0000格式",
  "category": "format_standardization",
  "input": {
    "columnType": "phone",
    "formats": ["13800000000", "138 0000 0000", "(138) 0000-0000"]
  },
  "transformation": {
    "type": "regex_replace",
    "pattern": "^(\d{3})[\s\-]?(\d{4})[\s\-]?(\d{4})$",
    "replacement": "$1-$2-$3"
  },
  "output": {
    "format": "138-0000-0000",
    "dataType": "string"
  }
}
```

**响应：** `201 Created`

```json
{
  "success": true,
  "data": {
    "ruleId": "rule_1737820800000_ghi789",
    "name": "电话号码标准化",
    "status": "active",
    "createdAt": "2026-01-25T10:30:00Z"
  },
  "meta": { ... }
}
```

#### 1.4.2 列出转换规则

```http
GET /api/v2/data-quality/transform-rules?category=format_standardization&page=1&pageSize=20
```

**响应：** `200 OK`

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "ruleId": "rule_1737820800000_ghi789",
        "name": "电话号码标准化",
        "category": "format_standardization",
        "description": "将各种格式的电话号码统一",
        "status": "active",
        "usageCount": 15,
        "createdAt": "2026-01-25T10:30:00Z"
      }
    ],
    "pagination": { ... }
  },
  "meta": { ... }
}
```

#### 1.4.3 应用转换规则

```http
POST /api/v2/data-quality/apply-rules
```

**请求体：**

```json
{
  "fileId": "file_1737820800000_abc123",
  "sheetName": "销售数据",
  "rules": [
    {
      "ruleId": "rule_1737820800000_ghi789",
      "targetColumn": "联系电话"
    }
  ]
}
```

**响应：** `200 OK`

```json
{
  "success": true,
  "data": {
    "transformId": "trans_1737820800000_jkl012",
    "status": "completed",
    "results": [
      {
        "ruleId": "rule_1737820800000_ghi789",
        "targetColumn": "联系电话",
        "status": "success",
        "affectedRows": 50,
        "skippedRows": 2,
        "failedRows": 0
      }
    ]
  },
  "meta": { ... }
}
```

---

## 2. 多模板文档生成模块

### 2.1 模板管理

#### 2.1.1 上传模板

```http
POST /api/v2/templates
Content-Type: multipart/form-data
```

**请求体（multipart/form-data）：**

```
file: <binary>
name: "销售合同模板"
description: "用于生成销售合同的标准模板"
category: "合同"
tags: ["销售", "合同", "标准"]
mappings: {
  "placeholders": [
    {
      "key": "合同编号",
      "column": "contract_id",
      "required": true,
      "dataType": "string"
    },
    {
      "key": "甲方名称",
      "column": "party_a_name",
      "required": true,
      "dataType": "string"
    },
    {
      "key": "合同金额",
      "column": "amount",
      "required": true,
      "dataType": "number",
      "format": "currency"
    }
  ]
}
```

**响应：** `201 Created`

```json
{
  "success": true,
  "data": {
    "templateId": "tmpl_1737820800000_mno345",
    "name": "销售合同模板",
    "status": "active",
    "file": {
      "fileName": "销售合同模板.docx",
      "fileSize": 45678,
      "uploadTime": "2026-01-25T10:30:00Z"
    },
    "metadata": {
      "placeholders": [
        {
          "key": "合同编号",
          "rawPlaceholder": "{{合同编号}}",
          "dataType": "string",
          "required": true
        }
      ],
      "hasLoops": false,
      "hasConditionals": true,
      "pageCount": 5
    }
  },
  "meta": { ... }
}
```

#### 2.1.2 列出模板

```http
GET /api/v2/templates?category=合同&status=active&page=1&pageSize=20
```

**响应：** `200 OK`

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "templateId": "tmpl_1737820800000_mno345",
        "name": "销售合同模板",
        "category": "合同",
        "description": "用于生成销售合同",
        "status": "active",
        "tags": ["销售", "合同"],
        "usageCount": 125,
        "createdAt": "2026-01-25T10:30:00Z",
        "updatedAt": "2026-01-25T10:30:00Z"
      }
    ],
    "pagination": { ... }
  },
  "meta": { ... }
}
```

#### 2.1.3 获取模板详情

```http
GET /api/v2/templates/{templateId}
```

**响应：** `200 OK`

```json
{
  "success": true,
  "data": {
    "templateId": "tmpl_1737820800000_mno345",
    "name": "销售合同模板",
    "category": "合同",
    "description": "用于生成销售合同的标准模板",
    "status": "active",
    "tags": ["销售", "合同", "标准"],
    "file": {
      "fileName": "销售合同模板.docx",
      "fileSize": 45678,
      "uploadTime": "2026-01-25T10:30:00Z",
      "downloadUrl": "/api/v2/templates/tmpl_1737820800000_mno345/download"
    },
    "metadata": {
      "placeholders": [
        {
          "key": "合同编号",
          "rawPlaceholder": "{{合同编号}}",
          "dataType": "string",
          "required": true,
          "context": {
            "section": "基本信息",
            "position": 1
          }
        },
        {
          "key": "合同金额",
          "rawPlaceholder": "{{合同金额}}",
          "dataType": "number",
          "required": true,
          "format": "currency",
          "context": {
            "section": "金额信息",
            "position": 3
          }
        }
      ],
      "hasLoops": true,
      "hasConditionals": true,
      "hasTables": true,
      "pageCount": 5,
      "wordCount": 1500
    },
    "defaultMappings": {
      "mappings": [
        {
          "placeholder": "{{合同编号}}",
          "excelColumn": "contract_id",
          "confidence": 1.0
        }
      ],
      "filterCondition": null
    },
    "usageStats": {
      "totalGenerations": 125,
      "lastUsed": "2026-01-24T15:30:00Z",
      "successRate": 0.98
    },
    "createdAt": "2026-01-20T10:00:00Z",
    "updatedAt": "2026-01-25T10:30:00Z"
  },
  "meta": { ... }
}
```

#### 2.1.4 更新模板

```http
PUT /api/v2/templates/{templateId}
```

**请求体：**

```json
{
  "name": "销售合同模板（更新版）",
  "description": "更新后的销售合同模板",
  "category": "合同",
  "tags": ["销售", "合同", "2026版"]
}
```

**响应：** `200 OK`

```json
{
  "success": true,
  "data": {
    "templateId": "tmpl_1737820800000_mno345",
    "name": "销售合同模板（更新版）",
    "updatedAt": "2026-01-25T11:00:00Z"
  },
  "meta": { ... }
}
```

#### 2.1.5 删除模板

```http
DELETE /api/v2/templates/{templateId}
```

**响应：** `204 No Content`

### 2.2 批量文档生成

#### 2.2.1 创建批量生成任务

```http
POST /api/v2/generation/batch
```

**请求体：**

```json
{
  "dataSourceId": "ds_1737820800000_pqr678",
  "templateIds": [
    "tmpl_1737820800000_mno345",
    "tmpl_1737820800000_stu901"
  ],
  "outputFormat": "docx",
  "options": {
    "batchSize": 100,
    "parallelProcessing": true,
    "createZip": true,
    "zipFileName": "合同批量_{timestamp}"
  },
  "filters": {
    "condition": "row['status'] === 'active'",
    "limit": 50
  },
  "notification": {
    "webhook": "https://example.com/webhook",
    "email": "user@example.com"
  }
}
```

**响应：** `202 Accepted`

```json
{
  "success": true,
  "data": {
    "taskId": "task_1737820800000_vwx234",
    "status": "pending",
    "estimatedTime": 300,
    "estimatedDocumentCount": 100,
    "items": [
      {
        "templateId": "tmpl_1737820800000_mno345",
        "templateName": "销售合同模板",
        "estimatedCount": 50
      },
      {
        "templateId": "tmpl_1737820800000_stu901",
        "templateName": "采购合同模板",
        "estimatedCount": 50
      }
    ],
    "websocketUrl": "wss://api.excelmind.ai/v2/stream/task_1737820800000_vwx234"
  },
  "meta": { ... }
}
```

#### 2.2.2 查询生成进度

```http
GET /api/v2/generation/status/{taskId}
```

**响应：** `200 OK`

```json
{
  "success": true,
  "data": {
    "taskId": "task_1737820800000_vwx234",
    "status": "processing",
    "progress": 45,
    "currentStep": "生成文档中",
    "startedAt": "2026-01-25T10:30:00Z",
    "estimatedEndTime": "2026-01-25T10:35:00Z",
    "items": [
      {
        "templateId": "tmpl_1737820800000_mno345",
        "templateName": "销售合同模板",
        "status": "processing",
        "progress": 50,
        "completedCount": 25,
        "totalCount": 50,
        "failedCount": 0,
        "downloads": {
          "completedUrl": "/api/v2/generation/download/task_1737820800000_vwx234/tmpl_1737820800000_mno345/completed"
        }
      },
      {
        "templateId": "tmpl_1737820800000_stu901",
        "templateName": "采购合同模板",
        "status": "pending",
        "progress": 0,
        "completedCount": 0,
        "totalCount": 50,
        "failedCount": 0
      }
    ],
    "summary": {
      "totalDocuments": 100,
      "completedDocuments": 25,
      "failedDocuments": 0,
      "pendingDocuments": 75
    }
  },
  "meta": { ... }
}
```

#### 2.2.3 下载生成的文档

```http
GET /api/v2/generation/download/{taskId}/{templateId}/{documentId}
```

**响应：** `200 OK`

```
Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document
Content-Disposition: attachment; filename="合同_001.docx"
Content-Length: 45678

<binary data>
```

#### 2.2.4 下载ZIP压缩包

```http
GET /api/v2/generation/download/{taskId}/zip
```

**响应：** `200 OK`

```
Content-Type: application/zip
Content-Disposition: attachment; filename="合同批量_20260125.zip"
Content-Length: 2048000

<binary data>
```

#### 2.2.5 取消生成任务

```http
POST /api/v2/generation/cancel/{taskId}
```

**响应：** `200 OK`

```json
{
  "success": true,
  "data": {
    "taskId": "task_1737820800000_vwx234",
    "status": "cancelled",
    "cancelledAt": "2026-01-25T10:32:00Z",
    "completedDocuments": 25,
    "message": "任务已取消，已生成25个文档"
  },
  "meta": { ... }
}
```

---

## 3. 审计规则引擎模块

### 3.1 规则管理

#### 3.1.1 创建审计规则

```http
POST /api/v2/audit/rules
```

**请求体：**

```json
{
  "name": "数据完整性检查",
  "description": "检查关键字段是否存在空值",
  "category": "data_quality",
  "severity": "high",
  "enabled": true,
  "conditions": {
    "type": "field_validation",
    "field": "customer_email",
    "validation": "not_empty"
  },
  "actions": [
    {
      "type": "alert",
      "message": "发现空的客户邮箱"
    },
    {
      "type": "block",
      "reason": "客户邮箱不能为空"
    }
  ],
  "schedule": {
    "frequency": "on_data_change"
  }
}
```

**响应：** `201 Created`

```json
{
  "success": true,
  "data": {
    "ruleId": "audit_1737820800000_yza345",
    "name": "数据完整性检查",
    "status": "active",
    "createdAt": "2026-01-25T10:30:00Z"
  },
  "meta": { ... }
}
```

#### 3.1.2 列出审计规则

```http
GET /api/v2/audit/rules?category=data_quality&enabled=true&page=1&pageSize=20
```

**响应：** `200 OK`

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "ruleId": "audit_1737820800000_yza345",
        "name": "数据完整性检查",
        "category": "data_quality",
        "severity": "high",
        "enabled": true,
        "description": "检查关键字段是否存在空值",
        "lastTriggered": "2026-01-25T09:15:00Z",
        "triggerCount": 15
      }
    ],
    "pagination": { ... }
  },
  "meta": { ... }
}
```

#### 3.1.3 执行审计

```http
POST /api/v2/audit/execute
```

**请求体：**

```json
{
  "fileId": "file_1737820800000_abc123",
  "sheetName": "销售数据",
  "rules": [
    "audit_1737820800000_yza345",
    "audit_1737820800000_bcd456"
  ],
  "options": {
    "stopOnFirstError": false,
    "generateReport": true
  }
}
```

**响应：** `200 OK`

```json
{
  "success": true,
  "data": {
    "auditId": "audit_run_1737820800000_efg789",
    "status": "completed",
    "startedAt": "2026-01-25T10:30:00Z",
    "completedAt": "2026-01-25T10:30:05Z",
    "results": [
      {
        "ruleId": "audit_1737820800000_yza345",
        "ruleName": "数据完整性检查",
        "status": "passed",
        "checkedRows": 1000,
        "violations": 0,
        "message": "所有数据通过完整性检查"
      },
      {
        "ruleId": "audit_1737820800000_bcd456",
        "ruleName": "金额范围检查",
        "status": "failed",
        "checkedRows": 1000,
        "violations": [
          {
            "row": 88,
            "field": "销售额",
            "value": 9999999,
            "expected": "0-100000",
            "message": "销售额超出正常范围"
          }
        ],
        "message": "发现1条数据超出范围"
      }
    ],
    "summary": {
      "totalRules": 2,
      "passed": 1,
      "failed": 1,
      "skipped": 0,
      "totalViolations": 1,
      "overallStatus": "failed"
    },
    "reportUrl": "/api/v2/audit/reports/audit_run_1737820800000_efg789"
  },
  "meta": { ... }
}
```

#### 3.1.4 获取审计报告

```http
GET /api/v2/audit/reports/{auditId}
```

**响应：** `200 OK`

```json
{
  "success": true,
  "data": {
    "auditId": "audit_run_1737820800000_efg789",
    "reportType": "detailed",
    "generatedAt": "2026-01-25T10:30:10Z",
    "summary": {
      "overallStatus": "failed",
      "totalRules": 2,
      "passedRules": 1,
      "failedRules": 1,
      "totalViolations": 1,
      "severity": "medium"
    },
    "details": [
      {
        "ruleId": "audit_1737820800000_yza345",
        "ruleName": "数据完整性检查",
        "status": "passed",
        "severity": "low",
        "description": "检查关键字段是否存在空值",
        "checkedItems": 1000,
        "violations": [],
        "recommendations": []
      },
      {
        "ruleId": "audit_1737820800000_bcd456",
        "ruleName": "金额范围检查",
        "status": "failed",
        "severity": "medium",
        "description": "检查金额是否在合理范围内",
        "checkedItems": 1000,
        "violations": [
          {
            "id": "vio_001",
            "row": 88,
            "field": "销售额",
            "value": 9999999,
            "expected": "0-100000",
            "severity": "high",
            "message": "销售额超出正常范围",
            "suggestion": "请核实第88行的销售额是否正确"
          }
        ],
        "recommendations": [
          "核实第88行销售额数据",
          "如确认错误，更正为正确值",
          "如确认正确，添加备注说明特殊情况"
        ]
      }
    ],
    "charts": {
      "violationsByRule": {
        "数据完整性检查": 0,
        "金额范围检查": 1
      },
      "violationsBySeverity": {
        "high": 1,
        "medium": 0,
        "low": 0
      }
    },
    "downloadUrls": {
      "pdf": "/api/v2/audit/reports/audit_run_1737820800000_efg789/pdf",
      "excel": "/api/v2/audit/reports/audit_run_1737820800000_efg789/excel"
    }
  },
  "meta": { ... }
}
```

---

## 4. 性能监控模块

### 4.1 性能指标

#### 4.1.1 获取性能指标

```http
GET /api/v2/monitoring/metrics?timeRange=1h&metricType=query_performance
```

**查询参数：**

| 参数 | 类型 | 描述 |
|------|------|------|
| timeRange | string | 时间范围：1h, 6h, 24h, 7d, 30d |
| metricType | string | 指标类型：query_performance, ai_performance, document_performance, resource_usage |

**响应：** `200 OK`

```json
{
  "success": true,
  "data": {
    "timeRange": "1h",
    "metrics": {
      "queryPerformance": {
        "totalQueries": 150,
        "avgResponseTime": 250,
        "p50ResponseTime": 200,
        "p95ResponseTime": 450,
        "p99ResponseTime": 800,
        "slowQueries": 3,
        "successRate": 0.98
      },
      "aiPerformance": {
        "totalCalls": 50,
        "avgResponseTime": 1500,
        "totalTokens": 250000,
        "avgTokensPerCall": 5000,
        "cacheHitRate": 0.75
      },
      "documentPerformance": {
        "totalGenerated": 80,
        "avgGenerationTime": 3000,
        "successRate": 0.99,
        "avgDocumentSize": 45678
      },
      "resourceUsage": {
        "cpuPercent": 45,
        "memoryMB": 512,
        "diskUsagePercent": 60
      }
    },
    "trends": {
      "queryResponseTime": [
        { "timestamp": "2026-01-25T09:30:00Z", "value": 230 },
        { "timestamp": "2026-01-25T09:45:00Z", "value": 250 },
        { "timestamp": "2026-01-25T10:00:00Z", "value": 220 }
      ]
    }
  },
  "meta": { ... }
}
```

#### 4.1.2 获取性能报告

```http
GET /api/v2/monitoring/reports?startDate=2026-01-24&endDate=2026-01-25
```

**响应：** `200 OK`

```json
{
  "success": true,
  "data": {
    "reportId": "report_1737820800000_hij012",
    "period": {
      "start": "2026-01-24T00:00:00Z",
      "end": "2026-01-25T23:59:59Z"
    },
    "summary": {
      "overallHealth": "good",
      "score": 85,
      "totalOperations": 5000,
      "successfulOperations": 4850,
      "failedOperations": 150
    },
    "categories": [
      {
        "category": "query_performance",
        "score": 90,
        "status": "excellent",
        "metrics": {
          "avgResponseTime": 250,
          "p95ResponseTime": 450,
          "slowQueryRate": 0.02
        },
        "recommendations": [
          "考虑对慢查询添加索引",
          "优化复杂查询的执行计划"
        ]
      },
      {
        "category": "ai_performance",
        "score": 80,
        "status": "good",
        "metrics": {
          "avgResponseTime": 1500,
          "cacheHitRate": 0.75,
          "tokenUsage": 250000
        },
        "recommendations": [
          "提高AI响应缓存命中率",
          "考虑使用更快的AI模型"
        ]
      },
      {
        "category": "document_generation",
        "score": 85,
        "status": "good",
        "metrics": {
          "avgGenerationTime": 3000,
          "successRate": 0.99
        },
        "recommendations": [
          "优化模板加载速度",
          "批量生成时考虑并行处理"
        ]
      }
    ],
    "alerts": [
      {
        "severity": "warning",
        "message": "检测到3个慢查询",
        "affectedQueries": ["query_id_1", "query_id_2", "query_id_3"]
      }
    ],
    "downloadUrls": {
      "pdf": "/api/v2/monitoring/reports/report_1737820800000_hij012/pdf",
      "json": "/api/v2/monitoring/reports/report_1737820800000_hij012/json"
    }
  },
  "meta": { ... }
}
```

### 4.2 性能告警

#### 4.2.1 创建性能告警规则

```http
POST /api/v2/monitoring/alerts
```

**请求体：**

```json
{
  "name": "慢查询告警",
  "description": "当查询响应时间超过1秒时触发",
  "enabled": true,
  "condition": {
    "metric": "query_response_time",
    "operator": ">",
    "threshold": 1000
  },
  "actions": [
    {
      "type": "email",
      "recipients": ["admin@example.com"]
    },
    {
      "type": "webhook",
      "url": "https://example.com/webhook"
    }
  ]
}
```

**响应：** `201 Created`

```json
{
  "success": true,
  "data": {
    "alertId": "alert_1737820800000_klm345",
    "name": "慢查询告警",
    "status": "active",
    "createdAt": "2026-01-25T10:30:00Z"
  },
  "meta": { ... }
}
```

#### 4.2.2 列出告警规则

```http
GET /api/v2/monitoring/alerts?enabled=true
```

**响应：** `200 OK`

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "alertId": "alert_1737820800000_klm345",
        "name": "慢查询告警",
        "enabled": true,
        "condition": {
          "metric": "query_response_time",
          "operator": ">",
          "threshold": 1000
        },
        "triggerCount": 5,
        "lastTriggered": "2026-01-25T10:15:00Z"
      }
    ]
  },
  "meta": { ... }
}
```

---

## 5. 质量控制模块

### 5.1 AI输出验证

#### 5.1.1 验证AI生成的SQL

```http
POST /api/v2/quality/validate/sql
```

**请求体：**

```json
{
  "sql": "SELECT product_name, sales FROM sales_data WHERE sales > 100000",
  "schema": {
    "tables": {
      "sales_data": {
        "columns": [
          { "name": "product_name", "type": "varchar" },
          { "name": "sales", "type": "decimal" }
        ]
      }
    }
  }
}
```

**响应：** `200 OK`

```json
{
  "success": true,
  "data": {
    "validationId": "val_1737820800000_nop456",
    "isValid": true,
    "syntax": {
      "valid": true,
      "errors": []
    },
    "identifiers": {
      "tables": {
        "checked": ["sales_data"],
        "missing": [],
        "valid": true
      },
      "columns": {
        "checked": ["product_name", "sales"],
        "missing": [],
        "valid": true
      }
    },
    "complexity": {
      "score": 2,
      "level": "simple",
      "factors": [
        {
          "type": "filter",
          "score": 1,
          "description": "包含WHERE子句"
        }
      ]
    },
    "recommendations": [
      "SQL语法正确",
      "所有标识符都存在",
      "查询复杂度较低，执行效率应该很高"
    ]
  },
  "meta": { ... }
}
```

#### 5.1.2 检测AI幻觉

```http
POST /api/v2/quality/detect-hallucination
```

**请求体：**

```json
{
  "aiResponse": "总销售额为150万元，平均客单价为500元",
  "sourceData": {
    "totalSales": 1500000,
    "avgOrderValue": 500
  },
  "context": {
    "query": "计算总销售额和平均客单价",
    "dataSource": "sales_data"
  }
}
```

**响应：** `200 OK`

```json
{
  "success": true,
  "data": {
    "detectionId": "hall_1737820800000_qrs567",
    "hasHallucination": false,
    "confidence": 0.95,
    "details": [
      {
        "claim": "总销售额为150万元",
        "verified": true,
        "sourceValue": 1500000,
        "match": true
      },
      {
        "claim": "平均客单价为500元",
        "verified": true,
        "sourceValue": 500,
        "match": true
      }
    ],
    "summary": "未检测到幻觉，AI响应与源数据一致"
  },
  "meta": { ... }
}
```

#### 5.1.3 生成修复建议

```http
POST /api/v2/quality/fix-suggestions
```

**请求体：**

```json
{
  "error": {
    "code": "COLUMN_NOT_FOUND",
    "message": "列 'product_nam' 不存在",
    "context": {
      "sql": "SELECT product_nam FROM sales_data",
      "availableColumns": ["product_name", "sales", "quantity"]
    }
  }
}
```

**响应：** `200 OK`

```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "id": "fix_001",
        "type": "typo_correction",
        "severity": "error",
        "message": "检测到拼写错误",
        "canAutoFix": true,
        "suggested": "SELECT product_name FROM sales_data",
        "autoFixCode": "sql.replace('product_nam', 'product_name')",
        "confidence": 0.98,
        "reasoning": "product_nam 与 product_name 相似度极高（98%），可能是拼写错误"
      }
    ]
  },
  "meta": { ... }
}
```

### 5.2 质量门禁

#### 5.2.1 创建质量门禁

```http
POST /api/v2/quality/gates
```

**请求体：**

```json
{
  "name": "SQL质量门禁",
  "description": "确保生成的SQL符合质量标准",
  "enabled": true,
  "criteria": [
    {
      "type": "syntax_check",
      "required": true,
      "severity": "error"
    },
    {
      "type": "hallucination_check",
      "required": true,
      "threshold": 0.8,
      "severity": "error"
    },
    {
      "type": "performance_check",
      "required": false,
      "threshold": 5000,
      "severity": "warning"
    }
  ],
  "actions": {
    "onPass": [
      "allow_execution"
    ],
    "onFail": [
      "block_execution",
      "log_violation",
      "notify_user"
    ]
  }
}
```

**响应：** `201 Created`

```json
{
  "success": true,
  "data": {
    "gateId": "gate_1737820800000_tuv678",
    "name": "SQL质量门禁",
    "status": "active",
    "createdAt": "2026-01-25T10:30:00Z"
  },
  "meta": { ... }
}
```

#### 5.2.2 执行质量门禁检查

```http
POST /api/v2/quality/gates/{gateId}/check
```

**请求体：**

```json
{
  "content": {
    "sql": "SELECT product_name, sales FROM sales_data WHERE sales > 100000",
    "context": { ... }
  }
}
```

**响应：** `200 OK`

```json
{
  "success": true,
  "data": {
    "gateId": "gate_1737820800000_tuv678",
    "passed": true,
    "overallScore": 95,
    "checkedAt": "2026-01-25T10:30:00Z",
    "results": [
      {
        "criteria": "syntax_check",
        "passed": true,
        "score": 100,
        "message": "SQL语法正确",
        "severity": "error"
      },
      {
        "criteria": "hallucination_check",
        "passed": true,
        "score": 95,
        "message": "未检测到幻觉",
        "severity": "error"
      },
      {
        "criteria": "performance_check",
        "passed": true,
        "score": 90,
        "message": "预计执行时间3.5s，符合要求",
        "severity": "warning"
      }
    ],
    "recommendations": [
      "所有检查通过，允许执行",
      "建议监控实际执行时间"
    ]
  },
  "meta": { ... }
}
```

---

## WebSocket接口

### 连接端点

```
wss://api.excelmind.ai/v2/stream
```

### 连接认证

```javascript
const ws = new WebSocket('wss://api.excelmind.ai/v2/stream?token={access_token}');
```

### 订阅事件

客户端连接后发送订阅消息：

```json
{
  "action": "subscribe",
  "channels": [
    "task_progress",
    "generation_status",
    "audit_alerts"
  ],
  "filters": {
    "taskId": "task_1737820800000_vwx234"
  }
}
```

### 服务器推送事件

#### 任务进度更新

```json
{
  "type": "task_progress",
  "taskId": "task_1737820800000_vwx234",
  "timestamp": "2026-01-25T10:30:15Z",
  "data": {
    "progress": 45,
    "currentStep": "生成文档中",
    "completedSteps": 3,
    "totalSteps": 7,
    "estimatedTimeRemaining": 165,
    "currentItem": {
      "templateName": "销售合同模板",
      "documentIndex": 25,
      "totalDocuments": 50
    }
  }
}
```

#### 生成状态更新

```json
{
  "type": "generation_status",
  "taskId": "task_1737820800000_vwx234",
  "timestamp": "2026-01-25T10:30:20Z",
  "data": {
    "templateId": "tmpl_1737820800000_mno345",
    "templateName": "销售合同模板",
    "status": "completed",
    "completedCount": 50,
    "totalCount": 50,
    "failedCount": 0,
    "downloadUrl": "/api/v2/generation/download/task_1737820800000_vwx234/tmpl_1737820800000_mno345/completed"
  }
}
```

#### 审计告警

```json
{
  "type": "audit_alert",
  "severity": "high",
  "timestamp": "2026-01-25T10:30:25Z",
  "data": {
    "auditId": "audit_run_1737820800000_efg789",
    "ruleId": "audit_1737820800000_bcd456",
    "ruleName": "金额范围检查",
    "message": "发现金额超出范围的记录",
    "violations": [
      {
        "row": 88,
        "field": "销售额",
        "value": 9999999
      }
    ]
  }
}
```

#### 性能告警

```json
{
  "type": "performance_alert",
  "severity": "warning",
  "timestamp": "2026-01-25T10:30:30Z",
  "data": {
    "alertId": "alert_1737820800000_klm345",
    "metric": "query_response_time",
    "currentValue": 1200,
    "threshold": 1000,
    "message": "查询响应时间超过阈值"
  }
}
```

---

## 错误处理

### 错误代码

| 代码 | HTTP状态 | 描述 |
|------|----------|------|
| VALIDATION_ERROR | 400 | 请求参数验证失败 |
| UNAUTHORIZED | 401 | 未授权 |
| FORBIDDEN | 403 | 禁止访问 |
| NOT_FOUND | 404 | 资源不存在 |
| CONFLICT | 409 | 资源冲突 |
| RATE_LIMIT_EXCEEDED | 429 | 超出速率限制 |
| INTERNAL_ERROR | 500 | 服务器内部错误 |

### Phase 2 特定错误代码

| 代码 | HTTP状态 | 描述 |
|------|----------|------|
| DATA_QUALITY_ANALYSIS_FAILED | 500 | 数据质量分析失败 |
| FILE_NOT_FOUND | 404 | 文件不存在 |
| TEMPLATE_NOT_FOUND | 404 | 模板不存在 |
| TEMPLATE_INVALID | 400 | 模板格式无效 |
| GENERATION_FAILED | 500 | 文档生成失败 |
| AUDIT_RULE_NOT_FOUND | 404 | 审计规则不存在 |
| AUDIT_EXECUTION_FAILED | 500 | 审计执行失败 |
| SQL_SYNTAX_ERROR | 400 | SQL语法错误 |
| SQL_IDENTIFIER_NOT_FOUND | 400 | SQL标识符不存在 |
| HALLUCINATION_DETECTED | 400 | 检测到AI幻觉 |
| QUALITY_GATE_FAILED | 400 | 质量门禁检查失败 |

### 错误响应示例

```json
{
  "success": false,
  "error": {
    "code": "SQL_SYNTAX_ERROR",
    "message": "SQL语法错误",
    "details": [
      {
        "field": "sql",
        "message": "未闭合的括号",
        "line": 1,
        "column": 25
      }
    ],
    "requestId": "req_20260125_001",
    "timestamp": "2026-01-25T10:30:00Z",
    "helpUrl": "https://docs.excelmind.ai/errors/sql-syntax"
  }
}
```

---

## 速率限制

### 限制规则

| 级别 | 请求限制 | 窗口 |
|------|----------|------|
| 免费用户 | 60 requests | 1 minute |
| 基础用户 | 300 requests | 1 minute |
| 专业用户 | 1000 requests | 1 minute |
| 企业用户 | 5000 requests | 1 minute |

### 特殊端点限制

| 端点类型 | 限制 | 窗口 |
|---------|------|------|
| AI调用 | 30 requests | 1 minute |
| 批量生成 | 5 tasks | 1 hour |
| 文档下载 | 100 requests | 1 minute |

### 响应头

```http
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 295
X-RateLimit-Reset: 1737820860
X-RateLimit-Reset-After: 45
```

---

## 认证授权

### API密钥认证

```http
Authorization: Bearer your_api_key_here
```

### 获取API密钥

1. 登录 ExcelMind AI 控制台
2. 进入 "API密钥" 页面
3. 点击 "创建密钥"
4. 选择密钥权限范围
5. 复制密钥（仅显示一次）

### 密钥权限

| 权限 | 描述 |
|------|------|
| read | 读取任务、模板、数据 |
| write | 创建和编辑资源 |
| delete | 删除资源 |
| execute | 执行查询和生成 |
| admin | 管理员权限 |

### OAuth 2.0 认证

#### 授权码流程

```http
GET https://api.excelmind.ai/v2/oauth/authorize?
  response_type=code&
  client_id={client_id}&
  redirect_uri={redirect_uri}&
  scope=read write&
  state={state}
```

#### 获取访问令牌

```http
POST https://api.excelmind.ai/v2/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code={code}&
redirect_uri={redirect_uri}&
client_id={client_id}&
client_secret={client_secret}
```

**响应：**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "scope": "read write"
}
```

---

## 附录

### API版本历史

#### v2.0.0 (2026-01-25)
- 新增智能数据处理模块
- 新增多模板文档生成模块
- 新增审计规则引擎模块
- 新增性能监控模块
- 新增质量控制模块
- WebSocket实时推送支持

#### v1.0.0 (2025-01-15)
- 初始API版本
- 基础任务管理
- AI多轮交互
- 文档批量生成

### 路线图

**Phase 2.1 (计划 Q2 2026)**
- [ ] 增强AI缓存策略
- [ ] 支持更多文档格式
- [ ] 自定义审计规则模板

**Phase 2.2 (计划 Q3 2026)**
- [ ] 多租户支持
- [ ] 高级权限管理
- [ ] API使用分析和报表

**Phase 3.0 (计划 Q4 2026)**
- [ ] GraphQL API支持
- [ ] Webhook事件系统
- [ ] 批量操作优化

### SDK支持

提供官方SDK：

- JavaScript/TypeScript
- Python
- Java
- Go
- C#

### 技术支持

- 文档: https://docs.excelmind.ai
- GitHub: https://github.com/excelmind/api
- 邮件: support@excelmind.ai
- 状态页: https://status.excelmind.ai

---

**文档版本**: v2.0.0
**最后更新**: 2026-01-25
**维护者**: ExcelMind AI API Team
