/**
 * WebSocket服务 - Phase 2 实时通信
 *
 * 职责：提供WebSocket实时消息推送功能
 * 功能：进度推送、状态更新、事件通知
 *
 * @module services/websocket/websocketService
 * @version 1.0.0
 * @description WebSocket实时通信服务
 */

/**
 * WebSocket消息类型
 */
export type WebSocketMessageType =
  | 'analysis_started'
  | 'analysis_progress'
  | 'analysis_completed'
  | 'analysis_error'
  | 'recommendations_started'
  | 'recommendations_completed'
  | 'cleaning_started'
  | 'cleaning_progress'
  | 'cleaning_completed'
  | 'cleaning_error';

/**
 * WebSocket消息
 */
export interface WebSocketMessage<T = any> {
  type: WebSocketMessageType;
  payload: T;
  timestamp?: number;
}

/**
 * WebSocket服务接口
 */
export interface IWebSocketService {
  /**
   * 发送消息到指定客户端
   */
  send(clientId: string, message: WebSocketMessage): Promise<void>;

  /**
   * 广播消息到所有客户端
   */
  broadcast(message: WebSocketMessage): Promise<void>;

  /**
   * 订阅频道
   */
  subscribe(clientId: string, channel: string): Promise<void>;

  /**
   * 取消订阅频道
   */
  unsubscribe(clientId: string, channel: string): Promise<void>;

  /**
   * 处理连接
   */
  handleConnection(clientId: string): void;

  /**
   * 处理断开连接
   */
  handleDisconnection(clientId: string): void;
}

/**
 * WebSocket服务实现
 *
 * 提供内存级别的WebSocket消息管理
 * 实际WebSocket连接由上层应用服务器处理
 */
export class WebSocketService implements IWebSocketService {
  // 客户端连接映射（实际由服务器维护）
  private connectedClients: Map<string, Set<string>>;
  // 频道订阅映射
  private channelSubscriptions: Map<string, Set<string>>;
  // 消息队列（用于测试）
  private messageQueues: Map<string, WebSocketMessage[]>;

  /**
   * 构造函数
   */
  constructor() {
    this.connectedClients = new Map();
    this.channelSubscriptions = new Map();
    this.messageQueues = new Map();
  }

  /**
   * 发送消息到指定客户端
   *
   * @param clientId 客户端ID
   * @param message 消息内容
   */
  async send(clientId: string, message: WebSocketMessage): Promise<void> {
    // 添加时间戳
    message.timestamp = message.timestamp || Date.now();

    // 在实际实现中，这里会通过WebSocket连接发送消息
    // 目前我们将其放入消息队列供测试使用
    if (!this.messageQueues.has(clientId)) {
      this.messageQueues.set(clientId, []);
    }
    this.messageQueues.get(clientId)!.push(message);

    // 记录日志
    console.log(`[WebSocketService] 发送消息到客户端 ${clientId}:`, {
      type: message.type,
      timestamp: message.timestamp
    });
  }

  /**
   * 广播消息到所有客户端
   *
   * @param message 消息内容
   */
  async broadcast(message: WebSocketMessage): Promise<void> {
    // 添加时间戳
    message.timestamp = message.timestamp || Date.now();

    // 发送给所有连接的客户端
    for (const clientId of this.connectedClients.keys()) {
      await this.send(clientId, message);
    }
  }

  /**
   * 订阅频道
   *
   * @param clientId 客户端ID
   * @param channel 频道名称
   */
  async subscribe(clientId: string, channel: string): Promise<void> {
    if (!this.channelSubscriptions.has(channel)) {
      this.channelSubscriptions.set(channel, new Set());
    }
    this.channelSubscriptions.get(channel)!.add(clientId);

    console.log(`[WebSocketService] 客户端 ${clientId} 订阅频道 ${channel}`);
  }

  /**
   * 取消订阅频道
   *
   * @param clientId 客户端ID
   * @param channel 频道名称
   */
  async unsubscribe(clientId: string, channel: string): Promise<void> {
    const subscribers = this.channelSubscriptions.get(channel);
    if (subscribers) {
      subscribers.delete(clientId);
    }

    console.log(`[WebSocketService] 客户端 ${clientId} 取消订阅频道 ${channel}`);
  }

  /**
   * 处理新连接
   *
   * @param clientId 客户端ID
   */
  handleConnection(clientId: string): void {
    if (!this.connectedClients.has(clientId)) {
      this.connectedClients.set(clientId, new Set());
    }
    console.log(`[WebSocketService] 客户端 ${clientId} 已连接`);
  }

  /**
   * 处理断开连接
   *
   * @param clientId 客户端ID
   */
  handleDisconnection(clientId: string): void {
    // 从所有频道移除
    for (const [channel, subscribers] of this.channelSubscriptions.entries()) {
      subscribers.delete(clientId);
    }

    // 清理客户端数据
    this.connectedClients.delete(clientId);
    this.messageQueues.delete(clientId);

    console.log(`[WebSocketService] 客户端 ${clientId} 已断开`);
  }

  /**
   * 发送消息到频道
   *
   * @param channel 频道名称
   * @param message 消息内容
   */
  async sendToChannel(channel: string, message: WebSocketMessage): Promise<void> {
    const subscribers = this.channelSubscriptions.get(channel);
    if (subscribers) {
      for (const clientId of subscribers) {
        await this.send(clientId, message);
      }
    }
  }

  /**
   * 获取客户端的消息队列（用于测试）
   *
   * @param clientId 客户端ID
   * @returns 消息队列
   */
  getMessageQueue(clientId: string): WebSocketMessage[] {
    return this.messageQueues.get(clientId) || [];
  }

  /**
   * 清空客户端的消息队列
   *
   * @param clientId 客户端ID
   */
  clearMessageQueue(clientId: string): void {
    this.messageQueues.delete(clientId);
  }

  /**
   * 获取连接的客户端列表
   *
   * @returns 客户端ID数组
   */
  getConnectedClients(): string[] {
    return Array.from(this.connectedClients.keys());
  }

  /**
   * 获取频道的订阅者列表
   *
   * @param channel 频道名称
   * @returns 订阅者ID数组
   */
  getChannelSubscribers(channel: string): string[] {
    const subscribers = this.channelSubscriptions.get(channel);
    return subscribers ? Array.from(subscribers) : [];
  }
}

/**
 * 创建WebSocket服务实例
 */
export function createWebSocketService(): WebSocketService {
  return new WebSocketService();
}

// 导出默认实例（单例）
export const webSocketService = new WebSocketService();
