/**
 * 批量文档生成服务器启动脚本
 *
 * 用于快速启动批量生成服务器进行测试和开发
 *
 * @version 2.0.0
 */

import { createBatchGenerationServer, BatchGenerationServer } from '../server/batchGenerationServer';

// ============================================================================
// 配置
// ============================================================================

const config = {
  httpPort: parseInt(process.env.HTTP_PORT || '3000', 10),
  httpHost: process.env.HTTP_HOST || 'localhost',
  websocketPort: parseInt(process.env.WS_PORT || '3001', 10),
  websocketHost: process.env.WS_HOST || 'localhost',
  websocketPath: process.env.WS_PATH || '/v2/stream',
  maxConcurrency: parseInt(process.env.MAX_CONCURRENCY || '3', 10),
  progressInterval: parseInt(process.env.PROGRESS_INTERVAL || '500', 10),
  enabled: true,
};

// ============================================================================
// 服务器实例
// ============================================================================

let server: BatchGenerationServer | null = null;

// ============================================================================
// 启动函数
// ============================================================================

/**
 * 启动批量生成服务器
 */
async function startServer(): Promise<void> {
  try {
    console.log('========================================');
    console.log('批量文档生成服务器启动中...');
    console.log('========================================');
    console.log('配置:', JSON.stringify(config, null, 2));
    console.log('');

    // 创建并启动服务器
    server = await createBatchGenerationServer(config);

    console.log('');
    console.log('========================================');
    console.log('服务器启动成功！');
    console.log('========================================');
    console.log(`HTTP API: http://${config.httpHost}:${config.httpPort}/api/v2`);
    console.log(`WebSocket: ws://${config.websocketHost}:${config.websocketPort}${config.websocketPath}`);
    console.log('');
    console.log('API端点:');
    console.log(`  POST   /api/v2/batch/tasks              - 创建批量任务`);
    console.log(`  GET    /api/v2/batch/tasks              - 列出任务`);
    console.log(`  GET    /api/v2/batch/tasks/:id          - 获取任务详情`);
    console.log(`  POST   /api/v2/batch/tasks/:id/start    - 启动任务`);
    console.log(`  POST   /api/v2/batch/tasks/:id/pause    - 暂停任务`);
    console.log(`  POST   /api/v2/batch/tasks/:id/resume   - 恢复任务`);
    console.log(`  POST   /api/v2/batch/tasks/:id/cancel   - 取消任务`);
    console.log(`  GET    /api/v2/batch/tasks/:id/progress - 获取进度`);
    console.log(`  GET    /api/v2/batch/tasks/:id/download/zip - 下载ZIP`);
    console.log('');
    console.log('健康检查: http://localhost:3000/api/v2/health');
    console.log('========================================');

  } catch (error) {
    console.error('启动失败:', error);
    process.exit(1);
  }
}

// ============================================================================
// 关闭函数
// ============================================================================

/**
 * 优雅关闭服务器
 */
async function shutdownServer(): Promise<void> {
  console.log('');
  console.log('正在关闭服务器...');

  if (server) {
    try {
      await server.stop();
      console.log('服务器已关闭');
    } catch (error) {
      console.error('关闭服务器失败:', error);
      process.exit(1);
    }
  }

  process.exit(0);
}

// ============================================================================
// 信号处理
// ============================================================================

// 监听退出信号
process.on('SIGINT', shutdownServer);
process.on('SIGTERM', shutdownServer);

// 监听未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  shutdownServer();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
  shutdownServer();
});

// ============================================================================
// 启动服务器
// ============================================================================

if (require.main === module) {
  startServer();
}

// ============================================================================
// 导出
// ============================================================================

export { startServer, shutdownServer };
