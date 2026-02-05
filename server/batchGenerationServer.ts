/**
 * 批量文档生成服务器集成
 *
 * 负责初始化和集成所有批量生成相关的服务：
 * 1. BatchGenerationScheduler - 任务调度器
 * 2. TemplateManager - 模板管理器
 * 3. WebSocketServer - WebSocket服务器
 * 4. ProgressBroadcaster - 进度广播器
 * 5. BatchGenerationController - API控制器
 *
 * @version 2.0.0
 * @module BatchGenerationServer
 */

import { logger } from '@/utils/logger';
import express, { Express } from 'express';
import { BatchGenerationScheduler, DefaultDocumentGenerator } from '../src/services/BatchGenerationScheduler';
import { TemplateManager } from '../src/services/TemplateManager';
import { WebSocketServer } from './websocket/websocketServer';
import { ProgressBroadcaster } from './websocket/progressBroadcaster';
import { createBatchGenerationController } from '../api/controllers/batchGenerationController';
import { createLocalStorageService } from '../src/services/storage/LocalStorageService';
import { generateWithDocxtemplater } from '../src/services/docxtemplaterService';
import type { WebSocketServerConfig } from '../src/types/websocket';

// ============================================================================
// 配置接口
// ============================================================================

/**
 * 批量生成服务器配置
 */
export interface BatchGenerationServerConfig {
  // HTTP服务器配置
  httpPort?: number;
  httpHost?: string;

  // WebSocket服务器配置
  websocketPort?: number;
  websocketHost?: string;
  websocketPath?: string;

  // 调度器配置
  maxConcurrency?: number;
  progressInterval?: number;

  // 存储配置
  storagePrefix?: string;
  storageTTL?: number;

  // 是否启用
  enabled?: boolean;
}

// ============================================================================
// 服务器类
// ============================================================================

/**
 * 批量文档生成服务器
 *
 * 功能：
 * - 初始化所有服务
 * - 提供HTTP API
 * - 提供WebSocket实时推送
 * - 管理任务生命周期
 */
export class BatchGenerationServer {
  private app: Express;
  private config: BatchGenerationServerConfig;

  // 核心服务
  private templateManager: TemplateManager;
  private documentGenerator: DefaultDocumentGenerator;
  private websocketServer: WebSocketServer;
  private progressBroadcaster: ProgressBroadcaster;
  private scheduler: BatchGenerationScheduler;
  private storage: any;

  // HTTP服务器
  private httpServer: any;
  private isHttpStarted: boolean = false;

  // WebSocket服务器
  private wsServer: any;
  private isWsStarted: boolean = false;

  // 控制器
  private controller: any;

  constructor(config: BatchGenerationServerConfig = {}) {
    this.config = {
      httpPort: 3000,
      httpHost: '0.0.0.0',
      websocketPort: 3001,
      websocketHost: '0.0.0.0',
      websocketPath: '/v2/stream',
      maxConcurrency: 3,
      progressInterval: 500,
      storagePrefix: 'batch_',
      storageTTL: 3600, // 1小时
      enabled: true,
      ...config,
    };

    // 初始化Express应用
    this.app = express();

    // 中间件
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // CORS
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID');
      if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
      }
      next();
    });

    // 初始化服务
    this.initializeServices();
  }

  // ========================================================================
  // 服务初始化
  // ========================================================================

  /**
   * 初始化所有服务
   */
  private initializeServices(): void {
    // 1. 初始化存储服务
    this.storage = createLocalStorageService({
      prefix: this.config.storagePrefix,
      defaultTTL: this.config.storageTTL,
    });

    // 2. 初始化模板管理器
    this.templateManager = new TemplateManager(this.storage);

    // 3. 初始化文档生成器（封装docxtemplaterService）
    this.documentGenerator = new DefaultDocumentGenerator();

    // 4. 初始化WebSocket服务器
    const wsConfig: WebSocketServerConfig = {
      port: this.config.websocketPort!,
      host: this.config.websocketHost!,
      path: this.config.websocketPath!,
    };
    this.websocketServer = new WebSocketServer(wsConfig);

    // 5. 初始化进度广播器
    this.progressBroadcaster = new ProgressBroadcaster(this.websocketServer, {
      broadcastInterval: this.config.progressInterval,
      batchSize: 10,
      enableIncrementalUpdates: true,
      minChangeThreshold: 1,
    });

    // 6. 初始化任务调度器
    this.scheduler = new BatchGenerationScheduler(
      this.templateManager,
      this.documentGenerator,
      this.websocketServer,
      {
        maxConcurrency: this.config.maxConcurrency,
        progressInterval: this.config.progressInterval,
      }
    );

    // 7. 初始化控制器
    this.controller = createBatchGenerationController(
      this.scheduler,
      this.templateManager,
      this.websocketServer
    );

    // 8. 设置路由
    this.setupRoutes();

    logger.debug('[BatchGenerationServer] 所有服务已初始化');
  }

  /**
   * 设置API路由
   */
  private setupRoutes(): void {
    const router = express.Router();

    // 健康检查
    router.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          scheduler: 'running',
          templateManager: 'running',
          websocketServer: this.isWsStarted ? 'running' : 'stopped',
        },
      });
    });

    // 批量任务路由
    router.post('/batch/tasks', (req, res) => this.controller.createTask(req, res));
    router.get('/batch/tasks', (req, res) => this.controller.listTasks(req, res));
    router.get('/batch/tasks/:id', (req, res) => this.controller.getTask(req, res));
    router.post('/batch/tasks/:id/start', (req, res) => this.controller.startTask(req, res));
    router.post('/batch/tasks/:id/pause', (req, res) => this.controller.pauseTask(req, res));
    router.post('/batch/tasks/:id/resume', (req, res) => this.controller.resumeTask(req, res));
    router.post('/batch/tasks/:id/cancel', (req, res) => this.controller.cancelTask(req, res));
    router.get('/batch/tasks/:id/progress', (req, res) => this.controller.getProgress(req, res));
    router.get('/batch/tasks/:id/download/zip', (req, res) => this.controller.downloadZip(req, res));

    // 挂载路由
    this.app.use('/api/v2', router);

    logger.info('[BatchGenerationServer] API路由已设置');
  }

  // ========================================================================
  // 服务器控制
  // ========================================================================

  /**
   * 启动服务器
   */
  async start(): Promise<void> {
    if (!this.config.enabled) {
      logger.debug('[BatchGenerationServer] 服务器已禁用，跳过启动');
      return;
    }

    try {
      // 1. 启动WebSocket服务器
      await this.startWebSocketServer();

      // 2. 启动HTTP服务器
      await this.startHTTPServer();

      logger.debug('[BatchGenerationServer] 服务器已启动');
    } catch (error) {
      logger.error('[BatchGenerationServer] 启动失败:', error);
      throw error;
    }
  }

  /**
   * 停止服务器
   */
  async stop(): Promise<void> {
    try {
      // 1. 停止HTTP服务器
      await this.stopHTTPServer();

      // 2. 停止WebSocket服务器
      await this.stopWebSocketServer();

      // 3. 清理资源
      this.progressBroadcaster.destroy();

      logger.debug('[BatchGenerationServer] 服务器已停止');
    } catch (error) {
      logger.error('[BatchGenerationServer] 停止失败:', error);
      throw error;
    }
  }

  /**
   * 启动WebSocket服务器
   */
  private async startWebSocketServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.wsServer = this.websocketServer.getServer();
        this.wsServer.listen(this.config.websocketPort, this.config.websocketHost, () => {
          this.isWsStarted = true;
          logger.debug(
            `[BatchGenerationServer] WebSocket服务器已启动: ws://${this.config.websocketHost}:${this.config.websocketPort}${this.config.websocketPath}`
          );
          resolve();
        });

        this.wsServer.on('error', (error: Error) => {
          logger.error('[BatchGenerationServer] WebSocket服务器错误:', error);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 停止WebSocket服务器
   */
  private async stopWebSocketServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.wsServer || !this.isWsStarted) {
        resolve();
        return;
      }

      try {
        this.wsServer.close(() => {
          this.isWsStarted = false;
          logger.debug('[BatchGenerationServer] WebSocket服务器已停止');
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 启动HTTP服务器
   */
  private async startHTTPServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.httpServer = this.app.listen(this.config.httpPort, this.config.httpHost, () => {
          this.isHttpStarted = true;
          logger.debug(
            `[BatchGenerationServer] HTTP服务器已启动: http://${this.config.httpHost}:${this.config.httpPort}`
          );
          resolve();
        });

        this.httpServer.on('error', (error: Error) => {
          logger.error('[BatchGenerationServer] HTTP服务器错误:', error);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 停止HTTP服务器
   */
  private async stopHTTPServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.httpServer || !this.isHttpStarted) {
        resolve();
        return;
      }

      try {
        this.httpServer.close(() => {
          this.isHttpStarted = false;
          logger.debug('[BatchGenerationServer] HTTP服务器已停止');
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  // ========================================================================
  // 公共方法
  // ========================================================================

  /**
   * 获取Express应用实例
   */
  getApp(): Express {
    return this.app;
  }

  /**
   * 获取调度器实例
   */
  getScheduler(): BatchGenerationScheduler {
    return this.scheduler;
  }

  /**
   * 获取模板管理器实例
   */
  getTemplateManager(): TemplateManager {
    return this.templateManager;
  }

  /**
   * 获取WebSocket服务器实例
   */
  getWebSocketServer(): WebSocketServer {
    return this.websocketServer;
  }

  /**
   * 获取进度广播器实例
   */
  getProgressBroadcaster(): ProgressBroadcaster {
    return this.progressBroadcaster;
  }

  /**
   * 获取服务器状态
   */
  getStatus() {
    return {
      http: {
        started: this.isHttpStarted,
        port: this.config.httpPort,
        host: this.config.httpHost,
      },
      websocket: {
        started: this.isWsStarted,
        port: this.config.websocketPort,
        host: this.config.websocketHost,
        path: this.config.websocketPath,
      },
      scheduler: {
        maxConcurrency: this.config.maxConcurrency,
        runningTasks: this.scheduler['runningTasks']?.size || 0,
      },
    };
  }
}

// ============================================================================
// 默认文档生成器实现（封装docxtemplaterService）
// ============================================================================

/**
 * 默认文档生成器实现
 * 封装现有的docxtemplaterService
 */
class DefaultDocumentGenerator {
  async generate(params: {
    templateBuffer: ArrayBuffer;
    data: Record<string, any>;
  }): Promise<Blob> {
    try {
      // 调用现有的docxtemplaterService
      const result = await generateWithDocxtemplater({
        templateBuffer: params.templateBuffer,
        data: params.data,
      });

      // 返回Blob
      return new Blob([result], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
    } catch (error) {
      logger.error('[DefaultDocumentGenerator] 生成文档失败:', error);
      throw error;
    }
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

/**
 * 创建并启动批量生成服务器
 */
export async function createBatchGenerationServer(
  config?: BatchGenerationServerConfig
): Promise<BatchGenerationServer> {
  const server = new BatchGenerationServer(config);
  await server.start();
  return server;
}

// ============================================================================
// 默认导出
// ============================================================================

export default BatchGenerationServer;
