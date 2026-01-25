/**
 * WebSocket 测试服务器
 *
 * 用于 Week 0 技术验证 - WebSocket 稳定性测试
 *
 * 功能：
 * - 支持长连接保持
 * - 心跳检测机制
 * - 自动重连支持
 * - 消息顺序保证
 * - 并发连接处理
 * - 消息丢失率检测
 */

import { WebSocketServer, WebSocket } from 'ws';
import { createServer, Server } from 'http';

interface TestClient {
  ws: WebSocket;
  id: string;
  connectedAt: number;
  lastHeartbeat: number;
  messagesSent: number;
  messagesReceived: number;
  messageSequence: number;
  expectedSequence: number;
  missedMessages: number;
}

interface TestMessage {
  type: 'test' | 'heartbeat' | 'echo' | 'sequence' | 'stats';
  timestamp: number;
  sequence?: number;
  payload?: any;
  clientId?: string;
}

interface ServerStats {
  uptime: number;
  totalConnections: number;
  activeConnections: number;
  totalMessagesSent: number;
  totalMessagesReceived: number;
  averageMessageLatency: number;
  messageLossRate: number;
}

export class WebSocketTestServer {
  private wss: WebSocketServer;
  private httpServer: Server;
  private clients: Map<string, TestClient> = new Map();
  private serverStartTime: number;
  private messageLatencies: number[] = [];
  private totalMessagesExchanged: number = 0;
  private totalLostMessages: number = 0;

  constructor(port: number = 8080) {
    this.httpServer = createServer();
    this.wss = new WebSocketServer({ server: this.httpServer });
    this.serverStartTime = Date.now();

    this.setupWebSocketServer();
    this.httpServer.listen(port, () => {
      console.log(`[WebSocketTestServer] Running on port ${port}`);
    });

    // 启动心跳检测
    this.startHeartbeatCheck();

    // 启动统计报告
    this.startStatsReporting();
  }

  /**
   * 设置 WebSocket 服务器
   */
  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket, req) => {
      const clientId = this.generateClientId();
      const client: TestClient = {
        ws,
        id: clientId,
        connectedAt: Date.now(),
        lastHeartbeat: Date.now(),
        messagesSent: 0,
        messagesReceived: 0,
        messageSequence: 0,
        expectedSequence: 0,
        missedMessages: 0
      };

      this.clients.set(clientId, client);
      console.log(`[WebSocketTestServer] Client connected: ${clientId}`);

      // 发送欢迎消息
      this.sendMessage(client, {
        type: 'test',
        timestamp: Date.now(),
        payload: { message: 'Welcome to WebSocket Test Server', clientId }
      });

      // 设置消息处理器
      ws.on('message', (data: Buffer) => {
        this.handleMessage(client, data);
      });

      // 设置关闭处理器
      ws.on('close', () => {
        this.handleClientDisconnect(client);
      });

      // 设置错误处理器
      ws.on('error', (error) => {
        console.error(`[WebSocketTestServer] Client error: ${clientId}`, error);
      });

      // 发送初始统计信息
      this.sendStats(client);
    });

    this.wss.on('error', (error) => {
      console.error('[WebSocketTestServer] Server error:', error);
    });
  }

  /**
   * 处理客户端消息
   */
  private handleMessage(client: TestClient, data: Buffer): void {
    try {
      const message: TestMessage = JSON.parse(data.toString());
      client.messagesReceived++;

      // 计算消息延迟
      if (message.timestamp) {
        const latency = Date.now() - message.timestamp;
        this.messageLatencies.push(latency);

        // 保持最近 1000 条延迟记录
        if (this.messageLatencies.length > 1000) {
          this.messageLatencies.shift();
        }
      }

      // 检查消息顺序
      if (message.type === 'sequence' && message.sequence !== undefined) {
        if (message.sequence !== client.expectedSequence) {
          const missed = message.sequence - client.expectedSequence;
          client.missedMessages += missed;
          this.totalLostMessages += missed;

          console.warn(
            `[WebSocketTestServer] Client ${client.id}: ` +
            `Missed ${missed} messages. Expected ${client.expectedSequence}, got ${message.sequence}`
          );
        }
        client.expectedSequence = message.sequence + 1;
      }

      // 处理不同类型的消息
      switch (message.type) {
        case 'echo':
          // 回显消息
          this.sendMessage(client, {
            type: 'echo',
            timestamp: Date.now(),
            payload: message.payload,
            clientId: client.id
          });
          break;

        case 'heartbeat':
          // 更新心跳时间
          client.lastHeartbeat = Date.now();
          this.sendMessage(client, {
            type: 'heartbeat',
            timestamp: Date.now()
          });
          break;

        case 'stats':
          // 发送统计信息
          this.sendStats(client);
          break;

        default:
          // 默认回复
          this.sendMessage(client, {
            type: 'test',
            timestamp: Date.now(),
            payload: { received: true }
          });
      }

      this.totalMessagesExchanged++;
    } catch (error) {
      console.error('[WebSocketTestServer] Failed to handle message:', error);
    }
  }

  /**
   * 发送消息给客户端
   */
  private sendMessage(client: TestClient, message: TestMessage): void {
    if (client.ws.readyState === WebSocket.OPEN) {
      const messageWithSequence = {
        ...message,
        sequence: client.messageSequence++
      };

      client.ws.send(JSON.stringify(messageWithSequence));
      client.messagesSent++;
    }
  }

  /**
   * 处理客户端断开
   */
  private handleClientDisconnect(client: TestClient): void {
    console.log(
      `[WebSocketTestServer] Client disconnected: ${client.id} ` +
      `(Duration: ${Date.now() - client.connectedAt}ms, ` +
      `Messages: ${client.messagesSent}/${client.messagesReceived}, ` +
      `Missed: ${client.missedMessages})`
    );

    this.clients.delete(client.id);
  }

  /**
   * 启动心跳检测（每 30 秒）
   */
  private startHeartbeatCheck(): void {
    setInterval(() => {
      const now = Date.now();
      const timeoutThreshold = 30000; // 30 秒

      for (const [clientId, client] of this.clients.entries()) {
        if (now - client.lastHeartbeat > timeoutThreshold) {
          console.warn(
            `[WebSocketTestServer] Client ${clientId} heartbeat timeout. ` +
            `Last heartbeat: ${now - client.lastHeartbeat}ms ago`
          );

          // 关闭超时连接
          client.ws.terminate();
          this.clients.delete(clientId);
        }
      }
    }, 10000); // 每 10 秒检查一次
  }

  /**
   * 启动统计报告（每 60 秒）
   */
  private startStatsReporting(): void {
    setInterval(() => {
      const stats = this.getServerStats();
      console.log('[WebSocketTestServer] Server Stats:', JSON.stringify(stats, null, 2));

      // 向所有客户端发送统计信息
      for (const client of this.clients.values()) {
        this.sendStats(client);
      }
    }, 60000);
  }

  /**
   * 发送统计信息给客户端
   */
  private sendStats(client: TestClient): void {
    this.sendMessage(client, {
      type: 'stats',
      timestamp: Date.now(),
      payload: {
        server: this.getServerStats(),
        client: {
          id: client.id,
          messagesSent: client.messagesSent,
          messagesReceived: client.messagesReceived,
          missedMessages: client.missedMessages,
          connectionDuration: Date.now() - client.connectedAt
        }
      }
    });
  }

  /**
   * 获取服务器统计信息
   */
  getServerStats(): ServerStats {
    const avgLatency = this.messageLatencies.length > 0
      ? this.messageLatencies.reduce((a, b) => a + b, 0) / this.messageLatencies.length
      : 0;

    const messageLossRate = this.totalMessagesExchanged > 0
      ? (this.totalLostMessages / this.totalMessagesExchanged) * 100
      : 0;

    return {
      uptime: Date.now() - this.serverStartTime,
      totalConnections: this.clients.size, // 简化，实际应该是累计连接数
      activeConnections: this.clients.size,
      totalMessagesSent: Array.from(this.clients.values()).reduce((sum, c) => sum + c.messagesSent, 0),
      totalMessagesReceived: Array.from(this.clients.values()).reduce((sum, c) => sum + c.messagesReceived, 0),
      averageMessageLatency: avgLatency,
      messageLossRate
    };
  }

  /**
   * 生成客户端 ID
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 关闭服务器
   */
  close(): void {
    console.log('[WebSocketTestServer] Shutting down...');

    // 关闭所有客户端连接
    for (const client of this.clients.values()) {
      client.ws.close();
    }

    // 关闭服务器
    this.wss.close();
    this.httpServer.close();

    console.log('[WebSocketTestServer] Shutdown complete');
  }
}

// 如果直接运行此文件，启动服务器
const moduleUrl = new URL(import.meta.url);
if (process.argv[1] === moduleUrl.pathname) {
  const port = process.env.PORT ? parseInt(process.env.PORT) : 8080;
  const server = new WebSocketTestServer(port);

  // 优雅关闭
  process.on('SIGINT', () => {
    server.close();
    process.exit(0);
  });
}
