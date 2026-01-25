/**
 * 数据同步服务
 *
 * 提供前后端数据同步功能，支持：
 * - 双向同步
 * - 冲突检测和解决
 * - 增量同步
 * - 批量操作优化
 * - 断线重连
 *
 * @module storage
 */

import type {
  SyncConfig,
  SyncResult,
  SyncConflict,
  BatchOperation,
} from '../../../types/storageTypes';

import { StateManager } from './StateManager';
import { ClientStateManager } from './ClientStateManager';
import { storageConfig } from '@config/storage.config';

// ============================================================================
// 同步服务实现
// ============================================================================

export class SyncService {
  private stateManager: StateManager | null = null;
  private clientManager: ClientStateManager | null = null;
  private config: SyncConfig;
  private syncTimer: NodeJS.Timeout | null = null;
  private isOnline: boolean = true;
  private pendingSync: Set<string> = new Set();

  constructor(config?: Partial<SyncConfig>) {
    this.config = {
      ...storageConfig.sync,
      ...config,
    };

    // 监听在线状态
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  // ========================================================================
  // 初始化和清理
  // ========================================================================

  /**
   * 初始化同步服务
   */
  async initialize(
    stateManager?: StateManager,
    clientManager?: ClientStateManager
  ): Promise<void> {
    this.stateManager = stateManager || null;
    this.clientManager = clientManager || null;

    // 启动定时同步
    this.startSyncTimer();

    console.log('[SyncService] Initialized');
  }

  /**
   * 销毁同步服务
   */
  async destroy(): Promise<void> {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }

    console.log('[SyncService] Destroyed');
  }

  // ========================================================================
  // 双向同步
  // ========================================================================

  /**
   * 双向同步数据
   */
  async bidirectionalSync(executionId: string): Promise<SyncResult> {
    if (!this.isOnline) {
      return this.createOfflineResult();
    }

    const startTime = Date.now();
    let synced = 0;
    let failed = 0;
    let conflicts = 0;

    try {
      // 1. 从客户端获取数据
      const clientData = await this.getClientData(executionId);
      if (!clientData) {
        return {
          success: true,
          synced: 0,
          failed: 0,
          conflicts: 0,
          duration: Date.now() - startTime,
        };
      }

      // 2. 从服务器获取数据
      const serverData = await this.getServerData(executionId);

      // 3. 检测冲突
      const hasConflict = await this.detectConflict(clientData, serverData);

      if (hasConflict) {
        conflicts++;

        // 根据配置解决冲突
        const resolved = await this.resolveConflict(executionId, clientData, serverData);

        if (resolved) {
          await this.saveResolvedData(executionId, resolved);
          synced++;
        } else {
          failed++;
        }
      } else {
        // 4. 同步数据
        if (serverData) {
          // 服务器数据更新，同步到客户端
          await this.syncToClient(executionId, serverData);
          synced++;
        } else if (clientData) {
          // 客户端有新数据，同步到服务器
          await this.syncToServer(executionId, clientData);
          synced++;
        }
      }

      // 5. 从待同步列表中移除
      this.pendingSync.delete(executionId);

      return {
        success: true,
        synced,
        failed,
        conflicts,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      console.error('[SyncService] Bidirectional sync failed:', error);

      // 加入待同步列表
      this.pendingSync.add(executionId);

      return {
        success: false,
        synced,
        failed: failed + 1,
        conflicts,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * 批量双向同步
   */
  async batchBidirectionalSync(executionIds: string[]): Promise<SyncResult> {
    if (!this.isOnline) {
      return this.createOfflineResult();
    }

    const startTime = Date.now();
    let totalSynced = 0;
    let totalFailed = 0;
    let totalConflicts = 0;

    // 分批处理
    const batchSize = this.config.batchSize;
    for (let i = 0; i < executionIds.length; i += batchSize) {
      const batch = executionIds.slice(i, i + batchSize);

      const results = await Promise.all(
        batch.map(id => this.bidirectionalSync(id))
      );

      for (const result of results) {
        totalSynced += result.synced;
        totalFailed += result.failed;
        totalConflicts += result.conflicts;
      }
    }

    return {
      success: totalFailed === 0,
      synced: totalSynced,
      failed: totalFailed,
      conflicts: totalConflicts,
      duration: Date.now() - startTime,
    };
  }

  // ========================================================================
  // 单向同步
  // ========================================================================

  /**
   * 同步到服务器
   */
  async syncToServer(executionId: string, data: any): Promise<void> {
    if (!this.isOnline || !this.stateManager) {
      this.pendingSync.add(executionId);
      return;
    }

    try {
      await this.stateManager.saveExecutionState(executionId, data);
      console.log('[SyncService] Synced to server:', executionId);
    } catch (error) {
      console.error('[SyncService] Failed to sync to server:', error);
      this.pendingSync.add(executionId);
      throw error;
    }
  }

  /**
   * 从服务器同步
   */
  async syncFromServer(executionId: string): Promise<any> {
    if (!this.isOnline || !this.stateManager) {
      return null;
    }

    try {
      const result = await this.stateManager.getExecutionState(executionId);

      if (result.success && result.data) {
        console.log('[SyncService] Synced from server:', executionId);
        return result.data;
      }

      return null;
    } catch (error) {
      console.error('[SyncService] Failed to sync from server:', error);
      throw error;
    }
  }

  /**
   * 同步到客户端
   */
  async syncToClient(executionId: string, data: any): Promise<void> {
    if (!this.clientManager) {
      return;
    }

    try {
      await this.clientManager.saveProgress(executionId, data);
      console.log('[SyncService] Synced to client:', executionId);
    } catch (error) {
      console.error('[SyncService] Failed to sync to client:', error);
      throw error;
    }
  }

  // ========================================================================
  // 冲突解决
  // ========================================================================

  /**
   * 检测冲突
   */
  async detectConflict(local: any, remote: any): Promise<boolean> {
    if (!local || !remote) {
      return false;
    }

    // 比较更新时间
    const localTime = local.metadata?.updatedAt || 0;
    const remoteTime = remote.metadata?.updatedAt || 0;

    // 如果两边都在同一时间内更新，认为有冲突
    const timeDiff = Math.abs(localTime - remoteTime);
    const conflictThreshold = 1000; // 1秒

    if (timeDiff < conflictThreshold) {
      // 进一步比较内容
      return JSON.stringify(local) !== JSON.stringify(remote);
    }

    return false;
  }

  /**
   * 解决冲突
   */
  async resolveConflict(
    executionId: string,
    local: any,
    remote: any
  ): Promise<any | null> {
    const strategy = this.config.conflictResolution;

    switch (strategy) {
      case 'local':
        console.log('[SyncService] Conflict resolved: using local version');
        return local;

      case 'remote':
        console.log('[SyncService] Conflict resolved: using remote version');
        return remote;

      case 'merge':
        console.log('[SyncService] Conflict resolved: merging versions');
        return this.mergeData(local, remote);

      case 'manual':
        console.log('[SyncService] Conflict requires manual resolution');
        // 保存冲突信息，等待用户处理
        await this.saveConflict(executionId, local, remote);
        return null;

      default:
        return remote;
    }
  }

  /**
   * 合并数据
   */
  private mergeData(local: any, remote: any): any {
    // 简单的合并策略：使用较新的更新
    const localTime = local.metadata?.updatedAt || 0;
    const remoteTime = remote.metadata?.updatedAt || 0;

    if (localTime > remoteTime) {
      return {
        ...remote,
        ...local,
        metadata: {
          ...remote.metadata,
          ...local.metadata,
          conflictResolved: true,
        },
      };
    } else {
      return {
        ...local,
        ...remote,
        metadata: {
          ...local.metadata,
          ...remote.metadata,
          conflictResolved: true,
        },
      };
    }
  }

  /**
   * 保存冲突信息
   */
  private async saveConflict(
    executionId: string,
    local: any,
    remote: any
  ): Promise<void> {
    const conflict: SyncConflict = {
      key: executionId,
      local,
      remote,
      timestamp: Date.now(),
      resolved: false,
    };

    // 保存到本地存储
    if (this.clientManager) {
      await this.clientManager.saveTemporaryData(
        `conflict:${executionId}`,
        conflict
      );
    }

    console.log('[SyncService] Conflict saved:', executionId);
  }

  /**
   * 保存解决后的数据
   */
  private async saveResolvedData(executionId: string, data: any): Promise<void> {
    // 同时保存到客户端和服务器
    await Promise.all([
      this.syncToClient(executionId, data),
      this.syncToServer(executionId, data),
    ]);
  }

  // ========================================================================
  // 定时同步
  // ========================================================================

  /**
   * 启动定时同步
   */
  private startSyncTimer(): void {
    this.syncTimer = setInterval(async () => {
      if (this.isOnline && this.pendingSync.size > 0) {
        console.log(`[SyncService] Syncing ${this.pendingSync.size} pending items`);

        const executionIds = Array.from(this.pendingSync);
        await this.batchBidirectionalSync(executionIds);
      }
    }, this.config.interval);
  }

  /**
   * 手动触发同步
   */
  async triggerSync(executionIds?: string[]): Promise<SyncResult> {
    const idsToSync = executionIds || Array.from(this.pendingSync);

    if (idsToSync.length === 0) {
      return {
        success: true,
        synced: 0,
        failed: 0,
        conflicts: 0,
        duration: 0,
      };
    }

    return await this.batchBidirectionalSync(idsToSync);
  }

  // ========================================================================
  // 在线状态处理
  // ========================================================================

  /**
   * 处理在线事件
   */
  private handleOnline = async (): Promise<void> => {
    this.isOnline = true;
    console.log('[SyncService] Back online, syncing pending data');

    // 立即同步待处理的数据
    if (this.pendingSync.size > 0) {
      await this.triggerSync();
    }
  };

  /**
   * 处理离线事件
   */
  private handleOffline = (): void => {
    this.isOnline = false;
    console.log('[SyncService] Gone offline, data will sync when back online');
  };

  /**
   * 创建离线结果
   */
  private createOfflineResult(): SyncResult {
    return {
      success: false,
      synced: 0,
      failed: this.pendingSync.size,
      conflicts: 0,
      duration: 0,
    };
  }

  // ========================================================================
  // 数据获取
  // ========================================================================

  /**
   * 获取客户端数据
   */
  private async getClientData(executionId: string): Promise<any> {
    if (!this.clientManager) {
      return null;
    }

    const result = await this.clientManager.getProgress(executionId);

    if (result.success && result.data) {
      return result.data;
    }

    return null;
  }

  /**
   * 获取服务器数据
   */
  private async getServerData(executionId: string): Promise<any> {
    if (!this.stateManager) {
      return null;
    }

    const result = await this.stateManager.getExecutionState(executionId);

    if (result.success && result.data) {
      return result.data;
    }

    return null;
  }

  // ========================================================================
  // 公共API
  // ========================================================================

  /**
   * 获取待同步列表
   */
  getPendingSync(): string[] {
    return Array.from(this.pendingSync);
  }

  /**
   * 检查是否在线
   */
  isSyncOnline(): boolean {
    return this.isOnline;
  }

  /**
   * 设置状态管理器
   */
  setStateManager(manager: StateManager): void {
    this.stateManager = manager;
  }

  /**
   * 设置客户端管理器
   */
  setClientManager(manager: ClientStateManager): void {
    this.clientManager = manager;
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

/**
 * 创建同步服务实例
 */
export function createSyncService(config?: Partial<SyncConfig>): SyncService {
  return new SyncService(config);
}

// ============================================================================
// 默认导出
// ============================================================================

export default SyncService;
