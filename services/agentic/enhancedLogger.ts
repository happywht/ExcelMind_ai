/**
 * 增强的日志工具
 *
 * 提供详细的日志记录功能，包括数据流跟踪、错误上下文记录等
 */

/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * 数据流日志接口
 */
export interface DataFlowLog {
  timestamp: number;
  stage: string;
  input: {
    type: string;
    length?: number;
    keys?: string[];
    sample: string;
  };
  output: {
    type: string;
    length?: number;
    keys?: string[];
    sample: string;
  };
  metadata?: any;
}

/**
 * 错误上下文日志接口
 */
export interface ErrorContextLog {
  timestamp: number;
  stage: string;
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  input?: string;
  variables?: Record<string, any>;
  metadata?: any;
}

/**
 * 性能日志接口
 */
export interface PerformanceLog {
  timestamp: number;
  operation: string;
  duration: number;
  metadata?: any;
}

/**
 * 增强的日志记录器
 */
export class EnhancedLogger {
  private static currentLogLevel: LogLevel = LogLevel.INFO;
  private static logs: Array<DataFlowLog | ErrorContextLog | PerformanceLog> = [];

  /**
   * 设置日志级别
   */
  static setLogLevel(level: LogLevel): void {
    this.currentLogLevel = level;
  }

  /**
   * 获取所有日志
   */
  static getLogs(): Array<DataFlowLog | ErrorContextLog | PerformanceLog> {
    return [...this.logs];
  }

  /**
   * 清空日志
   */
  static clearLogs(): void {
    this.logs = [];
  }

  /**
   * 记录数据流转换
   *
   * @param stage - 转换阶段名称
   * @param inputData - 输入数据
   * @param outputData - 输出数据
   * @param metadata - 额外元数据
   */
  static logDataTransformation(
    stage: string,
    inputData: any,
    outputData: any,
    metadata?: any
  ): void {
    const log: DataFlowLog = {
      timestamp: Date.now(),
      stage,
      input: {
        type: Array.isArray(inputData) ? 'array' : typeof inputData,
        length: Array.isArray(inputData) ? inputData.length : undefined,
        keys: inputData && typeof inputData === 'object' ? Object.keys(inputData) : undefined,
        sample: this.safeStringify(inputData)?.substring(0, 200) || 'null'
      },
      output: {
        type: Array.isArray(outputData) ? 'array' : typeof outputData,
        length: Array.isArray(outputData) ? outputData.length : undefined,
        keys: outputData && typeof outputData === 'object' ? Object.keys(outputData) : undefined,
        sample: this.safeStringify(outputData)?.substring(0, 200) || 'null'
      },
      metadata
    };

    this.logs.push(log);

    if (this.shouldLog(LogLevel.INFO)) {
      console.log(`[DataFlow] ${stage}`, this.formatLog(log));
    }
  }

  /**
   * 记录错误上下文
   *
   * @param error - 错误对象
   * @param context - 错误上下文
   */
  static logErrorWithContext(
    error: Error,
    context: {
      stage: string;
      input?: any;
      variables?: Record<string, any>;
      stack?: string;
    }
  ): void {
    const log: ErrorContextLog = {
      timestamp: Date.now(),
      stage: context.stage,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      input: context.input ? this.safeStringify(context.input)?.substring(0, 500) : undefined,
      variables: context.variables,
      metadata: context
    };

    this.logs.push(log);

    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(`[ErrorWithContext]`, this.formatLog(log));
    }
  }

  /**
   * 记录性能指标
   *
   * @param operation - 操作名称
   * @param duration - 持续时间（毫秒）
   * @param metadata - 额外元数据
   */
  static logPerformance(
    operation: string,
    duration: number,
    metadata?: any
  ): void {
    const log: PerformanceLog = {
      timestamp: Date.now(),
      operation,
      duration,
      metadata
    };

    this.logs.push(log);

    if (this.shouldLog(LogLevel.INFO)) {
      console.log(`[Performance] ${operation} took ${duration}ms`, metadata || '');
    }
  }

  /**
   * 记录调试信息
   *
   * @param message - 消息
   * @param data - 数据
   */
  static logDebug(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(`[Debug] ${message}`, data || '');
    }
  }

  /**
   * 记录信息
   *
   * @param message - 消息
   * @param data - 数据
   */
  static logInfo(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(`[Info] ${message}`, data || '');
    }
  }

  /**
   * 记录警告
   *
   * @param message - 消息
   * @param data - 数据
   */
  static logWarning(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(`[Warning] ${message}`, data || '');
    }
  }

  /**
   * 记录错误
   *
   * @param message - 消息
   * @param data - 数据
   */
  static logError(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(`[Error] ${message}`, data || '');
    }
  }

  /**
   * 判断是否应该记录日志
   */
  private static shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const currentLevelIndex = levels.indexOf(this.currentLogLevel);
    const messageLevelIndex = levels.indexOf(level);

    return messageLevelIndex >= currentLevelIndex;
  }

  /**
   * 安全地序列化对象
   */
  private static safeStringify(obj: any, maxDepth = 3, currentDepth = 0): string | null {
    try {
      if (currentDepth >= maxDepth) {
        return '[Max depth reached]';
      }

      if (obj === null) {
        return 'null';
      }

      if (obj === undefined) {
        return 'undefined';
      }

      if (typeof obj === 'string') {
        return obj;
      }

      if (typeof obj === 'number' || typeof obj === 'boolean') {
        return String(obj);
      }

      if (Array.isArray(obj)) {
        return `[Array(${obj.length})]`;
      }

      if (obj instanceof Error) {
        return `[Error: ${obj.message}]`;
      }

      if (obj instanceof Date) {
        return `[Date: ${obj.toISOString()}]`;
      }

      if (typeof obj === 'object') {
        const keys = Object.keys(obj);
        return `{Object(${keys.length} keys): ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''}}`;
      }

      return String(obj);
    } catch (error) {
      return '[Unserializable]';
    }
  }

  /**
   * 格式化日志输出
   */
  private static formatLog(log: DataFlowLog | ErrorContextLog | PerformanceLog): string {
    return JSON.stringify(log, null, 2);
  }

  /**
   * 导出日志为 JSON
   */
  static exportLogsAsJSON(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * 导出日志为文本
   */
  static exportLogsAsText(): string {
    return this.logs.map(log => JSON.stringify(log, null, 2)).join('\n\n');
  }

  /**
   * 过滤日志
   */
  static filterLogs<T extends DataFlowLog | ErrorContextLog | PerformanceLog>(
    predicate: (log: T) => boolean
  ): T[] {
    return this.logs.filter(predicate) as T[];
  }

  /**
   * 按时间范围过滤日志
   */
  static filterLogsByTimeRange(startTime: number, endTime: number): Array<DataFlowLog | ErrorContextLog | PerformanceLog> {
    return this.logs.filter(log => log.timestamp >= startTime && log.timestamp <= endTime);
  }

  /**
   * 按阶段过滤日志
   */
  static filterLogsByStage(stage: string): Array<DataFlowLog | ErrorContextLog | PerformanceLog> {
    return this.logs.filter(log => 'stage' in log && log.stage === stage);
  }

  /**
   * 获取性能统计
   */
  static getPerformanceStats(operation?: string): {
    count: number;
    totalDuration: number;
    averageDuration: number;
    minDuration: number;
    maxDuration: number;
  } {
    const perfLogs = this.logs.filter(
      (log): log is PerformanceLog =>
        'operation' in log &&
        (!operation || log.operation === operation)
    );

    if (perfLogs.length === 0) {
      return {
        count: 0,
        totalDuration: 0,
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0
      };
    }

    const durations = perfLogs.map(log => log.duration);

    return {
      count: durations.length,
      totalDuration: durations.reduce((a, b) => a + b, 0),
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations)
    };
  }

  /**
   * 获取错误统计
   */
  static getErrorStats(): {
    totalErrors: number;
    errorsByStage: Record<string, number>;
    errorsByType: Record<string, number>;
  } {
    const errorLogs = this.logs.filter(
      (log): log is ErrorContextLog => 'error' in log
    );

    const errorsByStage: Record<string, number> = {};
    const errorsByType: Record<string, number> = {};

    errorLogs.forEach(log => {
      // 按阶段统计
      errorsByStage[log.stage] = (errorsByStage[log.stage] || 0) + 1;

      // 按错误类型统计
      const errorType = log.error.name || 'Unknown';
      errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;
    });

    return {
      totalErrors: errorLogs.length,
      errorsByStage,
      errorsByType
    };
  }
}

/**
 * 性能测量工具
 */
export class PerformanceMeasure {
  private startTime: number;
  private operation: string;
  private metadata?: any;

  constructor(operation: string, metadata?: any) {
    this.operation = operation;
    this.metadata = metadata;
    this.startTime = Date.now();
  }

  /**
   * 结束测量并记录
   */
  end(): number {
    const duration = Date.now() - this.startTime;
    EnhancedLogger.logPerformance(this.operation, duration, this.metadata);
    return duration;
  }

  /**
   * 异步测量
   */
  static async measure<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: any
  ): Promise<T> {
    const measure = new PerformanceMeasure(operation, metadata);
    try {
      return await fn();
    } finally {
      measure.end();
    }
  }

  /**
   * 同步测量
   */
  static measureSync<T>(
    operation: string,
    fn: () => T,
    metadata?: any
  ): T {
    const measure = new PerformanceMeasure(operation, metadata);
    try {
      return fn();
    } finally {
      measure.end();
    }
  }
}
