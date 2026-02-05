/**
 * IndexedDB 存储服务
 *
 * 提供浏览器本地数据库操作，支持：
 * - 完整的 CRUD 操作
 * - 索引查询
 * - 批量操作
 * - 事务处理
 * - 多标签页同步
 * - 自动升级
 *
 * @module storage
 */

import type {
  IDBConfig,
  IDBStoreConfig,
  StorageResult,
  StorageError,
  StorageEvent as StorageEventType,
} from '../../../types/storageTypes';

// ============================================================================
// IndexedDB 服务实现
// ============================================================================

export class IndexedDBService {
  private db: IDBDatabase | null = null;
  private config: IDBConfig;
  private isConnected: boolean = false;
  private listeners: Set<(event: StorageEventType) => void> = new Set();

  constructor(config: IDBConfig) {
    this.config = config;
  }

  // ========================================================================
  // 连接管理
  // ========================================================================

  /**
   * 打开数据库连接
   */
  async open(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.dbName, this.config.version);

      request.onerror = () => {
        const error: StorageError = {
          code: 'IDB_OPEN_FAILED',
          message: `Failed to open IndexedDB: ${request.error?.message || 'Unknown error'}`,
          details: { originalError: request.error },
          retryable: true,
        };
        reject(error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isConnected = true;

        // 监听 storage 事件（多标签页同步）
        window.addEventListener('storage', this.handleStorageEvent);

        console.log('[IndexedDBService] Database opened successfully');
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
    if (this.db && this.isConnected) {
      this.db.close();
      this.isConnected = false;
      this.db = null;

      window.removeEventListener('storage', this.handleStorageEvent);
      console.log('[IndexedDBService] Database closed');
    }
  }

  /**
   * 检查连接状态
   */
  isConnectionActive(): boolean {
    return this.isConnected && this.db !== null;
  }

  // ========================================================================
  // CRUD 操作
  // ========================================================================

  /**
   * 获取单个值
   */
  async get<T>(storeName: string, key: string): Promise<StorageResult<T>> {
    this.ensureConnected();

    try {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      return new Promise((resolve) => {
        request.onsuccess = () => {
          resolve({ success: true, data: request.result as T });
        };

        request.onerror = () => {
          resolve(this.handleError<T>('GET', key, request.error!));
        };
      });
    } catch (error) {
      return this.handleError<T>('GET', key, error as Error);
    }
  }

  /**
   * 获取所有值
   */
  async getAll<T>(storeName: string): Promise<StorageResult<T[]>> {
    this.ensureConnected();

    try {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      return new Promise((resolve) => {
        request.onsuccess = () => {
          resolve({ success: true, data: request.result as T[] });
        };

        request.onerror = () => {
          resolve(this.handleError<T[]>('GETALL', storeName, request.error!));
        };
      });
    } catch (error) {
      return this.handleError<T[]>('GETALL', storeName, error as Error);
    }
  }

  /**
   * 添加值
   */
  async add<T>(storeName: string, value: T): Promise<StorageResult<string>> {
    this.ensureConnected();

    try {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(value);

      return new Promise((resolve) => {
        request.onsuccess = () => {
          const key = request.result as string;
          this.notifyListeners({ type: 'set', key, timestamp: Date.now(), source: 'local' });
          resolve({ success: true, data: key });
        };

        request.onerror = () => {
          resolve(this.handleError<string>('ADD', JSON.stringify(value), request.error!));
        };
      });
    } catch (error) {
      return this.handleError<string>('ADD', JSON.stringify(value), error as Error);
    }
  }

  /**
   * 更新值
   */
  async put<T>(storeName: string, value: T): Promise<StorageResult<void>> {
    this.ensureConnected();

    try {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(value);

      return new Promise((resolve) => {
        request.onsuccess = () => {
          // 获取键路径
          const keyPath = store.keyPath;
          const key = keyPath ? (value as any)[keyPath as string] : 'unknown';
          this.notifyListeners({ type: 'set', key, timestamp: Date.now(), source: 'local' });
          resolve({ success: true });
        };

        request.onerror = () => {
          resolve(this.handleError<void>('PUT', JSON.stringify(value), request.error!));
        };
      });
    } catch (error) {
      return this.handleError<void>('PUT', JSON.stringify(value), error as Error);
    }
  }

  /**
   * 删除值
   */
  async delete(storeName: string, key: string): Promise<StorageResult<void>> {
    this.ensureConnected();

    try {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      return new Promise((resolve) => {
        request.onsuccess = () => {
          this.notifyListeners({ type: 'delete', key, timestamp: Date.now(), source: 'local' });
          resolve({ success: true });
        };

        request.onerror = () => {
          resolve(this.handleError<void>('DELETE', key, request.error!));
        };
      });
    } catch (error) {
      return this.handleError<void>('DELETE', key, error as Error);
    }
  }

  /**
   * 清空存储
   */
  async clear(storeName: string): Promise<StorageResult<void>> {
    this.ensureConnected();

    try {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      return new Promise((resolve) => {
        request.onsuccess = () => {
          this.notifyListeners({ type: 'clear', key: storeName, timestamp: Date.now(), source: 'local' });
          resolve({ success: true });
        };

        request.onerror = () => {
          resolve(this.handleError<void>('CLEAR', storeName, request.error!));
        };
      });
    } catch (error) {
      return this.handleError<void>('CLEAR', storeName, error as Error);
    }
  }

  // ========================================================================
  // 查询操作
  // ========================================================================

  /**
   * 通过索引查询
   */
  async queryByIndex<T>(
    storeName: string,
    indexName: string,
    value: any
  ): Promise<StorageResult<T[]>> {
    this.ensureConnected();

    try {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      return new Promise((resolve) => {
        request.onsuccess = () => {
          resolve({ success: true, data: request.result as T[] });
        };

        request.onerror = () => {
          resolve(this.handleError<T[]>('INDEX_QUERY', `${storeName}.${indexName}`, request.error!));
        };
      });
    } catch (error) {
      return this.handleError<T[]>('INDEX_QUERY', `${storeName}.${indexName}`, error as Error);
    }
  }

  /**
   * 通过范围查询
   */
  async queryByRange<T>(
    storeName: string,
    indexName: string,
    range: IDBKeyRange
  ): Promise<StorageResult<T[]>> {
    this.ensureConnected();

    try {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(range);

      return new Promise((resolve) => {
        request.onsuccess = () => {
          resolve({ success: true, data: request.result as T[] });
        };

        request.onerror = () => {
          resolve(this.handleError<T[]>('RANGE_QUERY', `${storeName}.${indexName}`, request.error!));
        };
      });
    } catch (error) {
      return this.handleError<T[]>('RANGE_QUERY', `${storeName}.${indexName}`, error as Error);
    }
  }

  // ========================================================================
  // 批量操作
  // ========================================================================

  /**
   * 批量添加
   */
  async bulkAdd<T>(storeName: string, values: T[]): Promise<StorageResult<string[]>> {
    this.ensureConnected();

    try {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      const keys: string[] = [];
      let hasError = false;

      return new Promise((resolve) => {
        transaction.oncomplete = () => {
          if (!hasError) {
            this.notifyListeners({ type: 'set', key: storeName, timestamp: Date.now(), source: 'local' });
            resolve({ success: true, data: keys });
          }
        };

        transaction.onerror = () => {
          resolve(this.handleError<string[]>('BULK_ADD', storeName, transaction.error!));
        };

        for (const value of values) {
          const request = store.add(value);

          request.onsuccess = () => {
            keys.push(request.result as string);
          };

          request.onerror = () => {
            hasError = true;
          };
        }
      });
    } catch (error) {
      return this.handleError<string[]>('BULK_ADD', storeName, error as Error);
    }
  }

  /**
   * 批量删除
   */
  async bulkDelete(storeName: string, keys: string[]): Promise<StorageResult<number>> {
    this.ensureConnected();

    try {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      let deleted = 0;
      let hasError = false;

      return new Promise((resolve) => {
        transaction.oncomplete = () => {
          if (!hasError) {
            this.notifyListeners({ type: 'delete', key: storeName, timestamp: Date.now(), source: 'local' });
            resolve({ success: true, data: deleted });
          }
        };

        transaction.onerror = () => {
          resolve(this.handleError<number>('BULK_DELETE', storeName, transaction.error!));
        };

        for (const key of keys) {
          const request = store.delete(key);

          request.onsuccess = () => {
            deleted++;
          };

          request.onerror = () => {
            hasError = true;
          };
        }
      });
    } catch (error) {
      return this.handleError<number>('BULK_DELETE', storeName, error as Error);
    }
  }

  // ========================================================================
  // 统计和计数
  // ========================================================================

  /**
   * 统计记录数
   */
  async count(storeName: string): Promise<StorageResult<number>> {
    this.ensureConnected();

    try {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();

      return new Promise((resolve) => {
        request.onsuccess = () => {
          resolve({ success: true, data: request.result });
        };

        request.onerror = () => {
          resolve(this.handleError<number>('COUNT', storeName, request.error!));
        };
      });
    } catch (error) {
      return this.handleError<number>('COUNT', storeName, error as Error);
    }
  }

  /**
   * 获取数据库大小（近似）
   */
  async getDatabaseSize(): Promise<number> {
    if (!this.db) return 0;

    try {
      // 估算大小
      let totalSize = 0;

      for (const storeConfig of this.config.stores) {
        const result = await this.getAll(storeConfig.name);
        if (result.success && result.data) {
          for (const item of result.data) {
            totalSize += JSON.stringify(item).length;
          }
        }
      }

      return totalSize;
    } catch (error) {
      console.error('[IndexedDBService] Error calculating database size:', error);
      return 0;
    }
  }

  // ========================================================================
  // 事件监听
  // ========================================================================

  /**
   * 添加存储变化监听器
   */
  addListener(callback: (event: StorageEventType) => void): () => void {
    this.listeners.add(callback);

    // 返回取消监听的函数
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(event: StorageEventType): void {
    this.listeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('[IndexedDBService] Error in storage listener:', error);
      }
    });
  }

  /**
   * 处理跨标签页的 storage 事件
   */
  private handleStorageEvent = (event: StorageEvent): void => {
    // 存储事件通常用于 localStorage，但对于 IndexedDB
    // 我们需要使用 BroadcastChannel 或自定义实现
    if (event.key && event.key.startsWith(this.config.dbName)) {
      this.notifyListeners({
        type: 'set',
        key: event.key,
        timestamp: Date.now(),
        source: 'remote',
      });
    }
  };

  // ========================================================================
  // 数据库升级
  // ========================================================================

  /**
   * 升级数据库结构
   */
  private upgradeDatabase(db: IDBDatabase): void {
    console.log('[IndexedDBService] Upgrading database to version', this.config.version);

    // 创建所有存储对象
    for (const storeConfig of this.config.stores) {
      if (!db.objectStoreNames.contains(storeConfig.name)) {
        const store = db.createObjectStore(storeConfig.name, {
          keyPath: storeConfig.keyPath,
          autoIncrement: storeConfig.autoIncrement || false,
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

        console.log('[IndexedDBService] Created store:', storeConfig.name);
      }
    }
  }

  // ========================================================================
  // 辅助方法
  // ========================================================================

  /**
   * 确保已连接
   */
  private ensureConnected(): void {
    if (!this.isConnected || !this.db) {
      throw new Error('IndexedDB is not connected');
    }
  }

  /**
   * 处理操作错误
   */
  private handleError<T>(
    operation: string,
    key: string,
    error: DOMException | Error
  ): StorageResult<T> {
    const storageError: StorageError = {
      code: `IDB_${operation}_ERROR`,
      message: `${operation} failed for key '${key}': ${error.message}`,
      details: { originalError: error },
      retryable: true,
    };

    console.error(`[IndexedDBService] ${storageError.code}:`, storageError.message);

    return {
      success: false,
      error: storageError,
    };
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

/**
 * 创建 IndexedDB 服务实例
 */
export function createIndexedDBService(config?: Partial<IDBConfig>): IndexedDBService {
  const defaultConfig: IDBConfig = {
    dbName: 'ExcelMindDB',
    version: 1,
    stores: [],
  };

  const mergedConfig = { ...defaultConfig, ...config };

  // 如果没有提供 stores，使用默认配置
  if (!mergedConfig.stores || mergedConfig.stores.length === 0) {
    mergedConfig.stores = [];
  }

  return new IndexedDBService(mergedConfig);
}

// ============================================================================
// 默认导出
// ============================================================================

export default IndexedDBService;
