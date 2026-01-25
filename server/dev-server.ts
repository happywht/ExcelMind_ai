/**
 * 开发服务器启动脚本
 *
 * 启动 Express 服务器和 WebSocket 服务器
 * 支持热重载和详细日志
 */

import { createServerWithWebSocket } from './app';

// 环境变量
const PORT = process.env.API_PORT || 3001;
const HOST = process.env.API_HOST || 'localhost';
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * 启动服务器
 */
async function startServer() {
  try {
    console.log('='.repeat(60));
    console.log('ExcelMind AI - Phase 2 API 服务器');
    console.log('='.repeat(60));
    console.log(`环境: ${NODE_ENV}`);
    console.log(`启动中...`);

    // 创建服务器
    const { app, server, wss } = createServerWithWebSocket();

    // 启动 HTTP 服务器
    server.listen(PORT, HOST as string, () => {
      console.log('');
      console.log('✓ 服务器已启动');
      console.log('');
      console.log('  服务地址:');
      console.log(`    HTTP:  http://${HOST}:${PORT}`);
      console.log(`    WS:    ws://${HOST}:${PORT}/api/v2/stream`);
      console.log('');
      console.log('  健康检查:');
      console.log(`    GET    http://${HOST}:${PORT}/health`);
      console.log('');
      console.log('  API 端点:');
      console.log(`    数据质量: http://${HOST}:${PORT}/api/v2/data-quality`);
      console.log(`    模板管理: http://${HOST}:${PORT}/api/v2/templates`);
      console.log(`    批量生成: http://${HOST}:${PORT}/api/v2/generation`);
      console.log(`    审计规则: http://${HOST}:${PORT}/api/v2/audit`);
      console.log('');
      console.log('  WebSocket 频道:');
      console.log(`    - task_progress`);
      console.log(`    - generation_status`);
      console.log(`    - audit_alerts`);
      console.log(`    - performance_alerts`);
      console.log('');
      console.log('按 Ctrl+C 停止服务器');
      console.log('='.repeat(60));
    });

    // 处理优雅关闭
    const shutdown = async () => {
      console.log('');
      console.log('正在关闭服务器...');

      // 关闭 WebSocket 服务器
      wss.clients.forEach((client) => {
        client.close();
      });

      // 关闭 HTTP 服务器
      server.close(() => {
        console.log('✓ 服务器已关闭');
        process.exit(0);
      });

      // 强制退出
      setTimeout(() => {
        console.error('强制退出');
        process.exit(1);
      }, 10000);
    };

    // 监听退出信号
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    // 监听未捕获的错误
    process.on('uncaughtException', (error) => {
      console.error('未捕获的异常:', error);
      shutdown();
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('未处理的 Promise 拒绝:', reason);
      shutdown();
    });

  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
}

// 启动服务器
startServer();
