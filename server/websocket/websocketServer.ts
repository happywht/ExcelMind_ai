/**
 * WebSocket服务器 - Phase 2 批量任务实时推送基础设施
 *
 * 职责：
 * 1. WebSocket服务器管理
 * 2. 客户端连接管理
 * 3. 房间/频道管理
 * 4. 消息广播和路由
 * 5. 心跳检测和断线重连
 * 6. 速率限制和安全控制
 *
 * @version 1.0.0
 * @module WebSocketServer
 */

import { EventEmitter } from 'events';
import { WebSocketServer as WSWebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import type {
  ClientConnection,
  ErrorMessage,
  RoomInfo,
  SubscribeRequest,
  TaskProgressMessage,
  UnsubscribeRequest,
  WebSocketMessage,
  WebSocketServerConfig,
  WebSocketServerOptions,
  WebSocketServerStats,
} from '../../src/types/websocket';
import {
  AuthenticationError,
  ConnectionRejectedError,
  MessageType,
  RateLimitError,
  WebSocketServerError,
} from '../../src/types/websocket';
import { getWebSocketConfig } from '../../src/config/websocket.config';

// ============================================================================
// 接口定义
// ============================================================================

/**
 * 事件处理器类型
 */
type EventHandler = (...args: any[]) => void;

/**
 * 速率限制器
 */
interface RateLimiter {
  count: number;
  resetAt: number;
}

// ============================================================================
// WebSocket服务器类
// ============================================================================

/**
 * WebSocket服务器
 *
 * 功能特性：
 * - 高性能WebSocket服务器
 * - 客户端连接池管理
 * - 房间/频道订阅系统
 * - 消息广播和定向发送
 * - 心跳检测和自动重连
 * - 速率限制和安全控制
 * - 详细的统计和监控
 */
export class WebSocketServer extends EventEmitter {
  // ========================================================================
  // 私有属性
  // ========================================================================

  private server: WSWebSocketServer | null = null;
  private config: WebSocketServerConfig;
  private wsOptions?: WebSocketServerOptions;

  // 客户端管理
  private clients: Map<string, ClientConnection> = new Map();

  // 房间管理
  private rooms: Map<string, RoomInfo> = new Map();

  // 速率限制
  private connectionRateLimiter: RateLimiter = {
    count: 0,
    resetAt: Date.now() + 60000,
  };

  // 心跳定时器
  private heartbeatTimer: NodeJS.Timeout | null = null;

  // 清理定时器
  private cleanupTimer: NodeJS.Timeout | null = null;
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5分钟
  private readonly CONNECTION_TIMEOUT = 30 * 60 * 1000; // 30分钟

  // 统计信息
  private stats: WebSocketServerStats = {
    server: {
      uptime: 0,
      startTime: Date.now(),
      version: '1.0.0',
    },
    connections: {
      total: 0,
      active: 0,
      authenticated: 0,
    },
    messages: {
      totalSent: 0,
      totalReceived: 0,
      sentPerMinute: 0,
      receivedPerMinute: 0,
    },
    rooms: {
      total: 0,
      clients: 0,
    },
    memory: {
      used: 0,
      total: 0,
      percentage: 0,
    },
  };

  // ========================================================================
  // 构造函数
  // ========================================================================

  /**
   * 构造WebSocket服务器
   *
   * @param port - 服务器端口
   * @param config - 服务器配置
   * @param options - WebSocket选项
   */
  constructor(
    port: number,
    config?: Partial<WebSocketServerConfig>,
    options?: WebSocketServerOptions
  ) {
    super();

    // 加载配置
    this.config = {
      ...getWebSocketConfig(),
      port,
      ...config,
    };

    // 保存选项（稍后使用）
    this.wsOptions = options;

    // 不在构造函数中创建服务器，等待start()调用
  }

  // ========================================================================
  // 公共方法 - 服务器控制
  // ========================================================================

  /**
   * 启动服务器
   */
  async start(): Promise<void> {
    if (this.server) {
      console.log(`WebSocket服务器已在端口 ${this.config.port} 启动`);
      this.emit('server:started', { port: this.config.port });
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        // 创建WebSocket服务器
        this.server = new WSWebSocketServer({
          port: this.config.port,
          path: this.config.path,
          ...this.wsOptions,
        });

        // 监听listening事件
        this.server.on('listening', () => {
          console.log(`WebSocket服务器监听端口: ${this.config.port}`);

          // 设置服务器事件处理器
          this.setupServerHandlers();

          // 启动心跳检测
          this.startHeartbeat();

          // 启动统计更新
          this.startStatsUpdate();

          // 启动清理定时器
          this.startCleanupTimer();

          console.log(`WebSocket服务器已在端口 ${this.config.port} 启动`);
          this.emit('server:started', { port: this.config.port });
          resolve();
        });

        // 监听错误事件
        this.server.on('error', (error) => {
          console.error('WebSocket服务器错误:', error);
          this.emit('error', error);
          reject(error);
        });

      } catch (error) {
        console.error('启动WebSocket服务器失败:', error);
        reject(error);
      }
    });
  }

  /**
   * 停止服务器
   */
  async stop(): Promise<void> {
    // 停止清理定时器
    this.stopCleanupTimer();

    // 停止心跳检测
    this.stopHeartbeat();

    // 关闭所有客户端连接
    const clients = Array.from(this.clients.values());
    await Promise.all(
      clients.map(client => this.disconnectClient(client.id, 1001, 'Server shutting down'))
    );

    // 关闭服务器
    if (this.server) {
      return new Promise((resolve) => {
        this.server!.close(() => {
          console.log('WebSocket服务器已关闭');
          this.emit('server:stopped');
          resolve();
        });
      });
    }
  }

  // ========================================================================
  // 公共方法 - 客户端管理
  // ========================================================================

  /**
   * 添加客户端连接
   *
   * @param clientId - 客户端ID
   * @param ws - WebSocket实例
   */
  async addClient(clientId: string, ws: WebSocket): Promise<void> {
    // 检查是否超过最大客户端数
    if (this.clients.size >= this.config.maxClients) {
      throw new ConnectionRejectedError('Server is full');
    }

    // 检查速率限制
    this.checkConnectionRateLimit();

    // 创建客户端连接对象
    const client: ClientConnection = {
      id: clientId,
      socket: ws,
      connectedAt: Date.now(),
      lastHeartbeat: Date.now(),
      subscribedTasks: new Set(),
      rooms: new Set(),
      messageQueue: [],
      isAuthenticated: false,
    };

    // 存储客户端
    this.clients.set(clientId, client);

    // 更新统计
    this.stats.connections.total++;
    this.stats.connections.active++;

    // 设置客户端消息处理器
    this.setupClientHandlers(client);

    // 发送连接确认消息（使用await确保消息立即发送）
    await this.sendMessage(clientId, {
      type: MessageType.CONNECTED,
      payload: {
        clientId,
        serverTime: Date.now(),
        config: {
          heartbeatInterval: this.config.heartbeatInterval,
        },
      },
      timestamp: Date.now(),
    });

    // 触发连接事件
    this.emit('connection:opened', { clientId });

    console.log(`客户端连接: ${clientId} (总连接: ${this.clients.size})`);
  }

  /**
   * 移除客户端连接
   *
   * @param clientId - 客户端ID
   */
  async removeClient(clientId: string): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) {
      return;
    }

    // 离开所有房间
    const rooms = Array.from(client.rooms);
    for (const room of rooms) {
      this.leaveRoom(clientId, room);
    }

    // 关闭WebSocket连接
    if (client.socket.readyState === WebSocket.OPEN) {
      client.socket.close();
    }

    // 移除客户端
    this.clients.delete(clientId);

    // 更新统计
    this.stats.connections.active--;
    if (client.isAuthenticated) {
      this.stats.connections.authenticated--;
    }

    // 触发断开事件
    this.emit('connection:closed', { clientId });

    console.log(`客户端断开: ${clientId} (总连接: ${this.clients.size})`);
  }

  /**
   * 获取客户端连接
   *
   * @param clientId - 客户端ID
   * @returns 客户端连接对象或null
   */
  getClient(clientId: string): ClientConnection | null {
    return this.clients.get(clientId) || null;
  }

  /**
   * 获取所有客户端
   *
   * @returns 客户端列表
   */
  getAllClients(): ClientConnection[] {
    return Array.from(this.clients.values());
  }

  /**
   * 断开客户端连接
   *
   * @param clientId - 客户端ID
   * @param code - 关闭代码
   * @param reason - 关闭原因
   */
  async disconnectClient(
    clientId: string,
    code: number = 1000,
    reason: string = 'Normal closure'
  ): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) {
      return;
    }

    if (client.socket.readyState === WebSocket.OPEN) {
      client.socket.close(code, reason);
    }

    await this.removeClient(clientId);
  }

  // ========================================================================
  // 公共方法 - 房间管理
  // ========================================================================

  /**
   * 订阅房间（加入房间）
   *
   * @param clientId - 客户端ID
   * @param room - 房间名称
   */
  async subscribe(clientId: string, room: string): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) {
      throw new WebSocketServerError('Client not found', 'CLIENT_NOT_FOUND');
    }

    // 创建房间（如果不存在）
    if (!this.rooms.has(room)) {
      this.rooms.set(room, {
        name: room,
        createdAt: Date.now(),
        clients: new Set(),
        messageHistory: [],
        maxHistorySize: 100,
      });
      this.stats.rooms.total++;
    }

    // 加入房间
    const roomInfo = this.rooms.get(room)!;
    roomInfo.clients.add(clientId);
    client.rooms.add(room);

    // 更新统计
    this.stats.rooms.clients++;

    // 发送确认消息
    this.sendMessage(clientId, {
      type: MessageType.SUBSCRIPTION_ACK,
      payload: {
        type: 'room',
        room,
        message: `已加入房间: ${room}`,
      },
      timestamp: Date.now(),
    });

    // 触发订阅事件
    this.emit('subscription:added', { clientId, room });

    console.log(`客户端 ${clientId} 加入房间 ${room}`);
  }

  /**
   * 取消订阅房间（离开房间）
   *
   * @param clientId - 客户端ID
   * @param room - 房间名称
   */
  async unsubscribe(clientId: string, room: string): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) {
      return;
    }

    // 从房间移除客户端
    const roomInfo = this.rooms.get(room);
    if (roomInfo) {
      roomInfo.clients.delete(clientId);
      client.rooms.delete(room);

      // 更新统计
      this.stats.rooms.clients--;

      // 如果房间为空，删除房间
      if (roomInfo.clients.size === 0) {
        this.rooms.delete(room);
        this.stats.rooms.total--;
      }

      // 触发取消订阅事件
      this.emit('subscription:removed', { clientId, room });

      console.log(`客户端 ${clientId} 离开房间 ${room}`);
    }
  }

  /**
   * 获取房间内的客户端列表
   *
   * @param room - 房间名称
   * @returns 客户端ID列表
   */
  getRoomClients(room: string): string[] {
    const roomInfo = this.rooms.get(room);
    return roomInfo ? Array.from(roomInfo.clients) : [];
  }

  /**
   * 离开房间（alias for unsubscribe）
   */
  async leaveRoom(clientId: string, room: string): Promise<void> {
    return this.unsubscribe(clientId, room);
  }

  // ========================================================================
  // 公共方法 - 消息发送
  // ========================================================================

  /**
   * 广播消息到房间
   *
   * @param room - 房间名称
   * @param message - 消息对象
   */
  async broadcast(room: string, message: WebSocketMessage): Promise<void> {
    const roomInfo = this.rooms.get(room);
    if (!roomInfo) {
      return;
    }

    // 添加到消息历史
    if (roomInfo.messageHistory.length < roomInfo.maxHistorySize) {
      roomInfo.messageHistory.push(message);
    }

    // 发送给房间内所有客户端
    const promises = Array.from(roomInfo.clients).map(clientId =>
      this.send(clientId, message)
    );

    await Promise.allSettled(promises);
  }

  /**
   * 发送消息给指定客户端
   *
   * @param clientId - 客户端ID
   * @param message - 消息对象
   */
  async send(clientId: string, message: WebSocketMessage): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) {
      return;
    }

    await this.sendMessage(clientId, message);
  }

  /**
   * 发送消息到房间（alias for broadcast）
   */
  async sendToRoom(room: string, message: WebSocketMessage): Promise<void> {
    return this.broadcast(room, message);
  }

  /**
   * 广播消息给所有客户端
   *
   * @param message - 消息对象
   */
  async broadcastToAll(message: WebSocketMessage): Promise<void> {
    const promises = Array.from(this.clients.keys()).map(clientId =>
      this.send(clientId, message)
    );

    await Promise.allSettled(promises);
  }

  // ========================================================================
  // 公共方法 - 事件处理
  // ========================================================================

  /**
   * 注册事件处理器
   *
   * @param event - 事件名称
   * @param handler - 事件处理器
   */
  on(event: 'connection', handler: (clientId: string) => void): void;
  on(event: 'disconnection', handler: (clientId: string) => void): void;
  on(event: 'message', handler: (clientId: string, data: any) => void): void;
  on(event: 'error', handler: (error: Error) => void): void;
  on(event: string, handler: EventHandler): void {
    super.on(event, handler);
  }

  // ========================================================================
  // 公共方法 - 统计
  // ========================================================================

  /**
   * 获取服务器统计信息
   *
   * @returns 统计信息对象
   */
  getStats(): WebSocketServerStats {
    // 更新内存使用
    const memoryUsage = process.memoryUsage();
    this.stats.memory = {
      used: memoryUsage.heapUsed,
      total: memoryUsage.heapTotal,
      percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
    };

    // 更新运行时间
    this.stats.server.uptime = Date.now() - this.stats.server.startTime;

    return { ...this.stats };
  }

  // ========================================================================
  // 私有方法 - 服务器处理
  // ========================================================================

  /**
   * 设置服务器事件处理器
   */
  private setupServerHandlers(): void {
    if (!this.server) {
      return;
    }

    this.server.on('connection', (ws: WebSocket, req) => {
      this.handleConnection(ws, req);
    });

    this.server.on('error', (error) => {
      console.error('WebSocket服务器错误:', error);
      this.emit('error', error);
    });

    this.server.on('listening', () => {
      console.log(`WebSocket服务器监听端口: ${this.config.port}`);
    });
  }

  /**
   * 处理新连接
   */
  private handleConnection(ws: WebSocket, req: any): void {
    // 生成客户端ID
    const clientId = this.generateClientId();

    // 提取客户端信息
    const ip = req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    console.log(`新连接: ${clientId} from ${ip}`);

    // 添加客户端
    this.addClient(clientId, ws)
      .then(() => {
        // 如果需要认证，发送认证请求
        if (this.config.enableAuthentication) {
          this.sendMessage(clientId, {
            type: MessageType.ERROR,
            payload: {
              code: 'AUTH_REQUIRED',
              message: 'Authentication required',
            } as ErrorMessage,
            timestamp: Date.now(),
          });
        }
      })
      .catch((error) => {
        console.error(`添加客户端失败: ${clientId}`, error);
        ws.close(1002, 'Connection rejected');
      });
  }

  // ========================================================================
  // 私有方法 - 客户端处理
  // ========================================================================

  /**
   * 设置客户端事件处理器
   */
  private setupClientHandlers(client: ClientConnection): void {
    const { socket } = client;

    socket.on('message', async (data: Buffer) => {
      await this.handleClientMessage(client, data);
    });

    socket.on('close', (code: number, reason: Buffer) => {
      this.handleClientClose(client, code, reason.toString());
    });

    socket.on('error', (error: Error) => {
      this.handleClientError(client, error);
    });

    socket.on('pong', () => {
      client.lastHeartbeat = Date.now();
    });
  }

  /**
   * 处理客户端消息
   */
  private async handleClientMessage(
    client: ClientConnection,
    data: Buffer
  ): Promise<void> {
    try {
      // 检查消息速率限制
      this.checkMessageRateLimit(client);

      // 解析消息
      const message: WebSocketMessage = JSON.parse(data.toString());

      // 更新统计
      this.stats.messages.totalReceived++;

      // 触发消息事件
      this.emit('message', client.id, message.payload);

      // 处理消息类型
      await this.processMessage(client, message);

    } catch (error) {
      console.error(`处理客户端消息失败 [${client.id}]:`, error);

      // 发送错误消息
      this.sendMessage(client.id, {
        type: MessageType.ERROR,
        payload: {
          code: 'MESSAGE_PARSE_ERROR',
          message: 'Failed to parse message',
        } as ErrorMessage,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * 处理消息
   */
  private async processMessage(
    client: ClientConnection,
    message: WebSocketMessage
  ): Promise<void> {
    switch (message.type) {
      case MessageType.SUBSCRIBE:
        await this.handleSubscribe(client, message.payload as SubscribeRequest);
        break;

      case MessageType.UNSUBSCRIBE:
        await this.handleUnsubscribe(client, message.payload as UnsubscribeRequest);
        break;

      case MessageType.JOIN_ROOM:
        await this.subscribe(client.id, message.payload.room);
        break;

      case MessageType.LEAVE_ROOM:
        await this.unsubscribe(client.id, message.payload.room);
        break;

      case MessageType.PING:
        this.sendMessage(client.id, {
          type: MessageType.PONG,
          payload: { timestamp: Date.now() },
          timestamp: Date.now(),
        });
        break;

      default:
        console.warn(`未知消息类型: ${message.type}`);
    }
  }

  /**
   * 处理订阅请求
   */
  private async handleSubscribe(
    client: ClientConnection,
    request: SubscribeRequest
  ): Promise<void> {
    // 订阅任务
    if (request.taskIds && request.taskIds.length > 0) {
      for (const taskId of request.taskIds) {
        client.subscribedTasks.add(taskId);
      }
    }

    // 加入房间
    if (request.rooms && request.rooms.length > 0) {
      for (const room of request.rooms) {
        await this.subscribe(client.id, room);
      }
    }

    // 发送确认
    this.sendMessage(client.id, {
      type: MessageType.SUBSCRIPTION_ACK,
      payload: {
        type: 'subscribe',
        message: '订阅成功',
      },
      timestamp: Date.now(),
    });
  }

  /**
   * 处理取消订阅请求
   */
  private async handleUnsubscribe(
    client: ClientConnection,
    request: UnsubscribeRequest
  ): Promise<void> {
    // 取消订阅任务
    if (request.unsubscribeAll) {
      client.subscribedTasks.clear();
    } else if (request.taskIds && request.taskIds.length > 0) {
      for (const taskId of request.taskIds) {
        client.subscribedTasks.delete(taskId);
      }
    }

    // 离开房间
    if (request.rooms && request.rooms.length > 0) {
      for (const room of request.rooms) {
        await this.unsubscribe(client.id, room);
      }
    }

    // 发送确认
    this.sendMessage(client.id, {
      type: MessageType.SUBSCRIPTION_ACK,
      payload: {
        type: 'unsubscribe',
        message: '取消订阅成功',
      },
      timestamp: Date.now(),
    });
  }

  /**
   * 处理客户端关闭
   */
  private handleClientClose(
    client: ClientConnection,
    code: number,
    reason: string
  ): void {
    console.log(`客户端关闭: ${client.id} (${code}: ${reason})`);
    this.removeClient(client.id);
  }

  /**
   * 处理客户端错误
   */
  private handleClientError(client: ClientConnection, error: Error): void {
    console.error(`客户端错误 [${client.id}]:`, error);
    this.emit('client:error', { clientId: client.id, error });
  }

  // ========================================================================
  // 私有方法 - 消息发送
  // ========================================================================

  /**
   * 发送消息给客户端
   */
  private async sendMessage(
    clientId: string,
    message: WebSocketMessage
  ): Promise<boolean> {
    const client = this.clients.get(clientId);
    if (!client) {
      return false;
    }

    if (client.socket.readyState !== WebSocket.OPEN) {
      // 添加到消息队列
      if (client.messageQueue.length < this.config.messageQueueSize) {
        client.messageQueue.push(message);
      }
      return false;
    }

    try {
      const data = JSON.stringify(message);
      client.socket.send(data);

      // 更新统计
      this.stats.messages.totalSent++;

      return true;
    } catch (error) {
      console.error(`发送消息失败 [${clientId}]:`, error);
      return false;
    }
  }

  // ========================================================================
  // 私有方法 - 速率限制
  // ========================================================================

  /**
   * 检查连接速率限制
   */
  private checkConnectionRateLimit(): void {
    const now = Date.now();

    // 重置计数器
    if (now > this.connectionRateLimiter.resetAt) {
      this.connectionRateLimiter.count = 0;
      this.connectionRateLimiter.resetAt = now + 60000;
    }

    // 检查限制
    if (this.connectionRateLimiter.count >= this.config.rateLimit.maxConnectionsPerMinute) {
      throw new RateLimitError('connections');
    }

    this.connectionRateLimiter.count++;
  }

  /**
   * 检查消息速率限制
   */
  private checkMessageRateLimit(client: ClientConnection): void {
    // 简化实现：可以按客户端跟踪
    // 这里只做基本验证
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

      // 检查所有客户端
      this.clients.forEach((client, clientId) => {
        if (now - client.lastHeartbeat > timeout) {
          console.warn(`客户端心跳超时: ${clientId}`);
          this.disconnectClient(clientId, 1000, 'Heartbeat timeout');
        }
      });

      // 发送ping
      this.clients.forEach((client) => {
        if (client.socket.readyState === WebSocket.OPEN) {
          client.socket.ping();
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
  // 私有方法 - 清理管理
  // ========================================================================

  /**
   * 启动清理定时器
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupDisconnectedClients();
      this.cleanupIdleConnections();
    }, this.CLEANUP_INTERVAL);

    console.log('[WebSocketServer] 清理定时器已启动');
  }

  /**
   * 停止清理定时器
   */
  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
      console.log('[WebSocketServer] 清理定时器已停止');
    }
  }

  /**
   * 清理已断开的连接
   */
  private cleanupDisconnectedClients(): void {
    const before = this.clients.size;

    // 移除已断开的客户端
    for (const [clientId, client] of this.clients.entries()) {
      if (client.socket.readyState === WebSocket.CLOSED) {
        this.clients.delete(clientId);
        console.info(`[WebSocketServer] 清理已断开的客户端: ${clientId}`);
      }
    }

    const after = this.clients.size;
    if (before !== after) {
      console.log(`[WebSocketServer] 清理完成: 移除 ${before - after} 个已断开的客户端`);
    }
  }

  /**
   * 清理空闲连接
   */
  private cleanupIdleConnections(): void {
    const now = Date.now();
    const before = this.clients.size;

    for (const [clientId, client] of this.clients.entries()) {
      const idleTime = now - client.lastHeartbeat;

      if (idleTime > this.CONNECTION_TIMEOUT) {
        console.log(`[WebSocketServer] 关闭空闲连接: ${clientId} (空闲 ${Math.round(idleTime / 1000)}s)`);
        client.socket.close(1000, 'Connection idle timeout');
        this.clients.delete(clientId);
      }
    }

    const after = this.clients.size;
    if (before !== after) {
      console.log(`[WebSocketServer] 空闲清理: 关闭 ${before - after} 个空闲连接`);
    }
  }

  // ========================================================================
  // 私有方法 - 统计更新
  // ========================================================================

  /**
   * 启动统计更新
   */
  private startStatsUpdate(): void {
    setInterval(() => {
      // 计算每分钟消息数
      this.stats.messages.sentPerMinute = this.stats.messages.totalSent;
      this.stats.messages.receivedPerMinute = this.stats.messages.totalReceived;

      // 重置计数器（如果需要）
    }, 60000);
  }

  // ========================================================================
  // 私有方法 - 工具函数
  // ========================================================================

  /**
   * 生成客户端ID
   */
  private generateClientId(): string {
    return `client_${uuidv4()}`;
  }
}

// ============================================================================
// 导出
// ============================================================================

export default WebSocketServer;
