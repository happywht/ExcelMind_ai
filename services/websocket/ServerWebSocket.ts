/**
 * 服务端WebSocket实现 - Phase 2 WebSocket实现统一
 *
 * 职责：
 * 1. 实现IWebSocket接口的服务端版本
 * 2. 封装WebSocketServer功能
 * 3. 提供统一的服务端WebSocket API
 * 4. 支持房间、订阅、广播等功能
 *
 * @version 1.0.0
 * @module ServerWebSocket
 */

import type { WebSocketServer } from '../../server/websocket/websocketServer';
import type { WebSocketMessage } from '../../types/websocket';
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
// 服务端WebSocket实现类
// ============================================================================

/**
 * 服务端WebSocket实现
 *
 * 封装WebSocketServer，提供统一的IWebSocket接口
 */
export class ServerWebSocket implements IWebSocket {
  // ========================================================================
  // 私有属性
  // ========================================================================

  private wsServer: WebSocketServer;
  private eventHandlers: Map<string, Set<EventHandler>> = new Map();
  private subscriptions: Map<string, Set<MessageHandler>> = new Map();
  private connectionId: string;
  private state: WebSocketState = 'disconnected';
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
   * 构造服务端WebSocket实例
   *
   * @param wsServer - WebSocket服务器实例
   */
  constructor(wsServer: WebSocketServer) {
    this.wsServer = wsServer;
    this.connectionId = 'server';
    this.state = 'connected';
    this.stats.state = 'connected';

    // 监听服务器事件
    this.setupServerEvents();
  }

  // ========================================================================
  // 连接管理
  // ========================================================================

  /**
   * 连接（服务端不支持主动连接）
   */
  async connect(): Promise<void> {
    throw new Error('Server WebSocket does not support active connection');
  }

  /**
   * 断开连接（关闭服务器）
   */
  async disconnect(): Promise<void> {
    await this.wsServer.stop();
    this.state = 'disconnected';
    this.stats.state = 'disconnected';
    this.emit('disconnected');
  }

  /**
   * 检查是否已连接
   */
  isConnected(): boolean {
    return this.state === 'connected';
  }

  /**
   * 获取连接ID
   */
  getConnectionId(): string {
    return this.connectionId;
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
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
      this.stats.subscriptions++;
    }
    this.subscriptions.get(channel)!.add(handler);

    // 监听WebSocket服务器的消息事件
    this.wsServer.on('message', (clientId: string, data: any) => {
      this.handleIncomingMessage(channel, data);
    });
  }

  /**
   * 取消订阅频道
   */
  unsubscribe(channel: string): void {
    const handlers = this.subscriptions.get(channel);
    if (handlers) {
      this.subscriptions.delete(channel);
      this.stats.subscriptions--;
    }
  }

  /**
   * 取消所有订阅
   */
  unsubscribeAll(): void {
    this.subscriptions.clear();
    this.stats.subscriptions = 0;
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
    this.stats.messagesSent++;

    // 广播到房间
    await this.wsServer.broadcast(channel, message as WebSocketMessage);
  }

  /**
   * 广播消息
   */
  async broadcast(channel: string, message: any, options?: BroadcastOptions): Promise<void> {
    this.stats.messagesSent++;

    if (options?.excludeConnectionId) {
      // 排除特定连接的广播
      const roomClients = this.wsServer.getRoomClients(channel);
      const targetClients = roomClients.filter(id => id !== options.excludeConnectionId);

      for (const clientId of targetClients) {
        await this.wsServer.send(clientId, message as WebSocketMessage);
      }
    } else {
      // 普通广播
      await this.wsServer.broadcast(channel, message as WebSocketMessage);
    }
  }

  /**
   * 发送消息到指定连接
   */
  async sendToConnection(connectionId: string, message: any): Promise<void> {
    this.stats.messagesSent++;
    await this.wsServer.send(connectionId, message as WebSocketMessage);
  }

  /**
   * 广播消息到所有连接
   */
  async broadcastToAll(message: any): Promise<void> {
    this.stats.messagesSent++;
    await this.wsServer.broadcastToAll(message as WebSocketMessage);
  }

  // ========================================================================
  // 房间管理
  // ========================================================================

  /**
   * 加入房间
   */
  async joinRoom(room: string): Promise<void> {
    // 服务端不需要加入房间
    // 这个方法主要是为了接口一致性
    console.log(`[ServerWebSocket] Server joined room: ${room}`);
  }

  /**
   * 离开房间
   */
  async leaveRoom(room: string): Promise<void> {
    console.log(`[ServerWebSocket] Server left room: ${room}`);
  }

  /**
   * 发送消息到房间
   */
  async sendToRoom(room: string, message: any): Promise<void> {
    this.stats.messagesSent++;
    await this.wsServer.sendToRoom(room, message as WebSocketMessage);
  }

  /**
   * 获取房间内的客户端列表
   */
  getRoomClients(room: string): string[] {
    return this.wsServer.getRoomClients(room);
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
        // 移除所有该事件的处理器
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
      connectionId: this.connectionId,
    };
  }

  /**
   * 获取服务器统计信息
   */
  getServerStats(): any {
    return this.wsServer.getStats();
  }

  // ========================================================================
  // 私有方法
  // ========================================================================

  /**
   * 设置服务器事件监听
   */
  private setupServerEvents(): void {
    // 监听连接事件
    this.wsServer.on('connection', (clientId: string) => {
      this.stats.messagesReceived++;
      this.emit('connected', { clientId });
    });

    // 监听断开连接事件
    this.wsServer.on('disconnection', (clientId: string) => {
      this.emit('disconnected', { clientId });
    });

    // 监听错误事件
    this.wsServer.on('error', (error: Error) => {
      this.emit('error', error);
    });
  }

  /**
   * 处理接收到的消息
   */
  private handleIncomingMessage(channel: string, data: any): void {
    const handlers = this.subscriptions.get(channel);
    if (handlers) {
      this.stats.messagesReceived++;
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error('[ServerWebSocket] Handler error:', error);
          this.emit('error', error);
        }
      });
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
          console.error(`[ServerWebSocket] Event handler error [${event}]:`, error);
        }
      });
    }
  }
}

// ============================================================================
// 导出
// ============================================================================

export default ServerWebSocket;
