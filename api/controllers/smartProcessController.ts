/**
 * 智能处理控制器
 *
 * 处理智能Excel数据处理的HTTP请求
 * 作为AgenticOrchestrator的API层代理
 *
 * @module api/controllers/smartProcessController
 */

import { Request, Response, NextFunction } from 'express';
import { AgenticOrchestrator } from '../../src/services/agentic/AgenticOrchestrator';
import type {
  DataFileInfo,
  OrchestratorConfig,
  MultiStepTask,
  TaskResult
} from '../../src/types/agenticTypes';
import { logger } from '../../src/utils/logger';

/**
 * 智能处理请求接口
 */
interface SmartProcessRequest {
  command: string;
  files: Array<{
    id: string;
    fileName: string;
    sheets: { [sheetName: string]: any[] };
    currentSheetName: string;
    metadata?: any;
  }>;
  options?: Partial<OrchestratorConfig>;
}

/**
 * 任务状态存储
 * 生产环境应使用Redis或数据库
 */
const taskStore = new Map<string, {
  taskId: string;
  status: string;
  result?: TaskResult;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}>();

/**
 * SmartProcessController - 智能处理控制器
 */
export class SmartProcessController {
  /**
   * 执行智能处理
   * POST /api/v2/ai/smart-process
   */
  async execute(req: Request, res: Response, next: NextFunction): Promise<void> {
    const requestId = req.headers['x-request-id'] as string || this.generateId();
    const startTime = Date.now();

    try {
      // 1. 参数验证
      const { command, files, options }: SmartProcessRequest = req.body;

      this.validateRequest(command, files);

      logger.info('[SmartProcess] Starting execution', {
        requestId,
        commandLength: command.length,
        fileCount: files.length
      });

      // 2. 转换数据格式
      const dataFiles: DataFileInfo[] = files.map(f => ({
        id: f.id,
        fileName: f.fileName,
        sheets: f.sheets,
        currentSheetName: f.currentSheetName,
        metadata: f.metadata
      }));

      // 3. 创建编排器实例
      const orchestrator = new AgenticOrchestrator({
        maxRetries: options?.maxRetries || 3,
        qualityThreshold: options?.qualityThreshold || 0.8,
        enableAutoRepair: options?.enableAutoRepair !== false,
        logLevel: 'info'
      });

      // 4. 生成任务ID
      const taskId = this.generateId();

      // 5. 初始化任务状态
      taskStore.set(taskId, {
        taskId,
        status: 'processing',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // 6. 异步执行任务(不阻塞HTTP响应)
      // ✅ 添加超时检测机制，防止任务永远卡住
      const TASK_TIMEOUT_MS = 5 * 60 * 1000;  // 5分钟超时

      const taskTimeout = setTimeout(() => {
        const task = taskStore.get(taskId);
        if (task && task.status === 'processing') {
          taskStore.set(taskId, {
            taskId,
            status: 'failed',
            error: `任务执行超时（超过${TASK_TIMEOUT_MS / 1000}秒），可能存在无限循环或AI服务响应过慢`,
            createdAt: task.createdAt,
            updatedAt: new Date()
          });

          logger.error('[SmartProcess] Task timeout', {
            requestId,
            taskId,
            duration: TASK_TIMEOUT_MS
          });
        }
      }, TASK_TIMEOUT_MS);

      this.executeTaskAsync(orchestrator, taskId, command, dataFiles)
        .then(result => {
          // ✅ 清除超时定时器
          clearTimeout(taskTimeout);

          // 更新任务状态
          taskStore.set(taskId, {
            taskId,
            status: 'completed',
            result,
            createdAt: taskStore.get(taskId)!.createdAt,
            updatedAt: new Date()
          });

          logger.info('[SmartProcess] Task completed', {
            requestId,
            taskId,
            duration: Date.now() - startTime
          });
        })
        .catch(error => {
          // ✅ 清除超时定时器
          clearTimeout(taskTimeout);

          // 更新任务状态为失败
          taskStore.set(taskId, {
            taskId,
            status: 'failed',
            error: error.message,
            createdAt: taskStore.get(taskId)!.createdAt,
            updatedAt: new Date()
          });

          logger.error('[SmartProcess] Task failed', {
            requestId,
            taskId,
            error: error.message
          });
        });

      // 7. 立即返回任务ID(异步处理)
      res.status(202).json({
        success: true,
        data: {
          taskId,
          status: 'processing',
          message: '任务已接受，正在处理中',
          links: {
            self: `/api/v2/ai/smart-process/${taskId}`,
            stream: `/api/v2/ai/smart-process/${taskId}/stream`,
            cancel: `/api/v2/ai/smart-process/${taskId}/cancel`
          }
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('[SmartProcess] Request validation failed', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          error: {
            code: error.code,
            message: error.message
          }
        });
        return;
      }

      next(error);
    }
  }

  /**
   * 获取任务状态
   * GET /api/v2/ai/smart-process/:taskId
   */
  async getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { taskId } = req.params;
      const task = taskStore.get(taskId);

      if (!task) {
        res.status(404).json({
          success: false,
          error: {
            code: 'TASK_NOT_FOUND',
            message: `任务 ${taskId} 不存在`
          }
        });
        return;
      }

      // 如果任务完成，返回完整结果
      if (task.status === 'completed' && task.result) {
        res.json({
          success: true,
          data: {
            taskId: task.taskId,
            status: task.status,
            result: this.sanitizeResult(task.result),
            executionTime: task.updatedAt.getTime() - task.createdAt.getTime()
          }
        });
      }
      // 如果任务失败，返回错误信息
      else if (task.status === 'failed') {
        res.json({
          success: false,
          error: {
            code: 'TASK_FAILED',
            message: task.error || '任务执行失败'
          }
        });
      }
      // 任务仍在处理中
      else {
        res.json({
          success: true,
          data: {
            taskId: task.taskId,
            status: task.status,
            message: '任务正在处理中...',
            elapsed: Date.now() - task.createdAt.getTime()
          }
        });
      }

    } catch (error) {
      next(error);
    }
  }

  /**
   * 取消任务
   * POST /api/v2/ai/smart-process/:taskId/cancel
   */
  async cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { taskId } = req.params;
      const task = taskStore.get(taskId);

      if (!task) {
        res.status(404).json({
          success: false,
          error: {
            code: 'TASK_NOT_FOUND',
            message: `任务 ${taskId} 不存在`
          }
        });
        return;
      }

      if (task.status === 'completed' || task.status === 'failed') {
        res.status(400).json({
          success: false,
          error: {
            code: 'TASK_ALREADY_FINISHED',
            message: '任务已完成或失败，无法取消'
          }
        });
        return;
      }

      // 更新任务状态
      taskStore.set(taskId, {
        ...task,
        status: 'cancelled',
        updatedAt: new Date()
      });

      // TODO: 通知AgenticOrchestrator取消执行
      // 需要在AgenticOrchestrator中实现cancelTask方法

      res.json({
        success: true,
        data: {
          taskId,
          status: 'cancelled',
          message: '任务已取消'
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * 验证请求参数
   */
  private validateRequest(
    command: any,
    files: any
  ): void {
    if (!command || typeof command !== 'string') {
      throw new ValidationError(
        'INVALID_COMMAND',
        '命令必须是字符串'
      );
    }

    if (command.trim().length === 0) {
      throw new ValidationError(
        'INVALID_COMMAND_EMPTY',
        '命令不能为空'
      );
    }

    if (command.length > 10000) {
      throw new ValidationError(
        'INVALID_COMMAND_TOO_LONG',
        '命令长度超过限制(最大10000字符)'
      );
    }

    if (!files || !Array.isArray(files)) {
      throw new ValidationError(
        'INVALID_FILES',
        'files必须是数组'
      );
    }

    if (files.length === 0) {
      throw new ValidationError(
        'INVALID_FILES_NONE',
        '至少需要一个文件'
      );
    }

    if (files.length > 10) {
      throw new ValidationError(
        'INVALID_FILES_TOO_MANY',
        '文件数量超过限制(最多10个)'
      );
    }

    // 验证每个文件
    files.forEach((file, index) => {
      if (!file.fileName || typeof file.fileName !== 'string') {
        throw new ValidationError(
          'INVALID_FILE_NAME',
          `文件${index + 1}缺少fileName字段`
        );
      }

      if (!file.sheets || typeof file.sheets !== 'object') {
        throw new ValidationError(
          'INVALID_FILE_SHEETS',
          `文件${file.fileName}缺少sheets字段`
        );
      }

      if (!file.currentSheetName || typeof file.currentSheetName !== 'string') {
        throw new ValidationError(
          'INVALID_FILE_CURRENT_SHEET',
          `文件${file.fileName}缺少currentSheetName字段`
        );
      }
    });
  }

  /**
   * 异步执行任务
   */
  private async executeTaskAsync(
    orchestrator: AgenticOrchestrator,
    taskId: string,
    command: string,
    dataFiles: DataFileInfo[]
  ): Promise<TaskResult> {
    try {
      logger.debug('[SmartProcess] Executing task async', {
        taskId,
        command
      });

      const result = await orchestrator.executeTask(command, dataFiles);

      return result;

    } catch (error) {
      logger.error('[SmartProcess] Async execution failed', {
        taskId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * 清理结果中的敏感信息
   */
  private sanitizeResult(result: TaskResult): any {
    return {
      success: result.success,
      data: result.data,
      qualityReport: result.qualityReport,
      executionSummary: result.executionSummary,
      // 移除内部系统信息
      logs: result.logs?.map(log => ({
        timestamp: log.timestamp,
        level: log.level,
        phase: log.phase,
        message: log.message
        // 移除stack等敏感信息
      }))
    };
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * 验证错误类
 */
class ValidationError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// 导出控制器实例
export const smartProcessController = new SmartProcessController();
