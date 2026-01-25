/**
 * StateManager 单元测试
 *
 * 测试范围:
 * - 会话管理
 * - 执行状态管理
 * - 用户设置管理
 * - 清理操作
 * - 批量操作
 */

import { StateManager, createStateManager } from '../StateManager';
import { RedisService } from '../RedisService';
import type { RedisConfig } from '../../../../types/storageTypes';

// ============================================================================
// 测试辅助函数
// ============================================================================

const createTestRedisConfig = (): RedisConfig => ({
  url: 'redis://localhost:6379',
  keyPrefix: 'test:state:',
  defaultTTL: 3600,
  retryStrategy: {
    retries: 3,
    delay: 100,
    maxDelay: 500,
  },
});

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================================================
// 测试套件
// ============================================================================

describe('StateManager', () => {
  let stateManager: StateManager;
  let redisService: RedisService;

  beforeEach(async () => {
    redisService = new RedisService(createTestRedisConfig());
    await redisService.connect();

    stateManager = new StateManager(redisService);
    await stateManager.initialize();
  });

  afterEach(async () => {
    await stateManager.destroy();
    await redisService.disconnect();
  });

  // ========================================================================
  // 初始化测试
  // ========================================================================

  describe('初始化', () => {
    it('应该成功初始化', async () => {
      expect(stateManager).toBeInstanceOf(StateManager);
    });

    it('应该成功销毁', async () => {
      await stateManager.destroy();
      // 不应该抛出异常
    });

    it('工厂函数应该创建实例', () => {
      const manager = createStateManager();
      expect(manager).toBeInstanceOf(StateManager);
    });
  });

  // ========================================================================
  // 会话管理测试
  // ========================================================================

  describe('会话管理', () => {
    it('应该创建新会话', async () => {
      const userId = 'test-user-123';
      const metadata = { source: 'test' };

      const session = await stateManager.createSession(userId, metadata);

      expect(session.sessionId).toBeDefined();
      expect(session.userId).toBe(userId);
      expect(session.metadata).toEqual(metadata);
      expect(session.createdAt).toBeDefined();
      expect(session.lastActivity).toBeDefined();
      expect(session.expiry).toBeDefined();
    });

    it('应该获取会话信息', async () => {
      const userId = 'test-user-456';
      const createdSession = await stateManager.createSession(userId);

      const result = await stateManager.getSession(createdSession.sessionId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.sessionId).toBe(createdSession.sessionId);
      expect(result.data?.userId).toBe(userId);
    });

    it('应该返回 null 对于不存在的会话', async () => {
      const result = await stateManager.getSession('non-existent-session');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('应该更新会话活动时间', async () => {
      const session = await stateManager.createSession('test-user-789');
      const originalActivity = session.lastActivity;

      await wait(100);

      await stateManager.updateSessionActivity(session.sessionId);

      const result = await stateManager.getSession(session.sessionId);
      expect(result.data?.lastActivity).toBeGreaterThan(originalActivity);
    });

    it('应该删除会话', async () => {
      const session = await stateManager.createSession('test-user-delete');

      await stateManager.deleteSession(session.sessionId);

      const result = await stateManager.getSession(session.sessionId);
      expect(result.data).toBeNull();
    });

    it('应该获取会话数据', async () => {
      const userId = 'test-user-data';
      const session = await stateManager.createSession(userId);

      const result = await stateManager.getSessionData(session.sessionId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.info.sessionId).toBe(session.sessionId);
      expect(result.data?.state).toBeDefined();
      expect(result.data?.tasks).toEqual([]);
    });

    it('应该返回错误对于无效会话数据请求', async () => {
      const result = await stateManager.getSessionData('invalid-session-id');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SESSION_NOT_FOUND');
    });
  });

  // ========================================================================
  // 执行状态管理测试
  // ========================================================================

  describe('执行状态管理', () => {
    it('应该保存执行状态', async () => {
      const executionId = 'exec-123';
      const state = {
        taskId: executionId,
        status: 'running' as const,
        progress: { percentage: 50, currentPhase: 'processing', message: 'Working...' },
        steps: [],
        metadata: { createdAt: Date.now(), updatedAt: Date.now() },
      };

      await stateManager.saveExecutionState(executionId, state);

      const result = await stateManager.getExecutionState(executionId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.status).toBe('running');
      expect(result.data?.progress?.percentage).toBe(50);
    });

    it('应该获取执行状态', async () => {
      const executionId = 'exec-456';
      const state = {
        taskId: executionId,
        status: 'completed' as const,
        progress: { percentage: 100, currentPhase: 'done', message: 'Complete' },
        steps: [],
        metadata: { createdAt: Date.now(), updatedAt: Date.now() },
      };

      await stateManager.saveExecutionState(executionId, state);

      const result = await stateManager.getExecutionState(executionId);

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('completed');
    });

    it('应该更新执行进度', async () => {
      const executionId = 'exec-update';
      const state = {
        taskId: executionId,
        status: 'running' as const,
        progress: { percentage: 10, currentPhase: 'start', message: 'Starting' },
        steps: [],
        metadata: { createdAt: Date.now(), updatedAt: Date.now() },
      };

      await stateManager.saveExecutionState(executionId, state);

      await stateManager.updateExecutionProgress(executionId, {
        percentage: 75,
        currentPhase: 'processing',
        message: 'Almost done',
      });

      const result = await stateManager.getExecutionState(executionId);

      expect(result.data?.progress?.percentage).toBe(75);
      expect(result.data?.progress?.currentPhase).toBe('processing');
      expect(result.data?.progress?.message).toBe('Almost done');
    });

    it('应该批量更新执行进度', async () => {
      const exec1 = 'batch-1';
      const exec2 = 'batch-2';
      const exec3 = 'batch-3';

      // 初始化状态
      await stateManager.saveExecutionState(exec1, {
        taskId: exec1,
        status: 'running' as const,
        progress: { percentage: 0, currentPhase: 'start', message: '' },
        steps: [],
        metadata: { createdAt: Date.now(), updatedAt: Date.now() },
      });

      await stateManager.saveExecutionState(exec2, {
        taskId: exec2,
        status: 'running' as const,
        progress: { percentage: 0, currentPhase: 'start', message: '' },
        steps: [],
        metadata: { createdAt: Date.now(), updatedAt: Date.now() },
      });

      await stateManager.saveExecutionState(exec3, {
        taskId: exec3,
        status: 'running' as const,
        progress: { percentage: 0, currentPhase: 'start', message: '' },
        steps: [],
        metadata: { createdAt: Date.now(), updatedAt: Date.now() },
      });

      // 批量更新
      await stateManager.batchUpdateExecutionProgress([
        {
          executionId: exec1,
          progress: { percentage: 33, currentPhase: 'processing', message: '1/3 done' },
        },
        {
          executionId: exec2,
          progress: { percentage: 66, currentPhase: 'processing', message: '2/3 done' },
        },
        {
          executionId: exec3,
          progress: { percentage: 100, currentPhase: 'done', message: 'Complete' },
        },
      ]);

      const result1 = await stateManager.getExecutionState(exec1);
      const result2 = await stateManager.getExecutionState(exec2);
      const result3 = await stateManager.getExecutionState(exec3);

      expect(result1.data?.progress?.percentage).toBe(33);
      expect(result2.data?.progress?.percentage).toBe(66);
      expect(result3.data?.progress?.percentage).toBe(100);
    });
  });

  // ========================================================================
  // 用户设置管理测试
  // ========================================================================

  describe('用户设置管理', () => {
    it('应该保存用户设置', async () => {
      const userId = 'user-settings-1';
      const settings = {
        userId,
        preferences: {
          theme: 'dark' as const,
          language: 'zh-CN',
        },
        recentFiles: [],
        savedQueries: [],
      };

      await stateManager.saveUserSettings(userId, settings);

      const result = await stateManager.getUserSettings(userId);

      expect(result.success).toBe(true);
      expect(result.data?.userId).toBe(userId);
      expect(result.data?.preferences?.theme).toBe('dark');
    });

    it('应该获取用户设置', async () => {
      const userId = 'user-settings-2';
      const settings = {
        userId,
        preferences: {
          theme: 'light' as const,
          language: 'en-US',
        },
        recentFiles: [],
        savedQueries: [],
      };

      await stateManager.saveUserSettings(userId, settings);

      const result = await stateManager.getUserSettings(userId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.userId).toBe(userId);
    });

    it('应该更新用户偏好', async () => {
      const userId = 'user-prefs';
      const settings = {
        userId,
        preferences: {
          theme: 'dark' as const,
          language: 'zh-CN',
        },
        recentFiles: [],
        savedQueries: [],
      };

      await stateManager.saveUserSettings(userId, settings);

      await stateManager.updateUserPreferences(userId, {
        theme: 'light',
      });

      const result = await stateManager.getUserSettings(userId);

      expect(result.data?.preferences?.theme).toBe('light');
      expect(result.data?.preferences?.language).toBe('zh-CN'); // 保持不变
    });

    it('应该添加最近使用的文件', async () => {
      const userId = 'user-recent';
      const settings = {
        userId,
        preferences: { theme: 'dark' as const, language: 'zh-CN' },
        recentFiles: [],
        savedQueries: [],
      };

      await stateManager.saveUserSettings(userId, settings);

      await stateManager.addRecentFile(userId, '/path/to/file1.xlsx');
      await stateManager.addRecentFile(userId, '/path/to/file2.xlsx');
      await stateManager.addRecentFile(userId, '/path/to/file1.xlsx'); // 重复

      const result = await stateManager.getUserSettings(userId);

      expect(result.data?.recentFiles).toHaveLength(2);
      expect(result.data?.recentFiles?.[0]).toBe('/path/to/file1.xlsx');
      expect(result.data?.recentFiles?.[1]).toBe('/path/to/file2.xlsx');
    });

    it('应该限制最近文件列表大小', async () => {
      const userId = 'user-recent-limit';
      const settings = {
        userId,
        preferences: { theme: 'dark' as const, language: 'zh-CN' },
        recentFiles: [],
        savedQueries: [],
      };

      await stateManager.saveUserSettings(userId, settings);

      // 添加超过 20 个文件
      for (let i = 1; i <= 25; i++) {
        await stateManager.addRecentFile(userId, `/path/to/file${i}.xlsx`);
      }

      const result = await stateManager.getUserSettings(userId);

      expect(result.data?.recentFiles?.length).toBeLessThanOrEqual(20);
    });
  });

  // ========================================================================
  // 状态快照管理测试
  // ========================================================================

  describe('状态快照管理', () => {
    it('应该保存状态快照', async () => {
      const sessionId = 'session-snapshot';
      await stateManager.createSession('user', {});

      const snapshot = {
        sessionId,
        timestamp: new Date(),
        executionState: {
          taskId: 'test-task',
          status: 'running',
          progress: {
            percentage: 50,
            currentPhase: 'processing',
            message: 'Processing'
          },
          steps: [],
          metadata: {
            createdAt: Date.now(),
            updatedAt: Date.now()
          }
        },
        userSettings: null,
        temporaryData: null,
      };

      await stateManager.saveStateSnapshot(sessionId, snapshot);

      const retrieved = await stateManager.getCurrentState(sessionId);

      expect(retrieved.sessionId).toBe(sessionId);
      expect(retrieved.temporaryData).toEqual({ test: 'data' });
    });

    it('应该返回空状态对于不存在的快照', async () => {
      const result = await stateManager.getCurrentState('non-existent-session');

      expect(result.sessionId).toBe('non-existent-session');
      expect(result.executionState).toBeNull();
      expect(result.userSettings).toBeNull();
    });
  });

  // ========================================================================
  // 清理操作测试
  // ========================================================================

  describe('清理操作', () => {
    it('应该清理过期的会话', async () => {
      // 创建一个会话
      const session = await stateManager.createSession('cleanup-user');

      // 手动修改会话使其过期
      const expiredSession = {
        ...session,
        expiry: Date.now() - 1000, // 1秒前过期
      };

      const redis = stateManager as any;
      await redis.redis.set(`session:${session.sessionId}`, expiredSession, 3600);

      // 执行清理
      const cleaned = await stateManager.cleanupExpiredSessions();

      expect(cleaned).toBeGreaterThan(0);
    });

    it('应该执行清理操作而不报错', async () => {
      const result = await stateManager.cleanupExpiredExecutions();

      // 应该完成而不抛出异常
      expect(result).toBe(0);
    });
  });

  // ========================================================================
  // 会话任务管理测试
  // ========================================================================

  describe('会话任务管理', () => {
    it('应该获取会话任务列表', async () => {
      const session = await stateManager.createSession('task-user');

      const result = await stateManager.getSessionTasks(session.sessionId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('应该将任务关联到会话', async () => {
      const session = await stateManager.createSession('task-link-user');
      const executionId = 'exec-with-session';

      const state = {
        taskId: executionId,
        status: 'running',
        progress: { percentage: 0, currentPhase: 'start', message: '' },
        steps: [],
        metadata: {
          sessionId: session.sessionId, // 关联会话
          updatedAt: Date.now(),
          createdAt: Date.now(),
        },
      };

      await stateManager.saveExecutionState(executionId, state);

      const tasks = await stateManager.getSessionTasks(session.sessionId);

      expect(tasks.success).toBe(true);
      expect(tasks.data).toContain(executionId);
    });
  });

  // ========================================================================
  // 错误处理测试
  // ========================================================================

  describe('错误处理', () => {
    it('应该处理无效的会话ID', async () => {
      const result = await stateManager.getSession('invalid-id');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('应该处理无效的执行ID', async () => {
      const result = await stateManager.getExecutionState('invalid-exec-id');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('应该处理不存在的用户设置', async () => {
      const result = await stateManager.getUserSettings('non-existent-user');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  // ========================================================================
  // 边界条件测试
  // ========================================================================

  describe('边界条件', () => {
    it('应该处理空的用户ID', async () => {
      const session = await stateManager.createSession();

      expect(session.userId).toBeUndefined();
      expect(session.sessionId).toBeDefined();
    });

    it('应该处理空的元数据', async () => {
      const session = await stateManager.createSession('user');

      expect(session.metadata).toEqual({});
    });

    it('应该处理特殊字符在会话ID中', async () => {
      const result = await stateManager.getSession('session:with:colons');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });
});
