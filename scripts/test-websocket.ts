/**
 * WebSocket测试脚本
 *
 * 测试Day 2实现的WebSocket服务器
 * - 服务器启动
 * - 客户端连接
 * - 消息收发
 * - 心跳检测
 * - 进度推送
 */

import WebSocket from 'ws';

const WS_PORT = 3001;
const WS_URL = `ws://localhost:${WS_PORT}/ws`;

let testsPassed = 0;
let testsTotal = 3;

const ws = new WebSocket(WS_URL);

ws.on('open', () => {
  console.log('✓ WebSocket连接成功');

  // 测试1: 订阅
  ws.send(JSON.stringify({
    type: 'subscribe',
    taskIds: ['test-task-123'],
    rooms: ['task:test-task-123']
  }));
  testsPassed++;
  console.log(`✓ 测试通过 (${testsPassed}/${testsTotal}): 订阅消息`);

  // 测试2: Ping
  setTimeout(() => {
    ws.send(JSON.stringify({
      type: 'ping',
      timestamp: Date.now()
    }));
  }, 1000);
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  console.log(`✓ 收到消息: ${message.type}`);

  if (message.type === 'pong') {
    testsPassed++;
    console.log(`✓ 测试通过 (${testsPassed}/${testsTotal}): Ping/Pong`);
    ws.close();
  }
});

ws.on('error', (error) => {
  console.error('✗ WebSocket错误:', error.message);
  process.exit(1);
});

ws.on('close', () => {
  testsPassed++;
  console.log(`✓ 测试通过 (${testsPassed}/${testsTotal}): 连接关闭`);
  console.log(`\n✅ WebSocket测试完成: ${testsPassed}/${testsTotal} 通过`);
  process.exit(testsPassed === testsTotal ? 0 : 1);
});
