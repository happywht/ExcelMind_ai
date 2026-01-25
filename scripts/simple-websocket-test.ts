/**
 * 简化的WebSocket测试
 */

import { WebSocketServer } from '../server/websocket/websocketServer';
import WebSocket from 'ws';

const WS_PORT = 3001;
const WS_URL = `ws://localhost:${WS_PORT}/ws`;

async function test() {
  console.log('启动WebSocket服务器...');

  const server = new WebSocketServer(WS_PORT);

  // 监听服务器事件
  server.on('connection:opened', (data) => {
    console.log('[Server] 连接打开事件:', data);
  });

  server.on('connection:closed', (data) => {
    console.log('[Server] 连接关闭事件:', data);
  });

  server.on('message', (clientId, payload) => {
    console.log('[Server] 收到消息:', clientId, payload);
  });

  await server.start();
  console.log('服务器已启动');

  // 等待服务器完全启动
  await new Promise(r => setTimeout(r, 1000));

  console.log('\n创建客户端连接...');

  const ws = new WebSocket(WS_URL);

  ws.on('open', () => {
    console.log('[Client] 连接已打开');
  });

  ws.on('message', (data) => {
    console.log('[Client] 收到消息:', data.toString());
  });

  ws.on('error', (error) => {
    console.error('[Client] 错误:', error);
  });

  ws.on('close', (code, reason) => {
    console.log('[Client] 连接关闭:', code, reason.toString());
  });

  // 等待连接消息
  await new Promise(r => setTimeout(r, 2000));

  console.log('\n发送ping消息...');
  ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));

  // 等待pong
  await new Promise(r => setTimeout(r, 2000));

  console.log('\n获取服务器统计...');
  const stats = server.getStats();
  console.log('统计:', JSON.stringify(stats, null, 2));

  console.log('\n关闭连接和服务器...');
  ws.close();

  await new Promise(r => setTimeout(r, 1000));

  await server.stop();
  console.log('服务器已停止');

  process.exit(0);
}

test().catch(error => {
  console.error('测试失败:', error);
  process.exit(1);
});
