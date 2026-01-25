/**
 * WebSocket服务器诊断工具
 */

import { WebSocketServer } from 'ws';

const WS_PORT = 3001;

console.log(`正在启动WebSocket服务器在端口 ${WS_PORT}...`);

const wss = new WebSocketServer({ port: WS_PORT, path: '/ws' });

wss.on('listening', () => {
  console.log(`✅ WebSocket服务器正在监听端口 ${WS_PORT}`);
  console.log(`   端点: ws://localhost:${WS_PORT}/ws`);
});

wss.on('connection', (ws, req) => {
  console.log(`✅ 新连接来自: ${req.socket.remoteAddress}`);

  ws.on('message', (data) => {
    console.log(`📨 收到消息: ${data.toString()}`);
    ws.send(JSON.stringify({ type: 'pong', data: data.toString() }));
  });

  ws.on('close', () => {
    console.log('❌ 连接关闭');
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket错误:', error);
  });

  // 发送欢迎消息
  ws.send(JSON.stringify({
    type: 'connected',
    payload: {
      clientId: 'test-client-' + Date.now(),
      serverTime: Date.now()
    },
    timestamp: Date.now()
  }));
});

wss.on('error', (error) => {
  console.error('❌ 服务器错误:', error);
});

console.log('服务器启动中...');
