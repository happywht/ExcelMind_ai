/**
 * 数据质量API控制器 - 单元测试
 *
 * @module tests/unit/api/dataQualityController
 * @version 2.0.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DataQualityController } from '../../../api/controllers/dataQualityController';
import {
  DataQualityAnalyzeRequest,
  DataQualitySuggestionsRequest,
  DataQualityCleanRequest
} from '../../../types/apiTypes';
import { createMockRequest, createMockResponse } from '../../../utils/testHelpers';

// ============================================================================
// Mock服务
// ============================================================================

class MockDataQualityAnalyzer {
  async analyze(data: any) {
    return {
      reportId: 'report_001',
      fileId: data.fileId,
      sheetName: data.sheetName,
      totalRows: 100,
      totalColumns: 10,
      qualityScore: 85,
      issues: [],
      columnStats: [],
      dataSample: []
    };
  }
}

class MockCleaningRecommendationEngine {
  async generateSuggestions(issues: any[]) {
    return [
      {
        suggestionId: 'suggestion_001',
        issueId: issues[0]?.issueId || 'issue_001',
        strategy: {
          strategyId: 'fill_mean',
          name: '使用平均值填充',
          type: 'fill',
          description: '使用平均值填充缺失值',
          applicableIssues: ['missing_value'],
          estimatedComplexity: 'low',
          requiresCodeGeneration: true
        },
        priority: 'high',
        impactAssessment: {
          qualityImprovement: 85,
          dataLossRisk: 'none',
          executionTimeEstimate: 500,
          sideEffects: []
        },
        code: "data.fillna(data.mean())",
        explanation: '使用平均值填充缺失值'
      }
    ];
  }
}

class MockDataCleaningService {
  async cleanData(data: any, suggestions: any[]) {
    return {
      success: true,
      cleanedData: data,
      appliedSuggestions: suggestions.map(s => s.suggestionId),
      statistics: {
        totalRows: data.length,
        cleanedRows: suggestions.length,
        modifiedCells: 10
      }
    };
  }
}

// ============================================================================
// 测试套件
// ============================================================================

describe('DataQualityController', () => {
  let controller: DataQualityController;
  let mockAnalyzer: MockDataQualityAnalyzer;
  let mockRecommendationEngine: MockCleaningRecommendationEngine;
  let mockCleaningService: MockDataCleaningService;

  beforeEach(() => {
    mockAnalyzer = new MockDataQualityAnalyzer();
    mockRecommendationEngine = new MockCleaningRecommendationEngine();
    mockCleaningService = new MockDataCleaningService();

    controller = new DataQualityController(
      mockAnalyzer as any,
      mockRecommendationEngine as any,
      mockCleaningService as any
    );
  });

  describe('POST /api/v2/data-quality/analyze', () => {
    it('应该成功分析数据质量', async () => {
      const requestBody: DataQualityAnalyzeRequest = {
        fileId: 'file_001',
        sheetName: 'Sheet1',
        options: {
          detectMissing: true,
          detectOutliers: true,
          detectDuplicates: true,
          detectFormat: true
        }
      };

      const req = createMockRequest({ body: requestBody });
      const res = createMockResponse();

      await controller.analyze(req as any, res as any);

      expect(res.statusCode).toBe(200);
      expect(res.body).toBeDefined();
      expect(res.body.success).toBe(true);
      expect(res.body.data.analysisId).toBeDefined();
      expect(res.body.data.summary).toBeDefined();
    });

    it('应该验证必需的请求参数', async () => {
      const requestBody = {
        // 缺少fileId
        sheetName: 'Sheet1'
      };

      const req = createMockRequest({ body: requestBody });
      const res = createMockResponse();

      await controller.analyze(req as any, res as any);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('应该返回正确的分析结果结构', async () => {
      const requestBody: DataQualityAnalyzeRequest = {
        fileId: 'file_001',
        sheetName: 'Sheet1',
        options: {
          detectMissing: true,
          detectOutliers: false,
          detectDuplicates: false,
          detectFormat: false
        }
      };

      const req = createMockRequest({ body: requestBody });
      const res = createMockResponse();

      await controller.analyze(req as any, res as any);

      expect(res.body.data).toMatchObject({
        analysisId: expect.any(String),
        fileId: 'file_001',
        sheetName: 'Sheet1',
        summary: {
          totalRows: expect.any(Number),
          totalColumns: expect.any(Number),
          completeness: expect.any(Number),
          qualityScore: expect.any(Number)
        },
        issues: expect.any(Array),
        statistics: expect.any(Object)
      });
    });

    it('应该处理分析错误', async () => {
      // Mock分析器抛出错误
      mockAnalyzer.analyze = vi.fn().mockRejectedValue(new Error('分析失败'));

      const requestBody: DataQualityAnalyzeRequest = {
        fileId: 'file_001',
        sheetName: 'Sheet1'
      };

      const req = createMockRequest({ body: requestBody });
      const res = createMockResponse();

      await controller.analyze(req as any, res as any);

      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('POST /api/v2/data-quality/suggestions', () => {
    it('应该成功生成清洗建议', async () => {
      const requestBody: DataQualitySuggestionsRequest = {
        analysisId: 'analysis_001',
        issueIds: ['issue_001', 'issue_002'],
        options: {
          priority: 'high',
          maxSuggestions: 10
        }
      };

      const req = createMockRequest({ body: requestBody });
      const res = createMockResponse();

      await controller.getSuggestions(req as any, res as any);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.suggestions).toBeDefined();
      expect(Array.isArray(res.body.data.suggestions)).toBe(true);
    });

    it('应该验证必需的请求参数', async () => {
      const requestBody = {
        // 缺少analysisId
        issueIds: ['issue_001']
      };

      const req = createMockRequest({ body: requestBody });
      const res = createMockResponse();

      await controller.getSuggestions(req as any, res as any);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('应该按优先级排序建议', async () => {
      const requestBody: DataQualitySuggestionsRequest = {
        analysisId: 'analysis_001',
        issueIds: ['issue_001'],
        options: {
          priority: 'high'
        }
      };

      const req = createMockRequest({ body: requestBody });
      const res = createMockResponse();

      await controller.getSuggestions(req as any, res as any);

      const suggestions = res.body.data.suggestions;
      expect(suggestions.length).toBeGreaterThan(0);

      // 验证高优先级的建议排在前面
      if (suggestions.length > 1) {
        expect(suggestions[0].priority).toBe('high' || 'critical');
      }
    });

    it('应该处理建议生成错误', async () => {
      mockRecommendationEngine.generateSuggestions = vi.fn().mockRejectedValue(
        new Error('生成建议失败')
      );

      const requestBody: DataQualitySuggestionsRequest = {
        analysisId: 'analysis_001',
        issueIds: ['issue_001']
      };

      const req = createMockRequest({ body: requestBody });
      const res = createMockResponse();

      await controller.getSuggestions(req as any, res as any);

      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v2/data-quality/clean', () => {
    it('应该成功执行数据清洗', async () => {
      const requestBody: DataQualityCleanRequest = {
        analysisId: 'analysis_001',
        suggestionIds: ['suggestion_001', 'suggestion_002'],
        options: {
          dryRun: false,
          backup: true
        }
      };

      const req = createMockRequest({ body: requestBody });
      const res = createMockResponse();

      await controller.clean(req as any, res as any);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.result).toBeDefined();
    });

    it('应该支持试运行模式', async () => {
      const requestBody: DataQualityCleanRequest = {
        analysisId: 'analysis_001',
        suggestionIds: ['suggestion_001'],
        options: {
          dryRun: true,
          backup: false
        }
      };

      const req = createMockRequest({ body: requestBody });
      const res = createMockResponse();

      await controller.clean(req as any, res as any);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.result.isDryRun).toBe(true);
    });

    it('应该验证必需的请求参数', async () => {
      const requestBody = {
        analysisId: 'analysis_001'
        // 缺少suggestionIds
      };

      const req = createMockRequest({ body: requestBody });
      const res = createMockResponse();

      await controller.clean(req as any, res as any);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('应该返回清洗结果统计', async () => {
      const requestBody: DataQualityCleanRequest = {
        analysisId: 'analysis_001',
        suggestionIds: ['suggestion_001'],
        options: {
          dryRun: false,
          backup: true
        }
      };

      const req = createMockRequest({ body: requestBody });
      const res = createMockResponse();

      await controller.clean(req as any, res as any);

      expect(res.body.data.result.statistics).toBeDefined();
      expect(res.body.data.result.statistics.totalRows).toBeDefined();
      expect(res.body.data.result.statistics.cleanedRows).toBeDefined();
    });

    it('应该处理清洗错误', async () => {
      mockCleaningService.cleanData = vi.fn().mockRejectedValue(
        new Error('清洗失败')
      );

      const requestBody: DataQualityCleanRequest = {
        analysisId: 'analysis_001',
        suggestionIds: ['suggestion_001']
      };

      const req = createMockRequest({ body: requestBody });
      const res = createMockResponse();

      await controller.clean(req as any, res as any);

      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v2/data-quality/analysis/:analysisId', () => {
    it('应该成功获取分析结果', async () => {
      const req = createMockRequest({
        params: { analysisId: 'analysis_001' }
      });
      const res = createMockResponse();

      await controller.getAnalysis(req as any, res as any);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('应该处理不存在的分析ID', async () => {
      const req = createMockRequest({
        params: { analysisId: 'non_existent_id' }
      });
      const res = createMockResponse();

      await controller.getAnalysis(req as any, res as any);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('错误处理', () => {
    it('应该正确处理无效的JSON', async () => {
      const req = createMockRequest({
        body: 'invalid json'
      });
      const res = createMockResponse();

      // 设置无效的body
      req.body = null;

      await controller.analyze(req as any, res as any);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('应该包含请求ID在响应中', async () => {
      const requestBody: DataQualityAnalyzeRequest = {
        fileId: 'file_001',
        sheetName: 'Sheet1'
      };

      const req = createMockRequest({
        body: requestBody,
        headers: { 'x-request-id': 'req_12345' }
      });
      const res = createMockResponse();

      await controller.analyze(req as any, res as any);

      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.requestId).toBeDefined();
    });

    it('应该返回标准化的错误响应', async () => {
      const req = createMockRequest({
        body: { fileId: 'file_001' } // 缺少sheetName
      });
      const res = createMockResponse();

      await controller.analyze(req as any, res as any);

      expect(res.body).toMatchObject({
        success: false,
        error: {
          code: expect.any(String),
          message: expect.any(String)
        },
        meta: expect.any(Object)
      });
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内响应分析请求', async () => {
      const requestBody: DataQualityAnalyzeRequest = {
        fileId: 'file_001',
        sheetName: 'Sheet1'
      };

      const req = createMockRequest({ body: requestBody });
      const res = createMockResponse();

      const startTime = Date.now();
      await controller.analyze(req as any, res as any);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(2000); // 2秒内完成
      expect(res.statusCode).toBe(200);
    });

    it('应该处理并发请求', async () => {
      const requests = Array.from({ length: 10 }, (_, i) => ({
        body: {
          fileId: `file_${i}`,
          sheetName: 'Sheet1'
        }
      }));

      const promises = requests.map(async (requestBody) => {
        const req = createMockRequest(requestBody);
        const res = createMockResponse();
        await controller.analyze(req as any, res as any);
        return res;
      });

      const startTime = Date.now();
      const responses = await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(responses.length).toBe(10);
      expect(responses.every(r => r.statusCode === 200)).toBe(true);
      expect(duration).toBeLessThan(5000); // 5秒内完成所有请求
    });
  });
});

// ============================================================================
// 集成测试
// ============================================================================

describe('DataQualityController 集成测试', () => {
  let controller: DataQualityController;
  let mockAnalyzer: MockDataQualityAnalyzer;
  let mockRecommendationEngine: MockCleaningRecommendationEngine;
  let mockCleaningService: MockDataCleaningService;

  beforeEach(() => {
    mockAnalyzer = new MockDataQualityAnalyzer();
    mockRecommendationEngine = new MockCleaningRecommendationEngine();
    mockCleaningService = new MockDataCleaningService();

    controller = new DataQualityController(
      mockAnalyzer as any,
      mockRecommendationEngine as any,
      mockCleaningService as any
    );
  });

  it('应该完成完整的数据质量工作流', async () => {
    // 1. 分析数据
    const analyzeReq = createMockRequest({
      body: {
        fileId: 'file_001',
        sheetName: 'Sheet1'
      }
    });
    const analyzeRes = createMockResponse();

    await controller.analyze(analyzeReq as any, analyzeRes as any);

    expect(analyzeRes.statusCode).toBe(200);
    const analysisId = analyzeRes.body.data.analysisId;

    // 2. 获取建议
    const suggestionsReq = createMockRequest({
      body: {
        analysisId,
        issueIds: ['issue_001']
      }
    });
    const suggestionsRes = createMockResponse();

    await controller.getSuggestions(suggestionsReq as any, suggestionsRes as any);

    expect(suggestionsRes.statusCode).toBe(200);
    const suggestionIds = suggestionsRes.body.data.suggestions.map(s => s.suggestionId);

    // 3. 执行清洗
    const cleanReq = createMockRequest({
      body: {
        analysisId,
        suggestionIds,
        options: { dryRun: false, backup: true }
      }
    });
    const cleanRes = createMockResponse();

    await controller.clean(cleanReq as any, cleanRes as any);

    expect(cleanRes.statusCode).toBe(200);
    expect(cleanRes.body.data.result.success).toBe(true);
  });
});
