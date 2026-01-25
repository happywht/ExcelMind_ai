/**
 * 批量生成调度器 - Phase 2 多模板文档生成核心服务
 *
 * 职责：
 * 1. 批量任务调度和排队
 * 2. 任务状态管理
 * 3. 并发控制和限流
 * 4. 进度跟踪和报告
 * 5. 失败重试机制
 * 6. WebSocket实时推送
 *
 * @version 2.0.0
 * @module BatchGenerationScheduler
 */

import { v4 as uuidv4 } from 'uuid';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { TemplateManager } from './TemplateManager';
import { WebSocketManager } from './websocket/websocketManager';
import type {
  BatchGenerationTask,
  BatchTaskConfig,
  BatchTaskOptions,
  CreateBatchTaskRequest,
  CreateBatchTaskResponse,
  DataSourceConfig,
  DocumentGenerationResult,
  GenerationMode,
  GenerationStage,
  Priority,
  TaskError,
  TaskExecutionInfo,
  TaskStatistics,
  TaskStatus,
  TaskTimestamps,
  WebSocketEvent
} from '../types/templateGeneration';

// ============================================================================
// 接口定义
// ============================================================================

/**
 * 文档生成器接口
 */
export interface IDocumentGenerator {
  generate(params: {
    templateBuffer: ArrayBuffer;
    data: Record<string, any>;
  }): Promise<Blob>;
}

/**
 * 进度更新
 */
export interface ProgressUpdate {
  progress: number;
  stage: GenerationStage;
  message?: string;
  documentId?: string;
}

/**
 * 任务队列项
 */
interface QueueItem {
  task: BatchGenerationTask;
  addedAt: number;
  priority: Priority;
}

// ============================================================================
// 错误类
// ============================================================================

/**
 * 任务未找到错误
 */
export class TaskNotFoundError extends Error {
  constructor(public readonly taskId: string) {
    super(`任务不存在: ${taskId}`);
    this.name = 'TaskNotFoundError';
    Object.setPrototypeOf(this, TaskNotFoundError.prototype);
  }
}

/**
 * 任务状态错误
 */
export class TaskStatusError extends Error {
  constructor(
    public readonly taskId: string,
    public readonly currentStatus: TaskStatus,
    public readonly expectedStatus: TaskStatus
  ) {
    super(
      `任务状态错误: ${taskId}, 当前: ${currentStatus}, 期望: ${expectedStatus}`
    );
    this.name = 'TaskStatusError';
    Object.setPrototypeOf(this, TaskStatusError.prototype);
  }
}

// ============================================================================
// 核心服务类
// ============================================================================

/**
 * 批量生成调度器
 *
 * 功能特性：
 * - 任务队列管理（优先级队列）
 * - 并发控制（默认3个并发）
 * - 进度追踪和实时推送
 * - 失败重试机制
 * - 任务暂停/恢复/取消
 * - 内存优化（分批处理）
 */
export class BatchGenerationScheduler {
  private templateManager: TemplateManager;
  private documentGenerator: IDocumentGenerator;
  private websocketManager: WebSocketManager;

  // 任务存储
  private tasks: Map<string, BatchGenerationTask> = new Map();
  private taskQueue: QueueItem[] = [];

  // 并发控制
  private runningTasks: Set<string> = new Set();
  private maxConcurrency: number = 3;

  // 进度推送间隔
  private progressInterval: number = 500;
  private progressTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    templateManager: TemplateManager,
    documentGenerator: IDocumentGenerator,
    websocketManager: WebSocketManager,
    options?: {
      maxConcurrency?: number;
      progressInterval?: number;
    }
  ) {
    this.templateManager = templateManager;
    this.documentGenerator = documentGenerator;
    this.websocketManager = websocketManager;

    if (options?.maxConcurrency) {
      this.maxConcurrency = options.maxConcurrency;
    }
    if (options?.progressInterval) {
      this.progressInterval = options.progressInterval;
    }
  }

  // ========================================================================
  // 公共方法 - 任务管理
  // ========================================================================

  /**
   * 创建批量任务
   *
   * @param request - 任务创建请求
   * @returns 任务创建响应
   */
  async createTask(request: CreateBatchTaskRequest): Promise<CreateBatchTaskResponse> {
    // 1. 验证模板存在
    for (const templateId of request.templateIds) {
      await this.templateManager.getTemplate(templateId);
    }

    // 2. 生成任务ID
    const taskId = this.generateTaskId();

    // 3. 创建任务对象
    const task: BatchGenerationTask = {
      id: taskId,
      status: TaskStatus.PENDING,
      mode: request.mode,
      priority: request.priority || Priority.NORMAL,
      progress: 0,

      config: {
        templateIds: request.templateIds,
        dataSource: request.dataSource,
        parameters: request.parameters || {},
        output: request.output || { type: 'download' },
        options: request.options || {}
      } as BatchTaskConfig,

      execution: this.createInitialExecution(),
      stats: {},
      timestamps: {
        createdAt: Date.now()
      }
    };

    // 4. 存储任务
    this.tasks.set(taskId, task);

    // 5. 加入队列
    this.enqueueTask(task);

    // 6. 推送任务创建事件
    await this.broadcastEvent({
      type: 'status_changed',
      taskId,
      oldStatus: TaskStatus.PENDING,
      newStatus: TaskStatus.PENDING,
      timestamp: Date.now()
    });

    // 7. 尝试启动任务处理
    this.processQueue();

    // 8. 估算任务持续时间
    const estimatedDuration = await this.estimateDuration(task);

    return {
      taskId,
      status: task.status,
      estimatedDuration,
      estimatedCompletionAt: Date.now() + estimatedDuration,
      message: '任务已创建，等待执行'
    };
  }

  /**
   * 启动任务
   *
   * @param taskId - 任务ID
   */
  async startTask(taskId: string): Promise<void> {
    const task = this.getTaskOrThrow(taskId);

    if (task.status !== TaskStatus.PENDING && task.status !== TaskStatus.PAUSED) {
      throw new TaskStatusError(
        taskId,
        task.status,
        TaskStatus.PENDING
      );
    }

    // 更新状态
    const oldStatus = task.status;
    task.status = TaskStatus.RUNNING;
    task.timestamps.startedAt = Date.now();

    if (task.status === TaskStatus.PAUSED) {
      task.timestamps.resumedAt = Date.now();
    }

    // 推送状态变更
    await this.broadcastEvent({
      type: 'status_changed',
      taskId,
      oldStatus,
      newStatus: TaskStatus.RUNNING,
      timestamp: Date.now()
    });

    // 启动任务处理
    this.runScheduleLoop(task);
  }

  /**
   * 暂停任务
   *
   * @param taskId - 任务ID
   */
  async pauseTask(taskId: string): Promise<void> {
    const task = this.getTaskOrThrow(taskId);

    if (task.status !== TaskStatus.RUNNING) {
      throw new TaskStatusError(taskId, task.status, TaskStatus.RUNNING);
    }

    task.status = TaskStatus.PAUSED;
    task.timestamps.pausedAt = Date.now();

    // 停止进度推送
    this.stopProgressTracking(taskId);

    // 从运行任务中移除
    this.runningTasks.delete(taskId);

    await this.broadcastEvent({
      type: 'status_changed',
      taskId,
      oldStatus: TaskStatus.RUNNING,
      newStatus: TaskStatus.PAUSED,
      timestamp: Date.now(),
      reason: '用户暂停'
    });
  }

  /**
   * 恢复任务
   *
   * @param taskId - 任务ID
   */
  async resumeTask(taskId: string): Promise<void> {
    await this.startTask(taskId);
  }

  /**
   * 取消任务
   *
   * @param taskId - 任务ID
   */
  async cancelTask(taskId: string): Promise<void> {
    const task = this.getTaskOrThrow(taskId);

    if (
      task.status === TaskStatus.COMPLETED ||
      task.status === TaskStatus.FAILED
    ) {
      throw new Error('任务已完成或失败，无法取消');
    }

    const oldStatus = task.status;
    task.status = TaskStatus.CANCELLED;
    task.timestamps.cancelledAt = Date.now();

    // 停止进度推送
    this.stopProgressTracking(taskId);

    // 从运行任务中移除
    this.runningTasks.delete(taskId);

    await this.broadcastEvent({
      type: 'status_changed',
      taskId,
      oldStatus,
      newStatus: TaskStatus.CANCELLED,
      timestamp: Date.now(),
      reason: '用户取消'
    });

    // 尝试处理队列中的下一个任务
    this.processQueue();
  }

  /**
   * 获取任务进度
   *
   * @param taskId - 任务ID
   * @returns 任务进度
   */
  async getTaskProgress(taskId: string): Promise<{
    task: BatchGenerationTask;
  }> {
    const task = this.getTaskOrThrow(taskId);
    return { task };
  }

  // ========================================================================
  // 私有方法 - 任务调度
  // ========================================================================

  /**
   * 处理任务队列
   */
  private processQueue(): void {
    // 如果没有可用并发槽位，返回
    if (this.runningTasks.size >= this.maxConcurrency) {
      return;
    }

    // 获取下一个待处理任务
    const nextItem = this.dequeueTask();
    if (!nextItem) {
      return;
    }

    const task = nextItem.task;

    // 如果任务处于暂停状态，跳过
    if (task.status === TaskStatus.PAUSED) {
      this.processQueue();
      return;
    }

    // 添加到运行任务
    this.runningTasks.add(task.id);

    // 自动启动任务
    if (task.status === TaskStatus.PENDING) {
      this.startTask(task.id).catch(error => {
        console.error('启动任务失败:', error);
        this.handleTaskError(task, error);
      });
    }

    // 尝试处理更多任务
    this.processQueue();
  }

  /**
   * 任务调度循环
   */
  private async runScheduleLoop(task: BatchGenerationTask): Promise<void> {
    const startTime = performance.now();

    try {
      // 1. 初始化阶段
      await this.updateProgress(task, {
        progress: 0,
        stage: GenerationStage.INITIALIZING,
        message: '初始化任务...'
      });

      // 2. 加载数据源
      await this.updateProgress(task, {
        progress: 5,
        stage: GenerationStage.LOADING_DATA,
        message: '加载数据源...'
      });

      const dataSource = await this.loadDataSource(task.config.dataSource);
      task.execution.totalDocuments = this.calculateTotalDocuments(task, dataSource);
      task.execution.totalBatches = Math.ceil(
        task.execution.totalDocuments / (task.config.options.batchSize || 10)
      );

      // 3. 验证模板
      await this.updateProgress(task, {
        progress: 15,
        stage: GenerationStage.VALIDATING_TEMPLATES,
        message: '验证模板...'
      });

      const templates = await Promise.all(
        task.config.templateIds.map(id => this.templateManager.getTemplate(id))
      );

      // 4. 准备映射
      await this.updateProgress(task, {
        progress: 20,
        stage: GenerationStage.PREPARING_MAPPING,
        message: '准备数据映射...'
      });

      // 5. 生成文档
      const concurrency = task.config.options.concurrency || this.maxConcurrency;
      const batchSize = task.config.options.batchSize || 10;

      await this.generateDocuments(
        task,
        dataSource,
        templates,
        concurrency,
        batchSize
      );

      // 6. 完成
      await this.completeTask(task);

    } catch (error) {
      await this.handleTaskError(task, error);
    } finally {
      // 从运行任务中移除
      this.runningTasks.delete(task.id);

      // 处理队列中的下一个任务
      this.processQueue();
    }
  }

  /**
   * 生成文档
   */
  private async generateDocuments(
    task: BatchGenerationTask,
    dataSource: Array<Record<string, any>>,
    templates: any[],
    concurrency: number,
    batchSize: number
  ): Promise<void> {
    let completedCount = 0;

    // 分批处理
    for (let i = 0; i < dataSource.length; i += batchSize) {
      // 检查任务状态
      if (task.status === TaskStatus.PAUSED) {
        await this.waitForResume(task);
      } else if (task.status === TaskStatus.CANCELLED) {
        break;
      }

      const batch = dataSource.slice(i, i + batchSize);
      task.execution.currentBatch++;

      // 并发生成
      for (let j = 0; j < batch.length; j += concurrency) {
        const concurrentBatch = batch.slice(j, j + concurrency);

        const promises = concurrentBatch.map(async (data, batchIndex) => {
          const globalIndex = i + j + batchIndex;
          return await this.generateSingleDocument(task, data, templates, globalIndex);
        });

        await Promise.all(promises);
      }

      // 更新进度
      completedCount += batch.length;
      task.execution.currentIndex = completedCount;
      task.progress = Math.floor((completedCount / dataSource.length) * 60) + 20;

      await this.updateProgress(task, {
        progress: task.progress,
        stage: GenerationStage.GENERATING_DOCUMENTS,
        message: `正在生成文档 ${completedCount}/${dataSource.length}...`
      });
    }
  }

  /**
   * 生成单个文档
   */
  private async generateSingleDocument(
    task: BatchGenerationTask,
    data: Record<string, any>,
    templates: any[],
    dataIndex: number
  ): Promise<void> {
    // 根据模式生成
    for (const template of templates) {
      try {
        const startTime = performance.now();

        // 使用文档生成器
        const blob = await this.documentGenerator.generate({
          templateBuffer: template.fileBuffer,
          data
        });

        const duration = performance.now() - startTime;

        task.execution.completedDocuments++;

        // 推送文档生成事件
        await this.broadcastEvent({
          type: 'document_generated',
          taskId: task.id,
          documentId: this.generateDocumentId(),
          templateId: template.metadata.id,
          dataIndex,
          status: 'success',
          timestamp: Date.now()
        });

      } catch (error) {
        task.execution.failedDocuments++;

        // 推送错误事件
        await this.broadcastEvent({
          type: 'error',
          taskId: task.id,
          error: {
            code: 'GENERATION_FAILED',
            message: error instanceof Error ? error.message : String(error),
            details: { templateId: template.metadata.id, dataIndex }
          },
          timestamp: Date.now(),
          fatal: !task.config.options.continueOnError
        });

        // 检查是否继续
        if (!task.config.options.continueOnError) {
          throw error;
        }
      }
    }
  }

  /**
   * 完成任务
   */
  private async completeTask(task: BatchGenerationTask): Promise<void> {
    const now = Date.now();

    task.status = TaskStatus.COMPLETED;
    task.progress = 100;
    task.timestamps.completedAt = now;

    // 计算统计信息
    task.stats = {
      startTime: task.timestamps.startedAt,
      endTime: now,
      duration: now - (task.timestamps.startedAt || now),
      avgTimePerDocument: task.execution.totalDocuments > 0
        ? (now - (task.timestamps.startedAt || now)) / task.execution.totalDocuments
        : 0,
      successRate: task.execution.totalDocuments > 0
        ? (task.execution.completedDocuments / task.execution.totalDocuments) * 100
        : 0
    };

    // 停止进度跟踪
    this.stopProgressTracking(task.id);

    // 推送完成事件
    await this.broadcastEvent({
      type: 'completed',
      taskId: task.id,
      status: task.status,
      result: {
        taskId: task.id,
        status: task.status,
        progress: 100,
        stats: {
          total: task.execution.totalDocuments,
          successful: task.execution.completedDocuments,
          failed: task.execution.failedDocuments,
          skipped: task.execution.skippedDocuments,
          duration: task.stats.duration || 0
        },
        documents: []
      },
      timestamp: now
    });
  }

  /**
   * 处理任务错误
   */
  private async handleTaskError(
    task: BatchGenerationTask,
    error: unknown
  ): Promise<void> {
    const now = Date.now();

    task.status = TaskStatus.FAILED;
    task.timestamps.failedAt = now;

    task.error = {
      code: 'TASK_FAILED',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      failedAt: now,
      retryable: true
    };

    // 停止进度跟踪
    this.stopProgressTracking(task.id);

    // 推送错误事件
    await this.broadcastEvent({
      type: 'error',
      taskId: task.id,
      error: {
        code: task.error.code,
        message: task.error.message,
        details: task.error
      },
      timestamp: now,
      fatal: true
    });
  }

  // ========================================================================
  // 私有方法 - 数据加载
  // ========================================================================

  /**
   * 加载数据源
   */
  private async loadDataSource(config: DataSourceConfig): Promise<Array<Record<string, any>>> {
    switch (config.type) {
      case 'excel':
        return await this.loadExcelData(config);
      case 'csv':
        return await this.loadCsvData(config);
      case 'json':
        return await this.loadJsonData(config);
      case 'inline':
        return config.source.inline || [];
      default:
        throw new Error(`不支持的数据源类型: ${config.type}`);
    }
  }

  /**
   * 加载Excel数据
   */
  private async loadExcelData(config: DataSourceConfig): Promise<Array<Record<string, any>>> {
    if (!config.source.file) {
      throw new Error('Excel文件未提供');
    }

    // 使用Excel服务
    const { readExcelFile } = await import('./excelService');
    const workbook = await readExcelFile(
      new Blob([config.source.file.buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    );

    // 获取第一个sheet的数据
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // 转换为JSON
    const data = await import('xlsx').then(xlsx => xlsx.utils.sheet_to_json(worksheet));

    return data as Array<Record<string, any>>;
  }

  /**
   * 加载CSV数据
   */
  private async loadCsvData(config: DataSourceConfig): Promise<Array<Record<string, any>>> {
    if (!config.source.file) {
      throw new Error('CSV文件未提供');
    }

    // 使用CSV解析库
    const text = new TextDecoder().decode(config.source.file.buffer);
    const lines = text.split('\n');

    if (lines.length === 0) {
      return [];
    }

    const headers = lines[0].split(',');
    const data: Array<Record<string, any>> = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const row: Record<string, any> = {};

      headers.forEach((header, index) => {
        row[header.trim()] = values[index]?.trim();
      });

      data.push(row);
    }

    return data;
  }

  /**
   * 加载JSON数据
   */
  private async loadJsonData(config: DataSourceConfig): Promise<Array<Record<string, any>>> {
    if (config.source.inline) {
      return config.source.inline;
    }

    if (config.source.file) {
      const text = new TextDecoder().decode(config.source.file.buffer);
      return JSON.parse(text);
    }

    return [];
  }

  // ========================================================================
  // 私有方法 - 队列管理
  // ========================================================================

  /**
   * 将任务加入队列
   */
  private enqueueTask(task: BatchGenerationTask): void {
    const item: QueueItem = {
      task,
      addedAt: Date.now(),
      priority: task.priority
    };

    // 按优先级插入
    let insertIndex = 0;
    for (let i = 0; i < this.taskQueue.length; i++) {
      if (this.comparePriority(item.priority, this.taskQueue[i].priority) > 0) {
        insertIndex = i;
        break;
      }
      insertIndex = i + 1;
    }

    this.taskQueue.splice(insertIndex, 0, item);
  }

  /**
   * 从队列取出任务
   */
  private dequeueTask(): QueueItem | null {
    return this.taskQueue.shift() || null;
  }

  /**
   * 比较优先级
   */
  private comparePriority(p1: Priority, p2: Priority): number {
    const order = {
      [Priority.URGENT]: 4,
      [Priority.HIGH]: 3,
      [Priority.NORMAL]: 2,
      [Priority.LOW]: 1
    };

    return order[p1] - order[p2];
  }

  // ========================================================================
  // 私有方法 - 进度管理
  // ========================================================================

  /**
   * 更新进度
   */
  private async updateProgress(
    task: BatchGenerationTask,
    update: ProgressUpdate
  ): Promise<void> {
    task.progress = update.progress;
    task.execution.currentStage = update.stage;

    // 推送进度事件
    await this.broadcastEvent({
      type: 'progress',
      taskId: task.id,
      progress: update.progress,
      stage: update.stage,
      message: update.message,
      timestamp: Date.now()
    });
  }

  /**
   * 等待任务恢复
   */
  private async waitForResume(task: BatchGenerationTask): Promise<void> {
    return new Promise(resolve => {
      const checkInterval = setInterval(() => {
        if (task.status !== TaskStatus.PAUSED) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  /**
   * 停止进度跟踪
   */
  private stopProgressTracking(taskId: string): void {
    const timer = this.progressTimers.get(taskId);
    if (timer) {
      clearTimeout(timer);
      this.progressTimers.delete(taskId);
    }
  }

  /**
   * 广播WebSocket事件
   */
  private async broadcastEvent(event: WebSocketEvent): Promise<void> {
    await this.websocketManager.broadcast(event.taskId, event);
  }

  // ========================================================================
  // 私有方法 - 工具函数
  // ========================================================================

  /**
   * 获取任务或抛出异常
   */
  private getTaskOrThrow(taskId: string): BatchGenerationTask {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new TaskNotFoundError(taskId);
    }
    return task;
  }

  /**
   * 创建初始执行信息
   */
  private createInitialExecution(): TaskExecutionInfo {
    return {
      totalDocuments: 0,
      completedDocuments: 0,
      failedDocuments: 0,
      skippedDocuments: 0,
      currentBatch: 0,
      totalBatches: 0,
      currentIndex: 0,
      currentStage: GenerationStage.INITIALIZING
    };
  }

  /**
   * 计算总文档数
   */
  private calculateTotalDocuments(
    task: BatchGenerationTask,
    dataSource: Array<Record<string, any>>
  ): number {
    const dataCount = dataSource.length;
    const templateCount = task.config.templateIds.length;

    switch (task.mode) {
      case GenerationMode.SINGLE_TEMPLATE:
        return dataCount;
      case GenerationMode.MULTI_TEMPLATE:
        return templateCount;
      case GenerationMode.CROSS_PRODUCT:
        return dataCount * templateCount;
      default:
        return dataCount;
    }
  }

  /**
   * 估算任务持续时间
   */
  private async estimateDuration(task: BatchGenerationTask): Promise<number> {
    // 简单估算：每个文档2秒
    const estimatedDocs = 100; // 默认估算
    return estimatedDocs * 2000;
  }

  /**
   * 生成任务ID
   */
  private generateTaskId(): string {
    return `task_${uuidv4()}`;
  }

  /**
   * 生成文档ID
   */
  private generateDocumentId(): string {
    return `doc_${uuidv4()}`;
  }
}

// ============================================================================
// 默认文档生成器实现
// ============================================================================

/**
 * 默认文档生成器（使用docxtemplater）
 */
export class DefaultDocumentGenerator implements IDocumentGenerator {
  async generate(params: {
    templateBuffer: ArrayBuffer;
    data: Record<string, any>;
  }): Promise<Blob> {
    const zip = new PizZip(params.templateBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true
    });

    doc.render(params.data);

    const output = doc.getZip().generate({
      type: 'blob',
      compression: 'DEFLATE'
    });

    return output;
  }
}

// ============================================================================
// 导出
// ============================================================================

export default BatchGenerationScheduler;
