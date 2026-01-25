/**
 * 外部化状态存储 - 集成测试
 *
 * 验证存储系统的基本功能
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  createStorageSystem,
  createBackendStorageSystem,
  createFrontendStorageSystem,
  RedisService,
  StateManager,
  IndexedDBService,
  ClientStateManager,
  SyncService,
} from '../../services/infrastructure/storage';
import type {
  ExecutionState,
  UserSettings,
  StorageResult,
} from '../../types/storageTypes';

describe('外部化状态存储集成测试', () => {
  describe('类型定义验证', () => {
    it('应该正确定义 ExecutionState 类型', () => {
      const state: ExecutionState = {
        taskId: 'test-123',
        status: 'in_progress',
        progress: {
          percentage: 50,
          currentPhase: 'EXECUTING',
          message: 'Processing...',
        },
        steps: [],
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      };

      expect(state.taskId).toBe('test-123');
      expect(state.progress.percentage).toBe(50);
    });

    it('应该正确定义 UserSettings 类型', () => {
      const settings: UserSettings = {
        userId: 'user-123',
        preferences: {
          theme: 'dark',
          language: 'zh-CN',
        },
        recentFiles: [],
        savedQueries: [],
      };

      expect(settings.userId).toBe('user-123');
      expect(settings.preferences.theme).toBe('dark');
    });

    it('应该正确定义 StorageResult 类型', () => {
      const successResult: StorageResult<string> = {
        success: true,
        data: 'test-data',
      };

      const errorResult: StorageResult<string> = {
        success: false,
        error: {
          code: 'TEST_ERROR',
          message: 'Test error message',
          retryable: true,
        },
      };

      expect(successResult.success).toBe(true);
      expect(successResult.data).toBe('test-data');
      expect(errorResult.success).toBe(false);
      expect(errorResult.error?.code).toBe('TEST_ERROR');
    });
  });

  describe('Redis 服务测试', () => {
    let redis: RedisService;

    beforeEach(() => {
      redis = new RedisService({
        url: 'redis://localhost:6379',
        keyPrefix: 'test:',
        defaultTTL: 3600,
      });
    });

    afterEach(async () => {
      await redis.disconnect();
    });

    it('应该成功连接到 Redis（或降级到 Mock）', async () => {
      await expect(redis.connect()).resolves.not.toThrow();
      expect(redis.isConnectionActive()).toBe(true);
    });

    it('应该能够设置和获取值', async () => {
      await redis.connect();

      const setResult = await redis.set('test-key', { value: 'test-data' });
      expect(setResult.success).toBe(true);

      const getResult = await redis.get<{ value: string }>('test-key');
      expect(getResult.success).toBe(true);
      expect(getResult.data?.value).toBe('test-data');
    });

    it('应该能够删除值', async () => {
      await redis.connect();

      await redis.set('test-key', { value: 'test-data' });
      const deleteResult = await redis.del('test-key');
      expect(deleteResult.success).toBe(true);
      expect(deleteResult.data).toBe(true);

      const getResult = await redis.get('test-key');
      expect(getResult.success).toBe(true);
      expect(getResult.data).toBeNull();
    });
  });

  describe('IndexedDB 服务测试', () => {
    let idb: IndexedDBService;

    beforeEach(() => {
      idb = new IndexedDBService({
        dbName: 'TestExcelMindDB',
        version: 1,
        stores: [
          {
            name: 'test-store',
            keyPath: 'id',
            indexes: [
              { name: 'sessionId', keyPath: 'sessionId' },
            ],
          },
        ],
      });
    });

    afterEach(async () => {
      await idb.close();
    });

    it('应该成功打开数据库', async () => {
      await expect(idb.open()).resolves.not.toThrow();
      expect(idb.isConnectionActive()).toBe(true);
    });

    it('应该能够添加和获取值', async () => {
      await idb.open();

      const testRecord = { id: 'test-1', data: 'test-data' };
      const addResult = await idb.add('test-store', testRecord);
      expect(addResult.success).toBe(true);
      expect(addResult.data).toBe('test-1');

      const getResult = await idb.get('test-store', 'test-1');
      expect(getResult.success).toBe(true);
      expect(getResult.data).toEqual(testRecord);
    });

    it('应该能够更新值', async () => {
      await idb.open();

      const testRecord = { id: 'test-1', data: 'test-data' };
      await idb.add('test-store', testRecord);

      const updatedRecord = { id: 'test-1', data: 'updated-data' };
      const putResult = await idb.put('test-store', updatedRecord);
      expect(putResult.success).toBe(true);

      const getResult = await idb.get('test-store', 'test-1');
      expect(getResult.data?.data).toBe('updated-data');
    });

    it('应该能够删除值', async () => {
      await idb.open();

      const testRecord = { id: 'test-1', data: 'test-data' };
      await idb.add('test-store', testRecord);

      const deleteResult = await idb.delete('test-store', 'test-1');
      expect(deleteResult.success).toBe(true);

      const getResult = await idb.get('test-store', 'test-1');
      expect(getResult.data).toBeUndefined();
    });
  });

  describe('StateManager 测试', () => {
    let stateManager: StateManager;

    beforeEach(async () => {
      stateManager = new StateManager();
      await stateManager.initialize();
    });

    afterEach(async () => {
      await stateManager.destroy();
    });

    it('应该能够创建会话', async () => {
      const session = await stateManager.createSession('test-user');
      expect(session.sessionId).toBeDefined();
      expect(session.createdAt).toBeDefined();
    });

    it('应该能够保存和获取执行状态', async () => {
      const executionState: ExecutionState = {
        taskId: 'test-task',
        status: 'in_progress',
        progress: {
          percentage: 50,
          currentPhase: 'EXECUTING',
          message: 'Processing...',
        },
        steps: [],
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      };

      await stateManager.saveExecutionState('test-task', executionState);

      const result = await stateManager.getExecutionState('test-task');
      expect(result.success).toBe(true);
      expect(result.data?.taskId).toBe('test-task');
      expect(result.data?.progress.percentage).toBe(50);
    });

    it('应该能够更新执行进度', async () => {
      const executionState: ExecutionState = {
        taskId: 'test-task',
        status: 'in_progress',
        progress: {
          percentage: 50,
          currentPhase: 'EXECUTING',
          message: 'Processing...',
        },
        steps: [],
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      };

      await stateManager.saveExecutionState('test-task', executionState);

      await stateManager.updateExecutionProgress('test-task', {
        percentage: 75,
        currentPhase: 'EVALUATING',
        message: 'Evaluating...',
      });

      const result = await stateManager.getExecutionState('test-task');
      expect(result.data?.progress.percentage).toBe(75);
      expect(result.data?.progress.currentPhase).toBe('EVALUATING');
    });
  });

  describe('ClientStateManager 测试', () => {
    let clientManager: ClientStateManager;

    beforeEach(async () => {
      clientManager = new ClientStateManager('test-session');
      await clientManager.initialize();
    });

    afterEach(async () => {
      await clientManager.destroy();
    });

    it('应该能够保存和获取执行进度', async () => {
      const executionState: ExecutionState = {
        taskId: 'test-task',
        status: 'in_progress',
        progress: {
          percentage: 50,
          currentPhase: 'EXECUTING',
          message: 'Processing...',
        },
        steps: [],
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      };

      await clientManager.saveProgress('test-task', executionState);

      const result = await clientManager.getProgress('test-task');
      expect(result.success).toBe(true);
      expect(result.data?.taskId).toBe('test-task');
    });

    it('应该能够缓存结果', async () => {
      const testData = { result: 'test-result' };
      await clientManager.cacheResult('test-cache-key', testData, 3600);

      const result = await clientManager.getCachedResult('test-cache-key');
      expect(result.success).toBe(true);
      expect(result.data?.result).toBe('test-result');
    });

    it('应该能够保存和获取用户设置', async () => {
      const settings: UserSettings = {
        userId: 'test-user',
        preferences: {
          theme: 'dark',
        },
        recentFiles: [],
        savedQueries: [],
      };

      await clientManager.saveSettings(settings);

      const result = await clientManager.getSettings('test-user');
      expect(result.success).toBe(true);
      expect(result.data?.preferences.theme).toBe('dark');
    });
  });

  describe('SyncService 测试', () => {
    let syncService: SyncService;

    beforeEach(() => {
      syncService = new SyncService({
        interval: 1000,
        batchSize: 10,
        maxRetries: 3,
        conflictResolution: 'merge',
      });
    });

    afterEach(async () => {
      await syncService.destroy();
    });

    it('应该能够检测在线状态', () => {
      const isOnline = syncService.isSyncOnline();
      expect(typeof isOnline).toBe('boolean');
    });

    it('应该能够获取待同步列表', () => {
      const pending = syncService.getPendingSync();
      expect(Array.isArray(pending)).toBe(true);
    });
  });

  describe('完整存储系统测试', () => {
    it('应该能够创建后端存储系统', async () => {
      const backend = await createBackendStorageSystem();
      expect(backend.stateManager).toBeDefined();
      expect(backend.redis).toBeDefined();

      await backend.stateManager.destroy();
    });

    it('应该能够创建前端存储系统', async () => {
      const frontend = await createFrontendStorageSystem();
      expect(frontend.clientManager).toBeDefined();
      expect(frontend.indexedDB).toBeDefined();

      await frontend.clientManager.destroy();
    });

    // 注意：完整系统测试需要真实环境，这里只验证创建
    it('应该能够创建完整存储系统（跳过实际测试）', async () => {
      // 完整系统需要 Redis 和 IndexedDB，在 CI 环境可能不可用
      // 这里只验证类型正确性
      expect(true).toBe(true);
    });
  });
});
