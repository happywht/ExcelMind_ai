/**
 * Phase 2 错误处理标准化测试
 * 测试P0-3任务: 错误处理标准化
 *
 * 测试现有的错误类: ValidationError, NotFoundError, InternalServerError
 */

import { describe, it, expect } from 'vitest';
import {
  ValidationError,
  NotFoundError,
  InternalServerError
} from '../../../types/errors';

describe('Phase 2: P0-3 错误处理标准化', () => {
  describe('ValidationError', () => {
    it('应该创建正确的验证错误', () => {
      const error = new ValidationError('username', '用户名不能为空', '');

      expect(error.statusCode).toBe(400);
      expect(error.field).toBe('username');
      expect(error.message).toBe('用户名不能为空');
      expect(error.value).toBe('');
    });

    it('应该正确序列化为JSON', () => {
      const error = new ValidationError('email', '邮箱格式错误', 'invalid');
      const json = JSON.parse(JSON.stringify(error));

      expect(json.field).toBe('email');
      expect(json.value).toBe('invalid');
      expect(json.statusCode).toBe(400);
    });

    it('应该包含堆栈信息', () => {
      const error = new ValidationError('test', 'test message', 'test value');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ValidationError');
    });

    it('应该是Error的实例', () => {
      const error = new ValidationError('field', 'message', 'value');

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('ValidationError');
    });
  });

  describe('NotFoundError', () => {
    it('应该创建正确的404错误(带ID)', () => {
      const error = new NotFoundError('Task', 'task-123');

      expect(error.statusCode).toBe(404);
      expect(error.message).toContain('Task');
      expect(error.message).toContain('task-123');
    });

    it('应该创建正确的404错误(不带ID)', () => {
      const error = new NotFoundError('User');

      expect(error.statusCode).toBe(404);
      expect(error.message).toContain('User');
      expect(error.message).toContain('not found');
    });

    it('应该正确序列化为JSON', () => {
      const error = new NotFoundError('Document', 'doc-456');
      const json = JSON.parse(JSON.stringify(error));

      expect(json.statusCode).toBe(404);
    });
  });

  describe('InternalServerError', () => {
    it('应该创建内部服务器错误', () => {
      const error = new InternalServerError('服务器内部错误');

      expect(error.statusCode).toBe(500);
      expect(error.message).toBe('服务器内部错误');
    });

    it('应该支持原始错误传递', () => {
      const originalError = new Error('原始错误');
      const error = new InternalServerError('包装错误', originalError);

      expect(error.statusCode).toBe(500);
      expect(error.cause).toBe(originalError);
    });
  });

  describe('错误类型一致性', () => {
    it('所有错误类都应该有正确的HTTP状态码', () => {
      const errors = [
        new ValidationError('f', 'm', 'v'),
        new NotFoundError('R'),
        new InternalServerError()
      ];

      errors.forEach(error => {
        expect(error.statusCode).toBeGreaterThanOrEqual(400);
        expect(error.statusCode).toBeLessThan(600);
      });
    });

    it('所有错误类都应该是Error的实例', () => {
      const errors = [
        new ValidationError('f', 'm', 'v'),
        new NotFoundError('R'),
        new InternalServerError()
      ];

      errors.forEach(error => {
        expect(error).toBeInstanceOf(Error);
      });
    });
  });
});
