/**
 * 全局错误处理器
 *
 * 捕获全局的未处理错误和Promise rejection
 * 提供统一的错误上报和处理机制
 */

import { logger } from '@/utils/logger';
import { logError } from '../services/errorLoggingService';

/**
 * 全局错误处理器配置
 */
export interface GlobalErrorHandlerConfig {
  /** 是否显示用户提示 */
  showAlert?: boolean;
  /** 自定义错误处理函数 */
  customHandler?: (event: ErrorEvent) => void;
  /** 是否在开发环境显示详细错误 */
  devMode?: boolean;
}

/**
 * 默认配置
 */
const defaultConfig: GlobalErrorHandlerConfig = {
  showAlert: false,
  devMode: import.meta.env.DEV,
};

/**
 * 全局错误处理器类
 */
class GlobalErrorHandler {
  private config: GlobalErrorHandlerConfig;
  private handleErrorBound: (event: ErrorEvent) => void;
  private handleUnhandledRejectionBound: (event: PromiseRejectionEvent) => void;

  constructor(config: GlobalErrorHandlerConfig = {}) {
    this.config = { ...defaultConfig, ...config };

    // 绑定方法以保持正确的 this 上下文
    this.handleErrorBound = this.handleError.bind(this);
    this.handleUnhandledRejectionBound = this.handleUnhandledRejection.bind(this);
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<GlobalErrorHandlerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 启动全局错误监听
   */
  start(): void {
    // 监听全局 JavaScript 错误
    window.addEventListener('error', this.handleErrorBound);

    // 监听未处理的 Promise rejection
    window.addEventListener('unhandledrejection', this.handleUnhandledRejectionBound);

    logger.error('✅ Global error handlers started');
  }

  /**
   * 停止全局错误监听
   */
  stop(): void {
    window.removeEventListener('error', this.handleErrorBound);
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejectionBound);

    logger.error('⏹️  Global error handlers stopped');
  }

  /**
   * 处理全局 JavaScript 错误
   */
  private handleError(event: ErrorEvent): void {
    // 阻止默认的错误处理
    event.preventDefault();

    // 构建错误对象
    const error = new Error(event.message);
    error.stack = event.error?.stack || '';

    // 记录错误
    logError(error, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      source: 'global-error',
      timestamp: new Date().toISOString(),
    });

    // 开发环境显示详细错误
    if (this.config.devMode) {
      console.group('%c❌ Global Error', 'color: #dc2626; font-weight: bold;');
      logger.error('Message:', event.message);
      logger.error('Source:', event.filename, event.lineno, event.colno);
      logger.error('Error:', event.error);
      console.groupEnd();
    }

    // 自定义处理
    if (this.config.customHandler) {
      this.config.customHandler(event);
    }

    // 显示用户提示
    if (this.config.showAlert) {
      this.showErrorAlert(event.message);
    }
  }

  /**
   * 处理未处理的 Promise rejection
   */
  private handleUnhandledRejection(event: PromiseRejectionEvent): void {
    // 阻止默认的错误处理
    event.preventDefault();

    // 构建错误对象
    let error: Error;
    if (event.reason instanceof Error) {
      error = event.reason;
    } else {
      error = new Error(String(event.reason));
    }

    // 记录错误
    logError(error, {
      source: 'unhandled-rejection',
      promise: 'Promise rejection',
      timestamp: new Date().toISOString(),
    });

    // 开发环境显示详细错误
    if (this.config.devMode) {
      console.group('%c❌ Unhandled Promise Rejection', 'color: #dc2626; font-weight: bold;');
      logger.error('Reason:', event.reason);
      logger.error('Promise:', event.promise);
      console.groupEnd();
    }

    // 显示用户提示
    if (this.config.showAlert) {
      this.showErrorAlert('操作失败，请稍后重试');
    }
  }

  /**
   * 显示错误提示（可选）
   */
  private showErrorAlert(message: string): void {
    // 创建自定义错误提示（避免使用 alert）
    const alertElement = document.createElement('div');
    alertElement.className = `
      fixed top-4 right-4 max-w-md bg-red-500 text-white px-6 py-4 rounded-lg shadow-lg
      z-[9999] animate-slide-in flex items-start gap-3
    `;
    alertElement.innerHTML = `
      <svg class="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div class="flex-1">
        <p class="font-medium">操作失败</p>
        <p class="text-sm text-red-100 mt-1">${message}</p>
      </div>
      <button class="text-red-100 hover:text-white" onclick="this.parentElement.remove()">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    `;

    document.body.appendChild(alertElement);

    // 3秒后自动移除
    setTimeout(() => {
      alertElement.remove();
    }, 3000);
  }
}

/**
 * 创建全局错误处理器实例
 */
const globalErrorHandler = new GlobalErrorHandler();

/**
 * 启动全局错误处理
 */
export function startGlobalErrorHandlers(config?: Partial<GlobalErrorHandlerConfig>): void {
  if (config) {
    globalErrorHandler.updateConfig(config);
  }
  globalErrorHandler.start();
}

/**
 * 停止全局错误处理
 */
export function stopGlobalErrorHandlers(): void {
  globalErrorHandler.stop();
}

/**
 * 手动记录错误
 */
export function reportError(error: Error, context?: Record<string, unknown>): void {
  logError(error, {
    ...context,
    source: 'manual-report',
    timestamp: new Date().toISOString(),
  });
}

/**
 * 导出全局错误处理器类（用于高级用法）
 */
export { GlobalErrorHandler };
export default globalErrorHandler;
