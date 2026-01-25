/**
 * 存储服务模块 - 统一导出
 *
 * 提供外部化状态存储的完整解决方案，包括：
 * - Redis 后端存储
 * - IndexedDB 前端存储
 * - 数据同步服务
 * - 状态管理器
 *
 * @module storage
 */

// ============================================================================
// Redis 服务
// ============================================================================

export {
  RedisService,
  createRedisService,
} from './RedisService';

// ============================================================================
// 状态管理器
// ============================================================================

export {
  StateManager,
  createStateManager,
} from './StateManager';

// ============================================================================
// IndexedDB 服务
// ============================================================================

export {
  IndexedDBService,
  createIndexedDBService,
} from './IndexedDBService';

// ============================================================================
// 客户端状态管理器
// ============================================================================

export {
  ClientStateManager,
  createClientStateManager,
} from './ClientStateManager';

// ============================================================================
// 同步服务
// ============================================================================

export {
  SyncService,
  createSyncService,
} from './SyncService';

// ============================================================================
// 工厂函数 - 创建完整的存储系统
// ============================================================================

import { RedisService } from './RedisService';
import { StateManager } from './StateManager';
import { IndexedDBService } from './IndexedDBService';
import { ClientStateManager } from './ClientStateManager';
import { SyncService } from './SyncService';
import { storageConfig } from '@config/storage.config';

/**
 * 存储系统接口
 */
export interface StorageSystem {
  // 后端
  redis: RedisService;
  stateManager: StateManager;

  // 前端
  indexedDB: IndexedDBService;
  clientManager: ClientStateManager;

  // 同步
  syncService: SyncService;
}

/**
 * 创建完整的存储系统
 *
 * @example
 * ```typescript
 * const storage = await createStorageSystem();
 * await storage.stateManager.createSession('user123');
 * await storage.clientManager.saveProgress('task1', progressData);
 * await storage.syncService.bidirectionalSync('task1');
 * ```
 */
export async function createStorageSystem(): Promise<StorageSystem> {
  // 创建后端服务
  const redis = new RedisService(storageConfig.redis);
  const stateManager = new StateManager(redis);

  // 创建前端服务
  const indexedDB = new IndexedDBService(storageConfig.indexedDB);
  const clientManager = new ClientStateManager();

  // 创建同步服务
  const syncService = new SyncService(storageConfig.sync);

  // 初始化
  await Promise.all([
    stateManager.initialize(),
    clientManager.initialize(),
  ]);

  // 设置同步服务的管理器
  syncService.setStateManager(stateManager);
  syncService.setClientManager(clientManager);

  // 初始化同步服务
  await syncService.initialize();

  console.log('[StorageSystem] Complete storage system created');

  return {
    redis,
    stateManager,
    indexedDB,
    clientManager,
    syncService,
  };
}

/**
 * 创建仅后端的存储系统（服务器端使用）
 */
export async function createBackendStorageSystem(): Promise<{
  redis: RedisService;
  stateManager: StateManager;
}> {
  const redis = new RedisService(storageConfig.redis);
  const stateManager = new StateManager(redis);

  await stateManager.initialize();

  console.log('[StorageSystem] Backend storage system created');

  return {
    redis,
    stateManager,
  };
}

/**
 * 创建仅前端的存储系统（客户端使用）
 */
export async function createFrontendStorageSystem(): Promise<{
  indexedDB: IndexedDBService;
  clientManager: ClientStateManager;
}> {
  const indexedDB = new IndexedDBService(storageConfig.indexedDB);
  const clientManager = new ClientStateManager();

  await clientManager.initialize();

  console.log('[StorageSystem] Frontend storage system created');

  return {
    indexedDB,
    clientManager,
  };
}

// ============================================================================
// 默认导出
// ============================================================================

export default {
  createStorageSystem,
  createBackendStorageSystem,
  createFrontendStorageSystem,
};
