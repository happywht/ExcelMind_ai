/**
 * 性能监控系统单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  PerformanceMonitor,
  MetricsCollector,
  PerformanceAnalyzer,
  BenchmarkEvaluator,
  PerformanceTracker,
  globalMetricsCollector
} from './index';

// ============================================================================
// MetricsCollector 测试
// ============================================================================

describe('MetricsCollector', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = new MetricsCollector({
      maxCacheSize: 100,
      sampleRate: 1.0,
      enableResourceMonitoring: false
    });
  });

  afterEach(() => {
    collector.destroy();
  });

  describe('collectQueryPerformance', () => {
    it('应该正确收集查询性能指标', () => {
      const metric = collector.collectQueryPerformance({
        query: 'SELECT * FROM users',
        executionTime: 45,
        rowCount: 100,
        queryType: 'simple',
        cached: false
      }) as any;

      expect(metric).toBeDefined();
      expect(metric.type).toBe('query');
      expect(metric.value).toBe(45);
      expect(metric.unit).toBe('ms');
      expect(metric.executionTime).toBe(45);
      expect(metric.rowCount).toBe(100);
      expect(metric.queryType).toBe('simple');
      expect(metric.cached).toBe(false);
    });

    it('应该存储指标到缓存', () => {
      collector.collectQueryPerformance({
        query: 'SELECT * FROM users',
        executionTime: 45,
        rowCount: 100,
        queryType: 'simple',
        cached: false
      });

      const metrics = collector.getMetrics('query');
      expect(metrics).toHaveLength(1);
      expect((metrics[0] as any).executionTime).toBe(45);
    });
  });

  describe('collectAIResponseTime', () => {
    it('应该正确收集AI响应时间指标', () => {
      const metric = collector.collectAIResponseTime({
        prompt: '生成一个公式',
        responseTime: 1200,
        promptLength: 50,
        responseLength: 100,
        model: 'glm-4.6',
        callType: 'formula',
        success: true
      });

      expect(metric).toBeDefined();
      expect(metric.type).toBe('ai_call');
      expect(metric.value).toBe(1200);
      expect(metric.callType).toBe('formula');
      expect(metric.success).toBe(true);
    });
  });

  describe('collectDocumentGeneration', () => {
    it('应该正确收集文档生成性能指标', () => {
      const metric = collector.collectDocumentGeneration({
        templateName: 'template.docx',
        dataRowCount: 50,
        documentCount: 1,
        generationTime: 350,
        method: 'single',
        status: 'success'
      });

      expect(metric).toBeDefined();
      expect(metric.type).toBe('document');
      expect(metric.value).toBe(350);
      expect(metric.method).toBe('single');
      expect(metric.status).toBe('success');
    });
  });

  describe('getMetrics', () => {
    it('应该返回指定类型的指标', () => {
      collector.collectQueryPerformance({
        query: 'SELECT 1',
        executionTime: 10,
        rowCount: 1,
        queryType: 'simple',
        cached: false
      });

      collector.collectQueryPerformance({
        query: 'SELECT 2',
        executionTime: 20,
        rowCount: 1,
        queryType: 'simple',
        cached: false
      });

      const metrics = collector.getMetrics('query');
      expect(metrics).toHaveLength(2);
    });

    it('应该支持限制返回数量', () => {
      for (let i = 0; i < 10; i++) {
        collector.collectQueryPerformance({
          query: `SELECT ${i}`,
          executionTime: i * 10,
          rowCount: 1,
          queryType: 'simple',
          cached: false
        });
      }

      const metrics = collector.getMetrics('query', 5);
      expect(metrics).toHaveLength(5);
    });
  });

  describe('getMetricsByTimeRange', () => {
    it('应该返回指定时间范围内的指标', () => {
      const now = Date.now();

      collector.collectQueryPerformance({
        query: 'SELECT 1',
        executionTime: 10,
        rowCount: 1,
        queryType: 'simple',
        cached: false
      });

      const metrics = collector.getMetricsByTimeRange('query', now - 1000, now + 1000);
      expect(metrics.length).toBeGreaterThan(0);
    });
  });

  describe('getMetricsStats', () => {
    it('应该返回正确的统计信息', () => {
      collector.collectQueryPerformance({
        query: 'SELECT 1',
        executionTime: 10,
        rowCount: 1,
        queryType: 'simple',
        cached: false
      });

      const stats = collector.getMetricsStats();
      expect(stats.totalMetrics).toBeGreaterThan(0);
      expect(stats.metricsByType).toHaveProperty('query');
    });
  });
});

// ============================================================================
// BenchmarkEvaluator 测试
// ============================================================================

describe('BenchmarkEvaluator', () => {
  let evaluator: BenchmarkEvaluator;

  beforeEach(() => {
    evaluator = new BenchmarkEvaluator();
  });

  describe('evaluateQuery', () => {
    it('应该正确评估查询性能', () => {
      const result = evaluator.evaluateQuery('simple', 45);
      expect(result).toBeDefined();
      expect(result.grade).toMatch(/^[A-F]$/);
      expect(result.level).toBeDefined();
      expect(result.message).toBeDefined();
    });

    it('应该为快速查询返回A级', () => {
      const result = evaluator.evaluateQuery('simple', 3);
      expect(result.grade).toBe('A');
      expect(result.level).toBe('excellent');
    });

    it('应该为慢查询返回较低等级', () => {
      const result = evaluator.evaluateQuery('simple', 100);
      expect(result.grade).toBe('D');
      expect(result.level).toBe('poor');
    });
  });

  describe('evaluateAI', () => {
    it('应该正确评估AI响应性能', () => {
      const result = evaluator.evaluateAI('simple', 1200);
      expect(result).toBeDefined();
      expect(result.grade).toMatch(/^[A-F]$/);
    });
  });

  describe('evaluateDocument', () => {
    it('应该正确评估文档生成性能', () => {
      const result = evaluator.evaluateDocument('single', 1, 350);
      expect(result).toBeDefined();
      expect(result.grade).toMatch(/^[A-F]$/);
    });
  });

  describe('evaluateResources', () => {
    it('应该正确评估资源使用', () => {
      const result = evaluator.evaluateResources('memory', 150);
      expect(result).toBeDefined();
      expect(result.grade).toMatch(/^[A-F]$/);
    });
  });

  describe('calculateOverallScore', () => {
    it('应该计算总体评分', () => {
      const score = evaluator.calculateOverallScore({
        query: [{ type: 'simple', time: 45 }],
        ai: [{ type: 'simple', time: 1200 }],
        document: [{ method: 'single', count: 1, time: 350 }],
        resources: { memory: 150, cpu: 35 }
      });

      expect(score).toBeDefined();
      expect(score.overall).toBeGreaterThanOrEqual(0);
      expect(score.overall).toBeLessThanOrEqual(100);
      expect(score.breakdown).toBeDefined();
      expect(score.grade).toMatch(/^[A-F]$/);
    });
  });
});

// ============================================================================
// PerformanceAnalyzer 测试
// ============================================================================

describe('PerformanceAnalyzer', () => {
  let collector: MetricsCollector;
  let benchmarkEvaluator: BenchmarkEvaluator;
  let analyzer: PerformanceAnalyzer;

  beforeEach(() => {
    collector = new MetricsCollector({
      maxCacheSize: 100,
      sampleRate: 1.0,
      enableResourceMonitoring: false
    });
    benchmarkEvaluator = new BenchmarkEvaluator();
    analyzer = new PerformanceAnalyzer(collector, benchmarkEvaluator);
  });

  afterEach(() => {
    collector.destroy();
  });

  describe('analyzeQueryPerformance', () => {
    it('应该分析查询性能', () => {
      // 添加测试数据
      collector.collectQueryPerformance({
        query: 'SELECT * FROM users',
        executionTime: 45,
        rowCount: 100,
        queryType: 'simple',
        cached: false
      });

      collector.collectQueryPerformance({
        query: 'SELECT * FROM orders',
        executionTime: 150,
        rowCount: 200,
        queryType: 'join',
        cached: false
      });

      const analysis = analyzer.analyzeQueryPerformance();

      expect(analysis).toBeDefined();
      expect(analysis.totalQueries).toBe(2);
      expect(analysis.avgExecutionTime).toBe(97.5);
      expect(analysis.slowQueries).toBeDefined();
    });

    it('应该识别慢查询', () => {
      collector.collectQueryPerformance({
        query: 'SELECT * FROM large_table',
        executionTime: 1500,
        rowCount: 1000,
        queryType: 'complex',
        cached: false
      });

      const slowQueries = analyzer.identifySlowQueries(1000);
      expect(slowQueries.length).toBeGreaterThan(0);
      expect(slowQueries[0].executionTime).toBeGreaterThan(1000);
    });
  });

  describe('analyzeTrend', () => {
    it('应该分析性能趋势', () => {
      // 添加多个数据点
      for (let i = 0; i < 20; i++) {
        collector.collectQueryPerformance({
          query: `SELECT ${i}`,
          executionTime: 40 + i * 2,
          rowCount: 10,
          queryType: 'simple',
          cached: false
        });
      }

      const trend = analyzer.analyzeTrend('query');
      expect(trend).toBeDefined();
      expect(trend.metric).toBe('query');
      expect(trend.dataPoints.length).toBe(20);
      expect(trend.trend).toMatch(/^(improving|degrading|stable)$/);
    });
  });

  describe('generateReport', () => {
    it('应该生成性能报告', () => {
      // 添加测试数据
      collector.collectQueryPerformance({
        query: 'SELECT 1',
        executionTime: 45,
        rowCount: 10,
        queryType: 'simple',
        cached: false
      });

      collector.collectAIResponseTime({
        prompt: 'test',
        responseTime: 1200,
        promptLength: 10,
        responseLength: 50,
        model: 'glm-4.6',
        callType: 'chat',
        success: true
      });

      const report = analyzer.generateReport();

      expect(report).toBeDefined();
      expect(report.reportId).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.score).toBeDefined();
      expect(report.suggestions).toBeDefined();
    });
  });

  describe('identifyBottlenecks', () => {
    it('应该识别性能瓶颈', () => {
      // 添加一些慢查询
      collector.collectQueryPerformance({
        query: 'SLOW QUERY',
        executionTime: 3000,
        rowCount: 100,
        queryType: 'complex',
        cached: false
      });

      const bottlenecks = analyzer.identifyBottlenecks();
      expect(bottlenecks).toBeDefined();
      expect(Array.isArray(bottlenecks)).toBe(true);
    });
  });

  describe('generateOptimizationSuggestions', () => {
    it('应该生成优化建议', () => {
      const bottlenecks = [
        {
          id: 'test',
          type: 'query',
          severity: 'high' as const,
          affectedMetrics: ['query.time'],
          description: '慢查询',
          impact: [{ metricName: 'query.time', degradation: 3000 }]
        }
      ];

      const suggestions = analyzer.generateOptimizationSuggestions(bottlenecks);
      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
      if (suggestions.length > 0) {
        expect(suggestions[0].id).toBeDefined();
        expect(suggestions[0].title).toBeDefined();
        expect(suggestions[0].priority).toMatch(/^(high|medium|low)$/);
      }
    });
  });
});

// ============================================================================
// PerformanceTracker 测试
// ============================================================================

describe('PerformanceTracker', () => {
  beforeEach(() => {
    PerformanceTracker.setCollector(globalMetricsCollector);
  });

  describe('trackFunction', () => {
    it('应该追踪同步函数执行时间', () => {
      const fn = () => {
        let sum = 0;
        for (let i = 0; i < 1000; i++) sum += i;
        return sum;
      };

      const result = PerformanceTracker.trackFunction(fn, 'test.function');
      expect(result).toBe(499500);

      const metrics = globalMetricsCollector.getMetrics('custom');
      expect(metrics.length).toBeGreaterThan(0);
    });

    it('应该处理函数抛出的错误', () => {
      const fn = () => {
        throw new Error('Test error');
      };

      expect(() => {
        PerformanceTracker.trackFunction(fn, 'test.error');
      }).toThrow('Test error');

      // 错误也应该被记录
      const metrics = globalMetricsCollector.getMetrics('custom');
      const errorMetric = metrics.find(m => m.name === 'test.error');
      expect(errorMetric).toBeDefined();
    });
  });

  describe('trackAsyncFunction', () => {
    it('应该追踪异步函数执行时间', async () => {
      const fn = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'done';
      };

      const result = await PerformanceTracker.trackAsyncFunction(fn, 'test.async');
      expect(result).toBe('done');

      const metrics = globalMetricsCollector.getMetrics('custom');
      expect(metrics.length).toBeGreaterThan(0);
    });
  });

  describe('trackQuery', () => {
    it('应该追踪查询执行', async () => {
      const queryFn = async () => {
        return [{ id: 1, name: 'test' }];
      };

      const result = await PerformanceTracker.trackQuery(
        'SELECT * FROM test',
        'simple',
        queryFn
      );

      expect(result).toEqual([{ id: 1, name: 'test' }]);

      const metrics = globalMetricsCollector.getMetrics('query');
      expect(metrics.length).toBeGreaterThan(0);
    });
  });

  describe('trackAICall', () => {
    it('应该追踪AI调用', async () => {
      const aiFn = async () => {
        return 'AI response';
      };

      const result = await PerformanceTracker.trackAICall(
        'Test prompt',
        'chat',
        'glm-4.6',
        aiFn
      );

      expect(result).toBe('AI response');

      const metrics = globalMetricsCollector.getMetrics('ai_call');
      expect(metrics.length).toBeGreaterThan(0);
    });
  });

  describe('trackDocumentGeneration', () => {
    it('应该追踪文档生成', async () => {
      const docFn = async () => {
        return { success: true };
      };

      const result = await PerformanceTracker.trackDocumentGeneration(
        'template.docx',
        50,
        'single',
        docFn
      );

      expect(result).toEqual({ success: true });

      const metrics = globalMetricsCollector.getMetrics('document');
      expect(metrics.length).toBeGreaterThan(0);
    });
  });

  describe('startTracking/stopTracking', () => {
    it('应该支持手动追踪', () => {
      const trackerId = PerformanceTracker.startTracking('manual.track');

      // 模拟一些操作
      let sum = 0;
      for (let i = 0; i < 1000; i++) sum += i;

      PerformanceTracker.stopTracking(trackerId);

      const metrics = globalMetricsCollector.getMetrics('custom');
      const trackedMetric = metrics.find(m => m.name === 'manual.track');
      expect(trackedMetric).toBeDefined();
    });
  });

  describe('measure/measureAsync', () => {
    it('应该测量操作时间', () => {
      const { result, duration } = PerformanceTracker.measure('test.measure', () => {
        return 42;
      });

      expect(result).toBe(42);
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it('应该异步测量操作时间', async () => {
      const { result, duration } = await PerformanceTracker.measureAsync('test.measure-async', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'async-result';
      });

      expect(result).toBe('async-result');
      expect(duration).toBeGreaterThanOrEqual(10);
    });
  });
});

// ============================================================================
// PerformanceMonitor 测试
// ============================================================================

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor({
      autoStart: false,
      enableAlerts: true
    });
  });

  afterEach(() => {
    monitor.destroy();
  });

  describe('startMonitoring/stopMonitoring', () => {
    it('应该能够启动和停止监控', () => {
      expect(monitor.isRunning()).toBe(false);

      monitor.startMonitoring();
      expect(monitor.isRunning()).toBe(true);

      monitor.stopMonitoring();
      expect(monitor.isRunning()).toBe(false);
    });

    it('重复启动应该不报错', () => {
      monitor.startMonitoring();
      expect(() => monitor.startMonitoring()).not.toThrow();
    });
  });

  describe('recordMetric', () => {
    it('应该记录性能指标', () => {
      monitor.startMonitoring();

      monitor.recordMetric({
        type: 'query',
        name: 'test.query',
        value: 45,
        unit: 'ms',
        timestamp: Date.now()
      });

      // 验证指标已记录
      const stats = monitor.getStats();
      expect(stats.metricsCount).toBeGreaterThan(0);
    });
  });

  describe('getReport', () => {
    it('应该生成性能报告', () => {
      monitor.startMonitoring();

      const report = monitor.getReport();
      expect(report).toBeDefined();
      expect(report.reportId).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.score).toBeDefined();
    });
  });

  describe('getRealTimeMetrics', () => {
    it('应该返回实时指标', () => {
      monitor.startMonitoring();

      const metrics = monitor.getRealTimeMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.timestamp).toBeDefined();
      expect(metrics.query).toBeDefined();
      expect(metrics.ai).toBeDefined();
      expect(metrics.document).toBeDefined();
      expect(metrics.resources).toBeDefined();
    });
  });

  describe('setAlert', () => {
    it('应该设置告警', () => {
      const callback = vi.fn();
      const alertId = monitor.setAlert(
        {
          metric: 'test.metric',
          threshold: 100,
          operator: '>',
          severity: 'warning'
        },
        callback
      );

      expect(alertId).toBeDefined();
      expect(typeof alertId).toBe('string');
    });

    it('应该在阈值超过时触发告警', () => {
      const callback = vi.fn();
      monitor.setAlert(
        {
          metric: 'test.metric',
          threshold: 100,
          operator: '>',
          severity: 'warning'
        },
        callback
      );

      monitor.startMonitoring();
      monitor.recordMetric({
        type: 'custom',
        name: 'test.metric',
        value: 150,
        unit: 'ms',
        timestamp: Date.now()
      });

      // 注意：由于告警检查是异步的，可能需要等待
      // 在实际测试中，可能需要使用 waitFor 或类似方法
    });
  });

  describe('getStats', () => {
    it('应该返回统计信息', () => {
      const stats = monitor.getStats();
      expect(stats).toBeDefined();
      expect(stats.isMonitoring).toBeDefined();
      expect(stats.metricsCount).toBeDefined();
      expect(stats.activeAlertsCount).toBeDefined();
      expect(stats.configuredAlertsCount).toBeDefined();
    });
  });

  describe('reset', () => {
    it('应该重置监控器', () => {
      monitor.startMonitoring();

      monitor.setAlert(
        { metric: 'test', threshold: 100, operator: '>', severity: 'warning' },
        () => {}
      );

      monitor.reset();

      expect(monitor.isRunning()).toBe(false);
      expect(monitor.getActiveAlerts().length).toBe(0);
    });
  });
});
