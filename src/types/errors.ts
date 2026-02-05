/**
 * 统一错误类层级定义
 *
 * 提供完整的错误类体系，用于服务层和应用层的错误处理
 * 所有应用错误都应继承自 AppError 基类
 *
 * @module types/errors
 * @version 2.0.0
 */

import { ApiErrorCode } from './errorCodes';

// ============================================================================
// 基础错误类
// ============================================================================

/**
 * 应用错误基类
 * 所有应用错误的基类，提供统一的错误处理接口
 */
export abstract class AppError extends Error {
  /**
   * 错误代码（符合 ApiErrorCode 枚举）
   */
  abstract readonly code: ApiErrorCode;

  /**
   * HTTP 状态码
   */
  abstract readonly statusCode: number;

  /**
   * 是否为操作性错误（可预期的错误，非系统bug）
   * 操作性错误通常不需要立即告警
   */
  abstract readonly isOperational: boolean;

  /**
   * 错误发生的上下文信息
   */
  public readonly context?: Record<string, any>;

  /**
   * 原始错误（用于错误链追踪）
   */
  public readonly cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = this.constructor.name;
    this.cause = cause;

    // 维护正确的原型链
    Error.captureStackTrace(this, this.constructor);

    // 设置 cause（如果支持）
    if (cause && typeof (this as any).cause === 'undefined') {
      (this as any).cause = cause;
    }
  }

  /**
   * 转换为 JSON 格式（用于日志和API响应）
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      isOperational: this.isOperational,
      ...(this.context && { context: this.context }),
      ...(this.cause && { cause: this.cause.message })
    };
  }

  /**
   * 添加上下文信息
   */
  withContext(context: Record<string, any>): this {
    (this as any).context = { ...this.context, ...context };
    return this;
  }
}

// ============================================================================
// 客户端错误 (4xx) - 用户输入或权限问题
// ============================================================================

/**
 * 验证错误 (400)
 * 用于请求数据验证失败
 */
export class ValidationError extends AppError {
  readonly code = ApiErrorCode.VALIDATION_ERROR;
  readonly statusCode = 400;
  readonly isOperational = true;

  constructor(
    public readonly field: string,
    message: string,
    public readonly value?: any,
    cause?: Error
  ) {
    super(message, cause);
    this.context = { field, value };
  }

  toJSON() {
    return {
      ...super.toJSON(),
      field: this.field,
      ...(this.value !== undefined && { value: this.value })
    };
  }
}

/**
 * 未找到错误 (404)
 * 用于资源不存在
 */
export class NotFoundError extends AppError {
  readonly code = ApiErrorCode.NOT_FOUND;
  readonly statusCode = 404;
  readonly isOperational = true;

  constructor(
    public readonly resource: string,
    public readonly id: string,
    cause?: Error
  ) {
    super(`${resource} with id "${id}" not found`, cause);
    this.context = { resource, id };
  }
}

/**
 * 未授权错误 (401)
 * 用于认证失败
 */
export class UnauthorizedError extends AppError {
  readonly code = ApiErrorCode.UNAUTHORIZED;
  readonly statusCode = 401;
  readonly isOperational = true;

  constructor(message: string = 'Authentication required', cause?: Error) {
    super(message, cause);
  }
}

/**
 * 禁止访问错误 (403)
 * 用于权限不足
 */
export class ForbiddenError extends AppError {
  readonly code = ApiErrorCode.FORBIDDEN;
  readonly statusCode = 403;
  readonly isOperational = true;

  constructor(message: string = 'Insufficient permissions', cause?: Error) {
    super(message, cause);
  }
}

/**
 * 资源冲突错误 (409)
 * 用于资源状态冲突
 */
export class ConflictError extends AppError {
  readonly code = ApiErrorCode.CONFLICT;
  readonly statusCode = 409;
  readonly isOperational = true;

  constructor(message: string, cause?: Error) {
    super(message, cause);
  }
}

// ============================================================================
// 服务端错误 (5xx) - 系统内部问题
// ============================================================================

/**
 * 内部服务器错误 (500)
 * 用于未预期的系统错误
 */
export class InternalServerError extends AppError {
  readonly code = ApiErrorCode.INTERNAL_ERROR;
  readonly statusCode = 500;
  readonly isOperational = false;

  constructor(
    message: string = 'An unexpected error occurred',
    cause?: Error
  ) {
    super(message, cause);
  }
}

/**
 * 服务不可用错误 (503)
 * 用于服务暂时不可用
 */
export class ServiceUnavailableError extends AppError {
  readonly code = ApiErrorCode.SERVICE_UNAVAILABLE;
  readonly statusCode = 503;
  readonly isOperational = true;

  constructor(message: string = 'Service temporarily unavailable', cause?: Error) {
    super(message, cause);
  }
}

// ============================================================================
// 领域特定错误 - 模板和文档生成
// ============================================================================

/**
 * 模板未找到错误
 */
export class TemplateNotFoundError extends NotFoundError {
  constructor(templateId: string, cause?: Error) {
    super('Template', templateId, cause);
    this.code = ApiErrorCode.TEMPLATE_NOT_FOUND;
  }
}

/**
 * 模板无效错误
 */
export class TemplateInvalidError extends AppError {
  readonly code = ApiErrorCode.TEMPLATE_INVALID;
  readonly statusCode = 400;
  readonly isOperational = true;

  constructor(
    public readonly templateId: string,
    message: string,
    public readonly issues?: Array<{ field: string; message: string }>,
    cause?: Error
  ) {
    super(message, cause);
    this.context = { templateId, issues };
  }
}

/**
 * 文档生成失败错误
 */
export class DocumentGenerationError extends AppError {
  readonly code = ApiErrorCode.GENERATION_FAILED;
  readonly statusCode = 500;
  readonly isOperational = true;

  constructor(
    message: string,
    public readonly templateId?: string,
    public readonly dataIndex?: number,
    cause?: Error
  ) {
    super(message, cause);
    this.context = { templateId, dataIndex };
  }
}

/**
 * 任务未找到错误
 */
export class TaskNotFoundError extends NotFoundError {
  constructor(taskId: string, cause?: Error) {
    super('Task', taskId, cause);
    this.code = ApiErrorCode.TASK_NOT_FOUND;
  }
}

/**
 * 任务状态错误
 */
export class TaskStatusError extends ConflictError {
  constructor(
    public readonly taskId: string,
    public readonly currentStatus: string,
    public readonly expectedStatus: string,
    cause?: Error
  ) {
    super(
      `Task ${taskId} is ${currentStatus}, expected ${expectedStatus}`,
      cause
    );
    this.code = ApiErrorCode.CONFLICT;
    this.context = { taskId, currentStatus, expectedStatus };
  }
}

// ============================================================================
// AI服务相关错误
// ============================================================================

/**
 * AI服务错误
 */
export class AIServiceError extends InternalServerError {
  readonly code = ApiErrorCode.INTERNAL_ERROR;
  readonly isOperational = true;

  constructor(
    message: string,
    public readonly provider: string,
    public readonly retryable: boolean = true,
    public readonly originalError?: Error
  ) {
    super(message, originalError);
    this.context = { provider, retryable };
  }
}

/**
 * AI输出验证失败
 */
export class AIOutputValidationError extends AppError {
  readonly code = ApiErrorCode.AI_OUTPUT_VALIDATION_FAILED;
  readonly statusCode = 400;
  readonly isOperational = true;

  constructor(
    message: string,
    public readonly validationIssues: Array<{
      type: string;
      message: string;
      location?: string;
    }>,
    cause?: Error
  ) {
    super(message, cause);
    this.context = { validationIssues };
  }
}

// ============================================================================
// 数据质量相关错误
// ============================================================================

/**
 * 数据质量错误
 */
export class DataQualityError extends AppError {
  readonly code = ApiErrorCode.DATA_QUALITY_ANALYSIS_FAILED;
  readonly statusCode = 422;
  readonly isOperational = true;

  constructor(
    message: string,
    public readonly issues: Array<{
      type: string;
      message: string;
      location?: string;
    }>,
    cause?: Error
  ) {
    super(message, cause);
    this.context = { issues };
  }
}

// ============================================================================
// 文件处理相关错误
// ============================================================================

/**
 * 文件未找到错误
 */
export class FileNotFoundError extends NotFoundError {
  constructor(fileId: string, cause?: Error) {
    super('File', fileId, cause);
    this.code = ApiErrorCode.FILE_NOT_FOUND;
  }
}

/**
 * 文件格式错误
 */
export class FileFormatError extends AppError {
  readonly code = ApiErrorCode.INVALID_FILE_FORMAT;
  readonly statusCode = 400;
  readonly isOperational = true;

  constructor(
    public readonly fileName: string,
    public readonly expectedFormat: string,
    public readonly actualFormat?: string,
    cause?: Error
  ) {
    super(
      `File "${fileName}" has invalid format. Expected: ${expectedFormat}${actualFormat ? `, Got: ${actualFormat}` : ''}`,
      cause
    );
    this.context = { fileName, expectedFormat, actualFormat };
  }
}

/**
 * 文件解析错误
 */
export class FileParseError extends AppError {
  readonly code = ApiErrorCode.FILE_PARSE_FAILED;
  readonly statusCode = 500;
  readonly isOperational = true;

  constructor(
    public readonly fileName: string,
    message: string,
    cause?: Error
  ) {
    super(message, cause);
    this.context = { fileName };
  }
}

// ============================================================================
// SQL相关错误
// ============================================================================

/**
 * SQL语法错误
 */
export class SQLSyntaxError extends AppError {
  readonly code = ApiErrorCode.SQL_SYNTAX_ERROR;
  readonly statusCode = 400;
  readonly isOperational = true;

  constructor(
    message: string,
    public readonly sqlStatement?: string,
    cause?: Error
  ) {
    super(message, cause);
    this.context = { sqlStatement };
  }
}

/**
 * SQL执行错误
 */
export class SQLExecutionError extends AppError {
  readonly code = ApiErrorCode.SQL_EXECUTION_FAILED;
  readonly statusCode = 500;
  readonly isOperational = true;

  constructor(
    message: string,
    public readonly sqlStatement?: string,
    cause?: Error
  ) {
    super(message, cause);
    this.context = { sqlStatement };
  }
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 判断是否为 AppError 实例
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * 将任意错误转换为 AppError
 */
export function toAppError(error: unknown, defaultMessage: string = 'An error occurred'): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new InternalServerError(defaultMessage, error);
  }

  return new InternalServerError(String(error));
}

/**
 * 获取错误消息链（包含 cause 错误）
 */
export function getErrorChain(error: Error): string[] {
  const messages: string[] = [];
  let current: Error | undefined = error;

  while (current) {
    messages.push(current.message);
    current = (current as any).cause;
  }

  return messages;
}
