/**
 * WebSocket性能测试 - Phase 2优化验证
 *
 * 测试目标:
 * 1. WebSocket消息延迟 <50ms
 * 2. 连接建立时间 <200ms
 * 3. 并发连接支持能力
 * 4. 消息吞吐量
 * 5. 内存使用效率
 *
 * @author Performance Tester
 * @version 1.0.0
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { createWebSocketServer } from '../../server/websocket/websocketServer';
import { WebSocketService } from '../../src/services/websocket/websocketService';

// ============================================================================
// 测试配置
// ============================================================================

const TEST_PORT = 3011;
const TEST_URL = `ws://localhost:${TEST_PORT}`;
const MESSAGE_COUNT = 100;
const CONCURRENT_CLIENTS = 50;

// ============================================================================
// WebSocket性能测试套件
// ============================================================================

describe('Phase 2 WebSocket性能测试套件', () => {
  let wsServer: ReturnType<typeof createWebSocketServer>;
  let wsService: WebSocketService;

  beforeAll(async () => {
    // 启动WebSocket服务器
    wsServer = createWebSocketServer(TEST_PORT, {
      enableHeartbeat: true,
      heartbeatInterval: 30000,
      enableRateLimit: true,
      rateLimit: {
        maxMessages: 100,
        windowMs: 60000
      }
    });

    await wsServer.start();
    console.log(`✓ WebSocket服务器启动在端口 ${TEST_PORT}`);

    // 初始化WebSocket服务
    wsService = new WebSocketService('server', undefined, undefined, wsServer);
  });

  afterAll(async () => {
    // 关闭服务器
    await wsServer.close();
    console.log('✓ WebSocket服务器已关闭');
  });

  // ============================================================================
  // 连接建立性能测试
  // ============================================================================

  describe('WebSocket连接建立性能', () => {
    test('单个连接建立时间 <200ms', async () => {
      const startTime = Date.now();

      const client = await createWebSocketConnection(TEST_URL);

      const connectTime = Date.now() - startTime;

      expect(client.readyState).toBe(WebSocket.OPEN);
      console.log(`✓ 连接建立时间: ${connectTime}ms`);
      expect(connectTime).toBeLessThan(200);

      await closeWebSocket(client);
    });

    test('10个并发连接建立时间 <2s', async () => {
      const startTime = Date.now();

      const connections = await Promise.all(
        Array.from({ length: 10 }, () => createWebSocketConnection(TEST_URL))
      );

      const totalTime = Date.now() - startTime;
      const avgTime = totalTime / 10;

      const allConnected = connections.every(c => c.readyState === WebSocket.OPEN);

      expect(allConnected).toBe(true);
      console.log(`✓ 10并发连接总时间: ${totalTime}ms`);
      console.log(`✓ 平均连接时间: ${avgTime.toFixed(2)}ms`);
      expect(totalTime).toBeLessThan(2000);
      expect(avgTime).toBeLessThan(200);

      // 清理连接
      await Promise.all(connections.map(c => closeWebSocket(c)));
    });

    test('50个并发连接建立时间 <5s', async () => {
      const startTime = Date.now();

      const connections = await Promise.all(
        Array.from({ length: CONCURRENT_CLIENTS }, () =>
          createWebSocketConnection(TEST_URL)
        )
      );

      const totalTime = Date.now() - startTime;
      const avgTime = totalTime / CONCURRENT_CLIENTS;

      const allConnected = connections.every(c => c.readyState === WebSocket.OPEN);

      expect(allConnected).toBe(true);
      console.log(`✓ ${CONCURRENT_CLIENTS}并发连接总时间: ${totalTime}ms`);
      console.log(`✓ 平均连接时间: ${avgTime.toFixed(2)}ms`);
      expect(totalTime).toBeLessThan(5000);

      // 清理连接
      await Promise.all(connections.map(c => closeWebSocket(c)));
    });
  });

  // ============================================================================
  // 消息延迟性能测试
  // ============================================================================

  describe('WebSocket消息延迟性能', () => {
    test('单条消息往返延迟 <50ms', async () => {
      const client = await createWebSocketConnection(TEST_URL);

      const latencies: number[] = [];

      for (let i = 0; i < MESSAGE_COUNT; i++) {
        const startTime = Date.now();

        // 发送消息
        const testMessage = {
          type: 'test:ping',
          payload: { index: i, timestamp: startTime }
        };

        client.send(JSON.stringify(testMessage));

        // 等待响应
        const response = await waitForMessage(client, 'test:pong');

        const latency = Date.now() - startTime;
        latencies.push(latency);
      }

      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const p95Latency = latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)];
      const maxLatency = Math.max(...latencies);

      console.log(`✓ 平均延迟: ${avgLatency.toFixed(2)}ms`);
      console.log(`✓ P95延迟: ${p95Latency}ms`);
      console.log(`✓ 最大延迟: ${maxLatency}ms`);

      expect(avgLatency).toBeLessThan(50);
      expect(p95Latency).toBeLessThan(100);
      expect(maxLatency).toBeLessThan(200);

      await closeWebSocket(client);
    });

    test('高频率消息传输延迟稳定性', async () => {
      const client = await createWebSocketConnection(TEST_URL);

      const latencies: number[] = [];
      const burstSize = 50;
      const burstCount = 10;

      for (let burst = 0; burst < burstCount; burst++) {
        const burstStart = Date.now();

        // 突发发送多条消息
        const promises = Array.from({ length: burstSize }, (_, i) =>
          sendMessageAndReceive(client, `burst_${burst}_${i}`)
        );

        await Promise.all(promises);

        const burstTime = Date.now() - burstStart;
        const avgMsgTime = burstTime / burstSize;

        console.log(`  突发 ${burst + 1}: ${burstTime}ms (${avgMsgTime.toFixed(2)}ms/msg)`);

        latencies.push(...Array(burstSize).fill(avgMsgTime));

        // 短暂暂停
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      const overallAvg = latencies.reduce((a, b) => a + b, 0) / latencies.length;

      console.log(`✓ 高频率传输平均延迟: ${overallAvg.toFixed(2)}ms`);
      expect(overallAvg).toBeLessThan(50);

      await closeWebSocket(client);
    });
  });

  // ============================================================================
  // 消息吞吐量性能测试
  // ============================================================================

  describe('WebSocket消息吞吐量性能', () => {
    test('单连接消息吞吐量 >100 msg/s', async () => {
      const client = await createWebSocketConnection(TEST_URL);

      const messageCount = 500;
      const startTime = Date.now();

      const promises = Array.from({ length: messageCount }, (_, i) =>
        sendMessageAndReceive(client, `throughput_${i}`)
      );

      await Promise.all(promises);

      const totalTime = Date.now() - startTime;
      const throughput = (messageCount / totalTime) * 1000;

      console.log(`✓ ${messageCount}条消息总耗时: ${totalTime}ms`);
      console.log(`✓ 吞吐量: ${throughput.toFixed(0)} msg/s`);

      expect(throughput).toBeGreaterThan(100);

      await closeWebSocket(client);
    });

    test('广播消息吞吐量 >1000 msg/s', async () => {
      const clientCount = 10;
      const broadcastCount = 100;

      // 创建多个客户端
      const clients = await Promise.all(
        Array.from({ length: clientCount }, () => createWebSocketConnection(TEST_URL))
      );

      // 订阅频道
      clients.forEach(client => {
        client.send(JSON.stringify({
          type: 'subscribe',
          payload: { channel: 'test:broadcast' }
        }));
      });

      // 等待订阅完成
      await new Promise(resolve => setTimeout(resolve, 100));

      const startTime = Date.now();

      // 发送广播消息
      for (let i = 0; i < broadcastCount; i++) {
        wsService.send('test:broadcast', {
          type: 'broadcast',
          payload: { index: i }
        });
      }

      // 等待所有消息接收完成
      await new Promise(resolve => setTimeout(resolve, 500));

      const totalTime = Date.now() - startTime;
      const totalMessages = broadcastCount * clientCount;
      const throughput = (totalMessages / totalTime) * 1000;

      console.log(`✓ ${broadcastCount}条广播 × ${clientCount}客户端 = ${totalMessages}条消息`);
      console.log(`✓ 广播总耗时: ${totalTime}ms`);
      console.log(`✓ 广播吞吐量: ${throughput.toFixed(0)} msg/s`);

      expect(throughput).toBeGreaterThan(1000);

      // 清理
      await Promise.all(clients.map(c => closeWebSocket(c)));
    });
  });

  // ============================================================================
  // 内存使用性能测试
  // ============================================================================

  describe('WebSocket内存使用性能', () => {
    test('多连接内存增长受控', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const connections: WebSocket[] = [];

      // 逐步增加连接
      for (let batch = 0; batch < 5; batch++) {
        const batchConnections = await Promise.all(
          Array.from({ length: 10 }, () => createWebSocketConnection(TEST_URL))
        );
        connections.push(...batchConnections);

        const currentMemory = process.memoryUsage().heapUsed;
        const memoryIncrease = currentMemory - initialMemory;
        const avgMemoryPerConnection = memoryIncrease / connections.length;

        console.log(
          `  批次 ${batch + 1}: ${connections.length}个连接, ` +
          `内存增长: ${Math.round(memoryIncrease / 1024 / 1024)}MB, ` +
          `平均: ${Math.round(avgMemoryPerConnection / 1024)}KB/连接`
        );
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const totalIncrease = finalMemory - initialMemory;
      const avgIncreasePerConnection = totalIncrease / connections.length;

      console.log(`✓ 总内存增长: ${Math.round(totalIncrease / 1024 / 1024)}MB`);
      console.log(`✓ 平均每连接: ${Math.round(avgIncreasePerConnection / 1024)}KB`);

      // 平均每个连接的内存增长应该小于100KB
      expect(avgIncreasePerConnection).toBeLessThan(100 * 1024);

      // 清理
      await Promise.all(connections.map(c => closeWebSocket(c)));

      // 强制GC
      if (global.gc) {
        global.gc();
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const afterGCMemory = process.memoryUsage().heapUsed;
      const memoryFreed = finalMemory - afterGCMemory;

      console.log(`✓ GC释放内存: ${Math.round(memoryFreed / 1024 / 1024)}MB`);
      expect(memoryFreed).toBeGreaterThan(totalIncrease * 0.5); // 至少释放50%
    });

    test('消息缓冲内存不泄漏', async () => {
      const client = await createWebSocketConnection(TEST_URL);

      const initialMemory = process.memoryUsage().heapUsed;

      // 发送大量消息
      const messageCount = 1000;
      for (let i = 0; i < messageCount; i++) {
        client.send(JSON.stringify({
          type: 'test',
          payload: { data: 'x'.repeat(1000), index: i }
        }));

        // 每100条检查一次内存
        if (i % 100 === 99) {
          const currentMemory = process.memoryUsage().heapUsed;
          const increase = currentMemory - initialMemory;
          console.log(`  发送 ${i + 1} 条消息, 内存增长: ${Math.round(increase / 1024)}KB`);
        }
      }

      // 等待消息处理完成
      await new Promise(resolve => setTimeout(resolve, 1000));

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      console.log(`✓ ${messageCount}条消息后内存增长: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);

      // 内存增长应该小于50MB
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);

      await closeWebSocket(client);
    });
  });

  // ============================================================================
  // 连接稳定性和重连性能测试
  // ============================================================================

  describe('WebSocket连接稳定性', () => {
    test('心跳保持连接活跃', async () => {
      const client = await createWebSocketConnection(TEST_URL);

      // 模拟长连接
      const keepAliveTime = 30000; // 30秒
      const startTime = Date.now();

      while (Date.now() - startTime < keepAliveTime) {
        // 发送心跳
        client.send(JSON.stringify({ type: 'ping' }));

        // 等待pong
        await waitForMessage(client, 'pong');

        // 检查连接状态
        expect(client.readyState).toBe(WebSocket.OPEN);

        // 等待下一次心跳
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      console.log(`✓ 连接保持活跃 ${keepAliveTime / 1000}秒`);

      await closeWebSocket(client);
    });

    test('异常断开后快速重连', async () => {
      let client = await createWebSocketConnection(TEST_URL);

      // 正常断开
      client.close();

      // 立即重连
      const reconnectStart = Date.now();
      client = await createWebSocketConnection(TEST_URL);
      const reconnectTime = Date.now() - reconnectStart;

      expect(client.readyState).toBe(WebSocket.OPEN);
      console.log(`✓ 重连时间: ${reconnectTime}ms`);
      expect(reconnectTime).toBeLessThan(500);

      await closeWebSocket(client);
    });
  });

  // ============================================================================
  // 房间/频道性能测试
  // ============================================================================

  describe('WebSocket房间/频道性能', () => {
    test('房间订阅和取消订阅性能', async () => {
      const client = await createWebSocketConnection(TEST_URL);

      const roomCount = 50;
      const startTime = Date.now();

      // 订阅多个房间
      for (let i = 0; i < roomCount; i++) {
        client.send(JSON.stringify({
          type: 'subscribe',
          payload: { channel: `room_${i}` }
        }));
      }

      const subscribeTime = Date.now() - startTime;

      console.log(`✓ 订阅${roomCount}个房间耗时: ${subscribeTime}ms`);
      expect(subscribeTime).toBeLessThan(1000);

      // 取消订阅
      const unsubscribeStart = Date.now();
      for (let i = 0; i < roomCount; i++) {
        client.send(JSON.stringify({
          type: 'unsubscribe',
          payload: { channel: `room_${i}` }
        }));
      }

      const unsubscribeTime = Date.now() - unsubscribeStart;

      console.log(`✓ 取消订阅${roomCount}个房间耗时: ${unsubscribeTime}ms`);
      expect(unsubscribeTime).toBeLessThan(500);

      await closeWebSocket(client);
    });

    test('房间消息路由性能', async () => {
      const clientCount = 20;
      const roomCount = 5;
      const messageCount = 100;

      // 创建客户端并分配到不同房间
      const clients: WebSocket[] = [];
      for (let i = 0; i < clientCount; i++) {
        const client = await createWebSocketConnection(TEST_URL);

        // 订阅2个随机房间
        const room1 = `room_${i % roomCount}`;
        const room2 = `room_${(i + 1) % roomCount}`;

        client.send(JSON.stringify({
          type: 'subscribe',
          payload: { channel: room1 }
        }));

        client.send(JSON.stringify({
          type: 'subscribe',
          payload: { channel: room2 }
        }));

        clients.push(client);
      }

      // 等待订阅完成
      await new Promise(resolve => setTimeout(resolve, 200));

      const startTime = Date.now();

      // 向每个房间发送消息
      for (let room = 0; room < roomCount; room++) {
        for (let msg = 0; msg < messageCount; msg++) {
          wsService.send(`room_${room}`, {
            type: 'room_message',
            payload: { room, index: msg }
          });
        }
      }

      // 等待消息传播
      await new Promise(resolve => setTimeout(resolve, 1000));

      const totalTime = Date.now() - startTime;
      const totalMessages = messageCount * roomCount;
      const throughput = (totalMessages / totalTime) * 1000;

      console.log(`✓ ${totalMessages}条房间消息路由耗时: ${totalTime}ms`);
      console.log(`✓ 房间消息吞吐量: ${throughput.toFixed(0)} msg/s`);

      expect(throughput).toBeGreaterThan(500);

      // 清理
      await Promise.all(clients.map(c => closeWebSocket(c)));
    });
  });
});

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 创建WebSocket连接
 */
async function createWebSocketConnection(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);

    ws.on('open', () => {
      resolve(ws);
    });

    ws.on('error', (error) => {
      reject(error);
    });

    // 超时处理
    setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        ws.close();
        reject(new Error('WebSocket连接超时'));
      }
    }, 5000);
  });
}

/**
 * 关闭WebSocket连接
 */
async function closeWebSocket(ws: WebSocket): Promise<void> {
  return new Promise((resolve) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.on('close', () => resolve());
      ws.close();
    } else {
      resolve();
    }
  });
}

/**
 * 等待特定类型的消息
 */
async function waitForMessage(ws: WebSocket, expectedType: string): Promise<any> {
  return new Promise((resolve) => {
    const handler = (data: string) => {
      try {
        const message = JSON.parse(data);
        if (message.type === expectedType) {
          ws.off('message', handler);
          resolve(message);
        }
      } catch (error) {
        // 忽略解析错误
      }
    };

    ws.on('message', handler);

    // 超时处理
    setTimeout(() => {
      ws.off('message', handler);
      resolve(null);
    }, 5000);
  });
}

/**
 * 发送消息并接收响应
 */
async function sendMessageAndReceive(ws: WebSocket, payload: string): Promise<any> {
  const message = {
    type: 'test:message',
    payload: { data: payload, timestamp: Date.now() }
  };

  ws.send(JSON.stringify(message));
  return waitForMessage(ws, 'test:response');
}
