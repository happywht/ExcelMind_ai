/**
 * 模板管理 API 控制器
 *
 * 提供模板上传、管理、预览等功能
 * 基于 API_SPECIFICATION_PHASE2.md 规范
 */

import { logger } from '@/utils/logger';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  Template,
  TemplateUploadRequest,
  ApiResponseSuccess,
  PaginatedResponse,
  QueryParams,
  ApiErrorResponse,
} from '../../src/types/apiTypes';
import { ApiErrorCode, createApiErrorResponse } from '../../src/types/errorCodes';

// 导入服务层（这些服务需要在后续实现）
// import { TemplateService } from '../../src/services/TemplateService';
// import { TemplateParser } from '../../src/services/quality/TemplateParser';

/**
 * 模板管理控制器
 */
export class TemplateController {
  /**
   * 构造函数
   */
  constructor(
    // private templateService: TemplateService,
    // private templateParser: TemplateParser
  ) {
    // TODO: 注入服务依赖
  }

  /**
   * 上传模板
   * POST /api/v2/templates
   */
  async upload(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string || uuidv4();

    try {
      // 处理 multipart/form-data
      if (!req.file) {
        throw this.createValidationError('file', 'Template file is required');
      }

      const { name, description, category, tags, mappings } = req.body;

      if (!name) {
        throw this.createValidationError('name', 'Template name is required');
      }

      // TODO: 调用服务处理上传
      // const template = await this.templateService.uploadTemplate({
      //   file: req.file,
      //   name,
      //   description,
      //   category,
      //   tags: tags ? JSON.parse(tags) : [],
      //   mappings: mappings ? JSON.parse(mappings) : undefined,
      // });

      // 临时模拟响应
      const template: Template = {
        templateId: `tmpl_${Date.now()}_${uuidv4().substring(0, 6)}`,
        name,
        status: 'active',
        file: {
          fileName: req.file.originalname,
          fileSize: req.file.size,
          uploadTime: new Date().toISOString(),
        },
        metadata: {
          placeholders: [],
          hasLoops: false,
          hasConditionals: false,
          hasTables: false,
          pageCount: 1,
        },
        description,
        category,
        tags: tags ? JSON.parse(tags) : [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const response: ApiResponseSuccess<Template> = {
        success: true,
        data: template,
        meta: this.createMeta(requestId, startTime),
      };

      res.status(201).json(response);
    } catch (error) {
      this.handleError(error, res, requestId);
    }
  }

  /**
   * 列出模板
   * GET /api/v2/templates
   */
  async list(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string || uuidv4();

    try {
      const queryParams: QueryParams = {
        page: parseInt(req.query.page as string) || 1,
        pageSize: parseInt(req.query.pageSize as string) || 20,
        sortBy: (req.query.sortBy as string) || 'createdAt',
        order: (req.query.order as string) === 'asc' ? 'asc' : 'desc',
      };

      const filters = {
        category: req.query.category as string,
        status: req.query.status as string,
        search: req.query.search as string,
      };

      // TODO: 调用服务获取模板列表
      // const result = await this.templateService.listTemplates(queryParams, filters);

      // 临时模拟响应
      const items: Template[] = [
        {
          templateId: 'tmpl_001',
          name: '销售合同模板',
          category: '合同',
          description: '用于生成销售合同',
          status: 'active',
          tags: ['销售', '合同'],
          file: {
            fileName: '销售合同模板.docx',
            fileSize: 45678,
            uploadTime: '2026-01-20T10:00:00Z',
            downloadUrl: '/api/v2/templates/tmpl_001/download',
          },
          metadata: {
            placeholders: [],
            hasLoops: false,
            hasConditionals: false,
            hasTables: false,
            pageCount: 1,
          },
          createdAt: '2026-01-20T10:00:00Z',
          updatedAt: '2026-01-25T10:30:00Z',
        },
        {
          templateId: 'tmpl_002',
          name: '采购订单模板',
          category: '订单',
          description: '用于生成采购订单',
          status: 'active',
          tags: ['采购', '订单'],
          file: {
            fileName: '采购订单模板.docx',
            fileSize: 34567,
            uploadTime: '2026-01-18T10:00:00Z',
            downloadUrl: '/api/v2/templates/tmpl_002/download',
          },
          metadata: {
            placeholders: [],
            hasLoops: false,
            hasConditionals: false,
            hasTables: false,
            pageCount: 1,
          },
          createdAt: '2026-01-18T10:00:00Z',
          updatedAt: '2026-01-22T10:30:00Z',
        },
      ];

      const pagination = {
        page: queryParams.page,
        pageSize: queryParams.pageSize,
        total: items.length,
        totalPages: Math.ceil(items.length / queryParams.pageSize),
        hasNext: queryParams.page < Math.ceil(items.length / queryParams.pageSize),
        hasPrev: queryParams.page > 1,
      };

      const response: ApiResponseSuccess<PaginatedResponse<Template>> = {
        success: true,
        data: {
          items,
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
   * 获取模板详情
   * GET /api/v2/templates/:id
   */
  async get(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string || uuidv4();

    try {
      const { id } = req.params;

      if (!id) {
        throw this.createValidationError('id', 'Template ID is required');
      }

      // TODO: 调用服务获取模板详情
      // const template = await this.templateService.getTemplate(id);

      // 临时模拟响应
      const template: Template = {
        templateId: id,
        name: '销售合同模板',
        category: '合同',
        description: '用于生成销售合同的标准模板',
        status: 'active',
        tags: ['销售', '合同', '标准'],
        file: {
          fileName: '销售合同模板.docx',
          fileSize: 45678,
          uploadTime: '2026-01-20T10:00:00Z',
          downloadUrl: `/api/v2/templates/${id}/download`,
        },
        metadata: {
          placeholders: [
            {
              key: '合同编号',
              rawPlaceholder: '{{合同编号}}',
              dataType: 'string',
              required: true,
              format: undefined,
              context: {
                section: '基本信息',
                position: 1,
              },
            },
            {
              key: '合同金额',
              rawPlaceholder: '{{合同金额}}',
              dataType: 'number',
              required: true,
              format: 'currency',
              context: {
                section: '金额信息',
                position: 3,
              },
            },
          ],
          hasLoops: true,
          hasConditionals: true,
          hasTables: true,
          pageCount: 5,
          wordCount: 1500,
        },
        defaultMappings: {
          explanation: '基于模板内容自动生成的映射方案',
          filterCondition: null,
          primarySheet: 'Sheet1',
          mappings: [
            {
              placeholder: '{{合同编号}}',
              excelColumn: 'contract_id',
              confidence: 1.0,
            },
            {
              placeholder: '{{合同金额}}',
              excelColumn: 'amount',
              confidence: 0.95,
            },
          ],
          crossSheetMappings: [],
          unmappedPlaceholders: [],
        },
        usageStats: {
          totalGenerations: 125,
          lastUsed: '2026-01-24T15:30:00Z',
          successRate: 0.98,
        },
        createdAt: '2026-01-20T10:00:00Z',
        updatedAt: '2026-01-25T10:30:00Z',
      };

      const response: ApiResponseSuccess<Template> = {
        success: true,
        data: template,
        meta: this.createMeta(requestId, startTime),
      };

      res.status(200).json(response);
    } catch (error) {
      this.handleError(error, res, requestId);
    }
  }

  /**
   * 更新模板
   * PUT /api/v2/templates/:id
   */
  async update(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string || uuidv4();

    try {
      const { id } = req.params;
      const { name, description, category, tags } = req.body;

      if (!id) {
        throw this.createValidationError('id', 'Template ID is required');
      }

      // TODO: 调用服务更新模板
      // const template = await this.templateService.updateTemplate(id, {
      //   name,
      //   description,
      //   category,
      //   tags,
      // });

      // 临时模拟响应
      const template = {
        templateId: id,
        name: name || 'Updated Template',
        updatedAt: new Date().toISOString(),
      };

      const response: ApiResponseSuccess<typeof template> = {
        success: true,
        data: template,
        meta: this.createMeta(requestId, startTime),
      };

      res.status(200).json(response);
    } catch (error) {
      this.handleError(error, res, requestId);
    }
  }

  /**
   * 删除模板
   * DELETE /api/v2/templates/:id
   */
  async delete(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string || uuidv4();

    try {
      const { id } = req.params;

      if (!id) {
        throw this.createValidationError('id', 'Template ID is required');
      }

      // TODO: 调用服务删除模板
      // await this.templateService.deleteTemplate(id);

      res.status(204).send();
    } catch (error) {
      this.handleError(error, res, requestId);
    }
  }

  /**
   * 预览模板
   * POST /api/v2/templates/:id/preview
   */
  async preview(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string || uuidv4();

    try {
      const { id } = req.params;
      const { data } = req.body;

      if (!id) {
        throw this.createValidationError('id', 'Template ID is required');
      }

      if (!data) {
        throw this.createValidationError('data', 'Preview data is required');
      }

      // TODO: 调用服务生成预览
      // const previewUrl = await this.templateService.generatePreview(id, data);

      // 临时模拟响应
      const preview = {
        templateId: id,
        previewUrl: `/api/v2/templates/${id}/preview/preview_${Date.now()}.docx`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        generatedAt: new Date().toISOString(),
      };

      const response: ApiResponseSuccess<typeof preview> = {
        success: true,
        data: preview,
        meta: this.createMeta(requestId, startTime),
      };

      res.status(200).json(response);
    } catch (error) {
      this.handleError(error, res, requestId);
    }
  }

  /**
   * 获取模板变量
   * GET /api/v2/templates/:id/variables
   */
  async getVariables(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string || uuidv4();

    try {
      const { id } = req.params;

      if (!id) {
        throw this.createValidationError('id', 'Template ID is required');
      }

      // TODO: 调用服务获取模板变量
      // const variables = await this.templateParser.extractVariables(id);

      // 临时模拟响应
      const variables = {
        templateId: id,
        variables: [
          {
            key: '合同编号',
            rawPlaceholder: '{{合同编号}}',
            dataType: 'string',
            required: true,
            format: null,
            context: {
              section: '基本信息',
              position: 1,
            },
          },
          {
            key: '合同金额',
            rawPlaceholder: '{{合同金额}}',
            dataType: 'number',
            required: true,
            format: 'currency',
            context: {
              section: '金额信息',
              position: 3,
            },
          },
        ],
        totalVariables: 2,
        requiredVariables: 2,
        optionalVariables: 0,
      };

      const response: ApiResponseSuccess<typeof variables> = {
        success: true,
        data: variables,
        meta: this.createMeta(requestId, startTime),
      };

      res.status(200).json(response);
    } catch (error) {
      this.handleError(error, res, requestId);
    }
  }

  /**
   * 下载模板文件
   * GET /api/v2/templates/:id/download
   */
  async download(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string || uuidv4();

    try {
      const { id } = req.params;

      if (!id) {
        throw this.createValidationError('id', 'Template ID is required');
      }

      // TODO: 调用服务获取模板文件
      // const { file, fileName } = await this.templateService.getTemplateFile(id);

      // 临时模拟 - 实际实现需要返回文件流
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="template_${id}.docx"`);
      res.setHeader('X-Request-ID', requestId);

      // 这里应该返回实际的文件内容
      res.status(200).send();
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
    logger.error('[TemplateController] Error:', error);

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
      [ApiErrorCode.TEMPLATE_NOT_FOUND]: 404,
      [ApiErrorCode.TEMPLATE_INVALID]: 400,
      [ApiErrorCode.TEMPLATE_UPLOAD_FAILED]: 500,
      [ApiErrorCode.TEMPLATE_PARSE_FAILED]: 500,
      [ApiErrorCode.INTERNAL_ERROR]: 500,
    };

    return statusMap[errorCode] || 500;
  }
}

// 导出单例实例
export const templateController = new TemplateController();
