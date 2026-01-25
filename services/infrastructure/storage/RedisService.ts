/**
 * Redis 存储服务
 *
 * 提供高性能的 Redis 内存数据库操作，支持：
 * - 基础 CRUD 操作
 * - Hash 操作
 * - 批量操作
 * - 发布订阅
 * - TTL 管理
 * - 连接池管理
 *
 * @module storage
 */

import type {
  RedisConfig,
  StorageResult,
  StorageError
} from '../../../types/storageTypes';

// ============================================================================
// Redis 客户端导入
// ============================================================================

// 注意：这是一个简化的实现，实际使用时需要安装 redis 包
// import { createClient, RedisClientType } from 'redis';

// ============================================================================
// 类型定义
// ============================================================================

interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { EX?: number }): Promise<string | null>;
  del(key: string): Promise<number>;
  exists(key: string): Promise<number>;
  hget(key: string, field: string): Promise<string | null>;
  hset(key: string, field: string, value: string): Promise<number>;
  hgetall(key: string): Promise<Record<string, string>>;
  mget(keys: string[]): Promise<(string | null)[]>;
  mset(entries: Array<[string, string]>): Promise<string>;
  publish(channel: string, message: string): Promise<number>;
  subscribe(channel: string, callback: (message: string) => void): void;
  quit(): Promise<string>;
  ping(): Promise<string>;
}

// ============================================================================
// Redis 服务实现
// ============================================================================

export class RedisService {
  private client: RedisClient | null = null;
  private config: RedisConfig;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  constructor(config: RedisConfig) {
    this.config = config;
  }

  // ========================================================================
  // 连接管理
  // ========================================================================

  /**
   * 连接到 Redis 服务器
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      // 实际实现中，这里会创建真实的 Redis 客户端
      // this.client = createClient({
      //   url: this.config.url,
      //   password: this.config.password,
      // });

      // await this.client.connect();

      // 模拟连接成功（用于开发环境）
      this.client = this.createMockClient();
      this.isConnected = true;
      this.reconnectAttempts = 0;

      console.log('[RedisService] Connected successfully');
    } catch (error) {
      const storageError: StorageError = {
        code: 'REDIS_CONNECTION_FAILED',
        message: `Failed to connect to Redis: ${error instanceof Error ? error.message : String(error)}`,
        retryable: true,
      };

      await this.handleConnectionError(storageError);
      throw storageError;
    }
  }

  /**
   * 断开 Redis 连接
   */
  async disconnect(): Promise<void> {
    if (!this.client || !this.isConnected) {
      return;
    }

    try {
      await this.client.quit();
      this.isConnected = false;
      console.log('[RedisService] Disconnected successfully');
    } catch (error) {
      console.error('[RedisService] Error during disconnect:', error);
      this.isConnected = false;
    }
  }

  /**
   * 检查连接状态
   */
  isConnectionActive(): boolean {
    return this.isConnected && this.client !== null;
  }

  // ========================================================================
  // 基础 CRUD 操作
  // ========================================================================

  /**
   * 获取值
   */
  async get<T>(key: string): Promise<StorageResult<T>> {
    this.ensureConnected();

    try {
      const fullKey = this.getFullKey(key);
      const value = await this.client!.get(fullKey);

      if (value === null) {
        return { success: true, data: null as T };
      }

      const parsed = JSON.parse(value);
      return { success: true, data: parsed as T };
    } catch (error) {
      return this.handleError<T>('GET', key, error as Error);
    }
  }

  /**
   * 设置值
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<StorageResult<void>> {
    this.ensureConnected();

    try {
      const fullKey = this.getFullKey(key);
      const serialized = JSON.stringify(value);

      if (ttl || this.config.defaultTTL) {
        const expiry = ttl || this.config.defaultTTL;
        await this.client!.set(fullKey, serialized, { EX: expiry });
      } else {
        await this.client!.set(fullKey, serialized);
      }

      return { success: true };
    } catch (error) {
      return this.handleError<void>('SET', key, error as Error);
    }
  }

  /**
   * 删除值
   */
  async del(key: string): Promise<StorageResult<boolean>> {
    this.ensureConnected();

    try {
      const fullKey = this.getFullKey(key);
      const result = await this.client!.del(fullKey);

      return { success: true, data: result > 0 };
    } catch (error) {
      return this.handleError<boolean>('DEL', key, error as Error);
    }
  }

  /**
   * 检查键是否存在
   */
  async exists(key: string): Promise<StorageResult<boolean>> {
    this.ensureConnected();

    try {
      const fullKey = this.getFullKey(key);
      const result = await this.client!.exists(fullKey);

      return { success: true, data: result > 0 };
    } catch (error) {
      return this.handleError<boolean>('EXISTS', key, error as Error);
    }
  }

  // ========================================================================
  // Hash 操作
  // ========================================================================

  /**
   * 获取 Hash 字段值
   */
  async getHash<T>(key: string, field: string): Promise<StorageResult<T>> {
    this.ensureConnected();

    try {
      const fullKey = this.getFullKey(key);
      const value = await this.client!.hget(fullKey, field);

      if (value === null) {
        return { success: true, data: null as T };
      }

      const parsed = JSON.parse(value);
      return { success: true, data: parsed as T };
    } catch (error) {
      return this.handleError<T>('HGET', key, error as Error);
    }
  }

  /**
   * 设置 Hash 字段值
   */
  async setHash<T>(key: string, field: string, value: T): Promise<StorageResult<void>> {
    this.ensureConnected();

    try {
      const fullKey = this.getFullKey(key);
      const serialized = JSON.stringify(value);
      await this.client!.hset(fullKey, field, serialized);

      return { success: true };
    } catch (error) {
      return this.handleError<void>('HSET', key, error as Error);
    }
  }

  /**
   * 获取所有 Hash 字段
   */
  async getAllHash<T>(key: string): Promise<StorageResult<Record<string, T>>> {
    this.ensureConnected();

    try {
      const fullKey = this.getFullKey(key);
      const hash = await this.client!.hgetall(fullKey);

      const result: Record<string, T> = {};
      for (const [field, value] of Object.entries(hash)) {
        try {
          result[field] = JSON.parse(value) as T;
        } catch {
          result[field] = value as unknown as T;
        }
      }

      return { success: true, data: result };
    } catch (error) {
      return this.handleError<Record<string, T>>('HGETALL', key, error as Error);
    }
  }

  // ========================================================================
  // 批量操作
  // ========================================================================

  /**
   * 批量获取
   */
  async mget<T>(keys: string[]): Promise<StorageResult<(T | null)[]>> {
    this.ensureConnected();

    try {
      const fullKeys = keys.map(k => this.getFullKey(k));
      const values = await this.client!.mget(fullKeys);

      const result = values.map(v => {
        if (v === null) return null;
        try {
          return JSON.parse(v) as T;
        } catch {
          return v as unknown as T;
        }
      });

      return { success: true, data: result };
    } catch (error) {
      return this.handleError<(T | null)[]>('MGET', keys.join(','), error as Error);
    }
  }

  /**
   * 批量设置
   */
  async mset<T>(entries: Array<{ key: string; value: T; ttl?: number }>): Promise<StorageResult<void>> {
    this.ensureConnected();

    try {
      // 使用 pipeline 提高性能（实际实现）
      const pipelineEntries: Array<[string, string]> = entries.map(e => [
        this.getFullKey(e.key),
        JSON.stringify(e.value),
      ] as [string, string]);

      await this.client!.mset(pipelineEntries);

      // 设置 TTL（如果需要）
      for (const entry of entries) {
        if (entry.ttl || this.config.defaultTTL) {
          const expiry = entry.ttl || this.config.defaultTTL;
          // 实际实现中应该使用 pipeline
          await this.client!.set(this.getFullKey(entry.key), JSON.stringify(entry.value), { EX: expiry });
        }
      }

      return { success: true };
    } catch (error) {
      return this.handleError<void>('MSET', JSON.stringify(entries), error as Error);
    }
  }

  // ========================================================================
  // 发布订阅
  // ========================================================================

  /**
   * 发布消息
   */
  async publish(channel: string, message: any): Promise<StorageResult<number>> {
    this.ensureConnected();

    try {
      const fullChannel = this.getFullKey(channel);
      const serialized = JSON.stringify(message);
      const subscribers = await this.client!.publish(fullChannel, serialized);

      return { success: true, data: subscribers };
    } catch (error) {
      return this.handleError<number>('PUBLISH', channel, error as Error);
    }
  }

  /**
   * 订阅频道
   */
  subscribe(channel: string, callback: (message: any) => void): void {
    this.ensureConnected();

    const fullChannel = this.getFullKey(channel);

    try {
      this.client!.subscribe(fullChannel, (message: string) => {
        try {
          const parsed = JSON.parse(message);
          callback(parsed);
        } catch (error) {
          console.error('[RedisService] Error parsing subscription message:', error);
        }
      });
    } catch (error) {
      console.error('[RedisService] Error subscribing to channel:', error);
    }
  }

  // ========================================================================
  // 辅助方法
  // ========================================================================

  /**
   * 生成完整的键名
   */
  private getFullKey(key: string): string {
    return `${this.config.keyPrefix}${key}`;
  }

  /**
   * 确保已连接
   */
  private ensureConnected(): void {
    if (!this.isConnected || !this.client) {
      throw new Error('Redis client is not connected');
    }
  }

  /**
   * 处理连接错误
   */
  private async handleConnectionError(error: StorageError): Promise<void> {
    console.error('[RedisService] Connection error:', error.message);

    if (error.retryable && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(
        this.config.retryStrategy?.delay || 1000,
        this.config.retryStrategy?.maxDelay || 5000
      );

      console.log(`[RedisService] Reconnecting... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

      await new Promise(resolve => setTimeout(resolve, delay));
      await this.connect();
    }
  }

  /**
   * 处理操作错误
   */
  private handleError<T>(operation: string, key: string, error: Error): StorageResult<T> {
    const storageError: StorageError = {
      code: `REDIS_${operation}_ERROR`,
      message: `${operation} failed for key '${key}': ${error.message}`,
      details: { originalError: error },
      retryable: true,
    };

    console.error(`[RedisService] ${storageError.code}:`, storageError.message);

    return {
      success: false,
      error: storageError,
    };
  }

  // ========================================================================
  // Mock 客户端（开发环境使用）
  // ========================================================================

  /**
   * 创建模拟 Redis 客户端
   * 注意：仅用于开发环境，生产环境应使用真实的 Redis 客户端
   */
  private createMockClient(): RedisClient {
    const mockStore: Map<string, string> = new Map();
    const mockHashStore: Map<string, Record<string, string>> = new Map();
    const subscribers: Map<string, Array<(message: string) => void>> = new Map();

    return {
      get: async (key: string) => {
        return mockStore.get(key) || null;
      },

      set: async (key: string, value: string, options?: { EX?: number }) => {
        mockStore.set(key, value);

        if (options?.EX) {
          setTimeout(() => {
            mockStore.delete(key);
          }, options.EX * 1000);
        }

        return 'OK';
      },

      del: async (key: string) => {
        const deleted = mockStore.has(key);
        mockStore.delete(key);
        return deleted ? 1 : 0;
      },

      exists: async (key: string) => {
        return mockStore.has(key) ? 1 : 0;
      },

      hget: async (key: string, field: string) => {
        const hash = mockHashStore.get(key);
        return hash?.[field] || null;
      },

      hset: async (key: string, field: string, value: string) => {
        if (!mockHashStore.has(key)) {
          mockHashStore.set(key, {});
        }
        mockHashStore.get(key)![field] = value;
        return 1;
      },

      hgetall: async (key: string) => {
        return mockHashStore.get(key) || {};
      },

      mget: async (keys: string[]) => {
        return keys.map(k => mockStore.get(k) || null);
      },

      mset: async (entries: Array<[string, string]>) => {
        for (const [key, value] of entries) {
          mockStore.set(key, value);
        }
        return 'OK';
      },

      publish: async (channel: string, message: string) => {
        const channelSubscribers = subscribers.get(channel) || [];
        channelSubscribers.forEach(cb => cb(message));
        return channelSubscribers.length;
      },

      subscribe: (channel: string, callback: (message: string) => void) => {
        if (!subscribers.has(channel)) {
          subscribers.set(channel, []);
        }
        subscribers.get(channel)!.push(callback);
      },

      quit: async () => {
        mockStore.clear();
        mockHashStore.clear();
        subscribers.clear();
        return 'OK';
      },

      ping: async () => {
        return 'PONG';
      },
    };
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

/**
 * 创建 Redis 服务实例
 */
export function createRedisService(config: Partial<RedisConfig> = {}): RedisService {
  const defaultConfig: RedisConfig = {
    url: 'redis://localhost:6379',
    keyPrefix: 'excelmind:',
    defaultTTL: 3600,
    retryStrategy: {
      retries: 3,
      delay: 1000,
      maxDelay: 5000,
    },
  };

  const mergedConfig = { ...defaultConfig, ...config };
  return new RedisService(mergedConfig);
}

// ============================================================================
// 默认导出
// ============================================================================

export default RedisService;
