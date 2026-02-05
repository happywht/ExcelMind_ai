import { logger } from '@/utils/logger';
/**
 * 错误日志服务
 *
 * 提供统一的错误日志记录功能
 * 支持本地存储、控制台输出和远程上报
 */

/**
 * 错误日志条目接口
 */
export interface ErrorLogEntry {
  /** 错误对象 */
  error: Error;
  /** 错误信息 */
  message: string;
  /** 错误堆栈 */
  stack?: string;
  /** 组件堆栈（React错误边界） */
  componentStack?: string;
  /** 是否来自错误边界 */
  errorBoundary?: boolean;
  /** 时间戳 */
  timestamp: string;
  /** 页面URL */
  url?: string;
  /** 用户信息（可选） */
  userInfo?: Record<string, unknown>;
  /** 额外的上下文信息 */
  context?: Record<string, unknown>;
}

/**
 * 错误日志配置接口
 */
export interface ErrorLoggingConfig {
  /** 是否启用控制台日志 */
  enableConsole?: boolean;
  /** 是否启用本地存储 */
  enableLocalStorage?: boolean;
  /** 是否启用远程上报 */
  enableRemote?: boolean;
  /** 远程上报端点 */
  remoteEndpoint?: string;
  /** 本地存储的最大条目数 */
  maxLocalStorageEntries?: number;
  /** 自定义上报函数 */
  customReporter?: (logEntry: ErrorLogEntry) => void | Promise<void>;
}

/**
 * 默认配置
 */
const defaultConfig: ErrorLoggingConfig = {
  enableConsole: true,
  enableLocalStorage: true,
  enableRemote: false,
  maxLocalStorageEntries: 50,
};

/**
 * 错误日志服务类
 */
class ErrorLoggingService {
  private config: ErrorLoggingConfig;
  private storageKey = 'errordetails';

  constructor(config: ErrorLoggingConfig = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<ErrorLoggingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 记录错误
   */
  async logError(
    error: Error,
    context: {
      componentStack?: string;
      errorBoundary?: boolean;
      timestamp?: string;
      userInfo?: Record<string, unknown>;
      [key: string]: unknown;
    } = {}
  ): Promise<void> {
    const logEntry: ErrorLogEntry = {
      error,
      message: error.message,
      stack: error.stack,
      componentStack: context.componentStack,
      errorBoundary: context.errorBoundary,
      timestamp: context.timestamp || new Date().toISOString(),
      url: window.location.href,
      userInfo: context.userInfo,
      context,
    };

    // 控制台输出
    if (this.config.enableConsole) {
      this.logToConsole(logEntry);
    }

    // 本地存储
    if (this.config.enableLocalStorage) {
      this.logToLocalStorage(logEntry);
    }

    // 自定义上报
    if (this.config.customReporter) {
      try {
        await this.config.customReporter(logEntry);
      } catch (reportError) {
        logger.error('Custom error reporter failed:', reportError);
      }
    }

    // 远程上报
    if (this.config.enableRemote && this.config.remoteEndpoint) {
      await this.logToRemote(logEntry);
    }
  }

  /**
   * 控制台输出
   */
  private logToConsole(logEntry: ErrorLogEntry): void {
    const logStyle = 'color: #dc2626; font-weight: bold;';
    const labelStyle = 'color: #64748b;';

    console.group('%c❌ Error Logged', logStyle);
    logger.debug('%cMessage:', labelStyle, logEntry.message);
    logger.debug('%cTime:', labelStyle, logEntry.timestamp);
    logger.debug('%cURL:', labelStyle, logEntry.url);

    if (logEntry.componentStack) {
      logger.debug('%cComponent Stack:', labelStyle, logEntry.componentStack);
    }

    if (logEntry.stack) {
      logger.debug('%cStack Trace:', labelStyle, logEntry.stack);
    }

    if (logEntry.context) {
      logger.debug('%cContext:', labelStyle, logEntry.context);
    }

    console.groupEnd();
  }

  /**
   * 本地存储
   */
  private logToLocalStorage(logEntry: ErrorLogEntry): void {
    try {
      // 获取现有日志
      const existingLogs = this.getStoredLogs();
      const updatedLogs = [...existingLogs, logEntry];

      // 限制存储条目数
      const maxEntries = this.config.maxLocalStorageEntries || 50;
      const trimmedLogs = updatedLogs.slice(-maxEntries);

      // 保存到本地存储
      localStorage.setItem(this.storageKey, JSON.stringify(trimmedLogs));
    } catch (error) {
      logger.error('Failed to save error log to localStorage:', error);
    }
  }

  /**
   * 远程上报
   */
  private async logToRemote(logEntry: ErrorLogEntry): Promise<void> {
    if (!this.config.remoteEndpoint) {
      return;
    }

    try {
      const response = await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logEntry),
      });

      if (!response.ok) {
        throw new Error(`Remote logging failed: ${response.statusText}`);
      }
    } catch (error) {
      logger.error('Failed to send error log to remote server:', error);
    }
  }

  /**
   * 获取存储的错误日志
   */
  getStoredLogs(): ErrorLogEntry[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      logger.error('Failed to retrieve error logs from localStorage:', error);
      return [];
    }
  }

  /**
   * 清除存储的错误日志
   */
  clearStoredLogs(): void {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      logger.error('Failed to clear error logs from localStorage:', error);
    }
  }

  /**
   * 导出错误日志为JSON
   */
  exportLogs(): string {
    const logs = this.getStoredLogs();
    return JSON.stringify(logs, null, 2);
  }

  /**
   * 获取错误统计信息
   */
  getErrorStats(): {
    totalErrors: number;
    errorBoundaryErrors: number;
    mostCommonErrors: Array<{ message: string; count: number }>;
  } {
    const logs = this.getStoredLogs();
    const errorBoundaryErrors = logs.filter((log) => log.errorBoundary).length;

    // 统计最常见的错误
    const errorCounts = new Map<string, number>();
    logs.forEach((log) => {
      const message = log.message || 'Unknown Error';
      errorCounts.set(message, (errorCounts.get(message) || 0) + 1);
    });

    const mostCommonErrors = Array.from(errorCounts.entries())
      .map(([message, count]) => ({ message, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalErrors: logs.length,
      errorBoundaryErrors,
      mostCommonErrors,
    };
  }
}

/**
 * 创建全局错误日志服务实例
 */
const errorLoggingService = new ErrorLoggingService();

/**
 * 便捷函数：记录错误
 */
export function logError(
  error: Error,
  context?: {
    componentStack?: string;
    errorBoundary?: boolean;
    timestamp?: string;
    userInfo?: Record<string, unknown>;
    [key: string]: unknown;
  }
): void {
  errorLoggingService.logError(error, context).catch((err) => {
    logger.error('Failed to log error:', err);
  });
}

/**
 * 便捷函数：配置错误日志服务
 */
export function configureErrorLogging(config: Partial<ErrorLoggingConfig>): void {
  errorLoggingService.updateConfig(config);
}

/**
 * 便捷函数：获取错误日志
 */
export function getErrorLogs(): ErrorLogEntry[] {
  return errorLoggingService.getStoredLogs();
}

/**
 * 便捷函数：清除错误日志
 */
export function clearErrorLogs(): void {
  errorLoggingService.clearStoredLogs();
}

/**
 * 便捷函数：导出错误日志
 */
export function exportErrorLogs(): string {
  return errorLoggingService.exportLogs();
}

/**
 * 便捷函数：获取错误统计
 */
export function getErrorStats() {
  return errorLoggingService.getErrorStats();
}

/**
 * 导出错误日志服务类（用于高级用法）
 */
export { ErrorLoggingService };
export default errorLoggingService;
