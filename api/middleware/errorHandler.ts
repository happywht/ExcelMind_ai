/**
 * 统一错误处理中间件
 *
 * 提供全局错误处理和错误响应格式化
 * 基于 API_SPECIFICATION_PHASE2.md 规范
 *
 * @module api/middleware/errorHandler
 * @version 2.0.0
 */

import { logger } from '@/utils/logger';
import { Request, Response, NextFunction } from 'express';
import { ApiErrorCode, createApiErrorResponse, getHttpStatus, getHelpUrl } from '../../types/errorCodes';
import { AppError, isAppError } from '../../types/errors';
import { ErrorHandler } from '../../utils/errorHandler';
import { v4 as uuidv4 } from 'uuid';

/**
 * API 错误类
 */
export class ApiError extends Error {
  public code: ApiErrorCode;
  public statusCode: number;
  public details?: any[];
  public requestId?: string;

  constructor(
    code: ApiErrorCode,
    message?: string,
    details?: any[],
    requestId?: string
  ) {
    super(message || getErrorMessage(code));
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = getHttpStatus(code);
    this.details = details;
    this.requestId = requestId;

    // 维护正确的原型链
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * 获取错误消息
 */
function getErrorMessage(code: ApiErrorCode): string {
  const errorMessages: Record<ApiErrorCode, string> = {
    [ApiErrorCode.UNKNOWN_ERROR]: '未知错误',
    [ApiErrorCode.VALIDATION_ERROR]: '请求参数验证失败',
    [ApiErrorCode.UNAUTHORIZED]: '未授权',
    [ApiErrorCode.FORBIDDEN]: '禁止访问',
    [ApiErrorCode.NOT_FOUND]: '资源不存在',
    [ApiErrorCode.CONFLICT]: '资源冲突',
    [ApiErrorCode.RATE_LIMIT_EXCEEDED]: '超出速率限制',
    [ApiErrorCode.INTERNAL_ERROR]: '服务器内部错误',
    [ApiErrorCode.SERVICE_UNAVAILABLE]: '服务不可用',
    [ApiErrorCode.REQUEST_TIMEOUT]: '请求超时',
    [ApiErrorCode.UNSUPPORTED_OPERATION]: '不支持的操作',

    [ApiErrorCode.FILE_NOT_FOUND]: '文件不存在',
    [ApiErrorCode.FILE_TOO_LARGE]: '文件过大',
    [ApiErrorCode.INVALID_FILE_FORMAT]: '无效的文件格式',
    [ApiErrorCode.FILE_UPLOAD_FAILED]: '文件上传失败',
    [ApiErrorCode.FILE_DOWNLOAD_FAILED]: '文件下载失败',
    [ApiErrorCode.FILE_PARSE_FAILED]: '文件解析失败',
    [ApiErrorCode.FILE_CORRUPTED]: '文件已损坏',
    [ApiErrorCode.UNSUPPORTED_FILE_TYPE]: '不支持的文件类型',

    [ApiErrorCode.DATA_QUALITY_ANALYSIS_FAILED]: '数据质量分析失败',
    [ApiErrorCode.DATA_CLEANING_FAILED]: '数据清洗失败',
    [ApiErrorCode.TRANSFORM_RULE_NOT_FOUND]: '转换规则不存在',
    [ApiErrorCode.TRANSFORM_EXECUTION_FAILED]: '转换执行失败',
    [ApiErrorCode.SHEET_NOT_FOUND]: 'Sheet 不存在',
    [ApiErrorCode.COLUMN_NOT_FOUND]: '列不存在',
    [ApiErrorCode.DATA_TYPE_MISMATCH]: '数据类型不匹配',
    [ApiErrorCode.DATA_FORMAT_ERROR]: '数据格式错误',
    [ApiErrorCode.DATA_TRANSFORMATION_FAILED]: '数据转换失败',
    [ApiErrorCode.DATA_SOURCE_NOT_FOUND]: '数据源不存在',

    [ApiErrorCode.TEMPLATE_NOT_FOUND]: '模板不存在',
    [ApiErrorCode.TEMPLATE_INVALID]: '模板格式无效',
    [ApiErrorCode.TEMPLATE_UPLOAD_FAILED]: '模板上传失败',
    [ApiErrorCode.GENERATION_FAILED]: '文档生成失败',
    [ApiErrorCode.DOWNLOAD_FAILED]: '下载失败',
    [ApiErrorCode.PLACEHOLDER_UNMAPPED]: '占位符未映射',
    [ApiErrorCode.TEMPLATE_PARSE_FAILED]: '模板解析失败',
    [ApiErrorCode.BATCH_GENERATION_FAILED]: '批量生成失败',
    [ApiErrorCode.DOCUMENT_FORMAT_UNSUPPORTED]: '文档格式不支持',
    [ApiErrorCode.TASK_NOT_FOUND]: '任务不存在',
    [ApiErrorCode.TASK_ALREADY_CANCELLED]: '任务已取消',
    [ApiErrorCode.TASK_ALREADY_FAILED]: '任务已失败',

    [ApiErrorCode.AUDIT_RULE_NOT_FOUND]: '审计规则不存在',
    [ApiErrorCode.AUDIT_EXECUTION_FAILED]: '审计执行失败',
    [ApiErrorCode.AUDIT_REPORT_FAILED]: '审计报告生成失败',
    [ApiErrorCode.AUDIT_RULE_EXPRESSION_ERROR]: '审计规则表达式错误',
    [ApiErrorCode.AUDIT_CONDITION_INVALID]: '审计条件无效',

    [ApiErrorCode.SQL_SYNTAX_ERROR]: 'SQL 语法错误',
    [ApiErrorCode.SQL_IDENTIFIER_NOT_FOUND]: 'SQL 标识符不存在',
    [ApiErrorCode.SQL_VALIDATION_FAILED]: 'SQL 验证失败',
    [ApiErrorCode.SQL_EXECUTION_FAILED]: 'SQL 执行失败',
    [ApiErrorCode.SQL_QUERY_TIMEOUT]: 'SQL 查询超时',
    [ApiErrorCode.SQL_TOO_COMPLEX]: 'SQL 查询过于复杂',

    [ApiErrorCode.HALLUCINATION_DETECTED]: '检测到 AI 幻觉',
    [ApiErrorCode.QUALITY_GATE_FAILED]: '质量门禁检查失败',
    [ApiErrorCode.VALIDATION_FAILED]: '验证失败',
    [ApiErrorCode.AI_OUTPUT_VALIDATION_FAILED]: 'AI 输出验证失败',
    [ApiErrorCode.RESULT_VALIDATION_FAILED]: '结果验证失败',
    [ApiErrorCode.QUALITY_SCORE_BELOW_THRESHOLD]: '质量分数低于阈值',

    [ApiErrorCode.PERFORMANCE_METRICS_FAILED]: '性能指标获取失败',
    [ApiErrorCode.PERFORMANCE_REPORT_FAILED]: '性能报告生成失败',
    [ApiErrorCode.PERFORMANCE_ALERT_NOT_FOUND]: '性能告警规则不存在',
    [ApiErrorCode.PERFORMANCE_ALERT_CREATE_FAILED]: '性能告警创建失败',

    [ApiErrorCode.WEBSOCKET_CONNECTION_FAILED]: 'WebSocket 连接失败',
    [ApiErrorCode.WEBSOCKET_AUTH_FAILED]: 'WebSocket 认证失败',
    [ApiErrorCode.WEBSOCKET_SUBSCRIBE_FAILED]: 'WebSocket 订阅失败',
    [ApiErrorCode.WEBSOCKET_MESSAGE_FORMAT_ERROR]: 'WebSocket 消息格式错误',
  };

  return errorMessages[code] || '未知错误';
}

/**
 * 敏感字段列表（用于日志清理）
 */
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'apiKey',
  'secret',
  'authorization',
  'credentials',
  'accessToken',
  'refreshToken'
];

/**
 * 错误处理中间件配置
 */
interface ErrorHandlerConfig {
  /** 是否显示详细错误信息（生产环境应设为 false） */
  showDetails?: boolean;
  /** 是否记录错误日志 */
  logErrors?: boolean;
  /** 是否显示堆栈信息（开发环境可设为 true） */
  showStackTrace?: boolean;
  /** 自定义日志函数 */
  logger?: (error: Error, req: Request) => void;
}

/**
 * 默认错误处理配置
 */
const defaultConfig: ErrorHandlerConfig = {
  showDetails: process.env.NODE_ENV !== 'production',
  showStackTrace: process.env.NODE_ENV === 'development',
  logErrors: true,
};

/**
 * 错误处理中间件
 */
export const errorHandler = (config: ErrorHandlerConfig = defaultConfig) => {
  return (err: Error, req: Request, res: Response, next: NextFunction): void => {
    const requestId = req.headers['x-request-id'] as string || uuidv4();

    // 转换为 AppError（如果不是的话）
    const appError = isAppError(err) ? err : ErrorHandler.handleError(err);

    // 记录错误日志（清理敏感信息）
    if (config.logErrors !== false) {
      if (config.logger) {
        config.logger(appError, req);
      } else {
        logError(appError, req, config);
      }
    }

    // 构建错误响应
    const errorResponse = createApiErrorResponse(
      appError.code,
      buildErrorDetails(appError, config),
      requestId
    );

    // 记录请求 ID 到响应头
    res.setHeader('X-Request-ID', requestId);
    res.setHeader('X-Error-Code', appError.code.toString());

    res.status(appError.statusCode).json(errorResponse);
  };
};

/**
 * 记录错误日志
 */
function logError(error: Error, req: Request, config: ErrorHandlerConfig): void {
  const logData: any = {
    message: sanitizeMessage(error.message),
    request: {
      method: req.method,
      url: sanitizeUrl(req.url),
      headers: sanitizeHeaders(req.headers),
      body: sanitizeBody(req.body),
      query: sanitizeQuery(req.query),
      params: req.params,
    },
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] as string || uuidv4(),
  };

  // 添加 AppError 特定信息
  if (isAppError(error)) {
    logData.error = {
      name: error.name,
      code: error.code,
      statusCode: error.statusCode,
      isOperational: error.isOperational,
      ...(error.context && { context: sanitizeContext(error.context) })
    };
  }

  // 仅在开发环境显示堆栈
  if (config.showStackTrace && error.stack) {
    logData.stack = sanitizeStack(error.stack);
  }

  logger.error('[ErrorHandler]', JSON.stringify(logData, null, 2));
}

/**
 * 清理请求头中的敏感信息
 */
function sanitizeHeaders(headers: any): any {
  const sanitized = { ...headers };

  SENSITIVE_FIELDS.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '***';
    }
  });

  return sanitized;
}

/**
 * 清理请求体中的敏感信息
 */
function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sanitized = { ...body };

  SENSITIVE_FIELDS.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '***';
    }
  });

  return sanitized;
}

/**
 * 清理查询参数中的敏感信息
 */
function sanitizeQuery(query: any): any {
  if (!query || typeof query !== 'object') {
    return query;
  }

  const sanitized = { ...query };

  SENSITIVE_FIELDS.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '***';
    }
  });

  return sanitized;
}

/**
 * 清理上下文中的敏感信息
 */
function sanitizeContext(context: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};

  Object.keys(context).forEach(key => {
    const value = context[key];

    // 检查是否为敏感字段
    if (SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
      sanitized[key] = '***';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeContext(value);
    } else {
      sanitized[key] = value;
    }
  });

  return sanitized;
}

/**
 * 清理错误消息中的敏感信息
 */
function sanitizeMessage(message: string): string {
  let sanitized = message;

  // 移除路径信息
  sanitized = sanitized.replace(/at [^(]+\([^)]+\)/g, 'at [hidden]');

  // 移除敏感关键字
  SENSITIVE_FIELDS.forEach(field => {
    const regex = new RegExp(`${field}.*`, 'gi');
    sanitized = sanitized.replace(regex, '***');
  });

  return sanitized;
}

/**
 * 清理堆栈信息中的敏感数据
 */
function sanitizeStack(stack: string): string {
  // 移除路径信息中的用户目录
  let sanitized = stack.replace(/at [^(]+\(.*[\\/]([^\\/)]+)\)/g, (match, filename) => {
    return `at [sanitized_path](${filename})`;
  });

  // 移除敏感关键字
  SENSITIVE_FIELDS.forEach(field => {
    const regex = new RegExp(`${field}.*`, 'gi');
    sanitized = sanitized.replace(regex, '***');
  });

  return sanitized;
}

/**
 * 清理URL中的敏感信息
 */
function sanitizeUrl(url: string): string {
  // 移除URL中的敏感参数
  SENSITIVE_FIELDS.forEach(field => {
    const regex = new RegExp(`[?&]${field}=[^&]*`, 'gi');
    url = url.replace(regex, '');
  });

  return url;
}

/**
 * 构建错误详情（用于API响应）
 */
function buildErrorDetails(error: Error, config: ErrorHandlerConfig): any[] {
  const details: any[] = [];

  if (isAppError(error)) {
    // 添加上下文信息
    if (error.context && config.showDetails) {
      details.push({
        ...error.context,
      });
    }

    // 在开发环境添加堆栈信息
    if (config.showStackTrace && error.stack) {
      details.push({
        stack: sanitizeStack(error.stack),
      });
    }
  } else {
    // 非 AppError
    if (config.showDetails) {
      details.push({
        message: sanitizeMessage(error.message),
      });

      if (config.showStackTrace && error.stack) {
        details.push({
          stack: sanitizeStack(error.stack),
        });
      }
    }
  }

  return details;
}

/**
 * 404 处理中间件
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  const requestId = req.headers['x-request-id'] as string || uuidv4();

  const errorResponse = createApiErrorResponse(
    ApiErrorCode.NOT_FOUND,
    [
      {
        field: 'path',
        message: `Route ${req.method} ${req.path} not found`,
      },
    ],
    requestId
  );

  res.setHeader('X-Request-ID', requestId);
  res.status(404).json(errorResponse);
};

/**
 * 异步错误包装器
 * 用于包装异步路由处理器，自动捕获和处理错误
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 抛出 API 错误的快捷方法
 */
export const throwApiError = (
  code: ApiErrorCode,
  message?: string,
  details?: any[]
): never => {
  throw new ApiError(code, message, details);
};

/**
 * 常用错误抛出函数
 */
export const ApiErrors = {
  badRequest: (message?: string, details?: any[]) => {
    throw new ApiError(ApiErrorCode.VALIDATION_ERROR, message, details);
  },

  unauthorized: (message?: string, details?: any[]) => {
    throw new ApiError(ApiErrorCode.UNAUTHORIZED, message, details);
  },

  forbidden: (message?: string, details?: any[]) => {
    throw new ApiError(ApiErrorCode.FORBIDDEN, message, details);
  },

  notFound: (resource?: string, details?: any[]) => {
    throw new ApiError(
      ApiErrorCode.NOT_FOUND,
      resource ? `${resource} not found` : undefined,
      details
    );
  },

  conflict: (message?: string, details?: any[]) => {
    throw new ApiError(ApiErrorCode.CONFLICT, message, details);
  },

  internalError: (message?: string, details?: any[]) => {
    throw new ApiError(ApiErrorCode.INTERNAL_ERROR, message, details);
  },

  // 文件相关错误
  fileNotFound: (fileId?: string) => {
    throw new ApiError(
      ApiErrorCode.FILE_NOT_FOUND,
      fileId ? `File ${fileId} not found` : undefined
    );
  },

  fileTooLarge: (maxSize?: number) => {
    throw new ApiError(
      ApiErrorCode.FILE_TOO_LARGE,
      maxSize ? `File size exceeds maximum allowed size of ${maxSize} bytes` : undefined
    );
  },

  invalidFileFormat: (format?: string) => {
    throw new ApiError(
      ApiErrorCode.INVALID_FILE_FORMAT,
      format ? `File format ${format} is not supported` : undefined
    );
  },

  // 数据质量相关错误
  dataQualityAnalysisFailed: (reason?: string) => {
    throw new ApiError(
      ApiErrorCode.DATA_QUALITY_ANALYSIS_FAILED,
      reason
    );
  },

  // 模板相关错误
  templateNotFound: (templateId?: string) => {
    throw new ApiError(
      ApiErrorCode.TEMPLATE_NOT_FOUND,
      templateId ? `Template ${templateId} not found` : undefined
    );
  },

  templateInvalid: (reason?: string) => {
    throw new ApiError(
      ApiErrorCode.TEMPLATE_INVALID,
      reason
    );
  },

  // 生成相关错误
  generationFailed: (reason?: string) => {
    throw new ApiError(
      ApiErrorCode.GENERATION_FAILED,
      reason
    );
  },

  batchGenerationFailed: (taskId?: string) => {
    throw new ApiError(
      ApiErrorCode.BATCH_GENERATION_FAILED,
      taskId ? `Batch generation ${taskId} failed` : undefined
    );
  },

  // 审计相关错误
  auditRuleNotFound: (ruleId?: string) => {
    throw new ApiError(
      ApiErrorCode.AUDIT_RULE_NOT_FOUND,
      ruleId ? `Audit rule ${ruleId} not found` : undefined
    );
  },

  auditExecutionFailed: (reason?: string) => {
    throw new ApiError(
      ApiErrorCode.AUDIT_EXECUTION_FAILED,
      reason
    );
  },
};

// 导出默认实例
export default errorHandler;
