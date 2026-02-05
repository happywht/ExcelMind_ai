/**
 * LocalStorage 存储服务实现
 *
 * 提供基于 localStorage 的持久化存储，支持：
 * - JSON 序列化/反序列化
 * - TTL 过期时间
 * - 命名空间隔离
 * - 错误处理和降级策略
 * - 存储统计
 *
 * @module storage
 * @version 2.0.0
 */

import type {
  IStorageService,
  StorageOptions,
  StoredItem,
  StorageStats,
  LocalStorageConfig,
  StorageEventPayload,
  StorageEventListener
} from '../../types/storage';

import {
  StorageError,
  StorageNotFoundError,
  StorageCapacityError,
  StorageType
} from '../../types/storage';

// 默认序列化/反序列化函数
const defaultSerializer = (value: any): string => {
  try {
    return JSON.stringify(value);
  } catch (error) {
    throw new StorageError(
      `Failed to serialize value: ${error instanceof Error ? error.message : String(error)}`,
      'SERIALIZATION_ERROR',
      false
    );
  }
};

const defaultDeserializer = (value: string): any => {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new StorageError(
      `Failed to deserialize value: ${error instanceof Error ? error.message : String(error)}`,
      'DESERIALIZATION_ERROR',
      false
    );
  }
};

// ============================================================================
// LocalStorage 存储服务实现
// ============================================================================

/**
 * LocalStorage 存储服务
 *
 * 特性：
 * - 自动序列化/反序列化
 * - 支持 TTL 过期
 * - 命名空间隔离
 * - 容量检测和清理
 * - 错误降级到内存
 */
export class LocalStorageService implements IStorageService {
  private readonly prefix: string;
  private readonly namespacePrefix: string;
  private readonly defaultTTL: number;
  private readonly fallbackToMemory: boolean;
  private readonly memoryFallback: Map<string, string>;
  private readonly listeners: Set<StorageEventListener>;
  private readonly serializer: Serializer<any>;
  private readonly deserializer: Deserializer<any>;
  private readonly isNodeEnv: boolean;
  private readonly isBrowserEnv: boolean;
  private readonly nodeStorage: Map<string, string>;

  // 统计信息
  private stats = {
    hits: 0,
    misses: 0,
    totalWrites: 0,
    totalDeletes: 0,
    errors: 0
  };

  constructor(config: LocalStorageConfig) {
    this.prefix = config.prefix || 'ls_';
    this.namespacePrefix = config.namespacePrefix || '';
    this.defaultTTL = config.defaultTTL || 0; // 0 表示永不过期
    this.fallbackToMemory = config.fallbackToMemory ?? true;
    this.memoryFallback = new Map();
    this.listeners = new Set();
    this.serializer = defaultSerializer;
    this.deserializer = defaultDeserializer;

    // 检测运行环境
    this.isNodeEnv = typeof process !== 'undefined' && process.versions !== undefined && process.versions.node !== undefined;
    this.isBrowserEnv = typeof window !== 'undefined' && 'localStorage' in window;

    // Node.js环境使用内存存储
    this.nodeStorage = new Map();

    if (this.isNodeEnv) {
      console.warn('[LocalStorageService] Running in Node.js environment, using in-memory storage');
    } else if (this.isBrowserEnv) {
      // 浏览器环境检测 localStorage 可用性
      this.checkAvailability();
    } else {
      console.warn('[LocalStorageService] Unknown environment, using in-memory storage');
    }
  }

  // ========================================================================
  // 核心存储操作
  // ========================================================================

  /**
   * 获取值
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const fullKey = this.buildKey(key);
      const item = this.getItem(fullKey);

      if (!item) {
        this.stats.misses++;
        return null;
      }

      // 检查是否过期
      if (this.isExpired(item)) {
        await this.delete(key);
        this.stats.misses++;
        return null;
      }

      // 更新访问统计
      item.hitCount = (item.hitCount || 0) + 1;
      item.lastAccessedAt = Date.now();
      this.setItem(fullKey, item);

      this.stats.hits++;
      return item.value as T;
    } catch (error) {
      this.stats.errors++;
      console.error('[LocalStorageService] Get error:', error);
      return null;
    }
  }

  /**
   * 设置值
   */
  async set<T>(key: string, value: T, options?: StorageOptions): Promise<void> {
    try {
      const fullKey = this.buildKey(key, options?.namespace);
      const now = Date.now();

      const item: StoredItem<T> = {
        value,
        timestamp: now,
        hitCount: 0,
        lastAccessedAt: now,
        metadata: options?.metadata
      };

      // 设置过期时间
      const ttl = options?.ttl ?? this.defaultTTL;
      if (ttl > 0) {
        item.expiresAt = now + ttl * 1000;
      }

      // 计算大小
      const serialized = this.serializer(item);
      item.size = new Blob([serialized]).size;

      // 检查容量
      if (!this.checkCapacity(item.size)) {
        await this.cleanup();

        // 再次检查
        if (!this.checkCapacity(item.size)) {
          throw new StorageCapacityError(item.size, this.getAvailableSpace());
        }
      }

      this.setItem(fullKey, item);
      this.stats.totalWrites++;

      // 触发事件
      this.notifyListeners({
        type: 'set',
        key,
        timestamp: now,
        source: 'local',
        namespace: options?.namespace
      });
    } catch (error) {
      this.stats.errors++;

      if (error instanceof StorageCapacityError && this.fallbackToMemory) {
        // 降级到内存存储
        console.warn('[LocalStorageService] Falling back to memory storage');
        this.memoryFallback.set(key, this.serializer(value));
        return;
      }

      throw new StorageError(
        `Failed to set value: ${error instanceof Error ? error.message : String(error)}`,
        'STORAGE_SET_ERROR',
        true,
        { key, error }
      );
    }
  }

  /**
   * 删除值
   */
  async delete(key: string): Promise<void> {
    try {
      const fullKey = this.buildKey(key);

      // 检查是否在内存降级中
      if (this.memoryFallback.has(key)) {
        this.memoryFallback.delete(key);
      }

      if (this.isNodeEnv) {
        // Node.js环境：删除内存存储
        this.nodeStorage.delete(fullKey);
      } else if (this.isBrowserEnv) {
        // 浏览器环境：删除localStorage
        localStorage.removeItem(fullKey);
      } else {
        // 降级到内存存储
        this.memoryFallback.delete(fullKey);
      }

      this.stats.totalDeletes++;

      // 触发事件
      this.notifyListeners({
        type: 'delete',
        key,
        timestamp: Date.now(),
        source: 'local'
      });
    } catch (error) {
      this.stats.errors++;
      throw new StorageError(
        `Failed to delete value: ${error instanceof Error ? error.message : String(error)}`,
        'STORAGE_DELETE_ERROR',
        true,
        { key, error }
      );
    }
  }

  /**
   * 检查键是否存在
   */
  async exists(key: string): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key);
      const item = this.getItem(fullKey);

      if (!item) {
        return false;
      }

      // 检查是否过期
      if (this.isExpired(item)) {
        await this.delete(key);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[LocalStorageService] Exists error:', error);
      return false;
    }
  }

  /**
   * 获取所有键（支持模式匹配）
   */
  async keys(pattern?: string): Promise<string[]> {
    try {
      const allKeys: string[] = [];

      if (this.isNodeEnv) {
        // Node.js环境：遍历内存存储
        for (const fullKey of this.nodeStorage.keys()) {
          if (!fullKey.startsWith(this.prefix)) continue;

          const originalKey = this.extractKey(fullKey);

          if (pattern && !this.matchPattern(originalKey, pattern)) {
            continue;
          }

          const item = this.getItem(fullKey);
          if (item && !this.isExpired(item)) {
            allKeys.push(originalKey);
          }
        }
      } else if (this.isBrowserEnv) {
        // 浏览器环境：遍历localStorage
        for (let i = 0; i < localStorage.length; i++) {
          const fullKey = localStorage.key(i);
          if (!fullKey) continue;

          if (!fullKey.startsWith(this.prefix)) continue;

          const originalKey = this.extractKey(fullKey);

          if (pattern && !this.matchPattern(originalKey, pattern)) {
            continue;
          }

          const item = this.getItem(fullKey);
          if (item && !this.isExpired(item)) {
            allKeys.push(originalKey);
          }
        }
      } else {
        // 降级到内存存储
        for (const fullKey of this.memoryFallback.keys()) {
          if (!fullKey.startsWith(this.prefix)) continue;

          const originalKey = this.extractKey(fullKey);

          if (pattern && !this.matchPattern(originalKey, pattern)) {
            continue;
          }

          const item = this.getItem(fullKey);
          if (item && !this.isExpired(item)) {
            allKeys.push(originalKey);
          }
        }
      }

      return allKeys;
    } catch (error) {
      console.error('[LocalStorageService] Keys error:', error);
      return [];
    }
  }

  /**
   * 清空存储
   */
  async clear(namespace?: string): Promise<void> {
    try {
      const keysToDelete: string[] = [];

      if (this.isNodeEnv) {
        // Node.js环境：遍历内存存储
        for (const fullKey of this.nodeStorage.keys()) {
          if (!fullKey.startsWith(this.prefix)) continue;

          if (namespace) {
            const nsKey = this.buildKey('', namespace);
            if (!fullKey.startsWith(nsKey)) continue;
          }

          keysToDelete.push(fullKey);
        }

        keysToDelete.forEach(key => this.nodeStorage.delete(key));
      } else if (this.isBrowserEnv) {
        // 浏览器环境：遍历localStorage
        for (let i = 0; i < localStorage.length; i++) {
          const fullKey = localStorage.key(i);
          if (!fullKey) continue;

          if (!fullKey.startsWith(this.prefix)) continue;

          if (namespace) {
            const nsKey = this.buildKey('', namespace);
            if (!fullKey.startsWith(nsKey)) continue;
          }

          keysToDelete.push(fullKey);
        }

        keysToDelete.forEach(key => localStorage.removeItem(key));
      } else {
        // 降级到内存存储
        for (const fullKey of this.memoryFallback.keys()) {
          if (!fullKey.startsWith(this.prefix)) continue;

          if (namespace) {
            const nsKey = this.buildKey('', namespace);
            if (!fullKey.startsWith(nsKey)) continue;
          }

          keysToDelete.push(fullKey);
        }

        keysToDelete.forEach(key => this.memoryFallback.delete(key));
      }

      // 触发事件
      this.notifyListeners({
        type: 'clear',
        key: namespace || 'all',
        timestamp: Date.now(),
        source: 'local',
        namespace
      });
    } catch (error) {
      throw new StorageError(
        `Failed to clear storage: ${error instanceof Error ? error.message : String(error)}`,
        'STORAGE_CLEAR_ERROR',
        true,
        { namespace, error }
      );
    }
  }

  /**
   * 获取值及其元数据
   */
  async getWithMetadata<T>(key: string): Promise<StoredItem<T> | null> {
    try {
      const fullKey = this.buildKey(key);
      const item = this.getItem(fullKey);

      if (!item) {
        return null;
      }

      if (this.isExpired(item)) {
        await this.delete(key);
        return null;
      }

      return item as StoredItem<T>;
    } catch (error) {
      console.error('[LocalStorageService] GetWithMetadata error:', error);
      return null;
    }
  }

  /**
   * 批量设置值
   */
  async batchSet<T>(items: Array<{ key: string; value: T }>, options?: StorageOptions): Promise<void> {
    for (const item of items) {
      await this.set(item.key, item.value, options);
    }
  }

  /**
   * 批量获取值
   */
  async batchGet<T>(keys: string[]): Promise<Map<string, T>> {
    const result = new Map<string, T>();

    for (const key of keys) {
      const value = await this.get<T>(key);
      if (value !== null) {
        result.set(key, value);
      }
    }

    return result;
  }

  /**
   * 获取存储统计信息
   */
  async getStats(): Promise<StorageStats> {
    const totalEntries = (await this.keys()).length;
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;

    return {
      type: StorageType.LOCAL_STORAGE,
      totalEntries,
      totalSize: this.getUsedSpace(),
      hitRate,
      hits: this.stats.hits,
      misses: this.stats.misses
    };
  }

  // ========================================================================
  // 事件监听
  // ========================================================================

  /**
   * 添加事件监听器
   */
  addEventListener(listener: StorageEventListener): () => void {
    this.listeners.add(listener);

    // 返回取消监听的函数
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * 移除事件监听器
   */
  removeEventListener(listener: StorageEventListener): void {
    this.listeners.delete(listener);
  }

  // ========================================================================
  // 私有方法
  // ========================================================================

  /**
   * 构建完整键名
   */
  private buildKey(key: string, namespace?: string): string {
    const parts = [this.prefix];

    if (namespace || this.namespacePrefix) {
      parts.push(namespace || this.namespacePrefix);
    }

    parts.push(key);

    return parts.join(':');
  }

  /**
   * 提取原始键名
   */
  private extractKey(fullKey: string): string {
    let withoutPrefix = fullKey.substring(this.prefix.length);
    const parts = withoutPrefix.split(':');

    // 如果有命名空间，跳过它
    if (parts.length > 1 && this.namespacePrefix && parts[0] === this.namespacePrefix) {
      return parts.slice(1).join(':');
    }

    // 如果第一部分是空字符串（由于前缀以冒号结尾），移除它
    if (parts.length > 0 && parts[0] === '') {
      return parts.slice(1).join(':');
    }

    return parts.join(':');
  }

  /**
   * 从 localStorage 获取存储项
   */
  private getItem<T>(fullKey: string): StoredItem<T> | null {
    try {
      let serialized: string | null = null;

      if (this.isNodeEnv) {
        // Node.js环境：使用内存存储
        serialized = this.nodeStorage.get(fullKey) || null;
      } else if (this.isBrowserEnv) {
        // 浏览器环境：使用localStorage
        serialized = localStorage.getItem(fullKey);
      } else {
        // 降级到内存存储
        serialized = this.memoryFallback.get(fullKey) || null;
      }

      if (!serialized) {
        return null;
      }

      return this.deserializer(serialized) as StoredItem<T>;
    } catch (error) {
      console.error('[LocalStorageService] GetItem error:', error);
      return null;
    }
  }

  /**
   * 设置存储项到 localStorage
   */
  private setItem<T>(fullKey: string, item: StoredItem<T>): void {
    try {
      const serialized = this.serializer(item);

      if (this.isNodeEnv) {
        // Node.js环境：使用内存存储
        this.nodeStorage.set(fullKey, serialized);
      } else if (this.isBrowserEnv) {
        // 浏览器环境：使用localStorage
        localStorage.setItem(fullKey, serialized);
      } else {
        // 降级到内存存储
        this.memoryFallback.set(fullKey, serialized);
      }
    } catch (error) {
      console.error('[LocalStorageService] SetItem error:', error);
      throw error;
    }
  }

  /**
   * 检查项是否过期
   */
  private isExpired<T>(item: StoredItem<T>): boolean {
    if (!item.expiresAt) {
      return false;
    }
    return Date.now() > item.expiresAt;
  }

  /**
   * 模式匹配（支持简单的通配符）
   */
  private matchPattern(key: string, pattern: string): boolean {
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(key);
  }

  /**
   * 检查 localStorage 可用性
   */
  private checkAvailability(): void {
    try {
      const testKey = '__availability_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
    } catch (error) {
      console.warn('[LocalStorageService] localStorage not available:', error);
      if (!this.fallbackToMemory) {
        throw new StorageError(
          'localStorage is not available',
          'STORAGE_UNAVAILABLE',
          false,
          { error }
        );
      }
    }
  }

  /**
   * 检查容量
   */
  private checkCapacity(requiredSize: number): boolean {
    const usedSpace = this.getUsedSpace();
    const availableSpace = 5 * 1024 * 1024 - usedSpace; // localStorage 通常限制 5MB
    return availableSpace >= requiredSize;
  }

  /**
   * 获取已用空间
   */
  private getUsedSpace(): number {
    let total = 0;

    if (this.isNodeEnv) {
      // Node.js环境：计算内存存储大小
      for (const [key, value] of this.nodeStorage.entries()) {
        total += key.length + value.length;
      }
    } else if (this.isBrowserEnv) {
      // 浏览器环境：计算localStorage大小
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;

        const value = localStorage.getItem(key);
        if (value) {
          total += key.length + value.length;
        }
      }
    } else {
      // 降级到内存存储
      for (const [key, value] of this.memoryFallback.entries()) {
        total += key.length + value.length;
      }
    }

    return total;
  }

  /**
   * 获取可用空间
   */
  private getAvailableSpace(): number {
    return 5 * 1024 * 1024 - this.getUsedSpace();
  }

  /**
   * 清理过期数据
   */
  private async cleanup(): Promise<void> {
    const allKeys = await this.keys();

    for (const key of allKeys) {
      const item = await this.getWithMetadata(key);
      if (item && this.isExpired(item)) {
        await this.delete(key);
      }
    }
  }

  /**
   * 通知事件监听器
   */
  private notifyListeners(event: StorageEventPayload): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[LocalStorageService] Error in event listener:', error);
      }
    });
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

/**
 * 创建 LocalStorage 服务实例
 */
export function createLocalStorageService(config?: Partial<LocalStorageConfig>): LocalStorageService {
  const defaultConfig: LocalStorageConfig = {
    type: 'localStorage',
    prefix: 'ls_',
    namespacePrefix: '',
    defaultTTL: 0,
    fallbackToMemory: true
  };

  const mergedConfig = { ...defaultConfig, ...config } as LocalStorageConfig;

  return new LocalStorageService(mergedConfig);
}

// ============================================================================
// 默认导出
// ============================================================================

export default LocalStorageService;
