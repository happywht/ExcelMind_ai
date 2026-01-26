/**
 * 请求验证中间件
 *
 * 提供请求数据验证功能
 * 基于 API_SPECIFICATION_PHASE2.md 规范
 */

import { Request, Response, NextFunction } from 'express';
import { ApiErrorCode, createApiErrorResponse } from '../../types/errorCodes';
import { v4 as uuidv4 } from 'uuid';

/**
 * 验证结果
 */
interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    value?: any;
  }>;
}

/**
 * 验证规则
 */
interface ValidationRule {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: any[];
  custom?: (value: any) => boolean | string;
}

/**
 * 验证规则映射
 */
interface ValidationSchema {
  [key: string]: ValidationRule;
}

/**
 * 验证中间件配置
 */
interface ValidationMiddlewareConfig {
  body?: ValidationSchema;
  query?: ValidationSchema;
  params?: ValidationSchema;
}

/**
 * 验证中间件类
 */
export class ValidationMiddleware {
  /**
   * 创建验证中间件
   */
  static validate(config: ValidationMiddlewareConfig) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const requestId = req.headers['x-request-id'] as string || uuidv4();
      const errors: Array<{ field: string; message: string; value?: any }> = [];

      // 验证请求体
      if (config.body) {
        const bodyResult = this.validateObject(req.body, config.body);
        if (!bodyResult.isValid) {
          errors.push(...bodyResult.errors);
        }
      }

      // 验证查询参数
      if (config.query) {
        const queryResult = this.validateObject(req.query, config.query);
        if (!queryResult.isValid) {
          errors.push(...queryResult.errors);
        }
      }

      // 验证路径参数
      if (config.params) {
        const paramsResult = this.validateObject(req.params, config.params);
        if (!paramsResult.isValid) {
          errors.push(...paramsResult.errors);
        }
      }

      // 如果有验证错误，返回错误响应
      if (errors.length > 0) {
        const errorResponse = createApiErrorResponse(
          ApiErrorCode.VALIDATION_ERROR,
          errors,
          requestId
        );

        res.status(400).json(errorResponse);
        return;
      }

      next();
    };
  }

  /**
   * 验证对象
   */
  private static validateObject(
    obj: any,
    schema: ValidationSchema
  ): ValidationResult {
    const errors: Array<{ field: string; message: string; value?: any }> = [];

    for (const [field, rule] of Object.entries(schema)) {
      const value = obj[field];

      // 检查必填字段
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push({
          field,
          message: `${field} is required`,
          value,
        });
        continue;
      }

      // 如果值为空且非必填，跳过其他验证
      if (value === undefined || value === null) {
        continue;
      }

      // 类型验证
      if (rule.type) {
        if (!this.validateType(value, rule.type)) {
          errors.push({
            field,
            message: `${field} must be of type ${rule.type}`,
            value,
          });
          continue;
        }
      }

      // 字符串长度验证
      if (rule.type === 'string') {
        if (rule.minLength !== undefined && value.length < rule.minLength) {
          errors.push({
            field,
            message: `${field} must be at least ${rule.minLength} characters long`,
            value,
          });
        }
        if (rule.maxLength !== undefined && value.length > rule.maxLength) {
          errors.push({
            field,
            message: `${field} must not exceed ${rule.maxLength} characters`,
            value,
          });
        }
      }

      // 数字范围验证
      if (rule.type === 'number') {
        if (rule.min !== undefined && value < rule.min) {
          errors.push({
            field,
            message: `${field} must be at least ${rule.min}`,
            value,
          });
        }
        if (rule.max !== undefined && value > rule.max) {
          errors.push({
            field,
            message: `${field} must not exceed ${rule.max}`,
            value,
          });
        }
      }

      // 正则表达式验证
      if (rule.pattern && !rule.pattern.test(value)) {
        errors.push({
          field,
          message: `${field} format is invalid`,
          value,
        });
      }

      // 枚举值验证
      if (rule.enum && !rule.enum.includes(value)) {
        errors.push({
          field,
          message: `${field} must be one of: ${rule.enum.join(', ')}`,
          value,
        });
      }

      // 自定义验证
      if (rule.custom) {
        const customResult = rule.custom(value);
        if (customResult !== true) {
          errors.push({
            field,
            message: typeof customResult === 'string' ? customResult : `${field} validation failed`,
            value,
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 验证类型
   */
  private static validateType(value: any, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      default:
        return true;
    }
  }
}

/**
 * 常用验证规则
 */
export const ValidationRules = {
  // 文件ID验证
  fileId: {
    required: true as const,
    type: 'string' as const,
    pattern: /^file_\d+_[a-z0-9]+$/,
    minLength: 10,
    maxLength: 100,
  },

  // Sheet名称验证
  sheetName: {
    required: true as const,
    type: 'string' as const,
    minLength: 1,
    maxLength: 100,
  },

  // 模板ID验证
  templateId: {
    required: true as const,
    type: 'string' as const,
    pattern: /^tmpl_\d+_[a-z0-9]+$/,
  },

  // 任务ID验证
  taskId: {
    required: true as const,
    type: 'string' as const,
    pattern: /^task_\d+_[a-z0-9]+$/,
  },

  // 分页参数验证
  pagination: {
    page: {
      type: 'number' as const,
      min: 1,
      default: 1,
    },
    pageSize: {
      type: 'number' as const,
      min: 1,
      max: 100,
      default: 20,
    },
  },

  // 排序参数验证
  sort: {
    sortBy: {
      type: 'string' as const,
      enum: ['createdAt', 'updatedAt', 'name', 'status'],
      default: 'createdAt',
    },
    order: {
      type: 'string' as const,
      enum: ['asc', 'desc'],
      default: 'desc',
    },
  },
};

/**
 * 预定义的验证中间件
 */
export const PredefinedValidators = {
  /**
   * 验证数据质量分析请求
   */
  dataQualityAnalyze: ValidationMiddleware.validate({
    body: {
      fileId: ValidationRules.fileId,
      sheetName: ValidationRules.sheetName,
      options: {
        type: 'object' as const,
      },
    },
  }),

  /**
   * 验证模板上传请求
   */
  templateUpload: ValidationMiddleware.validate({
    body: {
      name: {
        required: true as const,
        type: 'string' as const,
        minLength: 1,
        maxLength: 200,
      },
      description: {
        type: 'string' as const,
        maxLength: 1000,
      },
      category: {
        type: 'string' as const,
        maxLength: 100,
      },
      tags: {
        type: 'array' as const,
      },
    },
  }),

  /**
   * 验证批量生成请求
   */
  batchGeneration: ValidationMiddleware.validate({
    body: {
      dataSourceId: ValidationRules.fileId,
      templateIds: {
        required: true as const,
        type: 'array' as const,
        custom: (value: any) => {
          if (!Array.isArray(value) || value.length === 0) {
            return 'At least one template ID is required';
          }
          return true;
        },
      },
      outputFormat: {
        required: true as const,
        type: 'string' as const,
        enum: ['docx', 'pdf'],
      },
    },
  }),

  /**
   * 验证审计执行请求
   */
  auditExecute: ValidationMiddleware.validate({
    body: {
      fileId: ValidationRules.fileId,
      sheetName: ValidationRules.sheetName,
      rules: {
        type: 'array' as const,
      },
    },
  }),

  /**
   * 验证分页参数
   */
  pagination: ValidationMiddleware.validate({
    query: ValidationRules.pagination,
  }),
};

/**
 * 文件上传验证中间件
 */
export const fileUploadValidation = (
  allowedTypes: string[] = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/pdf',
  ],
  maxSize: number = 10 * 1024 * 1024 // 10MB
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const requestId = req.headers['x-request-id'] as string || uuidv4();

    if (!req.file) {
      const errorResponse = createApiErrorResponse(
        ApiErrorCode.VALIDATION_ERROR,
        [{ field: 'file', message: 'File is required' }],
        requestId
      );
      res.status(400).json(errorResponse);
      return;
    }

    // 检查文件类型
    if (!allowedTypes.includes(req.file.mimetype)) {
      const errorResponse = createApiErrorResponse(
        ApiErrorCode.INVALID_FILE_FORMAT,
        [{ field: 'file', message: `File type ${req.file.mimetype} is not allowed` }],
        requestId
      );
      res.status(400).json(errorResponse);
      return;
    }

    // 检查文件大小
    if (req.file.size > maxSize) {
      const errorResponse = createApiErrorResponse(
        ApiErrorCode.FILE_TOO_LARGE,
        [{ field: 'file', message: `File size exceeds maximum allowed size of ${maxSize} bytes` }],
        requestId
      );
      res.status(413).json(errorResponse);
      return;
    }

    next();
  };
};

// 导出默认实例
export default ValidationMiddleware;
