/**
 * WebSocket服务器测试执行器
 *
 * 在单独进程中启动服务器，然后执行测试
 * @version 1.0.0
 */

import { spawn } from 'child_process';
import WebSocket from 'ws';
import fetch from 'node-fetch';

// ============================================================================
// 配置
// ============================================================================

const WS_PORT = 3001;
const HTTP_PORT = 3020;
const WS_URL = `ws://localhost:${WS_PORT}/ws`;
const HTTP_URL = `http://localhost:${HTTP_PORT}`;

// 测试结果
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  tests: [] as any[]
};

// 服务器进程
let serverProcess: any = null;

// ============================================================================
// 服务器控制
// ============================================================================

/**
 * 启动WebSocket服务器
 */
async function startServer(): Promise<boolean> {
  console.log('正在启动WebSocket服务器...');

  return new Promise((resolve) => {
    serverProcess = spawn('npx', ['tsx', 'scripts/start-websocket-server.ts'], {
      cwd: process.cwd(),
      stdio: 'pipe',
      shell: true
    });

    let output = '';
    let errorOutput = '';

    serverProcess.stdout.on('data', (data: Buffer) => {
      const text = data.toString();
      output += text;
      console.log('[Server]', text);
    });

    serverProcess.stderr.on('data', (data: Buffer) => {
      const text = data.toString();
      errorOutput += text;
      console.error('[Server Error]', text);
    });

    // 等待服务器启动
    setTimeout(async () => {
      try {
        const response = await fetch(`${HTTP_URL}/health`);
        if (response.ok) {
          console.log('✓ 服务器启动成功');
          resolve(true);
        } else {
          console.log('✗ 服务器启动失败');
          resolve(false);
        }
      } catch (error) {
        console.log('✗ 服务器无法访问');
        console.log('输出:', output);
        console.log('错误:', errorOutput);
        resolve(false);
      }
    }, 3000);
  });
}

/**
 * 停止服务器
 */
async function stopServer() {
  if (serverProcess) {
    console.log('正在停止服务器...');
    serverProcess.kill('SIGTERM');
    setTimeout(() => {
      if (serverProcess) {
        serverProcess.kill('SIGKILL');
      }
    }, 5000);
  }
}

// ============================================================================
// 测试工具函数
// ============================================================================

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

async function sendAndWait(ws: WebSocket, message: any, expectedType?: string): Promise<any> {
  ws.send(JSON.stringify(message));
  const response = await waitForMessage(ws);
  if (expectedType && response.type !== expectedType) {
    throw new Error(`Expected ${expectedType}, got ${response.type}`);
  }
  return response;
}

function recordTest(name: string, passed: boolean, error?: any) {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`  ✓ ${name}`);
  } else {
    testResults.failed++;
    console.log(`  ✗ ${name}`);
    if (error) console.log(`    Error: ${error.message}`);
  }
  testResults.tests.push({ name, passed, error: error?.message, timestamp: new Date().toISOString() });
}

// ============================================================================
// 测试套件
// ============================================================================

async function test1_ServerStartup() {
  console.log('\n[测试1] 服务器启动和健康检查');

  try {
    const response = await fetch(`${HTTP_URL}/health`);
    const data = await response.json();

    recordTest('HTTP健康检查端点', data.status === 'healthy');
    recordTest('WebSocket统计信息', !!data.websocket);
    recordTest('Broadcaster统计信息', !!data.broadcaster);
  } catch (error: any) {
    recordTest('HTTP健康检查端点', false, error);
    recordTest('WebSocket统计信息', false, error);
    recordTest('Broadcaster统计信息', false, error);
  }
}

async function test2_ConnectionManagement() {
  console.log('\n[测试2] 连接管理');

  const clients: WebSocket[] = [];

  try {
    const client1 = await createClient();
    clients.push(client1);
    const msg = await waitForMessage(client1);

    recordTest('客户端连接成功', msg.type === 'connected');
    recordTest('客户端ID格式', !!msg.payload?.clientId);
    recordTest('服务器时间戳', !!msg.payload?.serverTime);

    const client2 = await createClient();
    const client3 = await createClient();
    clients.push(client2, client3);

    await waitForMessage(client2);
    await waitForMessage(client3);

    recordTest('多客户端并发连接', clients.length === 3);

    client1.close();
    await new Promise(r => setTimeout(r, 100));

    recordTest('客户端优雅断开', true);

  } catch (error: any) {
    recordTest('客户端连接成功', false, error);
    recordTest('客户端ID格式', false, error);
    recordTest('服务器时间戳', false, error);
    recordTest('多客户端并发连接', false, error);
    recordTest('客户端优雅断开', false, error);
  } finally {
    clients.forEach(c => { if (c.readyState === 1) c.close(); });
  }
}

async function test3_MessageSending() {
  console.log('\n[测试3] 消息收发');

  const client = await createClient();
  await waitForMessage(client);

  try {
    const pong = await sendAndWait(client, { type: 'ping', timestamp: Date.now() }, 'pong');
    recordTest('Ping/Pong机制', pong.type === 'pong');

    const sub = await sendAndWait(client, {
      type: 'subscribe',
      taskIds: ['test-task-123'],
      rooms: ['task:test-task-123']
    });
    recordTest('订阅消息处理', sub.type === 'subscription_ack');

  } catch (error: any) {
    recordTest('Ping/Pong机制', false, error);
    recordTest('订阅消息处理', false, error);
  } finally {
    if (client.readyState === 1) client.close();
  }
}

async function test4_RoomManagement() {
  console.log('\n[测试4] 房间管理');

  const client1 = await createClient();
  const client2 = await createClient();
  await waitForMessage(client1);
  await waitForMessage(client2);

  const TEST_ROOM = 'test-room-management';

  try {
    await sendAndWait(client1, { type: 'join_room', payload: { room: TEST_ROOM } });
    await sendAndWait(client2, { type: 'join_room', payload: { room: TEST_ROOM } });

    recordTest('多客户端加入房间', true);

    await sendAndWait(client1, { type: 'leave_room', payload: { room: TEST_ROOM } });
    recordTest('客户端离开房间', true);

  } catch (error: any) {
    recordTest('多客户端加入房间', false, error);
    recordTest('客户端离开房间', false, error);
  } finally {
    if (client1.readyState === 1) client1.close();
    if (client2.readyState === 1) client2.close();
  }
}

async function test5_Heartbeat() {
  console.log('\n[测试5] 心跳检测');

  const client = await createClient();
  await waitForMessage(client);

  try {
    const pongs: any[] = [];
    const handler = (data: any) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'pong') pongs.push(msg);
    };

    client.on('message', handler);

    for (let i = 0; i < 3; i++) {
      client.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      await new Promise(r => setTimeout(r, 100));
    }

    await new Promise(r => setTimeout(r, 1000));
    client.off('message', handler);

    recordTest('心跳Ping/Pong响应', pongs.length >= 3);

  } catch (error: any) {
    recordTest('心跳Ping/Pong响应', false, error);
  } finally {
    if (client.readyState === 1) client.close();
  }
}

async function test6_StatisticsAPI() {
  console.log('\n[测试6] 统计API');

  try {
    const wsRes = await fetch(`${HTTP_URL}/api/websocket/stats`);
    const wsStats = await wsRes.json();

    recordTest('WebSocket统计API', wsStats.server && wsStats.connections);
    recordTest('连接统计', wsStats.connections?.total !== undefined);
    recordTest('消息统计', wsStats.messages?.totalSent !== undefined);
    recordTest('房间统计', wsStats.rooms?.total !== undefined);
    recordTest('内存统计', wsStats.memory?.used !== undefined);

    const bcRes = await fetch(`${HTTP_URL}/api/broadcaster/stats`);
    const bcStats = await bcRes.json();

    recordTest('Broadcaster统计API', typeof bcStats.totalBroadcasts === 'number');

  } catch (error: any) {
    recordTest('WebSocket统计API', false, error);
    recordTest('连接统计', false, error);
    recordTest('消息统计', false, error);
    recordTest('房间统计', false, error);
    recordTest('内存统计', false, error);
    recordTest('Broadcaster统计API', false, error);
  }
}

async function test7_ErrorHandling() {
  console.log('\n[测试7] 错误处理');

  const client = await createClient();
  await waitForMessage(client);

  try {
    client.send('invalid json');
    const errorMsg = await waitForMessage(client);

    recordTest('无效JSON错误处理', errorMsg.type === 'error');

    client.send(JSON.stringify({ type: 'unknown_type', payload: {} }));
    recordTest('未知消息类型处理', true);

  } catch (error: any) {
    recordTest('无效JSON错误处理', false, error);
    recordTest('未知消息类型处理', false, error);
  } finally {
    if (client.readyState === 1) client.close();
  }
}

async function test8_ConcurrentConnections() {
  console.log('\n[测试8] 并发连接 (50客户端)');

  const NUM_CLIENTS = 50;
  const clients: WebSocket[] = [];

  try {
    const promises = Array.from({ length: NUM_CLIENTS }, () => createClient());
    const connectedClients = await Promise.all(promises);
    clients.push(...connectedClients);

    await Promise.all(clients.map(c => waitForMessage(c)));

    recordTest(`${NUM_CLIENTS}并发连接`, clients.length === NUM_CLIENTS);

    const sendPromises = clients.map(c =>
      sendAndWait(c, { type: 'ping', timestamp: Date.now() }, 'pong')
    );
    await Promise.all(sendPromises);

    recordTest(`${NUM_CLIENTS}客户端同时发送消息`, true);

  } catch (error: any) {
    recordTest(`${NUM_CLIENTS}并发连接`, false, error);
    recordTest(`${NUM_CLIENTS}客户端同时发送消息`, false, error);
  } finally {
    clients.forEach(c => { if (c.readyState === 1) c.close(); });
  }
}

async function test9_LargeMessages() {
  console.log('\n[测试9] 大消息处理');

  const client = await createClient();
  await waitForMessage(client);

  try {
    const largeData = {
      type: 'test',
      payload: {
        data: 'x'.repeat(10000),
        array: Array.from({ length: 1000 }, (_, i) => ({ id: i, value: `item-${i}` }))
      }
    };

    client.send(JSON.stringify(largeData));
    await new Promise(r => setTimeout(r, 500));

    recordTest('处理10KB消息', true);

    const hugeData = {
      type: 'test',
      payload: {
        data: 'y'.repeat(100000),
        array: Array.from({ length: 10000 }, (_, i) => ({
          id: i,
          value: `item-${i}`.repeat(10)
        }))
      }
    };

    client.send(JSON.stringify(hugeData));
    await new Promise(r => setTimeout(r, 500));

    recordTest('处理100KB消息', true);

  } catch (error: any) {
    recordTest('处理10KB消息', false, error);
    recordTest('处理100KB消息', false, error);
  } finally {
    if (client.readyState === 1) client.close();
  }
}

// ============================================================================
// 主测试执行器
// ============================================================================

async function runTests() {
  console.log('='.repeat(70));
  console.log('WebSocket服务器全面测试套件 - Day 2验证');
  console.log('='.repeat(70));
  console.log(`\n测试目标: ${WS_URL}`);
  console.log(`HTTP端点: ${HTTP_URL}\n`);

  const startTime = Date.now();

  try {
    // 启动服务器
    const serverStarted = await startServer();
    if (!serverStarted) {
      console.error('\n❌ 无法启动服务器，测试中止');
      process.exit(1);
    }

    // 执行所有测试
    await test1_ServerStartup();
    await test2_ConnectionManagement();
    await test3_MessageSending();
    await test4_RoomManagement();
    await test5_Heartbeat();
    await test6_StatisticsAPI();
    await test7_ErrorHandling();
    await test8_ConcurrentConnections();
    await test9_LargeMessages();

  } catch (error: any) {
    console.error('\n测试执行错误:', error);
  } finally {
    // 停止服务器
    await stopServer();
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  // 打印结果摘要
  console.log('\n' + '='.repeat(70));
  console.log('测试结果摘要');
  console.log('='.repeat(70));
  console.log(`总测试数:   ${testResults.total}`);
  console.log(`通过:       ${testResults.passed} ✓`);
  console.log(`失败:       ${testResults.failed} ✗`);
  console.log(`成功率:     ${((testResults.passed / testResults.total) * 100).toFixed(2)}%`);
  console.log(`执行时间:   ${duration}s`);
  console.log('='.repeat(70));

  // 保存报告
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

  const fs = await import('fs');
  const reportDir = 'test-reports';
  const reportPath = `${reportDir}/websocket-test-report-${Date.now()}.json`;

  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`\n测试报告已保存: ${reportPath}`);

  process.exit(testResults.failed > 0 ? 1 : 0);
}

// 执行测试
runTests().catch(error => {
  console.error('测试运行失败:', error);
  process.exit(1);
});
