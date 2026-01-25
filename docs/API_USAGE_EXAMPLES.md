# Phase 2 API 使用示例

> **版本**: v2.0.0
> **更新日期**: 2026-01-25

本文档提供了 Phase 2 API 的实际使用示例，包括请求和响应的完整代码示例。

## 目录

- [环境准备](#环境准备)
- [智能数据处理示例](#智能数据处理示例)
- [多模板文档生成示例](#多模板文档生成示例)
- [审计规则引擎示例](#审计规则引擎示例)
- [性能监控示例](#性能监控示例)
- [质量控制示例](#质量控制示例)
- [WebSocket 集成示例](#websocket-集成示例)

---

## 环境准备

### 安装依赖

```bash
npm install axios
# 或
pnpm install axios
```

### 配置 API 客户端

```typescript
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import {
  ApiResponseSuccess,
  ApiErrorResponse,
  ApiErrorCode,
} from '../types/apiTypes';

/**
 * API 客户端类
 */
class ExcelMindAPIClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor(baseURL: string, apiKey: string) {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // 请求拦截器
    this.client.interceptors.request.use((config) => {
      config.headers['X-Request-ID'] = this.generateRequestId();
      return config;
    });

    // 响应拦截器
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        return Promise.reject(this.handleError(error));
      }
    );
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private handleError(error: any): ApiErrorResponse {
    if (error.response) {
      return error.response.data;
    }
    return {
      success: false,
      error: {
        code: ApiErrorCode.UNKNOWN_ERROR,
        message: '网络错误或服务器无响应',
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * 通用 GET 请求
   */
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponseSuccess<T>> {
    const response = await this.client.get<ApiResponseSuccess<T>>(url, config);
    return response.data;
  }

  /**
   * 通用 POST 请求
   */
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponseSuccess<T>> {
    const response = await this.client.post<ApiResponseSuccess<T>>(url, data, config);
    return response.data;
  }

  /**
   * 通用 PUT 请求
   */
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponseSuccess<T>> {
    const response = await this.client.put<ApiResponseSuccess<T>>(url, data, config);
    return response.data;
  }

  /**
   * 通用 DELETE 请求
   */
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponseSuccess<T>> {
    const response = await this.client.delete<ApiResponseSuccess<T>>(url, config);
    return response.data;
  }
}

// 创建 API 客户端实例
const apiClient = new ExcelMindAPIClient(
  'https://api.excelmind.ai/v2',
  'your_api_key_here'
);

export default apiClient;
```

---

## 智能数据处理示例

### 1. 数据质量分析

```typescript
import apiClient from './api-client';
import {
  DataQualityAnalyzeRequest,
  DataQualityAnalysis,
  ApiErrorCode,
} from '../types/apiTypes';

/**
 * 分析数据质量
 */
async function analyzeDataQuality(
  fileId: string,
  sheetName: string
): Promise<DataQualityAnalysis> {
  try {
    const request: DataQualityAnalyzeRequest = {
      fileId,
      sheetName,
      options: {
        checkMissingValues: true,
        checkDuplicates: true,
        checkFormats: true,
        checkOutliers: true,
        sampleSize: 1000,
      },
    };

    const response = await apiClient.post<DataQualityAnalysis>(
      '/data-quality/analyze',
      request
    );

    console.log('数据质量分析完成:', response.data);
    return response.data;
  } catch (error) {
    console.error('数据质量分析失败:', error);
    throw error;
  }
}

// 使用示例
analyzeDataQuality('file_1737820800000_abc123', '销售数据')
  .then((analysis) => {
    console.log('质量分数:', analysis.summary.qualityScore);
    console.log('发现问题数:', analysis.issues.length);
    analysis.issues.forEach((issue) => {
      console.log(`- ${issue.type}: ${issue.description}`);
    });
  })
  .catch((error) => {
    console.error('分析失败:', error.error.message);
  });
```

### 2. 获取清洗建议

```typescript
import {
  DataQualitySuggestionsRequest,
  CleaningSuggestion,
} from '../types/apiTypes';

/**
 * 获取清洗建议
 */
async function getCleaningSuggestions(
  analysisId: string
): Promise<CleaningSuggestion[]> {
  try {
    const request: DataQualitySuggestionsRequest = {
      analysisId,
      options: {
        includeAutoFix: true,
        priority: 'high',
      },
    };

    const response = await apiClient.post<{
      analysisId: string;
      suggestions: CleaningSuggestion[];
      totalSuggestions: number;
      canAutoFixCount: number;
      estimatedTotalTime: number;
    }>('/data-quality/suggestions', request);

    return response.data.suggestions;
  } catch (error) {
    console.error('获取清洗建议失败:', error);
    throw error;
  }
}

// 使用示例
getCleaningSuggestions('qa_1737820800000_xyz789')
  .then((suggestions) => {
    console.log(`找到 ${suggestions.length} 个清洗建议`);

    // 过滤出可以自动修复的建议
    const autoFixable = suggestions.filter((s) => s.canAutoFix);
    console.log(`其中 ${autoFixable.length} 个可以自动修复`);

    // 显示每个建议
    suggestions.forEach((suggestion) => {
      console.log(`\n优先级: ${suggestion.priority}`);
      console.log(`标题: ${suggestion.title}`);
      console.log(`描述: ${suggestion.description}`);
      console.log(`预计耗时: ${suggestion.estimatedTime} 分钟`);
      console.log(`可自动修复: ${suggestion.canAutoFix ? '是' : '否'}`);
    });
  })
  .catch((error) => {
    console.error('获取建议失败:', error);
  });
```

### 3. 执行数据清洗

```typescript
import {
  DataQualityCleanRequest,
  CleaningAction,
  DataQualityCleanResult,
} from '../types/apiTypes';

/**
 * 执行数据清洗
 */
async function cleanData(
  analysisId: string,
  suggestions: CleaningSuggestion[]
): Promise<DataQualityCleanResult> {
  try {
    // 构建清洗操作列表
    const actions: CleaningAction[] = suggestions.map((suggestion) => {
      if (suggestion.canAutoFix) {
        return {
          suggestionId: suggestion.id,
          action: 'auto_fix',
        };
      } else {
        return {
          suggestionId: suggestion.id,
          action: 'skip', // 或 'manual'，并提供 manualValue
        };
      }
    });

    const request: DataQualityCleanRequest = {
      analysisId,
      suggestions: actions,
      options: {
        createBackup: true,
        validateAfterClean: true,
      },
    };

    const response = await apiClient.post<DataQualityCleanResult>(
      '/data-quality/clean',
      request
    );

    return response.data;
  } catch (error) {
    console.error('数据清洗失败:', error);
    throw error;
  }
}

// 使用示例
async function performDataCleaning() {
  // 1. 分析数据质量
  const analysis = await analyzeDataQuality('file_123', '销售数据');

  // 2. 获取清洗建议
  const suggestions = await getCleaningSuggestions(analysis.analysisId);

  // 3. 执行清洗
  const result = await cleanData(analysis.analysisId, suggestions);

  console.log('清洗完成!');
  console.log(`处理记录数: ${result.summary.totalProcessed}`);
  console.log(`质量提升: ${result.summary.qualityImprovement} 分`);
  console.log(`最终质量分数: ${result.summary.finalQualityScore}`);

  if (result.backupFile) {
    console.log(`备份文件: ${result.backupFile.fileName}`);
  }
}
```

---

## 多模板文档生成示例

### 1. 上传模板

```typescript
import { TemplateUploadRequest, Template } from '../types/apiTypes';

/**
 * 上传模板
 */
async function uploadTemplate(
  file: File,
  name: string,
  category: string,
  tags: string[]
): Promise<Template> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    formData.append('category', category);
    tags.forEach((tag) => formData.append('tags', tag));

    const response = await apiClient.post<Template>(
      '/templates',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('模板上传失败:', error);
    throw error;
  }
}

// 使用示例
const templateFile = new File([''], '销售合同模板.docx');

uploadTemplate(
  templateFile,
  '销售合同模板',
  '合同',
  ['销售', '合同', '标准']
)
  .then((template) => {
    console.log('模板上传成功!');
    console.log('模板 ID:', template.templateId);
    console.log('占位符数量:', template.metadata.placeholders.length);
  })
  .catch((error) => {
    console.error('上传失败:', error);
  });
```

### 2. 批量生成文档

```typescript
import {
  BatchGenerationRequest,
  BatchGenerationResponse,
  GenerationStatus,
} from '../types/apiTypes';

/**
 * 创建批量生成任务
 */
async function createBatchGeneration(
  dataSourceId: string,
  templateIds: string[]
): Promise<BatchGenerationResponse> {
  try {
    const request: BatchGenerationRequest = {
      dataSourceId,
      templateIds,
      outputFormat: 'docx',
      options: {
        batchSize: 100,
        parallelProcessing: true,
        createZip: true,
        zipFileName: `合同批量_${Date.now()}`,
      },
      filters: {
        condition: "row['status'] === 'active'",
        limit: 50,
      },
      notification: {
        webhook: 'https://example.com/webhook',
        email: 'user@example.com',
      },
    };

    const response = await apiClient.post<BatchGenerationResponse>(
      '/generation/batch',
      request
    );

    return response.data;
  } catch (error) {
    console.error('创建批量生成任务失败:', error);
    throw error;
  }
}

/**
 * 轮询生成状态
 */
async function pollGenerationStatus(
  taskId: string,
  maxAttempts: number = 30,
  intervalMs: number = 5000
): Promise<GenerationStatus> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await apiClient.get<GenerationStatus>(
        `/generation/status/${taskId}`
      );

      const status = response.data;

      console.log(`进度: ${status.progress}% - ${status.currentStep}`);

      if (status.status === 'completed' || status.status === 'failed') {
        return status;
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    } catch (error) {
      console.error('获取状态失败:', error);
      throw error;
    }
  }

  throw new Error('任务超时');
}

// 使用示例
async function generateDocuments() {
  // 1. 创建批量生成任务
  const batchResponse = await createBatchGeneration(
    'ds_1737820800000_pqr678',
    ['tmpl_1737820800000_mno345']
  );

  console.log('任务已创建:', batchResponse.taskId);
  console.log('预计文档数:', batchResponse.estimatedDocumentCount);

  // 2. 轮询生成状态
  const status = await pollGenerationStatus(batchResponse.taskId);

  if (status.status === 'completed') {
    console.log('生成完成!');
    console.log(`成功生成 ${status.summary.completedDocuments} 个文档`);

    // 3. 下载 ZIP 文件
    const downloadUrl = `/generation/download/${status.taskId}/zip`;
    window.open(`https://api.excelmind.ai/v2${downloadUrl}`, '_blank');
  } else {
    console.error('生成失败');
  }
}
```

---

## 审计规则引擎示例

### 1. 创建审计规则

```typescript
import {
  AuditRuleCreateRequest,
  AuditRule,
} from '../types/apiTypes';

/**
 * 创建审计规则
 */
async function createAuditRule(
  name: string,
  description: string,
  field: string
): Promise<AuditRule> {
  try {
    const request: AuditRuleCreateRequest = {
      name,
      description,
      category: 'data_quality',
      severity: 'high',
      enabled: true,
      conditions: {
        type: 'field_validation',
        field,
        validation: 'not_empty',
      },
      actions: [
        {
          type: 'alert',
          message: `发现空的${field}`,
        },
        {
          type: 'block',
          reason: `${field}不能为空`,
        },
      ],
      schedule: {
        frequency: 'on_data_change',
      },
    };

    const response = await apiClient.post<AuditRule>(
      '/audit/rules',
      request
    );

    return response.data;
  } catch (error) {
    console.error('创建审计规则失败:', error);
    throw error;
  }
}

// 使用示例
createAuditRule(
  '客户邮箱完整性检查',
  '确保客户邮箱字段不为空',
  'customer_email'
)
  .then((rule) => {
    console.log('审计规则创建成功!');
    console.log('规则 ID:', rule.ruleId);
    console.log('严重程度:', rule.severity);
  })
  .catch((error) => {
    console.error('创建失败:', error);
  });
```

### 2. 执行审计

```typescript
import {
  AuditExecuteRequest,
  AuditExecutionResult,
} from '../types/apiTypes';

/**
 * 执行审计
 */
async function executeAudit(
  fileId: string,
  sheetName: string,
  ruleIds?: string[]
): Promise<AuditExecutionResult> {
  try {
    const request: AuditExecuteRequest = {
      fileId,
      sheetName,
      rules: ruleIds,
      options: {
        stopOnFirstError: false,
        generateReport: true,
      },
    };

    const response = await apiClient.post<AuditExecutionResult>(
      '/audit/execute',
      request
    );

    return response.data;
  } catch (error) {
    console.error('执行审计失败:', error);
    throw error;
  }
}

// 使用示例
async function performAudit() {
  const result = await executeAudit(
    'file_1737820800000_abc123',
    '销售数据',
    ['audit_1737820800000_yza345']
  );

  console.log('审计完成!');
  console.log(`检查规则数: ${result.summary.totalRules}`);
  console.log(`通过规则数: ${result.summary.passed}`);
  console.log(`失败规则数: ${result.summary.failed}`);
  console.log(`发现违规数: ${result.summary.totalViolations}`);

  result.results.forEach((ruleResult) => {
    console.log(`\n规则: ${ruleResult.ruleName}`);
    console.log(`状态: ${ruleResult.status}`);
    console.log(`检查行数: ${ruleResult.checkedRows}`);
    console.log(`违规数: ${ruleResult.violations.length}`);

    if (ruleResult.violations.length > 0) {
      ruleResult.violations.forEach((violation) => {
        console.log(`  - 行 ${violation.row}: ${violation.message}`);
      });
    }
  });
}
```

---

## 性能监控示例

### 1. 获取性能指标

```typescript
import {
  PerformanceMetricsRequest,
  PerformanceMetrics,
} from '../types/apiTypes';

/**
 * 获取性能指标
 */
async function getPerformanceMetrics(
  timeRange: '1h' | '6h' | '24h' | '7d' | '30d' = '1h'
): Promise<PerformanceMetrics> {
  try {
    const response = await apiClient.get<PerformanceMetrics>(
      `/monitoring/metrics`,
      {
        params: {
          timeRange,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('获取性能指标失败:', error);
    throw error;
  }
}

// 使用示例
async function monitorPerformance() {
  const metrics = await getPerformanceMetrics('24h');

  console.log('性能指标报告:');
  console.log('时间范围:', metrics.timeRange);

  if (metrics.metrics.queryPerformance) {
    const qp = metrics.metrics.queryPerformance;
    console.log('\n查询性能:');
    console.log(`  总查询数: ${qp.totalQueries}`);
    console.log(`  平均响应时间: ${qp.avgResponseTime}ms`);
    console.log(`  P95 响应时间: ${qp.p95ResponseTime}ms`);
    console.log(`  慢查询数: ${qp.slowQueries}`);
    console.log(`  成功率: ${(qp.successRate * 100).toFixed(2)}%`);
  }

  if (metrics.metrics.aiPerformance) {
    const ai = metrics.metrics.aiPerformance;
    console.log('\nAI 性能:');
    console.log(`  总调用数: ${ai.totalCalls}`);
    console.log(`  平均响应时间: ${ai.avgResponseTime}ms`);
    console.log(`  总令牌数: ${ai.totalTokens}`);
    console.log(`  缓存命中率: ${(ai.cacheHitRate * 100).toFixed(2)}%`);
  }
}
```

### 2. 创建性能告警

```typescript
import {
  PerformanceAlertCreateRequest,
  PerformanceAlertRule,
} from '../types/apiTypes';

/**
 * 创建性能告警规则
 */
async function createPerformanceAlert(
  name: string,
  metric: string,
  threshold: number
): Promise<PerformanceAlertRule> {
  try {
    const request: PerformanceAlertCreateRequest = {
      name,
      description: `当 ${metric} 超过 ${threshold} 时触发告警`,
      enabled: true,
      condition: {
        metric,
        operator: '>',
        threshold,
      },
      actions: [
        {
          type: 'email',
          recipients: ['admin@example.com'],
        },
        {
          type: 'webhook',
          url: 'https://example.com/webhook',
        },
      ],
    };

    const response = await apiClient.post<PerformanceAlertRule>(
      '/monitoring/alerts',
      request
    );

    return response.data;
  } catch (error) {
    console.error('创建性能告警失败:', error);
    throw error;
  }
}

// 使用示例
createPerformanceAlert(
  '慢查询告警',
  'query_response_time',
  1000
)
  .then((alert) => {
    console.log('性能告警创建成功!');
    console.log('告警 ID:', alert.alertId);
    console.log('条件:', alert.condition);
  })
  .catch((error) => {
    console.error('创建失败:', error);
  });
```

---

## 质量控制示例

### 1. 验证 SQL

```typescript
import {
  SQLValidationRequest,
  SQLValidationResult,
} from '../types/apiTypes';

/**
 * 验证 SQL
 */
async function validateSQL(
  sql: string,
  schema: any
): Promise<SQLValidationResult> {
  try {
    const request: SQLValidationRequest = {
      sql,
      schema,
    };

    const response = await apiClient.post<SQLValidationResult>(
      '/quality/validate/sql',
      request
    );

    return response.data;
  } catch (error) {
    console.error('SQL 验证失败:', error);
    throw error;
  }
}

// 使用示例
async function performSQLValidation() {
  const sql = "SELECT product_name, sales FROM sales_data WHERE sales > 100000";
  const schema = {
    tables: {
      sales_data: {
        columns: [
          { name: 'product_name', type: 'varchar' },
          { name: 'sales', type: 'decimal' },
        ],
      },
    },
  };

  const result = await validateSQL(sql, schema);

  console.log('SQL 验证结果:');
  console.log(`是否有效: ${result.isValid}`);
  console.log(`语法正确: ${result.syntax.valid}`);
  console.log(`标识符有效: ${result.identifiers.tables.valid && result.identifiers.columns.valid}`);
  console.log(`复杂度: ${result.complexity.level} (分数: ${result.complexity.score})`);

  result.recommendations.forEach((rec) => {
    console.log(`- ${rec}`);
  });
}
```

### 2. 检测幻觉

```typescript
import {
  HallucinationDetectionRequest,
  HallucinationDetectionResult,
} from '../types/apiTypes';

/**
 * 检测 AI 幻觉
 */
async function detectHallucination(
  aiResponse: string,
  sourceData: any,
  query: string
): Promise<HallucinationDetectionResult> {
  try {
    const request: HallucinationDetectionRequest = {
      aiResponse,
      sourceData,
      context: {
        query,
        dataSource: 'sales_data',
      },
    };

    const response = await apiClient.post<HallucinationDetectionResult>(
      '/quality/detect-hallucination',
      request
    );

    return response.data;
  } catch (error) {
    console.error('幻觉检测失败:', error);
    throw error;
  }
}

// 使用示例
async function checkForHallucination() {
  const aiResponse = '总销售额为150万元，平均客单价为500元';
  const sourceData = {
    totalSales: 1500000,
    avgOrderValue: 500,
  };

  const result = await detectHallucination(
    aiResponse,
    sourceData,
    '计算总销售额和平均客单价'
  );

  console.log('幻觉检测结果:');
  console.log(`是否存在幻觉: ${result.hasHallucination}`);
  console.log(`置信度: ${(result.confidence * 100).toFixed(2)}%`);
  console.log(`摘要: ${result.summary}`);

  result.details.forEach((detail) => {
    console.log(`\n声明: ${detail.claim}`);
    console.log(`已验证: ${detail.verified ? '是' : '否'}`);
    console.log(`匹配: ${detail.match ? '是' : '否'}`);
  });
}
```

---

## WebSocket 集成示例

### 1. 建立 WebSocket 连接

```typescript
import {
  WebSocketSubscribeMessage,
  TaskProgressMessage,
  GenerationStatusMessage,
} from '../types/apiTypes';

/**
 * WebSocket 客户端类
 */
class ExcelMindWebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private token: string;
  private messageHandlers: Map<string, (data: any) => void> = new Map();

  constructor(url: string, token: string) {
    this.url = url;
    this.token = token;
  }

  /**
   * 连接 WebSocket
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(`${this.url}?token=${this.token}`);

        this.ws.onopen = () => {
          console.log('WebSocket 连接已建立');
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket 错误:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('WebSocket 连接已关闭');
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 订阅频道
   */
  subscribe(channels: string[], filters?: any): void {
    const message: WebSocketSubscribeMessage = {
      action: 'subscribe',
      channels: channels as any,
      filters,
    };

    this.ws?.send(JSON.stringify(message));
    console.log('已订阅频道:', channels);
  }

  /**
   * 注册消息处理器
   */
  on(messageType: string, handler: (data: any) => void): void {
    this.messageHandlers.set(messageType, handler);
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);

      const handler = this.messageHandlers.get(message.type);
      if (handler) {
        handler(message);
      }
    } catch (error) {
      console.error('处理消息失败:', error);
    }
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.ws?.close();
    this.ws = null;
  }
}

// 使用示例
async function setupWebSocket() {
  const wsClient = new ExcelMindWebSocketClient(
    'wss://api.excelmind.ai/v2/stream',
    'your_access_token'
  );

  // 连接 WebSocket
  await wsClient.connect();

  // 订阅任务进度频道
  wsClient.subscribe(['task_progress', 'generation_status'], {
    taskId: 'task_1737820800000_vwx234',
  });

  // 注册任务进度消息处理器
  wsClient.on('task_progress', (message: TaskProgressMessage) => {
    console.log('任务进度更新:', message.data.progress);
    console.log('当前步骤:', message.data.currentStep);
    console.log(`已完成 ${message.data.completedSteps}/${message.data.totalSteps} 步骤`);
  });

  // 注册生成状态消息处理器
  wsClient.on('generation_status', (message: GenerationStatusMessage) => {
    console.log('生成状态更新:', message.data.templateName);
    console.log(`已完成 ${message.data.completedCount}/${message.data.totalCount} 个文档`);

    if (message.data.status === 'completed') {
      console.log('下载 URL:', message.data.downloadUrl);
    }
  });

  return wsClient;
}
```

### 2. React 集成示例

```typescript
import React, { useEffect, useState } from 'react';
import { TaskProgressMessage } from '../types/apiTypes';

/**
 * 任务进度组件
 */
export function TaskProgressTracker({ taskId }: { taskId: string }) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    // 建立 WebSocket 连接
    const websocket = new WebSocket(
      `wss://api.excelmind.ai/v2/stream?token=${getAccessToken()}`
    );

    websocket.onopen = () => {
      console.log('WebSocket 连接已建立');

      // 订阅任务进度
      websocket.send(JSON.stringify({
        action: 'subscribe',
        channels: ['task_progress'],
        filters: { taskId },
      }));
    };

    websocket.onmessage = (event) => {
      const message: TaskProgressMessage = JSON.parse(event.data);

      if (message.type === 'task_progress') {
        setProgress(message.data.progress);
        setCurrentStep(message.data.currentStep);
      }
    };

    websocket.onerror = (error) => {
      console.error('WebSocket 错误:', error);
    };

    websocket.onclose = () => {
      console.log('WebSocket 连接已关闭');
    };

    setWs(websocket);

    // 清理函数
    return () => {
      websocket.close();
    };
  }, [taskId]);

  return (
    <div className="task-progress">
      <h3>任务进度</h3>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p>当前步骤: {currentStep}</p>
      <p>进度: {progress}%</p>
    </div>
  );
}

function getAccessToken(): string {
  // 从 localStorage 或其他地方获取访问令牌
  return localStorage.getItem('access_token') || '';
}
```

---

## 完整工作流示例

### 端到端数据处理和文档生成流程

```typescript
/**
 * 完整的数据处理和文档生成流程
 */
async function completeWorkflow() {
  try {
    console.log('=== 开始端到端工作流 ===\n');

    // 步骤 1: 分析数据质量
    console.log('步骤 1: 分析数据质量...');
    const analysis = await analyzeDataQuality('file_123', '销售数据');
    console.log(`质量分数: ${analysis.summary.qualityScore}`);

    // 步骤 2: 获取清洗建议
    console.log('\n步骤 2: 获取清洗建议...');
    const suggestions = await getCleaningSuggestions(analysis.analysisId);
    console.log(`找到 ${suggestions.length} 个清洗建议`);

    // 步骤 3: 执行数据清洗
    console.log('\n步骤 3: 执行数据清洗...');
    const cleanResult = await cleanData(analysis.analysisId, suggestions);
    console.log(`质量提升: ${cleanResult.summary.qualityImprovement} 分`);

    // 步骤 4: 上传模板
    console.log('\n步骤 4: 上传模板...');
    const template = await uploadTemplate(
      new File([''], '合同模板.docx'),
      '销售合同模板',
      '合同',
      ['销售', '合同']
    );
    console.log(`模板 ID: ${template.templateId}`);

    // 步骤 5: 创建批量生成任务
    console.log('\n步骤 5: 创建批量生成任务...');
    const batchResponse = await createBatchGeneration(
      'ds_123',
      [template.templateId]
    );
    console.log(`任务 ID: ${batchResponse.taskId}`);

    // 步骤 6: 建立 WebSocket 连接并监控进度
    console.log('\n步骤 6: 监控生成进度...');
    const wsClient = await setupWebSocket();
    wsClient.subscribe(['task_progress'], {
      taskId: batchResponse.taskId,
    });

    wsClient.on('task_progress', (message: TaskProgressMessage) => {
      console.log(`进度: ${message.data.progress}% - ${message.data.currentStep}`);
    });

    // 步骤 7: 等待生成完成
    console.log('\n步骤 7: 等待生成完成...');
    const status = await pollGenerationStatus(batchResponse.taskId);

    if (status.status === 'completed') {
      console.log(`\n生成完成! 共生成 ${status.summary.completedDocuments} 个文档`);

      // 步骤 8: 执行审计
      console.log('\n步骤 8: 执行审计...');
      const auditResult = await executeAudit('file_123', '销售数据');
      console.log(`审计结果: ${auditResult.summary.overallStatus}`);

      // 步骤 9: 生成性能报告
      console.log('\n步骤 9: 生成性能报告...');
      const metrics = await getPerformanceMetrics('1h');
      console.log('性能指标已更新');

      console.log('\n=== 工作流完成 ===');
    } else {
      console.error('生成失败');
    }

    // 清理
    wsClient.disconnect();
  } catch (error) {
    console.error('工作流执行失败:', error);
  }
}

// 执行工作流
completeWorkflow();
```

---

## 错误处理示例

### 统一错误处理

```typescript
import { ApiErrorCode, getErrorInfo, createApiErrorResponse } from '../types/errorCodes';

/**
 * API 错误处理类
 */
class APIErrorHandler {
  /**
   * 处理 API 错误
   */
  static handle(error: any): never {
    if (error.response) {
      const errorCode = error.response.data?.error?.code;
      const errorInfo = getErrorInfo(errorCode);

      console.error('API 错误:', errorInfo.message);
      console.error('描述:', errorInfo.description);

      if (errorInfo.helpUrl) {
        console.error('帮助文档:', errorInfo.helpUrl);
      }

      // 根据错误类型进行特定处理
      switch (errorCode) {
        case ApiErrorCode.RATE_LIMIT_EXCEEDED:
          throw new Error('请求过于频繁，请稍后重试');

        case ApiErrorCode.UNAUTHORIZED:
          throw new Error('未授权，请检查 API 密钥');

        case ApiErrorCode.FILE_NOT_FOUND:
          throw new Error('文件不存在，请检查文件 ID');

        case ApiErrorCode.DATA_QUALITY_ANALYSIS_FAILED:
          throw new Error('数据质量分析失败，请检查数据格式');

        case ApiErrorCode.GENERATION_FAILED:
          throw new Error('文档生成失败，请稍后重试');

        default:
          throw new Error(errorInfo.message);
      }
    } else if (error.request) {
      throw new Error('网络错误，请检查网络连接');
    } else {
      throw new Error('未知错误');
    }
  }
}

// 使用示例
async function safeAPICall() {
  try {
    const result = await analyzeDataQuality('file_123', '销售数据');
    return result;
  } catch (error) {
    APIErrorHandler.handle(error);
  }
}
```

---

## 总结

本文档提供了 Phase 2 API 的全面使用示例，包括：

1. **环境准备**: API 客户端配置和错误处理
2. **智能数据处理**: 数据质量分析、清洗建议、数据清洗
3. **多模板文档生成**: 模板上传、批量生成、进度监控
4. **审计规则引擎**: 规则创建、审计执行、报告生成
5. **性能监控**: 指标获取、告警创建、性能报告
6. **质量控制**: SQL 验证、幻觉检测、修复建议
7. **WebSocket 集成**: 实时通信、React 集成

所有示例都可以直接使用，只需替换 API 密钥和实际的文件/数据即可。

---

**文档版本**: v1.0.0
**最后更新**: 2026-01-25
**维护者**: ExcelMind AI API Team
