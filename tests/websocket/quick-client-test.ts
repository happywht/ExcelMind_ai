/**
 * 快速WebSocket客户端测试
 */

import WebSocket from 'ws';

const WS_URL = 'ws://localhost:3001/ws';

console.log(`正在连接到 ${WS_URL}...`);

const ws = new WebSocket(WS_URL);

ws.on('open', () => {
  console.log('✅ 连接成功');

  // 发送测试消息
  ws.send(JSON.stringify({
    type: 'ping',
    message: 'Hello from test client'
  }));
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  console.log(`📨 收到消息:`, msg);

  if (msg.type === 'pong') {
    console.log('✅ Ping/Pong测试成功');
    ws.close();
  }
});

ws.on('close', () => {
  console.log('❌ 连接关闭');
  process.exit(0);
});

ws.on('error', (error) => {
  console.error('❌ 错误:', error.message);
  process.exit(1);
});

// 5秒超时
setTimeout(() => {
  console.log('⏱️  测试超时');
  ws.close();
  process.exit(1);
}, 5000);
