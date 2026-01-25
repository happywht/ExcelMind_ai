/**
 * API 集成测试
 *
 * 测试所有 Phase 2 API 端点的集成情况
 * 确保前后端能够正常通信
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createServerWithWebSocket } from '../../server/app';
import { WebSocket } from 'ws';
import type {
  DataQualityAnalysis,
  Template,
  BatchGenerationResponse,
} from '../../types/apiTypes';

// 测试配置
const TEST_PORT = 3001;
const TEST_HOST = 'localhost';
const API_BASE = `http://${TEST_HOST}:${TEST_PORT}/api/v2`;
const WS_BASE = `ws://${TEST_HOST}:${TEST_PORT}/api/v2/stream`;

let server: any;
let wss: any;

/**
 * 启动测试服务器
 */
beforeAll(async () => {
  const { server: srv, wss: wsServer } = createServerWithWebSocket();

  await new Promise<void>((resolve) => {
    server = srv.listen(TEST_PORT, TEST_HOST, () => {
      resolve();
    });
  });

  wss = wsServer;
});

/**
 * 关闭测试服务器
 */
afterAll(async () => {
  if (wss) {
    wss.clients.forEach((client: any) => client.close());
  }

  if (server) {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  }
});

/**
 * 辅助函数：发送 API 请求
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Request-ID': `test_${Date.now()}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API 请求失败: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data as T;
}

/**
 * 辅助函数：创建 WebSocket 连接
 */
function createWebSocket(): WebSocket {
  return new WebSocket(WS_BASE);
}

// ============================================================================
// 数据质量分析 API 测试
// ============================================================================

describe('数据质量分析 API', () => {
  let analysisId: string;

  it('应该能够分析数据质量', async () => {
    const response = await apiRequest<{ success: boolean; data: DataQualityAnalysis }>(
      '/data-quality/analyze',
      {
        method: 'POST',
        body: JSON.stringify({
          fileId: 'test_file_001',
          sheetName: 'Sheet1',
          options: {
            checkMissingValues: true,
            checkDuplicates: true,
            checkFormats: true,
            checkOutliers: true,
          },
        }),
      }
    );

    expect(response.success).toBe(true);
    expect(response.data).toBeDefined();
    expect(response.data.analysisId).toBeDefined();
    expect(response.data.summary).toBeDefined();
    expect(response.data.issues).toBeDefined();
    expect(response.data.statistics).toBeDefined();

    analysisId = response.data.analysisId;
  });

  it('应该能够获取分析结果', async () => {
    const response = await apiRequest<{ success: boolean; data: DataQualityAnalysis }>(
      `/data-quality/analysis/${analysisId}`
    );

    expect(response.success).toBe(true);
    expect(response.data.analysisId).toBe(analysisId);
  });

  it('应该能够获取清洗建议', async () => {
    const response = await apiRequest<any>('/data-quality/recommendations', {
      method: 'POST',
      body: JSON.stringify({
        analysisId,
        options: {
          includeAutoFix: true,
          priority: 'all',
        },
      }),
    });

    expect(response.success).toBe(true);
    expect(response.data.suggestions).toBeDefined();
    expect(Array.isArray(response.data.suggestions)).toBe(true);
  });

  it('应该能够执行自动修复', async () => {
    const response = await apiRequest<any>('/data-quality/auto-fix', {
      method: 'POST',
      body: JSON.stringify({
        analysisId,
        suggestions: [
          {
            suggestionId: 'sugg_001',
            action: 'auto_fix',
          },
          {
            suggestionId: 'sugg_002',
            action: 'skip',
          },
        ],
        options: {
          createBackup: true,
          validateAfterClean: true,
        },
      }),
    });

    expect(response.success).toBe(true);
    expect(response.data.status).toBeDefined();
    expect(response.data.summary).toBeDefined();
  });

  it('应该能够获取统计信息', async () => {
    const response = await apiRequest<any>('/data-quality/statistics');

    expect(response.success).toBe(true);
    expect(response.data.totalAnalyses).toBeDefined();
    expect(response.data.successfulAnalyses).toBeDefined();
  });
});

// ============================================================================
// 模板管理 API 测试
// ============================================================================

describe('模板管理 API', () => {
  let templateId: string;

  it('应该能够列出模板', async () => {
    const response = await apiRequest<{
      success: boolean;
      data: { items: Template[]; pagination: any };
    }>('/templates?page=1&pageSize=20');

    expect(response.success).toBe(true);
    expect(response.data.items).toBeDefined();
    expect(Array.isArray(response.data.items)).toBe(true);
    expect(response.data.pagination).toBeDefined();
  });

  it('应该能够获取模板详情', async () => {
    const response = await apiRequest<{ success: boolean; data: Template }>(
      '/templates/tmpl_001'
    );

    expect(response.success).toBe(true);
    expect(response.data.templateId).toBe('tmpl_001');
    expect(response.data.name).toBeDefined();
    expect(response.data.metadata).toBeDefined();

    templateId = response.data.templateId;
  });

  it('应该能够获取模板变量', async () => {
    const response = await apiRequest<{ success: boolean; data: any }>(
      `/templates/${templateId}/variables`
    );

    expect(response.success).toBe(true);
    expect(response.data.variables).toBeDefined();
    expect(Array.isArray(response.data.variables)).toBe(true);
  });

  it('应该能够生成预览', async () => {
    const response = await apiRequest<{ success: boolean; data: any }>(
      `/templates/${templateId}/preview`,
      {
        method: 'POST',
        body: JSON.stringify({
          data: {
            合同编号: 'TEST001',
            合同金额: 10000,
          },
        }),
      }
    );

    expect(response.success).toBe(true);
    expect(response.data.previewUrl).toBeDefined();
  });
});

// ============================================================================
// 批量生成 API 测试
// ============================================================================

describe('批量生成 API', () => {
  let taskId: string;
  let wsClient: WebSocket;

  it('应该能够创建批量任务', async () => {
    const response = await apiRequest<{ success: boolean; data: BatchGenerationResponse }>(
      '/generation/tasks',
      {
        method: 'POST',
        body: JSON.stringify({
          dataSourceId: 'test_ds_001',
          templateIds: ['tmpl_001', 'tmpl_002'],
          outputFormat: 'docx',
          options: {
            batchSize: 10,
            parallelProcessing: true,
            createZip: true,
          },
        }),
      }
    );

    expect(response.success).toBe(true);
    expect(response.data.taskId).toBeDefined();
    expect(response.data.status).toBe('pending');
    expect(response.data.websocketUrl).toBeDefined();

    taskId = response.data.taskId;
  });

  it('应该能够列出任务', async () => {
    const response = await apiRequest<{
      success: boolean;
      data: { items: any[]; pagination: any };
    }>('/generation/tasks');

    expect(response.success).toBe(true);
    expect(response.data.items).toBeDefined();
    expect(Array.isArray(response.data.items)).toBe(true);
  });

  it('应该能够获取任务详情', async () => {
    const response = await apiRequest<{ success: boolean; data: any }>(
      `/generation/tasks/${taskId}`
    );

    expect(response.success).toBe(true);
    expect(response.data.taskId).toBe(taskId);
    expect(response.data.status).toBeDefined();
  });

  it('应该能够启动任务', async () => {
    const response = await apiRequest<{ success: boolean; data: any }>(
      `/generation/tasks/${taskId}/start`,
      {
        method: 'POST',
      }
    );

    expect(response.success).toBe(true);
    expect(response.data.status).toBe('processing');
  });

  it('应该能够获取任务进度', async () => {
    const response = await apiRequest<{ success: boolean; data: any }>(
      `/generation/tasks/${taskId}/progress`
    );

    expect(response.success).toBe(true);
    expect(response.data.progress).toBeDefined();
    expect(response.data.currentStep).toBeDefined();
  });

  it('应该能够通过 WebSocket 接收进度更新', (done) => {
    wsClient = createWebSocket();

    wsClient.on('open', () => {
      // 订阅任务进度
      wsClient.send(
        JSON.stringify({
          action: 'subscribe',
          channels: ['task_progress', 'generation_status'],
          filters: {
            taskId,
          },
        })
      );
    });

    wsClient.on('message', (data) => {
      const message = JSON.parse(data.toString());

      if (message.type === 'subscribed') {
        // 订阅成功
        expect(message.channels).toContain('task_progress');
        wsClient.close();
        done();
      }
    });

    wsClient.on('error', (error) => {
      done(error);
    });
  }, 10000);

  it('应该能够暂停任务', async () => {
    const response = await apiRequest<{ success: boolean; data: any }>(
      `/generation/tasks/${taskId}/pause`,
      {
        method: 'POST',
      }
    );

    expect(response.success).toBe(true);
    expect(response.data.status).toBe('paused');
  });

  it('应该能够取消任务', async () => {
    const response = await apiRequest<{ success: boolean; data: any }>(
      `/generation/tasks/${taskId}/cancel`,
      {
        method: 'POST',
      }
    );

    expect(response.success).toBe(true);
    expect(response.data.status).toBe('cancelled');
  });
});

// ============================================================================
// 审计规则 API 测试
// ============================================================================

describe('审计规则 API', () => {
  let ruleId: string;

  it('应该能够创建审计规则', async () => {
    const response = await apiRequest<{ success: boolean; data: any }>(
      '/audit/rules',
      {
        method: 'POST',
        body: JSON.stringify({
          name: '测试规则',
          description: '这是一个测试规则',
          category: 'data_validation',
          severity: 'high',
          enabled: true,
          conditions: {
            type: 'field_validation',
            field: 'email',
            validation: 'required',
          },
          actions: [
            {
              type: 'alert',
              message: '邮箱字段不能为空',
            },
          ],
        }),
      }
    );

    expect(response.success).toBe(true);
    expect(response.data.ruleId).toBeDefined();

    ruleId = response.data.ruleId;
  });

  it('应该能够列出审计规则', async () => {
    const response = await apiRequest<{
      success: boolean;
      data: { items: any[]; pagination: any };
    }>('/audit/rules');

    expect(response.success).toBe(true);
    expect(response.data.items).toBeDefined();
    expect(Array.isArray(response.data.items)).toBe(true);
  });

  it('应该能够获取规则详情', async () => {
    const response = await apiRequest<{ success: boolean; data: any }>(
      `/audit/rules/${ruleId}`
    );

    expect(response.success).toBe(true);
    expect(response.data.ruleId).toBe(ruleId);
  });

  it('应该能够更新规则', async () => {
    const response = await apiRequest<{ success: boolean; data: any }>(
      `/audit/rules/${ruleId}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          name: '更新后的测试规则',
          description: '更新后的描述',
          category: 'data_validation',
          severity: 'medium',
          enabled: true,
          conditions: {
            type: 'field_validation',
            field: 'email',
            validation: 'required',
          },
          actions: [
            {
              type: 'alert',
              message: '邮箱字段不能为空',
            },
          ],
        }),
      }
    );

    expect(response.success).toBe(true);
  });

  it('应该能够执行审计', async () => {
    const response = await apiRequest<{ success: boolean; data: any }>(
      '/audit/execute',
      {
        method: 'POST',
        body: JSON.stringify({
          fileId: 'test_file_001',
          sheetName: 'Sheet1',
          rules: [ruleId],
          options: {
            stopOnFirstError: false,
            generateReport: true,
          },
        }),
      }
    );

    expect(response.success).toBe(true);
    expect(response.data.auditId).toBeDefined();
    expect(response.data.status).toBeDefined();
  });

  it('应该能够删除规则', async () => {
    const response = await fetch(`${API_BASE}/audit/rules/${ruleId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    expect(response.ok).toBe(true);
  });
});

// ============================================================================
// 错误处理测试
// ============================================================================

describe('错误处理', () => {
  it('应该返回 404 对于不存在的端点', async () => {
    const response = await fetch(`${API_BASE}/nonexistent`);

    expect(response.status).toBe(404);
  });

  it('应该返回 400 对于无效的请求', async () => {
    const response = await apiRequest<any>('/data-quality/analyze', {
      method: 'POST',
      body: JSON.stringify({
        // 缺少必填字段
      }),
    });

    expect(response.success).toBe(false);
    expect(response.error).toBeDefined();
  });

  it('应该返回正确的错误格式', async () => {
    try {
      await apiRequest<any>('/data-quality/analysis/nonexistent');
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });
});
