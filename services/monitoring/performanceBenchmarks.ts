/**
 * 性能基准配置
 *
 * 定义系统各模块的性能基准值，用于评估性能表现
 */

import { PerformanceBenchmarks } from './types';

/**
 * 默认性能基准配置
 */
export const DEFAULT_PERFORMANCE_BENCHMARKS: PerformanceBenchmarks = {
  // 查询性能基准（毫秒）
  queries: {
    // 简单查询（无JOIN、无聚合）
    simple: {
      target: 5,      // <5ms 为优秀
      warning: 10,    // <10ms 为良好
      error: 20       // >20ms 需要优化
    },
    // 带筛选的查询
    filter: {
      target: 10,     // <10ms 为优秀
      warning: 20,    // <20ms 为良好
      error: 50       // >50ms 需要优化
    },
    // 聚合查询（SUM、AVG、COUNT等）
    aggregate: {
      target: 15,     // <15ms 为优秀
      warning: 30,    // <30ms 为良好
      error: 100      // >100ms 需要优化
    },
    // JOIN查询
    join: {
      target: 20,     // <20ms 为优秀
      warning: 50,    // <50ms 为良好
      error: 200      // >200ms 需要优化
    }
  },

  // AI响应时间基准（毫秒）
  ai: {
    // 简单AI调用（公式生成、简单问答）
    simple: {
      target: 1000,   // <1s 为优秀
      warning: 2000,  // <2s 为良好
      error: 3000     // >3s 需要优化
    },
    // 复杂AI调用（数据处理、映射规划）
    complex: {
      target: 2000,   // <2s 为优秀
      warning: 4000,  // <4s 为良好
      error: 6000     // >6s 需要优化
    }
  },

  // 文档生成基准（毫秒）
  document: {
    // 单文档生成
    single: {
      target: 300,    // <300ms 为优秀
      warning: 500,   // <500ms 为良好
      error: 1000     // >1s 需要优化
    },
    // 批量生成10个文档
    batch_10: {
      target: 3000,   // <3s 为优秀
      warning: 5000,  // <5s 为良好
      error: 10000    // >10s 需要优化
    },
    // 批量生成100个文档
    batch_100: {
      target: 30000,  // <30s 为优秀
      warning: 50000, // <50s 为良好
      error: 60000    // >60s 需要优化
    }
  },

  // 资源使用基准
  resources: {
    // 内存使用（MB）
    memory: {
      target: 200,    // <200MB 为优秀
      warning: 400,   // <400MB 为良好
      error: 800      // >800MB 需要优化
    },
    // CPU使用率（%）
    cpu: {
      target: 50,     // <50% 为优秀
      warning: 75,    // <75% 为良好
      error: 90       // >90% 需要优化
    }
  }
};

/**
 * 性能基准评估器
 */
export class BenchmarkEvaluator {
  private benchmarks: PerformanceBenchmarks;

  constructor(benchmarks: PerformanceBenchmarks = DEFAULT_PERFORMANCE_BENCHMARKS) {
    this.benchmarks = benchmarks;
  }

  /**
   * 评估查询性能
   */
  evaluateQuery(queryType: string, executionTime: number): {
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    level: 'excellent' | 'good' | 'fair' | 'poor';
    message: string;
  } {
    const benchmark = this.benchmarks.queries[queryType as keyof typeof this.benchmarks.queries];

    if (!benchmark) {
      return {
        grade: 'C',
        level: 'fair',
        message: '未知查询类型'
      };
    }

    if (executionTime <= benchmark.target) {
      return {
        grade: 'A',
        level: 'excellent',
        message: `性能优秀，执行时间 ${executionTime}ms 小于目标值 ${benchmark.target}ms`
      };
    } else if (executionTime <= benchmark.warning) {
      return {
        grade: 'B',
        level: 'good',
        message: `性能良好，执行时间 ${executionTime}ms 在警告值 ${benchmark.warning}ms 以内`
      };
    } else if (executionTime <= benchmark.error) {
      return {
        grade: 'C',
        level: 'fair',
        message: `性能一般，执行时间 ${executionTime}ms 接近错误阈值 ${benchmark.error}ms`
      };
    } else {
      return {
        grade: 'D',
        level: 'poor',
        message: `性能较差，执行时间 ${executionTime}ms 超过错误阈值 ${benchmark.error}ms，建议优化`
      };
    }
  }

  /**
   * 评估AI响应时间
   */
  evaluateAI(callType: string, responseTime: number): {
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    level: 'excellent' | 'good' | 'fair' | 'poor';
    message: string;
  } {
    const benchmark = this.benchmarks.ai[callType as keyof typeof this.benchmarks.ai];

    if (!benchmark) {
      return {
        grade: 'C',
        level: 'fair',
        message: '未知AI调用类型'
      };
    }

    if (responseTime <= benchmark.target) {
      return {
        grade: 'A',
        level: 'excellent',
        message: `响应优秀，响应时间 ${responseTime}ms 小于目标值 ${benchmark.target}ms`
      };
    } else if (responseTime <= benchmark.warning) {
      return {
        grade: 'B',
        level: 'good',
        message: `响应良好，响应时间 ${responseTime}ms 在警告值 ${benchmark.warning}ms 以内`
      };
    } else if (responseTime <= benchmark.error) {
      return {
        grade: 'C',
        level: 'fair',
        message: `响应一般，响应时间 ${responseTime}ms 接近错误阈值 ${benchmark.error}ms`
      };
    } else {
      return {
        grade: 'D',
        level: 'poor',
        message: `响应较慢，响应时间 ${responseTime}ms 超过错误阈值 ${benchmark.error}ms`
      };
    }
  }

  /**
   * 评估文档生成性能
   */
  evaluateDocument(method: string, count: number, generationTime: number): {
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    level: 'excellent' | 'good' | 'fair' | 'poor';
    message: string;
  } {
    let benchmarkKey: keyof typeof this.benchmarks.document;

    if (method === 'single' || count === 1) {
      benchmarkKey = 'single';
    } else if (count <= 10) {
      benchmarkKey = 'batch_10';
    } else if (count <= 100) {
      benchmarkKey = 'batch_100';
    } else {
      // 对于超过100的批量，按比例估算
      const perDocTime = generationTime / count;
      const expectedPerDoc = 300; // 300ms per document

      if (perDocTime <= expectedPerDoc) {
        return {
          grade: 'A',
          level: 'excellent',
          message: `批量生成优秀，平均每文档 ${perDocTime.toFixed(2)}ms`
        };
      } else if (perDocTime <= expectedPerDoc * 2) {
        return {
          grade: 'B',
          level: 'good',
          message: `批量生成良好，平均每文档 ${perDocTime.toFixed(2)}ms`
        };
      } else {
        return {
          grade: 'C',
          level: 'fair',
          message: `批量生成一般，平均每文档 ${perDocTime.toFixed(2)}ms`
        };
      }
    }

    const benchmark = this.benchmarks.document[benchmarkKey];

    if (generationTime <= benchmark.target) {
      return {
        grade: 'A',
        level: 'excellent',
        message: `生成优秀，总耗时 ${generationTime}ms 小于目标值 ${benchmark.target}ms`
      };
    } else if (generationTime <= benchmark.warning) {
      return {
        grade: 'B',
        level: 'good',
        message: `生成良好，总耗时 ${generationTime}ms 在警告值 ${benchmark.warning}ms 以内`
      };
    } else if (generationTime <= benchmark.error) {
      return {
        grade: 'C',
        level: 'fair',
        message: `生成一般，总耗时 ${generationTime}ms 接近错误阈值 ${benchmark.error}ms`
      };
    } else {
      return {
        grade: 'D',
        level: 'poor',
        message: `生成较慢，总耗时 ${generationTime}ms 超过错误阈值 ${benchmark.error}ms`
      };
    }
  }

  /**
   * 评估资源使用
   */
  evaluateResources(resourceType: 'memory' | 'cpu', value: number): {
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    level: 'excellent' | 'good' | 'fair' | 'poor';
    message: string;
  } {
    const benchmark = this.benchmarks.resources[resourceType];

    if (value <= benchmark.target) {
      return {
        grade: 'A',
        level: 'excellent',
        message: `资源使用优秀，${resourceType} 使用率 ${value}${resourceType === 'memory' ? 'MB' : '%'} 小于目标值 ${benchmark.target}${resourceType === 'memory' ? 'MB' : '%'}`
      };
    } else if (value <= benchmark.warning) {
      return {
        grade: 'B',
        level: 'good',
        message: `资源使用良好，${resourceType} 使用率 ${value}${resourceType === 'memory' ? 'MB' : '%'} 在警告值 ${benchmark.warning}${resourceType === 'memory' ? 'MB' : '%'} 以内`
      };
    } else if (value <= benchmark.error) {
      return {
        grade: 'C',
        level: 'fair',
        message: `资源使用一般，${resourceType} 使用率 ${value}${resourceType === 'memory' ? 'MB' : '%'} 接近错误阈值 ${benchmark.error}${resourceType === 'memory' ? 'MB' : '%'}`
      };
    } else {
      return {
        grade: 'D',
        level: 'poor',
        message: `资源使用较高，${resourceType} 使用率 ${value}${resourceType === 'memory' ? 'MB' : '%'} 超过错误阈值 ${benchmark.error}${resourceType === 'memory' ? 'MB' : '%'}，建议优化`
      };
    }
  }

  /**
   * 计算总体评分
   */
  calculateOverallScore(metrics: {
    query?: { type: string; time: number }[];
    ai?: { type: string; time: number }[];
    document?: { method: string; count: number; time: number }[];
    resources?: { memory: number; cpu: number };
  }): {
    overall: number;
    breakdown: {
      query: number;
      ai: number;
      document: number;
      resources: number;
    };
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
  } {
    const scores = {
      query: 100,
      ai: 100,
      document: 100,
      resources: 100
    };

    // 评估查询性能
    if (metrics.query && metrics.query.length > 0) {
      const queryScores = metrics.query.map(q => {
        const evaluation = this.evaluateQuery(q.type, q.time);
        return this.gradeToScore(evaluation.grade);
      });
      scores.query = queryScores.reduce((a, b) => a + b, 0) / queryScores.length;
    }

    // 评估AI性能
    if (metrics.ai && metrics.ai.length > 0) {
      const aiScores = metrics.ai.map(a => {
        const evaluation = this.evaluateAI(a.type, a.time);
        return this.gradeToScore(evaluation.grade);
      });
      scores.ai = aiScores.reduce((a, b) => a + b, 0) / aiScores.length;
    }

    // 评估文档生成性能
    if (metrics.document && metrics.document.length > 0) {
      const docScores = metrics.document.map(d => {
        const evaluation = this.evaluateDocument(d.method, d.count, d.time);
        return this.gradeToScore(evaluation.grade);
      });
      scores.document = docScores.reduce((a, b) => a + b, 0) / docScores.length;
    }

    // 评估资源使用
    if (metrics.resources) {
      const memScore = this.gradeToScore(this.evaluateResources('memory', metrics.resources.memory).grade);
      const cpuScore = this.gradeToScore(this.evaluateResources('cpu', metrics.resources.cpu).grade);
      scores.resources = (memScore + cpuScore) / 2;
    }

    // 计算总体评分
    const overall = (scores.query + scores.ai + scores.document + scores.resources) / 4;

    return {
      overall: Math.round(overall),
      breakdown: scores,
      grade: this.scoreToGrade(overall)
    };
  }

  /**
   * 等级转分数
   */
  private gradeToScore(grade: string): number {
    const scoreMap: Record<string, number> = {
      'A': 95,
      'B': 80,
      'C': 65,
      'D': 50,
      'F': 30
    };
    return scoreMap[grade] || 70;
  }

  /**
   * 分数转等级
   */
  private scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * 获取基准配置
   */
  getBenchmarks(): PerformanceBenchmarks {
    return { ...this.benchmarks };
  }

  /**
   * 更新基准配置
   */
  updateBenchmarks(updates: Partial<PerformanceBenchmarks>): void {
    this.benchmarks = {
      ...this.benchmarks,
      ...updates,
      queries: { ...this.benchmarks.queries, ...updates.queries },
      ai: { ...this.benchmarks.ai, ...updates.ai },
      document: { ...this.benchmarks.document, ...updates.document },
      resources: { ...this.benchmarks.resources, ...updates.resources }
    };
  }
}

/**
 * 导出默认评估器实例
 */
export const defaultBenchmarkEvaluator = new BenchmarkEvaluator();
