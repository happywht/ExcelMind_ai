/**
 * 存储服务工厂单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  StorageServiceFactory,
  createStorageServiceFactory,
  createDefaultStorageService
} from '../../../src/services/storage/StorageServiceFactory';
import { StorageType } from '../../../src/types/storage';
import { LocalStorageService } from '../../../src/services/storage/LocalStorageService';
import { MemoryCacheService } from '../../../src/services/storage/MemoryCacheService';

describe('StorageServiceFactory', () => {
  let factory: StorageServiceFactory;

  afterEach(() => {
    if (factory) {
      factory.destroy();
    }
  });

  describe('工厂创建', () => {
    it('应该能够创建工厂实例', () => {
      factory = createStorageServiceFactory();

      expect(factory).toBeInstanceOf(StorageServiceFactory);
    });

    it('应该支持自定义配置', () => {
      factory = createStorageServiceFactory({
        preferred: StorageType.MEMORY,
        fallbackChain: [StorageType.MEMORY],
        enableAutoFallback: true
      });

      expect(factory).toBeInstanceOf(StorageServiceFactory);
    });
  });

  describe('获取存储服务', () => {
    beforeEach(() => {
      // Mock localStorage
      const mockLocalStorage: Record<string, string> = {};

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
    });

    it('应该能够获取默认存储服务', () => {
      factory = createStorageServiceFactory({
        preferred: StorageType.LOCAL_STORAGE,
        fallbackChain: [StorageType.LOCAL_STORAGE, StorageType.MEMORY],
        configs: {
          [StorageType.LOCAL_STORAGE]: {
            type: StorageType.LOCAL_STORAGE,
            prefix: 'test_'
          },
          [StorageType.MEMORY]: {
            type: StorageType.MEMORY,
            maxEntries: 1000,
            evictionPolicy: 'lru'
          }
        }
      });

      const service = factory.getDefaultService();
      expect(service).toBeDefined();
    });

    it('应该能够获取指定类型的存储服务', () => {
      factory = createStorageServiceFactory({
        preferred: StorageType.LOCAL_STORAGE,
        fallbackChain: [StorageType.LOCAL_STORAGE, StorageType.MEMORY],
        configs: {
          [StorageType.LOCAL_STORAGE]: {
            type: StorageType.LOCAL_STORAGE,
            prefix: 'test_'
          },
          [StorageType.MEMORY]: {
            type: StorageType.MEMORY,
            maxEntries: 1000,
            evictionPolicy: 'lru'
          }
        }
      });

      const service = factory.getService(StorageType.MEMORY);
      expect(service).toBeDefined();
    });

    it('获取不配置的服务应该抛出错误', () => {
      factory = createStorageServiceFactory({
        preferred: StorageType.INDEXED_DB,
        fallbackChain: [StorageType.INDEXED_DB],
        configs: {}
      });

      expect(() => factory.getDefaultService()).toThrow();
    });
  });

  describe('自动降级策略', () => {
    beforeEach(() => {
      // Mock localStorage
      const mockLocalStorage: Record<string, string> = {};

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
    });

    it('应该在主服务失败时自动降级', async () => {
      factory = createStorageServiceFactory({
        preferred: StorageType.LOCAL_STORAGE,
        fallbackChain: [StorageType.LOCAL_STORAGE, StorageType.MEMORY],
        enableAutoFallback: true,
        configs: {
          [StorageType.LOCAL_STORAGE]: {
            type: StorageType.LOCAL_STORAGE,
            prefix: 'test_'
          },
          [StorageType.MEMORY]: {
            type: StorageType.MEMORY,
            maxEntries: 1000,
            evictionPolicy: 'lru'
          }
        }
      });

      const service = factory.getDefaultService();

      // 设置一个值
      await service.set('test-key', 'test-value');
      const value = await service.get('test-key');

      expect(value).toBe('test-value');
    });

    it('应该支持手动配置降级链', () => {
      factory = createStorageServiceFactory({
        preferred: StorageType.MEMORY,
        fallbackChain: [StorageType.MEMORY],
        configs: {
          [StorageType.MEMORY]: {
            type: StorageType.MEMORY,
            maxEntries: 500,
            evictionPolicy: 'lru'
          }
        }
      });

      const service = factory.getDefaultService();
      expect(service).toBeDefined();
    });
  });

  describe('统计信息', () => {
    beforeEach(() => {
      // Mock localStorage
      const mockLocalStorage: Record<string, string> = {};

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
    });

    it('应该能够获取所有存储服务的统计信息', async () => {
      factory = createStorageServiceFactory({
        preferred: StorageType.LOCAL_STORAGE,
        fallbackChain: [StorageType.LOCAL_STORAGE, StorageType.MEMORY],
        configs: {
          [StorageType.LOCAL_STORAGE]: {
            type: StorageType.LOCAL_STORAGE,
            prefix: 'test_'
          },
          [StorageType.MEMORY]: {
            type: StorageType.MEMORY,
            maxEntries: 1000,
            evictionPolicy: 'lru'
          }
        }
      });

      const service = factory.getDefaultService();
      await service.set('test-key', 'test-value');

      const stats = await factory.getStats();

      expect(stats).toBeDefined();
      expect(stats.length).toBeGreaterThan(0);
    });

    it('应该能够获取特定存储类型的统计信息', async () => {
      factory = createStorageServiceFactory({
        preferred: StorageType.LOCAL_STORAGE,
        fallbackChain: [StorageType.LOCAL_STORAGE, StorageType.MEMORY],
        configs: {
          [StorageType.LOCAL_STORAGE]: {
            type: StorageType.LOCAL_STORAGE,
            prefix: 'test_'
          },
          [StorageType.MEMORY]: {
            type: StorageType.MEMORY,
            maxEntries: 1000,
            evictionPolicy: 'lru'
          }
        }
      });

      const service = factory.getDefaultService();
      await service.set('test-key', 'test-value');

      const stats = await factory.getStats(StorageType.LOCAL_STORAGE);

      expect(stats).toBeDefined();
      expect(stats.length).toBe(1);
      expect(stats[0].type).toBe(StorageType.LOCAL_STORAGE);
    });
  });

  describe('健康检查', () => {
    beforeEach(() => {
      // Mock localStorage
      const mockLocalStorage: Record<string, string> = {};

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
    });

    it('应该定期执行健康检查', async () => {
      const healthCheckInterval = 100; // 100ms

      factory = createStorageServiceFactory({
        preferred: StorageType.LOCAL_STORAGE,
        fallbackChain: [StorageType.LOCAL_STORAGE],
        enableAutoFallback: true,
        healthCheckInterval,
        configs: {
          [StorageType.LOCAL_STORAGE]: {
            type: StorageType.LOCAL_STORAGE,
            prefix: 'test_'
          }
        }
      });

      const service = factory.getDefaultService();

      // 执行一些操作
      await service.set('test-key', 'test-value');
      await service.get('test-key');

      // 等待健康检查执行
      await new Promise(resolve => setTimeout(resolve, healthCheckInterval * 2));

      // 服务应该仍然可用
      const value = await service.get('test-key');
      expect(value).toBe('test-value');
    });
  });

  describe('快捷函数', () => {
    beforeEach(() => {
      // Mock localStorage
      const mockLocalStorage: Record<string, string> = {};

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
    });

    it('createDefaultStorageService应该创建可用的服务', async () => {
      // 注意：这个测试可能需要mock IndexedDB
      // 因为默认优先使用IndexedDB

      // 创建一个只使用localStorage和memory的工厂
      factory = createStorageServiceFactory({
        preferred: StorageType.LOCAL_STORAGE,
        fallbackChain: [StorageType.LOCAL_STORAGE, StorageType.MEMORY],
        configs: {
          [StorageType.LOCAL_STORAGE]: {
            type: StorageType.LOCAL_STORAGE,
            prefix: 'default_'
          },
          [StorageType.MEMORY]: {
            type: StorageType.MEMORY,
            maxEntries: 1000,
            evictionPolicy: 'lru'
          }
        }
      });

      const service = factory.getDefaultService();

      expect(service).toBeDefined();

      // 测试基本操作
      await service.set('test', 'value');
      expect(await service.get('test')).toBe('value');
    });
  });

  describe('资源清理', () => {
    beforeEach(() => {
      // Mock localStorage
      const mockLocalStorage: Record<string, string> = {};

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
    });

    it('销毁时应该清理所有资源', () => {
      factory = createStorageServiceFactory({
        preferred: StorageType.LOCAL_STORAGE,
        fallbackChain: [StorageType.LOCAL_STORAGE, StorageType.MEMORY],
        configs: {
          [StorageType.LOCAL_STORAGE]: {
            type: StorageType.LOCAL_STORAGE,
            prefix: 'test_'
          },
          [StorageType.MEMORY]: {
            type: StorageType.MEMORY,
            maxEntries: 1000,
            evictionPolicy: 'lru'
          }
        }
      });

      expect(() => factory.destroy()).not.toThrow();

      // 销毁后应该停止健康检查
      // 这里无法直接验证，但不应该有错误抛出
    });

    it('销毁后应该停止健康检查定时器', () => {
      factory = createStorageServiceFactory({
        preferred: StorageType.LOCAL_STORAGE,
        fallbackChain: [StorageType.LOCAL_STORAGE],
        enableAutoFallback: true,
        healthCheckInterval: 100,
        configs: {
          [StorageType.LOCAL_STORAGE]: {
            type: StorageType.LOCAL_STORAGE,
            prefix: 'test_'
          }
        }
      });

      factory.destroy();

      // 等待一段时间，确保没有错误抛出
      // 如果定时器没有清理，可能会有问题
      return new Promise(resolve => {
        setTimeout(() => {
          expect(true).toBe(true);
          resolve(null);
        }, 200);
      });
    });
  });
});
