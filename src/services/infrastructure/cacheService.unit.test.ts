/**
 * CacheService 单元测试
 * 测试缓存服务的核心功能
 */

import { CacheService, createCacheService } from './cacheService';

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    cacheService = createCacheService({
      memory: {
        maxSize: 10,
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
  });

  afterEach(async () => {
    await cacheService.clear();
  });

  describe('基本操作', () => {
    it('应该正确存储和获取数据', async () => {
      const key = cacheService.generateKey('data_analysis', { data: 'value' });
      await cacheService.set(key, { value: 'test-data' });

      const result = await cacheService.get(key);

      expect(result).toBeDefined();
      expect(result?.value).toEqual('test-data');
    });

    it('应该在数据不存在时返回null', async () => {
      const key = cacheService.generateKey('mapping', {});
      const result = await cacheService.get(key);

      expect(result).toBeNull();
    });

    it('应该正确删除数据', async () => {
      const key = cacheService.generateKey('template_analysis', {});
      await cacheService.set(key, { value: 'data' });

      const deleted = await cacheService.delete(key);

      expect(deleted).toBe(true);

      const result = await cacheService.get(key);
      expect(result).toBeNull();
    });

    it('应该正确清空所有数据', async () => {
      const key1 = cacheService.generateKey('ai_response', {});
      const key2 = cacheService.generateKey('data_analysis', {});

      await cacheService.set(key1, { value: 'data1' });
      await cacheService.set(key2, { value: 'data2' });

      await cacheService.clear();

      const result1 = await cacheService.get(key1);
      const result2 = await cacheService.get(key2);

      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });
  });

  describe('TTL (Time To Live)', () => {
    it('应该在TTL过期后返回null', async () => {
      const key = cacheService.generateKey('mapping', {});
      await cacheService.set(key, { value: 'data' }, 0.1); // 100ms TTL

      // 立即获取应该成功
      let result = await cacheService.get(key);
      expect(result).toBeDefined();

      // 等待TTL过期
      await new Promise(resolve => setTimeout(resolve, 150));

      result = await cacheService.get(key);
      expect(result).toBeNull();
    });

    it('应该使用默认TTL', async () => {
      const key = cacheService.generateKey('template_analysis', {});
      await cacheService.set(key, { value: 'data' });

      const result = await cacheService.get(key);
      expect(result).toBeDefined();
      expect(result?.expiresAt).toBeGreaterThan(Date.now());
    });
  });

  describe('键生成', () => {
    it('应该为相同内容生成相同的键', () => {
      const content = { data: 'test' };
      const key1 = cacheService.generateKey('data_analysis', content);
      const key2 = cacheService.generateKey('data_analysis', content);

      expect(key1.hash).toEqual(key2.hash);
    });

    it('应该为不同内容生成不同的键', () => {
      const key1 = cacheService.generateKey('ai_response', { data: 'value1' });
      const key2 = cacheService.generateKey('ai_response', { data: 'value2' });

      expect(key1.hash).not.toEqual(key2.hash);
    });

    it('应该包含版本信息', () => {
      const key = cacheService.generateKey('mapping', {});

      expect(key.version).toBe('2.0');
    });
  });

  describe('容量限制', () => {
    it('应该在达到最大容量时淘汰LRU项', async () => {
      const smallCache = createCacheService({
        memory: { maxSize: 3, ttl: 60 },
        localStorage: { enabled: false, maxSize: 0, ttl: 0 },
        indexedDB: { enabled: false, dbName: '', storeName: '' },
        strategy: 'memory'
      });

      // 添加4个项目（超过容量）
      await smallCache.set(smallCache.generateKey('mapping', { id: 1 }), { value: 1 });
      await smallCache.set(smallCache.generateKey('template_analysis', { id: 2 }), { value: 2 });
      await smallCache.set(smallCache.generateKey('data_analysis', { id: 3 }), { value: 3 });

      // 访问key1增加其命中次数
      await smallCache.get(smallCache.generateKey('mapping', { id: 1 }));

      // 添加第4个项目，应该淘汰key2（最少使用）
      await smallCache.set(smallCache.generateKey('ai_response', { id: 4 }), { value: 4 });

      const result1 = await smallCache.get(smallCache.generateKey('mapping', { id: 1 }));
      const result2 = await smallCache.get(smallCache.generateKey('template_analysis', { id: 2 }));
      const result3 = await smallCache.get(smallCache.generateKey('data_analysis', { id: 3 }));
      const result4 = await smallCache.get(smallCache.generateKey('ai_response', { id: 4 }));

      expect(result1).toBeDefined(); // key1应该还在
      expect(result2).toBeNull(); // key2应该被淘汰
      expect(result3).toBeDefined(); // key3应该还在
      expect(result4).toBeDefined(); // key4应该还在
    });
  });

  describe('混合策略', () => {
    it('应该支持内存+LocalStorage混合策略', async () => {
      const hybridCache = createCacheService({
        memory: { maxSize: 100, ttl: 60 },
        localStorage: {
          enabled: true,
          maxSize: 1024 * 1024,
          ttl: 60
        },
        indexedDB: { enabled: false, dbName: '', storeName: '' },
        strategy: 'hybrid'
      });

      const key = hybridCache.generateKey('ai_response', {});
      await hybridCache.set(key, { value: 'data' });

      const result = await hybridCache.get(key);
      expect(result).toBeDefined();
    });
  });

  describe('命中统计', () => {
    it('应该正确记录命中次数', async () => {
      const key = cacheService.generateKey('mapping', {});
      await cacheService.set(key, { value: 'data' });

      await cacheService.get(key);
      await cacheService.get(key);
      await cacheService.get(key);

      const result = await cacheService.get(key);

      expect(result?.hitCount).toBe(4); // 初始0 + 4次get
    });
  });

  describe('元数据', () => {
    it('应该正确估算数据大小', async () => {
      const key = cacheService.generateKey('template_analysis', {});
      await cacheService.set(key, { value: 'x'.repeat(100) });

      const result = await cacheService.get(key);

      expect(result?.metadata.size).toBeGreaterThan(0);
    });

    it('应该标记数据来源', async () => {
      const key = cacheService.generateKey('data_analysis', {});
      await cacheService.set(key, { value: 'data' });

      const result = await cacheService.get(key);

      expect(result?.metadata.source).toBe('memory');
    });
  });

  describe('错误处理', () => {
    it('应该处理null值', async () => {
      const key = cacheService.generateKey('mapping', {});
      await cacheService.set(key, null);

      const result = await cacheService.get(key);

      expect(result).toBeDefined();
      expect(result?.value).toBeNull();
    });

    it('应该处理undefined值', async () => {
      const key = cacheService.generateKey('ai_response', {});
      await cacheService.set(key, undefined);

      const result = await cacheService.get(key);

      expect(result).toBeDefined();
      expect(result?.value).toBeUndefined();
    });

    it('应该处理复杂对象', async () => {
      const complexObject = {
        nested: {
          array: [1, 2, 3],
          object: { a: 1, b: 2 }
        },
        date: new Date(),
        regex: /test/g
      };

      const key = cacheService.generateKey('template_analysis', {});
      await cacheService.set(key, complexObject);

      const result = await cacheService.get(key);

      expect(result?.value).toEqual(complexObject);
    });
  });

  describe('并发操作', () => {
    it('应该支持并发写入', async () => {
      const promises = [];

      for (let i = 0; i < 100; i++) {
        const key = cacheService.generateKey('data_analysis', { id: i });
        promises.push(cacheService.set(key, { value: i }));
      }

      await expect(Promise.all(promises)).resolves.not.toThrow();
    });

    it('应该支持并发读取', async () => {
      const key = cacheService.generateKey('mapping', { id: 'read' });
      await cacheService.set(key, { value: 'data' });

      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(cacheService.get(key));
      }

      const results = await Promise.all(promises);

      expect(results.every(r => r !== null)).toBe(true);
    });
  });
});
