/**
 * API性能测试 - Phase 2优化验证
 *
 * 测试目标:
 * 1. API响应时间符合P95 <500ms标准
 * 2. 数据质量分析API性能
 * 3. 批量任务API性能
 * 4. AI生成API性能
 * 5. 并发请求处理能力
 *
 * @author Performance Tester
 * @version 1.0.0
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { createDataQualityController } from '../../api/controllers/dataQualityController';
import { WebSocketService } from '../../services/websocket/websocketService';
import { InMemoryStorageService } from '../../services/storage/inMemoryStorageService';

// ============================================================================
// 测试基础设施
// ============================================================================

describe('Phase 2 API性能测试套件', () => {
  let app: express.Application;
  let storageService: InMemoryStorageService;
  let websocketService: WebSocketService;

  beforeAll(async () => {
    // 初始化测试服务器
    app = express();
    app.use(express.json());

    // 初始化服务
    storageService = new InMemoryStorageService();
    websocketService = new WebSocketService('server', undefined, undefined, {
      close: () => {},
      clients: new Map(),
      on: () => {}
    } as any);

    // 设置测试路由
    setupTestRoutes(app, storageService, websocketService);

    // 准备测试数据
    await prepareTestData(storageService);
  });

  afterAll(async () => {
    // 清理资源
    await storageService.clear();
    await websocketService.disconnect();
  });

  // ============================================================================
  // 数据质量分析API性能测试
  // ============================================================================

  describe('POST /api/v2/data-quality/analyze - 数据质量分析性能', () => {
    test('小数据集分析响应时间 <500ms', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .post('/api/v2/data-quality/analyze')
        .set('x-request-id', 'test-001')
        .set('x-client-id', 'client-001')
        .send({
          fileId: 'test-file-small',
          sheetName: 'Sheet1',
          options: {
            detectMissing: true,
            detectOutliers: true,
            detectDuplicates: true,
            detectFormat: true
          }
        });

      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      console.log(`✓ 小数据集分析响应时间: ${duration}ms`);
      expect(duration).toBeLessThan(500);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    test('中等数据集分析响应时间 <2000ms', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .post('/api/v2/data-quality/analyze')
        .set('x-request-id', 'test-002')
        .set('x-client-id', 'client-002')
        .send({
          fileId: 'test-file-medium',
          sheetName: 'Sheet1',
          options: {
            detectMissing: true,
            detectOutliers: true,
            detectDuplicates: true,
            detectFormat: true
          }
        });

      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      console.log(`✓ 中等数据集分析响应时间: ${duration}ms`);
      expect(duration).toBeLessThan(2000);
      expect(response.body.success).toBe(true);
    });

    test('大数据集分析使用流式处理不OOM', async () => {
      const startTime = Date.now();
      const initialMemory = process.memoryUsage().heapUsed;

      const response = await request(app)
        .post('/api/v2/data-quality/analyze')
        .set('x-request-id', 'test-003')
        .set('x-client-id', 'client-003')
        .send({
          fileId: 'test-file-large',
          sheetName: 'Sheet1',
          options: {
            detectMissing: true,
            detectOutliers: true,
            detectDuplicates: false,
            detectFormat: false
          }
        });

      const duration = Date.now() - startTime;
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      expect(response.status).toBe(200);
      console.log(`✓ 大数据集分析响应时间: ${duration}ms`);
      console.log(`✓ 内存增长: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
      expect(memoryIncrease).toBeLessThan(500 * 1024 * 1024); // <500MB
    });
  });

  // ============================================================================
  // 获取清洗建议API性能测试
  // ============================================================================

  describe('POST /api/v2/data-quality/recommendations - 清洗建议性能', () => {
    test('建议生成响应时间 <1000ms', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .post('/api/v2/data-quality/recommendations')
        .set('x-request-id', 'test-004')
        .set('x-client-id', 'client-004')
        .send({
          analysisId: 'test-analysis-001'
        });

      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      console.log(`✓ 建议生成响应时间: ${duration}ms`);
      expect(duration).toBeLessThan(1000);
      expect(response.body.data.suggestions).toBeDefined();
      expect(Array.isArray(response.body.data.suggestions)).toBe(true);
    });

    test('批量建议生成性能测试', async () => {
      const durations: number[] = [];
      const testCount = 10;

      for (let i = 0; i < testCount; i++) {
        const startTime = Date.now();

        const response = await request(app)
          .post('/api/v2/data-quality/recommendations')
          .set('x-request-id', `test-005-${i}`)
          .send({
            analysisId: `test-analysis-${i}`
          });

        const duration = Date.now() - startTime;
        durations.push(duration);

        expect(response.status).toBe(200);
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const p95Duration = durations.sort((a, b) => a - b)[Math.floor(durations.length * 0.95)];

      console.log(`✓ 平均建议生成时间: ${avgDuration.toFixed(2)}ms`);
      console.log(`✓ P95建议生成时间: ${p95Duration}ms`);
      expect(avgDuration).toBeLessThan(800);
      expect(p95Duration).toBeLessThan(1500);
    });
  });

  // ============================================================================
  // 自动修复API性能测试
  // ============================================================================

  describe('POST /api/v2/data-quality/auto-fix - 自动修复性能', () => {
    test('简单修复响应时间 <500ms', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .post('/api/v2/data-quality/auto-fix')
        .set('x-request-id', 'test-006')
        .send({
          analysisId: 'test-analysis-001',
          suggestions: [
            {
              suggestionId: 'sugg-001',
              action: 'fill'
            }
          ]
        });

      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      console.log(`✓ 简单修复响应时间: ${duration}ms`);
      expect(duration).toBeLessThan(500);
      expect(response.body.data.results).toBeDefined();
    });

    test('批量修复响应时间 <3000ms', async () => {
      const startTime = Date.now();

      const suggestions = Array.from({ length: 10 }, (_, i) => ({
        suggestionId: `sugg-${i}`,
        action: i % 2 === 0 ? 'fill' : 'delete'
      }));

      const response = await request(app)
        .post('/api/v2/data-quality/auto-fix')
        .set('x-request-id', 'test-007')
        .send({
          analysisId: 'test-analysis-001',
          suggestions
        });

      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      console.log(`✓ 批量修复响应时间: ${duration}ms`);
      expect(duration).toBeLessThan(3000);
      expect(response.body.data.results.length).toBe(10);
    });
  });

  // ============================================================================
  // 并发请求性能测试
  // ============================================================================

  describe('并发请求处理性能', () => {
    test('10个并发数据分析请求', async () => {
      const startTime = Date.now();

      const requests = Array.from({ length: 10 }, (_, i) =>
        request(app)
          .post('/api/v2/data-quality/analyze')
          .set('x-request-id', `test-concurrent-${i}`)
          .set('x-client-id', `client-${i}`)
          .send({
            fileId: 'test-file-small',
            sheetName: 'Sheet1',
            options: {
              detectMissing: true,
              detectOutliers: false,
              detectDuplicates: false,
              detectFormat: false
            }
          })
      );

      const responses = await Promise.all(requests);
      const duration = Date.now() - startTime;

      const successCount = responses.filter(r => r.status === 200).length;

      console.log(`✓ 10并发请求总耗时: ${duration}ms`);
      console.log(`✓ 成功处理: ${successCount}/10`);

      expect(successCount).toBe(10);
      expect(duration).toBeLessThan(5000); // 10个请求应该在5秒内完成
    });

    test('50个并发统计查询请求', async () => {
      const startTime = Date.now();

      const requests = Array.from({ length: 50 }, (_, i) =>
        request(app)
          .get('/api/v2/data-quality/statistics')
          .set('x-request-id', `test-stats-${i}`)
      );

      const responses = await Promise.all(requests);
      const duration = Date.now() - startTime;

      const successCount = responses.filter(r => r.status === 200).length;
      const avgResponseTime = duration / 50;

      console.log(`✓ 50并发统计查询总耗时: ${duration}ms`);
      console.log(`✓ 平均响应时间: ${avgResponseTime.toFixed(2)}ms`);

      expect(successCount).toBe(50);
      expect(avgResponseTime).toBeLessThan(100);
    });
  });

  // ============================================================================
  // 内存使用性能测试
  // ============================================================================

  describe('内存使用效率测试', () => {
    test('连续分析不导致内存泄漏', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const iterations = 20;

      for (let i = 0; i < iterations; i++) {
        await request(app)
          .post('/api/v2/data-quality/analyze')
          .set('x-request-id', `test-memory-${i}`)
          .send({
            fileId: 'test-file-medium',
            sheetName: 'Sheet1',
            options: {}
          });

        // 每5次检查一次内存
        if (i % 5 === 4) {
          const currentMemory = process.memoryUsage().heapUsed;
          const increase = currentMemory - initialMemory;
          console.log(`  迭代 ${i + 1}, 内存增长: ${Math.round(increase / 1024 / 1024)}MB`);
        }
      }

      // 强制GC（如果可用）
      if (global.gc) {
        global.gc();
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const totalIncrease = finalMemory - initialMemory;
      const avgIncreasePerIter = totalIncrease / iterations;

      console.log(`✓ 总内存增长: ${Math.round(totalIncrease / 1024 / 1024)}MB`);
      console.log(`✓ 平均每轮增长: ${Math.round(avgIncreasePerIter / 1024 / 1024)}MB`);

      // 平均每轮内存增长应该小于10MB
      expect(avgIncreasePerIter).toBeLessThan(10 * 1024 * 1024);
    });

    test('大数据集处理峰值内存控制', async () => {
      const beforeMemory = process.memoryUsage();

      const response = await request(app)
        .post('/api/v2/data-quality/analyze')
        .set('x-request-id', 'test-peak-memory')
        .send({
          fileId: 'test-file-large',
          sheetName: 'Sheet1',
          options: {
            detectMissing: true,
            detectOutliers: true
          }
        });

      expect(response.status).toBe(200);

      const afterMemory = process.memoryUsage();
      const heapIncrease = afterMemory.heapUsed - beforeMemory.heapUsed;

      console.log(`✓ 大数据集峰值内存增长: ${Math.round(heapIncrease / 1024 / 1024)}MB`);
      console.log(`  Heap Used: ${Math.round(afterMemory.heapUsed / 1024 / 1024)}MB`);
      console.log(`  RSS: ${Math.round(afterMemory.rss / 1024 / 1024)}MB`);

      // 峰值内存增长应该小于500MB
      expect(heapIncrease).toBeLessThan(500 * 1024 * 1024);
    });
  });

  // ============================================================================
  // 错误处理性能测试
  // ============================================================================

  describe('错误处理性能', () => {
    test('无效请求快速拒绝 <50ms', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .post('/api/v2/data-quality/analyze')
        .set('x-request-id', 'test-error-001')
        .send({
          // 缺少必需的fileId
          sheetName: 'Sheet1'
        });

      const duration = Date.now() - startTime;

      expect(response.status).toBe(400);
      console.log(`✓ 错误响应时间: ${duration}ms`);
      expect(duration).toBeLessThan(50);
      expect(response.body.success).toBe(false);
    });

    test('不存在的资源快速返回 <100ms', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .get('/api/v2/data-quality/analysis/nonexistent-id')
        .set('x-request-id', 'test-error-002');

      const duration = Date.now() - startTime;

      expect(response.status).toBe(404);
      console.log(`✓ 404响应时间: ${duration}ms`);
      expect(duration).toBeLessThan(100);
    });
  });

  // ============================================================================
  // WebSocket推送性能测试
  // ============================================================================

  describe('WebSocket实时推送性能', () => {
    test('分析进度推送延迟 <100ms', async () => {
      const startTime = Date.now();
      let progressReceived = false;

      // 模拟WebSocket连接
      const clientId = 'client-ws-test';
      const messagePromises: Promise<void>[] = [];

      // 订阅消息（模拟）
      const originalSend = websocketService.send.bind(websocketService);
      websocketService.send = async (channel: string, message: any) => {
        if (message.type === 'analysis_progress') {
          const progressTime = Date.now() - startTime;
          expect(progressTime).toBeLessThan(100);
          progressReceived = true;
        }
        return originalSend(channel, message);
      };

      const response = await request(app)
        .post('/api/v2/data-quality/analyze')
        .set('x-request-id', 'test-ws-001')
        .set('x-client-id', clientId)
        .send({
          fileId: 'test-file-medium',
          sheetName: 'Sheet1',
          options: {}
        });

      expect(response.status).toBe(200);
      expect(progressReceived).toBe(true);

      // 恢复原始send方法
      websocketService.send = originalSend;

      console.log(`✓ WebSocket进度推送测试通过`);
    });
  });
});

// ============================================================================
// 辅助函数
// ============================================================================

function setupTestRoutes(
  app: express.Application,
  storageService: InMemoryStorageService,
  websocketService: WebSocketService
): void {
  const dataQualityController = createDataQualityController(
    storageService as any,
    websocketService as any
  );

  // 数据质量分析路由
  app.post('/api/v2/data-quality/analyze', (req, res) =>
    dataQualityController.analyze(req, res)
  );

  app.get('/api/v2/data-quality/analysis/:id', (req, res) =>
    dataQualityController.getAnalysis(req, res)
  );

  app.post('/api/v2/data-quality/recommendations', (req, res) =>
    dataQualityController.getRecommendations(req, res)
  );

  app.post('/api/v2/data-quality/auto-fix', (req, res) =>
    dataQualityController.autoFix(req, res)
  );

  app.get('/api/v2/data-quality/statistics', (req, res) =>
    dataQualityController.getStatistics(req, res)
  );
}

async function prepareTestData(storageService: InMemoryStorageService): Promise<void> {
  // 小数据集 (100行)
  await storageService.set('file:test-file-small', {
    fileName: 'test-small.xlsx',
    sheets: {
      Sheet1: generateTestData(100, 10)
    }
  });

  // 中等数据集 (5000行)
  await storageService.set('file:test-file-medium', {
    fileName: 'test-medium.xlsx',
    sheets: {
      Sheet1: generateTestData(5000, 20)
    }
  });

  // 大数据集 (50000行)
  await storageService.set('file:test-file-large', {
    fileName: 'test-large.xlsx',
    sheets: {
      Sheet1: generateTestData(50000, 30)
    }
  });

  // 分析结果
  for (let i = 0; i < 10; i++) {
    await storageService.set(`analysis:test-analysis-${i}`, {
      analysisId: `test-analysis-${i}`,
      rawData: {
        reportId: `report-${i}`,
        fileName: 'test.xlsx',
        sheetName: 'Sheet1',
        totalRows: 1000,
        totalColumns: 10,
        timestamp: Date.now(),
        qualityScore: 85,
        issues: [],
        columnStats: [],
        dataSample: []
      }
    });
  }
}

function generateTestData(rows: number, columns: number): any[] {
  const data: any[] = [];
  const columnNames = Array.from({ length: columns }, (_, i) => `Column${i + 1}`);

  for (let i = 0; i < rows; i++) {
    const row: any = {};
    columnNames.forEach(col => {
      // 添加一些数据质量问题
      const rand = Math.random();
      if (rand < 0.05) {
        row[col] = null; // 缺失值
      } else if (rand < 0.10) {
        row[col] = `duplicate_${i % 100}`; // 重复值
      } else if (rand < 0.15 && col === 'Column1') {
        row[col] = Math.random() * 1000; // 数值
      } else {
        row[col] = `value_${i}_${col}`;
      }
    });
    data.push(row);
  }

  return data;
}
