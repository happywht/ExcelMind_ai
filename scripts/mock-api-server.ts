/**
 * Mock API 服务器
 *
 * 用于开发环境的 API Mock 服务器
 * 返回真实的测试数据，支持延迟和错误模拟
 */

import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import type {
  DataQualityAnalysis,
  Template,
  BatchGenerationResponse,
  ApiResponseSuccess,
} from '../types/apiTypes';

const app = express();
const PORT = 3002;

// 中间件
app.use(cors());
app.use(express.json());

// 请求日志
app.use((req, res, next) => {
  console.log(`[Mock API] ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// Mock 数据
// ============================================================================

const mockTemplates: Template[] = [
  {
    templateId: 'tmpl_001',
    name: '销售合同模板',
    status: 'active',
    file: {
      fileName: '销售合同模板.docx',
      fileSize: 45678,
      uploadTime: '2026-01-20T10:00:00Z',
      downloadUrl: '/api/v2/templates/tmpl_001/download',
    },
    metadata: {
      placeholders: [
        {
          key: '合同编号',
          rawPlaceholder: '{{合同编号}}',
          dataType: 'string',
          required: true,
          format: undefined,
          context: {
            section: '基本信息',
            position: 1,
          },
        },
        {
          key: '合同金额',
          rawPlaceholder: '{{合同金额}}',
          dataType: 'number',
          required: true,
          format: 'currency',
          context: {
            section: '金额信息',
            position: 3,
          },
        },
      ],
      hasLoops: true,
      hasConditionals: true,
      hasTables: true,
      pageCount: 5,
      wordCount: 1500,
    },
    defaultMappings: {
      explanation: '基于模板内容自动生成的映射方案',
      filterCondition: null,
      primarySheet: 'Sheet1',
      mappings: [
        {
          placeholder: '{{合同编号}}',
          excelColumn: 'contract_id',
          confidence: 1.0,
        },
        {
          placeholder: '{{合同金额}}',
          excelColumn: 'amount',
          confidence: 0.95,
        },
      ],
      crossSheetMappings: [],
      unmappedPlaceholders: [],
    },
    usageStats: {
      totalGenerations: 125,
      lastUsed: '2026-01-24T15:30:00Z',
      successRate: 0.98,
    },
    createdAt: '2026-01-20T10:00:00Z',
    updatedAt: '2026-01-25T10:30:00Z',
    category: '合同',
    tags: ['销售', '合同'],
    description: '用于生成销售合同的标准模板',
  },
  {
    templateId: 'tmpl_002',
    name: '采购订单模板',
    status: 'active',
    file: {
      fileName: '采购订单模板.docx',
      fileSize: 38256,
      uploadTime: '2026-01-18T10:00:00Z',
      downloadUrl: '/api/v2/templates/tmpl_002/download',
    },
    metadata: {
      placeholders: [
        {
          key: '订单编号',
          rawPlaceholder: '{{订单编号}}',
          dataType: 'string',
          required: true,
          format: undefined,
          context: {
            section: '订单信息',
            position: 1,
          },
        },
      ],
      hasLoops: false,
      hasConditionals: false,
      hasTables: true,
      pageCount: 3,
      wordCount: 800,
    },
    createdAt: '2026-01-18T10:00:00Z',
    updatedAt: '2026-01-22T10:30:00Z',
    category: '订单',
    tags: ['采购', '订单'],
    description: '用于生成采购订单',
  },
];

const mockAnalysisData: Record<string, DataQualityAnalysis> = {};

// ============================================================================
// 辅助函数
// ============================================================================

function createSuccessResponse<T>(data: T): ApiResponseSuccess<T> {
  return {
    success: true,
    data,
    meta: {
      requestId: uuidv4(),
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      executionTime: Math.floor(Math.random() * 1000),
    },
  };
}

function delay(ms: number = 500): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// 端点
// ============================================================================

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
  });
});

// 数据质量分析
app.post('/api/v2/data-quality/analyze', async (req, res) => {
  await delay(1000);

  const analysisId = `qa_${Date.now()}`;
  const analysis: DataQualityAnalysis = {
    analysisId,
    fileId: req.body.fileId,
    sheetName: req.body.sheetName,
    summary: {
      totalRows: 1000,
      totalColumns: 15,
      completeness: 0.95,
      qualityScore: 85,
    },
    issues: [
      {
        id: 'issue_001',
        type: 'missing_value',
        severity: 'high',
        location: {
          column: '客户邮箱',
          affectedRows: [5, 12, 23, 45],
        },
        description: '发现4条缺失的客户邮箱记录',
        impact: '无法发送邮件通知',
        affectedPercentage: 0.4,
      },
      {
        id: 'issue_002',
        type: 'inconsistent_format',
        severity: 'medium',
        location: {
          column: '日期',
          affectedRows: [8, 15, 27, 33, 41],
        },
        description: '发现5条日期格式不一致',
        impact: '影响时间排序和筛选',
        affectedPercentage: 0.5,
      },
    ],
    statistics: {
      missingValues: {
        total: 50,
        byColumn: {
          '客户邮箱': 4,
          '联系电话': 8,
          '地址': 38,
        },
      },
      duplicates: {
        total: 10,
        duplicateSets: 2,
      },
      formatIssues: {
        total: 15,
        byType: {
          date: 8,
          phone: 5,
          email: 2,
        },
      },
      outliers: {
        total: 3,
        byColumn: {
          '销售额': 1,
          '数量': 2,
        },
      },
    },
    recommendations: [
      '建议填充缺失的客户邮箱信息',
      '建议删除重复的订单记录',
      '建议统一日期格式为YYYY-MM-DD',
    ],
  };

  mockAnalysisData[analysisId] = analysis;

  res.json(createSuccessResponse(analysis));
});

app.get('/api/v2/data-quality/analysis/:id', async (req, res) => {
  await delay(300);

  const analysis = mockAnalysisData[req.params.id];
  if (!analysis) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: '分析结果不存在',
      },
    });
  }

  res.json(createSuccessResponse(analysis));
});

app.post('/api/v2/data-quality/recommendations', async (req, res) => {
  await delay(800);

  const suggestions = {
    analysisId: req.body.analysisId,
    suggestions: [
      {
        id: 'sugg_001',
        issueId: 'issue_001',
        priority: 'high',
        title: '填充缺失的客户邮箱',
        description: '发现4条缺失的客户邮箱记录',
        impact: '缺失邮箱将影响客户通知发送',
        estimatedTime: 5,
        canAutoFix: false,
        steps: ['检查CRM系统', '导入数据', '添加标记'],
        manualAction: {
          type: 'lookup',
          source: 'CRM系统',
          mapping: 'customer_id -> email',
        },
      },
      {
        id: 'sugg_002',
        issueId: 'issue_002',
        priority: 'medium',
        title: '统一日期格式',
        description: '将所有日期统一为YYYY-MM-DD格式',
        impact: '统一格式后可正确排序',
        estimatedTime: 2,
        canAutoFix: true,
        autoFixCode: "row['日期'] = new Date(row['日期']).toISOString().split('T')[0]",
        steps: ['识别格式', '统一转换', '验证有效性'],
        preview: {
          affectedRows: 8,
          examples: [
            { original: '25/01/2026', converted: '2026-01-25' },
          ],
        },
      },
    ],
    totalSuggestions: 2,
    canAutoFixCount: 1,
    estimatedTotalTime: 7,
  };

  res.json(createSuccessResponse(suggestions));
});

app.post('/api/v2/data-quality/auto-fix', async (req, res) => {
  await delay(2000);

  const result = {
    cleanId: `clean_${Date.now()}`,
    analysisId: req.body.analysisId,
    status: 'completed',
    results: req.body.suggestions.map((s: any) => ({
      suggestionId: s.suggestionId,
      status: s.action === 'skip' ? 'skipped' : 'success',
      affectedRows: s.action !== 'skip' ? 10 : 0,
      message: s.action === 'skip' ? '已跳过' : '执行成功',
    })),
    summary: {
      totalProcessed: req.body.suggestions.length,
      successful: req.body.suggestions.filter((s: any) => s.action !== 'skip').length,
      skipped: req.body.suggestions.filter((s: any) => s.action === 'skip').length,
      failed: 0,
      finalQualityScore: 92,
      qualityImprovement: 7,
    },
    backupFile: req.body.options?.createBackup
      ? {
          fileId: `backup_${Date.now()}`,
          fileName: `backup_${Date.now()}.xlsx`,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }
      : undefined,
  };

  res.json(createSuccessResponse(result));
});

app.get('/api/v2/data-quality/statistics', async (req, res) => {
  await delay(200);

  const statistics = {
    totalAnalyses: 150,
    successfulAnalyses: 145,
    failedAnalyses: 5,
    totalIssuesFound: 1250,
    totalIssuesFixed: 980,
    averageQualityScore: 85,
    topIssueTypes: [
      { type: 'missing_value', count: 450 },
      { type: 'duplicate', count: 320 },
      { type: 'inconsistent_format', count: 280 },
      { type: 'outlier', count: 200 },
    ],
  };

  res.json(createSuccessResponse(statistics));
});

// 模板管理
app.get('/api/v2/templates', async (req, res) => {
  await delay(300);

  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;

  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const items = mockTemplates.slice(start, end);

  res.json(
    createSuccessResponse({
      items,
      pagination: {
        page,
        pageSize,
        total: mockTemplates.length,
        totalPages: Math.ceil(mockTemplates.length / pageSize),
        hasNext: end < mockTemplates.length,
        hasPrev: page > 1,
      },
    })
  );
});

app.get('/api/v2/templates/:id', async (req, res) => {
  await delay(200);

  const template = mockTemplates.find((t) => t.templateId === req.params.id);
  if (!template) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: '模板不存在',
      },
    });
  }

  res.json(createSuccessResponse(template));
});

app.get('/api/v2/templates/:id/variables', async (req, res) => {
  await delay(200);

  const template = mockTemplates.find((t) => t.templateId === req.params.id);
  if (!template) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: '模板不存在',
      },
    });
  }

  res.json(
    createSuccessResponse({
      templateId: req.params.id,
      variables: template.metadata.placeholders,
      totalVariables: template.metadata.placeholders.length,
      requiredVariables: template.metadata.placeholders.filter((p) => p.required).length,
      optionalVariables: template.metadata.placeholders.filter((p) => !p.required).length,
    })
  );
});

app.post('/api/v2/templates/:id/preview', async (req, res) => {
  await delay(1500);

  const preview = {
    templateId: req.params.id,
    previewUrl: `/api/v2/templates/${req.params.id}/preview/preview_${Date.now()}.docx`,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    generatedAt: new Date().toISOString(),
  };

  res.json(createSuccessResponse(preview));
});

// 批量生成
app.post('/api/v2/generation/tasks', async (req, res) => {
  await delay(800);

  const taskId = `task_${Date.now()}`;
  const response: BatchGenerationResponse = {
    taskId,
    status: 'pending',
    estimatedTime: 300,
    estimatedDocumentCount: 100,
    items: req.body.templateIds.map((templateId: string, index: number) => ({
      templateId,
      templateName: `模板 ${index + 1}`,
      estimatedCount: 50,
    })),
    websocketUrl: `ws://localhost:${PORT}/api/v2/stream/${taskId}`,
  };

  res.status(202).json(createSuccessResponse(response));
});

app.get('/api/v2/generation/tasks', async (req, res) => {
  await delay(200);

  const tasks = [
    {
      taskId: 'task_001',
      status: 'processing',
      dataSourceId: 'ds_001',
      templateIds: ['tmpl_001', 'tmpl_002'],
      outputFormat: 'docx',
      progress: 45,
      createdAt: '2026-01-25T10:00:00Z',
      startedAt: '2026-01-25T10:05:00Z',
      estimatedEndTime: '2026-01-25T10:10:00Z',
    },
  ];

  res.json(
    createSuccessResponse({
      items: tasks,
      pagination: {
        page: 1,
        pageSize: 20,
        total: tasks.length,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    })
  );
});

app.get('/api/v2/generation/tasks/:id', async (req, res) => {
  await delay(200);

  const task = {
    taskId: req.params.id,
    status: 'processing',
    progress: 45,
    currentStep: '生成文档中',
    startedAt: '2026-01-25T10:00:00Z',
    estimatedEndTime: '2026-01-25T10:05:00Z',
    items: [
      {
        templateId: 'tmpl_001',
        templateName: '销售合同模板',
        status: 'processing',
        progress: 50,
        completedCount: 25,
        totalCount: 50,
        failedCount: 0,
      },
    ],
    summary: {
      totalDocuments: 100,
      completedDocuments: 25,
      failedDocuments: 0,
      pendingDocuments: 75,
    },
  };

  res.json(createSuccessResponse(task));
});

// ============================================================================
// 启动服务器
// ============================================================================

app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('Mock API 服务器已启动');
  console.log('='.repeat(60));
  console.log(`地址: http://localhost:${PORT}`);
  console.log('');
  console.log('可用端点:');
  console.log(`  GET  /health`);
  console.log(`  POST /api/v2/data-quality/analyze`);
  console.log(`  GET  /api/v2/data-quality/analysis/:id`);
  console.log(`  POST /api/v2/data-quality/recommendations`);
  console.log(`  POST /api/v2/data-quality/auto-fix`);
  console.log(`  GET  /api/v2/data-quality/statistics`);
  console.log(`  GET  /api/v2/templates`);
  console.log(`  GET  /api/v2/templates/:id`);
  console.log(`  GET  /api/v2/templates/:id/variables`);
  console.log(`  POST /api/v2/templates/:id/preview`);
  console.log(`  POST /api/v2/generation/tasks`);
  console.log(`  GET  /api/v2/generation/tasks`);
  console.log('='.repeat(60));
});

export default app;
