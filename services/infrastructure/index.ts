/**
 * 基础设施服务模块
 *
 * 提供缓存、事件总线、重试策略和状态存储等核心基础设施服务
 *
 * @module infrastructure
 */

// ============================================================================
// 缓存服务
// ============================================================================

export {
  CacheService,
  createCacheService
} from './cacheService';

export type {
  CacheConfig
} from './cacheService';

// ============================================================================
// 事件总线
// ============================================================================

export {
  EventBus,
  TypedEventBus,
  EventAggregator,
  EventFilter,
  EventType,
  createEventBus,
  createTypedEventBus
} from './eventBus';

export type {
  EventHandler,
  EventSubscription,
  TypedEventMap
} from './eventBus';

// ============================================================================
// 重试服务
// ============================================================================

export {
  RetryStrategy,
  RetryStrategyType,
  FallbackStrategy,
  RetryStrategies,
  FallbackStrategies,
  ResilienceStrategy,
  createResilienceStrategy
} from './retryService';

export type {
  RetryStrategyConfig,
  FallbackEntry
} from './retryService';

// ============================================================================
// 存储服务
// ============================================================================

export {
  RedisService,
  StateManager,
  IndexedDBService,
  ClientStateManager,
  SyncService,
  createRedisService,
  createStateManager,
  createIndexedDBService,
  createClientStateManager,
  createSyncService,
} from './storage';

export type {
  RedisConfig,
  IDBConfig,
  StateSnapshot,
  ExecutionState,
  UserSettings,
  TemporaryData,
  StorageOperation,
  StorageResult,
  StorageError,
  SyncConfig,
  SyncResult,
  SyncConflict,
  SessionInfo,
  SessionData,
  CacheEntry,
  CacheStats,
  StorageEvent,
  StateChangeEvent,
  BatchOperation,
  BatchResult,
  StorageStats,
} from '../../types/storageTypes';

// ============================================================================
// 工厂函数（便捷创建）
// ============================================================================

import { createCacheService } from './cacheService';
import { createTypedEventBus } from './eventBus';
import { createResilienceStrategy } from './retryService';
import { createStorageSystem, createBackendStorageSystem, createFrontendStorageSystem } from './storage';

/**
 * 创建完整的基础设施服务套件
 *
 * @example
 * ```typescript
 * const infrastructure = createInfrastructure({
 *   cache: { strategy: 'hybrid' },
 *   eventBus: { maxHistorySize: 1000 },
 *   retry: { maxRetries: 3, initialDelay: 1000 }
 * });
 * ```
 */
export interface InfrastructureConfig {
  cache?: {
    strategy?: 'memory' | 'localStorage' | 'indexedDB' | 'hybrid';
    maxSize?: number;
    ttl?: number;
  };
  eventBus?: {
    maxHistorySize?: number;
  };
  retry?: {
    maxRetries?: number;
    initialDelay?: number;
    enableJitter?: boolean;
  };
}

export interface InfrastructureServices {
  cache: ReturnType<typeof createCacheService>;
  eventBus: ReturnType<typeof createTypedEventBus>;
  retry: ReturnType<typeof createResilienceStrategy>;
  storage?: Awaited<ReturnType<typeof createStorageSystem>>;
}

export function createInfrastructure(
  config?: InfrastructureConfig
): InfrastructureServices {
  return {
    cache: createCacheService({
      strategy: config?.cache?.strategy || 'hybrid',
      memory: {
        maxSize: config?.cache?.maxSize || 100,
        ttl: config?.cache?.ttl || 300
      },
      localStorage: {
        enabled: true,
        maxSize: 5 * 1024 * 1024,
        ttl: config?.cache?.ttl || 3600
      },
      indexedDB: {
        enabled: true,
        dbName: 'ExcelMindCache',
        storeName: 'cache'
      }
    }),
    eventBus: createTypedEventBus({
      maxHistorySize: config?.eventBus?.maxHistorySize || 1000
    }),
    retry: createResilienceStrategy({
      maxRetries: config?.retry?.maxRetries || 3,
      initialDelay: config?.retry?.initialDelay || 1000,
      jitter: config?.retry?.enableJitter !== false
    })
  };
}

// ============================================================================
// 默认导出
// ============================================================================

export default {
  createInfrastructure,
  createCacheService,
  createTypedEventBus,
  createResilienceStrategy,
  createStorageSystem,
  createBackendStorageSystem,
  createFrontendStorageSystem,
};
