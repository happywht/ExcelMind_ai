/**
 * WebSocket服务器测试
 *
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { WebSocket } from 'ws';
import { WebSocketServer } from './websocketServer';
import { getWebSocketConfig } from '../../src/config/websocket.config';
import { MessageType } from '../../src/types/websocket';

// ============================================================================
// 测试配置
// ============================================================================

const TEST_PORT = 3010;
const TEST_CONFIG = {
  port: TEST_PORT,
  path: '/ws',
  heartbeatInterval: 5000,
  connectionTimeout: 10000,
  maxClients: 10,
  messageQueueSize: 100,
  enableCompression: false,
  enableAuthentication: false,
  rateLimit: {
    maxMessagesPerMinute: 1000,
    maxConnectionsPerMinute: 100,
  },
  reconnect: {
    maxAttempts: 3,
    delay: 100,
    exponentialBackoff: true,
  },
};

// ============================================================================
// 测试套件
// ============================================================================

describe('WebSocketServer', () => {
  let server: WebSocketServer;
  let testClient: WebSocket;

  beforeEach(async () => {
    // 创建服务器
    server = new WebSocketServer(TEST_PORT, TEST_CONFIG);
    await server.start();

    // 等待服务器启动
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterEach(async () => {
    // 关闭测试客户端
    if (testClient) {
      testClient.close();
    }

    // 关闭服务器
    await server.stop();
  });

  // ========================================================================
  // 服务器启动和停止测试
  // ========================================================================

  describe('Server Lifecycle', () => {
    it('should start server successfully', async () => {
      const stats = server.getStats();
      expect(stats.server.startTime).toBeGreaterThan(0);
      expect(stats.connections.active).toBe(0);
    });

    it('should stop server successfully', async () => {
      await server.stop();

      const stats = server.getStats();
      expect(stats.connections.active).toBe(0);
    });

    it('should handle multiple start/stop cycles', async () => {
      await server.stop();
      await server.start();
      await server.stop();

      expect(server.getStats().connections.active).toBe(0);
    });
  });

  // ========================================================================
  // 客户端连接测试
  // ========================================================================

  describe('Client Connections', () => {
    beforeEach(async () => {
      // 创建测试客户端
      testClient = new WebSocket(`ws://localhost:${TEST_PORT}${TEST_CONFIG.path}`);

      await new Promise((resolve) => {
        testClient.on('open', resolve);
      });
    });

    it('should accept client connection', (done) => {
      const stats = server.getStats();
      expect(stats.connections.active).toBeGreaterThan(0);
      done();
    });

    it('should send connected message to client', (done) => {
      testClient.on('message', (data) => {
        const message = JSON.parse(data.toString());
        expect(message.type).toBe(MessageType.CONNECTED);
        expect(message.payload.clientId).toBeDefined();
        done();
      });
    });

    it('should handle client disconnection', async () => {
      const initialCount = server.getStats().connections.active;

      testClient.close();

      await new Promise(resolve => setTimeout(resolve, 100));

      const finalCount = server.getStats().connections.active;
      expect(finalCount).toBeLessThan(initialCount);
    });

    it('should reject connections when server is full', async () => {
      // 创建多个客户端直到达到限制
      const clients: WebSocket[] = [];

      for (let i = 0; i < TEST_CONFIG.maxClients; i++) {
        const client = new WebSocket(`ws://localhost:${TEST_PORT}${TEST_CONFIG.path}`);
        await new Promise((resolve) => client.on('open', resolve));
        clients.push(client);
      }

      // 尝试创建超过限制的客户端
      const extraClient = new WebSocket(`ws://localhost:${TEST_PORT}${TEST_CONFIG.path}`);

      await new Promise((resolve) => {
        extraClient.on('error', resolve);
        extraClient.on('close', resolve);
      });

      // 清理
      clients.forEach(client => client.close());
      extraClient.close();
    });
  });

  // ========================================================================
  // 消息发送测试
  // ========================================================================

  describe('Message Sending', () => {
    beforeEach(async () => {
      testClient = new WebSocket(`ws://localhost:${TEST_PORT}${TEST_CONFIG.path}`);

      await new Promise((resolve) => {
        testClient.on('open', resolve);
      });
    });

    it('should send message to specific client', async (done) => {
      // 获取客户端ID
      let clientId: string;

      testClient.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === MessageType.CONNECTED) {
          clientId = message.payload.clientId;

          // 发送消息
          server.send(clientId, {
            type: MessageType.TASK_PROGRESS,
            payload: { taskId: 'test-task', progress: 50 },
            timestamp: Date.now(),
          });
        }
      });

      // 接收消息
      testClient.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === MessageType.TASK_PROGRESS) {
          expect(message.payload.taskId).toBe('test-task');
          expect(message.payload.progress).toBe(50);
          done();
        }
      });
    });

    it('should broadcast message to all clients', async (done) => {
      const clients: WebSocket[] = [];

      // 创建多个客户端
      for (let i = 0; i < 3; i++) {
        const client = new WebSocket(`ws://localhost:${TEST_PORT}${TEST_CONFIG.path}`);
        await new Promise((resolve) => client.on('open', resolve));
        clients.push(client);
      }

      // 广播消息
      await server.broadcastToAll({
        type: MessageType.TASK_PROGRESS,
        payload: { taskId: 'test-task', progress: 75 },
        timestamp: Date.now(),
      });

      // 检查所有客户端都收到消息
      let receivedCount = 0;
      clients.forEach(client => {
        client.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === MessageType.TASK_PROGRESS) {
            receivedCount++;
            if (receivedCount === clients.length) {
              expect(receivedCount).toBe(clients.length);
              clients.forEach(c => c.close());
              done();
            }
          }
        });
      });
    });
  });

  // ========================================================================
  // 房间管理测试
  // ========================================================================

  describe('Room Management', () => {
    beforeEach(async () => {
      testClient = new WebSocket(`ws://localhost:${TEST_PORT}${TEST_CONFIG.path}`);

      await new Promise((resolve) => {
        testClient.on('open', resolve);
      });
    });

    it('should allow client to join room', async () => {
      // 获取客户端ID
      let clientId: string;

      testClient.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === MessageType.CONNECTED) {
          clientId = message.payload.clientId;

          // 加入房间
          server.subscribe(clientId, 'test-room');
        }
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      // 检查房间客户端列表
      const clientsInRoom = server.getRoomClients('test-room');
      expect(clientsInRoom.length).toBeGreaterThan(0);
    });

    it('should allow client to leave room', async () => {
      let clientId: string;

      testClient.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === MessageType.CONNECTED) {
          clientId = message.payload.clientId;

          // 加入房间
          server.subscribe(clientId, 'test-room').then(() => {
            // 离开房间
            server.leaveRoom(clientId, 'test-room');
          });
        }
      });

      await new Promise(resolve => setTimeout(resolve, 200));

      // 检查房间客户端列表
      const clientsInRoom = server.getRoomClients('test-room');
      expect(clientsInRoom.length).toBe(0);
    });

    it('should broadcast message to room only', async (done) => {
      const room1Clients: WebSocket[] = [];
      const room2Clients: WebSocket[] = [];

      // 创建房间1的客户端
      for (let i = 0; i < 2; i++) {
        const client = new WebSocket(`ws://localhost:${TEST_PORT}${TEST_CONFIG.path}`);
        await new Promise((resolve) => client.on('open', resolve));
        room1Clients.push(client);
      }

      // 创建房间2的客户端
      for (let i = 0; i < 2; i++) {
        const client = new WebSocket(`ws://localhost:${TEST_PORT}${TEST_CONFIG.path}`);
        await new Promise((resolve) => client.on('open', resolve));
        room2Clients.push(client);
      }

      // 将客户端加入相应房间（需要获取客户端ID）
      let clientIdCount = 0;
      const clientIds: string[] = [];

      const allClients = [...room1Clients, ...room2Clients];

      for (const client of allClients) {
        client.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === MessageType.CONNECTED) {
            clientIds.push(message.payload.clientId);
            clientIdCount++;

            if (clientIdCount === allClients.length) {
              // 所有客户端已连接，加入房间
              clientIds.slice(0, 2).forEach((id, index) => {
                server.subscribe(id, 'room1');
              });
              clientIds.slice(2, 4).forEach((id, index) => {
                server.subscribe(id, 'room2');
              });

              // 广播到房间1
              setTimeout(() => {
                server.broadcast('room1', {
                  type: MessageType.TASK_PROGRESS,
                  payload: { room: 'room1' },
                  timestamp: Date.now(),
                });
              }, 100);
            }
          }
        });
      }

      // 验证只有房间1的客户端收到消息
      let room1Received = 0;

      room1Clients.forEach(client => {
        client.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === MessageType.TASK_PROGRESS && message.payload.room === 'room1') {
            room1Received++;
          }
        });
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      expect(room1Received).toBe(room1Clients.length);

      // 清理
      allClients.forEach(client => client.close());
    });
  });

  // ========================================================================
  // 心跳检测测试
  // ========================================================================

  describe('Heartbeat Detection', () => {
    it('should detect inactive clients', async () => {
      // 创建一个不响应心跳的客户端
      const client = new WebSocket(`ws://localhost:${TEST_PORT}${TEST_CONFIG.path}`);

      // 禁用自动心跳响应
      client.on('ping', () => {
        // 不发送pong
      });

      await new Promise((resolve) => {
        client.on('open', resolve);
      });

      const initialCount = server.getStats().connections.active;

      // 等待心跳超时
      await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.connectionTimeout + 1000));

      const finalCount = server.getStats().connections.active;
      expect(finalCount).toBeLessThan(initialCount);

      client.close();
    });

    it('should maintain active clients with proper heartbeat', async () => {
      const client = new WebSocket(`ws://localhost:${TEST_PORT}${TEST_CONFIG.path}`);

      await new Promise((resolve) => {
        client.on('open', resolve);
      });

      const initialCount = server.getStats().connections.active;

      // 等待但不超过超时时间
      await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.connectionTimeout - 1000));

      const finalCount = server.getStats().connections.active;
      expect(finalCount).toBe(initialCount);

      client.close();
    });
  });

  // ========================================================================
  // 统计信息测试
  // ========================================================================

  describe('Statistics', () => {
    it('should track connection statistics', async () => {
      const initialStats = server.getStats();

      // 创建客户端
      const client = new WebSocket(`ws://localhost:${TEST_PORT}${TEST_CONFIG.path}`);
      await new Promise((resolve) => client.on('open', resolve));

      const afterConnectionStats = server.getStats();

      expect(afterConnectionStats.connections.total).toBeGreaterThan(initialStats.connections.total);
      expect(afterConnectionStats.connections.active).toBeGreaterThan(initialStats.connections.active);

      client.close();
    });

    it('should track message statistics', async (done) => {
      testClient = new WebSocket(`ws://localhost:${TEST_PORT}${TEST_CONFIG.path}`);

      testClient.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === MessageType.CONNECTED) {
          const clientId = message.payload.clientId;

          // 发送消息
          server.send(clientId, {
            type: MessageType.TASK_PROGRESS,
            payload: { taskId: 'test-task', progress: 50 },
            timestamp: Date.now(),
          });

          // 检查统计
          const stats = server.getStats();
          expect(stats.messages.totalSent).toBeGreaterThan(0);
          done();
        }
      });
    });
  });

  // ========================================================================
  // 错误处理测试
  // ========================================================================

  describe('Error Handling', () => {
    it('should handle invalid messages gracefully', async (done) => {
      testClient = new WebSocket(`ws://localhost:${TEST_PORT}${TEST_CONFIG.path}`);

      testClient.on('open', () => {
        // 发送无效JSON
        testClient.send('invalid json{{{');
      });

      testClient.on('message', (data) => {
        const message = JSON.parse(data.toString());
        // 应该收到错误消息或连接保持打开
        expect(message.type !== undefined || testClient.readyState === WebSocket.OPEN).toBeTruthy();
        done();
      });
    });

    it('should handle sending to non-existent client', async () => {
      const result = await server.send('non-existent-client-id', {
        type: MessageType.TASK_PROGRESS,
        payload: { taskId: 'test-task', progress: 50 },
        timestamp: Date.now(),
      });

      // 应该返回false但不抛出错误
      expect(result).toBeFalsy();
    });
  });
});

// ============================================================================
// 运行测试
// ============================================================================

if (require.main === module) {
  console.log('运行WebSocket服务器测试...');
  // 测试将通过Jest运行
}
