/**
 * SyncService 单元测试
 *
 * 测试范围:
 * - 双向同步
 * - 单向同步
 * - 冲突检测和解决
 * - 批量同步
 * - 在线状态处理
 */

import { SyncService, createSyncService } from '../SyncService';
import { StateManager } from '../StateManager';
import { ClientStateManager } from '../ClientStateManager';

// ============================================================================
// Mock Services
// ============================================================================

const mockStateManager = {
  saveExecutionState: jest.fn().mockResolvedValue(undefined),
  getExecutionState: jest.fn(),
};

const mockClientManager = {
  saveProgress: jest.fn().mockResolvedValue(undefined),
  getProgress: jest.fn(),
  getSessionExecutions: jest.fn().mockResolvedValue([]),
  saveTemporaryData: jest.fn().mockResolvedValue(undefined),
};

jest.mock('../StateManager', () => ({
  StateManager: jest.fn().mockImplementation(() => mockStateManager),
}));

jest.mock('../ClientStateManager', () => ({
  ClientStateManager: jest.fn().mockImplementation(() => mockClientManager),
}));

// ============================================================================
// 测试辅助函数
// ============================================================================

const createMockExecutionState = (id: string, timestamp: number) => ({
  id,
  status: 'running' as const,
  progress: {
    percentage: 50,
    currentPhase: 'processing' as const,
    message: 'Processing',
  },
  metadata: {
    updatedAt: timestamp,
    sessionId: 'test-session',
  },
});

// ============================================================================
// 测试套件
// ============================================================================

describe('SyncService', () => {
  let syncService: SyncService;

  beforeEach(async () => {
    jest.clearAllMocks();

    syncService = new SyncService({
      interval: 1000,
      batchSize: 10,
      conflictResolution: 'local',
    });

    await syncService.initialize(
      mockStateManager as any,
      mockClientManager as any
    );
  });

  afterEach(async () => {
    await syncService.destroy();
  });

  // ========================================================================
  // 初始化测试
  // ========================================================================

  describe('初始化', () => {
    it('应该成功初始化', async () => {
      expect(syncService).toBeInstanceOf(SyncService);
    });

    it('应该成功销毁', async () => {
      await syncService.destroy();

      // 不应该抛出异常
    });

    it('工厂函数应该创建实例', () => {
      const service = createSyncService();

      expect(service).toBeInstanceOf(SyncService);
    });

    it('应该合并自定义配置', () => {
      const service = createSyncService({
        interval: 5000,
        conflictResolution: 'remote',
      });

      expect(service).toBeInstanceOf(SyncService);
    });
  });

  // ========================================================================
  // 双向同步测试
  // ========================================================================

  describe('双向同步', () => {
    it('应该执行双向同步', async () => {
      const executionId = 'exec-1';
      const timestamp = Date.now();
      const state = createMockExecutionState(executionId, timestamp);

      mockClientManager.getProgress = jest.fn().mockResolvedValue({
        success: true,
        data: state,
      });

      mockStateManager.getExecutionState = jest.fn().mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await syncService.bidirectionalSync(executionId);

      expect(result.success).toBe(true);
      expect(result.synced).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.conflicts).toBe(0);
    });

    it('应该同步服务器数据到客户端', async () => {
      const executionId = 'exec-2';
      const timestamp = Date.now();
      const serverState = createMockExecutionState(executionId, timestamp);

      mockClientManager.getProgress = jest.fn().mockResolvedValue({
        success: true,
        data: null,
      });

      mockStateManager.getExecutionState = jest.fn().mockResolvedValue({
        success: true,
        data: serverState,
      });

      const result = await syncService.bidirectionalSync(executionId);

      expect(result.success).toBe(true);
      expect(result.synced).toBe(1);
      expect(mockClientManager.saveProgress).toHaveBeenCalledWith(
        executionId,
        serverState
      );
    });

    it('应该同步客户端数据到服务器', async () => {
      const executionId = 'exec-3';
      const timestamp = Date.now();
      const clientState = createMockExecutionState(executionId, timestamp);

      mockClientManager.getProgress = jest.fn().mockResolvedValue({
        success: true,
        data: clientState,
      });

      mockStateManager.getExecutionState = jest.fn().mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await syncService.bidirectionalSync(executionId);

      expect(result.success).toBe(true);
      expect(result.synced).toBe(1);
      expect(mockStateManager.saveExecutionState).toHaveBeenCalledWith(
        executionId,
        clientState
      );
    });

    it('应该处理无数据的情况', async () => {
      const executionId = 'exec-4';

      mockClientManager.getProgress = jest.fn().mockResolvedValue({
        success: true,
        data: null,
      });

      mockStateManager.getExecutionState = jest.fn().mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await syncService.bidirectionalSync(executionId);

      expect(result.success).toBe(true);
      expect(result.synced).toBe(0);
    });

    it('应该处理离线状态', async () => {
      // 设置离线
      (syncService as any).isOnline = false;

      const result = await syncService.bidirectionalSync('exec-5');

      expect(result.success).toBe(false);
    });

    it('应该批量双向同步', async () => {
      const executionIds = ['exec-6', 'exec-7', 'exec-8'];

      mockClientManager.getProgress = jest.fn().mockImplementation((id) => {
        return Promise.resolve({
          success: true,
          data: createMockExecutionState(id, Date.now()),
        });
      });

      mockStateManager.getExecutionState = jest.fn().mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await syncService.batchBidirectionalSync(executionIds);

      expect(result.success).toBe(true);
      expect(result.synced).toBe(3);
      expect(result.failed).toBe(0);
    });

    it('应该分批处理大量同步', async () => {
      const executionIds = Array.from({ length: 25 }, (_, i) => `batch-${i}`);

      mockClientManager.getProgress = jest.fn().mockImplementation((id) => {
        return Promise.resolve({
          success: true,
          data: createMockExecutionState(id, Date.now()),
        });
      });

      mockStateManager.getExecutionState = jest.fn().mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await syncService.batchBidirectionalSync(executionIds);

      expect(result.success).toBe(true);
      expect(result.synced).toBe(25);
    });
  });

  // ========================================================================
  // 单向同步测试
  // ========================================================================

  describe('单向同步', () => {
    it('应该同步到服务器', async () => {
      const executionId = 'exec-9';
      const data = createMockExecutionState(executionId, Date.now());

      await syncService.syncToServer(executionId, data);

      expect(mockStateManager.saveExecutionState).toHaveBeenCalledWith(
        executionId,
        data
      );
    });

    it('应该从服务器同步', async () => {
      const executionId = 'exec-10';
      const data = createMockExecutionState(executionId, Date.now());

      mockStateManager.getExecutionState = jest.fn().mockResolvedValue({
        success: true,
        data,
      });

      const result = await syncService.syncFromServer(executionId);

      expect(result).toEqual(data);
    });

    it('应该同步到客户端', async () => {
      const executionId = 'exec-11';
      const data = createMockExecutionState(executionId, Date.now());

      await syncService.syncToClient(executionId, data);

      expect(mockClientManager.saveProgress).toHaveBeenCalledWith(
        executionId,
        data
      );
    });

    it('应该在离线时添加到待同步列表', async () => {
      (syncService as any).isOnline = false;

      await syncService.syncToServer('exec-12', {});

      const pending = syncService.getPendingSync();

      expect(pending).toContain('exec-12');
    });

    it('应该返回 null 对于离线的从服务器同步', async () => {
      (syncService as any).isOnline = false;

      const result = await syncService.syncFromServer('exec-13');

      expect(result).toBeNull();
    });
  });

  // ========================================================================
  // 冲突检测和解决测试
  // ========================================================================

  describe('冲突检测和解决', () => {
    it('应该检测冲突', async () => {
      const timestamp = Date.now();
      const local = createMockExecutionState('exec-14', timestamp);
      const remote = createMockExecutionState('exec-14', timestamp + 500); // 时间差小于1秒

      const hasConflict = await (syncService as any).detectConflict(local, remote);

      expect(hasConflict).toBe(true);
    });

    it('应该使用本地策略解决冲突', async () => {
      (syncService as any).config.conflictResolution = 'local';

      const local = createMockExecutionState('exec-15', Date.now());
      const remote = createMockExecutionState('exec-15', Date.now());

      const resolved = await (syncService as any).resolveConflict('exec-15', local, remote);

      expect(resolved).toEqual(local);
    });

    it('应该使用远程策略解决冲突', async () => {
      (syncService as any).config.conflictResolution = 'remote';

      const local = createMockExecutionState('exec-16', Date.now());
      const remote = createMockExecutionState('exec-16', Date.now());

      const resolved = await (syncService as any).resolveConflict('exec-16', local, remote);

      expect(resolved).toEqual(remote);
    });

    it('应该合并策略解决冲突', async () => {
      (syncService as any).config.conflictResolution = 'merge';

      const local = {
        ...createMockExecutionState('exec-17', Date.now()),
        metadata: { updatedAt: Date.now(), localField: 'local' },
      };

      const remote = {
        ...createMockExecutionState('exec-17', Date.now() - 1000),
        metadata: { updatedAt: Date.now() - 1000, remoteField: 'remote' },
      };

      const resolved = await (syncService as any).resolveConflict('exec-17', local, remote);

      expect(resolved).toBeDefined();
      expect(resolved.metadata.conflictResolved).toBe(true);
    });

    it('应该使用手动策略保存冲突', async () => {
      (syncService as any).config.conflictResolution = 'manual';

      const local = createMockExecutionState('exec-18', Date.now());
      const remote = createMockExecutionState('exec-18', Date.now());

      mockClientManager.saveTemporaryData = jest.fn().mockResolvedValue(undefined);

      const resolved = await (syncService as any).resolveConflict('exec-18', local, remote);

      expect(resolved).toBeNull();
      expect(mockClientManager.saveTemporaryData).toHaveBeenCalled();
    });
  });

  // ========================================================================
  // 在线状态处理测试
  // ========================================================================

  describe('在线状态处理', () => {
    it('应该检查在线状态', () => {
      const isOnline = syncService.isSyncOnline();

      expect(isOnline).toBe(true);
    });

    it('应该返回待同步列表', async () => {
      (syncService as any).isOnline = false;
      (syncService as any).pendingSync.add('exec-19');
      (syncService as any).pendingSync.add('exec-20');

      const pending = syncService.getPendingSync();

      expect(pending).toHaveLength(2);
      expect(pending).toContain('exec-19');
      expect(pending).toContain('exec-20');
    });

    it('应该手动触发同步', async () => {
      const executionId = 'exec-21';
      (syncService as any).pendingSync.add(executionId);

      mockClientManager.getProgress = jest.fn().mockResolvedValue({
        success: true,
        data: createMockExecutionState(executionId, Date.now()),
      });

      mockStateManager.getExecutionState = jest.fn().mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await syncService.triggerSync([executionId]);

      expect(result.success).toBe(true);
      expect(result.synced).toBe(1);
    });

    it('应该处理空待同步列表', async () => {
      const result = await syncService.triggerSync([]);

      expect(result.success).toBe(true);
      expect(result.synced).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('应该处理同步失败', async () => {
      const executionId = 'exec-22';

      mockClientManager.getProgress = jest.fn().mockRejectedValue(new Error('Sync failed'));

      const result = await syncService.bidirectionalSync(executionId);

      expect(result.success).toBe(false);
      expect(result.failed).toBe(1);
      expect((syncService as any).pendingSync.has(executionId)).toBe(true);
    });
  });

  // ========================================================================
  // 状态管理器设置测试
  // ========================================================================

  describe('状态管理器设置', () => {
    it('应该设置状态管理器', () => {
      const newStateManager = {} as any;

      syncService.setStateManager(newStateManager);

      expect((syncService as any).stateManager).toBe(newStateManager);
    });

    it('应该设置客户端管理器', () => {
      const newClientManager = {} as any;

      syncService.setClientManager(newClientManager);

      expect((syncService as any).clientManager).toBe(newClientManager);
    });
  });

  // ========================================================================
  // 边界条件测试
  // ========================================================================

  describe('边界条件', () => {
    it('应该处理空的数据', async () => {
      mockClientManager.getProgress = jest.fn().mockResolvedValue({
        success: true,
        data: null,
      });

      mockStateManager.getExecutionState = jest.fn().mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await syncService.bidirectionalSync('exec-23');

      expect(result.success).toBe(true);
      expect(result.synced).toBe(0);
    });

    it('应该处理特殊字符在执行ID中', async () => {
      const specialId = 'exec:with:colons';

      mockClientManager.getProgress = jest.fn().mockResolvedValue({
        success: true,
        data: createMockExecutionState(specialId, Date.now()),
      });

      mockStateManager.getExecutionState = jest.fn().mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await syncService.bidirectionalSync(specialId);

      expect(result.success).toBe(true);
    });

    it('应该处理无状态管理器的情况', async () => {
      (syncService as any).stateManager = null;

      const result = await syncService.syncFromServer('exec-24');

      expect(result).toBeNull();
    });

    it('应该处理无客户端管理器的情况', async () => {
      (syncService as any).clientManager = null;

      await syncService.syncToClient('exec-25', {});

      // 应该不抛出异常
    });
  });

  // ========================================================================
  // 定时同步测试
  // ========================================================================

  describe('定时同步', () => {
    it('应该启动定时同步', async () => {
      const service = new SyncService({
        interval: 100,
      });

      await service.initialize();

      // 等待一段时间
      await new Promise(resolve => setTimeout(resolve, 200));

      await service.destroy();

      // 定时器应该被清理
    });

    it('应该在销毁时停止定时器', async () => {
      const service = new SyncService({
        interval: 100,
      });

      await service.initialize();
      await service.destroy();

      // 不应该抛出异常
    });
  });
});
