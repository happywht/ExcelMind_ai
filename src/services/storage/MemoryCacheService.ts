/**
 * 内存缓存存储服务实现
 *
 * 提供基于内存的高性能缓存，支持：
 * - LRU 淘汰策略
 * - TTL 自动过期
 * - 容量限制
 * - 访问统计
 * - 高性能读写
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
  MemoryCacheConfig,
  StorageEventPayload,
  StorageEventListener
} from '../../types/storage';

import {
  StorageError,
  StorageNotFoundError
} from '../../types/storage';

// ============================================================================
// LRU 缓存节点
// ============================================================================

/**
 * LRU 缓存节点
 */
interface CacheNode<T> {
  key: string;
  item: StoredItem<T>;
  prev: CacheNode<T> | null;
  next: CacheNode<T> | null;
}

// ============================================================================
// 内存缓存存储服务实现
// ============================================================================

/**
 * 内存缓存存储服务
 *
 * 特性：
 * - O(1) 时间复杂度的 get/set 操作
 * - LRU 淘汰策略
 * - 自动过期清理
 * - 内存使用监控
 * - 统计信息收集
 */
export class MemoryCacheService implements IStorageService {
  private readonly cache: Map<string, CacheNode<any>>;
  private readonly namespacePrefix: string;
  private readonly maxEntries: number;
  private readonly defaultTTL: number;
  private readonly evictionPolicy: 'lru' | 'lfu' | 'fifo';
  private readonly enableStats: boolean;
  private readonly listeners: Set<StorageEventListener>;

  // LRU 双向链表
  private head: CacheNode<any> | null = null;
  private tail: CacheNode<any> | null = null;

  // 统计信息
  private stats = {
    hits: 0,
    misses: 0,
    totalWrites: 0,
    totalDeletes: 0,
    evictions: 0,
    expirations: 0
  };

  // 过期清理定时器
  private cleanupTimer: NodeJS.Timeout | null = null;
  private readonly cleanupInterval: number = 60000; // 1分钟

  // 内存限制
  private readonly maxMemory: number; // 最大内存使用（字节）
  private readonly memoryWarningThreshold: number; // 内存警告阈值

  constructor(config: MemoryCacheConfig) {
    this.cache = new Map();
    this.namespacePrefix = config.namespacePrefix || '';
    this.maxEntries = config.maxEntries || 1000;
    this.defaultTTL = config.defaultTTL || 3600; // 默认1小时
    this.evictionPolicy = config.evictionPolicy || 'lru';
    this.enableStats = config.enableStats ?? true;
    this.listeners = new Set();

    // 设置内存限制（默认100MB）
    this.maxMemory = config.maxMemory || 100 * 1024 * 1024;
    this.memoryWarningThreshold = this.maxMemory * 0.8; // 80%阈值

    // 启动过期清理定时器
    this.startCleanupTimer();

    console.log('[MemoryCache] 初始化完成', {
      maxEntries: this.maxEntries,
      maxMemory: `${Math.round(this.maxMemory / 1024 / 1024)}MB`,
      evictionPolicy: this.evictionPolicy
    });
  }

  // ========================================================================
  // 核心存储操作
  // ========================================================================

  /**
   * 获取值
   */
  async get<T>(key: string): Promise<T | null> {
    const fullKey = this.buildKey(key);
    const node = this.cache.get(fullKey);

    if (!node) {
      this.stats.misses++;
      return null;
    }

    // 检查是否过期
    if (this.isExpired(node.item)) {
      this.deleteInternal(fullKey, node);
      this.stats.expirations++;
      this.stats.misses++;
      return null;
    }

    // 更新访问信息
    node.item.hitCount = (node.item.hitCount || 0) + 1;
    node.item.lastAccessedAt = Date.now();

    // LRU: 移动到链表头部
    if (this.evictionPolicy === 'lru') {
      this.moveToHead(node);
    }

    this.stats.hits++;
    return node.item.value as T;
  }

  /**
   * 设置值
   */
  async set<T>(key: string, value: T, options?: StorageOptions): Promise<void> {
    const fullKey = this.buildKey(key, options?.namespace);
    const now = Date.now();
    const ttl = options?.ttl ?? this.defaultTTL;

    const item: StoredItem<T> = {
      value,
      timestamp: now,
      hitCount: 0,
      lastAccessedAt: now,
      metadata: options?.metadata
    };

    if (ttl > 0) {
      item.expiresAt = now + ttl * 1000;
    }

    // 估算大小
    item.size = this.estimateSize(value);

    // 检查是否需要淘汰
    if (this.cache.size >= this.maxEntries && !this.cache.has(fullKey)) {
      this.evict();
    }

    // 创建或更新节点
    let node = this.cache.get(fullKey);

    if (node) {
      // 更新现有节点
      node.item = item;
      this.moveToHead(node);
    } else {
      // 创建新节点
      node = {
        key: fullKey,
        item,
        prev: null,
        next: null
      };

      this.cache.set(fullKey, node);
      this.addToHead(node);
    }

    this.stats.totalWrites++;

    // 触发事件
    this.notifyListeners({
      type: 'set',
      key,
      timestamp: now,
      source: 'local',
      namespace: options?.namespace
    });
  }

  /**
   * 删除值
   */
  async delete(key: string): Promise<void> {
    const fullKey = this.buildKey(key);
    const node = this.cache.get(fullKey);

    if (node) {
      this.deleteInternal(fullKey, node);
      this.stats.totalDeletes++;

      // 触发事件
      this.notifyListeners({
        type: 'delete',
        key,
        timestamp: Date.now(),
        source: 'local'
      });
    }
  }

  /**
   * 检查键是否存在
   */
  async exists(key: string): Promise<boolean> {
    const fullKey = this.buildKey(key);
    const node = this.cache.get(fullKey);

    if (!node) {
      return false;
    }

    // 检查是否过期
    if (this.isExpired(node.item)) {
      this.deleteInternal(fullKey, node);
      return false;
    }

    return true;
  }

  /**
   * 获取所有键（支持模式匹配）
   */
  async keys(pattern?: string): Promise<string[]> {
    const result: string[] = [];
    const now = Date.now();

    for (const [fullKey, node] of this.cache.entries()) {
      // 检查是否过期
      if (this.isExpired(node.item)) {
        continue;
      }

      // 提取原始键
      const originalKey = this.extractKey(fullKey);

      // 模式匹配
      if (pattern && !this.matchPattern(originalKey, pattern)) {
        continue;
      }

      result.push(originalKey);
    }

    return result;
  }

  /**
   * 清空存储
   */
  async clear(namespace?: string): Promise<void> {
    if (namespace) {
      // 只清空指定命名空间
      const keysToDelete: string[] = [];

      for (const [fullKey, node] of this.cache.entries()) {
        if (fullKey.startsWith(`${this.namespacePrefix}${namespace}:`)) {
          keysToDelete.push(fullKey);
        }
      }

      keysToDelete.forEach(key => {
        const node = this.cache.get(key);
        if (node) {
          this.deleteInternal(key, node);
        }
      });
    } else {
      // 清空所有
      this.cache.clear();
      this.head = null;
      this.tail = null;
    }

    // 触发事件
    this.notifyListeners({
      type: 'clear',
      key: namespace || 'all',
      timestamp: Date.now(),
      source: 'local',
      namespace
    });
  }

  /**
   * 获取值及其元数据
   */
  async getWithMetadata<T>(key: string): Promise<StoredItem<T> | null> {
    const fullKey = this.buildKey(key);
    const node = this.cache.get(fullKey);

    if (!node) {
      return null;
    }

    if (this.isExpired(node.item)) {
      this.deleteInternal(fullKey, node);
      return null;
    }

    // 更新访问信息
    node.item.lastAccessedAt = Date.now();

    return node.item as StoredItem<T>;
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
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;

    let totalSize = 0;
    const nodes = Array.from(this.cache.values());
    for (const node of nodes) {
      totalSize += node.item.size || 0;
    }

    return {
      type: StorageType.MEMORY,
      totalEntries: this.cache.size,
      totalSize,
      hitRate,
      hits: this.stats.hits,
      misses: this.stats.misses,
      expiredEntries: this.stats.expirations
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
  // LRU 链表操作
  // ========================================================================

  /**
   * 添加节点到链表头部
   */
  private addToHead<T>(node: CacheNode<T>): void {
    node.prev = null;
    node.next = this.head;

    if (this.head) {
      this.head.prev = node;
    }

    this.head = node;

    if (!this.tail) {
      this.tail = node;
    }
  }

  /**
   * 移除节点
   */
  private removeNode<T>(node: CacheNode<T>): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }

  /**
   * 移动节点到头部
   */
  private moveToHead<T>(node: CacheNode<T>): void {
    this.removeNode(node);
    this.addToHead(node);
  }

  /**
   * 淘汰最少使用的项
   */
  private evict(): void {
    if (!this.tail) {
      return;
    }

    const evictedKey = this.tail.key;

    switch (this.evictionPolicy) {
      case 'lru':
        // LRU: 淘汰链表尾部节点
        this.removeNode(this.tail);
        this.cache.delete(evictedKey);
        break;

      case 'lfu':
        // LFU: 淘汰命中次数最少的节点
        this.evictLFU();
        break;

      case 'fifo':
        // FIFO: 淘汰最早创建的节点
        this.evictFIFO();
        break;
    }

    this.stats.evictions++;
  }

  /**
   * LFU 淘汰策略
   */
  private evictLFU(): void {
    let minHits = Infinity;
    let minNode: CacheNode<any> | null = null;

    const nodes = Array.from(this.cache.values());
    for (const node of nodes) {
      if ((node.item.hitCount || 0) < minHits) {
        minHits = node.item.hitCount || 0;
        minNode = node;
      }
    }

    if (minNode) {
      this.removeNode(minNode);
      this.cache.delete(minNode.key);
    }
  }

  /**
   * FIFO 淘汰策略
   */
  private evictFIFO(): void {
    if (this.tail) {
      const oldestNode = this.tail;
      this.removeNode(oldestNode);
      this.cache.delete(oldestNode.key);
    }
  }

  // ========================================================================
  // 私有辅助方法
  // ========================================================================

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
   * 估算数据大小
   */
  private estimateSize(value: any): number {
    try {
      return JSON.stringify(value).length * 2; // 粗略估计，每字符2字节
    } catch {
      return 0;
    }
  }

  /**
   * 删除节点（内部方法）
   */
  private deleteInternal(fullKey: string, node: CacheNode<any>): void {
    this.removeNode(node);
    this.cache.delete(fullKey);
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
   * 启动过期清理定时器
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * 清理过期数据
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    const entries = Array.from(this.cache.entries());
    for (const [fullKey, node] of entries) {
      if (node.item.expiresAt && now > node.item.expiresAt) {
        keysToDelete.push(fullKey);
      }
    }

    keysToDelete.forEach(key => {
      const node = this.cache.get(key);
      if (node) {
        this.deleteInternal(key, node);
        this.stats.expirations++;
      }
    });

    // 检查内存使用
    const memoryUsage = this.estimateMemoryUsage();
    if (memoryUsage > this.memoryWarningThreshold) {
      console.warn(`[MemoryCache] 内存使用 ${Math.round(memoryUsage / 1024 / 1024)}MB 超过阈值 ${Math.round(this.memoryWarningThreshold / 1024 / 1024)}MB`);

      // 如果超过最大内存限制，强制淘汰
      if (memoryUsage > this.maxMemory) {
        console.warn(`[MemoryCache] 内存使用超过限制，执行强制淘汰`);
        this.forceEvict();
      }
    }
  }

  /**
   * 估算内存使用
   */
  private estimateMemoryUsage(): number {
    let size = 0;
    for (const [, node] of this.cache.entries()) {
      size += node.item.size || 0;
    }
    return size;
  }

  /**
   * 强制淘汰（直到内存使用低于阈值）
   */
  private forceEvict(): void {
    const targetSize = this.maxMemory * 0.7; // 目标：降低到70%
    let evicted = 0;

    while (this.estimateMemoryUsage() > targetSize && this.tail) {
      this.evict();
      evicted++;
    }

    console.log(`[MemoryCache] 强制淘汰完成: 移除 ${evicted} 个条目`);
  }

  /**
   * 通知事件监听器
   */
  private notifyListeners(event: StorageEventPayload): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[MemoryCacheService] Error in event listener:', error);
      }
    });
  }

  /**
   * 销毁服务
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    this.cache.clear();
    this.head = null;
    this.tail = null;
    this.listeners.clear();
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

/**
 * 创建内存缓存服务实例
 */
export function createMemoryCacheService(config?: Partial<MemoryCacheConfig>): MemoryCacheService {
  const defaultConfig: MemoryCacheConfig = {
    type: 'memory',
    namespacePrefix: '',
    defaultTTL: 3600,
    maxEntries: 1000,
    evictionPolicy: 'lru',
    enableStats: true
  };

  const mergedConfig = { ...defaultConfig, ...config } as MemoryCacheConfig;

  return new MemoryCacheService(mergedConfig);
}

// ============================================================================
// 默认导出
// ============================================================================

export default MemoryCacheService;
