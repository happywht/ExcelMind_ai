# 性能监控系统使用指南

## 概述

性能监控系统是 ExcelMind AI 的 Phase 2 性能优化模块，提供全面的性能监控、分析和优化功能。系统实时追踪查询性能、AI响应时间、文档生成效率和资源使用情况，帮助识别性能瓶颈并优化系统表现。

---

## 快速开始

### 基础使用

```typescript
import { initPerformanceMonitoring } from '@/services/monitoring';

// 初始化监控系统
const monitoring = initPerformanceMonitoring({
  monitor: {
    autoStart: true,
    monitoringInterval: 10000,
    enableAlerts: true
  },
  collector: {
    maxCacheSize: 10000,
    sampleRate: 1.0
  }
});

// 访问各模块
const { monitor, collector, analyzer } = monitoring;
```

### 使用装饰器追踪性能

```typescript
import { TrackQuery, TrackAICall, TrackDocumentGeneration } from '@/services/monitoring';

class DataService {
  @TrackQuery('simple')
  async getUserData(userId: string) {
    // 查询会被自动追踪
    return await db.query('SELECT * FROM users WHERE id = ?', [userId]);
  }

  @TrackAICall('chat', 'glm-4.6')
  async generateResponse(prompt: string) {
    // AI调用会被自动追踪
    return await aiService.chat(prompt);
  }

  @TrackDocumentGeneration('single')
  async generateDocument(template: string, data: any) {
    // 文档生成会被自动追踪
    return await docService.generate(template, data);
  }
}
```

### 手动追踪性能

```typescript
import { PerformanceTracker } from '@/services/monitoring';

// 追踪函数执行
const result = PerformanceTracker.trackFunction(
  () => expensiveOperation(),
  'custom.operation',
  { userId: '123' }
);

// 追踪异步函数
const data = await PerformanceTracker.trackAsyncFunction(
  async () => await fetchData(),
  'data.fetch'
);

// 追踪查询
const users = await PerformanceTracker.trackQuery(
  'SELECT * FROM users',
  'simple',
  async () => await db.query('SELECT * FROM users')
);

// 追踪AI调用
const response = await PerformanceTracker.trackAICall(
  '解释这段代码',
  'chat',
  'glm-4.6',
  async () => await aiService.chat('解释这段代码')
);

// 手动追踪
const trackerId = PerformanceTracker.startTracking('custom.process');
try {
  // 执行操作
  await doSomething();
} finally {
  PerformanceTracker.stopTracking(trackerId);
}
```

---

## 核心功能

### 1. 性能监控器 (PerformanceMonitor)

性能监控器是系统的核心，提供实时监控、告警和报告功能。

```typescript
import { globalPerformanceMonitor } from '@/services/monitoring';

// 开始/停止监控
monitor.startMonitoring();
monitor.stopMonitoring();

// 检查状态
if (monitor.isRunning()) {
  console.log('监控运行中');
}

// 记录指标
monitor.recordMetric({
  type: 'query',
  name: 'query.execution',
  value: 45,
  unit: 'ms',
  timestamp: Date.now(),
  metadata: { cached: true }
});

// 获取报告
const report = monitor.getReport({
  from: Date.now() - 3600000,
  to: Date.now()
});

console.log('性能评分:', report.score.overall);
console.log('平均查询时间:', report.summary.query.avgResponseTime);

// 获取实时指标
const realTime = monitor.getRealTimeMetrics();
console.log('实时QPS:', realTime.query.queriesPerSecond);
```

### 2. 指标收集器 (MetricsCollector)

指标收集器负责收集和存储各类性能指标。

```typescript
import { globalMetricsCollector } from '@/services/monitoring';

// 收集查询性能
collector.collectQueryPerformance({
  query: 'SELECT * FROM users WHERE status = ?',
  executionTime: 35,
  rowCount: 100,
  queryType: 'simple',
  cached: false,
  tables: ['users']
});

// 收集AI响应时间
collector.collectAIResponseTime({
  prompt: '生成一个Excel公式',
  responseTime: 1200,
  promptLength: 50,
  responseLength: 100,
  tokensUsed: 150,
  model: 'glm-4.6',
  callType: 'formula',
  success: true
});

// 收集文档生成性能
collector.collectDocumentGeneration({
  templateName: 'contract_template.docx',
  dataRowCount: 50,
  documentCount: 1,
  generationTime: 450,
  method: 'single',
  status: 'success'
});

// 收集资源使用
const usage = collector.collectResourceUsage();
console.log('内存使用:', usage.memory.percentage, '%');

// 收集用户体验指标
collector.collectUXMetrics({
  eventType: 'load',
  target: 'page',
  page: '/dashboard'
});

// 记录页面加载时间
collector.recordPageLoadTime(850, {
  firstContentfulPaint: 450,
  timeToInteractive: 800
});

// 查询指标
const queryMetrics = collector.getMetrics('query');
const recentMetrics = collector.getMetricsByTimeRange(
  'query',
  Date.now() - 3600000,
  Date.now()
);

// 获取统计信息
const stats = collector.getMetricsStats();
console.log('总指标数:', stats.totalMetrics);
console.log('按类型分布:', stats.metricsByType);
```

### 3. 性能分析器 (PerformanceAnalyzer)

性能分析器对收集的指标进行分析，识别瓶颈并生成优化建议。

```typescript
import { PerformanceAnalyzer, MetricsCollector, BenchmarkEvaluator } from '@/services/monitoring';

const analyzer = new PerformanceAnalyzer(collector, benchmarkEvaluator);

// 分析查询性能
const queryAnalysis = analyzer.analyzeQueryPerformance();
console.log('总查询数:', queryAnalysis.totalQueries);
console.log('平均执行时间:', queryAnalysis.avgExecutionTime);
console.log('慢查询:', queryAnalysis.slowQueries);

// 识别慢查询
const slowQueries = analyzer.identifySlowQueries(1000);
slowQueries.forEach(sq => {
  console.log(`慢查询: ${sq.query}`);
  console.log(`执行时间: ${sq.executionTime}ms`);
  console.log(`优化建议: ${sq.suggestions.join(', ')}`);
});

// 分析性能趋势
const trend = analyzer.analyzeTrend('query', {
  from: Date.now() - 86400000,
  to: Date.now()
});
console.log('趋势:', trend.trend);
console.log('变化率:', trend.changeRate, '%');
if (trend.forecast) {
  console.log('预测值:', trend.forecast.nextValue);
  console.log('置信度:', trend.forecast.confidence);
}

// 识别性能瓶颈
const bottlenecks = analyzer.identifyBottlenecks();
bottlenecks.forEach(bottleneck => {
  console.log(`瓶颈: ${bottleneck.type}`);
  console.log(`严重程度: ${bottleneck.severity}`);
  console.log(`描述: ${bottleneck.description}`);
});

// 生成优化建议
const suggestions = analyzer.generateOptimizationSuggestions(bottlenecks);
suggestions.forEach(suggestion => {
  console.log(`建议: ${suggestion.title}`);
  console.log(`优先级: ${suggestion.priority}`);
  console.log(`预期改进: ${suggestion.estimatedImprovement.improvementPercentage}%`);
});

// 生成性能报告
const report = analyzer.generateReport({
  from: Date.now() - 3600000,
  to: Date.now()
});
console.log('性能评分:', report.score);

// 对比两个报告
const beforeReport = analyzer.generateReport({ from: t1, to: t2 });
const afterReport = analyzer.generateReport({ from: t3, to: t4 });
const comparison = analyzer.comparePerformance(beforeReport, afterReport);
console.log('总体评估:', comparison.overallAssessment);
```

### 4. 性能基准评估器 (BenchmarkEvaluator)

性能基准评估器根据预定义的基准值评估系统性能。

```typescript
import { BenchmarkEvaluator, DEFAULT_PERFORMANCE_BENCHMARKS } from '@/services/monitoring';

const evaluator = new BenchmarkEvaluator();

// 评估查询性能
const queryEval = evaluator.evaluateQuery('simple', 45);
console.log('等级:', queryEval.grade); // 'A', 'B', 'C', 'D', 'F'
console.log('级别:', queryEval.level); // 'excellent', 'good', 'fair', 'poor'
console.log('消息:', queryEval.message);

// 评估AI响应
const aiEval = evaluator.evaluateAI('simple', 1200);
console.log('AI响应评分:', aiEval.grade);

// 评估文档生成
const docEval = evaluator.evaluateDocument('single', 1, 350);
console.log('文档生成评分:', docEval.grade);

// 评估资源使用
const memEval = evaluator.evaluateResources('memory', 150);
console.log('内存使用评分:', memEval.grade);

// 计算总体评分
const score = evaluator.calculateOverallScore({
  query: [
    { type: 'simple', time: 45 },
    { type: 'aggregate', time: 80 }
  ],
  ai: [
    { type: 'simple', time: 1200 }
  ],
  document: [
    { method: 'single', count: 1, time: 350 }
  ],
  resources: {
    memory: 150,
    cpu: 35
  }
});
console.log('总体评分:', score.overall);
console.log('详细评分:', score.breakdown);
console.log('等级:', score.grade);

// 自定义基准
evaluator.updateBenchmarks({
  queries: {
    simple: { target: 3, warning: 5, error: 10 },
    filter: { target: 5, warning: 10, error: 20 },
    aggregate: { target: 10, warning: 20, error: 50 },
    join: { target: 15, warning: 30, error: 100 }
  }
});
```

---

## 性能告警

### 设置告警

```typescript
import { globalPerformanceMonitor } from '@/services/monitoring';

// 设置查询响应时间告警
const alertId = monitor.setAlert(
  {
    metric: 'query.execution_time',
    threshold: 1000,
    operator: '>',
    severity: 'warning'
  },
  (alert) => {
    console.warn('告警触发:', alert.message);
    // 发送通知、记录日志等
  }
);

// 设置内存使用告警
monitor.setAlert(
  {
    metric: 'memory.usage_percentage',
    threshold: 80,
    operator: '>=',
    severity: 'error'
  },
  (alert) => {
    console.error('内存使用过高:', alert);
    // 触发清理操作
  }
);

// 获取活跃告警
const alerts = monitor.getActiveAlerts();
alerts.forEach(alert => {
  console.log('告警:', alert.message);
});

// 清除告警
monitor.clearAlert(alertId);
monitor.clearAllAlerts();

// 移除告警配置
monitor.removeAlert(alertId);
```

---

## 性能仪表板

### 使用仪表板组件

```typescript
import { PerformanceDashboard } from '@/components/Monitoring/PerformanceDashboard';

function App() {
  return (
    <div className="p-6">
      <PerformanceDashboard
        refreshInterval={10000}
        showRealTime={true}
      />
    </div>
  );
}
```

### 仪表板功能

- **实时指标卡片**: 显示查询、AI、文档生成和资源使用的关键指标
- **性能趋势图**: 展示各项指标的变化趋势
- **慢查询列表**: Top 10 慢查询及优化建议
- **告警面板**: 当前活跃告警和历史告警
- **优化建议**: 系统生成的性能优化建议

---

## 最佳实践

### 1. 合理设置采样率

```typescript
// 生产环境: 降低采样率减少开销
const collector = new MetricsCollector({
  sampleRate: 0.1 // 只收集10%的指标
});

// 开发环境: 全量收集
const collector = new MetricsCollector({
  sampleRate: 1.0
});
```

### 2. 使用装饰器自动追踪

```typescript
@TrackPerformance('data.process')
async processData(data: any[]) {
  // 自动记录执行时间
  return data.map(transform);
}

@TrackQuery('aggregate')
async getStats() {
  // 自动追踪查询性能
  return await db.query('SELECT COUNT(*) FROM users');
}
```

### 3. 定期生成报告

```typescript
// 每小时生成一次报告
setInterval(() => {
  const report = monitor.getCustomReport(3600000);
  saveToDatabase(report);

  if (report.score.overall < 70) {
    notifyTeam('性能评分较低，请检查');
  }
}, 3600000);
```

### 4. 设置合理的告警阈值

```typescript
// 根据基准值设置告警
const benchmarks = DEFAULT_PERFORMANCE_BENCHMARKS;

monitor.setAlert({
  metric: 'query.execution_time',
  threshold: benchmarks.queries.simple.warning,
  operator: '>',
  severity: 'warning'
}, callback);
```

### 5. 清理过期数据

```typescript
// 定期清理旧指标
setInterval(() => {
  const cutoffTime = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7天前
  collector.clearMetrics();
}, 24 * 60 * 60 * 1000); // 每天清理
```

---

## 性能开销控制

性能监控系统的设计目标是监控开销小于5%。以下是控制开销的方法：

1. **采样率控制**: 只收集部分指标
2. **异步处理**: 指标记录不阻塞主流程
3. **批量操作**: 批量记录指标减少开销
4. **缓存大小限制**: 自动淘汰旧指标
5. **资源监控间隔**: 合理设置监控间隔

```typescript
const collector = new MetricsCollector({
  maxCacheSize: 5000,      // 限制缓存大小
  sampleRate: 0.1,         // 10%采样率
  resourceMonitoringInterval: 10000  // 10秒监控一次
});
```

---

## 故障排查

### 监控系统不工作

1. 检查是否已启动监控: `monitor.isRunning()`
2. 查看浏览器控制台是否有错误
3. 确认指标收集器配置正确

### 指标未记录

1. 检查采样率是否过低
2. 确认监控器正在运行
3. 查看指标类型是否正确

### 告警未触发

1. 确认告警已配置: `monitor.getAlerts()`
2. 检查阈值条件是否正确
3. 查看告警去重时间设置

---

## API 参考

详细的 API 文档请参考各模块的 TypeScript 类型定义和 JSDoc 注释。

---

## 更多资源

- [性能监控系统架构](./ARCHITECTURE.md)
- [性能优化最佳实践](./OPTIMIZATION.md)
- [故障排查指南](./TROUBLESHOOTING.md)
