/**
 * 服务器主入口 - WebSocket服务器集成
 *
 * 职责：
 * 1. 启动和配置WebSocket服务器
 * 2. 集成进度广播器
 * 3. 集成批量任务调度器
 * 4. 提供统一的API接口
 *
 * @version 1.0.0
 * @module server
 */

import { logger } from '@/utils/logger';
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from './websocket/websocketServer';
import { ProgressBroadcaster } from './websocket/progressBroadcaster';
import { getWebSocketConfig } from '../config/websocket.config';
import type { BatchGenerationScheduler } from '../services/BatchGenerationScheduler';
import type { BatchGenerationTask } from '../types/templateGeneration';

// ============================================================================
// 服务器类
// ============================================================================

/**
 * 应用服务器
 *
 * 集成Express HTTP服务器和WebSocket服务器
 */
export class AppServer {
  private expressApp: express.Application;
  private httpServer: ReturnType<typeof createServer>;
  private websocketServer: WebSocketServer | null = null;
  private progressBroadcaster: ProgressBroadcaster | null = null;
  private batchScheduler: BatchGenerationScheduler | null = null;

  constructor() {
    // 创建Express应用
    this.expressApp = express();

    // 创建HTTP服务器
    this.httpServer = createServer(this.expressApp);

    // 设置中间件
    this.setupMiddleware();

    // 设置路由
    this.setupRoutes();
  }

  // ========================================================================
  // 公共方法 - 服务器控制
  // ========================================================================

  /**
   * 启动服务器
   *
   * @param port - HTTP服务器端口
   * @param wsPort - WebSocket服务器端口（可选，默认与HTTP端口相同）
   */
  async start(port: number, wsPort?: number): Promise<void> {
    try {
      // 1. 启动HTTP服务器
      await new Promise<void>((resolve, reject) => {
        this.httpServer.once('error', reject);
        this.httpServer.listen(port, () => {
          logger.debug(`HTTP服务器监听端口: ${port}`);
          resolve();
        });
      });

      // 2. 启动WebSocket服务器
      const wsConfig = getWebSocketConfig();
      const wsServerPort = wsPort || wsConfig.port;

      this.websocketServer = new WebSocketServer(wsServerPort);
      await this.websocketServer.start();

      // 3. 创建进度广播器
      this.progressBroadcaster = new ProgressBroadcaster(this.websocketServer);

      // 4. 如果有批量调度器，集成它
      if (this.batchScheduler) {
        this.integrateBatchScheduler();
      }

      logger.debug(`所有服务器已成功启动 - HTTP: ${port}, WebSocket: ${wsServerPort}`);

    } catch (error) {
      logger.error('启动服务器失败:', error);
      throw error;
    }
  }

  /**
   * 停止服务器
   */
  async stop(): Promise<void> {
    // 停止进度广播器
    if (this.progressBroadcaster) {
      this.progressBroadcaster.destroy();
    }

    // 停止WebSocket服务器
    if (this.websocketServer) {
      await this.websocketServer.stop();
    }

    // 停止HTTP服务器
    return new Promise((resolve) => {
      this.httpServer.close(() => {
        logger.debug('HTTP服务器已关闭');
        resolve();
      });
    });
  }

  // ========================================================================
  // 公共方法 - 集成
  // ========================================================================

  /**
   * 集成批量任务调度器
   *
   * @param scheduler - 批量任务调度器实例
   */
  integrateBatchScheduler(scheduler?: BatchGenerationScheduler): void {
    if (scheduler) {
      this.batchScheduler = scheduler;
    }

    if (!this.batchScheduler || !this.progressBroadcaster) {
      return;
    }

    // 监听任务事件并广播
    this.batchScheduler.on('task:started', async (task: BatchGenerationTask) => {
      await this.progressBroadcaster!.onTaskStarted(task);
    });

    this.batchScheduler.on('task:progress', async (task: BatchGenerationTask) => {
      await this.progressBroadcaster!.onTaskProgress(task);
    });

    this.batchScheduler.on('task:completed', async (task: BatchGenerationTask) => {
      await this.progressBroadcaster!.onTaskCompleted(task);
    });

    this.batchScheduler.on('task:failed', async (task: BatchGenerationTask) => {
      await this.progressBroadcaster!.onTaskFailed(task);
    });

    this.batchScheduler.on('task:paused', async (task: BatchGenerationTask) => {
      await this.progressBroadcaster!.onTaskPaused(task);
    });

    this.batchScheduler.on('task:cancelled', async (task: BatchGenerationTask) => {
      await this.progressBroadcaster!.onTaskCancelled(task);
    });

    logger.debug('批量任务调度器已集成到WebSocket服务器');
  }

  /**
   * 获取WebSocket服务器实例
   */
  getWebSocketServer(): WebSocketServer | null {
    return this.websocketServer;
  }

  /**
   * 获取进度广播器实例
   */
  getProgressBroadcaster(): ProgressBroadcaster | null {
    return this.progressBroadcaster;
  }

  // ========================================================================
  // 私有方法 - 设置
  // ========================================================================

  /**
   * 设置中间件
   */
  private setupMiddleware(): void {
    // JSON解析
    this.expressApp.use(express.json());

    // 日志
    this.expressApp.use((req, res, next) => {
      logger.debug(`${req.method} ${req.path}`);
      next();
    });

    // CORS
    this.expressApp.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });
  }

  /**
   * 设置路由
   */
  private setupRoutes(): void {
    // 健康检查
    this.expressApp.get('/health', (req, res) => {
      const wsStats = this.websocketServer?.getStats();
      const bcStats = this.progressBroadcaster?.getStats();

      res.json({
        status: 'healthy',
        timestamp: Date.now(),
        uptime: process.uptime(),
        websocket: {
          connections: wsStats?.connections.active || 0,
          messages: wsStats?.messages.totalSent || 0,
        },
        broadcaster: {
          queueSize: bcStats?.queueSize || 0,
          totalBroadcasts: bcStats?.totalBroadcasts || 0,
        },
      });
    });

    // WebSocket统计
    this.expressApp.get('/api/websocket/stats', (req, res) => {
      const stats = this.websocketServer?.getStats();
      res.json(stats || {});
    });

    // 广播器统计
    this.expressApp.get('/api/broadcaster/stats', (req, res) => {
      const stats = this.progressBroadcaster?.getStats();
      res.json(stats || {});
    });

    // 404处理
    this.expressApp.use((req, res) => {
      res.status(404).json({ error: 'Not found' });
    });
  }
}

// ============================================================================
// 单例实例
// ============================================================================

let appServerInstance: AppServer | null = null;

/**
 * 获取应用服务器实例
 */
export function getAppServer(): AppServer {
  if (!appServerInstance) {
    appServerInstance = new AppServer();
  }
  return appServerInstance;
}

// ============================================================================
// 启动脚本
// ============================================================================

/**
 * 启动服务器（用于独立运行）
 */
async function startServer() {
  const server = getAppServer();

  const httpPort = parseInt(process.env.HTTP_PORT || '3000', 10);
  const wsPort = parseInt(process.env.WEBSOCKET_PORT || '3001', 10);

  try {
    await server.start(httpPort, wsPort);
    logger.debug(`服务器已启动 - HTTP: ${httpPort}, WebSocket: ${wsPort}`);

    // 优雅关闭
    process.on('SIGTERM', async () => {
      logger.debug('收到SIGTERM信号，正在关闭服务器...');
      await server.stop();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.debug('收到SIGINT信号，正在关闭服务器...');
      await server.stop();
      process.exit(0);
    });

  } catch (error) {
    logger.error('启动服务器失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此文件，启动服务器
const isMainModule = import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`;
if (isMainModule) {
  startServer();
}

// ============================================================================
// 导出
// ============================================================================

export default AppServer;
