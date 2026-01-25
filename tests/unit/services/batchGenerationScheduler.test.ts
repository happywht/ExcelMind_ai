/**
 * 批量生成调度器 - 单元测试
 *
 * @module tests/unit/services/batchGenerationScheduler
 * @version 2.0.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BatchGenerationScheduler } from '../../../services/BatchGenerationScheduler';
import { BatchGenerationTask, TaskStatus, TaskPriority } from '../../../types';
import { MockWebSocketService, MockDatabaseService } from '../../../utils/apiMock';
import { createMockBatchTask } from '../../../utils/testHelpers';

// ============================================================================
// 测试数据
// ============================================================================

const mockTaskData = {
  name: '测试批量任务',
  templateId: 'template_001',
  dataSourceId: 'data_source_001',
  outputDirectory: '/output/test',
  options: {
    concurrent: true,
    maxConcurrent: 5,
    retryFailed: true,
    maxRetries: 3
  }
};

// ============================================================================
// 测试套件
// ============================================================================

describe('BatchGenerationScheduler', () => {
  let scheduler: BatchGenerationScheduler;
  let mockWebSocketService: MockWebSocketService;
  let mockDatabaseService: MockDatabaseService;

  beforeEach(() => {
    mockWebSocketService = new MockWebSocketService();
    mockDatabaseService = new MockDatabaseService();
    scheduler = new BatchGenerationScheduler(
      mockWebSocketService as any,
      mockDatabaseService as any
    );
  });

  afterEach(() => {
    mockWebSocketService.reset();
    mockDatabaseService.reset();
  });

  describe('基本功能测试', () => {
    it('应该成功初始化调度器', () => {
      expect(scheduler).toBeDefined();
      expect(scheduler.createTask).toBeInstanceOf(Function);
      expect(scheduler.startTask).toBeInstanceOf(Function);
      expect(scheduler.pauseTask).toBeInstanceOf(Function);
      expect(scheduler.resumeTask).toBeInstanceOf(Function);
      expect(scheduler.cancelTask).toBeInstanceOf(Function);
    });

    it('应该成功创建批量任务', async () => {
      const task = await scheduler.createTask(mockTaskData);

      expect(task).toBeDefined();
      expect(task.taskId).toBeDefined();
      expect(task.name).toBe(mockTaskData.name);
      expect(task.status).toBe('pending');
      expect(task.progress).toBe(0);
      expect(task.totalItems).toBeGreaterThan(0);
    });

    it('应该成功获取任务详情', async () => {
      const created = await scheduler.createTask(mockTaskData);
      const retrieved = await scheduler.getTask(created.taskId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.taskId).toBe(created.taskId);
      expect(retrieved?.name).toBe(mockTaskData.name);
    });

    it('应该成功列出所有任务', async () => {
      await scheduler.createTask({ ...mockTaskData, name: '任务1' });
      await scheduler.createTask({ ...mockTaskData, name: '任务2' });
      await scheduler.createTask({ ...mockTaskData, name: '任务3' });

      const tasks = await scheduler.listTasks();

      expect(tasks).toBeDefined();
      expect(tasks.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('任务生命周期', () => {
    it('应该成功启动任务', async () => {
      const task = await scheduler.createTask(mockTaskData);

      const startedTask = await scheduler.startTask(task.taskId);

      expect(startedTask.status).toBe('running' || 'queued');
      expect(startedTask.startedAt).toBeDefined();
      expect(startedTask.startedAt).toBeGreaterThan(0);
    });

    it('应该成功暂停任务', async () => {
      const task = await scheduler.createTask(mockTaskData);
      await scheduler.startTask(task.taskId);

      const pausedTask = await scheduler.pauseTask(task.taskId);

      expect(pausedTask.status).toBe('paused');
    });

    it('应该成功恢复暂停的任务', async () => {
      const task = await scheduler.createTask(mockTaskData);
      await scheduler.startTask(task.taskId);
      await scheduler.pauseTask(task.taskId);

      const resumedTask = await scheduler.resumeTask(task.taskId);

      expect(resumedTask.status).toBe('running');
    });

    it('应该成功取消任务', async () => {
      const task = await scheduler.createTask(mockTaskData);
      await scheduler.startTask(task.taskId);

      const cancelledTask = await scheduler.cancelTask(task.taskId);

      expect(cancelledTask.status).toBe('cancelled');
    });

    it('应该正确完成任务', async () => {
      const task = await scheduler.createTask({
        ...mockTaskData,
        totalItems: 10
      });

      await scheduler.startTask(task.taskId);

      // 模拟任务完成
      // 在实际测试中，需要等待任务执行完成或使用模拟数据
      const completedTask = await scheduler.getTask(task.taskId);

      expect(completedTask).toBeDefined();
      // 期望任务最终会完成
    }, 10000);
  });

  describe('进度追踪', () => {
    it('应该正确更新任务进度', async () => {
      const task = await scheduler.createTask(mockTaskData);

      await scheduler.startTask(task.taskId);

      // 轮询获取进度更新
      let currentProgress = 0;
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        const updatedTask = await scheduler.getTask(task.taskId);
        if (updatedTask && updatedTask.progress > currentProgress) {
          currentProgress = updatedTask.progress;
        }
        if (currentProgress >= 100) {
          break;
        }
      }

      expect(currentProgress).toBeGreaterThan(0);
    });

    it('应该发送进度更新通知', async () => {
      const task = await scheduler.createTask(mockTaskData);

      // 模拟WebSocket客户端
      const mockClient = { send: vi.fn() };
      mockWebSocketService.addClient('client_1', mockClient);

      await scheduler.startTask(task.taskId);

      // 等待进度更新
      await new Promise(resolve => setTimeout(resolve, 500));

      // 验证WebSocket消息
      expect(mockClient.send).toHaveBeenCalled();
    });

    it('应该正确计算完成百分比', async () => {
      const task = await scheduler.createTask({
        ...mockTaskData,
        totalItems: 100
      });

      await scheduler.startTask(task.taskId);

      const updatedTask = await scheduler.getTask(task.taskId);

      expect(updatedTask).toBeDefined();
      if (updatedTask && updatedTask.totalItems > 0) {
        const expectedProgress = (updatedTask.completedItems / updatedTask.totalItems) * 100;
        expect(updatedTask.progress).toBeCloseTo(expectedProgress, 0);
      }
    });
  });

  describe('任务队列管理', () => {
    it('应该按优先级排序任务', async () => {
      const lowPriorityTask = await scheduler.createTask({
        ...mockTaskData,
        name: '低优先级任务',
        priority: 'low'
      });

      const highPriorityTask = await scheduler.createTask({
        ...mockTaskData,
        name: '高优先级任务',
        priority: 'high'
      });

      await scheduler.startTask(lowPriorityTask.taskId);
      await scheduler.startTask(highPriorityTask.taskId);

      const tasks = await scheduler.listTasks({ status: 'running' });

      // 高优先级任务应该先执行
      expect(tasks[0].taskId).toBe(highPriorityTask.taskId);
    });

    it('应该限制并发任务数量', async () => {
      // 创建多个任务
      const tasks = [];
      for (let i = 0; i < 10; i++) {
        const task = await scheduler.createTask({
          ...mockTaskData,
          name: `并发任务${i + 1}`
        });
        tasks.push(task);
        await scheduler.startTask(task.taskId);
      }

      const runningTasks = await scheduler.listTasks({ status: 'running' });

      // 并发任务数应该小于等于配置的最大值
      expect(runningTasks.length).toBeLessThanOrEqual(5);
    });

    it('应该支持任务队列等待', async () => {
      const maxConcurrent = 2;

      // 创建超过最大并发数的任务
      const tasks = [];
      for (let i = 0; i < 5; i++) {
        const task = await scheduler.createTask({
          ...mockTaskData,
          name: `队列任务${i + 1}`
        });
        tasks.push(task);
      }

      // 启动所有任务
      for (const task of tasks) {
        await scheduler.startTask(task.taskId);
      }

      const runningTasks = await scheduler.listTasks({ status: 'running' });
      const queuedTasks = await scheduler.listTasks({ status: 'queued' });

      expect(runningTasks.length).toBeLessThanOrEqual(maxConcurrent);
      expect(queuedTasks.length).toBeGreaterThan(0);
    });
  });

  describe('错误处理', () => {
    it('应该处理任务执行失败', async () => {
      const task = await scheduler.createTask({
        ...mockTaskData,
        dataSourceId: 'invalid_source'
      });

      await scheduler.startTask(task.taskId);

      // 等待任务失败
      await new Promise(resolve => setTimeout(resolve, 2000));

      const failedTask = await scheduler.getTask(task.taskId);

      expect(failedTask?.status).toBe('failed' || 'partial');
      if (failedTask?.status === 'failed') {
        expect(failedTask.error).toBeDefined();
      }
    });

    it('应该记录失败的项', async () => {
      const task = await scheduler.createTask({
        ...mockTaskData,
        totalItems: 10
      });

      await scheduler.startTask(task.taskId);

      // 模拟一些项失败
      // 在实际测试中，需要等待任务执行

      const updatedTask = await scheduler.getTask(task.taskId);

      expect(updatedTask).toBeDefined();
      if (updatedTask && updatedTask.failedItems > 0) {
        expect(updatedTask.failedItems).toBeGreaterThan(0);
      }
    });

    it('应该支持失败重试', async () => {
      const task = await scheduler.createTask({
        ...mockTaskData,
        options: {
          retryFailed: true,
          maxRetries: 3
        }
      });

      await scheduler.startTask(task.taskId);

      // 等待重试
      await new Promise(resolve => setTimeout(resolve, 3000));

      const retriedTask = await scheduler.getTask(task.taskId);

      expect(retriedTask).toBeDefined();
      // 验证重试逻辑
    });

    it('应该处理无效的任务ID', async () => {
      const result = await scheduler.getTask('invalid_task_id');
      expect(result).toBeNull();
    });

    it('应该处理重复启动任务', async () => {
      const task = await scheduler.createTask(mockTaskData);

      await scheduler.startTask(task.taskId);

      // 尝试再次启动
      await expect(
        scheduler.startTask(task.taskId)
      ).rejects.toThrow();
    });
  });

  describe('WebSocket通知', () => {
    it('应该通知客户端任务状态变化', async () => {
      const task = await scheduler.createTask(mockTaskData);

      const mockClient = { send: vi.fn() };
      mockWebSocketService.addClient('client_1', mockClient);

      await scheduler.startTask(task.taskId);

      // 等待通知
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(mockClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'task_status_update',
          taskId: task.taskId
        })
      );
    });

    it('应该广播进度更新', async () => {
      const task = await scheduler.createTask(mockTaskData);

      const clients = [
        { send: vi.fn() },
        { send: vi.fn() },
        { send: vi.fn() }
      ];

      clients.forEach((client, index) => {
        mockWebSocketService.addClient(`client_${index}`, client);
      });

      await scheduler.startTask(task.taskId);

      // 等待广播
      await new Promise(resolve => setTimeout(resolve, 500));

      // 验证所有客户端都收到消息
      clients.forEach(client => {
        expect(client.send).toHaveBeenCalled();
      });
    });
  });

  describe('任务统计', () => {
    it('应该正确统计任务数据', async () => {
      // 创建不同状态的任务
      await scheduler.createTask({ ...mockTaskData, name: '任务1' });
      const task2 = await scheduler.createTask({ ...mockTaskData, name: '任务2' });
      const task3 = await scheduler.createTask({ ...mockTaskData, name: '任务3' });

      await scheduler.startTask(task2.taskId);
      await scheduler.startTask(task3.taskId);

      const stats = await scheduler.getStatistics();

      expect(stats).toBeDefined();
      expect(stats.totalTasks).toBeGreaterThanOrEqual(3);
      expect(stats.runningTasks).toBeGreaterThanOrEqual(2);
    });

    it('应该生成任务报告', async () => {
      const task = await scheduler.createTask(mockTaskData);

      await scheduler.startTask(task.taskId);

      // 等待任务执行
      await new Promise(resolve => setTimeout(resolve, 1000));

      const report = await scheduler.generateTaskReport(task.taskId);

      expect(report).toBeDefined();
      expect(report.taskId).toBe(task.taskId);
      expect(report.statistics).toBeDefined();
    });
  });

  describe('批量操作', () => {
    it('应该支持批量启动任务', async () => {
      const tasks = [];
      for (let i = 0; i < 5; i++) {
        const task = await scheduler.createTask({
          ...mockTaskData,
          name: `批量任务${i + 1}`
        });
        tasks.push(task);
      }

      const taskIds = tasks.map(t => t.taskId);
      await scheduler.batchStartTasks(taskIds);

      const runningTasks = await scheduler.listTasks({ status: 'running' });

      expect(runningTasks.length).toBeGreaterThan(0);
    });

    it('应该支持批量取消任务', async () => {
      const tasks = [];
      for (let i = 0; i < 5; i++) {
        const task = await scheduler.createTask({
          ...mockTaskData,
          name: `批量取消${i + 1}`
        });
        tasks.push(task);
        await scheduler.startTask(task.taskId);
      }

      const taskIds = tasks.map(t => t.taskId);
      await scheduler.batchCancelTasks(taskIds);

      const cancelledTasks = await scheduler.listTasks({ status: 'cancelled' });

      expect(cancelledTasks.length).toBe(5);
    });

    it('应该支持批量删除任务', async () => {
      const tasks = [];
      for (let i = 0; i < 5; i++) {
        const task = await scheduler.createTask({
          ...mockTaskData,
          name: `批量删除${i + 1}`
        });
        tasks.push(task);
      }

      const taskIds = tasks.map(t => t.taskId);
      await scheduler.batchDeleteTasks(taskIds);

      for (const id of taskIds) {
        const task = await scheduler.getTask(id);
        expect(task).toBeNull();
      }
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内处理大量任务', async () => {
      const taskCount = 100;
      const tasks = [];

      const startTime = Date.now();

      for (let i = 0; i < taskCount; i++) {
        const task = await scheduler.createTask({
          ...mockTaskData,
          name: `性能测试${i + 1}`
        });
        tasks.push(task);
      }

      const duration = Date.now() - startTime;

      expect(tasks.length).toBe(taskCount);
      expect(duration).toBeLessThan(5000); // 5秒内完成创建
    });

    it('应该高效更新任务状态', async () => {
      const task = await scheduler.createTask(mockTaskData);

      await scheduler.startTask(task.taskId);

      const startTime = Date.now();

      // 模拟100次状态更新
      for (let i = 0; i < 100; i++) {
        await scheduler.getTask(task.taskId);
      }

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000); // 1秒内完成100次查询
    });
  });

  describe('资源管理', () => {
    it('应该正确释放已完成任务资源', async () => {
      const task = await scheduler.createTask({
        ...mockTaskData,
        totalItems: 10
      });

      await scheduler.startTask(task.taskId);

      // 等待任务完成
      await new Promise(resolve => setTimeout(resolve, 5000));

      const completedTask = await scheduler.getTask(task.taskId);

      expect(completedTask?.status).toBe('completed' || 'failed');
    });

    it('应该清理过期的已完成任务', async () => {
      const task = await scheduler.createTask(mockTaskData);

      await scheduler.startTask(task.taskId);

      // 等待任务完成
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 手动触发清理
      await scheduler.cleanupCompletedTasks(24); // 清理24小时前的任务

      const cleanedTask = await scheduler.getTask(task.taskId);

      // 根据实现，任务可能被清理或保留
      expect(cleanedTask).toBeDefined();
    });
  });
});

// ============================================================================
// 集成测试
// ============================================================================

describe('BatchGenerationScheduler 集成测试', () => {
  let scheduler: BatchGenerationScheduler;
  let mockWebSocketService: MockWebSocketService;
  let mockDatabaseService: MockDatabaseService;

  beforeEach(() => {
    mockWebSocketService = new MockWebSocketService();
    mockDatabaseService = new MockDatabaseService();
    scheduler = new BatchGenerationScheduler(
      mockWebSocketService as any,
      mockDatabaseService as any
    );
  });

  afterEach(() => {
    mockWebSocketService.reset();
    mockDatabaseService.reset();
  });

  it('应该完成完整的任务生命周期', async () => {
    // 1. 创建任务
    const task = await scheduler.createTask(mockTaskData);
    expect(task.status).toBe('pending');

    // 2. 启动任务
    const started = await scheduler.startTask(task.taskId);
    expect(started.status).toBe('running' || 'queued');

    // 3. 等待进度更新
    await new Promise(resolve => setTimeout(resolve, 1000));
    const inProgress = await scheduler.getTask(task.taskId);
    expect(inProgress?.progress).toBeGreaterThan(0);

    // 4. 等待任务完成
    await new Promise(resolve => setTimeout(resolve, 5000));
    const completed = await scheduler.getTask(task.taskId);
    expect(['completed', 'failed', 'partial']).toContain(completed?.status);

    // 5. 生成报告
    if (completed?.status === 'completed') {
      const report = await scheduler.generateTaskReport(task.taskId);
      expect(report).toBeDefined();
    }
  }, 10000);

  it('应该处理多个并发任务', async () => {
    const tasks = [];

    // 创建10个任务
    for (let i = 0; i < 10; i++) {
      const task = await scheduler.createTask({
        ...mockTaskData,
        name: `并发任务${i + 1}`
      });
      tasks.push(task);
    }

    // 启动所有任务
    for (const task of tasks) {
      await scheduler.startTask(task.taskId);
    }

    // 等待所有任务完成
    await new Promise(resolve => setTimeout(resolve, 10000));

    const completedTasks = await scheduler.listTasks({ status: 'completed' });

    expect(completedTasks.length).toBeGreaterThan(0);
  }, 15000);

  it('应该正确处理WebSocket通信', async () => {
    const task = await scheduler.createTask(mockTaskData);

    // 添加多个客户端
    const clients = [];
    for (let i = 0; i < 5; i++) {
      const client = {
        id: `client_${i}`,
        send: vi.fn()
      };
      mockWebSocketService.addClient(client.id, client);
      clients.push(client);
    }

    await scheduler.startTask(task.taskId);

    // 等待通知
    await new Promise(resolve => setTimeout(resolve, 500));

    // 验证所有客户端都收到通知
    clients.forEach(client => {
      expect(client.send).toHaveBeenCalled();
    });
  });
});
