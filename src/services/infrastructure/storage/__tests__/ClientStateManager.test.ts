/**
 * ClientStateManager 单元测试
 *
 * 测试范围:
 * - 执行进度管理
 * - 用户设置管理
 * - 缓存管理
 * - 会话管理
 * - 数据同步
 */

import { ClientStateManager, createClientStateManager } from '../ClientStateManager';
import { IndexedDBService } from '../IndexedDBService';

// ============================================================================
// Mock IndexedDBService
// ============================================================================

const mockData: Map<string, any> = new Map();

const mockIDB = {
  open: jest.fn().mockResolvedValue(undefined),
  close: jest.fn().mockResolvedValue(undefined),
  put: jest.fn().mockImplementation(async (store: string, data: any) => {
    const key = data.id || data.userId || data.taskId || data.key;
    mockData.set(`${store}:${key}`, data);
  }),
  get: jest.fn().mockImplementation(async (store: string, key: string) => {
    return {
      success: true,
      data: mockData.get(`${store}:${key}`) || null,
    };
  }),
  delete: jest.fn().mockImplementation(async (store: string, key: string) => {
    mockData.delete(`${store}:${key}`);
  }),
  queryByIndex: jest.fn().mockResolvedValue({
    success: true,
    data: [],
  }),
  count: jest.fn().mockResolvedValue({
    success: true,
    data: 0,
  }),
  getDatabaseSize: jest.fn().mockResolvedValue(0),
  addListener: jest.fn().mockReturnValue(() => {}),
  getAll: jest.fn().mockResolvedValue({
    success: true,
    data: [],
  }),
  clear: jest.fn().mockResolvedValue({
    success: true,
  }),
  bulkDelete: jest.fn().mockResolvedValue({
    success: true,
    count: 0,
  }),
};

jest.mock('../IndexedDBService', () => ({
  IndexedDBService: jest.fn().mockImplementation(() => mockIDB),
}));

// ============================================================================
// 测试辅助函数
// ============================================================================

const createMockExecutionState = (id: string, progress: number) => ({
  taskId: id,
  status: 'running' as const,
  progress: {
    percentage: progress,
    currentPhase: 'processing' as const,
    message: `Processing ${progress}%`,
  },
  steps: [],
  metadata: {
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
});

const createMockUserSettings = (userId: string) => ({
  userId,
  preferences: {
    theme: 'dark' as const,
    language: 'zh-CN',
  },
  recentFiles: [],
  savedQueries: [],
});

const clearMocks = () => {
  mockData.clear();
  jest.clearAllMocks();
};

// ============================================================================
// 测试套件
// ============================================================================

describe('ClientStateManager', () => {
  let manager: ClientStateManager;

  beforeEach(async () => {
    clearMocks();

    manager = new ClientStateManager('test-session');
    await manager.initialize();
  });

  afterEach(async () => {
    await manager.destroy();
    clearMocks();
  });

  // ========================================================================
  // 初始化测试
  // ========================================================================

  describe('初始化', () => {
    it('应该成功初始化', async () => {
      expect(manager).toBeInstanceOf(ClientStateManager);
      expect(mockIDB.open).toHaveBeenCalled();
    });

    it('应该成功销毁', async () => {
      await manager.destroy();

      expect(mockIDB.close).toHaveBeenCalled();
    });

    it('工厂函数应该创建实例', () => {
      const newManager = createClientStateManager('custom-session');

      expect(newManager).toBeInstanceOf(ClientStateManager);
    });

    it('应该生成会话ID', () => {
      const sessionId = manager.getSessionId();

      expect(sessionId).toBeDefined();
      expect(sessionId).toContain('session_');
    });
  });

  // ========================================================================
  // 执行进度管理测试
  // ========================================================================

  describe('执行进度管理', () => {
    it('应该保存执行进度', async () => {
      const executionId = 'exec-1';
      const progress = createMockExecutionState(executionId, 50);

      await manager.saveProgress(executionId, progress);

      expect(mockIDB.put).toHaveBeenCalledWith(
        'executions',
        expect.objectContaining({
          id: executionId,
          sessionId: manager.getSessionId(),
        })
      );
    });

    it('应该获取执行进度', async () => {
      const executionId = 'exec-2';
      const progress = createMockExecutionState(executionId, 75);

      mockData.set(`executions:${executionId}`, {
        taskId: executionId,
        ...progress,
      });

      const result = await manager.getProgress(executionId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.taskId).toBe(executionId);
    });

    it('应该获取所有执行进度', async () => {
      const exec1 = createMockExecutionState('exec-3', 25);
      const exec2 = createMockExecutionState('exec-4', 50);

      mockData.set('executions:exec-3', { taskId: 'exec-3', ...exec1 });
      mockData.set('executions:exec-4', { taskId: 'exec-4', ...exec2 });

      (mockIDB.getAll as jest.Mock) = jest.fn().mockResolvedValue({
        success: true,
        data: [
          { taskId: 'exec-3', ...exec1 },
          { taskId: 'exec-4', ...exec2 },
        ],
      });

      const result = await manager.getAllProgress();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('应该获取当前会话的执行', async () => {
      const exec1 = createMockExecutionState('exec-5', 33);
      const exec2 = createMockExecutionState('exec-6', 66);

      const sessionId = manager.getSessionId();

      (mockIDB.queryByIndex as jest.Mock) = jest.fn().mockResolvedValue({
        success: true,
        data: [
          { taskId: 'exec-5', sessionId, ...exec1 },
          { taskId: 'exec-6', sessionId, ...exec2 },
        ],
      });

      const executions = await manager.getSessionExecutions();

      expect(executions).toHaveLength(2);
      expect((executions[0] as any).sessionId).toBe(sessionId);
    });

    it('应该删除执行进度', async () => {
      const executionId = 'exec-7';

      await manager.deleteProgress(executionId);

      expect(mockIDB.delete).toHaveBeenCalledWith('executions', executionId);
    });
  });

  // ========================================================================
  // 用户设置管理测试
  // ========================================================================

  describe('用户设置管理', () => {
    it('应该保存用户设置', async () => {
      const userId = 'user-1';
      const settings = createMockUserSettings(userId);

      await manager.saveSettings(settings);

      expect(mockIDB.put).toHaveBeenCalledWith(
        'settings',
        expect.objectContaining({
          userId,
        })
      );
    });

    it('应该获取用户设置', async () => {
      const userId = 'user-2';
      const settings = createMockUserSettings(userId);

      mockData.set(`settings:${userId}`, settings);

      const result = await manager.getSettings(userId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(settings);
    });

    it('应该更新用户偏好', async () => {
      const userId = 'user-3';
      const settings = createMockUserSettings(userId);

      manager.setUserId(userId);

      mockData.set(`settings:${userId}`, settings);

      await manager.updatePreferences({
        theme: 'light',
      });

      const savedData = mockData.get(`settings:${userId}`);

      expect(savedData.preferences.theme).toBe('light');
      expect(savedData.preferences.language).toBe('zh-CN'); // 保持不变
    });

    it('应该添加最近使用的文件', async () => {
      const userId = 'user-4';
      const settings = createMockUserSettings(userId);

      manager.setUserId(userId);

      mockData.set(`settings:${userId}`, settings);

      await manager.addRecentFile('/path/to/file1.xlsx');
      await manager.addRecentFile('/path/to/file2.xlsx');
      await manager.addRecentFile('/path/to/file1.xlsx'); // 重复

      const savedData = mockData.get(`settings:${userId}`);

      expect(savedData.recentFiles).toHaveLength(2);
      expect(savedData.recentFiles[0]).toBe('/path/to/file1.xlsx');
    });

    it('应该限制最近文件列表大小', async () => {
      const userId = 'user-5';
      const settings = createMockUserSettings(userId);

      manager.setUserId(userId);

      mockData.set(`settings:${userId}`, settings);

      // 添加超过 20 个文件
      for (let i = 1; i <= 25; i++) {
        await manager.addRecentFile(`/path/to/file${i}.xlsx`);
      }

      const savedData = mockData.get(`settings:${userId}`);

      expect(savedData.recentFiles.length).toBeLessThanOrEqual(20);
    });

    it('应该返回错误对于无用户ID的设置请求', async () => {
      const result = await manager.getSettings();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NO_USER_ID');
    });
  });

  // ========================================================================
  // 缓存管理测试
  // ========================================================================

  describe('缓存管理', () => {
    it('应该缓存结果', async () => {
      const key = 'cache-key';
      const result = { data: 'test result' };

      await manager.cacheResult(key, result, 3600);

      expect(mockIDB.put).toHaveBeenCalledWith(
        'cache',
        expect.objectContaining({
          key,
          value: result,
        })
      );
    });

    it('应该获取缓存结果', async () => {
      const key = 'cache-key-2';
      const value = { data: 'cached data' };

      mockData.set(`cache:${key}`, {
        key,
        value,
        createdAt: Date.now(),
        accessedAt: Date.now(),
        hits: 0,
      });

      const result = await manager.getCachedResult(key);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(value);
    });

    it('应该返回 null 对于过期的缓存', async () => {
      const key = 'expired-cache';

      mockData.set(`cache:${key}`, {
        key,
        value: { data: 'expired' },
        createdAt: Date.now() - 10000,
        accessedAt: Date.now() - 10000,
        expiry: Date.now() - 1000, // 已过期
        hits: 0,
      });

      const result = await manager.getCachedResult(key);

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('应该更新缓存命中次数', async () => {
      const key = 'cache-hit';

      const cacheEntry = {
        key,
        value: { data: 'test' },
        createdAt: Date.now(),
        accessedAt: Date.now(),
        hits: 5,
      };

      mockData.set(`cache:${key}`, cacheEntry);

      await manager.getCachedResult(key);

      const savedData = mockData.get(`cache:${key}`);

      expect(savedData.hits).toBe(6);
      expect(savedData.accessedAt).toBeGreaterThan(cacheEntry.accessedAt);
    });

    it('应该清除所有缓存', async () => {
      await manager.clearAllCache();

      expect(mockIDB.clear).toHaveBeenCalledWith('cache');
    });

    it('应该清除过期缓存', async () => {
      mockIDB.queryByIndex = jest.fn().mockResolvedValue({
        success: true,
        data: [
          { key: 'expired1' },
          { key: 'expired2' },
        ],
      });

      const cleaned = await manager.clearExpiredCache();

      expect(cleaned).toBe(2);
      expect(mockIDB.bulkDelete).toHaveBeenCalled();
    });
  });

  // ========================================================================
  // 会话管理测试
  // ========================================================================

  describe('会话管理', () => {
    it('应该保存会话信息', async () => {
      const sessionId = manager.getSessionId();

      await manager.saveSessionInfo({
        sessionId,
        lastActivity: Date.now(),
        userId: 'test-user',
      });

      expect(mockIDB.put).toHaveBeenCalledWith(
        'sessions',
        expect.objectContaining({
          sessionId,
        })
      );
    });

    it('应该获取会话信息', async () => {
      const sessionId = manager.getSessionId();

      mockData.set(`sessions:${sessionId}`, {
        sessionId,
        lastActivity: Date.now(),
      });

      const result = await manager.getSessionInfo(sessionId);

      expect(result.success).toBe(true);
      expect(result.data?.sessionId).toBe(sessionId);
    });

    it('应该清理过期会话', async () => {
      const now = Date.now();

      mockIDB.queryByIndex = jest.fn().mockResolvedValue({
        success: true,
        data: [
          { sessionId: 'expired1', lastActivity: now - 4000000 },
          { sessionId: 'expired2', lastActivity: now - 5000000 },
        ],
      });

      const cleaned = await manager.cleanupExpiredSessions();

      expect(cleaned).toBe(2);
      expect(mockIDB.bulkDelete).toHaveBeenCalled();
    });
  });

  // ========================================================================
  // 临时数据管理测试
  // ========================================================================

  describe('临时数据管理', () => {
    it('应该保存临时数据', async () => {
      const key = 'temp-key';
      const value = { temp: 'data' };

      await manager.saveTemporaryData(key, value, 3600);

      expect(mockIDB.put).toHaveBeenCalledWith(
        'temporary',
        expect.objectContaining({
          key,
          value,
        })
      );
    });

    it('应该获取临时数据', async () => {
      const key = 'temp-key-2';
      const value = { temp: 'data2' };

      mockData.set(`temporary:${key}`, {
        key,
        value,
      });

      const result = await manager.getTemporaryData(key);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(value);
    });

    it('应该返回 null 对于过期的临时数据', async () => {
      const key = 'expired-temp';

      mockData.set(`temporary:${key}`, {
        key,
        value: { data: 'expired' },
        expiry: Date.now() - 1000,
      });

      const result = await manager.getTemporaryData(key);

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  // ========================================================================
  // 数据同步测试
  // ========================================================================

  describe('数据同步', () => {
    it('应该与服务器同步', async () => {
      mockIDB.queryByIndex = jest.fn().mockResolvedValue({
        success: true,
        data: [],
      });

      const result = await manager.syncWithServer();

      expect(result.success).toBe(true);
      expect(result.synced).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('应该处理同步错误', async () => {
      mockIDB.queryByIndex = jest.fn().mockResolvedValue({
        success: true,
        data: [{ id: 'exec-1' }],
      });

      // 模拟同步失败
      const result = await manager.syncWithServer();

      expect(result).toBeDefined();
    });

    it('应该避免重复同步', async () => {
      mockIDB.queryByIndex = jest.fn().mockResolvedValue({
        success: true,
        data: [],
      });

      const result1 = await manager.syncWithServer();
      const result2 = await manager.syncWithServer();

      // 第二次同步应该被跳过或立即返回
      expect(result2).toBeDefined();
    });
  });

  // ========================================================================
  // 统计信息测试
  // ========================================================================

  describe('统计信息', () => {
    it('应该获取存储统计', async () => {
      mockIDB.count = jest.fn()
        .mockResolvedValueOnce({ success: true, data: 5 }) // executions
        .mockResolvedValueOnce({ success: true, data: 10 }) // cache
        .mockResolvedValueOnce({ success: true, data: 2 }); // sessions

      const stats = await manager.getStats();

      expect(stats.executions).toBe(5);
      expect(stats.cacheEntries).toBe(10);
      expect(stats.sessions).toBe(2);
      expect(stats.databaseSize).toBe(0);
    });
  });

  // ========================================================================
  // 用户ID管理测试
  // ========================================================================

  describe('用户ID管理', () => {
    it('应该设置用户ID', () => {
      const userId = 'test-user-id';

      manager.setUserId(userId);

      // 应该更新 localStorage
      expect(localStorage.getItem('excelmind:lastUserId')).toBe(userId);
    });

    it('应该返回会话ID', () => {
      const sessionId = manager.getSessionId();

      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
    });
  });

  // ========================================================================
  // 边界条件测试
  // ========================================================================

  describe('边界条件', () => {
    it('应该处理空的进度更新', async () => {
      const executionId = 'exec-empty';

      await manager.saveProgress(executionId, {
        taskId: executionId,
        status: 'running',
        progress: {
          percentage: 0,
          currentPhase: 'start',
          message: '',
        },
        steps: [],
        metadata: { createdAt: Date.now(), updatedAt: Date.now() },
      } as any);

      expect(mockIDB.put).toHaveBeenCalled();
    });

    it('应该处理特殊字符在键中', async () => {
      const specialKey = 'key:with:colons:and/slashes';

      await manager.saveTemporaryData(specialKey, { test: 'data' });

      expect(mockIDB.put).toHaveBeenCalled();
    });

    it('应该处理无用户ID的情况', async () => {
      const managerNoUser = new ClientStateManager();
      await managerNoUser.initialize();

      const result = await managerNoUser.getSettings();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NO_USER_ID');
    });
  });
});
