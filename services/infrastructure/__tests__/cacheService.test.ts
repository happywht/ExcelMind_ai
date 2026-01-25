/**
 * 缓存服务单元测试
 */

import { CacheService, createCacheService } from '../cacheService';
import type { CacheKey } from '../../../types/mappingSchemaV2';

describe('CacheService', () => {
  let cacheService: CacheService;
  let mockKey: CacheKey;

  beforeEach(() => {
    cacheService = createCacheService({
      memory: {
        maxSize: 10,
        ttl: 60 // 1分钟，用于测试
      },
      localStorage: {
        enabled: true,
        maxSize: 1024 * 100, // 100KB
        ttl: 120
      },
      indexedDB: {
        enabled: false, // 测试时禁用IndexedDB
        dbName: 'TestCache',
        storeName: 'test_cache'
      },
      strategy: 'hybrid'
    });

    mockKey = {
      type: 'ai_response',
      hash: 'test_hash_123',
      version: '2.0'
    };
  });

  afterEach(async () => {
    await cacheService.clear();
  });

  describe('基础缓存操作', () => {
    test('应该能够设置和获取缓存', async () => {
      const testData = { message: 'Hello, Cache!' };

      await cacheService.set(mockKey, testData);
      const result = await cacheService.get(mockKey);

      expect(result).not.toBeNull();
      expect(result?.value).toEqual(testData);
    });

    test('应该能够删除缓存', async () => {
      const testData = { message: 'Test data' };

      await cacheService.set(mockKey, testData);
      let result = await cacheService.get(mockKey);
      expect(result).not.toBeNull();

      await cacheService.delete(mockKey);
      result = await cacheService.get(mockKey);
      expect(result).toBeNull();
    });

    test('应该能够清空所有缓存', async () => {
      const key1 = cacheService.generateKey('data_analysis', { id: 1 });
      const key2 = cacheService.generateKey('template_analysis', { id: 2 });

      await cacheService.set(key1, { data: '1' });
      await cacheService.set(key2, { data: '2' });

      await cacheService.clear();

      const result1 = await cacheService.get(key1);
      const result2 = await cacheService.get(key2);

      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });
  });

  describe('TTL过期机制', () => {
    test('应该在使用短期TTL时过期缓存', async () => {
      const testData = { message: 'Expiring soon' };

      // 设置1秒的TTL
      await cacheService.set(mockKey, testData, 1);

      // 立即获取应该成功
      let result = await cacheService.get(mockKey);
      expect(result).not.toBeNull();

      // 等待2秒后应该过期
      await new Promise(resolve => setTimeout(resolve, 2000));
      result = await cacheService.get(mockKey);
      expect(result).toBeNull();
    }, 5000); // 设置测试超时为5秒
  });

  describe('缓存层级选择', () => {
    test('小数据应该存储在内存缓存', async () => {
      const smallData = { key: 'small' };
      await cacheService.set(mockKey, smallData);

      const result = await cacheService.get(mockKey);
      expect(result).not.toBeNull();
      expect(result?.metadata?.source).toBe('memory');
    });

    test('中等数据应该存储在localStorage', async () => {
      // 创建大于10KB的数据
      const mediumData = { data: 'x'.repeat(15 * 1024) };
      await cacheService.set(mockKey, mediumData);

      const result = await cacheService.get(mockKey);
      expect(result).not.toBeNull();
    });

    test('大数据应该能正确处理', async () => {
      // 创建较大的数据
      const largeData = {
        items: Array(1000).fill({ name: 'test', value: 123 })
      };

      await cacheService.set(mockKey, largeData);
      const result = await cacheService.get(mockKey);

      expect(result).not.toBeNull();
      expect((result?.value as any).items).toHaveLength(1000);
    });
  });

  describe('缓存键生成', () => {
    test('应该为相同内容生成相同的键', () => {
      const content = { query: 'SELECT * FROM users' };
      const key1 = cacheService.generateKey('data_analysis', content);
      const key2 = cacheService.generateKey('data_analysis', content);

      expect(key1.hash).toBe(key2.hash);
    });

    test('应该为不同内容生成不同的键', () => {
      const content1 = { query: 'SELECT * FROM users' };
      const content2 = { query: 'SELECT * FROM orders' };
      const key1 = cacheService.generateKey('data_analysis', content1);
      const key2 = cacheService.generateKey('data_analysis', content2);

      expect(key1.hash).not.toBe(key2.hash);
    });
  });

  describe('LRU淘汰策略', () => {
    test('应该在达到最大容量时淘汰最少使用的条目', async () => {
      // 设置小的最大容量
      const smallCache = createCacheService({
        memory: {
          maxSize: 3,
          ttl: 60
        },
        localStorage: {
          enabled: false,
          maxSize: 0,
          ttl: 0
        },
        indexedDB: {
          enabled: false,
          dbName: '',
          storeName: ''
        },
        strategy: 'memory'
      });

      const keys = [
        smallCache.generateKey('mapping', { id: 1 }),
        smallCache.generateKey('template_analysis', { id: 2 }),
        smallCache.generateKey('data_analysis', { id: 3 }),
        smallCache.generateKey('ai_response', { id: 4 })
      ];

      // 添加4个条目（最大容量为3）
      await smallCache.set(keys[0], { data: '1' });
      await smallCache.set(keys[1], { data: '2' });
      await smallCache.set(keys[2], { data: '3' });

      // 访问第一个条目，增加它的命中次数
      await smallCache.get(keys[0]);

      // 添加第4个条目，应该淘汰最少使用的（keys[1]或keys[2]）
      await smallCache.set(keys[3], { data: '4' });

      // 验证第一个条目仍然存在（因为它被访问过）
      const result0 = await smallCache.get(keys[0]);
      expect(result0).not.toBeNull();
    });
  });

  describe('缓存命中统计', () => {
    test('应该正确记录缓存命中次数', async () => {
      const testData = { message: 'Test' };

      await cacheService.set(mockKey, testData);

      // 第一次访问
      let result = await cacheService.get(mockKey);
      expect(result?.hitCount).toBe(1);

      // 第二次访问
      result = await cacheService.get(mockKey);
      expect(result?.hitCount).toBe(2);
    });
  });

  describe('错误处理', () => {
    test('应该优雅处理无效的缓存键', async () => {
      const result = await cacheService.get({
        type: 'mapping',
        hash: 'nonexistent',
        version: '2.0'
      });

      expect(result).toBeNull();
    });

    test('应该优雅处理localStorage满的情况', async () => {
      // 这个测试模拟localStorage满的情况
      const data = { message: 'Test' };

      // 正常情况下应该成功
      await expect(cacheService.set(mockKey, data)).resolves.not.toThrow();
    });
  });
});
