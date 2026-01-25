/**
 * 外部化状态存储 - 配置文件
 *
 * 集中管理 Redis 和 IndexedDB 的配置参数
 *
 * @module config
 */

import type { RedisConfig, IDBConfig, SyncConfig } from '../types/storageTypes';

// ============================================================================
// Redis 配置
// ============================================================================

export const redisConfig: RedisConfig = {
  // Redis 连接 URL
  // 开发环境使用本地 Redis，生产环境应使用环境变量
  url: process.env.REDIS_URL || 'redis://localhost:6379',

  // Redis 密码（如果需要）
  password: process.env.REDIS_PASSWORD,

  // 键前缀，用于隔离不同应用的数据
  keyPrefix: 'excelmind:',

  // 默认过期时间（秒）- 1小时
  defaultTTL: 3600,

  // 重试策略
  retryStrategy: {
    retries: 3,
    delay: 1000,
    maxDelay: 5000,
  },
};

// ============================================================================
// IndexedDB 配置
// ============================================================================

export const indexedDBConfig: IDBConfig = {
  // 数据库名称
  dbName: 'ExcelMindDB',

  // 数据库版本
  version: 1,

  // 存储对象（表）定义
  stores: [
    // 执行状态存储
    {
      name: 'executions',
      keyPath: 'id',
      autoIncrement: false,
      indexes: [
        { name: 'sessionId', keyPath: 'sessionId', options: { unique: false } },
        { name: 'timestamp', keyPath: 'timestamp', options: { unique: false } },
        { name: 'status', keyPath: 'status', options: { unique: false } },
        { name: 'expiry', keyPath: 'expiry', options: { unique: false } },
      ],
    },

    // 用户设置存储
    {
      name: 'settings',
      keyPath: 'userId',
      autoIncrement: false,
      indexes: [
        { name: 'lastUpdated', keyPath: 'lastUpdated', options: { unique: false } },
      ],
    },

    // 缓存数据存储
    {
      name: 'cache',
      keyPath: 'key',
      autoIncrement: false,
      indexes: [
        { name: 'expiry', keyPath: 'expiry', options: { unique: false } },
        { name: 'accessedAt', keyPath: 'accessedAt', options: { unique: false } },
      ],
    },

    // 会话信息存储
    {
      name: 'sessions',
      keyPath: 'sessionId',
      autoIncrement: false,
      indexes: [
        { name: 'lastActivity', keyPath: 'lastActivity', options: { unique: false } },
        { name: 'userId', keyPath: 'userId', options: { unique: false } },
      ],
    },

    // 临时数据存储
    {
      name: 'temporary',
      keyPath: 'key',
      autoIncrement: false,
      indexes: [
        { name: 'expiry', keyPath: 'expiry', options: { unique: false } },
      ],
    },
  ],
};

// ============================================================================
// 同步配置
// ============================================================================

export const syncConfig: SyncConfig = {
  // 同步间隔（毫秒）- 5秒
  interval: 5000,

  // 批量操作大小
  batchSize: 100,

  // 最大重试次数
  maxRetries: 3,

  // 冲突解决策略
  conflictResolution: 'merge',
};

// ============================================================================
// 存储配置统一导出
// ============================================================================

export const storageConfig = {
  redis: redisConfig,
  indexedDB: indexedDBConfig,
  sync: syncConfig,

  // 存储容量限制
  limits: {
    // IndexedDB 最大存储大小（字节）- 约 50MB
    maxIndexedDBSize: 50 * 1024 * 1024,

    // 单个值最大大小（字节）- 约 1MB
    maxValueSize: 1024 * 1024,

    // 最大缓存条目数
    maxCacheEntries: 1000,

    // 最大会话数
    maxSessions: 100,
  },

  // 清理配置
  cleanup: {
    // 自动清理间隔（毫秒）- 10分钟
    interval: 10 * 60 * 1000,

    // 过期数据保留时间（毫秒）- 1小时
    expiryGracePeriod: 60 * 60 * 1000,

    // 是否启用自动清理
    enabled: true,
  },

  // 性能配置
  performance: {
    // 是否启用压缩（大型数据）
    enableCompression: true,

    // 压缩阈值（字节）- 超过此大小的数据将被压缩
    compressionThreshold: 10240,

    // 是否启用批量操作
    enableBatching: true,

    // 批量操作超时（毫秒）
    batchTimeout: 5000,
  },
};

// ============================================================================
// 导出类型
// ============================================================================

export type StorageConfig = typeof storageConfig;

// ============================================================================
// 默认导出
// ============================================================================

export default storageConfig;
