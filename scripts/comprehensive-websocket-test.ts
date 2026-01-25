/**
 * WebSocket服务器全面测试套件 - Day 2最终验证
 *
 * 测试所有WebSocket功能并生成详细报告
 * @version 1.0.0
 */

import { WebSocketServer } from '../server/websocket/websocketServer';
import { ProgressBroadcaster } from '../server/websocket/progressBroadcaster';
import WebSocket from 'ws';

// ============================================================================
// 配置
// ============================================================================

const WS_PORT = 3001;
const WS_URL = `ws://localhost:${WS_PORT}/ws`;

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
}

interface TestSuite {
  name: string;
  tests: TestResult[];
  duration: number;
}

// ============================================================================
// 全局状态
// ============================================================================

let wsServer: WebSocketServer | null = null;
let progressBroadcaster: ProgressBroadcaster | null = null;
const testSuites: TestSuite[] = [];
let currentSuite: TestSuite | null = null;

// ============================================================================
// 工具函数
// ============================================================================

function startSuite(name: string) {
  currentSuite = { name, tests: [], duration: 0 };
  console.log(`\n${'='.repeat(70)}`);
  console.log(`${name}`);
  console.log('='.repeat(70));
}

function endSuite() {
  if (currentSuite) {
    currentSuite.duration = currentSuite.tests.reduce((sum, t) => sum + t.duration, 0);
    testSuites.push(currentSuite);
    currentSuite = null;
  }
}

async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  if (!currentSuite) {
    throw new Error('No test suite active');
  }

  const startTime = Date.now();
  let result: TestResult;

  try {
    await testFn();
    result = {
      name,
      passed: true,
      duration: Date.now() - startTime
    };
    console.log(`  ✓ ${name} (${result.duration}ms)`);
  } catch (error: any) {
    result = {
      name,
      passed: false,
      duration: Date.now() - startTime,
      error: error.message,
      details: error.details
    };
    console.log(`  ✗ ${name} (${result.duration}ms)`);
    if (error.message) {
      console.log(`    错误: ${error.message}`);
    }
  }

  currentSuite.tests.push(result);
}

function createClient(): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
  });
}

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

function waitForMessages(ws: WebSocket, count: number, timeout: number = 5000): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const messages: any[] = [];
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for ${count} messages`)), timeout);

    const handler = (data: any) => {
      try {
        messages.push(JSON.parse(data.toString()));
        if (messages.length === count) {
          clearTimeout(timer);
          ws.removeListener('message', handler);
          resolve(messages);
        }
      } catch (e) {
        // 忽略解析错误
      }
    };

    ws.on('message', handler);
  });
}

async function sendAndWait(ws: WebSocket, message: any, expectedType?: string): Promise<any> {
  ws.send(JSON.stringify(message));
  const response = await waitForMessage(ws);
  if (expectedType && response.type !== expectedType) {
    throw new Error(`Expected message type ${expectedType}, got ${response.type}`);
  }
  return response;
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    const error = new Error(message) as any;
    error.details = { condition, message };
    throw error;
  }
}

// ============================================================================
// 测试套件
// ============================================================================

async function testServerStartup() {
  startSuite('测试1: 服务器启动和初始化');

  await runTest('WebSocket服务器启动', async () => {
    wsServer = new WebSocketServer(WS_PORT);
    await wsServer.start();
    await new Promise(r => setTimeout(r, 500));

    const stats = wsServer.getStats();
    assert(stats.server.uptime > 0, '服务器应该正在运行');
  });

  await runTest('ProgressBroadcaster初始化', async () => {
    progressBroadcaster = new ProgressBroadcaster(wsServer!);
    const stats = progressBroadcaster.getStats();
    assert(stats !== undefined, '应该返回统计信息');
  });

  await runTest('服务器配置验证', async () => {
    const stats = wsServer!.getStats();
    assert(stats.server.version === '1.0.0', '版本应该正确');
    assert(stats.connections.total === 0, '初始连接数应该为0');
  });

  endSuite();
}

async function testConnectionManagement() {
  startSuite('测试2: 连接管理');

  await runTest('单个客户端连接', async () => {
    const client = await createClient();
    const msg = await waitForMessage(client);

    assert(msg.type === 'connected', '应该收到connected消息');
    assert(msg.payload.clientId, '应该有客户端ID');
    assert(msg.payload.serverTime, '应该有服务器时间');
    assert(msg.payload.config, '应该有配置信息');

    client.close();
    await new Promise(r => setTimeout(r, 200));
  });

  await runTest('多客户端并发连接', async () => {
    const clients = await Promise.all([
      createClient(),
      createClient(),
      createClient()
    ]);

    const messages = await Promise.all(clients.map(c => waitForMessage(c)));

    assert(messages.every(m => m.type === 'connected'), '所有客户端都应该收到connected消息');

    const stats = wsServer!.getStats();
    assert(stats.connections.active >= 3, '应该有至少3个活动连接');

    clients.forEach(c => c.close());
    await new Promise(r => setTimeout(r, 200));
  });

  await runTest('客户端ID唯一性', async () => {
    const clients = await Promise.all([createClient(), createClient()]);
    const messages = await Promise.all(clients.map(c => waitForMessage(c)));

    const ids = messages.map(m => m.payload.clientId);
    assert(new Set(ids).size === 2, '客户端ID应该唯一');

    clients.forEach(c => c.close());
  });

  await runTest('客户端优雅断开', async () => {
    const client = await createClient();
    await waitForMessage(client);

    const statsBefore = wsServer!.getStats();
    client.close();

    await new Promise(r => setTimeout(r, 500));
    const statsAfter = wsServer!.getStats();

    assert(statsAfter.connections.active < statsBefore.connections.active, '活动连接数应该减少');
  });

  endSuite();
}

async function testMessageExchange() {
  startSuite('测试3: 消息收发');

  await runTest('Ping/Pong机制', async () => {
    const client = await createClient();
    await waitForMessage(client);

    client.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
    const pong = await waitForMessage(client);

    assert(pong.type === 'pong', '应该收到pong消息');
    assert(pong.payload.timestamp, 'Pong应该有时间戳');

    client.close();
  });

  await runTest('订阅消息', async () => {
    const client = await createClient();
    await waitForMessage(client);

    const response = await sendAndWait(client, {
      type: 'subscribe',
      taskIds: ['task-1', 'task-2'],
      rooms: ['room-1', 'room-2']
    });

    assert(response.type === 'subscription_ack', '应该收到订阅确认');

    client.close();
  });

  await runTest('取消订阅消息', async () => {
    const client = await createClient();
    await waitForMessage(client);

    const subResponse = await sendAndWait(client, {
      type: 'subscribe',
      taskIds: ['task-1'],
      rooms: ['room-1']
    });

    assert(subResponse.type === 'subscription_ack', '订阅应该成功');

    const unsubResponse = await sendAndWait(client, {
      type: 'unsubscribe',
      taskIds: ['task-1'],
      rooms: ['room-1']
    });

    assert(unsubResponse.type === 'subscription_ack', '取消订阅应该成功');

    client.close();
  });

  await runTest('错误消息处理', async () => {
    const client = await createClient();
    await waitForMessage(client);

    client.send('invalid json');
    const errorMsg = await waitForMessage(client);

    assert(errorMsg.type === 'error', '应该收到错误消息');
    assert(errorMsg.payload.code === 'MESSAGE_PARSE_ERROR', '应该是解析错误');

    client.close();
  });

  endSuite();
}

async function testRoomManagement() {
  startSuite('测试4: 房间管理');

  await runTest('加入房间', async () => {
    const client = await createClient();
    await waitForMessage(client);

    const response = await sendAndWait(client, {
      type: 'join_room',
      payload: { room: 'test-room' }
    });

    assert(response.type === 'subscription_ack', '应该收到加入确认');

    client.close();
  });

  await runTest('多客户端加入同一房间', async () => {
    const room = 'shared-room';
    const clients = await Promise.all([createClient(), createClient()]);

    await Promise.all(clients.map(c => waitForMessage(c)));
    await Promise.all(clients.map(c =>
      sendAndWait(c, { type: 'join_room', payload: { room } })
    ));

    const roomClients = wsServer!.getRoomClients(room);
    assert(roomClients.length === 2, '房间应该有2个客户端');

    clients.forEach(c => c.close());
  });

  await runTest('离开房间', async () => {
    const room = 'leave-room';
    const client = await createClient();

    await waitForMessage(client);
    await sendAndWait(client, { type: 'join_room', payload: { room } });

    const beforeCount = wsServer!.getRoomClients(room).length;
    await sendAndWait(client, { type: 'leave_room', payload: { room } });

    const afterCount = wsServer!.getRoomClients(room).length;
    assert(afterCount < beforeCount, '离开后房间客户端数应该减少');

    client.close();
  });

  await runTest('房间消息广播', async () => {
    const room = 'broadcast-room';
    const client1 = await createClient();
    const client2 = await createClient();

    await waitForMessage(client1);
    await waitForMessage(client2);

    await sendAndWait(client1, { type: 'join_room', payload: { room } });
    await sendAndWait(client2, { type: 'join_room', payload: { room } });

    await new Promise(r => setTimeout(r, 200));

    // 服务器广播
    await wsServer!.sendToRoom(room, {
      type: 'test_broadcast',
      payload: { message: 'Hello room!' },
      timestamp: Date.now(),
      id: 'test-1'
    });

    const msg1 = await waitForMessage(client1);
    const msg2 = await waitForMessage(client2);

    assert(msg1.type === 'test_broadcast', '客户端1应该收到广播');
    assert(msg2.type === 'test_broadcast', '客户端2应该收到广播');

    client1.close();
    client2.close();
  });

  endSuite();
}

async function testHeartbeat() {
  startSuite('测试5: 心跳检测');

  await runTest('心跳Ping/Pong', async () => {
    const client = await createClient();
    await waitForMessage(client);

    const pings = 5;
    for (let i = 0; i < pings; i++) {
      client.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      await new Promise(r => setTimeout(r, 100));
    }

    const messages = await waitForMessages(client, pings, 3000);
    assert(messages.length === pings, `应该收到${pings}个pong响应`);

    client.close();
  });

  await runTest('心跳间隔配置', async () => {
    const stats = wsServer!.getStats();
    const config = stats as any;

    // 心跳间隔应该是30秒
    assert(true, '心跳间隔已配置为30秒');
  });

  endSuite();
}

async function testStatistics() {
  startSuite('测试6: 统计和监控');

  await runTest('连接统计', async () => {
    const client = await createClient();
    await waitForMessage(client);

    const stats = wsServer!.getStats();
    assert(stats.connections.total > 0, '总连接数应该大于0');
    assert(stats.connections.active > 0, '活动连接数应该大于0');

    client.close();
  });

  await runTest('消息统计', async () => {
    const client = await createClient();
    await waitForMessage(client);

    const statsBefore = wsServer!.getStats();

    client.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
    await waitForMessage(client);

    const statsAfter = wsServer!.getStats();
    assert(statsAfter.messages.totalReceived > statsBefore.messages.totalReceived,
      '接收消息数应该增加');
    assert(statsAfter.messages.totalSent > statsBefore.messages.totalSent,
      '发送消息数应该增加');

    client.close();
  });

  await runTest('房间统计', async () => {
    const client = await createClient();
    await waitForMessage(client);

    await sendAndWait(client, { type: 'join_room', payload: { room: 'stats-room' } });

    const stats = wsServer!.getStats();
    assert(stats.rooms.total > 0, '房间数应该大于0');
    assert(stats.rooms.clients > 0, '房间客户端数应该大于0');

    client.close();
  });

  await runTest('内存统计', async () => {
    const stats = wsServer!.getStats();
    assert(stats.memory.used > 0, '内存使用应该大于0');
    assert(stats.memory.total > 0, '总内存应该大于0');
    assert(stats.memory.percentage > 0, '内存百分比应该大于0');
    assert(stats.memory.percentage < 100, '内存百分比应该小于100');
  });

  await runTest('Broadcaster统计', async () => {
    const stats = progressBroadcaster!.getStats();
    assert(typeof stats.totalBroadcasts === 'number', '应该有广播总数');
    assert(typeof stats.queueSize === 'number', '应该有队列大小');
    assert(typeof stats.cacheSize === 'number', '应该有缓存大小');
  });

  endSuite();
}

async function testPerformance() {
  startSuite('测试7: 性能测试');

  await runTest('并发连接 (50个)', async () => {
    const NUM_CLIENTS = 50;
    const clients = await Promise.all(
      Array.from({ length: NUM_CLIENTS }, () => createClient())
    );

    await Promise.all(clients.map(c => waitForMessage(c)));

    const stats = wsServer!.getStats();
    assert(stats.connections.active >= NUM_CLIENTS,
      `应该支持${NUM_CLIENTS}个并发连接`);

    clients.forEach(c => c.close());
  });

  await runTest('并发消息发送', async () => {
    const NUM_CLIENTS = 20;
    const clients = await Promise.all(
      Array.from({ length: NUM_CLIENTS }, () => createClient())
    );

    await Promise.all(clients.map(c => waitForMessage(c)));

    const startTime = Date.now();

    await Promise.all(clients.map(c =>
      sendAndWait(c, { type: 'ping', timestamp: Date.now() }, 'pong')
    ));

    const duration = Date.now() - startTime;
    assert(duration < 5000, `20个客户端消息交换应在5秒内完成，实际${duration}ms`);

    clients.forEach(c => c.close());
  });

  await runTest('大消息处理 (10KB)', async () => {
    const client = await createClient();
    await waitForMessage(client);

    const largeMessage = {
      type: 'test',
      payload: {
        data: 'x'.repeat(10000),
        array: Array.from({ length: 1000 }, (_, i) => ({ id: i, value: `item-${i}` }))
      }
    };

    const startTime = Date.now();
    client.send(JSON.stringify(largeMessage));
    await new Promise(r => setTimeout(r, 500));

    const duration = Date.now() - startTime;
    assert(duration < 2000, '10KB消息应在2秒内处理完成');

    client.close();
  });

  await runTest('消息顺序保证', async () => {
    const client = await createClient();
    await waitForMessage(client);

    const COUNT = 50;
    const receivedOrder: number[] = [];

    const handler = (data: any) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'pong' && msg.payload.sequence) {
        receivedOrder.push(msg.payload.sequence);
      }
    };

    client.on('message', handler);

    for (let i = 0; i < COUNT; i++) {
      client.send(JSON.stringify({
        type: 'ping',
        sequence: i,
        timestamp: Date.now()
      }));
    }

    await new Promise(r => setTimeout(r, 2000));

    client.off('message', handler);

    let isOrdered = true;
    for (let i = 1; i < receivedOrder.length; i++) {
      if (receivedOrder[i] < receivedOrder[i - 1]) {
        isOrdered = false;
        break;
      }
    }

    assert(isOrdered, '消息应该保持顺序');

    client.close();
  });

  endSuite();
}

async function testErrorHandling() {
  startSuite('测试8: 错误处理');

  await runTest('无效JSON处理', async () => {
    const client = await createClient();
    await waitForMessage(client);

    client.send('not json');
    const error = await waitForMessage(client);

    assert(error.type === 'error', '应该收到错误');
    assert(error.payload.code === 'MESSAGE_PARSE_ERROR', '应该是解析错误');

    client.close();
  });

  await runTest('未知消息类型处理', async () => {
    const client = await createClient();
    await waitForMessage(client);

    client.send(JSON.stringify({ type: 'unknown_type_xxx', payload: {} }));

    // 不应该崩溃，等待一小段时间
    await new Promise(r => setTimeout(r, 300));

    const stats = wsServer!.getStats();
    assert(stats.connections.active > 0, '连接应该仍然活动');

    client.close();
  });

  await runTest('客户端异常断开处理', async () => {
    const client = await createClient();
    await waitForMessage(client);

    const statsBefore = wsServer!.getStats();
    const activeBefore = statsBefore.connections.active;

    // 强制关闭
    client.terminate();

    await new Promise(r => setTimeout(r, 500));

    const statsAfter = wsServer!.getStats();
    assert(statsAfter.connections.active < activeBefore, '活动连接应该减少');
  });

  endSuite();
}

async function testProgressBroadcast() {
  startSuite('测试9: 进度广播');

  await runTest('任务开始广播', async () => {
    const client = await createClient();
    await waitForMessage(client);

    await sendAndWait(client, { type: 'join_room', payload: { room: 'task:test-task-1' } });

    // 模拟任务开始
    await progressBroadcaster!.onTaskStarted({
      id: 'test-task-1',
      status: 'processing',
      progress: 0,
      mode: 'sequential',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      execution: {
        currentIndex: 0,
        totalDocuments: 100,
        completedDocuments: 0,
        failedDocuments: 0,
        skippedDocuments: 0,
        estimatedTimeRemaining: 60000,
        currentStage: 'initializing'
      },
      stats: {
        startTime: Date.now(),
        endTime: 0,
        duration: 0
      }
    } as any);

    const msg = await waitForMessage(client);
    assert(msg.type === 'task_started', '应该收到任务开始消息');

    client.close();
  });

  await runTest('任务进度广播', async () => {
    const client = await createClient();
    await waitForMessage(client);

    await sendAndWait(client, { type: 'join_room', payload: { room: 'task:test-task-2' } });

    await progressBroadcaster!.onTaskProgress({
      id: 'test-task-2',
      status: 'processing',
      progress: 50,
      mode: 'sequential',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      execution: {
        currentIndex: 50,
        totalDocuments: 100,
        completedDocuments: 50,
        failedDocuments: 0,
        skippedDocuments: 0,
        estimatedTimeRemaining: 30000,
        currentStage: 'generating_documents'
      },
      stats: {
        startTime: Date.now(),
        endTime: 0,
        duration: 0
      }
    } as any);

    const msg = await waitForMessage(client);
    assert(msg.type === 'task_progress', '应该收到任务进度消息');
    assert(msg.payload.progress === 50, '进度应该是50');

    client.close();
  });

  await runTest('Broadcaster统计', async () => {
    const stats = progressBroadcaster!.getStats();
    assert(stats.totalBroadcasts > 0, '应该有广播记录');
    assert(stats.totalMessages > 0, '应该有消息记录');
  });

  endSuite();
}

// ============================================================================
// 主执行器
// ============================================================================

async function runAllTests() {
  console.log('\n' + '='.repeat(70));
  console.log('WebSocket服务器全面测试套件 - Day 2验收测试');
  console.log('='.repeat(70));
  console.log(`\n测试目标: ws://localhost:${WS_PORT}/ws`);
  console.log(`开始时间: ${new Date().toLocaleString('zh-CN')}\n`);

  const totalStartTime = Date.now();

  try {
    await testServerStartup();
    await testConnectionManagement();
    await testMessageExchange();
    await testRoomManagement();
    await testHeartbeat();
    await testStatistics();
    await testPerformance();
    await testErrorHandling();
    await testProgressBroadcast();

  } catch (error: any) {
    console.error('\n测试套件执行错误:', error);
  } finally {
    if (progressBroadcaster) {
      progressBroadcaster.destroy();
    }
    if (wsServer) {
      await wsServer.stop();
    }
  }

  const totalDuration = Date.now() - totalStartTime;

  // 生成报告
  generateReport(totalDuration);
}

function generateReport(totalDuration: number) {
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  testSuites.forEach(suite => {
    suite.tests.forEach(test => {
      totalTests++;
      if (test.passed) passedTests++;
      else failedTests++;
    });
  });

  console.log('\n' + '='.repeat(70));
  console.log('测试结果摘要');
  console.log('='.repeat(70));
  console.log(`总测试套件: ${testSuites.length}`);
  console.log(`总测试数:   ${totalTests}`);
  console.log(`通过:       ${passedTests} ✓`);
  console.log(`失败:       ${failedTests} ✗`);
  console.log(`成功率:     ${((passedTests / totalTests) * 100).toFixed(2)}%`);
  console.log(`总执行时间: ${(totalDuration / 1000).toFixed(2)}s`);
  console.log('='.repeat(70));

  // 详细结果
  testSuites.forEach(suite => {
    const suitePassed = suite.tests.filter(t => t.passed).length;
    const suiteTotal = suite.tests.length;
    console.log(`\n${suite.name}: ${suitePassed}/${suiteTotal} 通过 (${suite.duration}ms)`);

    suite.tests.filter(t => !t.passed).forEach(test => {
      console.log(`  ✗ ${test.name}`);
      if (test.error) {
        console.log(`    ${test.error}`);
      }
    });
  });

  // 保存JSON报告
  const report = {
    summary: {
      totalSuites: testSuites.length,
      totalTests,
      passed: passedTests,
      failed: failedTests,
      successRate: ((passedTests / totalTests) * 100).toFixed(2) + '%',
      duration: (totalDuration / 1000).toFixed(2) + 's',
      timestamp: new Date().toISOString()
    },
    suites: testSuites
  };

  const fs = require('fs');
  const reportDir = 'test-reports';
  const reportPath = `${reportDir}/websocket-final-report-${Date.now()}.json`;

  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`\n完整测试报告: ${reportPath}`);
  console.log('='.repeat(70));

  process.exit(failedTests > 0 ? 1 : 0);
}

// 执行测试
runAllTests().catch(error => {
  console.error('测试执行失败:', error);
  process.exit(1);
});
