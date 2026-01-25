/**
 * MemoryCache 存储服务单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryCacheService, createMemoryCacheService } from '../../../services/storage/MemoryCacheService';
import type { MemoryCacheConfig } from '../../../types/storage';

describe('MemoryCacheService', () => {
  let service: MemoryCacheService;

  beforeEach(() => {
    const config: MemoryCacheConfig = {
      type: 'memory',
      namespacePrefix: '',
      defaultTTL: 0,
      maxEntries: 1000,
      evictionPolicy: 'lru',
      enableStats: true
    };

    service = new MemoryCacheService(config);
  });

  afterEach(async () => {
    service.destroy();
  });

  describe('基础操作', () => {
    it('应该能够设置和获取值', async () => {
      await service.set('key1', 'value1');
      const value = await service.get<string>('key1');

      expect(value).toBe('value1');
    });

    it('应该能够设置和获取复杂对象', async () => {
      const obj = { name: 'test', count: 123, nested: { value: true } };

      await service.set('obj', obj);
      const result = await service.get<typeof obj>('obj');

      expect(result).toEqual(obj);
    });

    it('应该能够设置和获取数组', async () => {
      const arr = [1, 2, 3, 4, 5];

      await service.set('arr', arr);
      const result = await service.get<number[]>('arr');

      expect(result).toEqual(arr);
    });

    it('应该能够删除值', async () => {
      await service.set('key1', 'value1');
      await service.delete('key1');

      const value = await service.get('key1');
      expect(value).toBeNull();
    });

    it('应该能够检查键是否存在', async () => {
      await service.set('key1', 'value1');

      expect(await service.exists('key1')).toBe(true);
      expect(await service.exists('key2')).toBe(false);
    });

    it('获取不存在的键应该返回null', async () => {
      const value = await service.get('nonexistent');
      expect(value).toBeNull();
    });
  });

  describe('LRU 淘汰策略', () => {
    it('应该在达到容量限制时淘汰最少使用的项', async () => {
      // 创建一个容量为3的小缓存
      const smallCache = new MemoryCacheService({
        type: 'memory',
        maxEntries: 3,
        evictionPolicy: 'lru',
        defaultTTL: 0,
        enableStats: true
      });

      // 添加3个项
      await smallCache.set('key1', 'value1');
      await smallCache.set('key2', 'value2');
      await smallCache.set('key3', 'value3');

      // 访问key1，使其成为最近使用
      await smallCache.get('key1');

      // 添加第4个项，应该淘汰key2（最少使用）
      await smallCache.set('key4', 'value4');

      expect(await smallCache.exists('key1')).toBe(true);
      expect(await smallCache.exists('key2')).toBe(false); // 被淘汰
      expect(await smallCache.exists('key3')).toBe(true);
      expect(await smallCache.exists('key4')).toBe(true);

      smallCache.destroy();
    });

    it('应该在更新现有项时不触发淘汰', async () => {
      const smallCache = new MemoryCacheService({
        type: 'memory',
        maxEntries: 2,
        evictionPolicy: 'lru',
        defaultTTL: 0,
        enableStats: true
      });

      await smallCache.set('key1', 'value1');
      await smallCache.set('key2', 'value2');

      // 更新现有项
      await smallCache.set('key1', 'value1-updated');

      // 应该还能访问到key2
      expect(await smallCache.exists('key2')).toBe(true);

      smallCache.destroy();
    });
  });

  describe('TTL 过期', () => {
    it('应该支持TTL过期', async () => {
      await service.set('key1', 'value1', { ttl: 1 }); // 1秒后过期

      // 立即获取应该成功
      expect(await service.get('key1')).toBe('value1');

      // 等待1秒后应该返回null
      await new Promise(resolve => setTimeout(resolve, 1100));
      expect(await service.get('key1')).toBeNull();
    });

    it('TTL为0表示永不过期', async () => {
      await service.set('key1', 'value1', { ttl: 0 });

      // 等待一段时间后应该仍然存在
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(await service.get('key1')).toBe('value1');
    });

    it('应该定期清理过期项', async () => {
      const smallCache = new MemoryCacheService({
        type: 'memory',
        maxEntries: 100,
        evictionPolicy: 'lru',
        defaultTTL: 0,
        enableStats: true
      });

      // 添加一些会过期的项
      await smallCache.set('expiring1', 'value1', { ttl: 1 });
      await smallCache.set('expiring2', 'value2', { ttl: 1 });
      await smallCache.set('permanent', 'value3', { ttl: 0 });

      // 等待过期
      await new Promise(resolve => setTimeout(resolve, 1100));

      // 手动触发keys操作，会清理过期项
      const keys = await smallCache.keys();

      expect(keys).toContain('permanent');
      expect(keys).not.toContain('expiring1');
      expect(keys).not.toContain('expiring2');

      smallCache.destroy();
    });
  });

  describe('访问统计', () => {
    it('应该正确统计命中率', async () => {
      await service.set('key1', 'value1');
      await service.set('key2', 'value2');

      // 命中3次，未命中1次
      await service.get('key1');
      await service.get('key1');
      await service.get('key2');
      await service.get('nonexistent');

      const stats = await service.getStats();

      expect(stats.hits).toBe(3);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(75); // 3/4 = 75%
    });

    it('应该统计淘汰次数', async () => {
      const smallCache = new MemoryCacheService({
        type: 'memory',
        maxEntries: 2,
        evictionPolicy: 'lru',
        defaultTTL: 0,
        enableStats: true
      });

      await smallCache.set('key1', 'value1');
      await smallCache.set('key2', 'value2');
      await smallCache.set('key3', 'value3'); // 触发淘汰

      const stats = await smallCache.getStats() as any;
      expect(stats.evictedEntries).toBeDefined();

      smallCache.destroy();
    });
  });

  describe('批量操作', () => {
    it('应该支持批量设置', async () => {
      const items = [
        { key: 'key1', value: 'value1' },
        { key: 'key2', value: 'value2' },
        { key: 'key3', value: 'value3' }
      ];

      await service.batchSet(items);

      expect(await service.get('key1')).toBe('value1');
      expect(await service.get('key2')).toBe('value2');
      expect(await service.get('key3')).toBe('value3');
    });

    it('应该支持批量获取', async () => {
      await service.set('key1', 'value1');
      await service.set('key2', 'value2');
      await service.set('key3', 'value3');

      const result = await service.batchGet(['key1', 'key2', 'key3']);

      expect(result.size).toBe(3);
      expect(result.get('key1')).toBe('value1');
      expect(result.get('key2')).toBe('value2');
      expect(result.get('key3')).toBe('value3');
    });

    it('批量获取不存在的键应该返回空Map', async () => {
      const result = await service.batchGet(['nonexistent1', 'nonexistent2']);

      expect(result.size).toBe(0);
    });
  });

  describe('键查询', () => {
    it('应该能够获取所有键', async () => {
      await service.set('key1', 'value1');
      await service.set('key2', 'value2');
      await service.set('key3', 'value3');

      const keys = await service.keys();

      expect(keys).toHaveLength(3);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
    });

    it('应该支持模式匹配', async () => {
      await service.set('user:1', 'user1');
      await service.set('user:2', 'user2');
      await service.set('session:1', 'session1');

      const userKeys = await service.keys('user:*');

      expect(userKeys).toHaveLength(2);
      expect(userKeys).toContain('user:1');
      expect(userKeys).toContain('user:2');
      expect(userKeys).not.toContain('session:1');
    });

    it('应该过滤过期的键', async () => {
      await service.set('expiring', 'value1', { ttl: 1 });
      await service.set('permanent', 'value2', { ttl: 0 });

      await new Promise(resolve => setTimeout(resolve, 1100));

      const keys = await service.keys();

      expect(keys).toContain('permanent');
      expect(keys).not.toContain('expiring');
    });
  });

  describe('元数据', () => {
    it('应该能够获取值的元数据', async () => {
      await service.set('key1', 'value1');

      const item = await service.getWithMetadata('key1');

      expect(item).not.toBeNull();
      expect(item!.value).toBe('value1');
      expect(item!.timestamp).toBeDefined();
      expect(item!.hitCount).toBeDefined();
    });

    it('应该支持自定义元数据', async () => {
      const customMetadata = { source: 'test', version: 1 };

      await service.set('key1', 'value1', { metadata: customMetadata });

      const item = await service.getWithMetadata('key1');

      expect(item!.metadata).toEqual(customMetadata);
    });

    it('访问次数应该递增', async () => {
      await service.set('key1', 'value1');

      await service.get('key1');
      await service.get('key1');
      await service.get('key1');

      const item = await service.getWithMetadata('key1');

      expect(item!.hitCount).toBe(3);
    });
  });

  describe('事件监听', () => {
    it('应该能够监听set事件', async () => {
      const listener = vi.fn();

      service.addEventListener(listener);

      await service.set('key1', 'value1');

      expect(listener).toHaveBeenCalledWith({
        type: 'set',
        key: 'key1',
        timestamp: expect.any(Number),
        source: 'local'
      });
    });

    it('应该能够监听delete事件', async () => {
      const listener = vi.fn();

      await service.set('key1', 'value1');
      service.addEventListener(listener);

      await service.delete('key1');

      expect(listener).toHaveBeenCalledWith({
        type: 'delete',
        key: 'key1',
        timestamp: expect.any(Number),
        source: 'local'
      });
    });

    it('应该能够监听clear事件', async () => {
      const listener = vi.fn();

      await service.set('key1', 'value1');
      service.addEventListener(listener);

      await service.clear();

      expect(listener).toHaveBeenCalledWith({
        type: 'clear',
        key: 'all',
        timestamp: expect.any(Number),
        source: 'local'
      });
    });
  });

  describe('命名空间隔离', () => {
    it('应该支持命名空间隔离', async () => {
      await service.set('key1', 'value1', { namespace: 'ns1' });
      await service.set('key1', 'value2', { namespace: 'ns2' });

      const value1 = await service.get('key1');
      const value2 = await service.get('key1');

      // 由于没有指定命名空间，应该获取不到
      expect(value1).toBeNull();
      expect(value2).toBeNull();
    });

    it('应该能够清空指定命名空间', async () => {
      await service.set('key1', 'value1', { namespace: 'ns1' });
      await service.set('key2', 'value2', { namespace: 'ns1' });
      await service.set('key1', 'value3', { namespace: 'ns2' });

      await service.clear('ns1');

      expect(await service.exists('key1')).toBe(false);
      expect(await service.exists('key2')).toBe(false);
    });
  });

  describe('工厂函数', () => {
    it('应该能够使用工厂函数创建服务', () => {
      const service = createMemoryCacheService();

      expect(service).toBeInstanceOf(MemoryCacheService);
    });

    it('工厂函数应该支持自定义配置', () => {
      const service = createMemoryCacheService({
        maxEntries: 500,
        evictionPolicy: 'lfu'
      });

      expect(service).toBeInstanceOf(MemoryCacheService);

      service.destroy();
    });
  });

  describe('内存管理', () => {
    it('应该能够估算数据大小', async () => {
      const data = { name: 'test', value: 123 };

      await service.set('key1', data);

      const item = await service.getWithMetadata('key1');

      expect(item!.size).toBeGreaterThan(0);
    });

    it('销毁时应该清理所有资源', async () => {
      await service.set('key1', 'value1');
      await service.set('key2', 'value2');

      service.destroy();

      // 销毁后应该无法访问数据
      const keys = await service.keys();
      expect(keys).toHaveLength(0);
    });
  });

  describe('LFU 淘汰策略', () => {
    it('应该淘汰使用频率最低的项', async () => {
      const lfuCache = new MemoryCacheService({
        type: 'memory',
        maxEntries: 3,
        evictionPolicy: 'lfu',
        defaultTTL: 0,
        enableStats: true
      });

      // 添加3个项
      await lfuCache.set('key1', 'value1');
      await lfuCache.set('key2', 'value2');
      await lfuCache.set('key3', 'value3');

      // 访问key1和key3多次
      await lfuCache.get('key1');
      await lfuCache.get('key1');
      await lfuCache.get('key3');

      // 添加第4个项，应该淘汰key2（使用频率最低）
      await lfuCache.set('key4', 'value4');

      expect(await lfuCache.exists('key1')).toBe(true);
      expect(await lfuCache.exists('key2')).toBe(false); // 被淘汰
      expect(await lfuCache.exists('key3')).toBe(true);
      expect(await lfuCache.exists('key4')).toBe(true);

      lfuCache.destroy();
    });
  });
});
