/**
 * IndexedDB 存储服务实现（增强版）
 *
 * 提供基于 IndexedDB 的大文件存储，支持：
 * - 大文件存储（模板文件）
 * - 事务操作
 * - 索引查询
 * - 批量操作优化
 * - 命名空间隔离
 * - 自动升级
 *
 * @module storage
 * @version 2.0.0
 */

import type {
  IStorageService,
  StorageOptions,
  StoredItem,
  StorageStats,
  StorageType,
  IndexedDBConfig,
  StorageEventPayload,
  StorageEventListener
} from '../../types/storage';

import {
  StorageError,
  StorageNotFoundError
} from '../../types/storage';

// ============================================================================
// IndexedDB 存储服务实现
// ============================================================================

/**
 * IndexedDB 存储服务
 *
 * 特性：
 * - 支持大文件存储（无大小限制）
 * - 批量操作优化
 * - 索引查询支持
 * - 自动数据库升级
 * - 事务支持
 */
export class IndexedDBStorageService implements IStorageService {
  private db: IDBDatabase | null = null;
  private readonly config: IndexedDBConfig;
  private readonly storeName: string;
  private readonly namespacePrefix: string;
  private readonly defaultTTL: number;
  private readonly listeners: Set<StorageEventListener>;

  // 统计信息
  private stats = {
    hits: 0,
    misses: 0,
    totalWrites: 0,
    totalDeletes: 0
  };

  constructor(config: IndexedDBConfig) {
    this.config = config;
    this.storeName = config.stores[0]?.name || 'default';
    this.namespacePrefix = config.namespacePrefix || '';
    this.defaultTTL = config.defaultTTL || 0;
    this.listeners = new Set();
  }

  // ========================================================================
  // 连接管理
  // ========================================================================

  /**
   * 初始化数据库连接
   */
  async initialize(): Promise<void> {
    if (this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.dbName, this.config.version);

      request.onerror = () => {
        reject(new StorageError(
          `Failed to open IndexedDB: ${request.error?.message || 'Unknown error'}`,
          'IDB_OPEN_ERROR',
          true,
          { error: request.error }
        ));
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[IndexedDBStorageService] Database opened successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.upgradeDatabase(db);
      };
    });
  }

  /**
   * 关闭数据库连接
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('[IndexedDBStorageService] Database closed');
    }
  }

  // ========================================================================
  // 核心存储操作
  // ========================================================================

  /**
   * 获取值
   */
  async get<T>(key: string): Promise<T | null> {
    await this.ensureInitialized();

    try {
      const fullKey = this.buildKey(key);
      const item = await this.getItem<T>(fullKey);

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
      await this.setItem(fullKey, item);

      this.stats.hits++;
      return item.value;
    } catch (error) {
      console.error('[IndexedDBStorageService] Get error:', error);
      return null;
    }
  }

  /**
   * 设置值
   */
  async set<T>(key: string, value: T, options?: StorageOptions): Promise<void> {
    await this.ensureInitialized();

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

      await this.setItem(fullKey, item);
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
      throw new StorageError(
        `Failed to set value: ${error instanceof Error ? error.message : String(error)}`,
        'IDB_SET_ERROR',
        true,
        { key, error }
      );
    }
  }

  /**
   * 删除值
   */
  async delete(key: string): Promise<void> {
    await this.ensureInitialized();

    try {
      const fullKey = this.buildKey(key);

      await this.transaction(['readwrite'], async (store) => {
        return new Promise<void>((resolve, reject) => {
          const request = store.delete(fullKey);

          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      });

      this.stats.totalDeletes++;

      // 触发事件
      this.notifyListeners({
        type: 'delete',
        key,
        timestamp: Date.now(),
        source: 'local'
      });
    } catch (error) {
      throw new StorageError(
        `Failed to delete value: ${error instanceof Error ? error.message : String(error)}`,
        'IDB_DELETE_ERROR',
        true,
        { key, error }
      );
    }
  }

  /**
   * 检查键是否存在
   */
  async exists(key: string): Promise<boolean> {
    await this.ensureInitialized();

    try {
      const fullKey = this.buildKey(key);
      const item = await this.getItem(fullKey);

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
      console.error('[IndexedDBStorageService] Exists error:', error);
      return false;
    }
  }

  /**
   * 获取所有键（支持模式匹配）
   */
  async keys(pattern?: string): Promise<string[]> {
    await this.ensureInitialized();

    try {
      const allKeys: string[] = [];

      await this.transaction(['readonly'], async (store) => {
        return new Promise<void>((resolve, reject) => {
          const request = store.openCursor();

          request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result;

            if (cursor) {
              const fullKey = cursor.key as string;

              // 提取原始键
              const originalKey = this.extractKey(fullKey);

              // 模式匹配
              if (!pattern || this.matchPattern(originalKey, pattern)) {
                // 检查是否过期
                const item = cursor.value as StoredItem<any>;
                if (!this.isExpired(item)) {
                  allKeys.push(originalKey);
                }
              }

              cursor.continue();
            } else {
              resolve();
            }
          };

          request.onerror = () => reject(request.error);
        });
      });

      return allKeys;
    } catch (error) {
      console.error('[IndexedDBStorageService] Keys error:', error);
      return [];
    }
  }

  /**
   * 清空存储
   */
  async clear(namespace?: string): Promise<void> {
    await this.ensureInitialized();

    try {
      await this.transaction(['readwrite'], async (store) => {
        return new Promise<void>((resolve, reject) => {
          if (namespace) {
            // 只清空指定命名空间
            const range = IDBKeyRange.bound(
              `${this.namespacePrefix}${namespace}:`,
              `${this.namespacePrefix}${namespace}:\uffff`
            );

            const request = store.delete(range);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          } else {
            // 清空所有
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          }
        });
      });

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
        'IDB_CLEAR_ERROR',
        true,
        { namespace, error }
      );
    }
  }

  /**
   * 获取值及其元数据
   */
  async getWithMetadata<T>(key: string): Promise<StoredItem<T> | null> {
    await this.ensureInitialized();

    try {
      const fullKey = this.buildKey(key);
      const item = await this.getItem<T>(fullKey);

      if (!item) {
        return null;
      }

      if (this.isExpired(item)) {
        await this.delete(key);
        return null;
      }

      return item;
    } catch (error) {
      console.error('[IndexedDBStorageService] GetWithMetadata error:', error);
      return null;
    }
  }

  /**
   * 批量设置值
   */
  async batchSet<T>(items: Array<{ key: string; value: T }>, options?: StorageOptions): Promise<void> {
    await this.ensureInitialized();

    await this.transaction(['readwrite'], async (store) => {
      const promises = items.map(async ({ key, value }) => {
        const fullKey = this.buildKey(key, options?.namespace);
        const now = Date.now();

        const item: StoredItem<T> = {
          value,
          timestamp: now,
          hitCount: 0,
          lastAccessedAt: now,
          metadata: options?.metadata
        };

        const ttl = options?.ttl ?? this.defaultTTL;
        if (ttl > 0) {
          item.expiresAt = now + ttl * 1000;
        }

        return new Promise<void>((resolve, reject) => {
          const request = store.put(item, fullKey);

          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      });

      await Promise.all(promises);
      this.stats.totalWrites += items.length;
    });
  }

  /**
   * 批量获取值
   */
  async batchGet<T>(keys: string[]): Promise<Map<string, T>> {
    await this.ensureInitialized();

    const result = new Map<string, T>();

    await this.transaction(['readonly'], async (store) => {
      const promises = keys.map(async (key) => {
        const fullKey = this.buildKey(key);

        return new Promise<{ key: string; value: T | null }>((resolve) => {
          const request = store.get(fullKey);

          request.onsuccess = () => {
            const item = request.result as StoredItem<T> | undefined;

            if (!item) {
              resolve({ key, value: null });
              return;
            }

            if (this.isExpired(item)) {
              resolve({ key, value: null });
              return;
            }

            resolve({ key, value: item.value });
          };

          request.onerror = () => {
            resolve({ key, value: null });
          };
        });
      });

      const results = await Promise.all(promises);

      for (const { key, value } of results) {
        if (value !== null) {
          result.set(key, value);
        }
      }
    });

    return result;
  }

  /**
   * 获取存储统计信息
   */
  async getStats(): Promise<StorageStats> {
    await this.ensureInitialized();

    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;

    // 计算总大小
    let totalSize = 0;
    let totalEntries = 0;

    await this.transaction(['readonly'], async (store) => {
      return new Promise<void>((resolve) => {
        const countRequest = store.count();

        countRequest.onsuccess = () => {
          totalEntries = countRequest.result;
          resolve();
        };

        countRequest.onerror = () => resolve();
      });
    });

    return {
      type: StorageType.INDEXED_DB,
      totalEntries,
      totalSize,
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
  // 私有辅助方法
  // ========================================================================

  /**
   * 确保数据库已初始化
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }
  }

  /**
   * 执行事务
   */
  private async transaction<T>(
    mode: IDBTransactionMode[],
    callback: (store: IDBObjectStore) => Promise<T>
  ): Promise<T> {
    if (!this.db) {
      throw new StorageError('Database not initialized', 'IDB_NOT_INITIALIZED', false);
    }

    const tx = this.db.transaction([this.storeName], mode[0]);
    const store = tx.objectStore(this.storeName);

    try {
      const result = await callback(store);
      return result;
    } catch (error) {
      throw new StorageError(
        `Transaction failed: ${error instanceof Error ? error.message : String(error)}`,
        'IDB_TRANSACTION_ERROR',
        true,
        { error }
      );
    }
  }

  /**
   * 获取存储项
   */
  private async getItem<T>(key: string): Promise<StoredItem<T> | null> {
    return this.transaction(['readonly'], async (store) => {
      return new Promise<StoredItem<T> | null>((resolve, reject) => {
        const request = store.get(key);

        request.onsuccess = () => {
          const item = request.result as StoredItem<T> | undefined;
          resolve(item || null);
        };

        request.onerror = () => reject(request.error);
      });
    });
  }

  /**
   * 设置存储项
   */
  private async setItem<T>(key: string, item: StoredItem<T>): Promise<void> {
    await this.transaction(['readwrite'], async (store) => {
      return new Promise<void>((resolve, reject) => {
        const request = store.put(item, key);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  }

  /**
   * 构建完整键名
   */
  private buildKey(key: string, namespace?: string): string {
    const parts = [];

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
    const parts = fullKey.split(':');

    if (this.namespacePrefix && parts.length > 1) {
      return parts.slice(1).join(':');
    }

    return parts.join(':');
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
   * 模式匹配
   */
  private matchPattern(key: string, pattern: string): boolean {
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(key);
  }

  /**
   * 升级数据库结构
   */
  private upgradeDatabase(db: IDBDatabase): void {
    console.log('[IndexedDBStorageService] Upgrading database to version', this.config.version);

    for (const storeConfig of this.config.stores) {
      if (!db.objectStoreNames.contains(storeConfig.name)) {
        const store = db.createObjectStore(storeConfig.name, {
          keyPath: storeConfig.keyPath || undefined,
          autoIncrement: storeConfig.autoIncrement || false
        });

        // 创建索引
        if (storeConfig.indexes) {
          for (const indexConfig of storeConfig.indexes) {
            if (!store.indexNames.contains(indexConfig.name)) {
              store.createIndex(
                indexConfig.name,
                indexConfig.keyPath,
                indexConfig.options || {}
              );
            }
          }
        }

        console.log('[IndexedDBStorageService] Created store:', storeConfig.name);
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
        console.error('[IndexedDBStorageService] Error in event listener:', error);
      }
    });
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

/**
 * 创建 IndexedDB 存储服务实例
 */
export function createIndexedDBStorageService(config?: Partial<IndexedDBConfig>): IndexedDBStorageService {
  const defaultConfig: IndexedDBConfig = {
    type: 'indexedDB',
    dbName: 'ExcelMindStorage',
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
          },
          {
            name: 'namespace',
            keyPath: 'namespace',
            options: { unique: false }
          }
        ]
      }
    ]
  };

  const mergedConfig = { ...defaultConfig, ...config } as IndexedDBConfig;

  return new IndexedDBStorageService(mergedConfig);
}

// ============================================================================
// 默认导出
// ============================================================================

export default IndexedDBStorageService;
