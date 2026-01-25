/**
 * Phase 2 存储服务类型定义
 *
 * 定义统一的存储服务接口，支持多种存储后端：
 * - LocalStorage (简单键值对)
 * - IndexedDB (大数据存储)
 * - MemoryCache (高性能内存缓存)
 *
 * @module storage
 * @version 2.0.0
 */

// ============================================================================
// 核心接口定义
// ============================================================================

/**
 * 存储选项
 */
export interface StorageOptions {
  /** 过期时间（秒） */
  ttl?: number;
  /** 命名空间，用于隔离不同模块的数据 */
  namespace?: string;
  /** 是否序列化（默认true） */
  serialize?: boolean;
  /** 自定义元数据 */
  metadata?: Record<string, any>;
}

/**
 * 存储项元数据
 */
export interface StoredItem<T> {
  /** 存储的值 */
  value: T;
  /** 创建时间戳 */
  timestamp: number;
  /** 过期时间戳（可选） */
  expiresAt?: number;
  /** 访问次数 */
  hitCount?: number;
  /** 最后访问时间 */
  lastAccessedAt?: number;
  /** 数据大小（字节） */
  size?: number;
  /** 自定义元数据 */
  metadata?: Record<string, any>;
}

/**
 * 存储服务接口
 *
 * 所有存储实现必须遵循此接口
 */
export interface IStorageService {
  /**
   * 获取值
   * @param key - 存储键
   * @returns 存储的值或null
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * 设置值
   * @param key - 存储键
   * @param value - 要存储的值
   * @param options - 存储选项
   */
  set<T>(key: string, value: T, options?: StorageOptions): Promise<void>;

  /**
   * 删除值
   * @param key - 存储键
   */
  delete(key: string): Promise<void>;

  /**
   * 检查键是否存在
   * @param key - 存储键
   */
  exists(key: string): Promise<boolean>;

  /**
   * 获取所有键（支持模式匹配）
   * @param pattern - 键模式（如 "user:*"）
   */
  keys(pattern?: string): Promise<string[]>;

  /**
   * 清空存储
   * @param namespace - 可选的命名空间，如果提供则只清空该命名空间
   */
  clear(namespace?: string): Promise<void>;

  /**
   * 获取值及其元数据
   * @param key - 存储键
   */
  getWithMetadata<T>(key: string): Promise<StoredItem<T> | null>;

  /**
   * 批量设置值
   * @param items - 键值对数组
   * @param options - 存储选项
   */
  batchSet<T>(items: Array<{ key: string; value: T }>, options?: StorageOptions): Promise<void>;

  /**
   * 批量获取值
   * @param keys - 存储键数组
   */
  batchGet<T>(keys: string[]): Promise<Map<string, T>>;

  /**
   * 获取存储统计信息
   */
  getStats?(): Promise<StorageStats>;
}

/**
 * 存储统计信息
 */
export interface StorageStats {
  /** 存储类型 */
  type: StorageType;
  /** 总条目数 */
  totalEntries: number;
  /** 总大小（字节） */
  totalSize: number;
  /** 命中率 */
  hitRate?: number;
  /** 命中次数 */
  hits?: number;
  /** 未命中次数 */
  misses?: number;
  /** 过期条目数 */
  expiredEntries?: number;
}

/**
 * 存储类型枚举
 */
export enum StorageType {
  MEMORY = 'memory',
  LOCAL_STORAGE = 'localStorage',
  INDEXED_DB = 'indexedDB',
  REDIS = 'redis',
  CUSTOM = 'custom'
}

/**
 * 存储服务配置
 */
export interface StorageConfig {
  /** 存储类型 */
  type: StorageType;
  /** 命名空间前缀 */
  namespacePrefix?: string;
  /** 默认TTL（秒） */
  defaultTTL?: number;
  /** 最大容量（字节） */
  maxSize?: number;
  /** 是否启用压缩 */
  compression?: boolean;
  /** 存储特定配置 */
  config?: Record<string, any>;
}

// ============================================================================
// LocalStorage 配置
// ============================================================================

/**
 * LocalStorage 配置
 */
export interface LocalStorageConfig extends StorageConfig {
  type: StorageType.LOCAL_STORAGE;
  /** 存储前缀 */
  prefix?: string;
  /** 错误时是否降级到内存 */
  fallbackToMemory?: boolean;
}

// ============================================================================
// IndexedDB 配置
// ============================================================================

/**
 * IndexedDB 存储配置
 */
export interface IndexedDBStoreConfig {
  /** 存储名称 */
  name: string;
  /** 主键路径 */
  keyPath: string;
  /** 是否自增 */
  autoIncrement?: boolean;
  /** 索引配置 */
  indexes?: Array<{
    name: string;
    keyPath: string | string[];
    options?: IDBIndexParameters;
  }>;
}

/**
 * IndexedDB 配置
 */
export interface IndexedDBConfig extends StorageConfig {
  type: StorageType.INDEXED_DB;
  /** 数据库名称 */
  dbName: string;
  /** 数据库版本 */
  version: number;
  /** 存储配置 */
  stores: IndexedDBStoreConfig[];
}

// ============================================================================
// 内存缓存配置
// ============================================================================

/**
 * LRU缓存配置
 */
export interface MemoryCacheConfig extends StorageConfig {
  type: StorageType.MEMORY;
  /** 最大条目数 */
  maxEntries: number;
  /** 淘汰策略 */
  evictionPolicy: 'lru' | 'lfu' | 'fifo';
  /** 是否启用统计 */
  enableStats?: boolean;
}

// ============================================================================
// 存储服务工厂配置
// ============================================================================

/**
 * 存储服务工厂配置
 */
export interface StorageFactoryConfig {
  /** 首选存储类型 */
  preferred: StorageType;
  /** 降级链（按优先级排序） */
  fallbackChain: StorageType[];
  /** 各存储类型的配置 */
  configs: Partial<Record<StorageType, StorageConfig>>;
  /** 是否启用自动降级 */
  enableAutoFallback?: boolean;
  /** 健康检查间隔（毫秒） */
  healthCheckInterval?: number;
}

// ============================================================================
// 错误类型
// ============================================================================

/**
 * 存储错误基类
 */
export class StorageError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'StorageError';
    Object.setPrototypeOf(this, StorageError.prototype);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      retryable: this.retryable,
      details: this.details
    };
  }
}

/**
 * 存储未找到错误
 */
export class StorageNotFoundError extends StorageError {
  constructor(key: string) {
    super(
      `Key not found: ${key}`,
      'STORAGE_NOT_FOUND',
      false,
      { key }
    );
    this.name = 'StorageNotFoundError';
    Object.setPrototypeOf(this, StorageNotFoundError.prototype);
  }
}

/**
 * 存储容量错误
 */
export class StorageCapacityError extends StorageError {
  constructor(required: number, available: number) {
    super(
      `Storage capacity exceeded. Required: ${required}, Available: ${available}`,
      'STORAGE_CAPACITY_EXCEEDED',
      false,
      { required, available }
    );
    this.name = 'StorageCapacityError';
    Object.setPrototypeOf(this, StorageCapacityError.prototype);
  }
}

/**
 * 存储序列化错误
 */
export class StorageSerializationError extends StorageError {
  constructor(value: any, error: Error) {
    super(
      `Failed to serialize value: ${error.message}`,
      'STORAGE_SERIALIZATION_ERROR',
      false,
      { valueType: typeof value, originalError: error.message }
    );
    this.name = 'StorageSerializationError';
    Object.setPrototypeOf(this, StorageSerializationError.prototype);
  }
}

// ============================================================================
// 存储事件
// ============================================================================

/**
 * 存储事件类型
 */
export type StorageEventType = 'set' | 'delete' | 'clear' | 'expire';

/**
 * 存储事件
 */
export interface StorageEventPayload {
  /** 事件类型 */
  type: StorageEventType;
  /** 受影响的键 */
  key: string;
  /** 时间戳 */
  timestamp: number;
  /** 事件源 */
  source: 'local' | 'remote';
  /** 命名空间 */
  namespace?: string;
}

/**
 * 存储事件监听器
 */
export type StorageEventListener = (event: StorageEventPayload) => void;

// ============================================================================
// 工具类型
// ============================================================================

/**
 * 序列化函数类型
 */
export type Serializer<T> = (value: T) => string;

/**
 * 反序列化函数类型
 */
export type Deserializer<T> = (value: string) => T;

/**
 * 默认序列化器
 */
export const defaultSerializer: Serializer<any> = (value): string => {
  try {
    return JSON.stringify(value);
  } catch (error) {
    throw new StorageSerializationError(value, error as Error);
  }
};

/**
 * 默认反序列化器
 */
export const defaultDeserializer: Deserializer<any> = (value): any => {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new StorageSerializationError(value, error as Error);
  }
};

// ============================================================================
// 导出所有类型
// ============================================================================

// 所有类型已在定义时导出，无需重复导出
