/**
 * 统一错误处理工具类
 *
 * 提供错误处理、转换、分类和重试判断的工具方法
 *
 * @module utils/errorHandler
 * @version 2.0.0
 */

import { logger } from '@/utils/logger';
import {
  AppError,
  ValidationError,
  NotFoundError,
  InternalServerError,
  AIServiceError,
  isAppError,
  toAppError
} from '../types/errors';
import { ApiErrorCode } from '../types/errorCodes';

// ============================================================================
// 可重试错误代码列表
// ============================================================================

const RETRYABLE_ERROR_CODES = new Set<ApiErrorCode>([
  ApiErrorCode.INTERNAL_ERROR,
  ApiErrorCode.SERVICE_UNAVAILABLE,
  ApiErrorCode.REQUEST_TIMEOUT,
  ApiErrorCode.RATE_LIMIT_EXCEEDED,
  ApiErrorCode.FILE_UPLOAD_FAILED,
  ApiErrorCode.FILE_DOWNLOAD_FAILED,
  ApiErrorCode.DATA_QUALITY_ANALYSIS_FAILED,
  ApiErrorCode.DATA_CLEANING_FAILED,
  ApiErrorCode.TRANSFORM_EXECUTION_FAILED,
  ApiErrorCode.DATA_TRANSFORMATION_FAILED,
  ApiErrorCode.TEMPLATE_UPLOAD_FAILED,
  ApiErrorCode.GENERATION_FAILED,
  ApiErrorCode.DOWNLOAD_FAILED,
  ApiErrorCode.BATCH_GENERATION_FAILED,
  ApiErrorCode.AUDIT_EXECUTION_FAILED,
  ApiErrorCode.AUDIT_REPORT_FAILED,
  ApiErrorCode.SQL_EXECUTION_FAILED,
  ApiErrorCode.SQL_QUERY_TIMEOUT,
  ApiErrorCode.AI_OUTPUT_VALIDATION_FAILED,
  ApiErrorCode.PERFORMANCE_METRICS_FAILED,
  ApiErrorCode.PERFORMANCE_REPORT_FAILED,
  ApiErrorCode.PERFORMANCE_ALERT_CREATE_FAILED,
  ApiErrorCode.WEBSOCKET_CONNECTION_FAILED,
]);

// ============================================================================
// 网络错误代码列表
// ============================================================================

const NETWORK_ERROR_CODES = new Set<string>([
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'ECONNREFUSED',
  'EPIPE',
  'EHOSTUNREACH',
]);

// ============================================================================
// 主错误处理类
// ============================================================================

/**
 * 统一错误处理工具类
 */
export class ErrorHandler {
  /**
   * 处理未知错误，转换为 AppError
   *
   * @param error - 原始错误
   * @param context - 错误上下文（可选）
   * @returns AppError 实例
   */
  static handleError(error: unknown, context?: string): AppError {
    // 已经是 AppError，直接返回
    if (isAppError(error)) {
      if (context) {
        error.withContext({ context });
      }
      return error;
    }

    // 标准 Error 对象
    if (error instanceof Error) {
      // 网络错误
      if (this.isNetworkError(error)) {
        const appError = new InternalServerError(
          '网络错误，请检查网络连接',
          error
        );
        appError.code = ApiErrorCode.SERVICE_UNAVAILABLE;
        if (context) {
          appError.withContext({ context });
        }
        return appError;
      }

      // 验证错误
      if (error.name === 'ValidationError') {
        const validationError = new ValidationError(
          'unknown',
          error.message,
          undefined,
          error
        );
        if (context) {
          validationError.withContext({ context });
        }
        return validationError;
      }

      // 未授权错误
      if (error.name === 'UnauthorizedError' || error.message.includes('Unauthorized')) {
        const unauthorizedError = new UnauthorizedError(
          'Authentication required',
          error
        );
        if (context) {
          unauthorizedError.withContext({ context });
        }
        return unauthorizedError;
      }

      // 默认内部错误
      const internalError = new InternalServerError(
        error.message || '发生未知错误',
        error
      );
      if (context) {
        internalError.withContext({ context });
      }
      return internalError;
    }

    // 其他类型错误（字符串、数字等）
    const internalError = new InternalServerError(
      String(error),
      new Error(String(error))
    );
    if (context) {
      internalError.withContext({ context });
    }
    return internalError;
  }

  /**
   * 包装异步操作，自动处理错误
   *
   * @param operation - 异步操作
   * @param context - 错误上下文（可选）
   * @returns 操作结果
   * @throws AppError
   */
  static async handleAsync<T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const appError = this.handleError(error, context);
      logger.error(`[ErrorHandler] Async operation failed${context ? `: ${context}` : ''}`, {
        error: appError.toJSON(),
        stack: appError.stack
      });
      throw appError;
    }
  }

  /**
   * 包装同步操作，自动处理错误
   *
   * @param operation - 同步操作
   * @param context - 错误上下文（可选）
   * @returns 操作结果
   * @throws AppError
   */
  static handleSync<T>(
    operation: () => T,
    context?: string
  ): T {
    try {
      return operation();
    } catch (error) {
      const appError = this.handleError(error, context);
      logger.error(`[ErrorHandler] Sync operation failed${context ? `: ${context}` : ''}`, {
        error: appError.toJSON(),
        stack: appError.stack
      });
      throw appError;
    }
  }

  /**
   * 判断错误是否可重试
   *
   * @param error - 错误对象
   * @returns 是否可重试
   */
  static isRetryable(error: Error): boolean {
    if (isAppError(error)) {
      // 检查错误代码是否可重试
      if (Array.from(RETRYABLE_ERROR_CODES).includes(error.code)) {
        return true;
      }

      // 对于 AI 服务错误，检查 retryable 标志
      if (error instanceof AIServiceError) {
        return error.retryable;
      }

      // 操作性错误通常不可重试
      return false;
    }

    // 检查是否为网络错误
    if (error instanceof Error && this.isNetworkError(error)) {
      return true;
    }

    return false;
  }

  /**
   * 判断是否为网络错误
   *
   * @param error - 错误对象
   * @returns 是否为网络错误
   */
  private static isNetworkError(error: Error): boolean {
    return Array.from(NETWORK_ERROR_CODES).some(code => error.message.includes(code));
  }

  /**
   * 获取用户友好的错误消息
   *
   * @param error - 错误对象
   * @returns 用户友好的错误消息
   */
  static getUserMessage(error: Error): string {
    if (isAppError(error)) {
      return error.message;
    }

    // 网络错误
    if (this.isNetworkError(error)) {
      return '网络连接失败，请检查网络设置后重试';
    }

    // 其他错误
    return '操作失败，请稍后重试';
  }

  /**
   * 记录错误到日志
   *
   * @param error - 错误对象
   * @param metadata - 额外的元数据
   */
  static logError(error: Error, metadata?: Record<string, any>): void {
    const logData: Record<string, any> = {
      timestamp: new Date().toISOString(),
      ...(isAppError(error) ? {
        name: error.name,
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        isOperational: error.isOperational,
        ...(error.context && { context: error.context })
      } : {
        name: error.name,
        message: error.message
      }),
      ...(error.stack && { stack: this.sanitizeStack(error.stack) }),
      ...metadata
    };

    // 根据错误类型选择日志级别
    if (isAppError(error)) {
      if (error.statusCode >= 500) {
        logger.error('[ErrorHandler] ERROR:', JSON.stringify(logData, null, 2));
      } else if (error.isOperational) {
        logger.error('[ErrorHandler] WARN:', JSON.stringify(logData, null, 2));
      } else {
        logger.error('[ErrorHandler] INFO:', JSON.stringify(logData, null, 2));
      }
    } else {
      logger.error('[ErrorHandler] UNEXPECTED ERROR:', JSON.stringify(logData, null, 2));
    }
  }

  /**
   * 清理堆栈信息中的敏感数据
   *
   * @param stack - 堆栈信息
   * @returns 清理后的堆栈信息
   */
  private static sanitizeStack(stack: string): string {
    // 移除路径信息中的用户目录
    let sanitized = stack.replace(/at [^(]+\(.*[\\/]([^\\/)]+)\)/g, (match, filename) => {
      return `at [sanitized_path](${filename})`;
    });

    // 移除敏感关键字
    const sensitivePatterns = [
      /password.*/gi,
      /token.*/gi,
      /secret.*/gi,
      /api[_-]?key.*/gi,
      /authorization.*/gi
    ];

    sensitivePatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '***');
    });

    return sanitized;
  }
}

// ============================================================================
// 错误捕获装饰器
// ============================================================================

/**
 * 异步方法错误捕获装饰器
 *
 * @param context - 错误上下文（可选）
 * @returns 方法装饰器
 */
export function catchErrors(context?: string) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        return await method.apply(this, args);
      } catch (error) {
        const appError = ErrorHandler.handleError(
          error,
          context || `${target.constructor.name}.${propertyName}`
        );
        ErrorHandler.logError(appError, { method: propertyName, args: sanitizeArgs(args) });
        throw appError;
      }
    };

    return descriptor;
  };
}

/**
 * 同步方法错误捕获装饰器
 *
 * @param context - 错误上下文（可选）
 * @returns 方法装饰器
 */
export function catchSyncErrors(context?: string) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;

    descriptor.value = function (...args: any[]) {
      try {
        return method.apply(this, args);
      } catch (error) {
        const appError = ErrorHandler.handleError(
          error,
          context || `${target.constructor.name}.${propertyName}`
        );
        ErrorHandler.logError(appError, { method: propertyName, args: sanitizeArgs(args) });
        throw appError;
      }
    };

    return descriptor;
  };
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 清理方法参数中的敏感信息
 *
 * @param args - 方法参数数组
 * @returns 清理后的参数数组
 */
function sanitizeArgs(args: any[]): any[] {
  const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'authorization'];

  return args.map(arg => {
    if (!arg || typeof arg !== 'object') {
      return arg;
    }

    const sanitized = { ...arg };

    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '***';
      }
    });

    return sanitized;
  });
}

/**
 * 创建错误重试包装器
 *
 * @param operation - 要重试的操作
 * @param maxRetries - 最大重试次数
 * @param delay - 重试延迟（毫秒）
 * @returns 带重试的操作
 */
export function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): () => Promise<T> {
  return async (): Promise<T> => {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // 检查是否可重试
        if (!ErrorHandler.isRetryable(lastError)) {
          throw lastError;
        }

        // 如果是最后一次尝试，不再等待
        if (attempt < maxRetries) {
          logger.error(`[ErrorHandler] Retry attempt ${attempt}/${maxRetries} after ${delay}ms`, {
            error: lastError.message
          });
          await sleep(delay);
          delay *= 2; // 指数退避
        }
      }
    }

    throw ErrorHandler.handleError(lastError);
  };
}

/**
 * 延迟函数
 *
 * @param ms - 延迟毫秒数
 * @returns Promise
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// 导出
// ============================================================================

export default ErrorHandler;
