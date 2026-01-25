/**
 * 缓存服务实现
 *
 * 提供多层缓存策略：
 * 1. 内存缓存（快速访问）
 * 2. LocalStorage缓存（持久化）
 * 3. IndexedDB缓存（大量数据）
 */

import { ICacheService } from '../intelligentDocumentService';
import type { CacheKey, CacheEntry } from '../../types/mappingSchemaV2';

// ============================================================================
// 缓存配置
// ============================================================================

export interface CacheConfig {
  memory: {
    maxSize: number; // 最大条目数
    ttl: number; // 默认过期时间（秒）
  };
  localStorage: {
    enabled: boolean;
    maxSize: number; // 字节
    ttl: number;
  };
  indexedDB: {
    enabled: boolean;
    dbName: string;
    storeName: string;
  };
  strategy: 'memory' | 'localStorage' | 'indexedDB' | 'hybrid';
}

// ============================================================================
// 内存缓存实现
// ============================================================================

class MemoryCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxSize: number;
  private defaultTTL: number;

  constructor(maxSize: number = 100, defaultTTL: number = 3600) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // 检查是否过期
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // 更新命中次数
    entry.hitCount++;

    return entry as CacheEntry<T>;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    // 检查容量
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const now = Date.now();
    const entry: CacheEntry<T> = {
      key: key as any, // 类型兼容
      value,
      createdAt: now,
      expiresAt: now + (ttl || this.defaultTTL) * 1000,
      hitCount: 0,
      metadata: {
        size: this.estimateSize(value),
        tags: [],
        source: 'memory'
      }
    };

    this.cache.set(key, entry);
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    let lowestHits = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.hitCount < lowestHits || (entry.hitCount === lowestHits && entry.createdAt < oldestTime)) {
        oldestKey = key;
        oldestTime = entry.createdAt;
        lowestHits = entry.hitCount;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  private estimateSize(value: any): number {
    return JSON.stringify(value).length * 2; // 粗略估计（每字符2字节）
  }

  get size(): number {
    return this.cache.size;
  }
}

// ============================================================================
// LocalStorage缓存实现
// ============================================================================

class LocalStorageCache {
  private prefix: string = 'cache_';
  private maxSize: number;
  private defaultTTL: number;

  constructor(maxSize: number = 5 * 1024 * 1024, defaultTTL: number = 3600) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    try {
      const item = localStorage.getItem(this.prefix + key);
      if (!item) {
        return null;
      }

      const entry = JSON.parse(item) as CacheEntry<T>;

      // 检查是否过期
      if (Date.now() > entry.expiresAt) {
        localStorage.removeItem(this.prefix + key);
        return null;
      }

      entry.hitCount++;

      return entry;
    } catch (error) {
      console.error('LocalStorage读取失败:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const now = Date.now();
      const entry: CacheEntry<T> = {
        key: key as any,
        value,
        createdAt: now,
        expiresAt: now + (ttl || this.defaultTTL) * 1000,
        hitCount: 0,
        metadata: {
          size: this.estimateSize(value),
          tags: [],
          source: 'localStorage'
        }
      };

      const serialized = JSON.stringify(entry);

      // 检查容量
      if (serialized.length > this.maxSize) {
        throw new Error('数据过大，无法缓存');
      }

      localStorage.setItem(this.prefix + key, serialized);
    } catch (error) {
      console.error('LocalStorage写入失败:', error);
      // 容量不足时清理过期数据
      await this.cleanup();
      try {
        localStorage.setItem(this.prefix + key, JSON.stringify(value));
      } catch (retryError) {
        console.error('LocalStorage重试写入失败:', retryError);
      }
    }
  }

  async delete(key: string): Promise<boolean> {
    localStorage.removeItem(this.prefix + key);
    return true;
  }

  async clear(): Promise<void> {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key);
      }
    });
  }

  private async cleanup(): Promise<void> {
    const keys = Object.keys(localStorage);
    const now = Date.now();

    for (const key of keys) {
      if (key.startsWith(this.prefix)) {
        try {
          const item = localStorage.getItem(key);
          if (item) {
            const entry = JSON.parse(item);
            if (entry.expiresAt < now) {
              localStorage.removeItem(key);
            }
          }
        } catch {
          // 忽略解析错误
        }
      }
    }
  }

  private estimateSize(value: any): number {
    return JSON.stringify(value).length * 2;
  }
}

// ============================================================================
// IndexedDB缓存实现（简化版）
// ============================================================================

class IndexedDBCache {
  private dbName: string;
  private storeName: string;
  private db: IDBDatabase | null = null;

  constructor(dbName: string, storeName: string) {
    this.dbName = dbName;
    this.storeName = storeName;
  }

  private async init(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName);
          store.createIndex('expiresAt', 'expiresAt', { unique: false });
        }
      };
    });
  }

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    try {
      const db = await this.init();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(key);

        request.onsuccess = () => {
          const entry = request.result as CacheEntry<T>;

          if (!entry) {
            resolve(null);
            return;
          }

          // 检查是否过期
          if (Date.now() > entry.expiresAt) {
            this.delete(key);
            resolve(null);
            return;
          }

          entry.hitCount++;
          resolve(entry);
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('IndexedDB读取失败:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const db = await this.init();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);

        const now = Date.now();
        const entry: CacheEntry<T> = {
          key: key as any,
          value,
          createdAt: now,
          expiresAt: now + (ttl || 3600) * 1000,
          hitCount: 0,
          metadata: {
            size: this.estimateSize(value),
            tags: [],
            source: 'indexedDB'
          }
        };

        const request = store.put(entry, key);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('IndexedDB写入失败:', error);
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const db = await this.init();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(key);

        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('IndexedDB删除失败:', error);
      return false;
    }
  }

  async clear(): Promise<void> {
    try {
      const db = await this.init();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('IndexedDB清空失败:', error);
    }
  }

  private estimateSize(value: any): number {
    return JSON.stringify(value).length * 2;
  }
}

// ============================================================================
// 混合缓存服务实现
// ============================================================================

export class CacheService implements ICacheService {
  private memoryCache: MemoryCache;
  private localStorageCache: LocalStorageCache;
  private indexedDBCache: IndexedDBCache;

  constructor(private readonly config: CacheConfig) {
    this.memoryCache = new MemoryCache(
      config.memory.maxSize,
      config.memory.ttl
    );
    this.localStorageCache = new LocalStorageCache(
      config.localStorage.maxSize,
      config.localStorage.ttl
    );
    this.indexedDBCache = new IndexedDBCache(
      config.indexedDB.dbName,
      config.indexedDB.storeName
    );
  }

  async get<T>(key: CacheKey): Promise<CacheEntry<T> | null> {
    const keyString = this.keyToString(key);

    // 根据策略选择缓存层
    switch (this.config.strategy) {
      case 'memory':
        return await this.memoryCache.get<T>(keyString);

      case 'localStorage':
        return await this.localStorageCache.get<T>(keyString);

      case 'indexedDB':
        return await this.indexedDBCache.get<T>(keyString);

      case 'hybrid':
        // 多层查找：内存 -> localStorage -> indexedDB
        let entry = await this.memoryCache.get<T>(keyString);
        if (entry) return entry;

        if (this.config.localStorage.enabled) {
          entry = await this.localStorageCache.get<T>(keyString);
          if (entry) {
            // 提升到内存缓存
            await this.memoryCache.set(keyString, entry.value);
            return entry;
          }
        }

        if (this.config.indexedDB.enabled) {
          entry = await this.indexedDBCache.get<T>(keyString);
          if (entry) {
            // 提升到上层缓存
            if (this.config.localStorage.enabled) {
              await this.localStorageCache.set(keyString, entry.value);
            }
            await this.memoryCache.set(keyString, entry.value);
            return entry;
          }
        }

        return null;

      default:
        return await this.memoryCache.get<T>(keyString);
    }
  }

  async set<T>(key: CacheKey, value: T, ttl?: number): Promise<void> {
    const keyString = this.keyToString(key);

    // 根据数据大小选择缓存层
    const size = this.estimateSize(value);

    if (size < 1024 * 10) { // < 10KB，使用内存缓存
      await this.memoryCache.set(keyString, value, ttl);
    } else if (size < 1024 * 100) { // < 100KB，使用localStorage
      if (this.config.localStorage.enabled) {
        await this.localStorageCache.set(keyString, value, ttl);
      }
    } else { // >= 100KB，使用IndexedDB
      if (this.config.indexedDB.enabled) {
        await this.indexedDBCache.set(keyString, value, ttl);
      }
    }

    // hybrid模式下，同时缓存到多层
    if (this.config.strategy === 'hybrid') {
      if (size < 1024 * 10 && this.config.localStorage.enabled) {
        await this.localStorageCache.set(keyString, value, ttl);
      }
      if (this.config.indexedDB.enabled) {
        await this.indexedDBCache.set(keyString, value, ttl);
      }
    }
  }

  async delete(key: CacheKey): Promise<boolean> {
    const keyString = this.keyToString(key);

    const results = await Promise.all([
      this.memoryCache.delete(keyString),
      this.config.localStorage.enabled ? this.localStorageCache.delete(keyString) : Promise.resolve(true),
      this.config.indexedDB.enabled ? this.indexedDBCache.delete(keyString) : Promise.resolve(true)
    ]);

    return results.every(r => r);
  }

  async clear(): Promise<void> {
    await Promise.all([
      this.memoryCache.clear(),
      this.config.localStorage.enabled ? this.localStorageCache.clear() : Promise.resolve(),
      this.config.indexedDB.enabled ? this.indexedDBCache.clear() : Promise.resolve()
    ]);
  }

  generateKey(type: CacheKey['type'], content: any): CacheKey {
    // 生成内容哈希
    const hash = this.simpleHash(JSON.stringify(content));

    return {
      type,
      hash,
      version: '2.0'
    };
  }

  // ============================================================================
  // 私有方法
  // ============================================================================

  private keyToString(key: CacheKey): string {
    return `${key.type}:${key.hash}:${key.version}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private estimateSize(value: any): number {
    return JSON.stringify(value).length * 2;
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

export function createCacheService(config?: Partial<CacheConfig>): CacheService {
  const defaultConfig: CacheConfig = {
    memory: {
      maxSize: 100,
      ttl: 3600
    },
    localStorage: {
      enabled: true,
      maxSize: 5 * 1024 * 1024,
      ttl: 3600
    },
    indexedDB: {
      enabled: true,
      dbName: 'ExcelMindCache',
      storeName: 'cache'
    },
    strategy: 'hybrid'
  };

  return new CacheService({ ...defaultConfig, ...config });
}
