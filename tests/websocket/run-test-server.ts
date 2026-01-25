/**
 * 运行测试WebSocket服务器
 */

import { WebSocketServer } from '../../server/websocket/websocketServer';

async function main() {
  console.log('正在启动WebSocket服务器...');

  const server = new WebSocketServer(3001);
  await server.start();

  console.log('✅ 服务器已启动在端口 3001');
  console.log('按 Ctrl+C 停止服务器');

  // 保持运行
  process.on('SIGINT', async () => {
    console.log('\n正在关闭服务器...');
    await server.stop();
    console.log('服务器已关闭');
    process.exit(0);
  });

  // 防止进程退出
  await new Promise(() => {});
}

main().catch(error => {
  console.error('启动失败:', error);
  process.exit(1);
});
