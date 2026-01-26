/**
 * 统一日志系统 - Unified Logger System
 *
 * 功能特性:
 * - 环境感知：开发环境显示所有日志，生产环境只显示error和warn
 * - 日志级别：ERROR > WARN > INFO > DEBUG > TRACE
 * - 统一格式：时间戳 + 级别 + 模块名 + 消息
 * - 性能优化：生产环境自动禁用低级别日志
 * - 可配置：支持环境变量配置日志级别
 *
 * @author Frontend Developer
 * @version 1.0.0
 */

/**
 * 日志级别枚举
 */
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4,
}

/**
 * 日志级别名称映射
 */
const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.TRACE]: 'TRACE',
};

/**
 * 日志级别颜色映射（浏览器环境）
 */
const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  [LogLevel.ERROR]: '#ff4444',
  [LogLevel.WARN]: '#ffbb33',
  [LogLevel.INFO]: '#33b5e5',
  [LogLevel.DEBUG]: '#aa66cc',
  [LogLevel.TRACE]: '#99cc00',
};

/**
 * 日志配置接口
 */
export interface LoggerConfig {
  minLevel: LogLevel;
  enableTimestamp: boolean;
  enableModulePrefix: boolean;
  enableColors: boolean;
  enableTrace: boolean;
}

/**
 * 日志接口
 */
export interface ILogger {
  error(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
  trace(message: string, ...args: any[]): void;
  setLevel(level: LogLevel): void;
  setModule(moduleName: string): void;
}

/**
 * 统一日志实现类
 */
class LoggerImpl implements ILogger {
  private level: LogLevel;
  private config: LoggerConfig;
  private moduleName: string;
  private isProduction: boolean;

  constructor(moduleName: string = 'App', config?: Partial<LoggerConfig>) {
    // 兼容浏览器和Node.js环境
    const isViteProd = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.PROD;
    const isNodeProd = typeof process !== 'undefined' && process.env?.NODE_ENV === 'production';
    this.isProduction = isViteProd || isNodeProd;
    this.moduleName = moduleName;

    // 从环境变量读取日志级别（兼容浏览器和Node.js环境）
    const envLogLevel = this.parseLogLevel(
      (typeof process !== 'undefined' && process.env?.VITE_LOG_LEVEL) || undefined
    );

    this.level = envLogLevel !== undefined
      ? envLogLevel
      : (this.isProduction ? LogLevel.WARN : LogLevel.DEBUG);

    // 默认配置
    this.config = {
      minLevel: this.level,
      enableTimestamp: !this.isProduction,
      enableModulePrefix: true,
      enableColors: !this.isProduction && typeof window !== 'undefined',
      enableTrace: !this.isProduction,
      ...config,
    };
  }

  /**
   * 解析日志级别字符串
   */
  private parseLogLevel(level?: string): LogLevel | undefined {
    if (!level) return undefined;

    const upperLevel = level.toUpperCase();
    switch (upperLevel) {
      case 'ERROR': return LogLevel.ERROR;
      case 'WARN': return LogLevel.WARN;
      case 'INFO': return LogLevel.INFO;
      case 'DEBUG': return LogLevel.DEBUG;
      case 'TRACE': return LogLevel.TRACE;
      default: return undefined;
    }
  }

  /**
   * 格式化日志前缀
   */
  private formatPrefix(level: LogLevel): string {
    const parts: string[] = [];

    if (this.config.enableTimestamp) {
      const timestamp = new Date().toISOString();
      parts.push(timestamp);
    }

    if (this.config.enableModulePrefix) {
      parts.push(`[${this.moduleName}]`);
    }

    parts.push(`[${LOG_LEVEL_NAMES[level]}]`);

    return parts.join(' ');
  }

  /**
   * 实际执行日志输出
   */
  private log(level: LogLevel, message: string, ...args: any[]): void {
    // 检查日志级别
    if (level > this.level) {
      return;
    }

    const prefix = this.formatPrefix(level);
    const fullMessage = `${prefix} ${message}`;

    // 根据级别选择console方法
    switch (level) {
      case LogLevel.ERROR:
        console.error(fullMessage, ...args);
        break;
      case LogLevel.WARN:
        console.warn(fullMessage, ...args);
        break;
      case LogLevel.INFO:
        console.log(fullMessage, ...args);
        break;
      case LogLevel.DEBUG:
        console.log(fullMessage, ...args);
        break;
      case LogLevel.TRACE:
        if (this.config.enableTrace) {
          console.log(fullMessage, ...args);
          if (args.length === 0 || !args[0]) {
            // 如果没有提供堆栈跟踪，自动添加
            console.trace('Stack trace');
          }
        }
        break;
    }
  }

  /**
   * 错误日志 - 生产环境保留
   */
  error(message: string, ...args: any[]): void {
    this.log(LogLevel.ERROR, message, ...args);
  }

  /**
   * 警告日志 - 生产环境保留
   */
  warn(message: string, ...args: any[]): void {
    this.log(LogLevel.WARN, message, ...args);
  }

  /**
   * 信息日志 - 开发环境
   */
  info(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, message, ...args);
  }

  /**
   * 调试日志 - 开发环境
   */
  debug(message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  /**
   * 追踪日志 - 开发环境，包含堆栈跟踪
   */
  trace(message: string, ...args: any[]): void {
    this.log(LogLevel.TRACE, message, ...args);
  }

  /**
   * 设置日志级别
   */
  setLevel(level: LogLevel): void {
    this.level = level;
    this.config.minLevel = level;
  }

  /**
   * 设置模块名称
   */
  setModule(moduleName: string): void {
    this.moduleName = moduleName;
  }

  /**
   * 创建子日志器（带有新的模块名）
   */
  createChild(childModuleName: string): ILogger {
    const fullModuleName = `${this.moduleName}:${childModuleName}`;
    return new LoggerImpl(fullModuleName, this.config);
  }
}

/**
 * 全局默认日志器
 */
export const logger = new LoggerImpl();

/**
 * 创建命名日志器工厂函数
 */
export function createLogger(moduleName: string, config?: Partial<LoggerConfig>): ILogger {
  return new LoggerImpl(moduleName, config);
}

/**
 * 导出类型和工具
 */
export type { LoggerConfig };
export { LoggerImpl };
export default logger;
