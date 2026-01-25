/**
 * 性能测试框架
 * 测试系统性能并识别瓶颈
 *
 * 功能：
 * - 运行性能测试
 * - 运行负载测试
 * - 运行压力测试
 * - 生成性能报告
 */

import {
  PerformanceTest,
  PerformanceTestResult,
  LoadTestScenario,
  LoadTestResult,
  StressTestScenario,
  StressTestResult,
  PerformanceReport
} from './types';

// ============================================================
// 性能测试套件核心类
// ============================================================

export class PerformanceTestSuite {
  private results: PerformanceTestResult[] = [];
  private loadResults: LoadTestResult[] = [];
  private stressResults: StressTestResult[] = [];

  // ============================================================
  // 性能测试
  // ============================================================

  /**
   * 运行性能测试
   */
  async runPerformanceTest(test: PerformanceTest): Promise<PerformanceTestResult> {
    console.log('');
    console.log(`⚡ 性能测试: ${test.name}`);
    console.log(`   迭代次数: ${test.benchmark.iterations}`);
    console.log(`   预热次数: ${test.benchmark.warmupIterations}`);
    console.log(`   并发数: ${test.benchmark.concurrency}`);
    console.log('');

    const durations: number[] = [];

    // 预热
    console.log('🔥 预热中...');
    for (let i = 0; i < test.benchmark.warmupIterations; i++) {
      await test.test();
    }
    console.log('✓ 预热完成');
    console.log('');

    // 正式测试
    console.log('📊 执行测试...');

    const startTime = Date.now();
    const memoryBefore = process.memoryUsage().heapUsed;

    for (let i = 0; i < test.benchmark.iterations; i++) {
      const iterationStart = Date.now();
      await test.test();
      const iterationDuration = Date.now() - iterationStart;
      durations.push(iterationDuration);

      if ((i + 1) % Math.floor(test.benchmark.iterations / 10) === 0) {
        console.log(`   进度: ${i + 1}/${test.benchmark.iterations}`);
      }
    }

    const endTime = Date.now();
    const memoryAfter = process.memoryUsage().heapUsed;

    console.log('✓ 测试完成');
    console.log('');

    // 计算统计数据
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);
    const sortedDurations = durations.sort((a, b) => a - b);

    const percentiles = {
      p50: sortedDurations[Math.floor(sortedDurations.length * 0.5)],
      p90: sortedDurations[Math.floor(sortedDurations.length * 0.9)],
      p95: sortedDurations[Math.floor(sortedDurations.length * 0.95)],
      p99: sortedDurations[Math.floor(sortedDurations.length * 0.99)]
    };

    const totalDuration = endTime - startTime;
    const throughput = (test.benchmark.iterations / totalDuration) * 1000; // 操作/秒

    // 检查阈值
    const thresholdViolations: string[] = [];

    if (avgDuration > test.thresholds.maxDuration) {
      thresholdViolations.push(`平均执行时间 (${avgDuration.toFixed(2)}ms) 超过阈值 (${test.thresholds.maxDuration}ms)`);
    }

    const memoryUsed = memoryAfter - memoryBefore;
    if (memoryUsed > test.thresholds.maxMemory) {
      thresholdViolations.push(`内存使用 (${(memoryUsed / 1024 / 1024).toFixed(2)}MB) 超过阈值 (${(test.thresholds.maxMemory / 1024 / 1024).toFixed(2)}MB)`);
    }

    if (test.thresholds.minThroughput && throughput < test.thresholds.minThroughput) {
      thresholdViolations.push(`吞吐量 (${throughput.toFixed(2)} ops/s) 低于阈值 (${test.thresholds.minThroughput} ops/s)`);
    }

    const result: PerformanceTestResult = {
      name: test.name,
      status: thresholdViolations.length === 0 ? 'passed' : 'failed',
      duration: totalDuration,
      avgDuration,
      minDuration,
      maxDuration,
      percentiles,
      memoryUsage: {
        used: memoryUsed,
        peak: memoryUsed // 简化处理
      },
      throughput,
      meetsThreshold: thresholdViolations.length === 0,
      thresholdViolations
    };

    this.results.push(result);

    // 打印结果
    this.printPerformanceResult(result);

    return result;
  }

  // ============================================================
  // 负载测试
  // ============================================================

  /**
   * 运行负载测试
   */
  async runLoadTest(scenario: LoadTestScenario): Promise<LoadTestResult> {
    console.log('');
    console.log(`🏋️ 负载测试: ${scenario.name}`);
    console.log(`   并发用户: ${scenario.load.concurrentUsers}`);
    console.log(`   请求速率: ${scenario.load.requestRate} 请求/秒`);
    console.log(`   持续时间: ${scenario.load.duration}秒`);
    console.log('');

    const timeSeries: LoadTestResult['timeSeries'] = [];
    const startTime = Date.now();

    let totalRequests = 0;
    let successfulRequests = 0;
    let failedRequests = 0;
    const responseTimes: number[] = [];

    // 执行负载测试
    const testDuration = scenario.load.duration * 1000;
    let elapsed = 0;

    while (elapsed < testDuration) {
      const iterationStart = Date.now();

      // 批量执行请求
      const batchSize = Math.ceil(scenario.load.requestRate / 10); // 每100ms
      const batchPromises: Promise<void>[] = [];

      for (let i = 0; i < batchSize; i++) {
        batchPromises.push(
          (async () => {
            const requestStart = Date.now();
            try {
              await scenario.test();
              const requestTime = Date.now() - requestStart;
              responseTimes.push(requestTime);
              successfulRequests++;
            } catch (error) {
              failedRequests++;
            }
            totalRequests++;
          })()
        );
      }

      await Promise.all(batchPromises);

      // 记录时间序列数据
      const now = Date.now();
      elapsed = now - startTime;

      const avgResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

      timeSeries.push({
        timestamp: now,
        responseTime: avgResponseTime,
        successRate: totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0,
        activeUsers: scenario.load.concurrentUsers
      });

      // 等待下一个时间间隔
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const totalDuration = Date.now() - startTime;
    const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;
    const errorRate = totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0;
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;
    const maxResponseTime = responseTimes.length > 0 ? Math.max(...responseTimes) : 0;
    const throughput = (totalRequests / totalDuration) * 1000;

    // 检查阈值
    const thresholdViolations: string[] = [];

    if (maxResponseTime > scenario.thresholds.maxResponseTime) {
      thresholdViolations.push(`最大响应时间 (${maxResponseTime.toFixed(2)}ms) 超过阈值 (${scenario.thresholds.maxResponseTime}ms)`);
    }

    if (successRate < scenario.thresholds.minSuccessRate) {
      thresholdViolations.push(`成功率 (${successRate.toFixed(1)}%) 低于阈值 (${scenario.thresholds.minSuccessRate}%)`);
    }

    if (errorRate > scenario.thresholds.maxErrorRate) {
      thresholdViolations.push(`错误率 (${errorRate.toFixed(1)}%) 超过阈值 (${scenario.thresholds.maxErrorRate}%)`);
    }

    const result: LoadTestResult = {
      name: scenario.name,
      status: thresholdViolations.length === 0 ? 'passed' : 'failed',
      duration: totalDuration,
      totalRequests,
      successfulRequests,
      failedRequests,
      successRate,
      errorRate,
      avgResponseTime,
      maxResponseTime,
      throughput,
      concurrentUsers: scenario.load.concurrentUsers,
      timeSeries
    };

    this.loadResults.push(result);

    // 打印结果
    this.printLoadResult(result);

    return result;
  }

  // ============================================================
  // 压力测试
  // ============================================================

  /**
   * 运行压力测试
   */
  async runStressTest(scenario: StressTestScenario): Promise<StressTestResult> {
    console.log('');
    console.log(`🔥 压力测试: ${scenario.name}`);
    console.log(`   初始负载: ${scenario.stress.initialLoad}`);
    console.log(`   负载增量: ${scenario.stress.loadIncrement}`);
    console.log(`   最大负载: ${scenario.stress.maxLoad}`);
    console.log('');

    const testData: StressTestResult['testData'] = [];
    let breakingPoint: StressTestResult['breakingPoint'] | null = null;
    let currentLoad = scenario.stress.initialLoad;

    while (currentLoad <= scenario.stress.maxLoad) {
      console.log(`   测试负载: ${currentLoad}`);

      const iterationStart = Date.now();
      const requestTimes: number[] = [];
      let successCount = 0;
      let failCount = 0;

      // 执行当前负载级别的测试
      const promises: Promise<void>[] = [];

      for (let i = 0; i < currentLoad; i++) {
        promises.push(
          (async () => {
            const start = Date.now();
            try {
              await scenario.test();
              const duration = Date.now() - start;
              requestTimes.push(duration);
              successCount++;
            } catch (error) {
              failCount++;
            }
          })()
        );
      }

      await Promise.all(promises);

      const iterationDuration = Date.now() - iterationStart;
      const avgResponseTime = requestTimes.length > 0
        ? requestTimes.reduce((a, b) => a + b, 0) / requestTimes.length
        : 0;
      const errorRate = (successCount + failCount) > 0
        ? (failCount / (successCount + failCount)) * 100
        : 0;
      const throughput = (successCount / iterationDuration) * 1000;

      testData.push({
        load: currentLoad,
        responseTime: avgResponseTime,
        errorRate,
        throughput
      });

      console.log(`     响应时间: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`     错误率: ${errorRate.toFixed(1)}%`);
      console.log(`     吞吐量: ${throughput.toFixed(2)} req/s`);

      // 检查是否达到断裂点
      if (errorRate > scenario.stress.failureThreshold) {
        breakingPoint = {
          load: currentLoad,
          reason: `错误率 (${errorRate.toFixed(1)}%) 超过阈值 (${scenario.stress.failureThreshold}%)`
        };
        console.log(`     ⚠️  达到断裂点`);
        break;
      }

      if (avgResponseTime > 5000) {
        breakingPoint = {
          load: currentLoad,
          reason: `响应时间 (${avgResponseTime.toFixed(2)}ms) 过长`
        };
        console.log(`     ⚠️  响应时间过长`);
        break;
      }

      // 等待间隔时间
      await new Promise(resolve => setTimeout(resolve, scenario.stress.incrementInterval * 1000));

      // 增加负载
      currentLoad += scenario.stress.loadIncrement;
    }

    console.log('');

    // 确定系统限制
    const systemLimits = {
      maxConcurrentUsers: breakingPoint?.load || scenario.stress.maxLoad,
      maxRequestsPerSecond: testData.length > 0
        ? Math.max(...testData.map(d => d.throughput))
        : 0,
      maxMemoryUsage: process.memoryUsage().heapUsed
    };

    const result: StressTestResult = {
      name: scenario.name,
      status: breakingPoint ? 'broken' : 'passed',
      breakingPoint: breakingPoint || {
        load: scenario.stress.maxLoad,
        reason: '达到最大负载未失败'
      },
      testData,
      systemLimits
    };

    this.stressResults.push(result);

    // 打印结果
    this.printStressResult(result);

    return result;
  }

  // ============================================================
  // 报告生成
  // ============================================================

  /**
   * 生成性能报告
   */
  generatePerformanceReport(): PerformanceReport {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.status === 'passed').length;
    const failedTests = this.results.filter(r => r.status === 'failed').length;

    const avgDuration = this.results.length > 0
      ? this.results.reduce((sum, r) => sum + r.avgDuration, 0) / this.results.length
      : 0;

    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    // 生成建议
    const recommendations = this.generateRecommendations();

    const report: PerformanceReport = {
      metadata: {
        title: 'ExcelMind AI 性能测试报告',
        generatedAt: new Date().toISOString(),
        project: 'ExcelMind AI',
        version: '1.0.0'
      },
      summary: {
        totalTests,
        passedTests,
        failedTests,
        avgDuration,
        totalDuration
      },
      results: this.results,
      loadResults: this.loadResults,
      stressResults: this.stressResults,
      recommendations
    };

    return report;
  }

  /**
   * 生成性能建议
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    // 分析性能测试结果
    const slowTests = this.results.filter(r => r.avgDuration > 1000);
    if (slowTests.length > 0) {
      recommendations.push(`有 ${slowTests.length} 个测试平均执行时间超过1秒，建议优化`);
      slowTests.forEach(test => {
        recommendations.push(`  - ${test.name}: ${test.avgDuration.toFixed(2)}ms`);
      });
    }

    // 分析内存使用
    const highMemoryTests = this.results.filter(r => r.memoryUsage.used > 10 * 1024 * 1024);
    if (highMemoryTests.length > 0) {
      recommendations.push(`有 ${highMemoryTests.length} 个测试内存使用超过10MB，建议检查内存泄漏`);
    }

    // 分析负载测试结果
    const failedLoadTests = this.loadResults.filter(r => r.status === 'failed');
    if (failedLoadTests.length > 0) {
      recommendations.push('负载测试显示系统在高并发下性能不足，建议进行性能优化');
    }

    // 分析压力测试结果
    const earlyBreakingPoints = this.stressResults.filter(r =>
      r.breakingPoint.load < r.systemLimits.maxConcurrentUsers * 0.5
    );
    if (earlyBreakingPoints.length > 0) {
      recommendations.push('系统在较低负载下出现性能退化，建议检查资源竞争和锁问题');
    }

    if (recommendations.length === 0) {
      recommendations.push('所有性能测试通过，系统性能表现良好');
    }

    return recommendations;
  }

  // ============================================================
  // 辅助方法
  // ============================================================

  /**
   * 打印性能测试结果
   */
  private printPerformanceResult(result: PerformanceTestResult): void {
    console.log('📊 性能测试结果:');
    console.log(`   状态: ${result.status === 'passed' ? '✅ 通过' : '❌ 失败'}`);
    console.log(`   总执行时间: ${result.duration}ms`);
    console.log(`   平均执行时间: ${result.avgDuration.toFixed(2)}ms`);
    console.log(`   最小执行时间: ${result.minDuration}ms`);
    console.log(`   最大执行时间: ${result.maxDuration}ms`);
    console.log(`   百分位数:`);
    console.log(`     P50: ${result.percentiles.p50.toFixed(2)}ms`);
    console.log(`     P90: ${result.percentiles.p90.toFixed(2)}ms`);
    console.log(`     P95: ${result.percentiles.p95.toFixed(2)}ms`);
    console.log(`     P99: ${result.percentiles.p99.toFixed(2)}ms`);
    console.log(`   吞吐量: ${result.throughput.toFixed(2)} ops/s`);
    console.log(`   内存使用: ${(result.memoryUsage.used / 1024 / 1024).toFixed(2)}MB`);

    if (result.thresholdViolations.length > 0) {
      console.log('');
      console.log('   ⚠️  阈值违规:');
      result.thresholdViolations.forEach(violation => {
        console.log(`     - ${violation}`);
      });
    }

    console.log('');
  }

  /**
   * 打印负载测试结果
   */
  private printLoadResult(result: LoadTestResult): void {
    console.log('📊 负载测试结果:');
    console.log(`   状态: ${result.status === 'passed' ? '✅ 通过' : '❌ 失败'}`);
    console.log(`   总请求数: ${result.totalRequests}`);
    console.log(`   成功请求: ${result.successfulRequests}`);
    console.log(`   失败请求: ${result.failedRequests}`);
    console.log(`   成功率: ${result.successRate.toFixed(1)}%`);
    console.log(`   错误率: ${result.errorRate.toFixed(1)}%`);
    console.log(`   平均响应时间: ${result.avgResponseTime.toFixed(2)}ms`);
    console.log(`   最大响应时间: ${result.maxResponseTime.toFixed(2)}ms`);
    console.log(`   吞吐量: ${result.throughput.toFixed(2)} req/s`);
    console.log('');
  }

  /**
   * 打印压力测试结果
   */
  private printStressResult(result: StressTestResult): void {
    console.log('📊 压力测试结果:');
    console.log(`   状态: ${result.status === 'passed' ? '✅ 通过' : result.status === 'failed' ? '❌ 失败' : '⚠️  断裂'}`);
    console.log(`   断裂点:`);
    console.log(`     负载: ${result.breakingPoint.load}`);
    console.log(`     原因: ${result.breakingPoint.reason}`);
    console.log(`   系统限制:`);
    console.log(`     最大并发用户: ${result.systemLimits.maxConcurrentUsers}`);
    console.log(`     最大请求/秒: ${result.systemLimits.maxRequestsPerSecond.toFixed(2)}`);
    console.log(`     最大内存使用: ${(result.systemLimits.maxMemoryUsage / 1024 / 1024).toFixed(2)}MB`);
    console.log('');
  }
}

// ============================================================
// 预定义的性能测试
// ============================================================

export const createCommonPerformanceTests = (): PerformanceTest[] => {
  return [
    {
      name: '数据查询性能',
      test: async () => {
        // 模拟数据查询
        const data = new Array(1000).fill(0).map((_, i) => ({
          id: i,
          name: `Item ${i}`,
          value: Math.random() * 1000
        }));

        const result = data.filter(item => item.value > 500);
        return result;
      },
      benchmark: {
        iterations: 100,
        warmupIterations: 10,
        concurrency: 1
      },
      thresholds: {
        maxDuration: 50,
        maxMemory: 1024 * 1024,
        minThroughput: 10
      }
    },
    {
      name: '缓存读写性能',
      test: async () => {
        const cache = new Map<string, any>();

        // 写入
        for (let i = 0; i < 100; i++) {
          cache.set(`key${i}`, { value: i, timestamp: Date.now() });
        }

        // 读取
        for (let i = 0; i < 100; i++) {
          cache.get(`key${i}`);
        }
      },
      benchmark: {
        iterations: 100,
        warmupIterations: 10,
        concurrency: 1
      },
      thresholds: {
        maxDuration: 10,
        maxMemory: 512 * 1024
      }
    },
    {
      name: 'JSON序列化性能',
      test: async () => {
        const data = {
          users: new Array(100).fill(0).map((_, i) => ({
            id: i,
            name: `User ${i}`,
            email: `user${i}@example.com`,
            metadata: {
              created: Date.now(),
              updated: Date.now()
            }
          }))
        };

        // 序列化
        const json = JSON.stringify(data);

        // 反序列化
        JSON.parse(json);
      },
      benchmark: {
        iterations: 50,
        warmupIterations: 5,
        concurrency: 1
      },
      thresholds: {
        maxDuration: 20,
        maxMemory: 2 * 1024 * 1024
      }
    }
  ];
};

// ============================================================
// 导出
// ============================================================

export default PerformanceTestSuite;
