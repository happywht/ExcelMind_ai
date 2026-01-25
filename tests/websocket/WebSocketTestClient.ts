/**
 * WebSocket 测试客户端
 *
 * 用于 Week 0 技术验证 - WebSocket 稳定性测试
 *
 * 功能：
 * - 自动重连机制
 * - 心跳检测
 * - 消息顺序验证
 * - 性能指标收集
 * - 并发连接支持
 */

import WebSocket from 'ws';

interface TestMessage {
  type: 'test' | 'heartbeat' | 'echo' | 'sequence' | 'stats';
  timestamp: number;
  sequence?: number;
  payload?: any;
  clientId?: string;
}

interface ClientStats {
  connectionId: string;
  connectedAt: number;
  disconnectedAt?: number;
  reconnectCount: number;
  messagesSent: number;
  messagesReceived: number;
  missedMessages: number;
  averageLatency: number;
  messageLossRate: number;
  uptime: number;
}

export class WebSocketTestClient {
  private ws: WebSocket | null = null;
  private url: string;
  private clientId: string;
  private connectionId: string;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectDelay: number = 1000; // 初始 1 秒
  private maxReconnectDelay: number = 30000; // 最大 30 秒

  // 统计信息
  private stats: ClientStats;
  private messageSequence: number = 0;
  private expectedSequence: number = 0;
  private latencies: number[] = [];
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private statsInterval: NodeJS.Timeout | null = null;

  // 回调函数
  private onMessageCallback?: (message: TestMessage) => void;
  private onErrorCallback?: (error: Error) => void;
  private onConnectCallback?: () => void;
  private onDisconnectCallback?: () => void;

  constructor(url: string, clientId?: string) {
    this.url = url;
    this.clientId = clientId || `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.connectionId = `${this.clientId}_${Date.now()}`;

    this.stats = {
      connectionId: this.connectionId,
      connectedAt: Date.now(),
      reconnectCount: 0,
      messagesSent: 0,
      messagesReceived: 0,
      missedMessages: 0,
      averageLatency: 0,
      messageLossRate: 0,
      uptime: 0
    };

    this.connect();
  }

  /**
   * 连接到服务器
   */
  connect(): void {
    console.log(`[WebSocketTestClient] Connecting to ${this.url}...`);

    this.ws = new WebSocket(this.url);

    this.ws.on('open', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;

      console.log(`[WebSocketTestClient] Connected: ${this.connectionId}`);

      // 启动心跳
      this.startHeartbeat();

      // 启动统计收集
      this.startStatsCollection();

      // 触发连接回调
      if (this.onConnectCallback) {
        this.onConnectCallback();
      }
    });

    this.ws.on('message', (data: Buffer) => {
      this.handleMessage(data);
    });

    this.ws.on('error', (error) => {
      console.error(`[WebSocketTestClient] Error:`, error);

      if (this.onErrorCallback) {
        this.onErrorCallback(error as Error);
      }
    });

    this.ws.on('close', () => {
      this.isConnected = false;
      console.log(`[WebSocketTestClient] Disconnected: ${this.connectionId}`);

      // 停止心跳和统计
      this.stopHeartbeat();
      this.stopStatsCollection();

      // 触发断开回调
      if (this.onDisconnectCallback) {
        this.onDisconnectCallback();
      }

      // 尝试重连
      this.attemptReconnect();
    });
  }

  /**
   * 处理服务器消息
   */
  private handleMessage(data: Buffer): void {
    try {
      const message: TestMessage = JSON.parse(data.toString());
      this.stats.messagesReceived++;

      // 计算延迟
      if (message.timestamp) {
        const latency = Date.now() - message.timestamp;
        this.latencies.push(latency);

        // 保持最近 1000 条延迟记录
        if (this.latencies.length > 1000) {
          this.latencies.shift();
        }

        // 更新平均延迟
        this.stats.averageLatency =
          this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length;
      }

      // 检查消息顺序
      if (message.sequence !== undefined) {
        if (message.sequence !== this.expectedSequence) {
          const missed = message.sequence - this.expectedSequence;
          this.stats.missedMessages += missed;

          console.warn(
            `[WebSocketTestClient] Missed ${missed} messages. ` +
            `Expected ${this.expectedSequence}, got ${message.sequence}`
          );
        }
        this.expectedSequence = message.sequence + 1;
      }

      // 更新消息丢失率
      this.stats.messageLossRate =
        this.stats.messagesReceived > 0
          ? (this.stats.missedMessages / this.stats.messagesReceived) * 100
          : 0;

      // 触发消息回调
      if (this.onMessageCallback) {
        this.onMessageCallback(message);
      }
    } catch (error) {
      console.error('[WebSocketTestClient] Failed to handle message:', error);
    }
  }

  /**
   * 发送消息
   */
  send(type: TestMessage['type'], payload?: any): void {
    if (!this.isConnected || !this.ws) {
      console.warn('[WebSocketTestClient] Not connected, cannot send message');
      return;
    }

    const message: TestMessage = {
      type,
      timestamp: Date.now(),
      sequence: this.messageSequence++,
      payload
    };

    this.ws.send(JSON.stringify(message));
    this.stats.messagesSent++;
  }

  /**
   * 发送心跳
   */
  sendHeartbeat(): void {
    this.send('heartbeat');
  }

  /**
   * 请求统计信息
   */
  requestStats(): void {
    this.send('stats');
  }

  /**
   * 发送回显测试消息
   */
  sendEcho(payload: any): void {
    this.send('echo', payload);
  }

  /**
   * 启动心跳（每 15 秒）
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 15000);
  }

  /**
   * 停止心跳
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * 启动统计收集
   */
  private startStatsCollection(): void {
    this.statsInterval = setInterval(() => {
      this.stats.uptime = Date.now() - this.stats.connectedAt;
    }, 1000);
  }

  /**
   * 停止统计收集
   */
  private stopStatsCollection(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
  }

  /**
   * 尝试重连
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(
        `[WebSocketTestClient] Max reconnect attempts reached. Giving up.`
      );
      return;
    }

    this.reconnectAttempts++;
    this.stats.reconnectCount++;

    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );

    console.log(
      `[WebSocketTestClient] Reconnecting in ${delay}ms ` +
      `(attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * 设置消息回调
   */
  onMessage(callback: (message: TestMessage) => void): void {
    this.onMessageCallback = callback;
  }

  /**
   * 设置错误回调
   */
  onError(callback: (error: Error) => void): void {
    this.onErrorCallback = callback;
  }

  /**
   * 设置连接回调
   */
  onConnect(callback: () => void): void {
    this.onConnectCallback = callback;
  }

  /**
   * 设置断开回调
   */
  onDisconnect(callback: () => void): void {
    this.onDisconnectCallback = callback;
  }

  /**
   * 获取统计信息
   */
  getStats(): ClientStats {
    return {
      ...this.stats,
      uptime: Date.now() - this.stats.connectedAt
    };
  }

  /**
   * 关闭连接
   */
  close(): void {
    console.log(`[WebSocketTestClient] Closing connection: ${this.connectionId}`);

    this.stopHeartbeat();
    this.stopStatsCollection();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnected = false;
  }

  /**
   * 检查是否已连接
   */
  connected(): boolean {
    return this.isConnected;
  }
}
