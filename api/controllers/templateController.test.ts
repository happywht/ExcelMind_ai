/**
 * 模板控制器测试
 *
 * 测试模板管理API端点
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Request, Response } from 'express';
import { TemplateController } from './templateController';
import { ApiErrorCode } from '../../src/types/errorCodes';

describe('TemplateController', () => {
  let controller: TemplateController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseJson: any;
  let responseStatus: number;

  beforeEach(() => {
    controller = new TemplateController();

    // 模拟请求对象
    mockRequest = {
      headers: {
        'x-request-id': 'test-request-id',
      },
      body: {},
      params: {},
      query: {},
      file: {
        originalname: 'test-template.docx',
        size: 12345,
        buffer: Buffer.from('test'),
      } as any,
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
      setHeader: jest.fn(),
      getHeader: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('upload', () => {
    it('应该成功上传模板', async () => {
      mockRequest.body = {
        name: 'Test Template',
        description: 'Test Description',
        category: 'test',
        tags: JSON.stringify(['test', 'template']),
      };

      await controller.upload(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toBe(201);
      expect(responseJson.success).toBe(true);
      expect(responseJson.data).toHaveProperty('templateId');
      expect(responseJson.data.name).toBe('Test Template');
      expect(responseJson.data.status).toBe('active');
      expect(responseJson.data.file).toHaveProperty('fileName');
      expect(responseJson.data.file).toHaveProperty('fileSize');
    });

    it('应该在缺少文件时返回验证错误', async () => {
      mockRequest.file = undefined;
      mockRequest.body = {
        name: 'Test Template',
      };

      await controller.upload(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toBe(500);
      expect(responseJson.success).toBe(false);
    });

    it('应该在缺少名称时返回验证错误', async () => {
      mockRequest.body = {};

      await controller.upload(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toBe(500);
      expect(responseJson.success).toBe(false);
    });
  });

  describe('list', () => {
    it('应该成功列出模板', async () => {
      mockRequest.query = {
        page: '1',
        pageSize: '20',
      };

      await controller.list(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toBe(200);
      expect(responseJson.success).toBe(true);
      expect(responseJson.data).toHaveProperty('items');
      expect(responseJson.data).toHaveProperty('pagination');
      expect(Array.isArray(responseJson.data.items)).toBe(true);
      expect(responseJson.data.pagination).toHaveProperty('page');
      expect(responseJson.data.pagination).toHaveProperty('pageSize');
      expect(responseJson.data.pagination).toHaveProperty('total');
    });

    it('应该支持过滤', async () => {
      mockRequest.query = {
        category: '合同',
        status: 'active',
      };

      await controller.list(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toBe(200);
      expect(responseJson.success).toBe(true);
    });
  });

  describe('get', () => {
    it('应该成功获取模板详情', async () => {
      mockRequest.params = {
        id: 'tmpl_001',
      };

      await controller.get(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toBe(200);
      expect(responseJson.success).toBe(true);
      expect(responseJson.data.templateId).toBe('tmpl_001');
      expect(responseJson.data).toHaveProperty('metadata');
      expect(responseJson.data.metadata).toHaveProperty('placeholders');
      expect(responseJson.data.metadata).toHaveProperty('hasLoops');
      expect(responseJson.data.metadata).toHaveProperty('hasConditionals');
      expect(responseJson.data).toHaveProperty('usageStats');
    });

    it('应该在缺少id时返回验证错误', async () => {
      mockRequest.params = {};

      await controller.get(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toBe(500);
      expect(responseJson.success).toBe(false);
    });
  });

  describe('update', () => {
    it('应该成功更新模板', async () => {
      mockRequest.params = {
        id: 'tmpl_001',
      };
      mockRequest.body = {
        name: 'Updated Template',
        description: 'Updated Description',
      };

      await controller.update(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toBe(200);
      expect(responseJson.success).toBe(true);
      expect(responseJson.data).toHaveProperty('templateId');
      expect(responseJson.data).toHaveProperty('updatedAt');
    });
  });

  describe('delete', () => {
    it('应该成功删除模板', async () => {
      mockRequest.params = {
        id: 'tmpl_001',
      };

      await controller.delete(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toBe(204);
    });
  });

  describe('preview', () => {
    it('应该成功生成预览', async () => {
      mockRequest.params = {
        id: 'tmpl_001',
      };
      mockRequest.body = {
        data: {
          contract_id: 'CONTRACT-001',
          amount: 100000,
        },
      };

      await controller.preview(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toBe(200);
      expect(responseJson.success).toBe(true);
      expect(responseJson.data).toHaveProperty('previewUrl');
      expect(responseJson.data).toHaveProperty('expiresAt');
    });

    it('应该在缺少数据时返回验证错误', async () => {
      mockRequest.params = {
        id: 'tmpl_001',
      };
      mockRequest.body = {};

      await controller.preview(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toBe(500);
      expect(responseJson.success).toBe(false);
    });
  });

  describe('getVariables', () => {
    it('应该成功获取模板变量', async () => {
      mockRequest.params = {
        id: 'tmpl_001',
      };

      await controller.getVariables(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toBe(200);
      expect(responseJson.success).toBe(true);
      expect(responseJson.data).toHaveProperty('variables');
      expect(responseJson.data).toHaveProperty('totalVariables');
      expect(responseJson.data).toHaveProperty('requiredVariables');
      expect(Array.isArray(responseJson.data.variables)).toBe(true);
    });
  });

  describe('download', () => {
    it('应该成功下载模板文件', async () => {
      mockRequest.params = {
        id: 'tmpl_001',
      };

      await controller.download(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toBe(200);
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-Request-ID',
        'test-request-id'
      );
    });
  });

  describe('错误处理', () => {
    it('应该正确处理错误', async () => {
      mockRequest.params = {};
      mockRequest.body = {};

      await controller.get(mockRequest as Request, mockResponse as Response);

      expect(responseJson.success).toBe(false);
      expect(responseJson.error).toHaveProperty('code');
      expect(responseJson.error).toHaveProperty('message');
      expect(responseJson.error).toHaveProperty('timestamp');
    });
  });
});
