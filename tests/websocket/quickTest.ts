/**
 * WebSocket 快速测试脚本
 *
 * Week 0 技术验证 - 快速验证测试
 *
 * 这是一个简化版的测试，用于快速验证 WebSocket 基本功能
 */

import { WebSocketTestServer } from './WebSocketTestServer.js';
import { WebSocketTestClient } from './WebSocketTestClient.js';

async function runQuickTest(): Promise<void> {
  console.log('\n========================================');
  console.log('  WebSocket Quick Test');
  console.log('  Week 0 Technical Validation');
  console.log('========================================\n');

  const PORT = 8080;
  let server: WebSocketTestServer;

  try {
    // 1. 启动服务器
    console.log('[1/5] Starting WebSocket server...');
    server = new WebSocketTestServer(PORT);
    await wait(1000);
    console.log('✓ Server started successfully\n');

    // 2. 测试基本连接
    console.log('[2/5] Testing basic connection...');
    const client1 = new WebSocketTestClient(`ws://localhost:${PORT}`);
    await wait(2000);

    if (!client1.connected()) {
      throw new Error('Client failed to connect');
    }
    console.log('✓ Client connected successfully\n');

    // 3. 测试消息发送和接收
    console.log('[3/5] Testing message send/receive...');
    let messagesReceived = 0;

    client1.onMessage((message) => {
      if (message.type === 'echo') {
        messagesReceived++;
      }
    });

    client1.sendEcho({ test: 'hello' });
    await wait(1000);

    if (messagesReceived === 0) {
      throw new Error('No messages received');
    }
    console.log('✓ Messages sent and received successfully\n');

    // 4. 测试心跳
    console.log('[4/5] Testing heartbeat...');
    let heartbeatReceived = false;

    client1.onMessage((message) => {
      if (message.type === 'heartbeat') {
        heartbeatReceived = true;
      }
    });

    client1.sendHeartbeat();
    await wait(1000);

    if (!heartbeatReceived) {
      throw new Error('No heartbeat received');
    }
    console.log('✓ Heartbeat working correctly\n');

    // 5. 测试并发连接
    console.log('[5/5] Testing concurrent connections...');
    const clients: WebSocketTestClient[] = [];

    for (let i = 0; i < 5; i++) {
      const client = new WebSocketTestClient(`ws://localhost:${PORT}`);
      clients.push(client);
    }

    await wait(2000);

    const allConnected = clients.every(c => c.connected());

    clients.forEach(c => c.close());

    if (!allConnected) {
      throw new Error('Not all clients connected');
    }
    console.log('✓ All 5 clients connected successfully\n');

    // 显示统计信息
    const stats = client1.getStats();
    console.log('========================================');
    console.log('  Test Statistics');
    console.log('========================================\n');
    console.log(`Connection ID: ${stats.connectionId}`);
    console.log(`Messages Sent: ${stats.messagesSent}`);
    console.log(`Messages Received: ${stats.messagesReceived}`);
    console.log(`Average Latency: ${stats.averageLatency.toFixed(2)}ms`);
    console.log(`Uptime: ${stats.uptime}ms`);
    console.log(`Reconnect Count: ${stats.reconnectCount}\n`);

    // 清理
    client1.close();
    server.close();

    console.log('========================================');
    console.log('  ✓ All Tests Passed!');
    console.log('========================================\n');

  } catch (error) {
    console.error('\n✗ Test failed:', error);
    process.exit(1);
  }
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 运行测试
runQuickTest()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Quick test failed:', error);
    process.exit(1);
  });
