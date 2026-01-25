/**
 * 性能指标收集器
 *
 * 负责收集系统各模块的性能指标
 */

import {
  PerformanceMetric,
  QueryPerformance,
  AIPerformance,
  DocumentPerformance,
  ResourceUsage,
  UXMetrics,
  UXEvent,
  MetricType
} from './types';

// ============================================================================
// 指标收集器配置
// ============================================================================

interface MetricsCollectorConfig {
  /** 最大缓存指标数 */
  maxCacheSize: number;
  /** 采样率 (0-1) */
  sampleRate: number;
  /** 是否启用资源监控 */
  enableResourceMonitoring: boolean;
  /** 资源监控间隔（毫秒） */
  resourceMonitoringInterval: number;
}

// ============================================================================
// 指标收集器实现
// ============================================================================

export class MetricsCollector {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private resourceMonitorInterval: number | null = null;
  private config: MetricsCollectorConfig;

  constructor(config: Partial<MetricsCollectorConfig> = {}) {
    this.config = {
      maxCacheSize: 10000,
      sampleRate: 1.0,
      enableResourceMonitoring: true,
      resourceMonitoringInterval: 5000,
      ...config
    };

    if (this.config.enableResourceMonitoring) {
      this.startResourceMonitoring();
    }
  }

  // ========================================================================
  // 公共方法 - 指标收集
  // ========================================================================

  /**
   * 收集查询性能指标
   */
  collectQueryPerformance(params: {
    query: string;
    executionTime: number;
    rowCount: number;
    queryType: 'simple' | 'aggregate' | 'join' | 'complex';
    cached: boolean;
    tables?: string[];
  }): QueryPerformance {
    const metric: QueryPerformance = {
      type: 'query',
      name: 'query.execution',
      value: params.executionTime,
      unit: 'ms',
      timestamp: Date.now(),
      query: params.query,
      executionTime: params.executionTime,
      rowCount: params.rowCount,
      queryType: params.queryType,
      cached: params.cached,
      tables: params.tables,
      metadata: {
        rowCount: params.rowCount,
        cached: params.cached
      },
      tags: ['query', params.queryType, params.cached ? 'cached' : 'uncached']
    };

    this.storeMetric('query', metric);

    return metric;
  }

  /**
   * 收集AI响应时间指标
   */
  collectAIResponseTime(params: {
    prompt: string;
    responseTime: number;
    promptLength: number;
    responseLength: number;
    tokensUsed?: number;
    model: string;
    callType: 'formula' | 'chat' | 'data_processing' | 'mapping';
    success: boolean;
    error?: string;
  }): AIPerformance {
    const metric: AIPerformance = {
      type: 'ai_call',
      name: 'ai.response_time',
      value: params.responseTime,
      unit: 'ms',
      timestamp: Date.now(),
      promptLength: params.promptLength,
      responseLength: params.responseLength,
      tokensUsed: params.tokensUsed || this.estimateTokens(params.prompt, params.responseLength),
      model: params.model,
      callType: params.callType,
      success: params.success,
      error: params.error,
      metadata: {
        model: params.model,
        callType: params.callType,
        success: params.success
      },
      tags: ['ai', params.callType, params.success ? 'success' : 'error']
    };

    this.storeMetric('ai', metric);

    return metric;
  }

  /**
   * 收集文档生成性能指标
   */
  collectDocumentGeneration(params: {
    templateName: string;
    dataRowCount: number;
    documentCount: number;
    generationTime: number;
    method: 'single' | 'batch';
    status: 'success' | 'partial' | 'failed';
  }): DocumentPerformance {
    const metric: DocumentPerformance = {
      type: 'document',
      name: 'document.generation',
      value: params.generationTime,
      unit: 'ms',
      timestamp: Date.now(),
      templateName: params.templateName,
      dataRowCount: params.dataRowCount,
      documentCount: params.documentCount,
      generationTime: params.generationTime,
      method: params.method,
      status: params.status,
      metadata: {
        templateName: params.templateName,
        documentCount: params.documentCount,
        dataRowCount: params.dataRowCount
      },
      tags: ['document', params.method, params.status]
    };

    this.storeMetric('document', metric);

    return metric;
  }

  /**
   * 收集系统资源使用情况
   */
  collectResourceUsage(): ResourceUsage {
    const usage: ResourceUsage = {
      memory: this.getMemoryUsage(),
      cpu: this.getCpuUsage(),
      storage: this.getStorageUsage(),
      timestamp: Date.now()
    };

    // 存储内存使用指标
    this.storeMetric('memory', {
      type: 'memory',
      name: 'memory.usage',
      value: usage.memory.used,
      unit: 'bytes',
      timestamp: usage.timestamp,
      metadata: {
        total: usage.memory.total,
        percentage: usage.memory.percentage
      },
      tags: ['resource', 'memory']
    });

    // 存储CPU使用指标
    this.storeMetric('cpu', {
      type: 'cpu',
      name: 'cpu.usage',
      value: usage.cpu.percentage,
      unit: '%',
      timestamp: usage.timestamp,
      metadata: {
        cores: usage.cpu.cores
      },
      tags: ['resource', 'cpu']
    });

    return usage;
  }

  /**
   * 收集用户体验指标
   */
  collectUXMetrics(event: UXEvent): UXMetrics {
    const metric: UXMetrics = {
      type: 'ux',
      name: `ux.${event.eventType}`,
      value: 1,
      unit: 'count',
      timestamp: Date.now(),
      eventType: event.eventType,
      target: event.target,
      metadata: {
        page: event.page,
        data: event.data
      },
      tags: ['ux', event.eventType]
    };

    this.storeMetric('ux', metric);

    return metric;
  }

  /**
   * 记录页面加载时间
   */
  recordPageLoadTime(pageLoadTime: number, additionalMetrics?: {
    firstContentfulPaint?: number;
    timeToInteractive?: number;
    cumulativeLayoutShift?: number;
    firstInputDelay?: number;
  }): UXMetrics {
    const metric: UXMetrics = {
      type: 'ux',
      name: 'ux.page_load',
      value: pageLoadTime,
      unit: 'ms',
      timestamp: Date.now(),
      pageLoadTime: pageLoadTime,
      firstContentfulPaint: additionalMetrics?.firstContentfulPaint,
      timeToInteractive: additionalMetrics?.timeToInteractive,
      cumulativeLayoutShift: additionalMetrics?.cumulativeLayoutShift,
      firstInputDelay: additionalMetrics?.firstInputDelay,
      metadata: additionalMetrics || {},
      tags: ['ux', 'performance']
    };

    this.storeMetric('ux', metric);

    return metric;
  }

  /**
   * 收集缓存性能指标
   */
  collectCacheMetrics(params: {
    operation: 'hit' | 'miss' | 'set' | 'delete';
    key: string;
    size?: number;
    duration?: number;
  }): PerformanceMetric {
    const metric: PerformanceMetric = {
      type: 'cache',
      name: `cache.${params.operation}`,
      value: params.duration || 0,
      unit: 'ms',
      timestamp: Date.now(),
      metadata: {
        operation: params.operation,
        key: params.key,
        size: params.size
      },
      tags: ['cache', params.operation]
    };

    this.storeMetric('cache', metric);

    return metric;
  }

  /**
   * 收集自定义指标
   */
  collectCustomMetric(params: {
    name: string;
    value: number;
    unit: string;
    metadata?: Record<string, any>;
    tags?: string[];
  }): PerformanceMetric {
    const metric: PerformanceMetric = {
      type: 'custom',
      name: params.name,
      value: params.value,
      unit: params.unit as any,
      timestamp: Date.now(),
      metadata: params.metadata,
      tags: params.tags
    };

    this.storeMetric('custom', metric);

    return metric;
  }

  // ========================================================================
  // 公共方法 - 指标查询
  // ========================================================================

  /**
   * 获取指定类型的指标
   */
  getMetrics(type: MetricType, limit?: number): PerformanceMetric[] {
    const metrics = this.metrics.get(type) || [];
    return limit ? metrics.slice(-limit) : metrics;
  }

  /**
   * 获取指定时间范围的指标
   */
  getMetricsByTimeRange(type: MetricType, startTime: number, endTime: number): PerformanceMetric[] {
    const metrics = this.metrics.get(type) || [];
    return metrics.filter(m => m.timestamp >= startTime && m.timestamp <= endTime);
  }

  /**
   * 获取所有指标
   */
  getAllMetrics(): Map<string, PerformanceMetric[]> {
    return new Map(this.metrics);
  }

  /**
   * 清除指定类型的指标
   */
  clearMetrics(type?: MetricType): void {
    if (type) {
      this.metrics.delete(type);
    } else {
      this.metrics.clear();
    }
  }

  /**
   * 获取指标统计
   */
  getMetricsStats(): {
    totalMetrics: number;
    metricsByType: Record<string, number>;
    oldestMetric?: number;
    newestMetric?: number;
  } {
    let totalMetrics = 0;
    const metricsByType: Record<string, number> = {};
    let oldestMetric: number | undefined;
    let newestMetric: number | undefined;

    for (const [type, metrics] of this.metrics.entries()) {
      const count = metrics.length;
      totalMetrics += count;
      metricsByType[type] = count;

      if (metrics.length > 0) {
        const typeOldest = metrics[0].timestamp;
        const typeNewest = metrics[metrics.length - 1].timestamp;

        if (oldestMetric === undefined || typeOldest < oldestMetric) {
          oldestMetric = typeOldest;
        }
        if (newestMetric === undefined || typeNewest > newestMetric) {
          newestMetric = typeNewest;
        }
      }
    }

    return {
      totalMetrics,
      metricsByType,
      oldestMetric,
      newestMetric
    };
  }

  // ========================================================================
  // 私有方法
  // ========================================================================

  /**
   * 存储指标
   */
  private storeMetric(type: string, metric: PerformanceMetric): void {
    // 采样过滤
    if (Math.random() > this.config.sampleRate) {
      return;
    }

    if (!this.metrics.has(type)) {
      this.metrics.set(type, []);
    }

    const metrics = this.metrics.get(type)!;
    metrics.push(metric);

    // 检查缓存大小限制
    if (metrics.length > this.config.maxCacheSize) {
      metrics.shift(); // 移除最旧的指标
    }
  }

  /**
   * 启动资源监控
   */
  private startResourceMonitoring(): void {
    this.resourceMonitorInterval = window.setInterval(() => {
      this.collectResourceUsage();
    }, this.config.resourceMonitoringInterval);
  }

  /**
   * 停止资源监控
   */
  private stopResourceMonitoring(): void {
    if (this.resourceMonitorInterval !== null) {
      clearInterval(this.resourceMonitorInterval);
      this.resourceMonitorInterval = null;
    }
  }

  /**
   * 获取内存使用情况
   */
  private getMemoryUsage(): { used: number; total: number; limit: number; percentage: number } {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
      };
    }

    // 降级方案：返回估算值
    return {
      used: 50 * 1024 * 1024, // 50MB 估算
      total: 100 * 1024 * 1024, // 100MB 估算
      limit: 500 * 1024 * 1024, // 500MB 估算
      percentage: 10
    };
  }

  /**
   * 获取CPU使用情况
   */
  private getCpuUsage(): { percentage: number; cores: number } {
    // 浏览器环境无法直接获取CPU使用率，返回估算值
    return {
      percentage: 0, // 浏览器中无法获取
      cores: navigator.hardwareConcurrency || 4
    };
  }

  /**
   * 获取存储使用情况
   */
  private getStorageUsage(): { used: number; total: number; percentage: number } {
    if (navigator.storage && navigator.storage.estimate) {
      return navigator.storage.estimate().then(estimate => ({
        used: estimate.usage || 0,
        total: estimate.quota || 0,
        percentage: estimate.quota ? (estimate.usage || 0) / estimate.quota * 100 : 0
      })) as any;
    }

    return {
      used: 0,
      total: 0,
      percentage: 0
    };
  }

  /**
   * 估算token数量
   */
  private estimateTokens(prompt: string, responseLength: number): number {
    // 粗略估算：中文约1.5字符/token，英文约4字符/token
    const promptTokens = Math.ceil(prompt.length / 2);
    const responseTokens = Math.ceil(responseLength / 2);
    return promptTokens + responseTokens;
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.stopResourceMonitoring();
    this.metrics.clear();
  }
}

/**
 * 导出全局指标收集器实例
 */
export const globalMetricsCollector = new MetricsCollector();
