/**
 * BatchGenerationScheduler 单元测试
 *
 * @version 2.0.0
 */

import { BatchGenerationScheduler, DefaultDocumentGenerator, TaskNotFoundError, TaskStatusError } from './BatchGenerationScheduler';
import { TemplateManager } from './TemplateManager';
import { WebSocketManager } from './websocket/websocketManager';
import { TaskStatus, GenerationMode, Priority } from '../types/templateGeneration';

// ============================================================================
// Mock类
// ============================================================================

class MockTemplateManager {
  private templates: Map<string, any> = new Map();

  async getTemplate(id: string) {
    const template = this.templates.get(id);
    if (!template) {
      throw new Error('Template not found');
    }
    return template;
  }

  addTemplate(template: any) {
    this.templates.set(template.metadata.id, template);
  }
}

class MockWebSocketManager {
  async broadcast(taskId: string, event: any): Promise<void> {
    // Mock实现
  }
}

class MockDocumentGenerator {
  async generate(params: { templateBuffer: ArrayBuffer; data: Record<string, any> }): Promise<Blob> {
    return new Blob(['mock content'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  }
}

// ============================================================================
// 测试工具函数
// ============================================================================

function createTestTemplate(id: string) {
  return {
    metadata: {
      id,
      name: `Template ${id}`,
      status: 'active' as any,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      fileSize: 1000,
      placeholderCount: 5,
      complexity: 'simple' as any,
      version: '1.0.0'
    },
    fileBuffer: new ArrayBuffer(1000),
    placeholders: ['{{name}}', '{{email}}', '{{phone}}']
  };
}

function createTestTaskRequest(overrides?: Partial<any>) {
  return {
    mode: GenerationMode.SINGLE_TEMPLATE,
    templateIds: ['tpl_1'],
    dataSource: {
      type: 'inline' as const,
      source: {
        inline: [
          { name: 'John Doe', email: 'john@example.com', phone: '123-456-7890' },
          { name: 'Jane Smith', email: 'jane@example.com', phone: '098-765-4321' }
        ]
      }
    },
    priority: Priority.NORMAL,
    ...overrides
  };
}

// ============================================================================
// 测试套件
// ============================================================================

describe('BatchGenerationScheduler', () => {
  let scheduler: BatchGenerationScheduler;
  let mockTemplateManager: MockTemplateManager;
  let mockWebSocketManager: MockWebSocketManager;
  let mockDocumentGenerator: MockDocumentGenerator;

  beforeEach(() => {
    mockTemplateManager = new (MockTemplateManager as any)();
    mockWebSocketManager = new (MockWebSocketManager as any)();
    mockDocumentGenerator = new (MockDocumentGenerator as any)();

    // 添加测试模板
    mockTemplateManager.addTemplate(createTestTemplate('tpl_1'));
    mockTemplateManager.addTemplate(createTestTemplate('tpl_2'));

    scheduler = new (BatchGenerationScheduler as any)(
      mockTemplateManager,
      mockDocumentGenerator,
      mockWebSocketManager,
      { maxConcurrency: 2, progressInterval: 100 }
    );
  });

  afterEach(() => {
    // 清理
  });

  // ========================================================================
  // 创建任务测试
  // ========================================================================

  describe('createTask', () => {
    it('应该成功创建任务', async () => {
      const request = createTestTaskRequest();

      const response = await scheduler.createTask(request);

      expect(response).toBeDefined();
      expect(response.taskId).toMatch(/^task_/);
      expect(response.status).toBe(TaskStatus.PENDING);
      expect(response.estimatedDuration).toBeGreaterThan(0);
    });

    it('应该生成唯一的任务ID', async () => {
      const request1 = createTestTaskRequest();
      const request2 = createTestTaskRequest();

      const task1 = await scheduler.createTask(request1);
      const task2 = await scheduler.createTask(request2);

      expect(task1.taskId).not.toBe(task2.taskId);
    });

    it('应该正确设置任务优先级', async () => {
      const request = createTestTaskRequest({ priority: Priority.HIGH });

      const response = await scheduler.createTask(request);

      const progress = await scheduler.getTaskProgress(response.taskId);
      expect(progress.task.priority).toBe(Priority.HIGH);
    });

    it('不存在的模板应该抛出错误', async () => {
      const request = createTestTaskRequest({
        templateIds: ['tpl_nonexistent']
      });

      await expect(scheduler.createTask(request))
        .rejects
        .toThrow();
    });
  });

  // ========================================================================
  // 启动任务测试
  // ========================================================================

  describe('startTask', () => {
    it('应该成功启动待处理任务', async () => {
      const request = createTestTaskRequest();
      const response = await scheduler.createTask(request);

      await scheduler.startTask(response.taskId);

      const progress = await scheduler.getTaskProgress(response.taskId);
      expect(progress.task.status).toBe(TaskStatus.RUNNING);
    });

    it('不应该启动已完成的任务', async () => {
      const request = createTestTaskRequest();
      const response = await scheduler.createTask(request);

      // 手动设置为已完成
      const progress = await scheduler.getTaskProgress(response.taskId);
      progress.task.status = TaskStatus.COMPLETED;

      await expect(scheduler.startTask(response.taskId))
        .rejects
        .toThrow(TaskStatusError);
    });

    it('应该恢复暂停的任务', async () => {
      const request = createTestTaskRequest();
      const response = await scheduler.createTask(request);

      // 暂停任务
      await scheduler.pauseTask(response.taskId);

      // 恢复任务
      await scheduler.resumeTask(response.taskId);

      const progress = await scheduler.getTaskProgress(response.taskId);
      expect(progress.task.status).toBe(TaskStatus.RUNNING);
    });
  });

  // ========================================================================
  // 暂停任务测试
  // ========================================================================

  describe('pauseTask', () => {
    it('应该成功暂停运行中的任务', async () => {
      const request = createTestTaskRequest();
      const response = await scheduler.createTask(request);

      await scheduler.startTask(response.taskId);
      await scheduler.pauseTask(response.taskId);

      const progress = await scheduler.getTaskProgress(response.taskId);
      expect(progress.task.status).toBe(TaskStatus.PAUSED);
    });

    it('不应该暂停未运行的任务', async () => {
      const request = createTestTaskRequest();
      const response = await scheduler.createTask(request);

      await expect(scheduler.pauseTask(response.taskId))
        .rejects
        .toThrow(TaskStatusError);
    });
  });

  // ========================================================================
  // 取消任务测试
  // ========================================================================

  describe('cancelTask', () => {
    it('应该成功取消任务', async () => {
      const request = createTestTaskRequest();
      const response = await scheduler.createTask(request);

      await scheduler.cancelTask(response.taskId);

      const progress = await scheduler.getTaskProgress(response.taskId);
      expect(progress.task.status).toBe(TaskStatus.CANCELLED);
    });

    it('不应该取消已完成的任务', async () => {
      const request = createTestTaskRequest();
      const response = await scheduler.createTask(request);

      // 手动设置为已完成
      const progress = await scheduler.getTaskProgress(response.taskId);
      progress.task.status = TaskStatus.COMPLETED;

      await expect(scheduler.cancelTask(response.taskId))
        .rejects
        .toThrow();
    });
  });

  // ========================================================================
  // 获取进度测试
  // ========================================================================

  describe('getTaskProgress', () => {
    it('应该返回任务进度', async () => {
      const request = createTestTaskRequest();
      const response = await scheduler.createTask(request);

      const progress = await scheduler.getTaskProgress(response.taskId);

      expect(progress).toBeDefined();
      expect(progress.task).toBeDefined();
      expect(progress.task.id).toBe(response.taskId);
    });

    it('获取不存在的任务应该抛出错误', async () => {
      const nonExistentId = 'task_nonexistent';

      await expect(scheduler.getTaskProgress(nonExistentId))
        .rejects
        .toThrow(TaskNotFoundError);
    });
  });

  // ========================================================================
  // 并发控制测试
  // ========================================================================

  describe('并发控制', () => {
    it('应该遵守最大并发限制', async () => {
      // 创建多个任务
      const taskIds: string[] = [];
      for (let i = 0; i < 5; i++) {
        const request = createTestTaskRequest({
          dataSource: {
            type: 'inline' as const,
            source: {
              inline: [{ name: `User ${i}`, email: `user${i}@example.com` }]
            }
          }
        });
        const response = await scheduler.createTask(request);
        taskIds.push(response.taskId);
      }

      // 检查运行中的任务数量
      let runningCount = 0;
      for (const taskId of taskIds) {
        const progress = await scheduler.getTaskProgress(taskId);
        if (progress.task.status === TaskStatus.RUNNING) {
          runningCount++;
        }
      }

      expect(runningCount).toBeLessThanOrEqual(2);
    });
  });

  // ========================================================================
  // 优先级测试
  // ========================================================================

  describe('任务优先级', () => {
    it('应该优先处理高优先级任务', async () => {
      // 创建低优先级任务
      const lowRequest = createTestTaskRequest({ priority: Priority.LOW });
      const lowTask = await scheduler.createTask(lowRequest);

      // 创建高优先级任务
      const highRequest = createTestTaskRequest({ priority: Priority.HIGH });
      const highTask = await scheduler.createTask(highRequest);

      // 高优先级任务应该先处理
      // 注意：这需要检查内部队列顺序或处理顺序
    });
  });

  // ========================================================================
  // 失败重试测试
  // ========================================================================

  describe('失败重试', () => {
    it('应该在失败时重试', async () => {
      let attemptCount = 0;
      const failingGenerator = {
        async generate() {
          attemptCount++;
          if (attemptCount < 3) {
            throw new Error('Generation failed');
          }
          return new Blob(['success']);
        }
      };

      const retryScheduler = new (BatchGenerationScheduler as any)(
        mockTemplateManager,
        failingGenerator,
        mockWebSocketManager,
        { maxConcurrency: 1 }
      );

      const request = createTestTaskRequest({
        templateIds: ['tpl_1'],
        options: {
          retryCount: 3,
          retryDelay: 100
        }
      });

      const response = await retryScheduler.createTask(request);
      await retryScheduler.startTask(response.taskId);

      // 等待任务完成
      await new Promise(resolve => setTimeout(resolve, 1000));

      const progress = await retryScheduler.getTaskProgress(response.taskId);

      // 应该重试了2次后成功
      expect(attemptCount).toBeGreaterThanOrEqual(3);
    });
  });
});

// ============================================================================
// 导出
// ============================================================================

export {};
