/**
 * 数据质量控制器测试
 *
 * 测试数据质量API端点
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Request, Response } from 'express';
import { DataQualityController } from './dataQualityController';
import { ApiErrorCode } from '../../src/types/errorCodes';

describe('DataQualityController', () => {
  let controller: DataQualityController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseJson: any;
  let responseStatus: number;

  beforeEach(() => {
    controller = new DataQualityController();

    // 模拟请求对象
    mockRequest = {
      headers: {
        'x-request-id': 'test-request-id',
      },
      body: {},
      params: {},
      query: {},
    };

    // 模拟响应对象
    responseJson = {};
    responseStatus = 0;
    mockResponse = {
      status: jest.fn().mockImplementation((code: number) => {
        responseStatus = code;
        return mockResponse;
      }),
      json: jest.fn().mockImplementation((data: any) => {
        responseJson = data;
        return mockResponse;
      }),
      send: jest.fn().mockImplementation(() => {
        return mockResponse;
      }),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('analyze', () => {
    it('应该成功分析数据质量', async () => {
      mockRequest.body = {
        fileId: 'file_123_abc',
        sheetName: 'Sheet1',
        options: {
          checkMissingValues: true,
          checkDuplicates: true,
        },
      };

      await controller.analyze(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toBe(200);
      expect(responseJson.success).toBe(true);
      expect(responseJson.data).toHaveProperty('analysisId');
      expect(responseJson.data).toHaveProperty('summary');
      expect(responseJson.data).toHaveProperty('issues');
      expect(responseJson.data).toHaveProperty('statistics');
      expect(responseJson.data).toHaveProperty('recommendations');
      expect(responseJson.meta).toHaveProperty('requestId', 'test-request-id');
      expect(responseJson.meta).toHaveProperty('executionTime');
    });

    it('应该在缺少fileId时返回验证错误', async () => {
      mockRequest.body = {
        sheetName: 'Sheet1',
      };

      await controller.analyze(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toBe(500);
      expect(responseJson.success).toBe(false);
      expect(responseJson.error).toHaveProperty('code');
    });

    it('应该在缺少sheetName时返回验证错误', async () => {
      mockRequest.body = {
        fileId: 'file_123_abc',
      };

      await controller.analyze(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toBe(500);
      expect(responseJson.success).toBe(false);
    });
  });

  describe('getAnalysis', () => {
    it('应该成功获取分析结果', async () => {
      mockRequest.params = {
        id: 'qa_123_xyz',
      };

      await controller.getAnalysis(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toBe(200);
      expect(responseJson.success).toBe(true);
      expect(responseJson.data.analysisId).toBe('qa_123_xyz');
      expect(responseJson.data).toHaveProperty('summary');
    });

    it('应该在缺少id时返回验证错误', async () => {
      mockRequest.params = {};

      await controller.getAnalysis(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toBe(500);
      expect(responseJson.success).toBe(false);
    });
  });

  describe('getRecommendations', () => {
    it('应该成功获取清洗建议', async () => {
      mockRequest.body = {
        analysisId: 'qa_123_xyz',
        options: {
          includeAutoFix: true,
          priority: 'high',
        },
      };

      await controller.getRecommendations(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toBe(200);
      expect(responseJson.success).toBe(true);
      expect(responseJson.data).toHaveProperty('suggestions');
      expect(responseJson.data).toHaveProperty('totalSuggestions');
      expect(responseJson.data).toHaveProperty('canAutoFixCount');
      expect(responseJson.data).toHaveProperty('estimatedTotalTime');
      expect(Array.isArray(responseJson.data.suggestions)).toBe(true);
    });

    it('应该在缺少analysisId时返回验证错误', async () => {
      mockRequest.body = {};

      await controller.getRecommendations(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toBe(500);
      expect(responseJson.success).toBe(false);
    });
  });

  describe('autoFix', () => {
    it('应该成功执行自动修复', async () => {
      mockRequest.body = {
        analysisId: 'qa_123_xyz',
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
      };

      await controller.autoFix(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toBe(200);
      expect(responseJson.success).toBe(true);
      expect(responseJson.data).toHaveProperty('cleanId');
      expect(responseJson.data).toHaveProperty('status');
      expect(responseJson.data).toHaveProperty('results');
      expect(responseJson.data).toHaveProperty('summary');
      expect(responseJson.data.summary).toHaveProperty('qualityImprovement');
    });

    it('应该在缺少analysisId时返回验证错误', async () => {
      mockRequest.body = {
        suggestions: [],
      };

      await controller.autoFix(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toBe(500);
      expect(responseJson.success).toBe(false);
    });

    it('应该在缺少suggestions时返回验证错误', async () => {
      mockRequest.body = {
        analysisId: 'qa_123_xyz',
      };

      await controller.autoFix(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toBe(500);
      expect(responseJson.success).toBe(false);
    });
  });

  describe('getStatistics', () => {
    it('应该成功获取统计信息', async () => {
      await controller.getStatistics(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toBe(200);
      expect(responseJson.success).toBe(true);
      expect(responseJson.data).toHaveProperty('totalAnalyses');
      expect(responseJson.data).toHaveProperty('successfulAnalyses');
      expect(responseJson.data).toHaveProperty('failedAnalyses');
      expect(responseJson.data).toHaveProperty('averageQualityScore');
      expect(responseJson.data).toHaveProperty('topIssueTypes');
    });
  });

  describe('错误处理', () => {
    it('应该正确处理错误', async () => {
      // 模拟错误
      mockRequest.body = {
        fileId: 'invalid_id',
        sheetName: 'Invalid Sheet',
      };

      // 模拟一个会抛出错误的场景
      const originalAnalyze = controller.analyze;
      controller.analyze = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });

      await controller.analyze(mockRequest as Request, mockResponse as Response);

      // 恢复原方法
      controller.analyze = originalAnalyze;

      expect(responseJson.success).toBe(false);
      expect(responseJson.error).toHaveProperty('code');
      expect(responseJson.error).toHaveProperty('message');
      expect(responseJson.error).toHaveProperty('timestamp');
    });
  });

  describe('元数据', () => {
    it('应该包含正确的响应元数据', async () => {
      mockRequest.body = {
        fileId: 'file_123_abc',
        sheetName: 'Sheet1',
      };

      await controller.analyze(mockRequest as Request, mockResponse as Response);

      expect(responseJson.meta).toHaveProperty('requestId');
      expect(responseJson.meta).toHaveProperty('timestamp');
      expect(responseJson.meta).toHaveProperty('version', '2.0.0');
      expect(responseJson.meta).toHaveProperty('executionTime');
      expect(typeof responseJson.meta.executionTime).toBe('number');
    });
  });
});
