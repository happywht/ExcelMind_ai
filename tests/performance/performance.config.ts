/**
 * 性能测试配置
 * 定义性能阈值和测试参数
 *
 * @author Performance Tester
 * @version 1.0.0
 */

export interface PerformanceThreshold {
  name: string;
  threshold: number;
  description: string;
  unit: 'ms' | 'MB' | '%';
}

export interface PerformanceTestConfig {
  name: string;
  description: string;
  thresholds: PerformanceThreshold[];
  iterations: number;
  warmup: number;
  delay: number;
}

/**
 * 性能阈值配置
 */
export const PERFORMANCE_THRESHOLDS: Record<string, PerformanceThreshold[]> = {
  // 共享类型库编译
  sharedTypes: [
    {
      name: 'full-compile',
      threshold: 5000,
      description: '完整编译时间',
      unit: 'ms'
    },
    {
      name: 'type-check',
      threshold: 3000,
      description: '类型检查时间',
      unit: 'ms'
    },
    {
      name: 'declaration-gen',
      threshold: 2000,
      description: '声明文件生成时间',
      unit: 'ms'
    },
    {
      name: 'incremental-build',
      threshold: 1000,
      description: '增量编译时间',
      unit: 'ms'
    }
  ],

  // AI 降级策略
  degradation: [
    {
      name: 'cpu-overhead',
      threshold: 5,
      description: 'CPU 开销',
      unit: '%'
    },
    {
      name: 'memory-overhead',
      threshold: 20,
      description: '内存开销',
      unit: 'MB'
    },
    {
      name: 'decision-time',
      threshold: 10,
      description: '降级决策时间',
      unit: 'ms'
    },
    {
      name: 'monitoring-time',
      threshold: 5,
      description: '监控检查时间',
      unit: 'ms'
    }
  ],

  // 状态存储
  storage: [
    {
      name: 'redis-set-get',
      threshold: 50,
      description: 'Redis SET+GET 时间',
      unit: 'ms'
    },
    {
      name: 'indexeddb-set-get',
      threshold: 100,
      description: 'IndexedDB SET+GET 时间',
      unit: 'ms'
    },
    {
      name: 'sync-latency',
      threshold: 100,
      description: '状态同步延迟',
      unit: 'ms'
    },
    {
      name: 'query-latency',
      threshold: 75,
      description: '查询延迟',
      unit: 'ms'
    }
  ],

  // 虚拟文件系统
  vfs: [
    {
      name: 'file-upload-1mb',
      threshold: 200,
      description: '1MB 文件上传时间',
      unit: 'ms'
    },
    {
      name: 'file-list-query',
      threshold: 100,
      description: '文件列表查询时间',
      unit: 'ms'
    },
    {
      name: 'relationship-query',
      threshold: 150,
      description: '关系查询时间',
      unit: 'ms'
    },
    {
      name: 'file-delete',
      threshold: 50,
      description: '文件删除时间',
      unit: 'ms'
    },
    {
      name: 'graph-query-50',
      threshold: 150,
      description: '50 节点图谱查询',
      unit: 'ms'
    },
    {
      name: 'graph-query-100',
      threshold: 300,
      description: '100 节点图谱查询',
      unit: 'ms'
    }
  ],

  // 前端组件渲染
  components: [
    {
      name: 'file-browser-render',
      threshold: 100,
      description: 'FileBrowser 渲染时间',
      unit: 'ms'
    },
    {
      name: 'progress-panel-render',
      threshold: 80,
      description: 'ProgressPanel 渲染时间',
      unit: 'ms'
    },
    {
      name: 'graph-render-50',
      threshold: 300,
      description: '50 节点图渲染时间',
      unit: 'ms'
    },
    {
      name: 'graph-render-100',
      threshold: 500,
      description: '100 节点图渲染时间',
      unit: 'ms'
    },
    {
      name: 're-render-time',
      threshold: 50,
      description: '组件重新渲染时间',
      unit: 'ms'
    },
    {
      name: 'state-update-time',
      threshold: 30,
      description: '状态更新时间',
      unit: 'ms'
    }
  ]
};

/**
 * 测试参数配置
 */
export const TEST_PARAMETERS = {
  // 快速测试（开发环境）
  quick: {
    iterations: 3,
    warmup: 1,
    delay: 50
  },

  // 标准测试（CI 环境）
  standard: {
    iterations: 10,
    warmup: 2,
    delay: 100
  },

  // 完整测试（性能分析）
  full: {
    iterations: 20,
    warmup: 3,
    delay: 200
  }
};

/**
 * 性能等级定义
 */
export const PERFORMANCE_GRADES = {
  excellent: {
    name: '优秀',
    color: 'green',
    threshold: 0.8 // < 80% 目标值
  },
  good: {
    name: '良好',
    color: 'blue',
    threshold: 1.0 // < 100% 目标值
  },
  acceptable: {
    name: '可接受',
    color: 'yellow',
    threshold: 1.2 // < 120% 目标值
  },
  poor: {
    name: '较差',
    color: 'orange',
    threshold: 1.5 // < 150% 目标值
  },
  critical: {
    name: '严重',
    color: 'red',
    threshold: Infinity // >= 150% 目标值
  }
};

/**
 * 获取性能等级
 */
export function getPerformanceGrade(actual: number, threshold: number): string {
  const ratio = actual / threshold;

  if (ratio < PERFORMANCE_GRADES.excellent.threshold) return 'excellent';
  if (ratio < PERFORMANCE_GRADES.good.threshold) return 'good';
  if (ratio < PERFORMANCE_GRADES.acceptable.threshold) return 'acceptable';
  if (ratio < PERFORMANCE_GRADES.poor.threshold) return 'poor';
  return 'critical';
}

/**
 * 格式化性能值
 */
export function formatPerformanceValue(value: number, unit: string): string {
  switch (unit) {
    case 'ms':
      if (value < 1) {
        return `${(value * 1000).toFixed(2)}μs`;
      }
      return `${value.toFixed(2)}ms`;
    case 'MB':
      if (value >= 1024) {
        return `${(value / 1024).toFixed(2)}GB`;
      }
      return `${value.toFixed(2)}MB`;
    case '%':
      return `${value.toFixed(2)}%`;
    default:
      return `${value}`;
  }
}

/**
 * 计算性能变化
 */
export function calculatePerformanceChange(
  current: number,
  baseline: number
): { change: number; changePercent: number; improved: boolean } {
  const change = current - baseline;
  const changePercent = (change / baseline) * 100;
  const improved = change < 0;

  return { change, changePercent, improved };
}

/**
 * 生成性能建议
 */
export function generatePerformanceRecommendation(
  testName: string,
  actual: number,
  threshold: number
): string[] {
  const recommendations: string[] = [];
  const ratio = actual / threshold;

  if (ratio > 1.5) {
    recommendations.push(`严重性能问题：${testName} 超过阈值 ${((ratio - 1) * 100).toFixed(0)}%`);
    recommendations.push('建议立即进行性能分析和优化');

    // 根据测试类型给出具体建议
    if (testName.includes('compile')) {
      recommendations.push('- 检查类型定义的复杂度');
      recommendations.push('- 考虑拆分大型类型文件');
      recommendations.push('- 启用增量编译优化');
    } else if (testName.includes('render')) {
      recommendations.push('- 使用 React.memo 优化组件');
      recommendations.push('- 实现虚拟列表或分页');
      recommendations.push('- 避免不必要的重新渲染');
    } else if (testName.includes('query') || testName.includes('get')) {
      recommendations.push('- 添加适当的索引');
      recommendations.push('- 实现查询结果缓存');
      recommendations.push('- 优化查询条件');
    }
  } else if (ratio > 1.2) {
    recommendations.push(`性能警告：${testName} 超过阈值 ${((ratio - 1) * 100).toFixed(0)}%`);
    recommendations.push('建议进行性能优化');
  } else if (ratio < 0.8) {
    recommendations.push(`性能优秀：${testName} 优于阈值 ${((1 - ratio) * 100).toFixed(0)}%`);
  }

  return recommendations;
}

/**
 * 导出默认配置
 */
export const DEFAULT_CONFIG: PerformanceTestConfig = {
  name: 'default',
  description: '默认性能测试配置',
  thresholds: [],
  iterations: TEST_PARAMETERS.standard.iterations,
  warmup: TEST_PARAMETERS.standard.warmup,
  delay: TEST_PARAMETERS.standard.delay
};
