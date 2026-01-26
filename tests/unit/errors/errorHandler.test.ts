/**
 * 错误处理单元测试
 *
 * 测试新的统一错误处理体系
 *
 * @module tests/unit/errors/errorHandler.test
 */

import { describe, it, expect } from 'vitest';
import {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  InternalServerError,
  TaskNotFoundError,
  TemplateNotFoundError,
  DocumentGenerationError,
  AIServiceError,
  isAppError,
  toAppError
} from '../../../types/errors';
import { ErrorHandler } from '../../../utils/errorHandler';

describe('错误类层级测试', () => {
  describe('ValidationError', () => {
    it('应该创建验证错误', () => {
      const error = new ValidationError('email', 'Invalid email format', 'test@example');

      expect(error).toBeInstanceOf(Error);
      expect(error.code).toBe(1001);
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
      expect(error.field).toBe('email');
      expect(error.value).toBe('test@example');
      expect(error.message).toBe('Invalid email format');
    });

    it('应该正确序列化为JSON', () => {
      const error = new ValidationError('age', 'Age must be positive', -5);
      const json = error.toJSON();

      expect(json).toMatchObject({
        name: 'ValidationError',
        code: 1001,
        message: 'Age must be positive',
        statusCode: 400,
        isOperational: true,
        field: 'age',
        value: -5
      });
    });
  });

  describe('NotFoundError', () => {
    it('应该创建未找到错误', () => {
      const error = new NotFoundError('User', '12345');

      expect(error.code).toBe(1004);
      expect(error.statusCode).toBe(404);
      expect(error.message).toContain('User');
      expect(error.message).toContain('12345');
      expect(error.context).toEqual({ resource: 'User', id: '12345' });
    });
  });

  describe('TaskNotFoundError', () => {
    it('应该创建任务未找到错误', () => {
      const error = new TaskNotFoundError('task_abc123');

      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.code).toBe(4009);
      expect(error.resource).toBe('Task');
      expect(error.id).toBe('task_abc123');
    });
  });

  describe('TemplateNotFoundError', () => {
    it('应该创建模板未找到错误', () => {
      const error = new TemplateNotFoundError('tpl_xyz789');

      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.code).toBe(4000);
      expect(error.resource).toBe('Template');
      expect(error.id).toBe('tpl_xyz789');
    });
  });

  describe('DocumentGenerationError', () => {
    it('应该创建文档生成错误', () => {
      const error = new DocumentGenerationError(
        'Failed to render template',
        'tpl_001',
        5
      );

      expect(error.code).toBe(4003);
      expect(error.statusCode).toBe(500);
      expect(error.templateId).toBe('tpl_001');
      expect(error.dataIndex).toBe(5);
      expect(error.context).toEqual({
        templateId: 'tpl_001',
        dataIndex: 5
      });
    });
  });

  describe('AIServiceError', () => {
    it('应该创建AI服务错误', () => {
      const originalError = new Error('Network timeout');
      const error = new AIServiceError(
        'AI service unavailable',
        'openai',
        true,
        originalError
      );

      expect(error.code).toBe(1007);
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
      expect(error.provider).toBe('openai');
      expect(error.retryable).toBe(true);
      expect(error.cause).toBe(originalError);
    });
  });

  describe('withContext', () => {
    it('应该添加上下文信息', () => {
      const error = new ValidationError('username', 'Too short');
      error.withContext({ minLength: 3, currentLength: 2 });

      expect(error.context).toEqual({
        field: 'username',
        value: undefined,
        minLength: 3,
        currentLength: 2
      });
    });
  });
});

describe('ErrorHandler 工具类测试', () => {
  describe('handleError', () => {
    it('应该保持AppError不变', () => {
      const originalError = new ValidationError('test', 'Test error');
      const handled = ErrorHandler.handleError(originalError);

      expect(handled).toBe(originalError);
    });

    it('应该将标准Error转换为InternalServerError', () => {
      const originalError = new Error('Something went wrong');
      const handled = ErrorHandler.handleError(originalError);

      expect(handled).toBeInstanceOf(InternalServerError);
      expect(handled.message).toBe('Something went wrong');
      expect(handled.cause).toBe(originalError);
    });

    it('应该识别网络错误', () => {
      const networkError = new Error('ECONNRESET: Connection reset');
      const handled = ErrorHandler.handleError(networkError);

      expect(handled).toBeInstanceOf(InternalServerError);
      expect(handled.code).toBe(1008); // SERVICE_UNAVAILABLE
    });

    it('应该添加上下文信息', () => {
      const error = new Error('Test error');
      const handled = ErrorHandler.handleError(error, 'UserService.createUser');

      expect(handled.context).toMatchObject({
        context: 'UserService.createUser'
      });
    });
  });

  describe('handleAsync', () => {
    it('应该成功处理异步操作', async () => {
      const result = await ErrorHandler.handleAsync(async () => {
        return 'success';
      });

      expect(result).toBe('success');
    });

    it('应该捕获并处理异步错误', async () => {
      await expect(
        ErrorHandler.handleAsync(async () => {
          throw new Error('Async error');
        })
      ).rejects.toThrow();
    });

    it('应该记录错误日志', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(
        ErrorHandler.handleAsync(async () => {
          throw new Error('Test error');
        }, 'TestService.testMethod')
      ).rejects.toThrow();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('isRetryable', () => {
    it('应该识别可重试的错误', () => {
      const error = new InternalServerError('Temporary failure');
      expect(ErrorHandler.isRetryable(error)).toBe(true);
    });

    it('应该识别不可重试的错误', () => {
      const error = new ValidationError('email', 'Invalid format');
      expect(ErrorHandler.isRetryable(error)).toBe(false);
    });

    it('应该识别AI服务错误的可重试性', () => {
      const retryableError = new AIServiceError('Rate limit', 'openai', true);
      expect(ErrorHandler.isRetryable(retryableError)).toBe(true);

      const nonRetryableError = new AIServiceError('Invalid request', 'openai', false);
      expect(ErrorHandler.isRetryable(nonRetryableError)).toBe(false);
    });
  });

  describe('getUserMessage', () => {
    it('应该返回AppError的消息', () => {
      const error = new ValidationError('email', 'Invalid email');
      expect(ErrorHandler.getUserMessage(error)).toBe('Invalid email');
    });

    it('应该为网络错误返回友好消息', () => {
      const error = new Error('ECONNRESET');
      expect(ErrorHandler.getUserMessage(error)).toBe('网络连接失败，请检查网络设置后重试');
    });

    it('应该为其他错误返回通用消息', () => {
      const error = new Error('Unknown error');
      expect(ErrorHandler.getUserMessage(error)).toBe('操作失败，请稍后重试');
    });
  });

  describe('logError', () => {
    it('应该记录AppError的详细信息', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const error = new ValidationError('email', 'Invalid email', 'test');
      ErrorHandler.logError(error);

      expect(consoleSpy).toHaveBeenCalled();
      const loggedData = JSON.parse(consoleSpy.mock.calls[0][1]);
      expect(loggedData).toMatchObject({
        error: {
          name: 'ValidationError',
          code: 1001,
          statusCode: 400,
          isOperational: true
        }
      });

      consoleSpy.mockRestore();
    });
  });
});

describe('工具函数测试', () => {
  describe('isAppError', () => {
    it('应该识别AppError实例', () => {
      const error = new ValidationError('test', 'Test');
      expect(isAppError(error)).toBe(true);
    });

    it('应该拒绝非AppError实例', () => {
      const error = new Error('Test');
      expect(isAppError(error)).toBe(false);
    });
  });

  describe('toAppError', () => {
    it('应该保持AppError不变', () => {
      const original = new ValidationError('test', 'Test');
      const converted = toAppError(original);
      expect(converted).toBe(original);
    });

    it('应该将Error转换为InternalServerError', () => {
      const original = new Error('Test');
      const converted = toAppError(original);
      expect(converted).toBeInstanceOf(InternalServerError);
    });

    it('应该将非Error转换为InternalServerError', () => {
      const converted = toAppError('string error');
      expect(converted).toBeInstanceOf(InternalServerError);
      expect(converted.message).toBe('string error');
    });
  });
});
