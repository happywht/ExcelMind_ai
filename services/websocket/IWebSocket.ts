/**
 * 统一WebSocket接口 - Phase 2 WebSocket实现统一
 *
 * 职责：
 * 1. 定义统一的WebSocket接口规范
 * 2. 支持服务端和客户端实现
 * 3. 提供一致的API体验
 * 4. 支持连接管理、订阅、消息发送
 *
 * @version 1.0.0
 * @module IWebSocket
 */

// ============================================================================
// 接口定义
// ============================================================================

/**
 * WebSocket连接状态
 */
export type WebSocketState = 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * 连接选项
 */
export interface ConnectOptions {
  /** 是否自动重连 */
  reconnect?: boolean;
  /** 重连间隔（毫秒） */
  reconnectInterval?: number;
  /** 最大重连次数 */
  maxReconnectAttempts?: number;
  /** 心跳间隔（毫秒） */
  heartbeatInterval?: number;
  /** 连接超时（毫秒） */
  connectionTimeout?: number;
}

/**
 * 消息处理器
 */
export type MessageHandler = (message: any) => void | Promise<void>;

/**
 * 事件处理器
 */
export type EventHandler = (...args: any[]) => void;

/**
 * 订阅选项
 */
export interface SubscribeOptions {
  /** 是否接收历史消息 */
  includeHistory?: boolean;
  /** 历史消息数量限制 */
  historyLimit?: number;
}

/**
 * 广播选项
 */
export interface BroadcastOptions {
  /** 排除的连接ID */
  excludeConnectionId?: string;
  /** 只发送给订阅者 */
  includeSubscribersOnly?: boolean;
}

/**
 * WebSocket统计信息
 */
export interface WebSocketStats {
  /** 连接状态 */
  state: WebSocketState;
  /** 连接ID */
  connectionId?: string;
  /** 连接时间戳 */
  connectedAt?: number;
  /** 最后心跳时间 */
  lastHeartbeat?: number;
  /** 发送消息总数 */
  messagesSent: number;
  /** 接收消息总数 */
  messagesReceived: number;
  /** 订阅数量 */
  subscriptions: number;
}

// ============================================================================
// 统一WebSocket接口
// ============================================================================

/**
 * 统一WebSocket接口
 *
 * 定义了服务端和客户端WebSocket实现必须遵循的统一接口
 */
export interface IWebSocket {
  // ========================================================================
  // 连接管理
  // ========================================================================

  /**
   * 建立WebSocket连接
   *
   * @param url - WebSocket服务器URL（客户端需要）
   * @param options - 连接选项
   * @returns Promise<void>
   */
  connect(url?: string, options?: ConnectOptions): Promise<void>;

  /**
   * 断开WebSocket连接
   *
   * @returns Promise<void>
   */
  disconnect(): Promise<void>;

  /**
   * 检查是否已连接
   *
   * @returns 是否已连接
   */
  isConnected(): boolean;

  /**
   * 获取连接ID
   *
   * @returns 连接ID
   */
  getConnectionId(): string;

  /**
   * 获取连接状态
   *
   * @returns 连接状态
   */
  getState(): WebSocketState;

  // ========================================================================
  // 订阅管理
  // ========================================================================

  /**
   * 订阅频道
   *
   * @param channel - 频道名称
   * @param handler - 消息处理器
   * @param options - 订阅选项
   */
  subscribe(channel: string, handler: MessageHandler, options?: SubscribeOptions): void;

  /**
   * 取消订阅频道
   *
   * @param channel - 频道名称
   */
  unsubscribe(channel: string): void;

  /**
   * 取消所有订阅
   */
  unsubscribeAll(): void;

  /**
   * 获取订阅列表
   *
   * @returns 订阅的频道列表
   */
  getSubscriptions(): string[];

  // ========================================================================
  // 消息发送
  // ========================================================================

  /**
   * 发送消息到指定频道
   *
   * @param channel - 频道名称
   * @param message - 消息内容
   * @returns Promise<void>
   */
  send(channel: string, message: any): Promise<void>;

  /**
   * 广播消息到频道
   *
   * @param channel - 频道名称
   * @param message - 消息内容
   * @param options - 广播选项
   * @returns Promise<void>
   */
  broadcast(channel: string, message: any, options?: BroadcastOptions): Promise<void>;

  /**
   * 发送消息到指定连接
   *
   * @param connectionId - 连接ID
   * @param message - 消息内容
   * @returns Promise<void>
   */
  sendToConnection(connectionId: string, message: any): Promise<void>;

  /**
   * 广播消息到所有连接
   *
   * @param message - 消息内容
   * @returns Promise<void>
   */
  broadcastToAll(message: any): Promise<void>;

  // ========================================================================
  // 房间管理（服务端）
  // ========================================================================

  /**
   * 加入房间
   *
   * @param room - 房间名称
   * @returns Promise<void>
   */
  joinRoom?(room: string): Promise<void>;

  /**
   * 离开房间
   *
   * @param room - 房间名称
   * @returns Promise<void>
   */
  leaveRoom?(room: string): Promise<void>;

  /**
   * 发送消息到房间
   *
   * @param room - 房间名称
   * @param message - 消息内容
   * @returns Promise<void>
   */
  sendToRoom?(room: string, message: any): Promise<void>;

  /**
   * 获取房间内的客户端列表
   *
   * @param room - 房间名称
   * @returns 客户端ID列表
   */
  getRoomClients?(room: string): string[];

  // ========================================================================
  // 事件处理
  // ========================================================================

  /**
   * 注册事件处理器
   *
   * @param event - 事件名称
   * @param handler - 事件处理器
   */
  on(event: 'connected' | 'disconnected' | 'error' | 'message', handler: EventHandler): void;

  /**
   * 移除事件处理器
   *
   * @param event - 事件名称
   * @param handler - 事件处理器
   */
  off(event: string, handler?: EventHandler): void;

  /**
   * 移除所有事件处理器
   */
  removeAllListeners?(event?: string): void;

  // ========================================================================
  // 统计和监控
  // ========================================================================

  /**
   * 获取统计信息
   *
   * @returns 统计信息对象
   */
  getStats(): WebSocketStats;

  /**
   * 获取服务器统计信息（服务端）
   *
   * @returns 服务器统计信息
   */
  getServerStats?(): any;
}

// ============================================================================
// 导出
// ============================================================================

export default IWebSocket;
