/**
 * LocalStorage 存储服务单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LocalStorageService, createLocalStorageService } from './LocalStorageService';
import type { LocalStorageConfig } from '../../types/storage';

describe('LocalStorageService', () => {
  let service: LocalStorageService;
  let mockLocalStorage: Record<string, string>;

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {};

    global.localStorage = {
      getItem: (key: string) => mockLocalStorage[key] || null,
      setItem: (key: string, value: string) => {
        mockLocalStorage[key] = value;
      },
      removeItem: (key: string) => {
        delete mockLocalStorage[key];
      },
      clear: () => {
        Object.keys(mockLocalStorage).forEach(key => delete mockLocalStorage[key]);
      },
      get length() {
        return Object.keys(mockLocalStorage).length;
      },
      key: (index: number) => Object.keys(mockLocalStorage)[index] || null
    };

    const config: LocalStorageConfig = {
      type: 'localStorage',
      prefix: 'test_',
      namespacePrefix: '',
      defaultTTL: 0,
      fallbackToMemory: false
    };

    service = new LocalStorageService(config);
  });

  afterEach(async () => {
    await service.clear();
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

  describe('统计信息', () => {
    it('应该能够获取统计信息', async () => {
      await service.set('key1', 'value1');
      await service.set('key2', 'value2');

      await service.get('key1');
      await service.get('key1');
      await service.get('key2');
      await service.get('nonexistent');

      const stats = await service.getStats();

      expect(stats.type).toBe('localStorage');
      expect(stats.totalEntries).toBe(2);
      expect(stats.hits).toBe(3);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(75); // 3/4 = 75%
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

  describe('工厂函数', () => {
    it('应该能够使用工厂函数创建服务', () => {
      const service = createLocalStorageService();

      expect(service).toBeInstanceOf(LocalStorageService);
    });

    it('工厂函数应该支持自定义配置', () => {
      const service = createLocalStorageService({
        prefix: 'custom_',
        defaultTTL: 3600
      });

      expect(service).toBeInstanceOf(LocalStorageService);
    });
  });
});
