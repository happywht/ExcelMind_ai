/**
 * IndexedDB 存储服务单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IndexedDBStorageService, createIndexedDBStorageService } from './IndexedDBStorageService';
import type { IndexedDBConfig } from '../../types/storage';

describe('IndexedDBStorageService', () => {
  let service: IndexedDBStorageService;

  const config: IndexedDBConfig = {
    type: 'indexedDB',
    dbName: 'TestDB',
    version: 1,
    namespacePrefix: '',
    defaultTTL: 0,
    stores: [
      {
        name: 'default',
        keyPath: '',
        autoIncrement: false,
        indexes: [
          {
            name: 'expiresAt',
            keyPath: 'expiresAt',
            options: { unique: false }
          }
        ]
      }
    ]
  };

  beforeEach(async () => {
    service = createIndexedDBStorageService(config);
    await service.initialize();
  });

  afterEach(async () => {
    await service.clear();
    await service.close();
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

  describe('大文件存储', () => {
    it('应该能够存储大文件', async () => {
      // 创建一个大文件（1MB）
      const largeData = new Array(1024 * 1024).fill('x').join('');

      await service.set('largeFile', largeData);
      const result = await service.get<string>('largeFile');

      expect(result).toBe(largeData);
      expect(result!.length).toBe(1024 * 1024);
    });

    it('应该能够存储二进制数据', async () => {
      const binaryData = new Uint8Array([1, 2, 3, 4, 5]);

      await service.set('binary', binaryData);
      const result = await service.get<Uint8Array>('binary');

      expect(result).toEqual(binaryData);
    });

    it('应该能够存储ArrayBuffer', async () => {
      const buffer = new ArrayBuffer(1024);
      const view = new Uint8Array(buffer);
      view.fill(42);

      await service.set('buffer', buffer);
      const result = await service.get<ArrayBuffer>('buffer');

      expect(result).toEqual(buffer);
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

      expect(stats.type).toBe('indexedDB');
      expect(stats.totalEntries).toBe(2);
      expect(stats.hits).toBe(3);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(75); // 3/4 = 75%
    });
  });

  describe('数据库连接管理', () => {
    it('应该能够关闭数据库', async () => {
      await service.close();

      // 关闭后应该无法操作
      await expect(service.set('key1', 'value1')).rejects.toThrow();
    });

    it('应该能够重新初始化数据库', async () => {
      await service.close();
      await service.initialize();

      // 重新初始化后应该能够正常操作
      await service.set('key1', 'value1');
      expect(await service.get('key1')).toBe('value1');
    });
  });

  describe('工厂函数', () => {
    it('应该能够使用工厂函数创建服务', async () => {
      const service = createIndexedDBStorageService({
        dbName: 'FactoryTestDB'
      });

      expect(service).toBeInstanceOf(IndexedDBStorageService);

      await service.initialize();
      await service.close();
    });

    it('工厂函数应该支持自定义配置', async () => {
      const service = createIndexedDBStorageService({
        dbName: 'CustomDB',
        namespacePrefix: 'custom',
        defaultTTL: 3600
      });

      expect(service).toBeInstanceOf(IndexedDBStorageService);

      await service.initialize();
      await service.close();
    });
  });
});
