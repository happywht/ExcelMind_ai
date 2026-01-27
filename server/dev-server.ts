/**
 * 开发服务器启动脚本
 *
 * 启动 Express 服务器和 WebSocket 服务器
 * 支持热重载和详细日志
 */

// 加载环境变量（必须在所有其他导入之前）
import path from 'path';
import { config } from 'dotenv';

// 环境变量加载顺序（优先级从低到高）：
// 1. .env (默认)
// 2. .env.development (开发环境)
// 3. .env.local (本地覆盖 - 优先级最高)
//
// 注意：.env.local 不会被提交到版本控制，适合存放敏感信息

// 加载 .env 文件（如果存在）
config();

// 加载 .env.development 文件（如果存在）
const envDevPath = path.resolve(process.cwd(), '.env.development');
config({ path: envDevPath });

// 加载 .env.local 文件（如果存在）- 优先级最高，会覆盖前面的配置
const envLocalPath = path.resolve(process.cwd(), '.env.local');
config({ path: envLocalPath, override: true });

import { logger } from '@/utils/logger';
import { createServerWithWebSocket } from './app';
import { validateAIServiceConfig } from '../services/zhipuService';

// 环境变量
const PORT = process.env.API_PORT || 3001;
const HOST = process.env.API_HOST || 'localhost';
const NODE_ENV = process.env.NODE_ENV || 'development';

// 验证关键环境变量
const zhipuKey = process.env.ZHIPU_API_KEY;
if (!zhipuKey) {
  logger.warn('[Startup] ZHIPU_API_KEY 未配置，AI功能将不可用');
} else {
  // 只显示密钥的前8位和后4位，中间用星号代替，保护敏感信息
  const maskedKey = zhipuKey.length > 12
    ? `${zhipuKey.substring(0, 8)}${'*'.repeat(zhipuKey.length - 12)}${zhipuKey.substring(zhipuKey.length - 4)}`
    : '****';
  logger.info(`[Startup] ZHIPU_API_KEY 已加载: ${maskedKey}`);
}

// 验证AI服务配置
const aiConfigValidation = validateAIServiceConfig();
if (!aiConfigValidation.valid) {
  logger.error(`[Startup] AI服务配置验证失败: ${aiConfigValidation.error}`);
} else {
  logger.info('[Startup] AI服务配置验证通过');
}

/**
 * 启动服务器
 */
async function startServer() {
  try {
    logger.debug('='.repeat(60));
    logger.info('ExcelMind AI - Phase 2 API 服务器');
    logger.debug('='.repeat(60));
    logger.debug(`环境: ${NODE_ENV}`);
    logger.debug(`启动中...`);

    // 创建服务器
    const { app, server, wss } = createServerWithWebSocket();

    // 启动 HTTP 服务器
    server.listen(PORT, HOST as string, () => {
      logger.debug('');
      logger.debug('✓ 服务器已启动');
      logger.debug('');
      logger.debug('  服务地址:');
      logger.debug(`    HTTP:  http://${HOST}:${PORT}`);
      logger.info(`    WS:    ws://${HOST}:${PORT}/api/v2/stream`);
      logger.debug('');
      logger.debug('  健康检查:');
      logger.debug(`    GET    http://${HOST}:${PORT}/health`);
      logger.debug('');
      logger.info('  API 端点:');
      logger.info(`    数据质量: http://${HOST}:${PORT}/api/v2/data-quality`);
      logger.info(`    模板管理: http://${HOST}:${PORT}/api/v2/templates`);
      logger.info(`    批量生成: http://${HOST}:${PORT}/api/v2/generation`);
      logger.info(`    审计规则: http://${HOST}:${PORT}/api/v2/audit`);
      logger.debug('');
      logger.debug('  WebSocket 频道:');
      logger.debug(`    - task_progress`);
      logger.debug(`    - generation_status`);
      logger.debug(`    - audit_alerts`);
      logger.debug(`    - performance_alerts`);
      logger.debug('');
      logger.debug('按 Ctrl+C 停止服务器');
      logger.debug('='.repeat(60));
    });

    // 处理优雅关闭
    const shutdown = async () => {
      logger.debug('');
      logger.debug('正在关闭服务器...');

      // 关闭 WebSocket 服务器
      wss.clients.forEach((client) => {
        client.close();
      });

      // 关闭 HTTP 服务器
      server.close(() => {
        logger.debug('✓ 服务器已关闭');
        process.exit(0);
      });

      // 强制退出
      setTimeout(() => {
        logger.error('强制退出');
        process.exit(1);
      }, 10000);
    };

    // 监听退出信号
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    // 监听未捕获的错误
    process.on('uncaughtException', (error) => {
      logger.error('未捕获的异常:', error);
      shutdown();
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('未处理的 Promise 拒绝:', reason);
      shutdown();
    });

  } catch (error) {
    logger.error('服务器启动失败:', error);
    process.exit(1);
  }
}

// 启动服务器
startServer();
