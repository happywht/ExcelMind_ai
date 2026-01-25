/**
 * 性能分析器
 *
 * 分析性能指标，识别瓶颈，生成优化建议
 */

import {
  PerformanceMetric,
  QueryPerformance,
  SlowQuery,
  QueryAnalysis,
  TrendAnalysis,
  PerformanceReport,
  TimeRange,
  OptimizationSuggestion,
  Bottleneck,
  ComparisonReport,
  PerformanceScore
} from './types';
import { MetricsCollector } from './metricsCollector';
import { BenchmarkEvaluator } from './performanceBenchmarks';

// ============================================================================
// 性能分析器配置
// ============================================================================

interface PerformanceAnalyzerConfig {
  /** 慢查询阈值（毫秒） */
  slowQueryThreshold: number;
  /** 最小分析样本数 */
  minSampleSize: number;
  /** 趋势分析窗口大小 */
  trendAnalysisWindowSize: number;
}

// ============================================================================
// 性能分析器实现
// ============================================================================

export class PerformanceAnalyzer {
  private collector: MetricsCollector;
  private benchmarkEvaluator: BenchmarkEvaluator;
  private config: PerformanceAnalyzerConfig;

  constructor(
    collector: MetricsCollector,
    benchmarkEvaluator: BenchmarkEvaluator,
    config: Partial<PerformanceAnalyzerConfig> = {}
  ) {
    this.collector = collector;
    this.benchmarkEvaluator = benchmarkEvaluator;
    this.config = {
      slowQueryThreshold: 1000,
      minSampleSize: 10,
      trendAnalysisWindowSize: 100,
      ...config
    };
  }

  // ========================================================================
  // 查询性能分析
  // ========================================================================

  /**
   * 分析查询性能
   */
  analyzeQueryPerformance(queries?: QueryPerformance[]): QueryAnalysis {
    const queryMetrics = queries || this.collector.getMetrics('query') as QueryPerformance[];

    if (queryMetrics.length === 0) {
      return {
        totalQueries: 0,
        slowQueries: [],
        avgExecutionTime: 0,
        slowestQuery: null,
        fastestQuery: null,
        cacheHitRate: 0,
        queryTypeDistribution: {}
      };
    }

    // 计算基本统计
    const totalQueries = queryMetrics.length;
    const avgExecutionTime = this.calculateAverage(queryMetrics.map(q => q.executionTime));

    // 识别慢查询
    const slowQueries = this.identifySlowQueries(undefined, queryMetrics);

    // 找出最慢和最快的查询
    const sortedByTime = [...queryMetrics].sort((a, b) => b.executionTime - a.executionTime);
    const slowestQuery = sortedByTime[0] ? {
      query: sortedByTime[0].query,
      executionTime: sortedByTime[0].executionTime,
      executionCount: 1,
      avgExecutionTime: sortedByTime[0].executionTime,
      lastExecution: sortedByTime[0].timestamp,
      queryType: sortedByTime[0].queryType,
      suggestions: this.generateQueryOptimizationSuggestions(sortedByTime[0])
    } : null;

    const fastestQuery = sortedByTime[sortedByTime.length - 1] ? {
      query: sortedByTime[sortedByTime.length - 1].query,
      executionTime: sortedByTime[sortedByTime.length - 1].executionTime
    } : null;

    // 计算缓存命中率
    const cachedQueries = queryMetrics.filter(q => q.cached);
    const cacheHitRate = totalQueries > 0 ? (cachedQueries.length / totalQueries) * 100 : 0;

    // 查询类型分布
    const queryTypeDistribution: Record<string, number> = {};
    queryMetrics.forEach(q => {
      queryTypeDistribution[q.queryType] = (queryTypeDistribution[q.queryType] || 0) + 1;
    });

    return {
      totalQueries,
      slowQueries,
      avgExecutionTime,
      slowestQuery,
      fastestQuery,
      cacheHitRate,
      queryTypeDistribution
    };
  }

  /**
   * 识别慢查询
   */
  identifySlowQueries(threshold?: number, queries?: QueryPerformance[]): SlowQuery[] {
    const slowThreshold = threshold || this.config.slowQueryThreshold;
    const queryMetrics = queries || this.collector.getMetrics('query') as QueryPerformance[];

    // 按查询SQL分组统计
    const queryStats = new Map<string, {
      count: number;
      totalTime: number;
      maxTime: number;
      lastExecution: number;
      queryType: string;
      query: string;
    }>();

    queryMetrics.forEach(q => {
      const existing = queryStats.get(q.query);
      if (existing) {
        existing.count++;
        existing.totalTime += q.executionTime;
        if (q.executionTime > existing.maxTime) {
          existing.maxTime = q.executionTime;
        }
        existing.lastExecution = Math.max(existing.lastExecution, q.timestamp);
      } else {
        queryStats.set(q.query, {
          count: 1,
          totalTime: q.executionTime,
          maxTime: q.executionTime,
          lastExecution: q.timestamp,
          queryType: q.queryType,
          query: q.query
        });
      }
    });

    // 筛选慢查询并排序
    const slowQueries: SlowQuery[] = [];
    queryStats.forEach((stats, query) => {
      const avgTime = stats.totalTime / stats.count;
      if (stats.maxTime >= slowThreshold || avgTime >= slowThreshold / 2) {
        slowQueries.push({
          query: stats.query,
          executionTime: stats.maxTime,
          executionCount: stats.count,
          avgExecutionTime: avgTime,
          lastExecution: stats.lastExecution,
          queryType: stats.queryType,
          suggestions: this.generateQueryOptimizationSuggestions({
            query,
            executionTime: avgTime,
            queryType: stats.queryType as any
          } as any)
        });
      }
    });

    // 按执行时间降序排序
    return slowQueries.sort((a, b) => b.executionTime - a.executionTime);
  }

  /**
   * 生成查询优化建议
   */
  private generateQueryOptimizationSuggestions(query: QueryPerformance): string[] {
    const suggestions: string[] = [];
    const { query: sql, executionTime, queryType } = query;

    // 基于执行时间的建议
    if (executionTime > this.config.slowQueryThreshold) {
      suggestions.push(`查询执行时间 (${executionTime.toFixed(2)}ms) 超过阈值，建议优化`);
    }

    // 基于查询类型的建议
    if (sql.toLowerCase().includes('select *')) {
      suggestions.push('避免使用 SELECT *，明确指定需要的列');
    }

    if (sql.toLowerCase().includes('join')) {
      suggestions.push('确保JOIN字段有索引');
      suggestions.push('考虑使用INNER JOIN代替OUTER JOIN以提升性能');
    }

    if (sql.toLowerCase().includes('like %')) {
      suggestions.push('前导通配符查询无法使用索引，考虑全文索引或其他搜索方案');
    }

    if (sql.toLowerCase().includes('order by') && !sql.toLowerCase().includes('limit')) {
      suggestions.push('ORDER BY 后建议添加 LIMIT 限制结果集大小');
    }

    if (queryType === 'aggregate') {
      suggestions.push('聚合查询可以考虑使用物化视图或预计算');
    }

    if (suggestions.length === 0) {
      suggestions.push('查询性能良好，无需优化');
    }

    return suggestions;
  }

  // ========================================================================
  // 趋势分析
  // ========================================================================

  /**
   * 分析性能趋势
   */
  analyzeTrend(metricType: string, timeRange?: TimeRange): TrendAnalysis {
    let metrics: PerformanceMetric[];

    if (timeRange) {
      metrics = this.collector.getMetricsByTimeRange(
        metricType as any,
        timeRange.from,
        timeRange.to
      );
    } else {
      metrics = this.collector.getMetrics(metricType as any);
    }

    if (metrics.length < this.config.minSampleSize) {
      return {
        metric: metricType,
        timeRange: timeRange || { from: 0, to: Date.now() },
        dataPoints: [],
        trend: 'stable',
        changeRate: 0
      };
    }

    // 提取数据点
    const dataPoints = metrics.map(m => ({
      timestamp: m.timestamp,
      value: m.value
    }));

    // 计算趋势
    const trend = this.calculateTrend(dataPoints);
    const changeRate = this.calculateChangeRate(dataPoints);

    // 生成简单预测
    const forecast = this.generateForecast(dataPoints);

    return {
      metric: metricType,
      timeRange: {
        from: dataPoints[0].timestamp,
        to: dataPoints[dataPoints.length - 1].timestamp
      },
      dataPoints,
      trend,
      changeRate,
      forecast
    };
  }

  /**
   * 计算趋势方向
   */
  private calculateTrend(dataPoints: { timestamp: number; value: number }[]): 'improving' | 'degrading' | 'stable' {
    if (dataPoints.length < 2) return 'stable';

    // 简单线性回归
    const n = dataPoints.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    dataPoints.forEach((point, index) => {
      sumX += index;
      sumY += point.value;
      sumXY += index * point.value;
      sumX2 += index * index;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    // 值越小越好（如响应时间），所以负斜率表示改进
    if (slope < -0.1) return 'improving';
    if (slope > 0.1) return 'degrading';
    return 'stable';
  }

  /**
   * 计算变化率
   */
  private calculateChangeRate(dataPoints: { timestamp: number; value: number }[]): number {
    if (dataPoints.length < 2) return 0;

    const firstValue = dataPoints[0].value;
    const lastValue = dataPoints[dataPoints.length - 1].value;

    if (firstValue === 0) return 0;
    return ((lastValue - firstValue) / firstValue) * 100;
  }

  /**
   * 生成简单预测
   */
  private generateForecast(dataPoints: { timestamp: number; value: number }[]): {
    nextValue: number;
    confidence: number;
  } | undefined {
    if (dataPoints.length < 5) return undefined;

    // 使用移动平均预测
    const windowSize = Math.min(5, dataPoints.length);
    const recentPoints = dataPoints.slice(-windowSize);
    const avgValue = recentPoints.reduce((sum, p) => sum + p.value, 0) / windowSize;

    // 计算标准差作为置信度指标
    const variance = recentPoints.reduce((sum, p) => sum + Math.pow(p.value - avgValue, 2), 0) / windowSize;
    const stdDev = Math.sqrt(variance);
    const confidenceValue = Math.max(0, Math.min(1, 1 - (stdDev / avgValue)));

    return {
      nextValue: avgValue,
      confidence: confidenceValue
    };
  }

  // ========================================================================
  // 瓶颈分析
  // ========================================================================

  /**
   * 识别性能瓶颈
   */
  identifyBottlenecks(): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];

    // 分析查询瓶颈
    const queryAnalysis = this.analyzeQueryPerformance();
    if (queryAnalysis.slowQueries.length > 0) {
      bottlenecks.push({
        id: 'query_performance',
        type: 'query',
        severity: queryAnalysis.avgExecutionTime > 2000 ? 'high' : 'medium',
        affectedMetrics: ['query.execution_time'],
        description: `发现 ${queryAnalysis.slowQueries.length} 个慢查询，平均执行时间 ${queryAnalysis.avgExecutionTime.toFixed(2)}ms`,
        impact: queryAnalysis.slowQueries.map(sq => ({
          metricName: 'query.execution_time',
          degradation: sq.executionTime
        }))
      });
    }

    // 分析AI响应瓶颈
    const aiMetrics = this.collector.getMetrics('ai_call');
    if (aiMetrics.length > 0) {
      const avgAiTime = this.calculateAverage(aiMetrics.map(m => m.value));
      if (avgAiTime > 3000) {
        bottlenecks.push({
          id: 'ai_response_time',
          type: 'ai',
          severity: avgAiTime > 5000 ? 'high' : 'medium',
          affectedMetrics: ['ai.response_time'],
          description: `AI平均响应时间 ${avgAiTime.toFixed(2)}ms 超过建议值`,
          impact: [{
            metricName: 'ai.response_time',
            degradation: avgAiTime
          }]
        });
      }
    }

    // 分析内存瓶颈
    const memoryMetrics = this.collector.getMetrics('memory');
    if (memoryMetrics.length > 0) {
      const latestMemory = memoryMetrics[memoryMetrics.length - 1];
      if (latestMemory.metadata?.percentage > 80) {
        bottlenecks.push({
          id: 'memory_usage',
          type: 'resource',
          severity: 'high',
          affectedMetrics: ['memory.usage'],
          description: `内存使用率 ${latestMemory.metadata.percentage.toFixed(1)}% 过高`,
          impact: [{
            metricName: 'memory.usage',
            degradation: latestMemory.metadata.percentage
          }]
        });
      }
    }

    return bottlenecks;
  }

  /**
   * 生成优化建议
   */
  generateOptimizationSuggestions(bottlenecks?: Bottleneck[]): OptimizationSuggestion[] {
    const detectedBottlenecks = bottlenecks || this.identifyBottlenecks();
    const suggestions: OptimizationSuggestion[] = [];

    detectedBottlenecks.forEach(bottleneck => {
      switch (bottleneck.type) {
        case 'query':
          suggestions.push({
            id: `opt_${bottleneck.id}`,
            type: 'query',
            priority: bottleneck.severity === 'high' ? 'high' : 'medium',
            title: '优化查询性能',
            description: '通过添加索引、优化查询语句或使用缓存来提升查询性能',
            estimatedImprovement: {
              metric: 'query.execution_time',
              currentValue: bottleneck.impact[0]?.degradation || 0,
              expectedValue: bottleneck.impact[0]?.degradation * 0.5 || 0,
              improvementPercentage: 50
            },
            steps: [
              '检查并添加适当的索引',
              '优化JOIN操作的顺序',
              '使用查询缓存减少重复查询',
              '考虑使用物化视图预计算聚合结果'
            ],
            relatedMetrics: ['query.execution_time', 'query.cache_hit_rate']
          });
          break;

        case 'ai':
          suggestions.push({
            id: `opt_${bottleneck.id}`,
            type: 'ai',
            priority: 'medium',
            title: '优化AI响应时间',
            description: '通过缓存AI响应、批量处理或使用更快的模型来减少响应时间',
            estimatedImprovement: {
              metric: 'ai.response_time',
              currentValue: bottleneck.impact[0]?.degradation || 0,
              expectedValue: bottleneck.impact[0]?.degradation * 0.6 || 0,
              improvementPercentage: 40
            },
            steps: [
              '启用AI响应缓存',
              '使用更快的模型处理简单请求',
              '批量处理AI请求以减少网络开销',
              '考虑使用本地模型处理简单任务'
            ],
            relatedMetrics: ['ai.response_time', 'ai.cache_hit_rate']
          });
          break;

        case 'resource':
          suggestions.push({
            id: `opt_${bottleneck.id}`,
            type: 'resource',
            priority: bottleneck.severity === 'high' ? 'high' : 'medium',
            title: '优化内存使用',
            description: '通过释放未使用的资源、优化数据结构或增加内存限制来减少内存占用',
            estimatedImprovement: {
              metric: 'memory.usage',
              currentValue: bottleneck.impact[0]?.degradation || 0,
              expectedValue: bottleneck.impact[0]?.degradation * 0.7 || 0,
              improvementPercentage: 30
            },
            steps: [
              '定期清理未使用的缓存数据',
              '优化数据结构减少内存占用',
              '使用流式处理大数据集',
              '考虑分页或虚拟滚动技术'
            ],
            relatedMetrics: ['memory.usage', 'cache.size']
          });
          break;
      }
    });

    return suggestions;
  }

  // ========================================================================
  // 性能报告生成
  // ========================================================================

  /**
   * 生成性能报告
   */
  generateReport(timeRange?: TimeRange): PerformanceReport {
    const now = Date.now();
    const reportTimeRange = timeRange || {
      from: now - 3600000, // 默认最近1小时
      to: now
    };

    // 收集报告数据
    const queryMetrics = this.collector.getMetricsByTimeRange('query', reportTimeRange.from, reportTimeRange.to) as QueryPerformance[];
    const aiMetrics = this.collector.getMetricsByTimeRange('ai_call', reportTimeRange.from, reportTimeRange.to);
    const documentMetrics = this.collector.getMetricsByTimeRange('document', reportTimeRange.from, reportTimeRange.to);
    const memoryMetrics = this.collector.getMetricsByTimeRange('memory', reportTimeRange.from, reportTimeRange.to);
    const cpuMetrics = this.collector.getMetricsByTimeRange('cpu', reportTimeRange.from, reportTimeRange.to);

    // 生成摘要
    const summary = {
      query: {
        totalQueries: queryMetrics.length,
        avgResponseTime: queryMetrics.length > 0 ? this.calculateAverage(queryMetrics.map(m => m.value)) : 0,
        slowQueryCount: this.identifySlowQueries(undefined, queryMetrics).length,
        cacheHitRate: this.calculateCacheHitRate(queryMetrics)
      },
      ai: {
        totalCalls: aiMetrics.length,
        avgResponseTime: aiMetrics.length > 0 ? this.calculateAverage(aiMetrics.map(m => m.value)) : 0,
        successRate: this.calculateSuccessRate(aiMetrics),
        totalTokens: aiMetrics.reduce((sum, m) => sum + (m.metadata?.tokensUsed || 0), 0)
      },
      document: {
        totalGenerated: documentMetrics.length,
        avgGenerationTime: documentMetrics.length > 0 ? this.calculateAverage(documentMetrics.map(m => m.value)) : 0,
        successRate: this.calculateSuccessRate(documentMetrics)
      },
      resources: {
        avgMemoryUsage: memoryMetrics.length > 0 ? this.calculateAverage(memoryMetrics.map(m => m.value)) : 0,
        peakMemoryUsage: memoryMetrics.length > 0 ? Math.max(...memoryMetrics.map(m => m.value)) : 0,
        avgCpuUsage: cpuMetrics.length > 0 ? this.calculateAverage(cpuMetrics.map(m => m.value)) : 0
      }
    };

    // 计算性能评分
    const score = this.benchmarkEvaluator.calculateOverallScore({
      query: queryMetrics.slice(0, 100).map(m => ({ type: m.queryType, time: m.value })),
      ai: aiMetrics.slice(0, 50).map(m => ({ type: m.metadata?.callType || 'simple', time: m.value })),
      document: documentMetrics.slice(0, 50).map(m => ({
        method: m.metadata?.method || 'single',
        count: m.metadata?.documentCount || 1,
        time: m.value
      })),
      resources: memoryMetrics.length > 0 ? {
        memory: summary.resources.avgMemoryUsage / (1024 * 1024),
        cpu: summary.resources.avgCpuUsage
      } : undefined
    });

    // 生成优化建议
    const bottlenecks = this.identifyBottlenecks();
    const suggestions = this.generateOptimizationSuggestions(bottlenecks);

    // 合并所有指标
    const allMetrics: PerformanceMetric[] = [
      ...queryMetrics,
      ...aiMetrics,
      ...documentMetrics,
      ...memoryMetrics,
      ...cpuMetrics
    ];

    return {
      reportId: this.generateReportId(),
      timeRange: reportTimeRange,
      generatedAt: now,
      summary,
      metrics: allMetrics,
      score,
      suggestions
    };
  }

  /**
   * 对比两个性能报告
   */
  comparePerformance(before: PerformanceReport, after: PerformanceReport): ComparisonReport {
    const improvements: ComparisonReport['improvements'] = [];

    // 对比查询性能
    if (before.summary.query.totalQueries > 0 && after.summary.query.totalQueries > 0) {
      const beforeValue = before.summary.query.avgResponseTime;
      const afterValue = after.summary.query.avgResponseTime;
      const change = afterValue - beforeValue;
      const changePercentage = (change / beforeValue) * 100;

      improvements.push({
        metric: 'query.avg_response_time',
        beforeValue,
        afterValue,
        change,
        changePercentage,
        status: change < 0 ? 'improved' : change > 0 ? 'degraded' : 'unchanged'
      });
    }

    // 对比AI性能
    if (before.summary.ai.totalCalls > 0 && after.summary.ai.totalCalls > 0) {
      const beforeValue = before.summary.ai.avgResponseTime;
      const afterValue = after.summary.ai.avgResponseTime;
      const change = afterValue - beforeValue;
      const changePercentage = (change / beforeValue) * 100;

      improvements.push({
        metric: 'ai.avg_response_time',
        beforeValue,
        afterValue,
        change,
        changePercentage,
        status: change < 0 ? 'improved' : change > 0 ? 'degraded' : 'unchanged'
      });
    }

    // 对比内存使用
    if (before.summary.resources.avgMemoryUsage > 0 && after.summary.resources.avgMemoryUsage > 0) {
      const beforeValue = before.summary.resources.avgMemoryUsage;
      const afterValue = after.summary.resources.avgMemoryUsage;
      const change = afterValue - beforeValue;
      const changePercentage = (change / beforeValue) * 100;

      improvements.push({
        metric: 'resources.avg_memory_usage',
        beforeValue,
        afterValue,
        change,
        changePercentage,
        status: change < 0 ? 'improved' : change > 0 ? 'degraded' : 'unchanged'
      });
    }

    // 生成总体评估
    const improvedCount = improvements.filter(i => i.status === 'improved').length;
    const degradedCount = improvements.filter(i => i.status === 'degraded').length;

    let overallAssessment: string;
    if (improvedCount > degradedCount) {
      overallAssessment = `性能有所提升，${improvedCount} 项指标改进，${degradedCount} 项指标下降`;
    } else if (degradedCount > improvedCount) {
      overallAssessment = `性能有所下降，${degradedCount} 项指标下降，${improvedCount} 项指标改进`;
    } else {
      overallAssessment = '性能基本持平';
    }

    return {
      comparisonId: this.generateReportId(),
      before,
      after,
      comparedAt: Date.now(),
      improvements,
      overallAssessment
    };
  }

  // ========================================================================
  // 私有辅助方法
  // ========================================================================

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  private calculateCacheHitRate(queries: QueryPerformance[]): number {
    if (queries.length === 0) return 0;
    const cached = queries.filter(q => q.cached).length;
    return (cached / queries.length) * 100;
  }

  private calculateSuccessRate(metrics: PerformanceMetric[]): number {
    if (metrics.length === 0) return 100;
    const successful = metrics.filter(m => m.metadata?.success !== false).length;
    return (successful / metrics.length) * 100;
  }

  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
