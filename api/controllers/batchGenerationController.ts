/**
 * 批量文档生成 API 控制器
 *
 * 提供批量文档生成任务管理、进度追踪等功能
 * 基于 API_SPECIFICATION_PHASE2.md 规范
 *
 * @version 2.0.0
 * @module BatchGenerationController
 */

import { logger } from '@/utils/logger';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import JSZip from 'jszip';
import {
  BatchGenerationRequest,
  BatchGenerationResponse,
  GenerationStatus,
  ApiResponseSuccess,
  ApiErrorResponse,
} from '../../types/apiTypes';
import { ApiErrorCode, createApiErrorResponse } from '../../types/errorCodes';

// 导入服务层
import { BatchGenerationScheduler } from '../../services/BatchGenerationScheduler';
import { TemplateManager } from '../../services/TemplateManager';
import { WebSocketServer } from '../../server/websocket/websocketServer';
import { ProgressBroadcaster } from '../../server/websocket/progressBroadcaster';
import { createLocalStorageService } from '../../services/storage/LocalStorageService';
import type { BatchGenerationTask } from '../../types/templateGeneration';
import { TaskStatus as GenerationTaskStatus } from '../../types/templateGeneration';

/**
 * 批量生成任务状态（API响应用）
 */
type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'paused';

/**
 * 批量生成控制器
 */
export class BatchGenerationController {
  private scheduler: BatchGenerationScheduler;
  private templateManager: TemplateManager;
  private storage: any;
  private progressBroadcaster: ProgressBroadcaster;

  /**
   * 构造函数
   */
  constructor(
    scheduler: BatchGenerationScheduler,
    templateManager: TemplateManager,
    websocketServer: WebSocketServer
  ) {
    this.scheduler = scheduler;
    this.templateManager = templateManager;
    this.storage = createLocalStorageService({ prefix: 'batch_' });
    this.progressBroadcaster = new ProgressBroadcaster(websocketServer, {
      broadcastInterval: 100,
      batchSize: 10,
      enableIncrementalUpdates: true,
      minChangeThreshold: 1,
    });

    // 监听调度器事件
    this.setupSchedulerEvents();
  }

  /**
   * 设置调度器事件监听
   * 注意：当前BatchGenerationScheduler不支持事件监听，此方法暂时禁用
   * TODO：在BatchGenerationScheduler中添加EventEmitter支持
   */
  private setupSchedulerEvents(): void {
    // 暂时禁用事件监听，因为BatchGenerationScheduler没有on方法
    // 未来可以通过继承EventEmitter来添加事件支持
    logger.debug('[BatchGenerationController] Event listeners setup skipped (not implemented yet)');
  }

  /**
   * 创建批量生成任务
   * POST /api/v2/batch/tasks
   */
  async createTask(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string || uuidv4();

    try {
      const batchRequest: BatchGenerationRequest = req.body;

      // 验证必填字段
      if (!batchRequest.dataSourceId) {
        throw this.createValidationError('dataSourceId', 'dataSourceId is required');
      }

      if (!batchRequest.templateIds || batchRequest.templateIds.length === 0) {
        throw this.createValidationError('templateIds', 'At least one templateId is required');
      }

      if (!batchRequest.outputFormat) {
        throw this.createValidationError('outputFormat', 'outputFormat is required');
      }

      // 验证模板存在
      const templatePromises = batchRequest.templateIds.map(templateId =>
        this.templateManager.getTemplate(templateId)
      );
      const templates = await Promise.all(templatePromises);
      const missingTemplates = templates.filter((t, i) => !t);

      if (missingTemplates.length > 0) {
        throw this.createValidationError(
          'templateIds',
          `Templates not found: ${missingTemplates.map((_, i) => batchRequest.templateIds[i]).join(', ')}`
        );
      }

      // 调用调度器创建任务
      const taskResponse = await this.scheduler.createTask({
        templateIds: batchRequest.templateIds,
        dataSource: {
          type: 'json',
          source: {
            json: batchRequest.data || []
          }
        },
        mode: batchRequest.mode || 'sequential',
        priority: 'low',
        parameters: {},
        output: {
          type: 'download',
          format: batchRequest.outputFormat
        },
        options: batchRequest.options || {}
      } as any);

      const response: ApiResponseSuccess<BatchGenerationResponse> = {
        success: true,
        data: {
          taskId: taskResponse.taskId,
          status: taskResponse.status as any,
          estimatedTime: taskResponse.estimatedDuration || 300,
          estimatedDocumentCount: (taskResponse as any).estimatedDocumentCount || 100,
          items: batchRequest.templateIds.map((templateId, index) => ({
            templateId,
            templateName: templates[index]?.metadata?.name || `模板 ${index + 1}`,
            estimatedCount: 50,
          })),
          websocketUrl: process.env.WEBSOCKET_URL
            ? `${process.env.WEBSOCKET_URL}/v2/stream/${taskResponse.taskId}`
            : `ws://localhost:3001/v2/stream/${taskResponse.taskId}`,
        },
        meta: this.createMeta(requestId, startTime),
      };

      res.status(202).json(response);
    } catch (error) {
      this.handleError(error, res, requestId);
    }
  }

  /**
   * 列出任务
   * GET /api/v2/batch/tasks
   */
  async listTasks(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string || uuidv4();

    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;
      const status = req.query.status as TaskStatus | undefined;

      // TODO: 调用服务获取任务列表
      // const result = await this.taskManager.listTasks({ page, pageSize, status });

      // 临时模拟响应
      const tasks = [
        {
          taskId: 'task_001',
          status: 'processing',
          dataSourceId: 'ds_001',
          templateIds: ['tmpl_001', 'tmpl_002'],
          outputFormat: 'docx',
          progress: 45,
          createdAt: '2026-01-25T10:00:00Z',
          startedAt: '2026-01-25T10:05:00Z',
          estimatedEndTime: '2026-01-25T10:10:00Z',
        },
        {
          taskId: 'task_002',
          status: 'completed',
          dataSourceId: 'ds_002',
          templateIds: ['tmpl_003'],
          outputFormat: 'pdf',
          progress: 100,
          createdAt: '2026-01-24T15:00:00Z',
          startedAt: '2026-01-24T15:01:00Z',
          completedAt: '2026-01-24T15:05:00Z',
        },
      ];

      const filteredTasks = status
        ? tasks.filter((task) => task.status === status)
        : tasks;

      const pagination = {
        page,
        pageSize,
        total: filteredTasks.length,
        totalPages: Math.ceil(filteredTasks.length / pageSize),
        hasNext: page < Math.ceil(filteredTasks.length / pageSize),
        hasPrev: page > 1,
      };

      const response: ApiResponseSuccess<{
        items: typeof tasks;
        pagination: typeof pagination;
      }> = {
        success: true,
        data: {
          items: filteredTasks,
          pagination,
        },
        meta: this.createMeta(requestId, startTime),
      };

      res.status(200).json(response);
    } catch (error) {
      this.handleError(error, res, requestId);
    }
  }

  /**
   * 获取任务详情
   * GET /api/v2/batch/tasks/:id
   */
  async getTask(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string || uuidv4();

    try {
      const { id } = req.params;

      if (!id) {
        throw this.createValidationError('id', 'Task ID is required');
      }

      // TODO: 调用服务获取任务详情
      // const task = await this.taskManager.getTask(id);

      // 临时模拟响应
      const task: GenerationStatus = {
        taskId: id,
        status: 'processing',
        progress: 45,
        currentStep: '生成文档中',
        startedAt: '2026-01-25T10:00:00Z',
        estimatedEndTime: '2026-01-25T10:05:00Z',
        items: [
          {
            templateId: 'tmpl_001',
            templateName: '销售合同模板',
            estimatedCount: 50,
            status: 'processing',
            progress: 50,
            completedCount: 25,
            totalCount: 50,
            failedCount: 0,
            downloads: {
              completedUrl: `/api/v2/generation/download/${id}/tmpl_001/completed`,
            },
          },
          {
            templateId: 'tmpl_002',
            templateName: '采购订单模板',
            estimatedCount: 50,
            status: 'pending',
            progress: 0,
            completedCount: 0,
            totalCount: 50,
            failedCount: 0,
          },
        ],
        summary: {
          totalDocuments: 100,
          completedDocuments: 25,
          failedDocuments: 0,
          pendingDocuments: 75,
        },
      };

      const response: ApiResponseSuccess<GenerationStatus> = {
        success: true,
        data: task,
        meta: this.createMeta(requestId, startTime),
      };

      res.status(200).json(response);
    } catch (error) {
      this.handleError(error, res, requestId);
    }
  }

  /**
   * 启动任务
   * POST /api/v2/batch/tasks/:id/start
   */
  async startTask(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string || uuidv4();

    try {
      const { id } = req.params;

      if (!id) {
        throw this.createValidationError('id', 'Task ID is required');
      }

      // 调用调度器启动任务
      await this.scheduler.startTask(id);

      const response: ApiResponseSuccess<{
        taskId: string;
        status: string;
        startedAt: string;
      }> = {
        success: true,
        data: {
          taskId: id,
          status: 'running',
          startedAt: new Date().toISOString(),
        },
        meta: this.createMeta(requestId, startTime),
      };

      res.status(200).json(response);
    } catch (error) {
      this.handleError(error, res, requestId);
    }
  }

  /**
   * 暂停任务
   * POST /api/v2/batch/tasks/:id/pause
   */
  async pauseTask(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string || uuidv4();

    try {
      const { id } = req.params;

      if (!id) {
        throw this.createValidationError('id', 'Task ID is required');
      }

      // 调用调度器暂停任务
      await this.scheduler.pauseTask(id);

      const response: ApiResponseSuccess<{
        taskId: string;
        status: string;
        pausedAt: string;
      }> = {
        success: true,
        data: {
          taskId: id,
          status: 'paused',
          pausedAt: new Date().toISOString(),
        },
        meta: this.createMeta(requestId, startTime),
      };

      res.status(200).json(response);
    } catch (error) {
      this.handleError(error, res, requestId);
    }
  }

  /**
   * 恢复任务
   * POST /api/v2/batch/tasks/:id/resume
   */
  async resumeTask(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string || uuidv4();

    try {
      const { id } = req.params;

      if (!id) {
        throw this.createValidationError('id', 'Task ID is required');
      }

      // 调用调度器恢复任务
      await this.scheduler.resumeTask(id);

      const response: ApiResponseSuccess<{
        taskId: string;
        status: string;
        resumedAt: string;
      }> = {
        success: true,
        data: {
          taskId: id,
          status: 'running',
          resumedAt: new Date().toISOString(),
        },
        meta: this.createMeta(requestId, startTime),
      };

      res.status(200).json(response);
    } catch (error) {
      this.handleError(error, res, requestId);
    }
  }

  /**
   * 取消任务
   * POST /api/v2/batch/tasks/:id/cancel
   */
  async cancelTask(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string || uuidv4();

    try {
      const { id } = req.params;

      if (!id) {
        throw this.createValidationError('id', 'Task ID is required');
      }

      // 调用调度器取消任务
      await this.scheduler.cancelTask(id);

      // 获取任务信息以返回完成文档数
      const progress = await this.scheduler.getTaskProgress(id);
      const completedDocuments = progress.task.execution.completedDocuments;

      const response: ApiResponseSuccess<{
        taskId: string;
        status: string;
        cancelledAt: string;
        completedDocuments: number;
        message: string;
      }> = {
        success: true,
        data: {
          taskId: id,
          status: 'cancelled',
          cancelledAt: new Date().toISOString(),
          completedDocuments,
          message: `任务已取消，已生成${completedDocuments}个文档`,
        },
        meta: this.createMeta(requestId, startTime),
      };

      res.status(200).json(response);
    } catch (error) {
      this.handleError(error, res, requestId);
    }
  }

  /**
   * 获取任务进度
   * GET /api/v2/batch/tasks/:id/progress
   */
  async getProgress(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string || uuidv4();

    try {
      const { id } = req.params;

      if (!id) {
        throw this.createValidationError('id', 'Task ID is required');
      }

      // 调用调度器获取进度
      const { task } = await this.scheduler.getTaskProgress(id);

      const progress = {
        taskId: task.id,
        progress: task.progress,
        currentStep: this.getStageMessage(task.execution.currentStage),
        completedSteps: task.execution.currentIndex,
        totalSteps: task.execution.totalDocuments,
        estimatedTimeRemaining: task.execution.estimatedTimeRemaining || 0,
        currentItem: {
          templateName: '模板',
          documentIndex: task.execution.currentIndex,
          totalDocuments: task.execution.totalDocuments,
        },
        items: task.config.templateIds.map(templateId => ({
          templateId,
          templateName: '模板',
          status: task.status,
          progress: task.progress,
          completedCount: task.execution.completedDocuments,
          totalCount: task.execution.totalDocuments,
          failedCount: task.execution.failedDocuments,
        })),
      };

      const response: ApiResponseSuccess<typeof progress> = {
        success: true,
        data: progress,
        meta: this.createMeta(requestId, startTime),
      };

      res.status(200).json(response);
    } catch (error) {
      this.handleError(error, res, requestId);
    }
  }

  /**
   * 获取阶段消息
   */
  private getStageMessage(stage: string): string {
    const messages: Record<string, string> = {
      initializing: '初始化任务...',
      loading_data: '加载数据源...',
      validating_templates: '验证模板...',
      preparing_mapping: '准备数据映射...',
      generating_documents: '生成文档中',
      compressing_output: '压缩输出...',
      uploading_results: '上传结果...',
      finalizing: '完成任务...',
    };
    return messages[stage] || '处理中...';
  }

  /**
   * 下载生成的文档
   * GET /api/v2/batch/tasks/:id/download/:templateId/:documentId
   */
  async downloadDocument(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string || uuidv4();

    try {
      const { id, templateId, documentId } = req.params;

      if (!id || !templateId || !documentId) {
        throw this.createValidationError('params', 'Task ID, Template ID, and Document ID are required');
      }

      // TODO: 调用服务获取文档
      // const { file, fileName, mimeType } = await this.batchService.getDocument(id, templateId, documentId);

      // 临时模拟 - 实际实现需要返回文件流
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="document_${documentId}.docx"`);
      res.setHeader('X-Request-ID', requestId);

      res.status(200).send();
    } catch (error) {
      this.handleError(error, res, requestId);
    }
  }

  /**
   * 下载ZIP压缩包
   * GET /api/v2/batch/tasks/:id/download/zip
   */
  async downloadZip(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string || uuidv4();

    try {
      const { id } = req.params;

      if (!id) {
        throw this.createValidationError('id', 'Task ID is required');
      }

      // 获取任务信息
      const { task } = await this.scheduler.getTaskProgress(id);

      if (task.status !== 'completed') {
        throw this.createValidationError('status', 'Task must be completed before downloading');
      }

      // 获取生成的文档结果
      const results = await this.storage.get(`batch:results:${id}`);

      if (!results || results.length === 0) {
        throw this.createValidationError('results', 'No documents found for this task');
      }

      // 创建ZIP文件
      const zip = new JSZip();

      results.forEach((result: any, index: number) => {
        const fileName = result.fileName || `document_${index + 1}.docx`;
        zip.file(fileName, result.buffer);
      });

      // 生成ZIP缓冲区
      const zipBuffer = await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      // 设置响应头
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="batch_${id}.zip"`);
      // Blob没有length属性，使用byteLength或size
      const contentLength = (zipBuffer as any).byteLength || (zipBuffer as any).size || 0;
      res.setHeader('Content-Length', contentLength);
      res.setHeader('X-Request-ID', requestId);

      res.status(200).send(zipBuffer);
    } catch (error) {
      this.handleError(error, res, requestId);
    }
  }

  /**
   * 创建验证错误
   */
  private createValidationError(field: string, message: string): Error {
    const error = new Error(message) as any;
    error.field = field;
    error.code = ApiErrorCode.VALIDATION_ERROR;
    return error;
  }

  /**
   * 创建响应元数据
   */
  private createMeta(requestId: string, startTime: number) {
    return {
      requestId,
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      executionTime: Date.now() - startTime,
    };
  }

  /**
   * 统一错误处理
   */
  private handleError(error: any, res: Response, requestId: string): void {
    logger.error('[BatchGenerationController] Error:', error);

    let errorCode = ApiErrorCode.INTERNAL_ERROR;
    let httpStatus = 500;
    let details: any[] = [];

    if (error.code) {
      errorCode = error.code;
      httpStatus = this.getHttpStatusFromErrorCode(errorCode);
    }

    if (error.field) {
      details.push({
        field: error.field,
        message: error.message,
      });
    }

    const errorResponse: ApiErrorResponse = createApiErrorResponse(
      errorCode,
      details,
      requestId
    );

    res.status(httpStatus).json(errorResponse);
  }

  /**
   * 根据错误代码获取HTTP状态码
   */
  private getHttpStatusFromErrorCode(errorCode: ApiErrorCode): number {
    const statusMap: Record<number, number> = {
      [ApiErrorCode.VALIDATION_ERROR]: 400,
      [ApiErrorCode.UNAUTHORIZED]: 401,
      [ApiErrorCode.FORBIDDEN]: 403,
      [ApiErrorCode.NOT_FOUND]: 404,
      [ApiErrorCode.TASK_NOT_FOUND]: 404,
      [ApiErrorCode.BATCH_GENERATION_FAILED]: 500,
      [ApiErrorCode.GENERATION_FAILED]: 500,
      [ApiErrorCode.DOWNLOAD_FAILED]: 500,
      [ApiErrorCode.INTERNAL_ERROR]: 500,
    };

    return statusMap[errorCode] || 500;
  }
}

// 导出单例实例和工厂函数
export const batchGenerationController = new BatchGenerationController(
  null as any, // 将在服务器初始化时注入
  null as any,
  null as any
);

/**
 * 创建批量生成控制器实例
 */
export function createBatchGenerationController(
  scheduler: BatchGenerationScheduler,
  templateManager: TemplateManager,
  websocketServer: WebSocketServer
): BatchGenerationController {
  return new BatchGenerationController(scheduler, templateManager, websocketServer);
}
