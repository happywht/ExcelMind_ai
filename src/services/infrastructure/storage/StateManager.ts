/**
 * 状态管理器
 *
 * 提供应用状态的外部化存储和管理，支持：
 * - 会话管理
 * - 执行状态持久化
 * - 用户设置管理
 * - 自动清理过期数据
 * - 批量操作优化
 *
 * @module storage
 */

import type {
  StateSnapshot,
  ExecutionState,
  UserSettings,
  SessionInfo,
  SessionData,
  StorageResult,
  StorageError,
} from '../../../types/storageTypes';

import { RedisService } from './RedisService';
import { storageConfig } from '@config/storage.config';

// ============================================================================
// 状态管理器实现
// ============================================================================

export class StateManager {
  private redis: RedisService;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(redis?: RedisService) {
    this.redis = redis || new RedisService(storageConfig.redis);
  }

  // ========================================================================
  // 初始化和清理
  // ========================================================================

  /**
   * 初始化状态管理器
   */
  async initialize(): Promise<void> {
    try {
      await this.redis.connect();

      // 启动自动清理任务
      if (storageConfig.cleanup.enabled) {
        this.startCleanupTask();
      }

      console.log('[StateManager] Initialized successfully');
    } catch (error) {
      console.error('[StateManager] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * 销毁状态管理器
   */
  async destroy(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    await this.redis.disconnect();
    console.log('[StateManager] Destroyed');
  }

  // ========================================================================
  // 会话管理
  // ========================================================================

  /**
   * 创建新会话
   */
  async createSession(userId?: string, metadata?: Record<string, any>): Promise<SessionInfo> {
    const sessionId = this.generateSessionId();
    const now = Date.now();

    const sessionInfo: SessionInfo = {
      sessionId,
      userId,
      createdAt: now,
      lastActivity: now,
      expiry: now + storageConfig.redis.defaultTTL * 1000,
      metadata: metadata || {},
    };

    // 保存会话信息
    await this.redis.set(
      `session:${sessionId}`,
      sessionInfo,
      storageConfig.redis.defaultTTL
    );

    // 如果有用户ID，添加到用户会话列表
    if (userId) {
      await this.addSessionToUser(userId, sessionId);
    }

    console.log('[StateManager] Session created:', sessionId);
    return sessionInfo;
  }

  /**
   * 获取会话信息
   */
  async getSession(sessionId: string): Promise<StorageResult<SessionInfo>> {
    return await this.redis.get<SessionInfo>(`session:${sessionId}`);
  }

  /**
   * 更新会话活动时间
   */
  async updateSessionActivity(sessionId: string): Promise<void> {
    const result = await this.getSession(sessionId);

    if (result.success && result.data) {
      const session = result.data;
      session.lastActivity = Date.now();

      await this.redis.set(
        `session:${sessionId}`,
        session,
        storageConfig.redis.defaultTTL
      );
    }
  }

  /**
   * 删除会话
   */
  async deleteSession(sessionId: string): Promise<void> {
    await this.redis.del(`session:${sessionId}`);

    // 清理会话相关的所有数据
    const pattern = `session:${sessionId}:*`;
    await this.deleteByPattern(pattern);

    console.log('[StateManager] Session deleted:', sessionId);
  }

  /**
   * 获取会话数据
   */
  async getSessionData(sessionId: string): Promise<StorageResult<SessionData>> {
    const sessionResult = await this.getSession(sessionId);

    if (!sessionResult.success || !sessionResult.data) {
      return {
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: `Session ${sessionId} not found`,
          retryable: false,
        },
      };
    }

    // 获取会话的任务列表
    const tasksResult = await this.getSessionTasks(sessionId);

    return {
      success: true,
      data: {
        info: sessionResult.data,
        state: await this.getCurrentState(sessionId),
        tasks: tasksResult.success && tasksResult.data ? tasksResult.data : [],
      },
    };
  }

  // ========================================================================
  // 执行状态管理
  // ========================================================================

  /**
   * 保存执行状态
   */
  async saveExecutionState(executionId: string, state: ExecutionState): Promise<void> {
    const key = `execution:${executionId}`;
    await this.redis.set(key, state, storageConfig.redis.defaultTTL);

    // 如果有会话ID，添加到会话任务列表
    if (state.metadata) {
      const sessionId = this.extractSessionId(state);
      if (sessionId) {
        await this.addTaskToSession(sessionId, executionId);
      }
    }

    console.log('[StateManager] Execution state saved:', executionId);
  }

  /**
   * 获取执行状态
   */
  async getExecutionState(executionId: string): Promise<StorageResult<ExecutionState>> {
    return await this.redis.get<ExecutionState>(`execution:${executionId}`);
  }

  /**
   * 更新执行进度
   */
  async updateExecutionProgress(
    executionId: string,
    progress: {
      percentage: number;
      currentPhase: string;
      message: string;
    }
  ): Promise<void> {
    const result = await this.getExecutionState(executionId);

    if (result.success && result.data) {
      const state = result.data;
      state.progress = progress;
      state.metadata.updatedAt = Date.now();

      await this.saveExecutionState(executionId, state);
    }
  }

  /**
   * 批量更新执行状态
   */
  async batchUpdateExecutionProgress(updates: Array<{
    executionId: string;
    progress: ExecutionState['progress'];
  }>): Promise<void> {
    const entries = updates.map(u => ({
      key: `execution:${u.executionId}`,
      value: {
        ...u,
        metadata: { updatedAt: Date.now() },
      },
      ttl: storageConfig.redis.defaultTTL,
    }));

    await this.redis.mset(entries);
  }

  // ========================================================================
  // 用户设置管理
  // ========================================================================

  /**
   * 保存用户设置
   */
  async saveUserSettings(userId: string, settings: UserSettings): Promise<void> {
    const key = `settings:${userId}`;
    const settingsWithTimestamp = {
      ...settings,
      lastUpdated: Date.now(),
    };

    await this.redis.set(key, settingsWithTimestamp, 0); // 永不过期
    console.log('[StateManager] User settings saved:', userId);
  }

  /**
   * 获取用户设置
   */
  async getUserSettings(userId: string): Promise<StorageResult<UserSettings>> {
    return await this.redis.get<UserSettings>(`settings:${userId}`);
  }

  /**
   * 更新用户偏好设置
   */
  async updateUserPreferences(
    userId: string,
    preferences: Partial<UserSettings['preferences']>
  ): Promise<void> {
    const result = await this.getUserSettings(userId);

    if (result.success && result.data) {
      const settings = result.data;
      settings.preferences = {
        ...settings.preferences,
        ...preferences,
      };

      await this.saveUserSettings(userId, settings);
    }
  }

  /**
   * 添加最近使用的文件
   */
  async addRecentFile(userId: string, filePath: string): Promise<void> {
    const result = await this.getUserSettings(userId);

    if (result.success && result.data) {
      const settings = result.data;
      const recentFiles = settings.recentFiles || [];

      // 移除重复项
      const filtered = recentFiles.filter(f => f !== filePath);

      // 添加到开头
      settings.recentFiles = [filePath, ...filtered].slice(0, 20); // 最多保存20个

      await this.saveUserSettings(userId, settings);
    }
  }

  // ========================================================================
  // 会话任务管理
  // ========================================================================

  /**
   * 获取会话的所有任务
   */
  async getSessionTasks(sessionId: string): Promise<StorageResult<string[]>> {
    return await this.redis.get<string[]>(`session:${sessionId}:tasks`);
  }

  /**
   * 添加任务到会话
   */
  private async addTaskToSession(sessionId: string, taskId: string): Promise<void> {
    const key = `session:${sessionId}:tasks`;
    const result = await this.redis.get<string[]>(key);

    let tasks: string[] = [];
    if (result.success && result.data) {
      tasks = result.data;
    }

    if (!tasks.includes(taskId)) {
      tasks.push(taskId);
      await this.redis.set(key, tasks, storageConfig.redis.defaultTTL);
    }
  }

  /**
   * 添加会话到用户
   */
  private async addSessionToUser(userId: string, sessionId: string): Promise<void> {
    const key = `user:${userId}:sessions`;
    const result = await this.redis.get<string[]>(key);

    let sessions: string[] = [];
    if (result.success && result.data) {
      sessions = result.data;
    }

    if (!sessions.includes(sessionId)) {
      sessions.push(sessionId);
      await this.redis.set(key, sessions, 0); // 永不过期
    }
  }

  // ========================================================================
  // 状态快照管理
  // ========================================================================

  /**
   * 保存当前状态快照
   */
  async saveStateSnapshot(sessionId: string, snapshot: StateSnapshot): Promise<void> {
    const key = `state:${sessionId}`;
    await this.redis.set(key, snapshot, storageConfig.redis.defaultTTL);
  }

  /**
   * 获取当前状态
   */
  async getCurrentState(sessionId: string): Promise<StateSnapshot> {
    const result = await this.redis.get<StateSnapshot>(`state:${sessionId}`);

    if (result.success && result.data) {
      return result.data;
    }

    // 返回空状态
    return {
      sessionId,
      timestamp: new Date(),
      executionState: null,
      userSettings: null,
      temporaryData: null,
    };
  }

  // ========================================================================
  // 清理操作
  // ========================================================================

  /**
   * 清理过期的会话
   */
  async cleanupExpiredSessions(): Promise<number> {
    const now = Date.now();
    let cleaned = 0;

    try {
      // 获取所有会话键
      const pattern = 'session:*';
      const sessions = await this.getKeysByPattern(pattern);

      for (const sessionKey of sessions) {
        const result = await this.redis.get<SessionInfo>(sessionKey);

        if (result.success && result.data) {
          const session = result.data;

          // 检查是否过期
          if (session.expiry && session.expiry < now) {
            await this.deleteSession(session.sessionId);
            cleaned++;
          }
        }
      }

      console.log(`[StateManager] Cleaned up ${cleaned} expired sessions`);
    } catch (error) {
      console.error('[StateManager] Error during cleanup:', error);
    }

    return cleaned;
  }

  /**
   * 清理过期的执行状态
   */
  async cleanupExpiredExecutions(): Promise<number> {
    // Redis 会自动清理过期的键，这里只是记录日志
    console.log('[StateManager] Cleanup executed (Redis handles TTL automatically)');
    return 0;
  }

  // ========================================================================
  // 辅助方法
  // ========================================================================

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 从状态中提取会话ID
   */
  private extractSessionId(state: ExecutionState): string | null {
    // 这里可以根据实际的数据结构提取会话ID
    return null;
  }

  /**
   * 根据模式获取键
   */
  private async getKeysByPattern(pattern: string): Promise<string[]> {
    // 实际 Redis 实现应该使用 SCAN 命令
    // 这里简化为返回空数组
    return [];
  }

  /**
   * 根据模式删除键
   */
  private async deleteByPattern(pattern: string): Promise<void> {
    const keys = await this.getKeysByPattern(pattern);
    for (const key of keys) {
      await this.redis.del(key);
    }
  }

  /**
   * 启动清理任务
   */
  private startCleanupTask(): void {
    this.cleanupInterval = setInterval(async () => {
      await this.cleanupExpiredSessions();
      await this.cleanupExpiredExecutions();
    }, storageConfig.cleanup.interval);

    console.log('[StateManager] Cleanup task started');
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

/**
 * 创建状态管理器实例
 */
export function createStateManager(redis?: RedisService): StateManager {
  return new StateManager(redis);
}

// ============================================================================
// 默认导出
// ============================================================================

export default StateManager;
