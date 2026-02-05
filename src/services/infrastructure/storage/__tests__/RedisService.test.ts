/**
 * RedisService 单元测试
 *
 * 测试范围:
 * - 基础 CRUD 操作
 * - Hash 操作
 * - 批量操作
 * - 发布订阅
 * - 连接管理
 * - 错误处理
 */

import { RedisService, createRedisService } from '../RedisService';
import type { RedisConfig } from '../../../../types/storageTypes';

// ============================================================================
// 测试辅助函数
// ============================================================================

const createTestConfig = (): RedisConfig => ({
  url: 'redis://localhost:6379',
  keyPrefix: 'test:',
  defaultTTL: 3600,
  retryStrategy: {
    retries: 3,
    delay: 100,
    maxDelay: 500,
  },
});

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================================================
// 测试套件
// ============================================================================

describe('RedisService', () => {
  let redisService: RedisService;

  beforeEach(async () => {
    redisService = new RedisService(createTestConfig());
    await redisService.connect();
  });

  afterEach(async () => {
    await redisService.disconnect();
  });

  // ========================================================================
  // 连接管理测试
  // ========================================================================

  describe('连接管理', () => {
    it('应该成功连接到 Redis', async () => {
      expect(redisService.isConnectionActive()).toBe(true);
    });

    it('应该避免重复连接', async () => {
      await redisService.connect();
      expect(redisService.isConnectionActive()).toBe(true);
    });

    it('应该成功断开连接', async () => {
      await redisService.disconnect();
      expect(redisService.isConnectionActive()).toBe(false);
    });

    it('断开后应该无法执行操作', async () => {
      await redisService.disconnect();

      await expect(async () => {
        await redisService.get('test-key');
      }).rejects.toThrow('Redis client is not connected');
    });
  });

  // ========================================================================
  // 基础 CRUD 操作测试
  // ========================================================================

  describe('基础 CRUD 操作', () => {
    it('应该成功设置和获取值', async () => {
      const key = 'test:set-get';
      const value = { name: 'test', value: 123 };

      const setResult = await redisService.set(key, value);
      expect(setResult.success).toBe(true);

      const getResult = await redisService.get<typeof value>(key);
      expect(getResult.success).toBe(true);
      expect(getResult.data).toEqual(value);
    });

    it('应该返回 null 对于不存在的键', async () => {
      const result = await redisService.get('non-existent-key');
      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('应该成功删除键', async () => {
      const key = 'test:delete';
      await redisService.set(key, { test: true });

      const deleteResult = await redisService.del(key);
      expect(deleteResult.success).toBe(true);
      expect(deleteResult.data).toBe(true);

      const getResult = await redisService.get(key);
      expect(getResult.data).toBeNull();
    });

    it('删除不存在的键应该返回 false', async () => {
      const result = await redisService.del('non-existent-key');
      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });

    it('应该正确检查键是否存在', async () => {
      const key = 'test:exists';

      const notExistsResult = await redisService.exists(key);
      expect(notExistsResult.success).toBe(true);
      expect(notExistsResult.data).toBe(false);

      await redisService.set(key, { test: true });

      const existsResult = await redisService.exists(key);
      expect(existsResult.success).toBe(true);
      expect(existsResult.data).toBe(true);
    });

    it('应该支持设置 TTL', async () => {
      const key = 'test:ttl';
      const value = { test: 'data' };
      const ttl = 1; // 1 秒

      await redisService.set(key, value, ttl);

      const immediateResult = await redisService.get(key);
      expect(immediateResult.data).toEqual(value);

      await wait(1100);

      const expiredResult = await redisService.get(key);
      expect(expiredResult.data).toBeNull();
    });
  });

  // ========================================================================
  // Hash 操作测试
  // ========================================================================

  describe('Hash 操作', () => {
    it('应该成功设置和获取 Hash 字段', async () => {
      const key = 'test:hash';
      const field = 'field1';
      const value = { nested: 'data' };

      await redisService.setHash(key, field, value);

      const result = await redisService.getHash<typeof value>(key, field);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(value);
    });

    it('应该获取所有 Hash 字段', async () => {
      const key = 'test:hash:all';

      await redisService.setHash(key, 'field1', { value: 1 });
      await redisService.setHash(key, 'field2', { value: 2 });
      await redisService.setHash(key, 'field3', { value: 3 });

      const result = await redisService.getAllHash<{ value: number }>(key);
      expect(result.success).toBe(true);
      expect(Object.keys(result.data || {})).toHaveLength(3);
    });

    it('应该返回空对象对于不存在的 Hash', async () => {
      const result = await redisService.getAllHash('non-existent-hash');
      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
    });

    it('应该覆盖已存在的 Hash 字段', async () => {
      const key = 'test:hash:overwrite';
      const field = 'field1';

      await redisService.setHash(key, field, { value: 1 });
      await redisService.setHash(key, field, { value: 2 });

      const result = await redisService.getHash(key, field);
      expect(result.data).toEqual({ value: 2 });
    });
  });

  // ========================================================================
  // 批量操作测试
  // ========================================================================

  describe('批量操作', () => {
    it('应该批量获取多个键', async () => {
      const keys = ['test:mget:1', 'test:mget:2', 'test:mget:3'];

      await redisService.set(keys[0], { value: 1 });
      await redisService.set(keys[1], { value: 2 });
      // keys[2] 不存在

      const result = await redisService.mget<{ value: number }>(keys);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(result.data[0]).toEqual({ value: 1 });
      expect(result.data[1]).toEqual({ value: 2 });
      expect(result.data[2]).toBeNull();
    });

    it('应该批量设置多个键', async () => {
      const entries = [
        { key: 'test:mset:1', value: { data: 1 } },
        { key: 'test:mset:2', value: { data: 2 } },
        { key: 'test:mset:3', value: { data: 3 } },
      ];

      const result = await redisService.mset(entries);
      expect(result.success).toBe(true);

      const values = await redisService.mget(entries.map(e => e.key));
      expect(values.data?.[0]).toEqual(entries[0].value);
      expect(values.data?.[1]).toEqual(entries[1].value);
      expect(values.data?.[2]).toEqual(entries[2].value);
    });

    it('批量设置应该支持 TTL', async () => {
      const key = 'test:mset:ttl';
      const entries = [
        { key, value: { data: 'test' }, ttl: 1 },
      ];

      await redisService.mset(entries);

      const immediateResult = await redisService.get(key);
      expect(immediateResult.data).toEqual({ data: 'test' });

      await wait(1100);

      const expiredResult = await redisService.get(key);
      expect(expiredResult.data).toBeNull();
    });
  });

  // ========================================================================
  // 发布订阅测试
  // ========================================================================

  describe('发布订阅', () => {
    it('应该成功发布消息', async () => {
      const channel = 'test:channel';
      const message = { test: 'message' };

      const result = await redisService.publish(channel, message);
      expect(result.success).toBe(true);
      // 没有订阅者时应该返回 0
      expect(result.data).toBe(0);
    });

    it('应该成功订阅频道', async () => {
      const channel = 'test:subscribe:channel';
      const message = { test: 'data' };
      let receivedMessage: any = null;

      const promise = new Promise<void>((resolve) => {
        redisService.subscribe(channel, (msg) => {
          receivedMessage = msg;
          resolve();
        });
      });

      // 等待订阅生效
      await wait(100);

      await redisService.publish(channel, message);

      await promise;

      expect(receivedMessage).toEqual(message);
    });

    it('应该支持多个订阅者', async () => {
      const channel = 'test:multiple:subscribers';
      const message = { test: 'broadcast' };

      let received1: any = null;
      let received2: any = null;

      const promise1 = new Promise<void>((resolve) => {
        redisService.subscribe(channel, (msg) => {
          received1 = msg;
          resolve();
        });
      });

      const promise2 = new Promise<void>((resolve) => {
        redisService.subscribe(channel, (msg) => {
          received2 = msg;
          resolve();
        });
      });

      await wait(100);

      const result = await redisService.publish(channel, message);
      expect(result.data).toBe(2);

      await Promise.all([promise1, promise2]);

      expect(received1).toEqual(message);
      expect(received2).toEqual(message);
    });
  });

  // ========================================================================
  // 键前缀测试
  // ========================================================================

  describe('键前缀', () => {
    it('应该在所有键上添加前缀', async () => {
      const config = createTestConfig();
      config.keyPrefix = 'custom:prefix:';
      const service = new RedisService(config);
      await service.connect();

      await service.set('test-key', { value: 1 });
      const result = await service.get('test-key');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ value: 1 });

      await service.disconnect();
    });
  });

  // ========================================================================
  // 工厂函数测试
  // ========================================================================

  describe('工厂函数', () => {
    it('应该使用默认配置创建服务', () => {
      const service = createRedisService();
      expect(service).toBeInstanceOf(RedisService);
    });

    it('应该合并自定义配置', () => {
      const service = createRedisService({
        keyPrefix: 'custom:',
        defaultTTL: 7200,
      });

      expect(service).toBeInstanceOf(RedisService);
    });
  });

  // ========================================================================
  // 错误处理测试
  // ========================================================================

  describe('错误处理', () => {
    it('应该处理 JSON 解析错误', async () => {
      const service = new RedisService(createTestConfig());
      await service.connect();

      // 手动设置无效的 JSON
      const anyService = service as any;
      await anyService.client.set('test:invalid-json', 'invalid json{');

      const result = await anyService.get('test:invalid-json');

      // 应该返回错误结果而不是抛出异常
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('REDIS_GET_ERROR');

      await service.disconnect();
    });

    it('应该正确使用键前缀', async () => {
      const customPrefix = 'myapp:';
      const service = new RedisService({
        ...createTestConfig(),
        keyPrefix: customPrefix,
      });

      await service.connect();

      const setResult = await service.set('test', { value: 1 });
      expect(setResult.success).toBe(true);

      const getResult = await service.get('test');
      expect(getResult.success).toBe(true);
      expect(getResult.data).toEqual({ value: 1 });

      await service.disconnect();
    });
  });

  // ========================================================================
  // 性能和边界测试
  // ========================================================================

  describe('性能和边界', () => {
    it('应该处理大对象', async () => {
      const largeObject = {
        data: 'x'.repeat(10000),
        nested: {
          array: Array(100).fill({ item: 'test' }),
        },
      };

      const result = await redisService.set('test:large', largeObject);
      expect(result.success).toBe(true);

      const get_result = await redisService.get('test:large');
      expect(get_result.success).toBe(true);
      expect((get_result.data as any)?.data).toHaveLength(10000);
    });

    it('应该处理特殊字符', async () => {
      const specialKey = 'test:key:with:colons';
      const specialValue = {
        string: 'test with "quotes" and \'apostrophes\'',
        emoji: '🔥💯',
      };

      const setResult = await redisService.set(specialKey, specialValue);
      expect(setResult.success).toBe(true);

      const getResult = await redisService.get(specialKey);
      expect(getResult.success).toBe(true);
      expect(getResult.data).toEqual(specialValue);
    });
  });
});
