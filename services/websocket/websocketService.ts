/**
 * 统一WebSocket服务 - Phase 2 WebSocket实现统一
 *
 * 职责：
 * 1. 提供统一的WebSocket服务入口
 * 2. 自动选择服务端或客户端实现
 * 3. 管理WebSocket实例生命周期
 * 4. 提供单例模式访问
 *
 * @module services/websocket/websocketService
 * @version 2.0.0
 * @description 统一WebSocket实时通信服务
 */

// ============================================================================
// 导出统一接口
// ============================================================================

export * from './IWebSocket';

// ============================================================================
// 导出实现类
// ============================================================================

export { ServerWebSocket } from './ServerWebSocket';
export { ClientWebSocket } from './ClientWebSocket';

// ============================================================================
// 导入类型定义
// ============================================================================

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
import { ServerWebSocket } from './ServerWebSocket';
import { ClientWebSocket } from './ClientWebSocket';

// ============================================================================
// WebSocket环境类型
// ============================================================================

export type WebSocketEnvironment = 'server' | 'client';

// ============================================================================
// 统一WebSocket服务类
// ============================================================================

/**
 * 统一WebSocket服务
 *
 * 根据环境自动选择服务端或客户端实现
 */
export class WebSocketService implements IWebSocket {
  // ========================================================================
  // 私有属性
  // ========================================================================

  private impl: IWebSocket;
  private environment: WebSocketEnvironment;

  // ========================================================================
  // 构造函数
  // ========================================================================

  /**
   * 构造WebSocket服务实例
   *
   * @param environment - 运行环境 ('server' | 'client')
   * @param url - WebSocket URL（客户端需要）
   * @param options - 连接选项
   * @param wsServer - WebSocket服务器实例（服务端需要）
   */
  constructor(
    environment: WebSocketEnvironment,
    url?: string,
    options?: ConnectOptions,
    wsServer?: any
  ) {
    this.environment = environment;

    if (environment === 'server') {
      if (!wsServer) {
        throw new Error('WebSocketServer instance is required for server environment');
      }
      this.impl = new ServerWebSocket(wsServer);
    } else {
      if (!url) {
        throw new Error('URL is required for client environment');
      }
      this.impl = new ClientWebSocket(url, options);
    }
  }

  // ========================================================================
  // 连接管理
  // ========================================================================

  /**
   * 建立连接
   */
  async connect(url?: string, options?: ConnectOptions): Promise<void> {
    return this.impl.connect(url, options);
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    return this.impl.disconnect();
  }

  /**
   * 检查是否已连接
   */
  isConnected(): boolean {
    return this.impl.isConnected();
  }

  /**
   * 获取连接ID
   */
  getConnectionId(): string {
    return this.impl.getConnectionId();
  }

  /**
   * 获取连接状态
   */
  getState(): WebSocketState {
    return this.impl.getState();
  }

  // ========================================================================
  // 订阅管理
  // ========================================================================

  /**
   * 订阅频道
   */
  subscribe(channel: string, handler: MessageHandler, options?: SubscribeOptions): void {
    this.impl.subscribe(channel, handler, options);
  }

  /**
   * 取消订阅频道
   */
  unsubscribe(channel: string): void {
    this.impl.unsubscribe(channel);
  }

  /**
   * 取消所有订阅
   */
  unsubscribeAll(): void {
    this.impl.unsubscribeAll();
  }

  /**
   * 获取订阅列表
   */
  getSubscriptions(): string[] {
    return this.impl.getSubscriptions();
  }

  // ========================================================================
  // 消息发送
  // ========================================================================

  /**
   * 发送消息到指定频道
   */
  async send(channel: string, message: any): Promise<void> {
    return this.impl.send(channel, message);
  }

  /**
   * 广播消息
   */
  async broadcast(channel: string, message: any, options?: BroadcastOptions): Promise<void> {
    return this.impl.broadcast(channel, message, options);
  }

  /**
   * 发送消息到指定连接
   */
  async sendToConnection(connectionId: string, message: any): Promise<void> {
    return this.impl.sendToConnection(connectionId, message);
  }

  /**
   * 广播消息到所有连接
   */
  async broadcastToAll(message: any): Promise<void> {
    return this.impl.broadcastToAll(message);
  }

  // ========================================================================
  // 房间管理
  // ========================================================================

  /**
   * 加入房间
   */
  async joinRoom(room: string): Promise<void> {
    if (this.impl.joinRoom) {
      return this.impl.joinRoom(room);
    }
  }

  /**
   * 离开房间
   */
  async leaveRoom(room: string): Promise<void> {
    if (this.impl.leaveRoom) {
      return this.impl.leaveRoom(room);
    }
  }

  /**
   * 发送消息到房间
   */
  async sendToRoom(room: string, message: any): Promise<void> {
    if (this.impl.sendToRoom) {
      return this.impl.sendToRoom(room, message);
    }
  }

  /**
   * 获取房间内的客户端列表
   */
  getRoomClients(room: string): string[] {
    if (this.impl.getRoomClients) {
      return this.impl.getRoomClients(room);
    }
    return [];
  }

  // ========================================================================
  // 事件处理
  // ========================================================================

  /**
   * 注册事件处理器
   */
  on(event: 'connected' | 'disconnected' | 'error' | 'message', handler: EventHandler): void {
    this.impl.on(event, handler);
  }

  /**
   * 移除事件处理器
   */
  off(event: string, handler?: EventHandler): void {
    this.impl.off(event, handler);
  }

  /**
   * 移除所有事件处理器
   */
  removeAllListeners(event?: string): void {
    if (this.impl.removeAllListeners) {
      this.impl.removeAllListeners(event);
    }
  }

  // ========================================================================
  // 统计和监控
  // ========================================================================

  /**
   * 获取统计信息
   */
  getStats(): WebSocketStats {
    return this.impl.getStats();
  }

  /**
   * 获取服务器统计信息
   */
  getServerStats(): any {
    if (this.impl.getServerStats) {
      return this.impl.getServerStats();
    }
    return null;
  }

  /**
   * 获取环境类型
   */
  getEnvironment(): WebSocketEnvironment {
    return this.environment;
  }
}

// ============================================================================
// 单例管理
// ============================================================================

/**
 * WebSocket服务单例管理器
 */
class WebSocketServiceManager {
  private instances: Map<string, WebSocketService> = new Map();

  /**
   * 获取或创建WebSocket服务实例
   *
   * @param environment - 运行环境
   * @param url - WebSocket URL（客户端需要）
   * @param options - 连接选项
   * @param wsServer - WebSocket服务器实例（服务端需要）
   * @returns WebSocket服务实例
   */
  getInstance(
    environment: WebSocketEnvironment,
    url?: string,
    options?: ConnectOptions,
    wsServer?: any
  ): WebSocketService {
    const key = this.generateKey(environment, url, wsServer);

    if (!this.instances.has(key)) {
      const instance = new WebSocketService(environment, url, options, wsServer);
      this.instances.set(key, instance);
    }

    return this.instances.get(key)!;
  }

  /**
   * 销毁指定实例
   *
   * @param environment - 运行环境
   * @param url - WebSocket URL
   * @param wsServer - WebSocket服务器实例
   */
  async destroyInstance(
    environment: WebSocketEnvironment,
    url?: string,
    wsServer?: any
  ): Promise<void> {
    const key = this.generateKey(environment, url, wsServer);
    const instance = this.instances.get(key);

    if (instance) {
      await instance.disconnect();
      this.instances.delete(key);
    }
  }

  /**
   * 销毁所有实例
   */
  async destroyAll(): Promise<void> {
    const promises = Array.from(this.instances.values()).map(instance =>
      instance.disconnect()
    );
    await Promise.all(promises);
    this.instances.clear();
  }

  /**
   * 生成实例键
   */
  private generateKey(
    environment: WebSocketEnvironment,
    url?: string,
    wsServer?: any
  ): string {
    if (environment === 'server') {
      return `server_${wsServer?.constructor.name || 'default'}`;
    } else {
      return `client_${url}`;
    }
  }
}

// ============================================================================
// 全局单例实例
// ============================================================================

const wsServiceManager = new WebSocketServiceManager();

// ============================================================================
// 便捷工厂函数
// ============================================================================

/**
 * 获取WebSocket服务实例
 *
 * @param environment - 运行环境
 * @param url - WebSocket URL（客户端需要）
 * @param options - 连接选项
 * @param wsServer - WebSocket服务器实例（服务端需要）
 * @returns WebSocket服务实例
 */
export function getWebSocketService(
  environment: WebSocketEnvironment,
  url?: string,
  options?: ConnectOptions,
  wsServer?: any
): WebSocketService {
  return wsServiceManager.getInstance(environment, url, options, wsServer);
}

/**
 * 创建服务端WebSocket服务
 *
 * @param wsServer - WebSocket服务器实例
 * @returns WebSocket服务实例
 */
export function createServerWebSocketService(wsServer: any): WebSocketService {
  return getWebSocketService('server', undefined, undefined, wsServer);
}

/**
 * 创建客户端WebSocket服务
 *
 * @param url - WebSocket服务器URL
 * @param options - 连接选项
 * @returns WebSocket服务实例
 */
export function createClientWebSocketService(
  url: string,
  options?: ConnectOptions
): WebSocketService {
  return getWebSocketService('client', url, options);
}

/**
 * 销毁WebSocket服务实例
 *
 * @param environment - 运行环境
 * @param url - WebSocket URL
 * @param wsServer - WebSocket服务器实例
 */
export async function destroyWebSocketService(
  environment: WebSocketEnvironment,
  url?: string,
  wsServer?: any
): Promise<void> {
  await wsServiceManager.destroyInstance(environment, url, wsServer);
}

/**
 * 销毁所有WebSocket服务实例
 */
export async function destroyAllWebSocketServices(): Promise<void> {
  await wsServiceManager.destroyAll();
}

// ============================================================================
// 向后兼容的导出（保持旧API兼容性）
// ============================================================================

/**
 * @deprecated 使用 getWebSocketService 或 createClientWebSocketService 代替
 */
export function createWebSocketService(): WebSocketService {
  console.warn('[WebSocketService] createWebSocketService() is deprecated, use getWebSocketService() instead');
  // 返回一个默认的服务端实例
  return new WebSocketService('server');
}

// 导出默认实例（单例）- 保持向后兼容
export const webSocketService = new WebSocketService('server');
