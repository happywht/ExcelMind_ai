/**
 * 客户端WebSocket实现 - Phase 2 WebSocket实现统一
 *
 * 职责：
 * 1. 实现IWebSocket接口的客户端版本
 * 2. 提供自动重连、心跳检测
 * 3. 支持频道订阅和消息路由
 * 4. 提供统一的客户端WebSocket API
 *
 * @version 1.0.0
 * @module ClientWebSocket
 */

import {
  IWebSocket,
  ConnectOptions,
  MessageHandler,
  EventHandler,
  SubscribeOptions,
  BroadcastOptions,
  WebSocketStats,
  WebSocketState,
} from './IWebSocket';

// ============================================================================
// 默认配置
// ============================================================================

const DEFAULT_OPTIONS: ConnectOptions = {
  reconnect: true,
  reconnectInterval: 3000,
  maxReconnectAttempts: 10,
  heartbeatInterval: 30000,
  connectionTimeout: 60000,
};

// ============================================================================
// 客户端WebSocket实现类
// ============================================================================

/**
 * 客户端WebSocket实现
 *
 * 提供完整的客户端WebSocket功能，包括自动重连、心跳检测等
 */
export class ClientWebSocket implements IWebSocket {
  // ========================================================================
  // 私有属性
  // ========================================================================

  private socket: WebSocket | null = null;
  private url: string;
  private options: ConnectOptions;
  private connectionId: string | null = null;
  private state: WebSocketState = 'disconnected';
  private connectedAt: number = 0;
  private lastHeartbeat: number = 0;

  // 订阅管理
  private subscriptions: Map<string, Set<MessageHandler>> = new Map();
  private subscriptionRooms: Map<string, string> = new Map(); // channel -> room

  // 事件管理
  private eventHandlers: Map<string, Set<EventHandler>> = new Map();

  // 定时器
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;

  // 重连管理
  private reconnectAttempts: number = 0;
  private manualDisconnect: boolean = false;

  // 统计信息
  private stats: WebSocketStats = {
    state: 'disconnected',
    messagesSent: 0,
    messagesReceived: 0,
    subscriptions: 0,
  };

  // ========================================================================
  // 构造函数
  // ========================================================================

  /**
   * 构造客户端WebSocket实例
   *
   * @param url - WebSocket服务器URL
   * @param options - 连接选项
   */
  constructor(url: string, options?: ConnectOptions) {
    this.url = url;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  // ========================================================================
  // 连接管理
  // ========================================================================

  /**
   * 建立WebSocket连接
   */
  async connect(): Promise<void> {
    if (this.state === 'connected' || this.state === 'connecting') {
      console.log('[ClientWebSocket] Already connected or connecting');
      return;
    }

    this.state = 'connecting';
    this.stats.state = 'connecting';
    this.manualDisconnect = false;

    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(this.url);

        // 连接打开
        this.socket.onopen = () => {
          console.log('[ClientWebSocket] Connected to', this.url);
          this.state = 'connected';
          this.stats.state = 'connected';
          this.connectedAt = Date.now();
          this.lastHeartbeat = Date.now();
          this.connectionId = this.generateConnectionId();
          this.stats.connectionId = this.connectionId;
          this.stats.connectedAt = this.connectedAt;

          // 重置重连计数
          this.reconnectAttempts = 0;

          // 启动心跳
          this.startHeartbeat();

          // 重新订阅之前的频道
          this.resubscribeAll();

          // 触发连接事件
          this.emit('connected', { connectionId: this.connectionId });

          resolve();
        };

        // 接收消息
        this.socket.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        // 连接错误
        this.socket.onerror = (error) => {
          console.error('[ClientWebSocket] Connection error:', error);
          this.state = 'error';
          this.stats.state = 'error';
          this.emit('error', error);
          reject(error);
        };

        // 连接关闭
        this.socket.onclose = () => {
          console.log('[ClientWebSocket] Connection closed');
          this.state = 'disconnected';
          this.stats.state = 'disconnected';
          this.stopHeartbeat();

          // 触发断开事件
          this.emit('disconnected', { connectionId: this.connectionId });

          // 自动重连
          if (!this.manualDisconnect &&
              this.options.reconnect &&
              this.reconnectAttempts < this.options.maxReconnectAttempts!) {
            this.scheduleReconnect();
          }
        };

      } catch (error) {
        this.state = 'error';
        this.stats.state = 'error';
        reject(error);
      }
    });
  }

  /**
   * 断开WebSocket连接
   */
  async disconnect(): Promise<void> {
    this.manualDisconnect = true;
    this.stopHeartbeat();
    this.stopReconnect();

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.state = 'disconnected';
    this.stats.state = 'disconnected';
  }

  /**
   * 检查是否已连接
   */
  isConnected(): boolean {
    return this.state === 'connected' && this.socket?.readyState === WebSocket.OPEN;
  }

  /**
   * 获取连接ID
   */
  getConnectionId(): string {
    return this.connectionId || '';
  }

  /**
   * 获取连接状态
   */
  getState(): WebSocketState {
    return this.state;
  }

  // ========================================================================
  // 订阅管理
  // ========================================================================

  /**
   * 订阅频道
   */
  subscribe(channel: string, handler: MessageHandler, options?: SubscribeOptions): void {
    // 添加到本地订阅列表
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
      this.stats.subscriptions++;
    }
    this.subscriptions.get(channel)!.add(handler);

    // 发送订阅请求到服务器
    if (this.isConnected()) {
      this.sendSubscriptionMessage(channel, 'subscribe');
    }
  }

  /**
   * 取消订阅频道
   */
  unsubscribe(channel: string): void {
    const handlers = this.subscriptions.get(channel);
    if (handlers) {
      this.subscriptions.delete(channel);
      this.subscriptionRooms.delete(channel);
      this.stats.subscriptions--;
    }

    // 发送取消订阅请求到服务器
    if (this.isConnected()) {
      this.sendSubscriptionMessage(channel, 'unsubscribe');
    }
  }

  /**
   * 取消所有订阅
   */
  unsubscribeAll(): void {
    const channels = Array.from(this.subscriptions.keys());
    channels.forEach(channel => this.unsubscribe(channel));
  }

  /**
   * 获取订阅列表
   */
  getSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  // ========================================================================
  // 消息发送
  // ========================================================================

  /**
   * 发送消息到指定频道
   */
  async send(channel: string, message: any): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('WebSocket is not connected');
    }

    this.stats.messagesSent++;
    const payload = {
      channel,
      message,
      timestamp: Date.now(),
    };

    this.socket!.send(JSON.stringify(payload));
  }

  /**
   * 广播消息
   */
  async broadcast(channel: string, message: any, options?: BroadcastOptions): Promise<void> {
    // 客户端广播就是普通发送
    await this.send(channel, message);
  }

  /**
   * 发送消息到指定连接
   */
  async sendToConnection(connectionId: string, message: any): Promise<void> {
    // 客户端发送消息到服务器，由服务器路由到指定连接
    await this.send('/private', {
      targetConnectionId: connectionId,
      message,
    });
  }

  /**
   * 广播消息到所有连接
   */
  async broadcastToAll(message: any): Promise<void> {
    await this.send('/broadcast', message);
  }

  // ========================================================================
  // 房间管理
  // ========================================================================

  /**
   * 加入房间
   */
  async joinRoom(room: string): Promise<void> {
    if (this.isConnected()) {
      await this.send('/join', { room });
    }
  }

  /**
   * 离开房间
   */
  async leaveRoom(room: string): Promise<void> {
    if (this.isConnected()) {
      await this.send('/leave', { room });
    }
  }

  /**
   * 发送消息到房间
   */
  async sendToRoom(room: string, message: any): Promise<void> {
    await this.send(room, message);
  }

  // ========================================================================
  // 事件处理
  // ========================================================================

  /**
   * 注册事件处理器
   */
  on(event: 'connected' | 'disconnected' | 'error' | 'message', handler: EventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  /**
   * 移除事件处理器
   */
  off(event: string, handler?: EventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      if (handler) {
        handlers.delete(handler);
      } else {
        this.eventHandlers.delete(event);
      }
    }
  }

  /**
   * 移除所有事件处理器
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.eventHandlers.delete(event);
    } else {
      this.eventHandlers.clear();
    }
  }

  // ========================================================================
  // 统计和监控
  // ========================================================================

  /**
   * 获取统计信息
   */
  getStats(): WebSocketStats {
    return {
      ...this.stats,
      state: this.state,
      connectionId: this.connectionId || undefined,
      connectedAt: this.connectedAt || undefined,
      lastHeartbeat: this.lastHeartbeat || undefined,
    };
  }

  // ========================================================================
  // 私有方法
  // ========================================================================

  /**
   * 处理接收到的消息
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      this.stats.messagesReceived++;

      // 处理心跳消息
      if (message.type === 'pong' || message.type === 'heartbeat') {
        this.lastHeartbeat = Date.now();
        this.stats.lastHeartbeat = this.lastHeartbeat;
        return;
      }

      // 处理订阅确认
      if (message.type === 'subscription_ack') {
        console.log('[ClientWebSocket] Subscription acknowledged:', message.payload);
        return;
      }

      // 触发消息事件
      this.emit('message', message);

      // 路由到订阅处理器
      const channel = message.channel || 'default';
      const handlers = this.subscriptions.get(channel);

      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(message.message || message.payload || message);
          } catch (error) {
            console.error('[ClientWebSocket] Handler error:', error);
            this.emit('error', error);
          }
        });
      }

    } catch (error) {
      console.error('[ClientWebSocket] Message parse error:', error);
    }
  }

  /**
   * 发送订阅消息
   */
  private sendSubscriptionMessage(channel: string, action: 'subscribe' | 'unsubscribe'): void {
    const message = {
      type: action,
      payload: { channel },
      timestamp: Date.now(),
    };
    this.socket!.send(JSON.stringify(message));
  }

  /**
   * 重新订阅所有频道
   */
  private resubscribeAll(): void {
    const channels = Array.from(this.subscriptions.keys());
    channels.forEach(channel => {
      this.sendSubscriptionMessage(channel, 'subscribe');
    });
  }

  /**
   * 启动心跳检测
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.send('/ping', { timestamp: Date.now() });
      }
    }, this.options.heartbeatInterval);
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

  /**
   * 安排重连
   */
  private scheduleReconnect(): void {
    this.reconnectAttempts++;

    const delay = this.options.reconnectInterval! *
      Math.pow(2, this.reconnectAttempts - 1); // 指数退避

    console.log(`[ClientWebSocket] Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      console.log('[ClientWebSocket] Attempting to reconnect...');
      this.connect().catch(error => {
        console.error('[ClientWebSocket] Reconnect failed:', error);
      });
    }, delay);
  }

  /**
   * 停止重连
   */
  private stopReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * 触发事件
   */
  private emit(event: string, ...args: any[]): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`[ClientWebSocket] Event handler error [${event}]:`, error);
        }
      });
    }
  }

  /**
   * 生成连接ID
   */
  private generateConnectionId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// ============================================================================
// 导出
// ============================================================================

export default ClientWebSocket;
