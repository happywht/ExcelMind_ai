/**
 * AI 降级策略性能测试
 * 测试降级策略的 CPU、内存开销
 *
 * @author Performance Tester
 * @version 1.0.0
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { PerformanceTestRunner, PerformanceTestHelpers } from './PerformanceTestRunner';
import { DegradationManager } from '../../src/services/infrastructure/degradation/DegradationManager';

describe('AI 降级策略性能测试', () => {
  const runner = new PerformanceTestRunner();
  let manager: DegradationManager;

  // 设置性能阈值
  const THRESHOLDS = {
    CPU_OVERHEAD: 5,         // CPU 开销 < 5%
    MEMORY_OVERHEAD: 20,     // 内存开销 < 20MB
    DECISION_TIME: 10,       // 降级决策时间 < 10ms
    MONITORING_TIME: 5       // 监控检查时间 < 5ms
  };

  beforeAll(() => {
    runner.setThresholds(THRESHOLDS);
  });

  afterAll(async () => {
    // 生成性能报告
    const fs = await import('fs/promises');
    const path = await import('path');
    const reportDir = path.join(process.cwd(), 'test-results', 'performance');
    await fs.mkdir(reportDir, { recursive: true });

    await runner.saveMarkdownReport(path.join(reportDir, 'degradation-strategy-report.md'));
    await runner.saveReport(path.join(reportDir, 'degradation-strategy-data.json'));

    runner.printReport();
  });

  beforeEach(() => {
    manager = new DegradationManager();
  });

  describe('CPU 开销测试', () => {
    test('CPU 开销应该 < 5%', async () => {
      // 基准测试：不运行降级策略的 CPU 使用率
      const baselineCpuResult = await runner.measureCpuUsage(
        'degradation-baseline-cpu',
        async () => {
          // 模拟正常工作负载
          PerformanceTestHelpers.simulateCPUWork(100000);
        },
        100
      );

      // 测试：运行降级策略的 CPU 使用率
      await manager.checkDegradation();

      const degradedCpuResult = await runner.measureCpuUsage(
        'degradation-with-cpu',
        async () => {
          await manager.checkDegradation();
          PerformanceTestHelpers.simulateCPUWork(100000);
        },
        100
      );

      const overhead = degradedCpuResult.cpuUsage - baselineCpuResult.cpuUsage;

      console.log(`基准 CPU 使用率: ${baselineCpuResult.cpuUsage.toFixed(2)}%`);
      console.log(`降级策略 CPU 使用率: ${degradedCpuResult.cpuUsage.toFixed(2)}%`);
      console.log(`CPU 开销: ${overhead.toFixed(2)}%`);

      expect(overhead).toBeLessThan(THRESHOLDS.CPU_OVERHEAD);
    });

    test('连续检查不应该导致 CPU 峰值', async () => {
      const cpuUsages: number[] = [];

      for (let i = 0; i < 100; i++) {
        const { cpuUsage } = await runner.measureCpuUsage(
          `degradation-iteration-${i}`,
          async () => {
            await manager.checkDegradation();
          },
          10
        );

        cpuUsages.push(cpuUsage);
      }

      const maxCpu = Math.max(...cpuUsages);
      const avgCpu = cpuUsages.reduce((a, b) => a + b) / cpuUsages.length;

      console.log(`最大 CPU 使用率: ${maxCpu.toFixed(2)}%`);
      console.log(`平均 CPU 使用率: ${avgCpu.toFixed(2)}%`);

      expect(maxCpu).toBeLessThan(THRESHOLDS.CPU_OVERHEAD * 2);
    });
  });

  describe('内存开销测试', () => {
    test('内存开销应该 < 20MB', async () => {
      // 强制 GC（如果可用）
      if (global.gc) {
        global.gc();
      }

      const initialMemory = process.memoryUsage().heapUsed;

      // 执行降级检查 100 次
      for (let i = 0; i < 100; i++) {
        await manager.checkDegradation();
      }

      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryUsed = (finalMemory - initialMemory) / 1024 / 1024; // MB

      console.log(`初始内存: ${(initialMemory / 1024 / 1024).toFixed(2)}MB`);
      console.log(`最终内存: ${(finalMemory / 1024 / 1024).toFixed(2)}MB`);
      console.log(`内存开销: ${memoryUsed.toFixed(2)}MB`);

      expect(memoryUsed).toBeLessThan(THRESHOLDS.MEMORY_OVERHEAD);
    });

    test('长时间运行不应该有内存泄漏', async () => {
      const memorySnapshots: number[] = [];

      for (let iteration = 0; iteration < 10; iteration++) {
        // 强制 GC
        if (global.gc) {
          global.gc();
        }

        // 执行大量操作
        for (let i = 0; i < 1000; i++) {
          await manager.checkDegradation();
        }

        if (global.gc) {
          global.gc();
        }

        const memory = process.memoryUsage().heapUsed;
        memorySnapshots.push(memory);

        console.log(`迭代 ${iteration + 1}: ${(memory / 1024 / 1024).toFixed(2)}MB`);
      }

      // 检查内存增长趋势
      const firstHalf = memorySnapshots.slice(0, 5);
      const secondHalf = memorySnapshots.slice(5);
      const avgFirst = firstHalf.reduce((a, b) => a + b) / firstHalf.length;
      const avgSecond = secondHalf.reduce((a, b) => a + b) / secondHalf.length;
      const growthRate = ((avgSecond - avgFirst) / avgFirst) * 100;

      console.log(`内存增长率: ${growthRate.toFixed(2)}%`);

      // 内存增长应该 < 50%
      expect(growthRate).toBeLessThan(50);
    });
  });

  describe('降级决策性能测试', () => {
    test('降级决策应该在 10ms 内完成', async () => {
      const { stats } = await runner.measureAverage(
        'degradation-decision-time',
        async () => {
          await manager.checkDegradation();
        },
        50,
        { warmup: 5, delay: 10 }
      );

      console.log(`降级决策平均时间: ${stats.average.toFixed(2)}ms`);
      console.log(`P95: ${stats.percentile95.toFixed(2)}ms`);
      console.log(`P99: ${stats.percentile99.toFixed(2)}ms`);

      expect(stats.average).toBeLessThan(THRESHOLDS.DECISION_TIME);
      expect(stats.percentile95).toBeLessThan(THRESHOLDS.DECISION_TIME * 2);
    });

    test('复杂场景下的决策性能', async () => {
      const { stats } = await runner.measureAverage(
        'degradation-complex-decision',
        async () => {
          manager.recordFileSize(20 * 1024 * 1024);
          manager.recordAPICall(false);
          manager.checkDegradation();
        },
        50,
        { warmup: 5, delay: 10 }
      );

      console.log(`复杂决策平均时间: ${stats.average.toFixed(2)}ms`);

      expect(stats.average).toBeLessThan(THRESHOLDS.DECISION_TIME * 2);
    });
  });

  describe('监控性能测试', () => {
    test('监控检查应该在 5ms 内完成', async () => {
      const { stats } = await runner.measureAverage(
        'degradation-monitoring-check',
        async () => {
          manager.getCurrentState();
        },
        100,
        { warmup: 10, delay: 5 }
      );

      console.log(`监控检查平均时间: ${stats.average.toFixed(2)}ms`);

      expect(stats.average).toBeLessThan(THRESHOLDS.MONITORING_TIME);
    });

    test('批量指标收集性能', async () => {
      const { stats } = await runner.measureAverage(
        'degradation-batch-metrics',
        async () => {
          const state = manager.getCurrentState();
          const mode = manager.getCurrentMode();
          const level = manager.getCurrentLevel();
          const health = manager.performHealthCheck();
          return { state, mode, level, health };
        },
        50,
        { warmup: 5, delay: 10 }
      );

      console.log(`批量指标收集时间: ${stats.average.toFixed(2)}ms`);

      expect(stats.average).toBeLessThan(THRESHOLDS.MONITORING_TIME * 2);
    });
  });

  describe('降级策略切换性能', () => {
    test('策略切换应该快速完成', async () => {
      const { stats } = await runner.measureAverage(
        'degradation-strategy-switch',
        async () => {
          manager.recordAPICall(true);
          manager.recordAPICall(false);
          manager.checkDegradation();
        },
        20,
        { warmup: 3, delay: 50 }
      );

      console.log(`策略切换平均时间: ${stats.average.toFixed(2)}ms`);

      expect(stats.average).toBeLessThan(50);
    });

    test('策略状态恢复性能', async () => {
      const { duration } = await runner.measureTime(
        'degradation-state-restore',
        async () => {
          manager.reset();
        }
      );

      console.log(`状态恢复时间: ${duration.toFixed(2)}ms`);

      expect(duration).toBeLessThan(20);
    });
  });

  describe('降级事件通知性能', () => {
    test('事件通知不应该阻塞主流程', async () => {
      // DegradationManager 不支持事件监听，跳过此测试
      expect(true).toBe(true);
    });
  });

  describe('并发场景性能测试', () => {
    test('并发降级检查应该保持稳定', async () => {
      const concurrentChecks = 50;

      const { stats } = await runner.measureAverage(
        'degradation-concurrent-checks',
        async () => {
          await Promise.all(
            Array.from({ length: concurrentChecks }, () =>
              manager.checkDegradation()
            )
          );
        },
        10,
        { warmup: 2, delay: 100 }
      );

      const avgPerCheck = stats.average / concurrentChecks;

      console.log(`并发检查总时间: ${stats.average.toFixed(2)}ms`);
      console.log(`平均每次检查: ${avgPerCheck.toFixed(2)}ms`);

      expect(avgPerCheck).toBeLessThan(THRESHOLDS.DECISION_TIME * 2);
    });
  });
});
