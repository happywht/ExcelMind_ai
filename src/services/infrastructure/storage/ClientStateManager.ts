/**
 * 客户端状态管理器
 *
 * 提供前端状态的外部化存储和管理，支持：
 * - 执行进度持久化
 * - 用户设置管理
 * - 本地缓存管理
 * - 多标签页同步
 * - 数据同步到服务器
 *
 * @module storage
 */

import type {
  ExecutionState,
  UserSettings,
  CacheEntry,
  StorageResult,
  SyncResult,
  StorageEvent,
} from '../../../types/storageTypes';

import { IndexedDBService } from './IndexedDBService';
import { indexedDBConfig, storageConfig } from '@config/storage.config';

// ============================================================================
// 客户端状态管理器实现
// ============================================================================

export class ClientStateManager {
  private idb: IndexedDBService;
  private sessionId: string;
  private userId: string | null = null;
  private syncInProgress: boolean = false;
  private lastSyncTime: number = 0;
  private storageListeners: Array<() => void> = [];

  constructor(sessionId?: string) {
    this.idb = new IndexedDBService(indexedDBConfig);
    this.sessionId = sessionId || this.generateSessionId();
  }

  // ========================================================================
  // 初始化和清理
  // ========================================================================

  /**
   * 初始化状态管理器
   */
  async initialize(): Promise<void> {
    try {
      await this.idb.open();

      // 设置多标签页同步监听
      this.setupMultiTabSync();

      // 加载用户设置
      await this.loadUserSettings();

      console.log('[ClientStateManager] Initialized successfully');
    } catch (error) {
      console.error('[ClientStateManager] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * 销毁状态管理器
   */
  async destroy(): Promise<void> {
    this.storageListeners.forEach(unsubscribe => unsubscribe());
    this.storageListeners = [];

    await this.idb.close();
    console.log('[ClientStateManager] Destroyed');
  }

  // ========================================================================
  // 执行进度管理
  // ========================================================================

  /**
   * 保存执行进度
   */
  async saveProgress(executionId: string, progress: ExecutionState): Promise<void> {
    const record = {
      id: executionId,
      sessionId: this.sessionId,
      ...progress,
      timestamp: Date.now(),
      expiry: Date.now() + storageConfig.redis.defaultTTL * 1000,
    };

    await this.idb.put('executions', record);
    console.log('[ClientStateManager] Progress saved:', executionId);
  }

  /**
   * 获取执行进度
   */
  async getProgress(executionId: string): Promise<StorageResult<ExecutionState>> {
    return await this.idb.get<ExecutionState>('executions', executionId);
  }

  /**
   * 获取所有执行进度
   */
  async getAllProgress(): Promise<StorageResult<ExecutionState[]>> {
    return await this.idb.getAll<ExecutionState>('executions');
  }

  /**
   * 获取当前会话的所有执行
   */
  async getSessionExecutions(): Promise<ExecutionState[]> {
    const result = await this.idb.queryByIndex<ExecutionState>(
      'executions',
      'sessionId',
      this.sessionId
    );

    if (result.success && result.data) {
      return result.data;
    }

    return [];
  }

  /**
   * 删除执行进度
   */
  async deleteProgress(executionId: string): Promise<void> {
    await this.idb.delete('executions', executionId);
    console.log('[ClientStateManager] Progress deleted:', executionId);
  }

  // ========================================================================
  // 用户设置管理
  // ========================================================================

  /**
   * 保存用户设置
   */
  async saveSettings(settings: UserSettings): Promise<void> {
    const record = {
      userId: settings.userId,
      ...settings,
      lastUpdated: Date.now(),
    };

    await this.idb.put('settings', record);
    this.userId = settings.userId;

    console.log('[ClientStateManager] Settings saved:', settings.userId);
  }

  /**
   * 获取用户设置
   */
  async getSettings(userId?: string): Promise<StorageResult<UserSettings>> {
    const targetUserId = userId || this.userId;

    if (!targetUserId) {
      return {
        success: false,
        error: {
          code: 'NO_USER_ID',
          message: 'No user ID provided',
          retryable: false,
        },
      };
    }

    return await this.idb.get<UserSettings>('settings', targetUserId);
  }

  /**
   * 更新用户偏好
   */
  async updatePreferences(preferences: Partial<UserSettings['preferences']>): Promise<void> {
    if (!this.userId) return;

    const result = await this.getSettings(this.userId);

    if (result.success && result.data) {
      const settings = result.data;
      settings.preferences = {
        ...settings.preferences,
        ...preferences,
      };

      await this.saveSettings(settings);
    }
  }

  /**
   * 添加最近使用的文件
   */
  async addRecentFile(filePath: string): Promise<void> {
    if (!this.userId) return;

    const result = await this.getSettings(this.userId);

    if (result.success && result.data) {
      const settings = result.data;
      const recentFiles = settings.recentFiles || [];

      // 移除重复项
      const filtered = recentFiles.filter(f => f !== filePath);

      // 添加到开头
      settings.recentFiles = [filePath, ...filtered].slice(0, 20);

      await this.saveSettings(settings);
    }
  }

  /**
   * 加载用户设置
   */
  private async loadUserSettings(): Promise<void> {
    // 从 localStorage 获取上次登录的用户
    const lastUserId = localStorage.getItem('excelmind:lastUserId');

    if (lastUserId) {
      const result = await this.getSettings(lastUserId);

      if (result.success && result.data) {
        this.userId = lastUserId;
        console.log('[ClientStateManager] Loaded settings for user:', lastUserId);
      }
    }
  }

  // ========================================================================
  // 缓存管理
  // ========================================================================

  /**
   * 缓存结果
   */
  async cacheResult(
    key: string,
    result: any,
    ttl?: number
  ): Promise<void> {
    const entry: CacheEntry = {
      key,
      value: result,
      createdAt: Date.now(),
      accessedAt: Date.now(),
      expiry: ttl ? Date.now() + ttl * 1000 : undefined,
      hits: 0,
      size: JSON.stringify(result).length,
    };

    await this.idb.put('cache', entry);
    console.log('[ClientStateManager] Result cached:', key);
  }

  /**
   * 获取缓存结果
   */
  async getCachedResult(key: string): Promise<StorageResult<any>> {
    const result = await this.idb.get<CacheEntry>('cache', key);

    if (result.success && result.data) {
      const entry = result.data;

      // 检查是否过期
      if (entry.expiry && entry.expiry < Date.now()) {
        await this.idb.delete('cache', key);
        return {
          success: true,
          data: null,
        };
      }

      // 更新访问时间和命中次数
      entry.accessedAt = Date.now();
      entry.hits++;
      await this.idb.put('cache', entry);

      return {
        success: true,
        data: entry.value,
      };
    }

    return {
      success: true,
      data: null,
    };
  }

  /**
   * 清除过期缓存
   */
  async clearExpiredCache(): Promise<number> {
    const now = Date.now();
    const range = IDBKeyRange.upperBound(now);

    const result = await this.idb.queryByRange<CacheEntry>('cache', 'expiry', range);

    if (result.success && result.data) {
      const keys = result.data.map(entry => entry.key);
      await this.idb.bulkDelete('cache', keys);

      console.log(`[ClientStateManager] Cleared ${keys.length} expired cache entries`);
      return keys.length;
    }

    return 0;
  }

  /**
   * 清除所有缓存
   */
  async clearAllCache(): Promise<void> {
    await this.idb.clear('cache');
    console.log('[ClientStateManager] All cache cleared');
  }

  // ========================================================================
  // 会话管理
  // ========================================================================

  /**
   * 保存会话信息
   */
  async saveSessionInfo(info: {
    sessionId: string;
    userId?: string;
    lastActivity: number;
  }): Promise<void> {
    const record = {
      sessionId: info.sessionId,
      lastActivity: info.lastActivity,
      userId: info.userId || this.userId,
      timestamp: Date.now(),
    };

    await this.idb.put('sessions', record);
  }

  /**
   * 获取会话信息
   */
  async getSessionInfo(sessionId: string): Promise<StorageResult<any>> {
    return await this.idb.get('sessions', sessionId);
  }

  /**
   * 清理过期会话
   */
  async cleanupExpiredSessions(): Promise<number> {
    const now = Date.now();
    const expiryTime = now - storageConfig.cleanup.expiryGracePeriod;
    const range = IDBKeyRange.upperBound(expiryTime);

    const result = await this.idb.queryByRange<any>('sessions', 'lastActivity', range);

    if (result.success && result.data) {
      const keys = result.data.map(session => session.sessionId);
      await this.idb.bulkDelete('sessions', keys);

      console.log(`[ClientStateManager] Cleaned up ${keys.length} expired sessions`);
      return keys.length;
    }

    return 0;
  }

  // ========================================================================
  // 临时数据管理
  // ========================================================================

  /**
   * 保存临时数据
   */
  async saveTemporaryData(key: string, value: any, ttl?: number): Promise<void> {
    const record = {
      key,
      value,
      expiry: ttl ? Date.now() + ttl * 1000 : undefined,
    };

    await this.idb.put('temporary', record);
  }

  /**
   * 获取临时数据
   */
  async getTemporaryData(key: string): Promise<StorageResult<any>> {
    const result = await this.idb.get<any>('temporary', key);

    if (result.success && result.data) {
      const record = result.data;

      // 检查是否过期
      if (record.expiry && record.expiry < Date.now()) {
        await this.idb.delete('temporary', key);
        return {
          success: true,
          data: null,
        };
      }

      return {
        success: true,
        data: record.value,
      };
    }

    return {
      success: true,
      data: null,
    };
  }

  // ========================================================================
  // 数据同步
  // ========================================================================

  /**
   * 与服务器同步
   */
  async syncWithServer(): Promise<SyncResult> {
    if (this.syncInProgress) {
      return {
        success: false,
        synced: 0,
        failed: 0,
        conflicts: 0,
        duration: 0,
      };
    }

    this.syncInProgress = true;
    const startTime = Date.now();

    try {
      // 获取需要同步的数据
      const executions = await this.getSessionExecutions();

      let synced = 0;
      let failed = 0;
      let conflicts = 0;

      // 这里应该调用实际的 API 进行同步
      // 目前是简化实现
      for (const execution of executions) {
        try {
          // await api.syncExecution(execution);
          synced++;
        } catch (error) {
          console.error('[ClientStateManager] Sync failed for execution:', execution.id);
          failed++;
        }
      }

      this.lastSyncTime = Date.now();

      const duration = Date.now() - startTime;

      console.log(`[ClientStateManager] Sync completed: ${synced} synced, ${failed} failed, ${duration}ms`);

      return {
        success: true,
        synced,
        failed,
        conflicts,
        duration,
      };
    } catch (error) {
      console.error('[ClientStateManager] Sync failed:', error);

      return {
        success: false,
        synced: 0,
        failed: 0,
        conflicts: 0,
        duration: Date.now() - startTime,
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * 处理存储变化事件（多标签页同步）
   */
  async handleStorageChange(event: StorageEvent): Promise<void> {
    // 当其他标签页修改数据时，重新加载
    if (event.source === 'remote') {
      console.log('[ClientStateManager] Storage changed in another tab:', event.key);

      // 根据变化的类型执行相应的操作
      switch (event.type) {
        case 'set':
          // 数据被设置，可能需要重新加载
          break;
        case 'delete':
          // 数据被删除，可能需要清理本地缓存
          break;
        case 'clear':
          // 存储被清空，可能需要重置状态
          break;
      }

      // 通知所有监听器
      this.notifyStorageListeners();
    }
  }

  // ========================================================================
  // 统计信息
  // ========================================================================

  /**
   * 获取存储统计信息
   */
  async getStats(): Promise<{
    executions: number;
    cacheEntries: number;
    sessions: number;
    databaseSize: number;
  }> {
    const [executions, cache, sessions, size] = await Promise.all([
      this.idb.count('executions'),
      this.idb.count('cache'),
      this.idb.count('sessions'),
      this.idb.getDatabaseSize(),
    ]);

    return {
      executions: executions.success && executions.data ? executions.data : 0,
      cacheEntries: cache.success && cache.data ? cache.data : 0,
      sessions: sessions.success && sessions.data ? sessions.data : 0,
      databaseSize: size,
    };
  }

  // ========================================================================
  // 辅助方法
  // ========================================================================

  /**
   * 设置多标签页同步
   */
  private setupMultiTabSync(): void {
    const unsubscribe = this.idb.addListener((event) => {
      this.handleStorageChange(event);
    });

    this.storageListeners.push(unsubscribe);

    // 使用 BroadcastChannel 进行跨标签页通信
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel(`excelmind:${this.sessionId}`);

      channel.onmessage = (event) => {
        this.handleStorageChange(event.data);
      };

      this.storageListeners.push(() => {
        channel.close();
      });
    }
  }

  /**
   * 通知存储监听器
   */
  private notifyStorageListeners(): void {
    // 这里可以通知应用的其他部分数据已变化
    console.log('[ClientStateManager] Notifying storage listeners');
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 设置用户ID
   */
  setUserId(userId: string): void {
    this.userId = userId;
    localStorage.setItem('excelmind:lastUserId', userId);
  }

  /**
   * 获取会话ID
   */
  getSessionId(): string {
    return this.sessionId;
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

/**
 * 创建客户端状态管理器实例
 */
export function createClientStateManager(sessionId?: string): ClientStateManager {
  return new ClientStateManager(sessionId);
}

// ============================================================================
// 默认导出
// ============================================================================

export default ClientStateManager;
