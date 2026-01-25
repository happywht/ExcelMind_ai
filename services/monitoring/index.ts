/**
 * 性能监控系统 - 统一导出入口
 *
 * Phase 2: 性能优化模块
 * 提供全面的性能监控、分析和优化功能
 */

// ========================================================================
// 核心模块
// ========================================================================

export {
  PerformanceMonitor,
  globalPerformanceMonitor,
  recordMetric,
  getPerformanceReport,
  getRealTimeMetrics,
  setPerformanceAlert,
  getPerformanceAlerts
} from './performanceMonitor';

export {
  MetricsCollector,
  globalMetricsCollector
} from './metricsCollector';

export {
  PerformanceAnalyzer
} from './performanceAnalyzer';

export {
  PerformanceTracker,
  TrackPerformance,
  TrackQuery,
  TrackAICall,
  TrackDocumentGeneration,
  configurePerformanceTracking
} from './performanceTracker';

export {
  BenchmarkEvaluator,
  DEFAULT_PERFORMANCE_BENCHMARKS,
  defaultBenchmarkEvaluator
} from './performanceBenchmarks';

// ========================================================================
// 类型定义
// ========================================================================

export type {
  // 核心类型
  PerformanceMetric,
  MetricType,
  MetricUnit,

  // 查询性能
  QueryPerformance,
  SlowQuery,
  QueryAnalysis,

  // AI性能
  AIPerformance,

  // 文档性能
  DocumentPerformance,

  // 资源使用
  ResourceUsage,

  // 用户体验
  UXEvent,
  UXMetrics,

  // 报告相关
  TimeRange,
  PerformanceReport,
  PerformanceSummary,
  PerformanceScore,

  // 告警相关
  PerformanceThreshold,
  PerformanceAlert,
  AlertCallback,

  // 实时指标
  RealTimeMetrics,

  // 趋势分析
  TrendAnalysis,

  // 基准配置
  PerformanceBenchmarks,
  BenchmarkThreshold,

  // 优化建议
  OptimizationSuggestion,
  Bottleneck,

  // 对比报告
  ComparisonReport,

  // 优化建议
  OptimizationAdvice,
  ImprovementEstimate
} from './types';

// ========================================================================
// 版本信息
// ========================================================================

export const MONITORING_VERSION = '1.0.0';
export const MONITORING_PHASE = 'Phase 2 - 性能优化';
export const MONITORING_BUILD_DATE = new Date().toISOString();

// ========================================================================
// 工厂函数
// ========================================================================

import { PerformanceMonitor } from './performanceMonitor';
import { MetricsCollector } from './metricsCollector';
import { PerformanceAnalyzer } from './performanceAnalyzer';
import { BenchmarkEvaluator } from './performanceBenchmarks';
import { configurePerformanceTracking } from './performanceTracker';

export interface MonitoringSystemConfig {
  monitor?: {
    autoStart?: boolean;
    monitoringInterval?: number;
    metricsRetention?: number;
    enableAlerts?: boolean;
  };
  collector?: {
    maxCacheSize?: number;
    sampleRate?: number;
    enableResourceMonitoring?: boolean;
  };
  benchmarks?: Partial<import('./types').PerformanceBenchmarks>;
}

/**
 * 创建完整的监控系统
 */
export function createMonitoringSystem(config?: MonitoringSystemConfig): {
  monitor: PerformanceMonitor;
  collector: MetricsCollector;
  analyzer: PerformanceAnalyzer;
  benchmarkEvaluator: BenchmarkEvaluator;
} {
  // 创建指标收集器
  const collector = new MetricsCollector(config?.collector);

  // 创建基准评估器
  const benchmarkEvaluator = config?.benchmarks
    ? new BenchmarkEvaluator({
        ...DEFAULT_PERFORMANCE_BENCHMARKS,
        ...config.benchmarks,
        queries: { ...DEFAULT_PERFORMANCE_BENCHMARKS.queries, ...config.benchmarks.queries },
        ai: { ...DEFAULT_PERFORMANCE_BENCHMARKS.ai, ...config.benchmarks.ai },
        document: { ...DEFAULT_PERFORMANCE_BENCHMARKS.document, ...config.benchmarks.document },
        resources: { ...DEFAULT_PERFORMANCE_BENCHMARKS.resources, ...config.benchmarks.resources }
      })
    : new BenchmarkEvaluator();

  // 创建性能分析器
  const analyzer = new PerformanceAnalyzer(collector, benchmarkEvaluator);

  // 创建性能监控器
  const monitor = new PerformanceMonitor(config?.monitor, collector);

  return {
    monitor,
    collector,
    analyzer,
    benchmarkEvaluator
  };
}

// 重新导出默认基准
import { DEFAULT_PERFORMANCE_BENCHMARKS } from './performanceBenchmarks';

// ========================================================================
// 快捷初始化函数
// ========================================================================

/**
 * 初始化全局性能监控系统
 */
export function initPerformanceMonitoring(config?: MonitoringSystemConfig): ReturnType<typeof createMonitoringSystem> {
  const system = createMonitoringSystem(config);

  // 配置性能追踪器
  configurePerformanceTracking(system.collector);

  console.log('[PerformanceMonitoring] 系统已初始化', {
    version: MONITORING_VERSION,
    phase: MONITORING_PHASE,
    config
  });

  return system;
}
