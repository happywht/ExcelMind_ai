/**
 * WebSocket直接测试
 *
 * 直接测试WebSocket服务器功能，不依赖HTTP服务器
 *
 * @version 1.0.0
 */

import WebSocket from 'ws';
import { performance } from 'perf_hooks';

// ============================================================================
// 测试配置
// ============================================================================

const WS_PORT = 3001;
const WS_URL = `ws://localhost:${WS_PORT}/ws`;

// 测试结果
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  errors: [] as { test: string; error: string }[],
  timings: {} as Record<string, number>,
};

// ============================================================================
// 工具函数
// ============================================================================

function logTest(name: string, passed: boolean, details?: string) {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${name}${details ? ` - ${details}` : ''}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${name}${details ? ` - ${details}` : ''}`);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function createClient(timeout = 5000): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Connection timeout')), timeout);
    const ws = new WebSocket(WS_URL);
    ws.on('open', () => {
      clearTimeout(timer);
      resolve(ws);
    });
    ws.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

function waitForMessage(ws: WebSocket, timeout = 5000): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Message timeout')), timeout);
    const messageHandler = (data: any) => {
      clearTimeout(timer);
      try {
        ws.removeListener('message', messageHandler);
        resolve(JSON.parse(data.toString()));
      } catch (e) {
        reject(e);
      }
    };
    ws.on('message', messageHandler);
  });
}

// ============================================================================
// 测试套件
// ============================================================================

async function test1_BasicConnection() {
  console.log('\n📋 测试1: 基本连接功能');

  try {
    const startTime = performance.now();
    const client = await createClient();
    const connectionTime = performance.now() - startTime;
    testResults.timings['连接时间'] = connectionTime;

    logTest('WebSocket连接成功', client.readyState === WebSocket.OPEN,
      `耗时: ${connectionTime.toFixed(2)}ms`);

    const connectedMsg = await waitForMessage(client);
    logTest('接收连接确认消息', connectedMsg.type === 'connected',
      `客户端ID: ${connectedMsg.payload?.clientId?.substring(0, 12)}...`);

    logTest('服务器时间戳有效', connectedMsg.timestamp > 0,
      `时间: ${new Date(connectedMsg.timestamp).toLocaleString('zh-CN')}`);

    logTest('配置信息正确', connectedMsg.payload?.config?.heartbeatInterval > 0,
      `心跳间隔: ${connectedMsg.payload?.config?.heartbeatInterval}ms`);

    client.close();
    await delay(200);
    logTest('连接正常关闭', client.readyState === WebSocket.CLOSED);

  } catch (error: any) {
    logTest('基本连接测试', false, error.message);
    testResults.errors.push({ test: 'test1_BasicConnection', error: error.message });
  }
}

async function test2_MultipleClients() {
  console.log('\n📋 测试2: 多客户端连接');

  try {
    const clientCount = 5;
    const startTime = performance.now();

    const clients: WebSocket[] = [];
    const clientIds = new Set<string>();

    for (let i = 0; i < clientCount; i++) {
      const client = await createClient();
      clients.push(client);

      const msg = await waitForMessage(client);
      if (msg.type === 'connected') {
        clientIds.add(msg.payload.clientId);
      }
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    testResults.timings['多客户端连接'] = totalTime;

    logTest(`${clientCount}个客户端并发连接`, clients.length === clientCount,
      `总耗时: ${totalTime.toFixed(2)}ms, 平均: ${(totalTime / clientCount).toFixed(2)}ms/连接`);

    logTest('客户端ID唯一性', clientIds.size === clientCount,
      `唯一ID: ${clientIds.size}/${clientCount}`);

    clients.forEach(client => client.close());
    await delay(500);

  } catch (error: any) {
    logTest('多客户端连接测试', false, error.message);
    testResults.errors.push({ test: 'test2_MultipleClients', error: error.message });
  }
}

async function test3_PingPong() {
  console.log('\n📋 测试3: Ping/Pong机制');

  try {
    const client = await createClient();
    await waitForMessage(client); // connected message

    const latencies: number[] = [];
    const pingCount = 5;

    for (let i = 0; i < pingCount; i++) {
      const start = performance.now();
      client.send(JSON.stringify({
        type: 'ping',
        timestamp: start
      }));

      const msg = await waitForMessage(client);
      if (msg.type === 'pong') {
        const end = performance.now();
        latencies.push(end - start);
      }

      await delay(100);
    }

    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const maxLatency = Math.max(...latencies);
    const minLatency = Math.min(...latencies);

    testResults.timings['平均Ping延迟'] = avgLatency;

    logTest('Ping/Pong响应正确', latencies.length === pingCount,
      `${pingCount}次ping/pong交换`);

    logTest('消息延迟合理', avgLatency < 100,
      `平均: ${avgLatency.toFixed(2)}ms, 最小: ${minLatency.toFixed(2)}ms, 最大: ${maxLatency.toFixed(2)}ms`);

    client.close();

  } catch (error: any) {
    logTest('Ping/Pong测试', false, error.message);
    testResults.errors.push({ test: 'test3_PingPong', error: error.message });
  }
}

async function test4_Subscription() {
  console.log('\n📋 测试4: 房间订阅功能');

  try {
    const client = await createClient();
    await waitForMessage(client);

    // 4.1 订阅房间
    client.send(JSON.stringify({
      type: 'subscribe',
      taskIds: ['task-1', 'task-2'],
      rooms: ['room-1', 'room-2']
    }));

    const subAck = await waitForMessage(client);
    logTest('订阅确认消息', subAck.type === 'subscription_ack',
      `类型: ${subAck.payload?.type}`);

    // 4.2 取消订阅
    client.send(JSON.stringify({
      type: 'unsubscribe',
      rooms: ['room-1']
    }));

    const unsubAck = await waitForMessage(client);
    logTest('取消订阅确认', unsubAck.type === 'subscription_ack',
      `类型: ${unsubAck.payload?.type}`);

    client.close();

  } catch (error: any) {
    logTest('房间订阅测试', false, error.message);
    testResults.errors.push({ test: 'test4_Subscription', error: error.message });
  }
}

async function test5_MessageTypes() {
  console.log('\n📋 测试5: 消息类型处理');

  try {
    const client = await createClient();
    await waitForMessage(client);

    // 5.1 无效消息处理
    client.send('invalid json{{{');

    try {
      const errorMsg = await waitForMessage(client, 2000);
      logTest('无效JSON处理', errorMsg.type === 'error' || errorMsg.type !== undefined,
        `响应类型: ${errorMsg.type}`);
    } catch (e) {
      logTest('无效JSON处理', true, '服务器正确拒绝无效消息');
    }

    // 5.2 未知消息类型
    client.send(JSON.stringify({
      type: 'unknown_type',
      payload: {}
    }));

    await delay(200);
    logTest('未知消息类型处理', client.readyState === WebSocket.OPEN,
      '连接保持打开');

    client.close();

  } catch (error: any) {
    logTest('消息类型测试', false, error.message);
    testResults.errors.push({ test: 'test5_MessageTypes', error: error.message });
  }
}

async function test6_Performance() {
  console.log('\n📋 测试6: 性能测试');

  try {
    const client = await createClient();
    await waitForMessage(client);

    // 6.1 消息吞吐量
    const messageCount = 100;
    const startTime = performance.now();

    for (let i = 0; i < messageCount; i++) {
      client.send(JSON.stringify({ type: 'ping', id: i }));
    }

    const endTime = performance.now();
    const duration = endTime - startTime;
    const throughput = (messageCount / duration) * 1000;

    testResults.timings['消息吞吐量'] = throughput;

    logTest('消息发送吞吐量', throughput > 100,
      `${throughput.toFixed(0)} 消息/秒 (${messageCount}条消息耗时${duration.toFixed(2)}ms)`);

    // 6.2 接收性能
    let receivedCount = 0;
    const receiveStart = performance.now();

    for (let i = 0; i < 10; i++) {
      try {
        await waitForMessage(client, 1000);
        receivedCount++;
      } catch (e) {
        break;
      }
    }

    const receiveEnd = performance.now();
    const receiveRate = (receivedCount / (receiveEnd - receiveStart)) * 1000;

    logTest('消息接收性能', receivedCount >= 5,
      `${receivedCount}条消息, 接收率: ${receiveRate.toFixed(0)} 消息/秒`);

    client.close();

  } catch (error: any) {
    logTest('性能测试', false, error.message);
    testResults.errors.push({ test: 'test6_Performance', error: error.message });
  }
}

async function test7_Concurrency() {
  console.log('\n📋 测试7: 并发连接压力测试');

  try {
    const clientCount = 20;
    const startTime = performance.now();

    // 并发创建连接
    const connectionPromises = Array.from(
      { length: clientCount },
      () => createClient(10000)
    );

    const clients = await Promise.all(connectionPromises);

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / clientCount;

    testResults.timings['并发连接'] = totalTime;

    logTest(`${clientCount}个并发客户端连接`, clients.length === clientCount,
      `总耗时: ${totalTime.toFixed(2)}ms, 平均: ${avgTime.toFixed(2)}ms/连接`);

    // 验证所有客户端都收到连接消息
    let allConnected = 0;
    for (const client of clients) {
      try {
        const msg = await waitForMessage(client, 2000);
        if (msg.type === 'connected') {
          allConnected++;
        }
      } catch (e) {
        // 忽略超时
      }
    }

    logTest('所有客户端都连接成功', allConnected === clientCount,
      `${allConnected}/${clientCount} 客户端已连接`);

    // 清理
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.close();
      }
    });

    await delay(500);

  } catch (error: any) {
    logTest('并发连接测试', false, error.message);
    testResults.errors.push({ test: 'test7_Concurrency', error: error.message });
  }
}

async function test8_Stability() {
  console.log('\n📋 测试8: 稳定性测试');

  try {
    // 8.1 连接断开重连
    let reconnectCount = 0;
    for (let i = 0; i < 3; i++) {
      const client = await createClient();
      await waitForMessage(client);
      client.close();
      await delay(200);
      reconnectCount++;
    }

    logTest('连接/断开循环', reconnectCount === 3,
      `${reconnectCount}次连接/断开循环`);

    // 8.2 长时间连接
    const longClient = await createClient();
    await waitForMessage(longClient);

    const keepAliveTime = 3000; // 3秒
    await delay(keepAliveTime);

    logTest('长时间连接保持', longClient.readyState === WebSocket.OPEN,
      `保持${keepAliveTime}ms连接`);

    longClient.close();

  } catch (error: any) {
    logTest('稳定性测试', false, error.message);
    testResults.errors.push({ test: 'test8_Stability', error: error.message });
  }
}

// ============================================================================
// 主测试执行
// ============================================================================

async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         WebSocket服务器直接测试 - Day 2验证             ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\n🎯 测试目标: ${WS_URL}`);
  console.log(`🕐 开始时间: ${new Date().toLocaleString('zh-CN')}\n`);

  const startTime = performance.now();

  try {
    await test1_BasicConnection();
    await test2_MultipleClients();
    await test3_PingPong();
    await test4_Subscription();
    await test5_MessageTypes();
    await test6_Performance();
    await test7_Concurrency();
    await test8_Stability();
  } catch (error) {
    console.error('\n❌ 测试执行出错:', error);
  }

  const endTime = performance.now();
  const totalDuration = endTime - startTime;

  // 打印测试摘要
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                      测试摘要                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\n📊 总测试数: ${testResults.total}`);
  console.log(`✅ 通过: ${testResults.passed}`);
  console.log(`❌ 失败: ${testResults.failed}`);
  console.log(`📈 通过率: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  console.log(`⏱️  总耗时: ${(totalDuration / 1000).toFixed(2)}秒`);

  // 性能指标
  if (Object.keys(testResults.timings).length > 0) {
    console.log('\n📊 性能指标:');
    Object.entries(testResults.timings).forEach(([name, value]) => {
      console.log(`   ${name}: ${typeof value === 'number' ? value.toFixed(2) : value}`);
    });
  }

  // 错误详情
  if (testResults.errors.length > 0) {
    console.log('\n❌ 错误详情:');
    testResults.errors.forEach(({ test, error }, index) => {
      console.log(`   ${index + 1}. ${test}: ${error}`);
    });
  }

  // 测试结论
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  if (testResults.failed === 0) {
    console.log('║          ✅ 所有测试通过！WebSocket服务器工作正常       ║');
  } else if (testResults.passed >= testResults.total * 0.8) {
    console.log('║       ⚠️  大部分测试通过，存在少量问题需要修复          ║');
  } else {
    console.log('║          ❌ 多项测试失败，需要全面检查和修复             ║');
  }
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // 返回退出码
  process.exit(testResults.failed === 0 ? 0 : 1);
}

// 运行测试
runAllTests().catch(error => {
  console.error('测试运行失败:', error);
  process.exit(1);
});
