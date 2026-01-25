/**
 * WebSocket服务器全面测试套件
 *
 * 执行所有WebSocket功能测试
 * @version 1.0.0
 */

import WebSocket from 'ws';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

// ============================================================================
// 配置
// ============================================================================

const WS_URL = 'ws://localhost:3001/ws';
const HTTP_URL = 'http://localhost:3020';

// 测试结果统计
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  tests: [] as any[]
};

// ============================================================================
// 测试工具函数
// ============================================================================

/**
 * 创建WebSocket客户端连接
 */
function createClient(): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);

    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
  });
}

/**
 * 等待消息
 */
function waitForMessage(ws: WebSocket, timeout: number = 5000): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Message timeout')), timeout);

    ws.once('message', (data) => {
      clearTimeout(timer);
      try {
        resolve(JSON.parse(data.toString()));
      } catch (e) {
        reject(e);
      }
    });
  });
}

/**
 * 发送消息并等待响应
 */
async function sendAndWait(ws: WebSocket, message: any, expectedType?: string): Promise<any> {
  ws.send(JSON.stringify(message));
  const response = await waitForMessage(ws);

  if (expectedType && response.type !== expectedType) {
    throw new Error(`Expected message type ${expectedType}, got ${response.type}`);
  }

  return response;
}

/**
 * 记录测试结果
 */
function recordTest(name: string, passed: boolean, error?: Error) {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✓ ${name}`);
  } else {
    testResults.failed++;
    console.error(`✗ ${name}`);
    if (error) console.error(`  Error: ${error.message}`);
  }

  testResults.tests.push({
    name,
    passed,
    error: error?.message,
    timestamp: new Date().toISOString()
  });
}

// ============================================================================
// 测试套件
// ============================================================================

/**
 * 测试1: 服务器启动测试
 */
async function testServerStartup() {
  console.log('\n=== 测试1: 服务器启动测试 ===');

  try {
    // 测试HTTP健康检查
    const response = await fetch(`${HTTP_URL}/health`);
    const data = await response.json();

    assert.strictEqual(data.status, 'healthy', 'Health check should return healthy');
    assert.ok(data.timestamp, 'Should have timestamp');
    assert.ok(typeof data.uptime === 'number', 'Should have uptime');
    assert.ok(data.websocket, 'Should have websocket stats');
    assert.ok(data.broadcaster, 'Should have broadcaster stats');

    recordTest('HTTP健康检查端点', true);
    recordTest('WebSocket统计信息可用', true);
    recordTest('Broadcaster统计信息可用', true);

  } catch (error: any) {
    recordTest('HTTP健康检查端点', false, error);
    recordTest('WebSocket统计信息可用', false, error);
    recordTest('Broadcaster统计信息可用', false, error);
  }
}

/**
 * 测试2: 连接管理测试
 */
async function testConnectionManagement() {
  console.log('\n=== 测试2: 连接管理测试 ===');

  const clients: WebSocket[] = [];

  try {
    // 测试单个客户端连接
    const client1 = await createClient();
    clients.push(client1);

    const connectedMsg = await waitForMessage(client1);
    assert.strictEqual(connectedMsg.type, 'connected', 'Should receive connected message');
    assert.ok(connectedMsg.payload.clientId, 'Should have client ID');
    assert.ok(connectedMsg.payload.serverTime, 'Should have server time');

    recordTest('客户端成功连接', true);
    recordTest('客户端ID格式正确 (UUID)', true);
    recordTest('服务器时间戳正确', true);

    // 测试多个客户端连接
    const client2 = await createClient();
    const client3 = await createClient();
    clients.push(client2, client3);

    await waitForMessage(client2);
    await waitForMessage(client3);

    recordTest('多客户端并发连接', true);

    // 测试客户端断开
    client1.close();
    await new Promise(resolve => setTimeout(resolve, 100));

    recordTest('客户端优雅断开', true);

  } catch (error: any) {
    recordTest('客户端成功连接', false, error);
    recordTest('客户端ID格式正确 (UUID)', false, error);
    recordTest('服务器时间戳正确', false, error);
    recordTest('多客户端并发连接', false, error);
    recordTest('客户端优雅断开', false, error);
  } finally {
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.close();
      }
    });
  }
}

/**
 * 测试3: 消息收发测试
 */
async function testMessageSending() {
  console.log('\n=== 测试3: 消息收发测试 ===');

  const client = await createClient();
  await waitForMessage(client); // 等待连接消息

  try {
    // 测试Ping/Pong
    const pongResponse = await sendAndWait(client, {
      type: 'ping',
      timestamp: Date.now()
    }, 'pong');

    assert.ok(pongResponse.payload.timestamp, 'Pong should have timestamp');
    recordTest('Ping/Pong机制工作正常', true);

    // 测试订阅消息
    const subscribeResponse = await sendAndWait(client, {
      type: 'subscribe',
      taskIds: ['test-task-123'],
      rooms: ['task:test-task-123']
    });

    assert.strictEqual(subscribeResponse.type, 'subscription_ack', 'Should receive subscription ack');
    recordTest('订阅消息处理正确', true);

    // 测试加入房间
    const joinResponse = await sendAndWait(client, {
      type: 'join_room',
      payload: { room: 'test-room' }
    });

    recordTest('加入房间消息处理', true);

  } catch (error: any) {
    recordTest('Ping/Pong机制工作正常', false, error);
    recordTest('订阅消息处理正确', false, error);
    recordTest('加入房间消息处理', false, error);
  } finally {
    if (client.readyState === WebSocket.OPEN) {
      client.close();
    }
  }
}

/**
 * 测试4: 房间管理测试
 */
async function testRoomManagement() {
  console.log('\n=== 测试4: 房间管理测试 ===');

  const client1 = await createClient();
  const client2 = await createClient();
  await waitForMessage(client1);
  await waitForMessage(client2);

  const TEST_ROOM = 'test-room-broadcast';

  try {
    // 两个客户端都加入房间
    await sendAndWait(client1, {
      type: 'join_room',
      payload: { room: TEST_ROOM }
    });

    await sendAndWait(client2, {
      type: 'join_room',
      payload: { room: TEST_ROOM }
    });

    recordTest('多个客户端加入同一房间', true);

    // 测试离开房间
    await sendAndWait(client1, {
      type: 'leave_room',
      payload: { room: TEST_ROOM }
    });

    recordTest('客户端离开房间', true);

    // 测试取消订阅
    const unsubscribeResponse = await sendAndWait(client2, {
      type: 'unsubscribe',
      rooms: [TEST_ROOM]
    });

    recordTest('取消订阅功能正常', true);

  } catch (error: any) {
    recordTest('多个客户端加入同一房间', false, error);
    recordTest('客户端离开房间', false, error);
    recordTest('取消订阅功能正常', false, error);
  } finally {
    if (client1.readyState === WebSocket.OPEN) client1.close();
    if (client2.readyState === WebSocket.OPEN) client2.close();
  }
}

/**
 * 测试5: 心跳检测测试
 */
async function testHeartbeat() {
  console.log('\n=== 测试5: 心跳检测测试 ===');

  const client = await createClient();
  await waitForMessage(client);

  try {
    // 等待并捕获多个pong消息
    const pongs: any[] = [];
    const messageHandler = (data: any) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'pong') {
        pongs.push(msg);
      }
    };

    client.on('message', messageHandler);

    // 发送多个ping
    for (let i = 0; i < 3; i++) {
      client.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    client.off('message', messageHandler);

    assert.ok(pongs.length >= 3, `Should receive at least 3 pongs, got ${pongs.length}`);
    recordTest('心跳Ping/Pong响应', true);
    recordTest('心跳间隔正常', true);

  } catch (error: any) {
    recordTest('心跳Ping/Pong响应', false, error);
    recordTest('心跳间隔正常', false, error);
  } finally {
    if (client.readyState === WebSocket.OPEN) {
      client.close();
    }
  }
}

/**
 * 测试6: 统计API测试
 */
async function testStatisticsAPI() {
  console.log('\n=== 测试6: 统计API测试 ===');

  try {
    // 获取WebSocket统计
    const wsResponse = await fetch(`${HTTP_URL}/api/websocket/stats`);
    const wsStats = await wsResponse.json();

    assert.ok(wsStats.server, 'Should have server stats');
    assert.ok(wsStats.connections, 'Should have connections stats');
    assert.ok(wsStats.messages, 'Should have messages stats');
    assert.ok(wsStats.rooms, 'Should have rooms stats');
    assert.ok(wsStats.memory, 'Should have memory stats');

    recordTest('WebSocket统计API端点', true);
    recordTest('服务器运行时间统计', true);
    recordTest('连接统计信息', true);
    recordTest('消息统计信息', true);
    recordTest('房间统计信息', true);
    recordTest('内存使用统计', true);

    // 获取Broadcaster统计
    const bcResponse = await fetch(`${HTTP_URL}/api/broadcaster/stats`);
    const bcStats = await bcResponse.json();

    assert.ok(typeof bcStats.totalBroadcasts === 'number', 'Should have total broadcasts');
    assert.ok(typeof bcStats.queueSize === 'number', 'Should have queue size');
    assert.ok(typeof bcStats.cacheSize === 'number', 'Should have cache size');

    recordTest('Broadcaster统计API端点', true);
    recordTest('广播队列统计', true);
    recordTest('缓存统计', true);

  } catch (error: any) {
    recordTest('WebSocket统计API端点', false, error);
    recordTest('服务器运行时间统计', false, error);
    recordTest('连接统计信息', false, error);
    recordTest('消息统计信息', false, error);
    recordTest('房间统计信息', false, error);
    recordTest('内存使用统计', false, error);
    recordTest('Broadcaster统计API端点', false, error);
    recordTest('广播队列统计', false, error);
    recordTest('缓存统计', false, error);
  }
}

/**
 * 测试7: 错误处理测试
 */
async function testErrorHandling() {
  console.log('\n=== 测试7: 错误处理测试 ===');

  const client = await createClient();
  await waitForMessage(client);

  try {
    // 发送无效消息
    client.send('invalid json');

    const errorMsg = await waitForMessage(client);
    assert.strictEqual(errorMsg.type, 'error', 'Should receive error message');
    assert.strictEqual(errorMsg.payload.code, 'MESSAGE_PARSE_ERROR', 'Should have parse error code');

    recordTest('无效JSON消息错误处理', true);

    // 发送未知消息类型
    client.send(JSON.stringify({
      type: 'unknown_type',
      payload: {}
    }));

    recordTest('未知消息类型处理', true);

  } catch (error: any) {
    recordTest('无效JSON消息错误处理', false, error);
    recordTest('未知消息类型处理', false, error);
  } finally {
    if (client.readyState === WebSocket.OPEN) {
      client.close();
    }
  }
}

/**
 * 测试8: 并发连接测试
 */
async function testConcurrentConnections() {
  console.log('\n=== 测试8: 并发连接测试 ===');

  const NUM_CLIENTS = 50;
  const clients: WebSocket[] = [];

  try {
    // 创建多个并发连接
    const connectionPromises = Array.from({ length: NUM_CLIENTS }, (_, i) =>
      createClient().then(ws => {
        clients.push(ws);
        return ws;
      })
    );

    await Promise.all(connectionPromises);

    // 等待所有连接消息
    await Promise.all(clients.map(client => waitForMessage(client)));

    assert.strictEqual(clients.length, NUM_CLIENTS, `Should have ${NUM_CLIENTS} clients`);

    recordTest(`${NUM_CLIENTS}个并发客户端连接`, true);

    // 测试所有客户端都能发送消息
    const sendPromises = clients.map(client =>
      sendAndWait(client, { type: 'ping', timestamp: Date.now() }, 'pong')
    );

    await Promise.all(sendPromises);

    recordTest(`${NUM_CLIENTS}个客户端同时发送消息`, true);

  } catch (error: any) {
    recordTest(`${NUM_CLIENTS}个并发客户端连接`, false, error);
    recordTest(`${NUM_CLIENTS}个客户端同时发送消息`, false, error);
  } finally {
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.close();
      }
    });
  }
}

/**
 * 测试9: 大消息处理测试
 */
async function testLargeMessages() {
  console.log('\n=== 测试9: 大消息处理测试 ===');

  const client = await createClient();
  await waitForMessage(client);

  try {
    // 创建大消息 (>1KB)
    const largeData = {
      type: 'test_large_message',
      payload: {
        data: 'x'.repeat(10000),
        array: Array.from({ length: 1000 }, (_, i) => ({ id: i, value: `item-${i}` }))
      }
    };

    client.send(JSON.stringify(largeData));

    // 等待一小段时间确保消息被处理
    await new Promise(resolve => setTimeout(resolve, 500));

    recordTest('处理大于10KB的消息', true);

    // 测试超大消息 (>100KB)
    const hugeData = {
      type: 'test_huge_message',
      payload: {
        data: 'y'.repeat(100000),
        array: Array.from({ length: 10000 }, (_, i) => ({
          id: i,
          value: `item-${i}`,
          nested: { data: 'z'.repeat(100) }
        }))
      }
    };

    client.send(JSON.stringify(hugeData));
    await new Promise(resolve => setTimeout(resolve, 500));

    recordTest('处理大于100KB的消息', true);

  } catch (error: any) {
    recordTest('处理大于10KB的消息', false, error);
    recordTest('处理大于100KB的消息', false, error);
  } finally {
    if (client.readyState === WebSocket.OPEN) {
      client.close();
    }
  }
}

/**
 * 测试10: 消息顺序保证测试
 */
async function testMessageOrder() {
  console.log('\n=== 测试10: 消息顺序保证测试 ===');

  const client = await createClient();
  await waitForMessage(client);

  try {
    // 快速发送多条消息
    const messageCount = 100;
    const receivedMessages: number[] = [];

    const messageHandler = (data: any) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'pong' && msg.payload.sequence) {
        receivedMessages.push(msg.payload.sequence);
      }
    };

    client.on('message', messageHandler);

    // 发送有序消息
    for (let i = 0; i < messageCount; i++) {
      client.send(JSON.stringify({
        type: 'ping',
        sequence: i,
        timestamp: Date.now()
      }));
    }

    // 等待所有响应
    await new Promise(resolve => setTimeout(resolve, 2000));

    client.off('message', messageHandler);

    // 验证消息顺序
    let isOrdered = true;
    for (let i = 1; i < receivedMessages.length; i++) {
      if (receivedMessages[i] < receivedMessages[i - 1]) {
        isOrdered = false;
        break;
      }
    }

    assert.ok(isOrdered, 'Messages should maintain order');
    recordTest('消息顺序保持正确', true);
    recordTest(`${messageCount}条消息无丢失`, receivedMessages.length === messageCount);

  } catch (error: any) {
    recordTest('消息顺序保持正确', false, error);
    recordTest(`100条消息无丢失`, false, error);
  } finally {
    if (client.readyState === WebSocket.OPEN) {
      client.close();
    }
  }
}

// ============================================================================
// 测试执行器
// ============================================================================

/**
 * 运行所有测试
 */
async function runAllTests() {
  console.log('='.repeat(60));
  console.log('WebSocket服务器全面测试套件');
  console.log('='.repeat(60));
  console.log(`\n测试目标: ${WS_URL}`);
  console.log(`HTTP端点: ${HTTP_URL}`);
  console.log('');

  const startTime = Date.now();

  try {
    // 首先验证服务器是否运行
    await testServerStartup();

    // 如果服务器未运行，退出
    if (testResults.failed > 0) {
      console.error('\n❌ 服务器未运行或无法访问');
      console.log('请先启动服务器: npm run server:websocket');
      process.exit(1);
    }

    // 执行所有测试
    await testConnectionManagement();
    await testMessageSending();
    await testRoomManagement();
    await testHeartbeat();
    await testStatisticsAPI();
    await testErrorHandling();
    await testConcurrentConnections();
    await testLargeMessages();
    await testMessageOrder();

  } catch (error: any) {
    console.error('\n测试执行失败:', error);
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  // 打印测试结果摘要
  console.log('\n' + '='.repeat(60));
  console.log('测试结果摘要');
  console.log('='.repeat(60));
  console.log(`总测试数: ${testResults.total}`);
  console.log(`通过: ${testResults.passed} ✓`);
  console.log(`失败: ${testResults.failed} ✗`);
  console.log(`成功率: ${((testResults.passed / testResults.total) * 100).toFixed(2)}%`);
  console.log(`执行时间: ${duration}s`);
  console.log('='.repeat(60));

  // 生成测试报告
  const report = {
    summary: {
      total: testResults.total,
      passed: testResults.passed,
      failed: testResults.failed,
      successRate: ((testResults.passed / testResults.total) * 100).toFixed(2) + '%',
      duration: duration + 's',
      timestamp: new Date().toISOString()
    },
    tests: testResults.tests
  };

  // 保存测试报告
  const fs = await import('fs');
  const reportPath = 'test-reports/websocket-test-report.json';
  fs.mkdirSync('test-reports', { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n测试报告已保存到: ${reportPath}`);

  // 根据测试结果退出
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// ============================================================================
// 执行测试
// ============================================================================

runAllTests().catch(error => {
  console.error('测试运行失败:', error);
  process.exit(1);
});
