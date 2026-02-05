/**
 * 基础设施服务性能基准测试
 *
 * 用于验证服务的性能表现和优化效果
 */

import {
  createCacheService
} from '../cacheService';
import {
  createEventBus,
  EventType
} from '../eventBus';
import {
  RetryStrategies,
  createResilienceStrategy
} from '../retryService';

// ============================================================================
// 性能测量工具
// ============================================================================

interface PerformanceMetric {
  name: string;
  operations: number;
  totalTime: number;
  avgTime: number;
  opsPerSecond: number;
}

class PerformanceBenchmark {
  private metrics: PerformanceMetric[] = [];

  async measure<T>(
    name: string,
    operations: number,
    fn: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();

    for (let i = 0; i < operations; i++) {
      await fn();
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / operations;
    const opsPerSecond = (operations / totalTime) * 1000;

    const metric: PerformanceMetric = {
      name,
      operations,
      totalTime,
      avgTime,
      opsPerSecond
    };

    this.metrics.push(metric);
    this.printMetric(metric);

    return fn() as T; // 返回最后一次调用
  }

  measureSync<T>(
    name: string,
    operations: number,
    fn: () => T
  ): T {
    const startTime = performance.now();

    let result: T;
    for (let i = 0; i < operations; i++) {
      result = fn();
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / operations;
    const opsPerSecond = (operations / totalTime) * 1000;

    const metric: PerformanceMetric = {
      name,
      operations,
      totalTime,
      avgTime,
      opsPerSecond
    };

    this.metrics.push(metric);
    this.printMetric(metric);

    return result!;
  }

  private printMetric(metric: PerformanceMetric): void {
    console.log(`\n📊 ${metric.name}`);
    console.log(`   操作次数: ${metric.operations.toLocaleString()}`);
    console.log(`   总耗时: ${metric.totalTime.toFixed(2)}ms`);
    console.log(`   平均耗时: ${metric.avgTime.toFixed(4)}ms`);
    console.log(`   吞吐量: ${metric.opsPerSecond.toFixed(0)} ops/s`);
  }

  printSummary(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📈 性能基准测试汇总');
    console.log('='.repeat(60));

    this.metrics.forEach(metric => {
      console.log(`\n${metric.name}:`);
      console.log(`  ${metric.opsPerSecond.toFixed(0)} ops/s (${metric.avgTime.toFixed(4)}ms/op)`);
    });
  }

  compare(thresholds: Record<string, number>): void {
    console.log('\n' + '='.repeat(60));
    console.log('✅ 性能阈值验证');
    console.log('='.repeat(60));

    let passed = 0;
    let failed = 0;

    for (const [name, threshold] of Object.entries(thresholds)) {
      const metric = this.metrics.find(m => m.name === name);
      if (!metric) {
        console.log(`⚠️  未找到测试: ${name}`);
        continue;
      }

      const success = metric.avgTime <= threshold;
      if (success) {
        console.log(`✅ ${name}: ${metric.avgTime.toFixed(4)}ms <= ${threshold}ms`);
        passed++;
      } else {
        console.log(`❌ ${name}: ${metric.avgTime.toFixed(4)}ms > ${threshold}ms`);
        failed++;
      }
    }

    console.log(`\n总计: ${passed} 通过, ${failed} 失败`);
  }
}

// ============================================================================
// 缓存服务性能测试
// ============================================================================

export async function benchmarkCacheService() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 缓存服务性能测试');
  console.log('='.repeat(60));

  const benchmark = new PerformanceBenchmark();
  const cache = createCacheService({
    memory: { maxSize: 1000, ttl: 300 },
    localStorage: { enabled: true, maxSize: 5 * 1024 * 1024, ttl: 3600 },
    indexedDB: { enabled: false, dbName: '', storeName: '' },
    strategy: 'memory'
  });

  // 1. 写入性能
  const testKey1 = cache.generateKey('data_analysis', { type: 'write' });
  await benchmark.measure('缓存写入 (内存)', 10000, async () => {
    await cache.set(testKey1, { data: 'test', timestamp: Date.now() });
  });

  // 2. 读取性能
  await benchmark.measure('缓存读取 (内存)', 100000, async () => {
    await cache.get(testKey1);
  });

  // 3. 键生成性能
  benchmark.measureSync('缓存键生成', 10000, () => {
    cache.generateKey('template_analysis', {
      query: 'SELECT * FROM users WHERE id = ?',
      params: [1, 2, 3]
    });
  });

  // 4. LRU淘汰性能
  const smallCache = createCacheService({
    memory: { maxSize: 100, ttl: 300 },
    localStorage: { enabled: false, maxSize: 0, ttl: 0 },
    indexedDB: { enabled: false, dbName: '', storeName: '' },
    strategy: 'memory'
  });

  await benchmark.measure('LRU淘汰', 1000, async () => {
    for (let i = 0; i < 150; i++) {
      const key = smallCache.generateKey('mapping', { index: i });
      await smallCache.set(key, { data: i });
    }
  });

  // 5. 批量操作性能
  benchmark.measureSync('批量缓存设置 (100条)', 100, async () => {
    const promises = [];
    for (let i = 0; i < 100; i++) {
      const key = cache.generateKey('ai_response', { index: i });
      promises.push(cache.set(key, { data: i }));
    }
    await Promise.all(promises);
  });

  // 性能阈值验证
  benchmark.compare({
    '缓存写入 (内存)': 1,        // < 1ms
    '缓存读取 (内存)': 0.1,      // < 0.1ms
    '缓存键生成': 0.05,          // < 0.05ms
    'LRU淘汰': 50,               // < 50ms for 150 ops
    '批量缓存设置 (100条)': 100   // < 100ms
  });

  await cache.clear();
  await smallCache.clear();

  return benchmark;
}

// ============================================================================
// 事件总线性能测试
// ============================================================================

export async function benchmarkEventBus() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 事件总线性能测试');
  console.log('='.repeat(60));

  const benchmark = new PerformanceBenchmark();
  const eventBus = createEventBus();

  // 1. 发布性能（无订阅者）
  benchmark.measureSync('事件发布 (无订阅者)', 100000, () => {
    eventBus.publish('test.event', { data: 'test' });
  });

  // 2. 发布性能（单个订阅者）
  const handler1 = jest.fn();
  eventBus.subscribe('single.event', handler1);

  benchmark.measureSync('事件发布 (1个订阅者)', 100000, () => {
    eventBus.publish('single.event', { data: 'test' });
  });

  // 3. 发布性能（多个订阅者）
  const handlers = [];
  for (let i = 0; i < 10; i++) {
    handlers.push(jest.fn());
    eventBus.subscribe('multiple.event', handlers[i]);
  }

  benchmark.measureSync('事件发布 (10个订阅者)', 10000, () => {
    eventBus.publish('multiple.event', { data: 'test' });
  });

  // 4. 订阅性能
  benchmark.measureSync('事件订阅', 10000, () => {
    const unsubscribe = eventBus.subscribe('temp.event', () => {});
    unsubscribe();
  });

  // 5. 事件历史性能
  for (let i = 0; i < 1000; i++) {
    eventBus.publish('history.event', { index: i });
  }

  benchmark.measureSync('事件历史查询', 1000, () => {
    eventBus.getHistory('history.event');
  });

  // 6. 一次性订阅性能
  benchmark.measureSync('一次性订阅', 10000, () => {
    eventBus.subscribeOnce('once.event', () => {});
    eventBus.publish('once.event', {});
  });

  // 性能阈值验证
  benchmark.compare({
    '事件发布 (无订阅者)': 0.1,   // < 0.1ms
    '事件发布 (1个订阅者)': 0.2,  // < 0.2ms
    '事件发布 (10个订阅者)': 1,   // < 1ms
    '事件订阅': 0.1,              // < 0.1ms
    '事件历史查询': 5             // < 5ms
  });

  eventBus.clear();

  return benchmark;
}

// ============================================================================
// 重试服务性能测试
// ============================================================================

export async function benchmarkRetryService() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 重试服务性能测试');
  console.log('='.repeat(60));

  const benchmark = new PerformanceBenchmark();

  // 1. 延迟计算性能
  const retryStrategy = RetryStrategies.exponentialBackoff({
    maxRetries: 5,
    initialDelay: 1000,
    backoffMultiplier: 2
  });

  benchmark.measureSync('重试延迟计算', 100000, () => {
    for (let i = 0; i < 5; i++) {
      retryStrategy.getRetryDelay(i);
    }
  });

  // 2. 错误判断性能
  benchmark.measureSync('可重试错误判断', 100000, () => {
    const errors = [
      new Error('network error'),
      new Error('timeout'),
      new Error('rate limit'),
      new Error('500 Internal Server Error'),
      new Error('validation error')  // 不可重试
    ];

    errors.forEach((error, i) => {
      retryStrategy.shouldRetry(error, i);
    });
  });

  // 3. 成功场景性能（无重试）
  benchmark.measure('重试执行 (成功)', 1000, async () => {
    const operation = async () => ({ success: true });
    await retryStrategy.executeWithRetry(operation);
  });

  // 4. 重试场景性能（使用快速重试）
  const fastRetry = RetryStrategies.fastRetry();

  let attemptCount = 0;
  benchmark.measure('快速重试 (3次)', 100, async () => {
    attemptCount = 0;
    const operation = async () => {
      attemptCount++;
      if (attemptCount < 3) {
        throw new Error('network error');
      }
      return { success: true };
    };

    await fastRetry.executeWithRetry(operation);
  });

  // 5. 抖动计算性能
  const jitterRetry = RetryStrategies.exponentialBackoff({
    jitter: true,
    jitterAmount: 500
  });

  benchmark.measureSync('抖动计算', 10000, () => {
    for (let i = 0; i < 5; i++) {
      jitterRetry.getRetryDelay(i);
    }
  });

  // 性能阈值验证
  benchmark.compare({
    '重试延迟计算': 0.01,        // < 0.01ms
    '可重试错误判断': 0.01,     // < 0.01ms
    '重试执行 (成功)': 1,       // < 1ms
    '快速重试 (3次)': 500,      // < 500ms
    '抖动计算': 0.05            // < 0.05ms
  });

  return benchmark;
}

// ============================================================================
// 综合性能测试
// ============================================================================

export async function benchmarkIntegrated() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 综合场景性能测试');
  console.log('='.repeat(60));

  const benchmark = new PerformanceBenchmark();

  // 初始化服务
  const cache = createCacheService();
  const eventBus = createEventBus();
  const retry = createResilienceStrategy();

  // 场景：模拟文档处理流程
  benchmark.measure('文档处理流程 (带缓存)', 100, async () => {
    const taskId = `task-${Math.random()}`;

    // 1. 发布任务创建事件
    eventBus.publish('task.created', { taskId });

    // 2. 检查缓存
    const cacheKey = cache.generateKey('template_analysis', { taskId });
    let result = await cache.get(cacheKey);

    if (!result) {
      // 3. 模拟AI处理（带重试）
      const processDocument = async () => {
        return { processed: true, data: 'result' };
      };

      const processedResult = await retry.execute('ai.process', processDocument);
      result = {
        key: cacheKey,
        value: processedResult,
        createdAt: Date.now(),
        expiresAt: Date.now() + 300000,
        hitCount: 0,
        metadata: {
          size: 0,
          tags: [],
          source: 'benchmark'
        }
      };

      // 4. 缓存结果
      await cache.set(cacheKey, result.value, 300);
    }

    // 5. 发布完成事件
    eventBus.publish('task.completed', { taskId });

    return result;
  });

  // 场景：批量缓存操作
  benchmark.measure('批量缓存查询 (100条)', 100, async () => {
    const promises = [];
    for (let i = 0; i < 100; i++) {
      const key = cache.generateKey('data_analysis', { index: i });
      promises.push(cache.get(key));
    }
    await Promise.all(promises);
  });

  // 场景：高频事件发布
  const handler = jest.fn();
  eventBus.subscribe('highfreq.event', handler);

  benchmark.measureSync('高频事件发布', 10000, () => {
    eventBus.publish('highfreq.event', { data: 'test' });
  });

  // 性能阈值验证
  benchmark.compare({
    '文档处理流程 (带缓存)': 50,    // < 50ms
    '批量缓存查询 (100条)': 100,    // < 100ms
    '高频事件发布': 1               // < 1ms
  });

  // 清理
  await cache.clear();
  eventBus.clear();

  return benchmark;
}

// ============================================================================
// 运行所有基准测试
// ============================================================================

export async function runAllBenchmarks() {
  console.log('\n' + '🚀'.repeat(30));
  console.log('🎯 基础设施服务性能基准测试');
  console.log('🚀'.repeat(30));

  const startTime = Date.now();

  try {
    await benchmarkCacheService();
    await benchmarkEventBus();
    await benchmarkRetryService();
    await benchmarkIntegrated();

    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    console.log('\n' + '='.repeat(60));
    console.log(`✅ 所有基准测试完成！总耗时: ${totalDuration}ms`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ 基准测试失败:', error);
    throw error;
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runAllBenchmarks();
}
