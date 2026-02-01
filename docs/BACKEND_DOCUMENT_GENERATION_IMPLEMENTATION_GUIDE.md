# 📖 后端文档生成实施指南

**版本**: 1.0.0
**日期**: 2026-02-01
**架构师**: Chief Architect
**预计工时**: 8-12小时（核心功能）

---

## 🎯 实施概述

本指南提供了将文档生成从前端迁移到后端的详细步骤。实施分为三个优先级阶段，确保系统稳定性和功能完整性。

---

## 📋 阶段1：核心功能实现 (P0 - 立即实施)

### 步骤1.1：创建后端文档生成服务

**文件**: `server/services/documentGenerationService.ts`

**实现**:

```typescript
/**
 * 文档生成服务 (Node.js环境)
 *
 * 核心职责:
 * 1. 接收模板和数据
 * 2. 应用映射方案
 * 3. 调用docxtemplater引擎
 * 4. 返回生成的文档
 *
 * @version 1.0.0
 */

import { logger } from '@/utils/logger';
import { DocxtemplaterService } from '../../services/docxtemplaterService';
import { MappingScheme, GeneratedDocument } from '../../types/documentTypes';

/**
 * 生成选项
 */
export interface GenerationOptions {
  /**
   * 使用的引擎
   * @default 'docxtemplater'
   */
  engine?: 'docxtemplater' | 'docx-templates';

  /**
   * 输出格式
   * @default 'docx'
   */
  outputFormat?: 'docx' | 'pdf';

  /**
   * 是否启用缓存
   * @default true
   */
  enableCache?: boolean;
}

/**
 * 批量生成选项
 */
export interface BatchOptions {
  /**
   * 并发数
   * @default 3
   */
  concurrency?: number;

  /**
   * 批次大小
   * @default 10
   */
  batchSize?: number;

  /**
   * 进度回调
   */
  onProgress?: (current: number, total: number) => void;

  /**
   * 失败时是否继续
   * @default true
   */
  continueOnError?: boolean;

  /**
   * 重试次数
   * @default 2
   */
  retryCount?: number;

  /**
   * 基础文件名
   */
  baseFileName?: string;
}

/**
 * 生成结果
 */
export interface GenerationResult {
  /**
   * 文档缓冲区
   */
  buffer: Buffer;

  /**
   * 文件名
   */
  fileName: string;

  /**
   * 文件大小 (字节)
   */
  size: number;

  /**
   * 生成耗时 (毫秒)
   */
  duration: number;
}

/**
 * 批量生成结果
 */
export interface BatchGenerationResult {
  /**
   * 生成的文档列表
   */
  documents: GeneratedDocument[];

  /**
   * ZIP文件缓冲区
   */
  zipBuffer: Buffer;

  /**
   * 统计信息
   */
  stats: {
    total: number;
    successful: number;
    failed: number;
    totalDuration: number;
  };
}

/**
 * 文档生成服务
 */
export class DocumentGenerationService {
  private docxtemplaterService: DocxtemplaterService;

  constructor() {
    this.docxtemplaterService = new DocxtemplaterService();
  }

  /**
   * 生成单个文档
   *
   * @param params 生成参数
   * @returns 生成结果
   */
  async generateDocument(params: {
    templateBuffer: ArrayBuffer;
    data: Record<string, any>;
    options?: GenerationOptions;
  }): Promise<GenerationResult> {
    const startTime = Date.now();
    const { templateBuffer, data, options = {} } = params;

    logger.info('[DocumentGenerationService] Starting document generation', {
      templateSize: templateBuffer.byteLength,
      dataFieldCount: Object.keys(data).length,
      engine: options.engine || 'docxtemplater'
    });

    try {
      // 1. 验证输入
      this.validateInputs(templateBuffer, data);

      // 2. 转换ArrayBuffer到Buffer (Node.js环境)
      const buffer = Buffer.from(templateBuffer);

      // 3. 调用docxtemplater生成文档
      const blob = await DocxtemplaterService.generateDocument({
        templateBuffer,
        data,
        options: {
          preserveFormatting: 'advanced',
          enableCache: options.enableCache !== false
        }
      });

      // 4. 转换Blob到Buffer (Node.js环境)
      const arrayBuffer = await blob.arrayBuffer();
      const resultBuffer = Buffer.from(arrayBuffer);

      const duration = Date.now() - startTime;

      // 5. 生成文件名
      const fileName = this.generateFileName(data, 'document');

      logger.info('[DocumentGenerationService] Document generation completed', {
        fileName,
        size: resultBuffer.length,
        duration
      });

      return {
        buffer: resultBuffer,
        fileName,
        size: resultBuffer.length,
        duration
      };

    } catch (error) {
      logger.error('[DocumentGenerationService] Document generation failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  /**
   * 批量生成文档
   *
   * @param params 批量生成参数
   * @returns 批量生成结果
   */
  async batchGenerate(params: {
    templateBuffer: ArrayBuffer;
    dataList: Record<string, any>[];
    mappingScheme?: MappingScheme;
    options?: BatchOptions;
  }): Promise<BatchGenerationResult> {
    const startTime = Date.now();
    const {
      templateBuffer,
      dataList,
      mappingScheme,
      options = {}
    } = params;

    const {
      concurrency = 3,
      batchSize = 10,
      onProgress,
      continueOnError = true,
      retryCount = 2,
      baseFileName = 'document'
    } = options;

    logger.info('[DocumentGenerationService] Starting batch generation', {
      documentCount: dataList.length,
      concurrency,
      batchSize,
      baseFileName
    });

    const documents: GeneratedDocument[] = [];
    let successful = 0;
    let failed = 0;

    try {
      // 1. 验证输入
      if (!templateBuffer || templateBuffer.byteLength === 0) {
        throw new Error('模板文件不能为空');
      }

      if (!dataList || dataList.length === 0) {
        throw new Error('数据列表不能为空');
      }

      // 2. 应用映射方案（如果提供）
      const processedDataList = mappingScheme
        ? this.applyMappingScheme(dataList, mappingScheme)
        : dataList;

      // 3. 分批处理
      for (let i = 0; i < processedDataList.length; i += batchSize) {
        const batch = processedDataList.slice(i, i + batchSize);

        logger.debug(`[DocumentGenerationService] Processing batch ${Math.floor(i / batchSize) + 1}`, {
          batchSize: batch.length,
          startIndex: i,
          endIndex: Math.min(i + batchSize, processedDataList.length)
        });

        // 4. 并发生成当前批次（控制并发数）
        const batchPromises = batch.map(async (data, batchIndex) => {
          const globalIndex = i + batchIndex;
          let attempt = 0;

          while (attempt <= retryCount) {
            try {
              const result = await this.generateDocument({
                templateBuffer,
                data,
                options: { enableCache: true }
              });

              // 智能命名
              let fileName = result.fileName;
              const nameField = this.detectNameField(data);
              if (nameField && data[nameField]) {
                fileName = this.sanitizeFileName(`${data[nameField]}.docx`);
              } else {
                fileName = this.sanitizeFileName(`${baseFileName}_${globalIndex + 1}.docx`);
              }

              successful++;

              // 报告进度
              onProgress?.(successful + failed, processedDataList.length);

              return {
                blob: new Blob([result.buffer], {
                  type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                }),
                fileName,
                dataIndex: globalIndex,
                recordData: data
              };

            } catch (error) {
              attempt++;

              if (attempt > retryCount) {
                failed++;
                logger.error(`[DocumentGenerationService] Failed to generate document ${globalIndex + 1}`, {
                  error: error instanceof Error ? error.message : String(error),
                  attempts: attempt
                });

                // 报告进度
                onProgress?.(successful + failed, processedDataList.length);

                if (!continueOnError) {
                  throw error;
                }

                return null;
              }

              // 等待后重试
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }

            return null;
          }
        });

        // 5. 控制并发执行
        const results: (GeneratedDocument | null)[] = [];
        for (let j = 0; j < batchPromises.length; j += concurrency) {
          const concurrentBatch = batchPromises.slice(j, j + concurrency);
          const concurrentResults = await Promise.all(concurrentBatch);
          results.push(...concurrentResults);
        }

        // 6. 过滤失败的文档
        for (const result of results) {
          if (result) {
            documents.push(result);
          }
        }
      }

      // 7. 创建ZIP文件
      logger.info('[DocumentGenerationService] Creating ZIP file', {
        documentCount: documents.length
      });

      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      documents.forEach(doc => {
        // 转换Blob到Buffer
        const arrayBuffer = await doc.blob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        zip.file(doc.fileName, buffer);
      });

      const zipBuffer = await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      const totalDuration = Date.now() - startTime;

      logger.info('[DocumentGenerationService] Batch generation completed', {
        successful,
        failed,
        totalDuration,
        avgTime: totalDuration / dataList.length,
        zipSize: zipBuffer.length
      });

      return {
        documents,
        zipBuffer,
        stats: {
          total: dataList.length,
          successful,
          failed,
          totalDuration
        }
      };

    } catch (error) {
      logger.error('[DocumentGenerationService] Batch generation failed', {
        error: error instanceof Error ? error.message : String(error),
        successful,
        failed
      });
      throw error;
    }
  }

  /**
   * 验证输入参数
   */
  private validateInputs(templateBuffer: ArrayBuffer, data: Record<string, any>): void {
    if (!templateBuffer || templateBuffer.byteLength === 0) {
      throw new Error('模板文件不能为空');
    }

    if (!data || typeof data !== 'object') {
      throw new Error('数据格式无效');
    }

    if (templateBuffer.byteLength > 10 * 1024 * 1024) {
      throw new Error('模板文件大小不能超过10MB');
    }
  }

  /**
   * 应用映射方案到数据
   */
  private applyMappingScheme(
    dataList: Record<string, any>[],
    mappingScheme: MappingScheme
  ): Record<string, any>[] {
    return dataList.map(row => {
      const mappedData: Record<string, any> = {};

      mappingScheme.mappings.forEach(mapping => {
        const key = mapping.placeholder.replace(/\{\{|\}\}/g, '').trim();
        mappedData[key] = row[mapping.excelColumn];
      });

      return mappedData;
    });
  }

  /**
   * 生成文件名
   */
  private generateFileName(data: Record<string, any>, defaultName: string): string {
    const nameField = this.detectNameField(data);
    if (nameField && data[nameField]) {
      return this.sanitizeFileName(`${data[nameField]}.docx`);
    }
    return `${defaultName}_${Date.now()}.docx`;
  }

  /**
   * 检测名称字段
   */
  private detectNameField(data: Record<string, any>): string | null {
    const nameFields = [
      'name', '名称',
      'title', '标题',
      'subject', '主题',
      'productName', '产品名称',
      'companyName', '公司名称',
      'customerName', '客户名称',
      'employeeName', '员工姓名',
      'studentName', '学生姓名'
    ];

    for (const field of nameFields) {
      if (data[field] && typeof data[field] === 'string' && data[field].trim()) {
        return field;
      }
    }

    return null;
  }

  /**
   * 清理文件名
   */
  private sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, '_')
      .replace(/[\x00-\x1f\x80-\x9f]/g, '')
      .replace(/^\.+/, '')
      .substring(0, 100);
  }
}

// 导出单例实例
export const documentGenerationService = new DocumentGenerationService();
```

---

### 步骤1.2：创建API控制器

**文件**: `api/controllers/documentGenerationController.ts`

**实现**:

```typescript
/**
 * 文档生成 API 控制器
 *
 * 负责处理文档生成相关的HTTP请求
 *
 * @version 1.0.0
 */

import { logger } from '@/utils/logger';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  documentGenerationService,
  GenerationResult,
  BatchGenerationResult
} from '../../server/services/documentGenerationService';
import {
  ApiResponseSuccess,
  ApiErrorResponse
} from '../../types/apiTypes';
import { ApiErrorCode, createApiErrorResponse } from '../../types/errorCodes';
import { createLocalStorageService } from '../../services/storage/LocalStorageService';

/**
 * 文档生成控制器
 */
export class DocumentGenerationController {
  private storage: any;

  constructor() {
    this.storage = createLocalStorageService({ prefix: 'doc_gen_' });
  }

  /**
   * 生成单个文档
   * POST /api/v2/generation/generate
   */
  async generateSingle(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const requestId = (req.headers['x-request-id'] as string) || uuidv4();

    try {
      const { templateFile, data, mappingScheme, options } = req.body;

      // 1. 验证必填字段
      if (!templateFile) {
        throw this.createValidationError('templateFile', 'templateFile is required');
      }

      if (!data) {
        throw this.createValidationError('data', 'data is required');
      }

      // 2. 解码Base64模板
      const templateBuffer = this.decodeBase64(templateFile);

      // 3. 生成文档
      const result: GenerationResult = await documentGenerationService.generateDocument({
        templateBuffer,
        data,
        options
      });

      // 4. 存储文档（临时）
      const documentId = `doc_${uuidv4()}`;
      await this.storage.set(documentId, result.buffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileName: result.fileName
      });

      // 5. 返回结果
      const response: ApiResponseSuccess<{
        documentId: string;
        fileName: string;
        fileSize: number;
        downloadUrl: string;
        base64: string;
      }> = {
        success: true,
        data: {
          documentId,
          fileName: result.fileName,
          fileSize: result.size,
          downloadUrl: `/api/v2/generation/download/${documentId}`,
          base64: result.buffer.toString('base64')
        },
        meta: this.createMeta(requestId, startTime)
      };

      res.status(200).json(response);

    } catch (error) {
      this.handleError(error, res, requestId);
    }
  }

  /**
   * 批量生成文档
   * POST /api/v2/generation/batch
   */
  async generateBatch(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const requestId = (req.headers['x-request-id'] as string) || uuidv4();

    try {
      const { templateFile, dataList, mappingScheme, options } = req.body;

      // 1. 验证必填字段
      if (!templateFile) {
        throw this.createValidationError('templateFile', 'templateFile is required');
      }

      if (!dataList || !Array.isArray(dataList)) {
        throw this.createValidationError('dataList', 'dataList must be an array');
      }

      if (dataList.length === 0) {
        throw this.createValidationError('dataList', 'dataList cannot be empty');
      }

      // 2. 解码Base64模板
      const templateBuffer = this.decodeBase64(templateFile);

      // 3. 批量生成
      const result: BatchGenerationResult = await documentGenerationService.batchGenerate({
        templateBuffer,
        dataList,
        mappingScheme,
        options: {
          ...options,
          onProgress: (current, total) => {
            logger.debug(`[DocumentGenerationController] Progress: ${current}/${total}`);
            // TODO: 通过WebSocket推送进度
          }
        }
      });

      // 4. 存储ZIP文件（临时）
      const taskId = `task_${uuidv4()}`;
      await this.storage.set(taskId, result.zipBuffer, {
        contentType: 'application/zip',
        fileName: `${options?.baseFileName || 'documents'}.zip`
      });

      // 5. 返回结果
      const response: ApiResponseSuccess<{
        taskId: string;
        status: string;
        documentCount: number;
        documents: Array<{
          documentId: string;
          fileName: string;
          dataIndex: number;
        }>;
        downloadUrl: string;
        zipUrl: string;
        stats: {
          total: number;
          successful: number;
          failed: number;
          totalDuration: number;
        };
      }> = {
        success: true,
        data: {
          taskId,
          status: 'completed',
          documentCount: result.documents.length,
          documents: result.documents.map((doc, index) => ({
            documentId: `${taskId}_doc_${index}`,
            fileName: doc.fileName,
            dataIndex: doc.dataIndex
          })),
          downloadUrl: `/api/v2/generation/batch/download/${taskId}`,
          zipUrl: `/api/v2/generation/batch/download/zip/${taskId}`,
          stats: result.stats
        },
        meta: this.createMeta(requestId, startTime)
      };

      res.status(200).json(response);

    } catch (error) {
      this.handleError(error, res, requestId);
    }
  }

  /**
   * 下载生成的文档
   * GET /api/v2/generation/download/:documentId
   */
  async downloadDocument(req: Request, res: Response): Promise<void> {
    const requestId = (req.headers['x-request-id'] as string) || uuidv4();

    try {
      const { documentId } = req.params;

      if (!documentId) {
        throw this.createValidationError('documentId', 'documentId is required');
      }

      // 从存储中获取文档
      const stored = await this.storage.get(documentId);

      if (!stored) {
        throw this.createValidationError('documentId', 'Document not found');
      }

      const buffer = Buffer.from(stored.data);
      const metadata = stored.metadata || {};

      res.setHeader('Content-Type', metadata.contentType || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${metadata.fileName || 'document.docx'}"`);
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('X-Request-ID', requestId);

      res.status(200).send(buffer);

    } catch (error) {
      this.handleError(error, res, requestId);
    }
  }

  /**
   * 下载批量生成的ZIP
   * GET /api/v2/generation/batch/download/zip/:taskId
   */
  async downloadZip(req: Request, res: Response): Promise<void> {
    const requestId = (req.headers['x-request-id'] as string) || uuidv4();

    try {
      const { taskId } = req.params;

      if (!taskId) {
        throw this.createValidationError('taskId', 'taskId is required');
      }

      // 从存储中获取ZIP
      const stored = await this.storage.get(taskId);

      if (!stored) {
        throw this.createValidationError('taskId', 'ZIP file not found');
      }

      const buffer = Buffer.from(stored.data);
      const metadata = stored.metadata || {};

      res.setHeader('Content-Type', metadata.contentType || 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${metadata.fileName || 'documents.zip'}"`);
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('X-Request-ID', requestId);

      res.status(200).send(buffer);

    } catch (error) {
      this.handleError(error, res, requestId);
    }
  }

  /**
   * 解码Base64数据
   */
  private decodeBase64(base64: string): ArrayBuffer {
    const buffer = Buffer.from(base64, 'base64');
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
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
      executionTime: Date.now() - startTime
    };
  }

  /**
   * 统一错误处理
   */
  private handleError(error: any, res: Response, requestId: string): void {
    logger.error('[DocumentGenerationController] Error:', error);

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
        message: error.message
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
      [ApiErrorCode.GENERATION_FAILED]: 500,
      [ApiErrorCode.INTERNAL_ERROR]: 500
    };

    return statusMap[errorCode] || 500;
  }
}

// 导出单例实例
export const documentGenerationController = new DocumentGenerationController();
```

---

### 步骤1.3：创建前端调用服务

**文件**: `services/backendDocumentService.ts`

**实现**:

```typescript
/**
 * 后端文档生成服务 (前端调用)
 *
 * 负责调用后端API进行文档生成
 *
 * @version 1.0.0
 */

import { logger } from '@/utils/logger';
import { MappingScheme, GeneratedDocument } from '../types/documentTypes';

/**
 * 生成选项
 */
export interface BackendGenerationOptions {
  engine?: 'docxtemplater' | 'docx-templates';
  outputFormat?: 'docx' | 'pdf';
}

/**
 * 批量生成选项
 */
export interface BackendBatchOptions {
  concurrency?: number;
  batchSize?: number;
  baseFileName?: string;
  onProgress?: (current: number, total: number) => void;
}

/**
 * API响应
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any[];
  };
  meta?: {
    requestId: string;
    timestamp: string;
    executionTime: number;
  };
}

/**
 * 后端文档生成服务
 */
export class BackendDocumentService {
  private apiBaseUrl: string;

  constructor() {
    // 使用环境变量或默认值
    this.apiBaseUrl = process.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v2';
  }

  /**
   * 生成单个文档
   */
  async generateDocument(params: {
    templateFile: File | ArrayBuffer;
    data: Record<string, any>;
    mappingScheme?: MappingScheme;
    options?: BackendGenerationOptions;
  }): Promise<Blob> {
    const { templateFile, data, mappingScheme, options } = params;

    logger.info('[BackendDocumentService] Generating single document', {
      dataFieldCount: Object.keys(data).length,
      engine: options?.engine || 'docxtemplater'
    });

    try {
      // 1. 转换模板为Base64
      const templateBase64 = await this.fileToBase64(templateFile);

      // 2. 构建请求
      const requestBody = {
        templateFile: templateBase64,
        data,
        mappingScheme,
        options
      };

      // 3. 调用API
      const response = await fetch(`${this.apiBaseUrl}/generation/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': this.generateRequestId()
        },
        body: JSON.stringify(requestBody)
      });

      // 4. 解析响应
      const result: ApiResponse<{
        documentId: string;
        fileName: string;
        fileSize: number;
        downloadUrl: string;
        base64: string;
      }> = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error?.message || '文档生成失败');
      }

      // 5. 转换Base64为Blob
      const binaryString = atob(result.data.base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([bytes], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      logger.info('[BackendDocumentService] Document generated successfully', {
        fileName: result.data.fileName,
        fileSize: result.data.fileSize
      });

      return blob;

    } catch (error) {
      logger.error('[BackendDocumentService] Document generation failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * 批量生成文档
   */
  async batchGenerate(params: {
    templateFile: File | ArrayBuffer;
    dataList: Record<string, any>[];
    mappingScheme?: MappingScheme;
    baseFileName: string;
    options?: BackendBatchOptions;
  }): Promise<GeneratedDocument[]> {
    const { templateFile, dataList, mappingScheme, baseFileName, options } = params;

    logger.info('[BackendDocumentService] Starting batch generation', {
      documentCount: dataList.length,
      baseFileName
    });

    try {
      // 1. 转换模板为Base64
      const templateBase64 = await this.fileToBase64(templateFile);

      // 2. 构建请求
      const requestBody = {
        templateFile: templateBase64,
        dataList,
        mappingScheme,
        options: {
          ...options,
          baseFileName
        }
      };

      // 3. 调用API
      const response = await fetch(`${this.apiBaseUrl}/generation/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': this.generateRequestId()
        },
        body: JSON.stringify(requestBody)
      });

      // 4. 解析响应
      const result: ApiResponse<{
        taskId: string;
        status: string;
        documentCount: number;
        documents: Array<{
          documentId: string;
          fileName: string;
          dataIndex: number;
        }>;
        downloadUrl: string;
        zipUrl: string;
        stats: {
          total: number;
          successful: number;
          failed: number;
          totalDuration: number;
        };
      }> = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error?.message || '批量生成失败');
      }

      // 5. 转换为GeneratedDocument格式
      const documents: GeneratedDocument[] = result.data.documents.map(doc => ({
        blob: new Blob([], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
        fileName: doc.fileName,
        dataIndex: doc.dataIndex,
        recordData: dataList[doc.dataIndex]
      }));

      // 6. 模拟进度回调（因为后端是同步完成）
      if (options?.onProgress) {
        const total = result.data.stats.total;
        for (let i = 1; i <= total; i++) {
          options.onProgress(i, total);
        }
      }

      logger.info('[BackendDocumentService] Batch generation completed', {
        documentCount: result.data.documentCount,
        successful: result.data.stats.successful,
        failed: result.data.stats.failed,
        duration: result.data.stats.totalDuration
      });

      return documents;

    } catch (error) {
      logger.error('[BackendDocumentService] Batch generation failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * 下载生成的ZIP文件
   */
  async downloadZip(taskId: string): Promise<Blob> {
    logger.info('[BackendDocumentService] Downloading ZIP', { taskId });

    try {
      const response = await fetch(`${this.apiBaseUrl}/generation/batch/download/zip/${taskId}`, {
        method: 'GET',
        headers: {
          'X-Request-ID': this.generateRequestId()
        }
      });

      if (!response.ok) {
        throw new Error(`下载失败: ${response.statusText}`);
      }

      const blob = await response.blob();

      logger.info('[BackendDocumentService] ZIP downloaded successfully', {
        size: blob.size
      });

      return blob;

    } catch (error) {
      logger.error('[BackendDocumentService] ZIP download failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * 转换文件为Base64
   */
  private async fileToBase64(file: File | ArrayBuffer): Promise<string> {
    let arrayBuffer: ArrayBuffer;

    if (file instanceof File) {
      arrayBuffer = await file.arrayBuffer();
    } else {
      arrayBuffer = file;
    }

    const buffer = Buffer.from(arrayBuffer);
    return buffer.toString('base64');
  }

  /**
   * 生成请求ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// 导出单例实例
export const backendDocumentService = new BackendDocumentService();
```

---

### 步骤1.4：修改路由配置

**文件**: `api/routes/v2.ts`

**添加以下代码**:

```typescript
// 在文件顶部添加导入
import {
  documentGenerationController,
} from '../controllers/documentGenerationController';

// 在createV2Router函数中添加新路由
export function createV2Router(): Router {
  const router = Router();

  // ... 现有路由 ...

  // ========================================================================
  // 文档生成模块 (NEW - 后端文档生成)
  // ========================================================================

  const generationRouter = Router();

  generationRouter.post(
    '/generate',
    requireAuth,
    requireExecute,
    asyncHandler(documentGenerationController.generateSingle.bind(documentGenerationController))
  );

  generationRouter.post(
    '/batch',
    requireAuth,
    requireExecute,
    asyncHandler(documentGenerationController.generateBatch.bind(documentGenerationController))
  );

  generationRouter.get(
    '/download/:documentId',
    requireAuth,
    requireRead,
    asyncHandler(documentGenerationController.downloadDocument.bind(documentGenerationController))
  );

  generationRouter.get(
    '/batch/download/zip/:taskId',
    requireAuth,
    requireRead,
    asyncHandler(documentGenerationController.downloadZip.bind(documentGenerationController))
  );

  router.use('/generation', generationRouter);

  return router;
}
```

---

### 步骤1.5：修改前端组件

**文件**: `components/DocumentSpace/DocumentSpace.tsx`

**修改 `handleGenerateDocs` 函数**:

```typescript
import { BackendDocumentService } from '../../services/backendDocumentService';

// 在组件内部
const handleGenerateDocs = useCallback(async () => {
  logger.info('[DocumentSpace] 开始生成文档', {
    generationMode,
    hasTemplate: !!templateFile,
    hasData: !!excelData,
    hasMapping: !!mappingScheme
  });

  // Route to appropriate handler based on generation mode
  if (generationMode === 'aggregate') {
    return handleAggregateGeneration();
  }

  if (!templateFile || !excelData || !mappingScheme) {
    const errorMsg = '请先生成映射方案';
    logger.warn('[DocumentSpace] 生成文档失败', { reason: errorMsg });
    addLogWithMetrics('generating', 'error', errorMsg);
    return;
  }

  startProcessing('document_generation');
  updateProgress(0);
  addLogWithMetrics('generating', 'pending', '正在批量生成Word文档...');

  const trackerId = PerformanceTracker.startTracking('document.generation');
  const startTime = performance.now();

  try {
    // 使用映射方案中的主Sheet
    const sheetToUse = mappingScheme.primarySheet || excelData.currentSheetName;
    const primarySheetData = excelData.sheets[sheetToUse] || [];
    const baseFileName = templateFile.name.replace('.docx', '');

    // ✅ 使用后端服务生成文档
    const backendService = new BackendDocumentService();

    addLogWithMetrics('generating', 'pending',
      `使用主数据表 "${sheetToUse}" (${primarySheetData.length}行) 生成文档...`
    );

    // 跨Sheet映射处理
    const hasCrossSheetMappings = mappingScheme.crossSheetMappings &&
                                   mappingScheme.crossSheetMappings.length > 0;

    if (hasCrossSheetMappings) {
      addLogWithMetrics('generating', 'info',
        `检测到 ${mappingScheme.crossSheetMappings!.length} 个跨Sheet映射，正在构建查找索引...`
      );
    }

    // 为跨Sheet映射构建查找索引（性能优化）
    const crossSheetIndexes = new Map<string, Map<string, any>>();
    let totalIndexedRows = 0;

    if (hasCrossSheetMappings) {
      mappingScheme.crossSheetMappings!.forEach(crossMapping => {
        const sourceSheet = excelData.sheets[crossMapping.sourceSheet];
        if (sourceSheet) {
          const index = buildLookupIndex(sourceSheet, crossMapping.lookupKey);
          crossSheetIndexes.set(crossMapping.sourceSheet, index);
          totalIndexedRows += sourceSheet.length;
          addLogWithMetrics('generating', 'info',
            `为Sheet "${crossMapping.sourceSheet}" 构建索引 (${sourceSheet.length}行，键字段: ${crossMapping.lookupKey})`
          );
        } else {
          addLogWithMetrics('generating', 'warning',
            `找不到来源Sheet: ${crossMapping.sourceSheet}`
          );
        }
      });
    }

    // 统计跨Sheet查找的成功率
    let crossSheetLookupSuccess = 0;
    let crossSheetLookupTotal = 0;

    // 构建映射数据
    const mappedDataList = primarySheetData.map((row: any, rowIndex: number) => {
      const mappedData: any = {};

      // 1. 处理主Sheet的字段映射
      mappingScheme.mappings.forEach(mapping => {
        const key = mapping.placeholder.replace(/\{\{|\}\}/g, '').trim();
        mappedData[key] = row[mapping.excelColumn];
      });

      // 2. 处理跨Sheet映射
      if (hasCrossSheetMappings) {
        mappingScheme.crossSheetMappings!.forEach(crossMapping => {
          const lookupValue = String(row[crossMapping.lookupKey] || '');
          const key = crossMapping.placeholder.replace(/\{\{|\}\}/g, '').trim();

          if (!lookupValue) {
            if (rowIndex < 3) {
              addLogWithMetrics('generating', 'warning',
                `第${rowIndex + 1}行: 关联字段 "${crossMapping.lookupKey}" 为空，无法查找跨Sheet数据`
              );
            }
            mappedData[key] = '';
            return;
          }

          crossSheetLookupTotal++;

          // 使用预构建的索引进行快速查找
          const sourceIndex = crossSheetIndexes.get(crossMapping.sourceSheet);
          let matchedRow: any = null;

          if (sourceIndex) {
            matchedRow = sourceIndex.get(lookupValue);
          }

          if (matchedRow) {
            mappedData[key] = matchedRow[crossMapping.sourceColumn];
            crossSheetLookupSuccess++;
          } else {
            if (rowIndex < 3) {
              addLogWithMetrics('generating', 'warning',
                `第${rowIndex + 1}行: 在Sheet "${crossMapping.sourceSheet}" 中找不到关联键 "${lookupValue}" 对应的数据`
              );
            }
            mappedData[key] = '';
          }
        });
      }

      return mappedData;
    });

    // 报告跨Sheet查找统计
    if (hasCrossSheetMappings && crossSheetLookupTotal > 0) {
      const successRate = ((crossSheetLookupSuccess / crossSheetLookupTotal) * 100).toFixed(1);
      addLogWithMetrics('generating', 'info',
        `跨Sheet查找统计: 成功 ${crossSheetLookupSuccess}/${crossSheetLookupTotal} (${successRate}%)`
      );
    }

    // ✅ 调用后端API生成文档
    logger.info('[DocumentSpace] 调用后端生成API', {
      templateSize: templateFile.arrayBuffer.byteLength,
      dataCount: mappedDataList.length,
      concurrency: 3
    });

    const documents = await backendService.batchGenerate({
      templateFile: templateFile.arrayBuffer,
      dataList: mappedDataList,
      mappingScheme,
      baseFileName: baseFileName,
      options: {
        concurrency: 3,
        batchSize: 10,
        onProgress: (current, total) => {
          const percentage = Math.round((current / total) * 100);
          updateProgress(percentage);
          logger.debug('[DocumentSpace] 生成进度', { current, total, percentage });
          addLogWithMetrics('generating', 'pending',
            `正在生成文档: ${current}/${total} (${percentage}%)`
          );
        }
      }
    });

    logger.info('[DocumentSpace] 批量生成完成', {
      documentCount: documents.length,
      duration: performance.now() - startTime
    });

    setGeneratedDocs(documents);
    setActiveTab('generate');

    const duration = performance.now() - startTime;
    PerformanceTracker.stopTracking(trackerId, duration);

    // 构建成功消息
    let successMessage = `成功生成 ${documents.length} 个Word文档`;
    if (hasCrossSheetMappings) {
      const successRate = crossSheetLookupTotal > 0
        ? `，跨Sheet查找成功率 ${((crossSheetLookupSuccess / crossSheetLookupTotal) * 100).toFixed(1)}%`
        : '';
      successMessage += ` (使用 ${mappingScheme.crossSheetMappings!.length} 个跨Sheet映射${successRate})`;
    }

    addLogWithMetrics('generating', 'success', successMessage,
      {
        duration,
        documentCount: documents.length,
        avgTime: duration / documents.length,
        crossSheetMappingCount: hasCrossSheetMappings ? mappingScheme.crossSheetMappings!.length : 0,
        crossSheetLookupSuccess,
        crossSheetLookupTotal,
        indexedRows: totalIndexedRows
      }
    );

    // 记录性能指标
    recordMetric({
      type: 'custom',
      name: 'batch.generate',
      value: duration,
      unit: 'ms',
      timestamp: Date.now(),
      metadata: {
        documentCount: documents.length,
        avgTime: duration / documents.length,
        crossSheetMappings: hasCrossSheetMappings ? mappingScheme.crossSheetMappings!.length : 0,
        lookupSuccessRate: crossSheetLookupTotal > 0
          ? (crossSheetLookupSuccess / crossSheetLookupTotal) * 100
          : 100
      }
    });

    // 更新性能指标
    updatePerformanceMetric('documentGeneration', duration);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('[DocumentSpace] 文档生成失败', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      templateFile: templateFile?.name,
      dataFile: dataFile?.name,
      mappingCount: mappingScheme?.mappings.length
    });
    addLogWithMetrics('generating', 'error', `文档生成失败: ${errorMessage}`);
  } finally {
    finishProcessing();
    updateProgress(100);
  }
}, [templateFile, excelData, mappingScheme, generationMode, buildLookupIndex, addLogWithMetrics, startProcessing, updateProgress, setGeneratedDocs, setActiveTab, finishProcessing, updatePerformanceMetric, handleAggregateGeneration]);
```

---

## 📋 实施检查清单

### 准备工作

- [ ] 备份当前代码
- [ ] 创建新分支 `feature/backend-document-generation`
- [ ] 设置开发环境
- [ ] 安装必要依赖

### 后端实现

- [ ] 创建 `server/services/documentGenerationService.ts`
- [ ] 创建 `api/controllers/documentGenerationController.ts`
- [ ] 修改 `api/routes/v2.ts` 添加新路由
- [ ] 添加类型定义文件
- [ ] 添加单元测试

### 前端实现

- [ ] 创建 `services/backendDocumentService.ts`
- [ ] 修改 `components/DocumentSpace/DocumentSpace.tsx`
- [ ] 更新导入语句
- [ ] 添加错误处理
- [ ] 添加集成测试

### 测试验证

- [ ] 单元测试通过
- [ ] 集成测试通过
- [ ] 手动测试通过
- [ ] 性能测试通过
- [ ] 错误处理测试通过

### 文档更新

- [ ] 更新API文档
- [ ] 更新用户手册
- [ ] 更新开发者指南
- [ ] 添加迁移指南

---

## 🧪 测试用例

### 单元测试

```typescript
// server/services/documentGenerationService.test.ts
describe('DocumentGenerationService', () => {
  it('should generate single document', async () => {
    const service = new DocumentGenerationService();
    const result = await service.generateDocument({
      templateBuffer: mockTemplate,
      data: { name: '张三' }
    });
    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.fileName).toContain('张三');
  });

  it('should handle batch generation', async () => {
    const service = new DocumentGenerationService();
    const result = await service.batchGenerate({
      templateBuffer: mockTemplate,
      dataList: [
        { name: '张三' },
        { name: '李四' }
      ],
      options: { baseFileName: 'test' }
    });
    expect(result.documents).toHaveLength(2);
    expect(result.stats.successful).toBe(2);
  });
});
```

### 集成测试

```typescript
// tests/integration/documentGeneration.integration.test.ts
describe('Document Generation API', () => {
  it('POST /api/v2/generation/generate', async () => {
    const response = await request(app)
      .post('/api/v2/generation/generate')
      .send({
        templateFile: base64Template,
        data: { name: '张三' }
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.documentId).toBeDefined();
  });

  it('POST /api/v2/generation/batch', async () => {
    const response = await request(app)
      .post('/api/v2/generation/batch')
      .send({
        templateFile: base64Template,
        dataList: [
          { name: '张三' },
          { name: '李四' }
        ]
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.documentCount).toBe(2);
  });
});
```

---

## 📚 相关文档

- [BACKEND_DOCUMENT_GENERATION_ARCHITECTURE.md](./BACKEND_DOCUMENT_GENERATION_ARCHITECTURE.md) - 架构设计
- [API_SPECIFICATION_PHASE2.md](./API_SPECIFICATION_PHASE2.md) - API规范
- [FRONTEND_REFACTORING_GUIDE.md](./FRONTEND_REFACTORING_GUIDE.md) - 前端重构指南

---

**文档状态**: ✅ 实施指南完成
**下一步**: 开始实施阶段1核心功能
