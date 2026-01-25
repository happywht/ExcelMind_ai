/**
 * 性能追踪器
 *
 * 提供便捷的性能追踪装饰器和工具函数
 */

import { MetricsCollector } from './metricsCollector';

// ============================================================================
// 性能追踪上下文
// ============================================================================

interface PerformanceTrackerContext {
  name: string;
  startTime: number;
  metadata?: Record<string, any>;
}

// ============================================================================
// 性能追踪器实现
// ============================================================================

export class PerformanceTracker {
  private static collector: MetricsCollector;
  private static activeTrackers = new Map<string, PerformanceTrackerContext>();

  /**
   * 设置指标收集器
   */
  static setCollector(collector: MetricsCollector): void {
    PerformanceTracker.collector = collector;
  }

  /**
   * 追踪同步函数执行时间
   */
  static trackFunction<T>(
    fn: () => T,
    metricName: string,
    metadata?: Record<string, any>
  ): T {
    const startTime = performance.now();
    const trackerId = PerformanceTracker.startTracking(metricName, metadata);

    try {
      const result = fn();
      const duration = performance.now() - startTime;
      PerformanceTracker.stopTracking(trackerId, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      PerformanceTracker.stopTracking(trackerId, duration, false);
      throw error;
    }
  }

  /**
   * 追踪异步函数执行时间
   */
  static async trackAsyncFunction<T>(
    fn: () => Promise<T>,
    metricName: string,
    metadata?: Record<string, any>
  ): Promise<T> {
    const startTime = performance.now();
    const trackerId = PerformanceTracker.startTracking(metricName, metadata);

    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      PerformanceTracker.stopTracking(trackerId, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      PerformanceTracker.stopTracking(trackerId, duration, false);
      throw error;
    }
  }

  /**
   * 追踪查询执行
   */
  static async trackQuery<T>(
    query: string,
    queryType: 'simple' | 'aggregate' | 'join' | 'complex',
    fn: () => Promise<T>,
    metadata?: {
      cached?: boolean;
      tables?: string[];
    }
  ): Promise<T> {
    const startTime = performance.now();

    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      const rowCount = Array.isArray(result) ? result.length : 0;

      // 记录查询性能指标
      if (PerformanceTracker.collector) {
        PerformanceTracker.collector.collectQueryPerformance({
          query,
          executionTime: duration,
          rowCount,
          queryType,
          cached: metadata?.cached || false,
          tables: metadata?.tables
        });
      }

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      // 即使失败也记录指标
      if (PerformanceTracker.collector) {
        PerformanceTracker.collector.collectQueryPerformance({
          query,
          executionTime: duration,
          rowCount: 0,
          queryType,
          cached: false,
          tables: metadata?.tables
        });
      }

      throw error;
    }
  }

  /**
   * 追踪AI调用
   */
  static async trackAICall<T>(
    prompt: string,
    callType: 'formula' | 'chat' | 'data_processing' | 'mapping',
    model: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();
    const promptLength = prompt.length;

    try {
      const result = await fn();
      const duration = performance.now() - startTime;

      // 尝试估算响应长度
      let responseLength = 0;
      if (typeof result === 'string') {
        responseLength = result.length;
      } else if (result) {
        responseLength = JSON.stringify(result).length;
      }

      // 记录AI性能指标
      if (PerformanceTracker.collector) {
        PerformanceTracker.collector.collectAIResponseTime({
          prompt,
          responseTime: duration,
          promptLength,
          responseLength,
          model,
          callType,
          success: true
        });
      }

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      // 记录失败的AI调用
      if (PerformanceTracker.collector) {
        PerformanceTracker.collector.collectAIResponseTime({
          prompt,
          responseTime: duration,
          promptLength,
          responseLength: 0,
          model,
          callType,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }

      throw error;
    }
  }

  /**
   * 追踪文档生成
   */
  static async trackDocumentGeneration<T>(
    templateName: string,
    dataRowCount: number,
    method: 'single' | 'batch',
    fn: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();

    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      const documentCount = Array.isArray(result) ? result.length : 1;

      // 记录文档生成性能指标
      if (PerformanceTracker.collector) {
        PerformanceTracker.collector.collectDocumentGeneration({
          templateName,
          dataRowCount,
          documentCount,
          generationTime: duration,
          method,
          status: 'success'
        });
      }

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      // 记录失败的文档生成
      if (PerformanceTracker.collector) {
        PerformanceTracker.collector.collectDocumentGeneration({
          templateName,
          dataRowCount,
          documentCount: 0,
          generationTime: duration,
          method,
          status: 'failed'
        });
      }

      throw error;
    }
  }

  /**
   * 创建方法装饰器
   */
  static createDecorator(
    metricName?: string,
    metadata?: Record<string, any>
  ): MethodDecorator {
    return function (
      target: any,
      propertyKey: string | symbol,
      descriptor: PropertyDescriptor
    ) {
      const originalMethod = descriptor.value;
      const name = metricName || `${target.constructor.name}.${String(propertyKey)}`;

      descriptor.value = async function (...args: any[]) {
        return PerformanceTracker.trackAsyncFunction(
          () => originalMethod.apply(this, args),
          name,
          metadata
        );
      };

      return descriptor;
    };
  }

  /**
   * 创建类装饰器（追踪所有方法）
   */
  static createClassDecorator(
    prefix?: string,
    excludeMethods: string[] = []
  ): ClassDecorator {
    return function <T extends { new (...args: any[]): {} }>(constructor: T): { new (...args: any[]): {} } {
      return class extends constructor {
        constructor(...args: any[]) {
          super(...args);

          // 获取所有方法
          const prototype = constructor.prototype;
          const methodNames = Object.getOwnPropertyNames(prototype).filter(
            name => typeof prototype[name] === 'function' &&
                    name !== 'constructor' &&
                    !excludeMethods.includes(name)
          );

          // 装饰每个方法
          methodNames.forEach(methodName => {
            const originalMethod = prototype[methodName];
            const metricName = prefix ? `${prefix}.${methodName}` : `${constructor.name}.${methodName}`;

            prototype[methodName] = function (...args: any[]) {
              if (originalMethod.constructor.name === 'AsyncFunction') {
                return PerformanceTracker.trackAsyncFunction(
                  () => originalMethod.apply(this, args),
                  metricName
                );
              } else {
                return PerformanceTracker.trackFunction(
                  () => originalMethod.apply(this, args),
                  metricName
                );
              }
            };
          });
        }
      };
    };
  }

  /**
   * 开始手动追踪
   */
  static startTracking(name: string, metadata?: Record<string, any>): string {
    const trackerId = `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const context: PerformanceTrackerContext = {
      name,
      startTime: performance.now(),
      metadata
    };

    PerformanceTracker.activeTrackers.set(trackerId, context);
    return trackerId;
  }

  /**
   * 停止手动追踪
   */
  static stopTracking(
    trackerId: string,
    duration?: number,
    success: boolean = true
  ): void {
    const context = PerformanceTracker.activeTrackers.get(trackerId);

    if (!context) {
      console.warn(`Tracker ${trackerId} not found`);
      return;
    }

    const actualDuration = duration ?? (performance.now() - context.startTime);

    if (PerformanceTracker.collector) {
      PerformanceTracker.collector.collectCustomMetric({
        name: context.name,
        value: actualDuration,
        unit: 'ms',
        metadata: {
          ...context.metadata,
          success
        },
        tags: ['custom', success ? 'success' : 'error']
      });
    }

    PerformanceTracker.activeTrackers.delete(trackerId);
  }

  /**
   * 测量操作时间（便捷方法）
   */
  static measure<T>(
    name: string,
    fn: () => T
  ): { result: T; duration: number } {
    const startTime = performance.now();
    const result = fn();
    const duration = performance.now() - startTime;

    if (PerformanceTracker.collector) {
      PerformanceTracker.collector.collectCustomMetric({
        name,
        value: duration,
        unit: 'ms'
      });
    }

    return { result, duration };
  }

  /**
   * 异步测量操作时间（便捷方法）
   */
  static async measureAsync<T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<{ result: T; duration: number }> {
    const startTime = performance.now();
    const result = await fn();
    const duration = performance.now() - startTime;

    if (PerformanceTracker.collector) {
      PerformanceTracker.collector.collectCustomMetric({
        name,
        value: duration,
        unit: 'ms'
      });
    }

    return { result, duration };
  }

  /**
   * 获取活跃追踪器列表
   */
  static getActiveTrackers(): Map<string, PerformanceTrackerContext> {
    return new Map(PerformanceTracker.activeTrackers);
  }

  /**
   * 清除所有活跃追踪器
   */
  static clearActiveTrackers(): void {
    PerformanceTracker.activeTrackers.clear();
  }
}

// ============================================================================
// 性能追踪配置
// ============================================================================

/**
 * 配置全局性能追踪
 */
export function configurePerformanceTracking(collector: MetricsCollector): void {
  PerformanceTracker.setCollector(collector);
}

// ============================================================================
// 装饰器导出（便捷使用）
// ============================================================================

/**
 * 追踪方法性能的装饰器工厂
 */
export function TrackPerformance(metricName?: string, metadata?: Record<string, any>): MethodDecorator {
  return PerformanceTracker.createDecorator(metricName, metadata);
}

/**
 * 追踪查询的装饰器工厂
 */
export function TrackQuery(
  queryType: 'simple' | 'aggregate' | 'join' | 'complex' = 'simple'
): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const name = `${target.constructor.name}.${String(propertyKey)}`;

    descriptor.value = async function (...args: any[]) {
      // 尝试从参数中提取查询信息
      let query = 'unknown';
      let cached = false;
      let tables: string[] | undefined;

      if (args.length > 0) {
        if (typeof args[0] === 'string') {
          query = args[0];
        } else if (args[0]?.query) {
          query = args[0].query;
        }
      }

      return PerformanceTracker.trackQuery(
        query,
        queryType,
        () => originalMethod.apply(this, args),
        { cached, tables }
      );
    };

    return descriptor;
  };
}

/**
 * 追踪AI调用的装饰器工厂
 */
export function TrackAICall(
  callType: 'formula' | 'chat' | 'data_processing' | 'mapping' = 'chat',
  model: string = 'glm-4.6'
): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // 尝试从参数中提取提示词
      let prompt = '';
      if (args.length > 0 && typeof args[0] === 'string') {
        prompt = args[0];
      } else if (args.length > 0 && args[0]?.prompt) {
        prompt = args[0].prompt;
      }

      return PerformanceTracker.trackAICall(
        prompt,
        callType,
        model,
        () => originalMethod.apply(this, args)
      );
    };

    return descriptor;
  };
}

/**
 * 追踪文档生成的装饰器工厂
 */
export function TrackDocumentGeneration(
  method: 'single' | 'batch' = 'single'
): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // 尝试从参数中提取模板名称和数据行数
      let templateName = 'unknown';
      let dataRowCount = 0;

      if (args.length > 0) {
        if (typeof args[0] === 'object') {
          templateName = args[0].templateName || templateName;
          dataRowCount = args[0].dataRowCount || dataRowCount;
        }
      }

      return PerformanceTracker.trackDocumentGeneration(
        templateName,
        dataRowCount,
        method,
        () => originalMethod.apply(this, args)
      );
    };

    return descriptor;
  };
}
