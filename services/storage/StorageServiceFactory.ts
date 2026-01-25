/**
 * 存储服务工厂
 *
 * 根据配置自动选择和创建存储服务实例，支持：
 * - 自动降级策略（IndexedDB → LocalStorage → Memory）
 * - 健康检查
 * - 性能监控
 * - 统一错误处理
 *
 * @module storage
 * @version 2.0.0
 */

import type {
  IStorageService,
  StorageFactoryConfig,
  StorageStats
} from '../../types/storage';

import {
  StorageError,
  StorageType
} from '../../types/storage';

import { LocalStorageService, createLocalStorageService } from './LocalStorageService';
import { MemoryCacheService, createMemoryCacheService } from './MemoryCacheService';
import { IndexedDBStorageService, createIndexedDBStorageService } from './IndexedDBStorageService';

// ============================================================================
// 存储服务包装器
// ============================================================================

/**
 * 存储服务包装器
 *
 * 包装底层存储服务，提供降级和重试功能
 */
class StorageServiceWrapper implements IStorageService {
  private service: IStorageService;
  private readonly serviceType: StorageType;
  private fallback?: StorageServiceWrapper;
  private readonly enableAutoFallback: boolean;

  constructor(
    service: IStorageService,
    serviceType: StorageType,
    enableAutoFallback: boolean = true
  ) {
    this.service = service;
    this.serviceType = serviceType;
    this.enableAutoFallback = enableAutoFallback;
  }

  setFallback(wrapper: StorageServiceWrapper): void {
    this.fallback = wrapper;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      return await this.service.get<T>(key);
    } catch (error) {
      if (this.enableAutoFallback && this.fallback) {
        console.warn(`[StorageServiceWrapper] Falling back from ${this.serviceType} to ${this.fallback.serviceType}`);
        return await this.fallback.get<T>(key);
      }
      throw error;
    }
  }

  async set<T>(key: string, value: T, options?: any): Promise<void> {
    try {
      return await this.service.set<T>(key, value, options);
    } catch (error) {
      if (this.enableAutoFallback && this.fallback) {
        console.warn(`[StorageServiceWrapper] Falling back from ${this.serviceType} to ${this.fallback.serviceType}`);
        return await this.fallback.set<T>(key, value, options);
      }
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      return await this.service.delete(key);
    } catch (error) {
      if (this.enableAutoFallback && this.fallback) {
        return await this.fallback.delete(key);
      }
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      return await this.service.exists(key);
    } catch (error) {
      if (this.enableAutoFallback && this.fallback) {
        return await this.fallback.exists(key);
      }
      return false;
    }
  }

  async keys(pattern?: string): Promise<string[]> {
    try {
      return await this.service.keys(pattern);
    } catch (error) {
      if (this.enableAutoFallback && this.fallback) {
        return await this.fallback.keys(pattern);
      }
      return [];
    }
  }

  async clear(namespace?: string): Promise<void> {
    try {
      return await this.service.clear(namespace);
    } catch (error) {
      if (this.enableAutoFallback && this.fallback) {
        return await this.fallback.clear(namespace);
      }
      throw error;
    }
  }

  async getWithMetadata<T>(key: string): Promise<any> {
    try {
      return await this.service.getWithMetadata<T>(key);
    } catch (error) {
      if (this.enableAutoFallback && this.fallback) {
        return await this.fallback.getWithMetadata<T>(key);
      }
      return null;
    }
  }

  async batchSet<T>(items: Array<{ key: string; value: T }>, options?: any): Promise<void> {
    try {
      return await this.service.batchSet<T>(items, options);
    } catch (error) {
      if (this.enableAutoFallback && this.fallback) {
        return await this.fallback.batchSet<T>(items, options);
      }
      throw error;
    }
  }

  async batchGet<T>(keys: string[]): Promise<Map<string, T>> {
    try {
      return await this.service.batchGet<T>(keys);
    } catch (error) {
      if (this.enableAutoFallback && this.fallback) {
        return await this.fallback.batchGet<T>(keys);
      }
      return new Map();
    }
  }

  async getStats?(): Promise<StorageStats> {
    if (this.service.getStats) {
      try {
        return await this.service.getStats();
      } catch (error) {
        if (this.enableAutoFallback && this.fallback && this.fallback.service.getStats) {
          return await this.fallback.service.getStats();
        }
      }
    }
    return {
      type: this.serviceType,
      totalEntries: 0,
      totalSize: 0
    };
  }

  getServiceType(): StorageType {
    return this.serviceType;
  }

  getService(): IStorageService {
    return this.service;
  }
}

// ============================================================================
// 存储服务工厂
// ============================================================================

/**
 * 存储服务工厂
 *
 * 根据配置创建存储服务实例，支持自动降级
 */
export class StorageServiceFactory {
  private readonly config: StorageFactoryConfig;
  private readonly wrappers: Map<StorageType, StorageServiceWrapper>;
  private healthCheckTimer: NodeJS.Timeout | null = null;

  constructor(config: StorageFactoryConfig) {
    this.config = config;
    this.wrappers = new Map();

    // 初始化所有存储服务
    this.initialize();

    // 启动健康检查
    if (config.enableAutoFallback && config.healthCheckInterval) {
      this.startHealthCheck();
    }
  }

  // ========================================================================
  // 公共方法
  // ========================================================================

  /**
   * 获取默认存储服务
   */
  getDefaultService(): IStorageService {
    const preferredWrapper = this.wrappers.get(this.config.preferred);

    if (!preferredWrapper) {
      throw new StorageError(
        `Preferred storage type ${this.config.preferred} not available`,
        'STORAGE_NOT_AVAILABLE',
        false
      );
    }

    return preferredWrapper;
  }

  /**
   * 获取指定类型的存储服务
   */
  getService(type: StorageType): IStorageService {
    const wrapper = this.wrappers.get(type);

    if (!wrapper) {
      throw new StorageError(
        `Storage type ${type} not configured`,
        'STORAGE_NOT_CONFIGURED',
        false
      );
    }

    return wrapper;
  }

  /**
   * 获取存储统计信息
   */
  async getStats(type?: StorageType): Promise<StorageStats[]> {
    const stats: StorageStats[] = [];

    if (type) {
      const wrapper = this.wrappers.get(type);
      if (wrapper && wrapper.getService().getStats) {
        const stat = await wrapper.getService().getStats();
        stats.push(stat);
      }
    } else {
      const wrappers = Array.from(this.wrappers.values());
      for (const wrapper of wrappers) {
        if (wrapper.getService().getStats) {
          try {
            const stat = await wrapper.getService().getStats();
            stats.push(stat);
          } catch (error) {
            console.error('[StorageServiceFactory] Error getting stats:', error);
          }
        }
      }
    }

    return stats;
  }

  /**
   * 销毁工厂
   */
  destroy(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    // 销毁内存缓存服务
    const wrappers = Array.from(this.wrappers.entries());
    for (const [type, wrapper] of wrappers) {
      if (type === StorageType.MEMORY) {
        const service = wrapper.getService() as any;
        if (service.destroy) {
          service.destroy();
        }
      }
    }

    this.wrappers.clear();
  }

  // ========================================================================
  // 私有方法
  // ========================================================================

  /**
   * 初始化所有存储服务
   */
  private initialize(): void {
    // 按照降级链的顺序创建服务
    for (const storageType of this.config.fallbackChain) {
      const wrapper = this.createServiceWrapper(storageType);

      if (wrapper) {
        this.wrappers.set(storageType, wrapper);
      }
    }

    // 设置降级关系
    let previousWrapper: StorageServiceWrapper | null = null;

    for (const storageType of this.config.fallbackChain) {
      const wrapper = this.wrappers.get(storageType);

      if (wrapper && previousWrapper) {
        previousWrapper.setFallback(wrapper);
      }

      previousWrapper = wrapper || null;
    }
  }

  /**
   * 创建存储服务包装器
   */
  private createServiceWrapper(type: StorageType): StorageServiceWrapper | null {
    const config = this.config.configs[type];

    if (!config) {
      console.warn(`[StorageServiceFactory] No config for ${type}`);
      return null;
    }

    try {
      let service: IStorageService;

      switch (type) {
        case 'localStorage':
          service = createLocalStorageService(config as any);
          break;

        case 'indexedDB':
          service = createIndexedDBStorageService(config as any);
          break;

        case 'memory':
          service = createMemoryCacheService(config as any);
          break;

        default:
          console.warn(`[StorageServiceFactory] Unsupported storage type: ${type}`);
          return null;
      }

      return new StorageServiceWrapper(
        service,
        type,
        this.config.enableAutoFallback ?? true
      );
    } catch (error) {
      console.error(`[StorageServiceFactory] Failed to create ${type} service:`, error);
      return null;
    }
  }

  /**
   * 启动健康检查
   */
  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthCheck();
    }, this.config.healthCheckInterval || 30000);
  }

  /**
   * 执行健康检查
   */
  private async performHealthCheck(): Promise<void> {
    const wrappers = Array.from(this.wrappers.entries());
    for (const [type, wrapper] of wrappers) {
      try {
        // 尝试执行一个简单的操作
        const testKey = `__health_check_${Date.now()}__`;
        await wrapper.getService().set(testKey, 'test');
        await wrapper.getService().delete(testKey);
      } catch (error) {
        console.error(`[StorageServiceFactory] Health check failed for ${type}:`, error);

        // 如果启用了自动降级，尝试使用下一个可用的服务
        if (this.config.enableAutoFallback) {
          const fallbackIndex = this.config.fallbackChain.indexOf(type);
          if (fallbackIndex < this.config.fallbackChain.length - 1) {
            const fallbackType = this.config.fallbackChain[fallbackIndex + 1];
            const fallbackWrapper = this.wrappers.get(fallbackType);

            if (fallbackWrapper) {
              console.warn(`[StorageServiceFactory] ${type} is unhealthy, using ${fallbackType} as fallback`);
            }
          }
        }
      }
    }
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

/**
 * 创建存储服务工厂实例
 */
export function createStorageServiceFactory(config?: Partial<StorageFactoryConfig>): StorageServiceFactory {
  const defaultConfig: StorageFactoryConfig = {
    preferred: StorageType.INDEXED_DB,
    fallbackChain: [StorageType.INDEXED_DB, StorageType.LOCAL_STORAGE, StorageType.MEMORY],
    configs: {},
    enableAutoFallback: true,
    healthCheckInterval: 30000
  };

  // 合并配置
  const mergedConfig: StorageFactoryConfig = {
    ...defaultConfig,
    ...config
  };

  return new StorageServiceFactory(mergedConfig);
}

/**
 * 创建默认存储服务（快捷方式）
 *
 * 使用智能降级策略：IndexedDB → LocalStorage → Memory
 */
export function createDefaultStorageService(): IStorageService {
  const factory = createStorageServiceFactory();
  return factory.getDefaultService();
}

// ============================================================================
// 默认导出
// ============================================================================

export default StorageServiceFactory;
