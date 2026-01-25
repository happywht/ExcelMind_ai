/**
 * 测试修复后的WebSocket服务器
 */

import { WebSocketServer } from '../server/websocket/websocketServer';

async function test() {
  console.log('正在创建WebSocket服务器实例...');

  const server = new WebSocketServer(3001);

  console.log('✅ 服务器实例创建成功');
  console.log('正在启动服务器...');

  await server.start();

  console.log('✅ 服务器启动成功！');
  console.log('服务器将在5秒后关闭...');

  // 保持运行5秒
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('正在关闭服务器...');
  await server.stop();

  console.log('✅ 服务器已关闭');
  process.exit(0);
}

test().catch(error => {
  console.error('❌ 测试失败:', error);
  process.exit(1);
});
