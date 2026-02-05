/**
 * WebSocket管理器 - Phase 2 多模板文档生成实时通信服务
 *
 * 职责：
 * 1. WebSocket连接管理
 * 2. 任务事件订阅和广播
 * 3. 客户端连接池管理
 * 4. 消息路由和分发
 * 5. 连接状态监控
 *
 * @version 2.0.0
 * @module WebSocketManager
 */

import { EventEmitter } from 'events';
import type { WebSocketEvent } from '../../types/templateGeneration';

// ============================================================================
// 接口定义
// ============================================================================

/**
 * WebSocket连接信息
 */
interface WebSocketConnection {
  id: string;
  socket: WebSocket;
  subscribedTasks: Set<string>;
  connectedAt: number;
  lastHeartbeat: number;
}

/**
 * 广播选项
 */
export interface BroadcastOptions {
  excludeConnectionId?: string;
  includeSubscribersOnly?: boolean;
}

/**
 * 订阅请求
 */
export interface SubscribeRequest {
  action: 'subscribe';
  taskIds: string[];
}

/**
 * 取消订阅请求
 */
export interface UnsubscribeRequest {
  action: 'unsubscribe';
  taskIds?: string[]; // 不提供则取消所有订阅
}

/**
 * 心跳请求
 */
export interface HeartbeatRequest {
  action: 'heartbeat';
}

/**
 * 客户端消息类型
 */
type ClientMessage = SubscribeRequest | UnsubscribeRequest | HeartbeatRequest;

// ============================================================================
// 配置
// ============================================================================

/**
 * WebSocket配置
 */
export interface WebSocketConfig {
  // 心跳间隔（毫秒）
  heartbeatInterval: number;
  // 连接超时（毫秒）
  connectionTimeout: number;
  // 消息队列最大长度
  maxMessageQueueSize: number;
  // 是否启用消息压缩
  enableCompression: boolean;
  // 重连配置
  reconnect: {
    // 最大重连次数
    maxAttempts: number;
    // 重连延迟（毫秒）
    delay: number;
    // 指数退避
    exponentialBackoff: boolean;
  };
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: WebSocketConfig = {
  heartbeatInterval: 30000, // 30秒
  connectionTimeout: 60000, // 60秒
  maxMessageQueueSize: 1000,
  enableCompression: false,
  reconnect: {
    maxAttempts: 5,
    delay: 1000,
    exponentialBackoff: true
  }
};

// ============================================================================
// 错误类
// ============================================================================

/**
 * WebSocket错误
 */
export class WebSocketError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly connectionId?: string
  ) {
    super(message);
    this.name = 'WebSocketError';
    Object.setPrototypeOf(this, WebSocketError.prototype);
  }
}

/**
 * 连接未找到错误
 */
export class ConnectionNotFoundError extends WebSocketError {
  constructor(connectionId: string) {
    super(
      `连接不存在: ${connectionId}`,
      'CONNECTION_NOT_FOUND',
      connectionId
    );
    this.name = 'ConnectionNotFoundError';
    Object.setPrototypeOf(this, ConnectionNotFoundError.prototype);
  }
}

// ============================================================================
// 核心服务类
// ============================================================================

/**
 * WebSocket管理器
 *
 * 功能特性：
 * - 连接池管理
 * - 任务订阅系统
 * - 消息广播和路由
 * - 心跳检测
 * - 自动重连
 * - 消息队列
 */
export class WebSocketManager extends EventEmitter {
  private connections: Map<string, WebSocketConnection> = new Map();
  private taskSubscribers: Map<string, Set<string>> = new Map(); // taskId -> connectionIds
  private config: WebSocketConfig;

  // 心跳定时器
  private heartbeatTimer: NodeJS.Timeout | null = null;

  // 消息队列（用于离线消息）
  private messageQueues: Map<string, WebSocketEvent[]> = new Map();

  constructor(config: Partial<WebSocketConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };

    // 启动心跳检测
    this.startHeartbeat();
  }

  // ========================================================================
  // 公共方法 - 连接管理
  // ========================================================================

  /**
   * 添加连接
   *
   * @param socket - WebSocket连接
   * @param connectionId - 连接ID（可选，自动生成）
   * @returns 连接ID
   */
  addConnection(socket: WebSocket, connectionId?: string): string {
    const id = connectionId || this.generateConnectionId();

    // 检查是否已存在
    if (this.connections.has(id)) {
      throw new WebSocketError(`连接已存在: ${id}`, 'CONNECTION_EXISTS', id);
    }

    // 创建连接对象
    const connection: WebSocketConnection = {
      id,
      socket,
      subscribedTasks: new Set(),
      connectedAt: Date.now(),
      lastHeartbeat: Date.now()
    };

    // 存储连接
    this.connections.set(id, connection);

    // 设置消息处理器
    this.setupMessageHandlers(connection);

    // 设置连接关闭处理器
    socket.onclose = () => {
      this.handleConnectionClose(id);
    };

    // 设置错误处理器
    socket.onerror = (error) => {
      this.handleConnectionError(id, error);
    };

    // 发送欢迎消息
    this.sendToConnection(id, {
      type: 'status_changed',
      taskId: 'system',
      oldStatus: 'disconnected' as any,
      newStatus: 'connected' as any,
      timestamp: Date.now()
    });

    // 触发连接事件
    this.emit('connection:opened', { connectionId: id });

    return id;
  }

  /**
   * 移除连接
   *
   * @param connectionId - 连接ID
   */
  removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new ConnectionNotFoundError(connectionId);
    }

    // 取消所有订阅
    connection.subscribedTasks.forEach(taskId => {
      this.unsubscribeFromTask(connectionId, taskId);
    });

    // 关闭socket
    if (connection.socket.readyState === WebSocket.OPEN) {
      connection.socket.close();
    }

    // 移除连接
    this.connections.delete(connectionId);

    // 清理消息队列
    this.messageQueues.delete(connectionId);

    // 触发断开事件
    this.emit('connection:closed', { connectionId });
  }

  /**
   * 获取连接
   *
   * @param connectionId - 连接ID
   * @returns 连接对象
   */
  getConnection(connectionId: string): WebSocketConnection | undefined {
    return this.connections.get(connectionId);
  }

  /**
   * 获取所有连接
   *
   * @returns 连接列表
   */
  getAllConnections(): WebSocketConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * 获取连接统计
   *
   * @returns 统计信息
   */
  getStats(): {
    totalConnections: number;
    totalSubscriptions: number;
    taskSubscribers: Record<string, number>;
  } {
    const taskSubscribers: Record<string, number> = {};
    this.taskSubscribers.forEach((subscribers, taskId) => {
      taskSubscribers[taskId] = subscribers.size;
    });

    return {
      totalConnections: this.connections.size,
      totalSubscriptions: Array.from(this.taskSubscribers.values())
        .reduce((sum, set) => sum + set.size, 0),
      taskSubscribers
    };
  }

  // ========================================================================
  // 公共方法 - 订阅管理
  // ========================================================================

  /**
   * 订阅任务
   *
   * @param connectionId - 连接ID
   * @param taskId - 任务ID
   */
  subscribeToTask(connectionId: string, taskId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new ConnectionNotFoundError(connectionId);
    }

    // 添加到连接的订阅列表
    connection.subscribedTasks.add(taskId);

    // 添加到任务的订阅者列表
    if (!this.taskSubscribers.has(taskId)) {
      this.taskSubscribers.set(taskId, new Set());
    }
    this.taskSubscribers.get(taskId)!.add(connectionId);

    // 发送订阅确认
    this.sendToConnection(connectionId, {
      type: 'progress', // 使用progress作为确认类型
      taskId,
      progress: 0,
      stage: 'initializing' as any,
      message: `已订阅任务: ${taskId}`,
      timestamp: Date.now()
    });

    // 触发订阅事件
    this.emit('subscription:added', { connectionId, taskId });

    // 发送队列中的消息
    this.sendQueuedMessages(connectionId, taskId);
  }

  /**
   * 取消订阅任务
   *
   * @param connectionId - 连接ID
   * @param taskId - 任务ID
   */
  unsubscribeFromTask(connectionId: string, taskId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new ConnectionNotFoundError(connectionId);
    }

    // 从连接的订阅列表移除
    connection.subscribedTasks.delete(taskId);

    // 从任务的订阅者列表移除
    const subscribers = this.taskSubscribers.get(taskId);
    if (subscribers) {
      subscribers.delete(connectionId);
      if (subscribers.size === 0) {
        this.taskSubscribers.delete(taskId);
      }
    }

    // 触发取消订阅事件
    this.emit('subscription:removed', { connectionId, taskId });
  }

  /**
   * 批量订阅任务
   *
   * @param connectionId - 连接ID
   * @param taskIds - 任务ID列表
   */
  subscribeToTasks(connectionId: string, taskIds: string[]): void {
    taskIds.forEach(taskId => {
      this.subscribeToTask(connectionId, taskId);
    });
  }

  /**
   * 取消所有订阅
   *
   * @param connectionId - 连接ID
   */
  unsubscribeFromAllTasks(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new ConnectionNotFoundError(connectionId);
    }

    const taskIds = Array.from(connection.subscribedTasks);
    taskIds.forEach(taskId => {
      this.unsubscribeFromTask(connectionId, taskId);
    });
  }

  // ========================================================================
  // 公共方法 - 消息广播
  // ========================================================================

  /**
   * 广播事件到任务订阅者
   *
   * @param taskId - 任务ID
   * @param event - WebSocket事件
   * @param options - 广播选项
   */
  async broadcast(
    taskId: string,
    event: WebSocketEvent,
    options: BroadcastOptions = {}
  ): Promise<void> {
    const subscribers = this.taskSubscribers.get(taskId);
    if (!subscribers || subscribers.size === 0) {
      // 没有订阅者，将消息加入队列
      this.queueMessage(taskId, event);
      return;
    }

    // 广播到所有订阅者
    const promises = Array.from(subscribers)
      .filter(connectionId => {
        // 排除指定连接
        return options.excludeConnectionId
          ? connectionId !== options.excludeConnectionId
          : true;
      })
      .map(connectionId => this.sendToConnection(connectionId, event));

    await Promise.all(promises);
  }

  /**
   * 发送事件到指定连接
   *
   * @param connectionId - 连接ID
   * @param event - WebSocket事件
   */
  async sendToConnection(
    connectionId: string,
    event: WebSocketEvent
  ): Promise<boolean> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return false;
    }

    if (connection.socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      const message = JSON.stringify(event);
      connection.socket.send(message);
      return true;
    } catch (error) {
      console.error(`发送消息失败 [${connectionId}]:`, error);
      return false;
    }
  }

  /**
   * 广播到所有连接
   *
   * @param event - WebSocket事件
   */
  async broadcastToAll(event: WebSocketEvent): Promise<void> {
    const promises = Array.from(this.connections.keys()).map(connectionId =>
      this.sendToConnection(connectionId, event)
    );

    await Promise.all(promises);
  }

  // ========================================================================
  // 私有方法 - 消息处理
  // ========================================================================

  /**
   * 设置消息处理器
   */
  private setupMessageHandlers(connection: WebSocketConnection): void {
    connection.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as ClientMessage;
        this.handleClientMessage(connection.id, message);
      } catch (error) {
        console.error(`处理客户端消息失败 [${connection.id}]:`, error);
      }
    };
  }

  /**
   * 处理客户端消息
   */
  private handleClientMessage(
    connectionId: string,
    message: ClientMessage
  ): void {
    switch (message.action) {
      case 'subscribe':
        this.subscribeToTasks(connectionId, message.taskIds);
        break;

      case 'unsubscribe':
        if (message.taskIds) {
          message.taskIds.forEach(taskId => {
            this.unsubscribeFromTask(connectionId, taskId);
          });
        } else {
          this.unsubscribeFromAllTasks(connectionId);
        }
        break;

      case 'heartbeat':
        this.handleHeartbeat(connectionId);
        break;

      default:
        console.warn(`未知消息类型:`, message);
    }
  }

  /**
   * 处理心跳
   */
  private handleHeartbeat(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    connection.lastHeartbeat = Date.now();

    // 回复心跳
    this.sendToConnection(connectionId, {
      type: 'progress',
      taskId: 'system',
      progress: 0,
      stage: 'initializing' as any,
      message: 'heartbeat',
      timestamp: Date.now()
    });
  }

  // ========================================================================
  // 私有方法 - 连接管理
  // ========================================================================

  /**
   * 处理连接关闭
   */
  private handleConnectionClose(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    // 取消所有订阅
    connection.subscribedTasks.forEach(taskId => {
      this.unsubscribeFromTask(connectionId, taskId);
    });

    // 移除连接
    this.connections.delete(connectionId);

    // 清理消息队列
    this.messageQueues.delete(connectionId);

    // 触发断开事件
    this.emit('connection:closed', { connectionId });
  }

  /**
   * 处理连接错误
   */
  private handleConnectionError(connectionId: string, error: Event): void {
    console.error(`连接错误 [${connectionId}]:`, error);

    // 触发错误事件
    this.emit('connection:error', { connectionId, error });
  }

  // ========================================================================
  // 私有方法 - 消息队列
  // ========================================================================

  /**
   * 队列消息（用于离线客户端）
   */
  private queueMessage(taskId: string, event: WebSocketEvent): void {
    // 为任务创建队列键
    const queueKey = `task:${taskId}`;

    if (!this.messageQueues.has(queueKey)) {
      this.messageQueues.set(queueKey, []);
    }

    const queue = this.messageQueues.get(queueKey)!;

    // 检查队列大小
    if (queue.length >= this.config.maxMessageQueueSize) {
      // 移除最旧的消息
      queue.shift();
    }

    queue.push(event);
  }

  /**
   * 发送队列中的消息
   */
  private sendQueuedMessages(connectionId: string, taskId: string): void {
    const queueKey = `task:${taskId}`;
    const queue = this.messageQueues.get(queueKey);

    if (!queue || queue.length === 0) {
      return;
    }

    // 发送所有队列中的消息
    const messages = [...queue];
    this.messageQueues.delete(queueKey);

    messages.forEach(event => {
      this.sendToConnection(connectionId, event);
    });
  }

  // ========================================================================
  // 私有方法 - 心跳检测
  // ========================================================================

  /**
   * 启动心跳检测
   */
  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();
      const timeout = this.config.connectionTimeout;

      // 检查所有连接
      this.connections.forEach((connection, connectionId) => {
        if (now - connection.lastHeartbeat > timeout) {
          // 连接超时，移除
          console.warn(`连接超时 [${connectionId}]`);
          this.removeConnection(connectionId);
        }
      });
    }, this.config.heartbeatInterval);
  }

  /**
   * 停止心跳检测
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // ========================================================================
  // 私有方法 - 工具函数
  // ========================================================================

  /**
   * 生成连接ID
   */
  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  // ========================================================================
  // 清理
  // ========================================================================

  /**
   * 销毁管理器
   */
  destroy(): void {
    // 停止心跳
    this.stopHeartbeat();

    // 关闭所有连接
    this.connections.forEach((_, connectionId) => {
      this.removeConnection(connectionId);
    });

    // 清理队列
    this.messageQueues.clear();
    this.taskSubscribers.clear();

    // 移除所有监听器
    this.removeAllListeners();
  }
}

// ============================================================================
// 导出
// ============================================================================

export default WebSocketManager;
