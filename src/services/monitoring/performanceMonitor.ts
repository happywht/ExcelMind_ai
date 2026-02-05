/**
 * 性能监控器
 *
 * 核心性能监控系统，提供实时监控、告警和报告功能
 */

import {
  PerformanceMetric,
  PerformanceReport,
  PerformanceThreshold,
  PerformanceAlert,
  AlertCallback,
  TimeRange,
  RealTimeMetrics
} from './types';
import { MetricsCollector } from './metricsCollector';
import { PerformanceAnalyzer } from './performanceAnalyzer';
import { BenchmarkEvaluator } from './performanceBenchmarks';
import { globalMetricsCollector } from './metricsCollector';

// ============================================================================
// 性能监控器配置
// ============================================================================

interface PerformanceMonitorConfig {
  /** 是否启用自动监控 */
  autoStart: boolean;
  /** 监控间隔（毫秒） */
  monitoringInterval: number;
  /** 指标保留时间（毫秒） */
  metricsRetention: number;
  /** 是否启用告警 */
  enableAlerts: boolean;
  /** 告警去重时间（毫秒） */
  alertDedupeTime: number;
}

// ============================================================================
// 性能监控器实现
// ============================================================================

export class PerformanceMonitor {
  private collector: MetricsCollector;
  private analyzer: PerformanceAnalyzer;
  private benchmarkEvaluator: BenchmarkEvaluator;

  private isMonitoring = false;
  private monitoringInterval: number | null = null;
  private alertCallbacks = new Map<string, { threshold: PerformanceThreshold; callback: AlertCallback }>();
  private activeAlerts = new Map<string, PerformanceAlert>();
  private lastAlertTime = new Map<string, number>();

  private config: PerformanceMonitorConfig;

  constructor(
    config?: Partial<PerformanceMonitorConfig>,
    collector?: MetricsCollector
  ) {
    this.config = {
      autoStart: true,
      monitoringInterval: 10000, // 10秒
      metricsRetention: 24 * 60 * 60 * 1000, // 24小时
      enableAlerts: true,
      alertDedupeTime: 60000, // 1分钟
      ...config
    };

    this.collector = collector || globalMetricsCollector;
    this.benchmarkEvaluator = new BenchmarkEvaluator();
    this.analyzer = new PerformanceAnalyzer(this.collector, this.benchmarkEvaluator);

    if (this.config.autoStart) {
      this.startMonitoring();
    }
  }

  // ========================================================================
  // 监控控制
  // ========================================================================

  /**
   * 开始监控
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      console.warn('[PerformanceMonitor] 监控已在运行中');
      return;
    }

    this.isMonitoring = true;

    // 定期清理过期指标
    this.monitoringInterval = window.setInterval(() => {
      this.performMaintenanceTasks();
    }, this.config.monitoringInterval);

    console.log('[PerformanceMonitor] 监控已启动');
  }

  /**
   * 停止监控
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      console.warn('[PerformanceMonitor] 监控未运行');
      return;
    }

    this.isMonitoring = false;

    if (this.monitoringInterval !== null) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('[PerformanceMonitor] 监控已停止');
  }

  /**
   * 检查监控状态
   */
  isRunning(): boolean {
    return this.isMonitoring;
  }

  // ========================================================================
  // 指标记录
  // ========================================================================

  /**
   * 记录性能指标
   */
  recordMetric(metric: PerformanceMetric): void {
    if (!this.isMonitoring) {
      console.warn('[PerformanceMonitor] 监控未运行，指标未记录');
      return;
    }

    // 根据指标类型分发到相应的收集器
    switch (metric.type) {
      case 'query':
        this.collector.collectQueryPerformance(metric as any);
        break;
      case 'ai_call':
        this.collector.collectAIResponseTime(metric as any);
        break;
      case 'document':
        this.collector.collectDocumentGeneration(metric as any);
        break;
      case 'cache':
        this.collector.collectCacheMetrics(metric.metadata as any);
        break;
      default:
        // 存储为自定义指标
        this.collector.collectCustomMetric({
          name: metric.name,
          value: metric.value,
          unit: metric.unit,
          metadata: metric.metadata,
          tags: metric.tags
        });
    }

    // 检查告警条件
    if (this.config.enableAlerts) {
      this.checkAlerts(metric);
    }
  }

  /**
   * 批量记录指标
   */
  recordMetrics(metrics: PerformanceMetric[]): void {
    metrics.forEach(metric => this.recordMetric(metric));
  }

  // ========================================================================
  // 报告生成
  // ========================================================================

  /**
   * 获取性能报告
   */
  getReport(timeRange?: TimeRange): PerformanceReport {
    return this.analyzer.generateReport(timeRange);
  }

  /**
   * 获取最新报告（最近1小时）
   */
  getLatestReport(): PerformanceReport {
    const now = Date.now();
    return this.getReport({
      from: now - 3600000,
      to: now
    });
  }

  /**
   * 获取自定义时间范围报告
   */
  getCustomReport(durationMs: number): PerformanceReport {
    const now = Date.now();
    return this.getReport({
      from: now - durationMs,
      to: now
    });
  }

  // ========================================================================
  // 实时指标
  // ========================================================================

  /**
   * 获取实时指标
   */
  getRealTimeMetrics(): RealTimeMetrics {
    const now = Date.now();
    const windowStart = now - 60000; // 最近1分钟

    // 查询指标
    const queryMetrics = this.collector.getMetricsByTimeRange('query', windowStart, now);
    const queryMetricsArray = queryMetrics as any[];
    const avgQueryTime = queryMetricsArray.length > 0
      ? queryMetricsArray.reduce((sum, m) => sum + m.executionTime, 0) / queryMetricsArray.length
      : 0;

    // AI指标
    const aiMetrics = this.collector.getMetricsByTimeRange('ai_call', windowStart, now);
    const aiMetricsArray = aiMetrics as any[];
    const avgAiTime = aiMetricsArray.length > 0
      ? aiMetricsArray.reduce((sum, m) => sum + m.value, 0) / aiMetricsArray.length
      : 0;
    const aiSuccessCount = aiMetricsArray.filter(m => m.success).length;

    // 文档生成指标
    const docMetrics = this.collector.getMetricsByTimeRange('document', windowStart, now);
    const docMetricsArray = docMetrics as any[];
    const avgDocTime = docMetricsArray.length > 0
      ? docMetricsArray.reduce((sum, m) => sum + m.generationTime, 0) / docMetricsArray.length
      : 0;

    // 资源指标
    const memMetrics = this.collector.getMetricsByTimeRange('memory', windowStart, now);
    const latestMem = memMetrics.length > 0 ? memMetrics[memMetrics.length - 1] : null;

    const cpuMetrics = this.collector.getMetricsByTimeRange('cpu', windowStart, now);
    const latestCpu = cpuMetrics.length > 0 ? cpuMetrics[cpuMetrics.length - 1] : null;

    // UX指标
    const uxMetrics = this.collector.getMetricsByTimeRange('ux', windowStart, now);
    const uxLoadMetrics = uxMetrics.filter(m => m.name === 'ux.page_load');
    const avgLoadTime = uxLoadMetrics.length > 0
      ? uxLoadMetrics.reduce((sum, m) => sum + m.value, 0) / uxLoadMetrics.length
      : 0;

    return {
      timestamp: now,
      query: {
        avgResponseTime: avgQueryTime,
        queriesPerSecond: queryMetricsArray.length / 60,
        activeQueries: 0 // 无法直接获取
      },
      ai: {
        avgResponseTime: avgAiTime,
        callsPerMinute: aiMetricsArray.length,
        successRate: aiMetricsArray.length > 0 ? (aiSuccessCount / aiMetricsArray.length) * 100 : 100
      },
      document: {
        avgGenerationTime: avgDocTime,
        documentsPerMinute: docMetricsArray.length,
        successRate: 100 // 简化处理
      },
      resources: {
        memoryUsage: latestMem?.metadata?.percentage || 0,
        cpuUsage: latestCpu?.value || 0,
        storageUsage: 0 // 简化处理
      },
      ux: {
        avgPageLoadTime: avgLoadTime,
        errorRate: 0,
        activeSessions: 0
      }
    };
  }

  // ========================================================================
  // 告警管理
  // ========================================================================

  /**
   * 设置性能告警
   */
  setAlert(threshold: PerformanceThreshold, callback: AlertCallback): string {
    const alertId = `alert_${threshold.metric}_${Date.now()}`;
    this.alertCallbacks.set(alertId, { threshold, callback });
    return alertId;
  }

  /**
   * 移除告警
   */
  removeAlert(alertId: string): boolean {
    return this.alertCallbacks.delete(alertId);
  }

  /**
   * 获取所有告警
   */
  getAlerts(): PerformanceAlert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * 获取活跃告警（未解决的）
   */
  getActiveAlerts(): PerformanceAlert[] {
    return Array.from(this.activeAlerts.values()).filter(alert => !alert.resolved);
  }

  /**
   * 清除告警
   */
  clearAlert(alertId: string): void {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = Date.now();
    }
  }

  /**
   * 清除所有告警
   */
  clearAllAlerts(): void {
    this.activeAlerts.forEach(alert => {
      alert.resolved = true;
      alert.resolvedAt = Date.now();
    });
  }

  /**
   * 检查告警条件
   */
  private checkAlerts(metric: PerformanceMetric): void {
    for (const [alertId, { threshold, callback }] of this.alertCallbacks) {
      // 检查指标名称匹配
      if (metric.name !== threshold.metric) continue;

      // 检查阈值条件
      const shouldAlert = this.evaluateThreshold(metric.value, threshold);

      if (shouldAlert) {
        // 检查告警去重
        const lastAlertTime = this.lastAlertTime.get(alertId);
        const now = Date.now();

        if (lastAlertTime && (now - lastAlertTime) < this.config.alertDedupeTime) {
          continue; // 跳过重复告警
        }

        // 创建告警
        const alert: PerformanceAlert = {
          alertId: `${alertId}_${now}`,
          timestamp: now,
          threshold,
          currentValue: metric.value,
          message: this.generateAlertMessage(threshold, metric.value),
          resolved: false
        };

        this.activeAlerts.set(alert.alertId, alert);
        this.lastAlertTime.set(alertId, now);

        // 触发回调
        try {
          callback(alert);
        } catch (error) {
          console.error('[PerformanceMonitor] 告警回调执行失败:', error);
        }

        // 根据严重程度决定是否输出到控制台
        if (threshold.severity === 'error' || threshold.severity === 'critical') {
          console.error('[PerformanceMonitor]', alert.message);
        }
      }
    }
  }

  /**
   * 评估阈值条件
   */
  private evaluateThreshold(value: number, threshold: PerformanceThreshold): boolean {
    switch (threshold.operator) {
      case '>':
        return value > threshold.threshold;
      case '<':
        return value < threshold.threshold;
      case '>=':
        return value >= threshold.threshold;
      case '<=':
        return value <= threshold.threshold;
      case '==':
        return value === threshold.threshold;
      default:
        return false;
    }
  }

  /**
   * 生成告警消息
   */
  private generateAlertMessage(threshold: PerformanceThreshold, currentValue: number): string {
    const operatorMap: Record<string, string> = {
      '>': '超过',
      '<': '低于',
      '>=': '超过或等于',
      '<=': '低于或等于',
      '==': '等于'
    };

    const severityMap: Record<string, string> = {
      info: '信息',
      warning: '警告',
      error: '错误',
      critical: '严重'
    };

    return `[${severityMap[threshold.severity]}] 指标 ${threshold.metric} 当前值 ${currentValue} ${operatorMap[threshold.operator]} 阈值 ${threshold.threshold}`;
  }

  // ========================================================================
  // 维护任务
  // ========================================================================

  /**
   * 执行维护任务
   */
  private performMaintenanceTasks(): void {
    const now = Date.now();
    const cutoffTime = now - this.config.metricsRetention;

    // 清理过期的指标
    this.cleanupOldMetrics(cutoffTime);

    // 清理已解决的旧告警
    this.cleanupOldAlerts(cutoffTime);
  }

  /**
   * 清理旧指标
   */
  private cleanupOldMetrics(cutoffTime: number): void {
    // 注意：这里需要访问collector的内部方法
    // 由于collector没有公开清理方法，这里只是占位
    // 实际实现可能需要扩展MetricsCollector
  }

  /**
   * 清理旧告警
   */
  private cleanupOldAlerts(cutoffTime: number): void {
    for (const [alertId, alert] of this.activeAlerts) {
      if (alert.resolved && alert.resolvedAt && alert.resolvedAt < cutoffTime) {
        this.activeAlerts.delete(alertId);
        this.lastAlertTime.delete(alertId);
      }
    }
  }

  // ========================================================================
  // 快捷方法
  // ========================================================================

  /**
   * 获取统计信息
   */
  getStats(): {
    isMonitoring: boolean;
    metricsCount: number;
    activeAlertsCount: number;
    configuredAlertsCount: number;
  } {
    const metricsStats = this.collector.getMetricsStats();

    return {
      isMonitoring: this.isMonitoring,
      metricsCount: metricsStats.totalMetrics,
      activeAlertsCount: this.getActiveAlerts().length,
      configuredAlertsCount: this.alertCallbacks.size
    };
  }

  /**
   * 重置监控器
   */
  reset(): void {
    this.stopMonitoring();
    this.clearAllAlerts();
    this.alertCallbacks.clear();
    this.lastAlertTime.clear();
    this.collector.clearMetrics();
  }

  /**
   * 销毁监控器
   */
  destroy(): void {
    this.stopMonitoring();
    this.reset();
    this.collector.destroy();
  }
}

// ============================================================================
// 全局监控器实例
// ============================================================================

/**
 * 全局性能监控器实例
 */
export const globalPerformanceMonitor = new PerformanceMonitor();

/**
 * 快捷方法：记录指标
 */
export function recordMetric(metric: PerformanceMetric): void {
  globalPerformanceMonitor.recordMetric(metric);
}

/**
 * 快捷方法：获取报告
 */
export function getPerformanceReport(timeRange?: TimeRange): PerformanceReport {
  return globalPerformanceMonitor.getReport(timeRange);
}

/**
 * 快捷方法：获取实时指标
 */
export function getRealTimeMetrics(): RealTimeMetrics {
  return globalPerformanceMonitor.getRealTimeMetrics();
}

/**
 * 快捷方法：设置告警
 */
export function setPerformanceAlert(
  threshold: PerformanceThreshold,
  callback: AlertCallback
): string {
  return globalPerformanceMonitor.setAlert(threshold, callback);
}

/**
 * 快捷方法：获取告警
 */
export function getPerformanceAlerts(): PerformanceAlert[] {
  return globalPerformanceMonitor.getAlerts();
}
