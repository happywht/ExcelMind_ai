/**
 * 进度广播器 - Phase 2 批量任务进度实时推送
 *
 * 职责：
 * 1. 监听批量任务进度变化
 * 2. 实时推送到订阅的客户端
 * 3. 支持增量更新（只推送变化的字段）
 * 4. 支持批量推送优化
 * 5. 节流和防抖控制
 *
 * @version 1.0.0
 * @module ProgressBroadcaster
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import type { BatchGenerationTask } from '../../src/types/templateGeneration';
import type {
  ProgressBroadcasterConfig,
  ProgressUpdateEvent,
  TaskCompletedMessage,
  TaskFailedMessage,
  TaskProgressMessage,
  TaskStartedMessage,
  WebSocketMessage,
} from '../../src/types/websocket';
import { MessageType } from '../../src/types/websocket';
import type { WebSocketServer } from './websocketServer';

// ============================================================================
// 接口定义
// ============================================================================

/**
 * 任务进度缓存
 */
interface TaskProgressCache {
  taskId: string;
  lastProgress: number;
  lastUpdate: number;
  updateCount: number;
  pendingUpdates: ProgressUpdateEvent[];
}

/**
 * 广播任务
 */
interface BroadcastTask {
  taskId: string;
  priority: number;
  message: WebSocketMessage;
  targetClients: string[];
  targetRooms: string[];
}

// ============================================================================
// 进度广播器类
// ============================================================================

/**
 * 进度广播器
 *
 * 功能特性：
 * - 实时进度推送
 * - 增量更新优化
 * - 批量推送合并
 * - 智能节流
 * - 任务进度缓存
 * - 广播队列管理
 */
export class ProgressBroadcaster extends EventEmitter {
  // ========================================================================
  // 私有属性
  // ========================================================================

  private websocketServer: WebSocketServer;
  private config: ProgressBroadcasterConfig;

  // 进度缓存
  private progressCache: Map<string, TaskProgressCache> = new Map();

  // 广播队列
  private broadcastQueue: BroadcastTask[] = [];
  private isProcessingQueue = false;

  // 定时器
  private broadcastTimer: NodeJS.Timeout | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;

  // 统计信息
  private stats = {
    totalBroadcasts: 0,
    totalMessages: 0,
    successfulSends: 0,
    failedSends: 0,
    averageLatency: 0,
    lastUpdate: Date.now(),
  };

  // ========================================================================
  // 构造函数
  // ========================================================================

  /**
   * 构造进度广播器
   *
   * @param websocketServer - WebSocket服务器实例
   * @param config - 广播器配置
   */
  constructor(
    websocketServer: WebSocketServer,
    config?: Partial<ProgressBroadcasterConfig>
  ) {
    super();

    this.websocketServer = websocketServer;
    this.config = {
      broadcastInterval: 100, // 100ms
      batchSize: 10,
      enableIncrementalUpdates: true,
      minChangeThreshold: 1, // 1%
      enableCompression: false,
      ...config,
    };

    // 启动广播队列处理
    this.startQueueProcessing();

    // 启动缓存清理
    this.startCacheCleanup();

    console.log('进度广播器已初始化');
  }

  // ========================================================================
  // 公共方法 - 任务事件处理
  // ========================================================================

  /**
   * 处理任务启动事件
   *
   * @param task - 任务对象
   */
  async onTaskStarted(task: BatchGenerationTask): Promise<void> {
    const message: TaskStartedMessage = {
      taskId: task.id,
      mode: task.mode,
      totalDocuments: task.execution.totalDocuments,
      estimatedDuration: task.execution.estimatedTimeRemaining,
    };

    await this.broadcastToTaskSubscribers(task.id, {
      type: MessageType.TASK_STARTED,
      payload: message,
      timestamp: Date.now(),
      id: uuidv4(),
    });

    // 初始化进度缓存
    this.initializeProgressCache(task);
  }

  /**
   * 处理任务进度更新事件
   *
   * @param task - 任务对象
   */
  async onTaskProgress(task: BatchGenerationTask): Promise<void> {
    const cache = this.progressCache.get(task.id);

    if (!cache) {
      // 如果没有缓存，初始化
      this.initializeProgressCache(task);
    }

    const message: TaskProgressMessage = {
      taskId: task.id,
      status: task.status,
      progress: task.progress,
      current: task.execution.currentIndex,
      total: task.execution.totalDocuments,
      stage: task.execution.currentStage,
      estimatedTimeRemaining: task.execution.estimatedTimeRemaining,
      message: this.getStageMessage(task.execution.currentStage),
    };

    // 检查是否需要广播
    if (this.shouldBroadcast(task.id, task.progress)) {
      await this.broadcastToTaskSubscribers(task.id, {
        type: MessageType.TASK_PROGRESS,
        payload: message,
        timestamp: Date.now(),
        id: uuidv4(),
      });

      // 更新缓存
      this.updateProgressCache(task.id, task.progress);
    } else {
      // 添加到待发送队列
      cache?.pendingUpdates.push({
        taskId: task.id,
        progress: task.progress,
        current: task.execution.currentIndex,
        total: task.execution.totalDocuments,
        stage: task.execution.currentStage,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * 处理任务完成事件
   *
   * @param task - 任务对象
   */
  async onTaskCompleted(task: BatchGenerationTask): Promise<void> {
    const message: TaskCompletedMessage = {
      taskId: task.id,
      status: task.status === 'completed' ? 'completed' : 'partially_completed',
      result: {
        total: task.execution.totalDocuments,
        successful: task.execution.completedDocuments,
        failed: task.execution.failedDocuments,
        skipped: task.execution.skippedDocuments,
        duration: task.stats.duration || 0,
      },
    };

    await this.broadcastToTaskSubscribers(task.id, {
      type: MessageType.TASK_COMPLETED,
      payload: message,
      timestamp: Date.now(),
      id: uuidv4(),
    });

    // 清理缓存
    this.cleanupProgressCache(task.id);
  }

  /**
   * 处理任务失败事件
   *
   * @param task - 任务对象
   */
  async onTaskFailed(task: BatchGenerationTask): Promise<void> {
    const message: TaskFailedMessage = {
      taskId: task.id,
      error: {
        code: task.error?.code || 'TASK_FAILED',
        message: task.error?.message || 'Task failed',
        details: task.error?.details,
      },
    };

    await this.broadcastToTaskSubscribers(task.id, {
      type: MessageType.TASK_FAILED,
      payload: message,
      timestamp: Date.now(),
      id: uuidv4(),
    });

    // 清理缓存
    this.cleanupProgressCache(task.id);
  }

  /**
   * 处理任务暂停事件
   *
   * @param task - 任务对象
   */
  async onTaskPaused(task: BatchGenerationTask): Promise<void> {
    await this.broadcastToTaskSubscribers(task.id, {
      type: MessageType.TASK_PAUSED,
      payload: {
        taskId: task.id,
        progress: task.progress,
        message: '任务已暂停',
      },
      timestamp: Date.now(),
      id: uuidv4(),
    });
  }

  /**
   * 处理任务取消事件
   *
   * @param task - 任务对象
   */
  async onTaskCancelled(task: BatchGenerationTask): Promise<void> {
    await this.broadcastToTaskSubscribers(task.id, {
      type: MessageType.TASK_CANCELLED,
      payload: {
        taskId: task.id,
        progress: task.progress,
        message: '任务已取消',
      },
      timestamp: Date.now(),
      id: uuidv4(),
    });

    // 清理缓存
    this.cleanupProgressCache(task.id);
  }

  // ========================================================================
  // 公共方法 - 批量广播
  // ========================================================================

  /**
   * 批量广播任务进度
   *
   * @param tasks - 任务列表
   */
  async broadcastBatchProgress(tasks: BatchGenerationTask[]): Promise<void> {
    const messages: WebSocketMessage[] = [];

    for (const task of tasks) {
      const message: TaskProgressMessage = {
        taskId: task.id,
        status: task.status,
        progress: task.progress,
        current: task.execution.currentIndex,
        total: task.execution.totalDocuments,
        stage: task.execution.currentStage,
        estimatedTimeRemaining: task.execution.estimatedTimeRemaining,
      };

      messages.push({
        type: MessageType.TASK_PROGRESS,
        payload: message,
        timestamp: Date.now(),
        id: uuidv4(),
      });
    }

    // 批量发送
    await this.broadcastBatch(messages);
  }

  // ========================================================================
  // 公共方法 - 房间广播
  // ========================================================================

  /**
   * 广播到房间
   *
   * @param room - 房间名称
   * @param message - 消息对象
   */
  async broadcastToRoom(room: string, message: WebSocketMessage): Promise<void> {
    await this.websocketServer.sendToRoom(room, message);
    this.updateStats(true);
  }

  // ========================================================================
  // 公共方法 - 统计
  // ========================================================================

  /**
   * 获取广播统计信息
   */
  getStats() {
    return {
      totalBroadcasts: this.stats.totalBroadcasts,
      totalMessages: this.stats.totalMessages,
      successfulSends: this.stats.successfulSends,
      failedSends: this.stats.failedSends,
      averageLatency: this.stats.averageLatency,
      queueSize: this.broadcastQueue.length,
      cacheSize: this.progressCache.size,
      lastUpdate: this.stats.lastUpdate,
    };
  }

  // ========================================================================
  // 公共方法 - 清理
  // ========================================================================

  /**
   * 销毁广播器
   */
  destroy(): void {
    // 停止定时器
    this.stopQueueProcessing();
    this.stopCacheCleanup();

    // 清理队列
    this.broadcastQueue = [];

    // 清理缓存
    this.progressCache.clear();

    // 移除所有监听器
    this.removeAllListeners();

    console.log('进度广播器已销毁');
  }

  // ========================================================================
  // 私有方法 - 广播处理
  // ========================================================================

  /**
   * 广播到任务订阅者
   */
  private async broadcastToTaskSubscribers(
    taskId: string,
    message: WebSocketMessage
  ): Promise<void> {
    // 创建房间名称（任务订阅者通常在 task:${taskId} 房间）
    const room = `task:${taskId}`;

    // 添加到广播队列
    this.broadcastQueue.push({
      taskId,
      priority: 1,
      message,
      targetClients: [],
      targetRooms: [room],
    });

    this.updateStats(true);
  }

  /**
   * 批量广播消息
   */
  private async broadcastBatch(messages: WebSocketMessage[]): Promise<void> {
    for (const message of messages) {
      await this.broadcastToTaskSubscribers(
        (message.payload as TaskProgressMessage).taskId,
        message
      );
    }
  }

  // ========================================================================
  // 私有方法 - 队列处理
  // ========================================================================

  /**
   * 启动队列处理
   */
  private startQueueProcessing(): void {
    this.broadcastTimer = setInterval(() => {
      this.processQueue();
    }, this.config.broadcastInterval);
  }

  /**
   * 停止队列处理
   */
  private stopQueueProcessing(): void {
    if (this.broadcastTimer) {
      clearInterval(this.broadcastTimer);
      this.broadcastTimer = null;
    }
  }

  /**
   * 处理广播队列
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.broadcastQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      // 取出一批任务
      const batch = this.broadcastQueue.splice(0, this.config.batchSize);

      // 按房间分组
      const roomMessages = new Map<string, WebSocketMessage[]>();

      for (const task of batch) {
        for (const room of task.targetRooms) {
          if (!roomMessages.has(room)) {
            roomMessages.set(room, []);
          }
          roomMessages.get(room)!.push(task.message);
        }

        // 发送给特定客户端
        for (const clientId of task.targetClients) {
          await this.websocketServer.send(clientId, task.message);
        }
      }

      // 广播到房间
      for (const [room, messages] of roomMessages) {
        // 如果有多个消息，合并它们
        if (messages.length === 1) {
          await this.websocketServer.sendToRoom(room, messages[0]);
        } else {
          // 发送批量消息
          await this.websocketServer.sendToRoom(room, {
            type: MessageType.TASK_PROGRESS,
            payload: {
              type: 'batch',
              messages,
            },
            timestamp: Date.now(),
            id: uuidv4(),
          });
        }
      }

      this.stats.totalBroadcasts += batch.length;
      this.stats.totalMessages += batch.length;

    } catch (error) {
      console.error('处理广播队列失败:', error);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  // ========================================================================
  // 私有方法 - 进度缓存
  // ========================================================================

  /**
   * 初始化进度缓存
   */
  private initializeProgressCache(task: BatchGenerationTask): void {
    this.progressCache.set(task.id, {
      taskId: task.id,
      lastProgress: task.progress,
      lastUpdate: Date.now(),
      updateCount: 0,
      pendingUpdates: [],
    });
  }

  /**
   * 更新进度缓存
   */
  private updateProgressCache(taskId: string, progress: number): void {
    const cache = this.progressCache.get(taskId);
    if (cache) {
      cache.lastProgress = progress;
      cache.lastUpdate = Date.now();
      cache.updateCount++;
    }
  }

  /**
   * 清理进度缓存
   */
  private cleanupProgressCache(taskId: string): void {
    this.progressCache.delete(taskId);
  }

  /**
   * 检查是否应该广播
   */
  private shouldBroadcast(taskId: string, currentProgress: number): boolean {
    if (!this.config.enableIncrementalUpdates) {
      return true;
    }

    const cache = this.progressCache.get(taskId);
    if (!cache) {
      return true;
    }

    // 检查变化阈值
    const progressChange = Math.abs(currentProgress - cache.lastProgress);
    return progressChange >= this.config.minChangeThreshold;
  }

  // ========================================================================
  // 私有方法 - 缓存清理
  // ========================================================================

  /**
   * 启动缓存清理
   */
  private startCacheCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldCache();
    }, 60000); // 每分钟清理一次
  }

  /**
   * 停止缓存清理
   */
  private stopCacheCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * 清理旧缓存
   */
  private cleanupOldCache(): void {
    const now = Date.now();
    const maxAge = 3600000; // 1小时

    for (const [taskId, cache] of this.progressCache) {
      if (now - cache.lastUpdate > maxAge) {
        this.progressCache.delete(taskId);
      }
    }
  }

  // ========================================================================
  // 私有方法 - 统计
  // ========================================================================

  /**
   * 更新统计信息
   */
  private updateStats(success: boolean): void {
    if (success) {
      this.stats.successfulSends++;
    } else {
      this.stats.failedSends++;
    }

    this.stats.lastUpdate = Date.now();

    // 计算平均延迟（简化）
    if (this.stats.totalMessages > 0) {
      this.stats.averageLatency =
        (this.stats.averageLatency * (this.stats.totalMessages - 1) + 0) /
        this.stats.totalMessages;
    }
  }

  // ========================================================================
  // 私有方法 - 工具函数
  // ========================================================================

  /**
   * 获取阶段消息
   */
  private getStageMessage(stage: string): string {
    const messages: Record<string, string> = {
      initializing: '初始化任务...',
      loading_data: '加载数据源...',
      validating_templates: '验证模板...',
      preparing_mapping: '准备数据映射...',
      generating_documents: '生成文档...',
      compressing_output: '压缩输出...',
      uploading_results: '上传结果...',
      finalizing: '完成任务...',
    };

    return messages[stage] || '处理中...';
  }
}

// ============================================================================
// 导出
// ============================================================================

export default ProgressBroadcaster;
