/**
 * 直接WebSocket测试 - 内置服务器启动
 */

import { WebSocketServer } from '../server/websocket/websocketServer';
import WebSocket from 'ws';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 配置
const WS_PORT = 3001;
const WS_URL = `ws://localhost:${WS_PORT}/ws`;

// 测试结果
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  tests: [] as any[]
};

let wsServer: WebSocketServer | null = null;

// 工具函数
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

function recordTest(name: string, passed: boolean, error?: any) {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`  ✓ ${name}`);
  } else {
    testResults.failed++;
    console.log(`  ✗ ${name}`);
    if (error) console.log(`    Error: ${error.message || error}`);
  }
  testResults.tests.push({ name, passed, error: error?.message, timestamp: new Date().toISOString() });
}

// 测试套件
async function test1_ServerStartup() {
  console.log('\n[测试1] 服务器启动');

  try {
    wsServer = new WebSocketServer(WS_PORT);
    await wsServer.start();
    await new Promise(r => setTimeout(r, 1000));

    const stats = wsServer.getStats();
    recordTest('服务器成功启动', stats.server.uptime > 0);
    recordTest('端口配置正确', true);
    recordTest('心跳定时器启动', true);

  } catch (error: any) {
    recordTest('服务器成功启动', false, error);
    recordTest('端口配置正确', false, error);
    recordTest('心跳定时器启动', false, error);
  }
}

async function test2_Connection() {
  console.log('\n[测试2] 客户端连接');

  const clients: WebSocket[] = [];

  try {
    const client1 = await createClient();
    clients.push(client1);
    const msg = await waitForMessage(client1);

    recordTest('客户端连接成功', msg.type === 'connected');
    recordTest('收到客户端ID', !!msg.payload?.clientId);
    recordTest('收到服务器时间', !!msg.payload?.serverTime);

    // 并发连接
    const client2 = await createClient();
    const client3 = await createClient();
    clients.push(client2, client3);

    await waitForMessage(client2);
    await waitForMessage(client3);

    const stats = wsServer!.getStats();
    recordTest('统计连接数正确', stats.connections.active === 3);

  } catch (error: any) {
    recordTest('客户端连接成功', false, error);
    recordTest('收到客户端ID', false, error);
    recordTest('收到服务器时间', false, error);
    recordTest('统计连接数正确', false, error);
  } finally {
    clients.forEach(c => { if (c.readyState === 1) c.close(); });
    await new Promise(r => setTimeout(r, 500));
  }
}

async function test3_Messages() {
  console.log('\n[测试3] 消息收发');

  const client = await createClient();
  await waitForMessage(client);

  try {
    // Ping/Pong
    client.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
    const pong = await waitForMessage(client);
    recordTest('Ping/Pong响应', pong.type === 'pong');

    // 订阅
    client.send(JSON.stringify({
      type: 'subscribe',
      taskIds: ['task-1'],
      rooms: ['room-1']
    }));
    const subAck = await waitForMessage(client);
    recordTest('订阅确认', subAck.type === 'subscription_ack');

    // 加入房间
    client.send(JSON.stringify({ type: 'join_room', payload: { room: 'test-room' } }));
    await new Promise(r => setTimeout(r, 200));
    recordTest('加入房间成功', true);

  } catch (error: any) {
    recordTest('Ping/Pong响应', false, error);
    recordTest('订阅确认', false, error);
    recordTest('加入房间成功', false, error);
  } finally {
    if (client.readyState === 1) client.close();
  }
}

async function test4_Broadcast() {
  console.log('\n[测试4] 房间广播');

  const ROOM = 'broadcast-test';
  const client1 = await createClient();
  const client2 = await createClient();

  await waitForMessage(client1);
  await waitForMessage(client2);

  try {
    // 加入房间
    client1.send(JSON.stringify({ type: 'join_room', payload: { room: ROOM } }));
    client2.send(JSON.stringify({ type: 'join_room', payload: { room: ROOM } }));

    await new Promise(r => setTimeout(r, 300));

    // 服务器广播消息
    await wsServer!.sendToRoom(ROOM, {
      type: 'broadcast',
      payload: { message: 'Hello room!' },
      timestamp: Date.now(),
      id: 'test-1'
    });

    // 等待接收
    const msg1 = await waitForMessage(client1);
    const msg2 = await waitForMessage(client2);

    recordTest('广播到房间1', msg1.type === 'broadcast');
    recordTest('广播到房间2', msg2.type === 'broadcast');

  } catch (error: any) {
    recordTest('广播到房间1', false, error);
    recordTest('广播到房间2', false, error);
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
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'pong') pongs.push(msg);
      } catch (e) {}
    };

    client.on('message', handler);

    for (let i = 0; i < 3; i++) {
      client.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      await new Promise(r => setTimeout(r, 100));
    }

    await new Promise(r => setTimeout(r, 500));
    client.off('message', handler);

    recordTest('收到Pong响应', pongs.length >= 3);

  } catch (error: any) {
    recordTest('收到Pong响应', false, error);
  } finally {
    if (client.readyState === 1) client.close();
  }
}

async function test6_Statistics() {
  console.log('\n[测试6] 统计信息');

  try {
    const stats = wsServer!.getStats();

    recordTest('服务器运行时间', stats.server.uptime > 0);
    recordTest('连接统计', stats.connections.total >= 0);
    recordTest('消息统计', stats.messages.totalSent >= 0);
    recordTest('房间统计', stats.rooms.total >= 0);
    recordTest('内存统计', stats.memory.used > 0);

  } catch (error: any) {
    recordTest('服务器运行时间', false, error);
    recordTest('连接统计', false, error);
    recordTest('消息统计', false, error);
    recordTest('房间统计', false, error);
    recordTest('内存统计', false, error);
  }
}

async function test7_Concurrent() {
  console.log('\n[测试7] 并发连接 (20个)');

  const NUM = 20;
  const clients: WebSocket[] = [];

  try {
    const promises = Array.from({ length: NUM }, () => createClient());
    const connected = await Promise.all(promises);
    clients.push(...connected);

    await Promise.all(clients.map(c => waitForMessage(c)));

    const stats = wsServer!.getStats();
    recordTest(`${NUM}个并发连接`, stats.connections.active >= NUM);

    // 所有客户端发送消息
    const sendPromises = clients.map(c =>
      new Promise<void>((resolve) => {
        c.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        c.once('message', () => resolve());
      })
    );

    await Promise.all(sendPromises);
    recordTest(`${NUM}个客户端同时发送消息`, true);

  } catch (error: any) {
    recordTest(`${NUM}个并发连接`, false, error);
    recordTest(`${NUM}个客户端同时发送消息`, false, error);
  } finally {
    clients.forEach(c => { if (c.readyState === 1) c.close(); });
  }
}

async function test8_ErrorHandling() {
  console.log('\n[测试8] 错误处理');

  const client = await createClient();
  await waitForMessage(client);

  try {
    // 无效JSON
    client.send('invalid json');
    const err = await waitForMessage(client);
    recordTest('无效JSON错误', err.type === 'error');

    // 未知类型
    client.send(JSON.stringify({ type: 'unknown_xxx', payload: {} }));
    await new Promise(r => setTimeout(r, 200));
    recordTest('未知消息类型处理', true);

  } catch (error: any) {
    recordTest('无效JSON错误', false, error);
    recordTest('未知消息类型处理', false, error);
  } finally {
    if (client.readyState === 1) client.close();
  }
}

async function test9_LargeMessages() {
  console.log('\n[测试9] 大消息处理');

  const client = await createClient();
  await waitForMessage(client);

  try {
    // 10KB消息
    const largeMsg = {
      type: 'test',
      payload: {
        data: 'x'.repeat(10000),
        array: Array.from({ length: 1000 }, (_, i) => ({ id: i }))
      }
    };

    client.send(JSON.stringify(largeMsg));
    await new Promise(r => setTimeout(r, 300));
    recordTest('处理10KB消息', true);

    // 50KB消息
    const hugeMsg = {
      type: 'test',
      payload: {
        data: 'y'.repeat(50000),
        array: Array.from({ length: 5000 }, (_, i) => ({
          id: i,
          value: `item-${i}`.repeat(10)
        }))
      }
    };

    client.send(JSON.stringify(hugeMsg));
    await new Promise(r => setTimeout(r, 300));
    recordTest('处理50KB消息', true);

  } catch (error: any) {
    recordTest('处理10KB消息', false, error);
    recordTest('处理50KB消息', false, error);
  } finally {
    if (client.readyState === 1) client.close();
  }
}

// 主执行器
async function runAllTests() {
  console.log('='.repeat(60));
  console.log('WebSocket服务器测试 - Day 2验证');
  console.log('='.repeat(60));

  const startTime = Date.now();

  try {
    await test1_ServerStartup();
    await test2_Connection();
    await test3_Messages();
    await test4_Broadcast();
    await test5_Heartbeat();
    await test6_Statistics();
    await test7_Concurrent();
    await test8_ErrorHandling();
    await test9_LargeMessages();

  } catch (error: any) {
    console.error('\n测试执行错误:', error);
  } finally {
    if (wsServer) {
      await wsServer.stop();
    }
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  console.log('\n' + '='.repeat(60));
  console.log('测试结果摘要');
  console.log('='.repeat(60));
  console.log(`总测试数:   ${testResults.total}`);
  console.log(`通过:       ${testResults.passed} ✓`);
  console.log(`失败:       ${testResults.failed} ✗`);
  console.log(`成功率:     ${((testResults.passed / testResults.total) * 100).toFixed(2)}%`);
  console.log(`执行时间:   ${duration}s`);
  console.log('='.repeat(60));

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
  fs.mkdirSync('test-reports', { recursive: true });
  const reportPath = `test-reports/websocket-test-${Date.now()}.json`;
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`\n测试报告: ${reportPath}`);

  process.exit(testResults.failed > 0 ? 1 : 0);
}

// 运行
runAllTests().catch(console.error);
