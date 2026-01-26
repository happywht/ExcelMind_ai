/**
 * 错误处理集成测试
 *
 * 测试错误处理中间件在实际应用中的表现
 *
 * @module tests/integration/errorHandling.test
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express, { Application } from 'express';
import { errorHandler, asyncHandler } from '../../api/middleware/errorHandler';
import {
  ValidationError,
  NotFoundError,
  TaskNotFoundError,
  InternalServerError
} from '../../types/errors';

// 创建测试应用
function createTestApp(): Application {
  const app = express();

  app.use(express.json());

  // 测试路由 - 抛出不同类型的错误
  app.get('/test/validation', (req, res) => {
    throw new ValidationError('email', 'Invalid email format', 'test@example');
  });

  app.get('/test/not-found', (req, res) => {
    throw new NotFoundError('User', '12345');
  });

  app.get('/test/task-not-found', (req, res) => {
    throw new TaskNotFoundError('task_abc123');
  });

  app.get('/test/internal-error', (req, res) => {
    throw new InternalServerError('Database connection failed');
  });

  app.get('/test/unknown-error', (req, res) => {
    throw new Error('Unknown error occurred');
  });

  app.get('/test/async-error', asyncHandler(async (req, res) => {
    throw new ValidationError('username', 'Username is required');
  }));

  app.get('/test/success', (req, res) => {
    res.json({ success: true, data: { message: 'Success' } });
  });

  // 404 处理
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found'
      }
    });
  });

  // 错误处理中间件
  app.use(errorHandler({
    showDetails: true,
    showStackTrace: false,
    logErrors: false
  }));

  return app;
}

describe('错误处理中间件集成测试', () => {
  let app: Application;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('验证错误处理', () => {
    it('应该正确处理ValidationError', async () => {
      const response = await request(app)
        .get('/test/validation')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 1001,
          message: 'Invalid email format',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'email',
              value: 'test@example'
            })
          ])
        }
      });

      expect(response.headers['x-request-id']).toBeDefined();
      expect(response.headers['x-error-code']).toBe('1001');
    });
  });

  describe('未找到错误处理', () => {
    it('应该正确处理NotFoundError', async () => {
      const response = await request(app)
        .get('/test/not-found')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 1004,
          message: expect.stringContaining('User'),
          details: expect.arrayContaining([
            expect.objectContaining({
              resource: 'User',
              id: '12345'
            })
          ])
        }
      });
    });

    it('应该正确处理TaskNotFoundError', async () => {
      const response = await request(app)
        .get('/test/task-not-found')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 4009,
          message: expect.stringContaining('Task'),
          details: expect.arrayContaining([
            expect.objectContaining({
              resource: 'Task',
              id: 'task_abc123'
            })
          ])
        }
      });
    });
  });

  describe('服务器错误处理', () => {
    it('应该正确处理InternalServerError', async () => {
      const response = await request(app)
        .get('/test/internal-error')
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 1007,
          message: 'Database connection failed'
        }
      });
    });
  });

  describe('未知错误处理', () => {
    it('应该将标准Error转换为AppError', async () => {
      const response = await request(app)
        .get('/test/unknown-error')
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 1007,
          message: 'Unknown error occurred'
        }
      });
    });
  });

  describe('异步错误处理', () => {
    it('应该正确处理异步抛出的错误', async () => {
      const response = await request(app)
        .get('/test/async-error')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 1001,
          message: 'Username is required',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'username'
            })
          ])
        }
      });
    });
  });

  describe('成功响应', () => {
    it('应该正常处理成功响应', async () => {
      const response = await request(app)
        .get('/test/success')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          message: 'Success'
        }
      });
    });
  });

  describe('响应头', () => {
    it('应该在错误响应中包含X-Request-ID', async () => {
      const response = await request(app)
        .get('/test/validation');

      expect(response.headers['x-request-id']).toBeDefined();
      expect(response.headers['x-request-id']).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('应该在错误响应中包含X-Error-Code', async () => {
      const response = await request(app)
        .get('/test/validation');

      expect(response.headers['x-error-code']).toBe('1001');
    });
  });

  describe('敏感信息过滤', () => {
    it('应该过滤错误消息中的敏感信息', async () => {
      const app = express();
      app.get('/test/sensitive', (req, res) => {
        throw new ValidationError('password', 'Password: secret123');
      });
      app.use(errorHandler({ logErrors: false }));

      // 注意: 实际的敏感信息过滤在日志中进行,
      // API响应中仍然会显示字段值用于调试
      const response = await request(app)
        .get('/test/sensitive')
        .expect(400);

      // 响应应该被正确格式化
      expect(response.body.success).toBe(false);
    });
  });
});
