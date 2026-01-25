/**
 * WebSocket服务器启动脚本
 *
 * 快速启动WebSocket服务器用于开发和测试
 *
 * @version 1.0.0
 */

import { getAppServer } from '../server/index';

// ============================================================================
// 配置
// ============================================================================

const HTTP_PORT = parseInt(process.env.HTTP_PORT || '3020', 10); // 默认3020端口避免与Vite冲突
const WS_PORT = parseInt(process.env.WEBSOCKET_PORT || '3001', 10);

// ============================================================================
// 启动函数
// ============================================================================

/**
 * 启动WebSocket服务器
 */
async function startWebSocketServer() {
  console.log('='.repeat(60));
  console.log('ExcelMind AI - WebSocket服务器');
  console.log('='.repeat(60));
  console.log('');

  try {
    // 获取服务器实例
    const server = getAppServer();

    // 启动服务器
    await server.start(HTTP_PORT, WS_PORT);

    console.log('');
    console.log('服务器已成功启动！');
    console.log('');
    console.log('服务端点：');
    console.log(`  - HTTP:    http://localhost:${HTTP_PORT}`);
    console.log(`  - WebSocket: ws://localhost:${WS_PORT}/ws`);
    console.log('');
    console.log('API端点：');
    console.log(`  - Health Check:   http://localhost:${HTTP_PORT}/health`);
    console.log(`  - WS Stats:       http://localhost:${HTTP_PORT}/api/websocket/stats`);
    console.log(`  - Broadcaster:    http://localhost:${HTTP_PORT}/api/broadcaster/stats`);
    console.log('');
    console.log('提示：按 Ctrl+C 停止服务器');
    console.log('='.repeat(60));
    console.log('');

    // 优雅关闭处理
    process.on('SIGTERM', async () => {
      console.log('');
      console.log('收到SIGTERM信号，正在关闭服务器...');
      await shutdown(server);
    });

    process.on('SIGINT', async () => {
      console.log('');
      console.log('收到SIGINT信号，正在关闭服务器...');
      await shutdown(server);
    });

    // 保持进程运行
    process.stdin.resume();

  } catch (error) {
    console.error('启动服务器失败:', error);
    process.exit(1);
  }
}

/**
 * 关闭服务器
 */
async function shutdown(server: ReturnType<typeof getAppServer>) {
  try {
    console.log('正在停止WebSocket服务器...');
    await server.stop();
    console.log('服务器已停止');
    process.exit(0);
  } catch (error) {
    console.error('停止服务器时出错:', error);
    process.exit(1);
  }
}

// ============================================================================
// 启动
// ============================================================================

const isMainModule = import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`;
if (isMainModule) {
  startWebSocketServer();
}

// ============================================================================
// 导出
// ============================================================================

export { startWebSocketServer, shutdown };
