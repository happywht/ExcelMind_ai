/**
 * 回归测试套件
 * 确保新代码变更不会破坏现有功能
 *
 * 功能：
 * - 添加回归测试
 * - 运行回归测试
 * - 与基线结果比较
 * - 性能退化检测
 */

import fs from 'fs';
import path from 'path';
import {
  RegressionTest,
  RegressionTestResult,
  BaselineResult,
  ComparisonReport,
  ComparisonDiff
} from './types';

// ============================================================
// 回归测试套件核心类
// ============================================================

export class RegressionTestSuite {
  private tests: Map<string, RegressionTest> = new Map();
  private results: RegressionTestResult[] = [];
  private readonly baselinePath: string;

  constructor(baselinePath?: string) {
    this.baselinePath = baselinePath || '.test-results/baseline.json';
  }

  // ============================================================
  // 测试管理
  // ============================================================

  /**
   * 添加回归测试
   */
  addRegressionTest(test: RegressionTest): void {
    this.tests.set(test.name, test);
    console.log(`✓ 已添加回归测试: ${test.name} (${test.priority})`);
  }

  /**
   * 批量添加测试
   */
  addTests(tests: RegressionTest[]): void {
    tests.forEach(test => this.addRegressionTest(test));
  }

  /**
   * 移除测试
   */
  removeTest(name: string): boolean {
    return this.tests.delete(name);
  }

  /**
   * 获取测试
   */
  getTest(name: string): RegressionTest | undefined {
    return this.tests.get(name);
  }

  // ============================================================
  // 测试执行
  // ============================================================

  /**
   * 运行所有回归测试
   */
  async runAll(): Promise<RegressionTestResult[]> {
    console.log('');
    console.log('🔄 运行回归测试套件...');
    console.log(`   测试数量: ${this.tests.size}`);
    console.log('');

    this.results = [];

    // 加载基线
    const baseline = this.loadBaseline();

    if (!baseline) {
      console.warn('⚠️  未找到基线结果，将创建新基线');
    }

    const testEntries = Array.from(this.tests.entries());

    for (const [name, test] of testEntries) {
      console.log(`▶️  测试: ${name} (${test.module})`);

      try {
        const result = await this.runTest(test, baseline);
        this.results.push(result);

        const statusIcon = result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⚠️';
        console.log(`   ${statusIcon} ${result.status}`);

        if (result.diff.performance.durationChangePercent > 20) {
          console.log(`   ⚠️  性能变化: +${result.diff.performance.durationChangePercent.toFixed(1)}%`);
        }

      } catch (error: any) {
        console.error(`   ❌ 错误: ${error.message}`);
      }
    }

    // 生成比较报告
    const report = this.generateComparisonReport(baseline);
    this.printReport(report);

    return this.results;
  }

  /**
   * 运行特定模块的回归测试
   */
  async runModuleTests(moduleName: string): Promise<RegressionTestResult[]> {
    console.log('');
    console.log(`🔄 运行模块回归测试: ${moduleName}`);
    console.log('');

    const moduleTests = Array.from(this.tests.values())
      .filter(test => test.module === moduleName);

    if (moduleTests.length === 0) {
      console.log(`⚠️  未找到模块 "${moduleName}" 的回归测试`);
      return [];
    }

    const results: RegressionTestResult[] = [];
    const baseline = this.loadBaseline();

    for (const test of moduleTests) {
      console.log(`▶️  测试: ${test.name}`);

      try {
        const result = await this.runTest(test, baseline);
        results.push(result);
      } catch (error: any) {
        console.error(`   ❌ 错误: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * 运行单个测试
   */
  private async runTest(
    test: RegressionTest,
    baseline?: Map<string, BaselineResult>
  ): Promise<RegressionTestResult> {
    const startTime = Date.now();
    const memoryBefore = process.memoryUsage().heapUsed;

    try {
      // 执行测试
      await test.test();

      const duration = Date.now() - startTime;
      const memoryAfter = process.memoryUsage().heapUsed;

      // 构建当前结果
      const current: BaselineResult = {
        data: null, // 可以在测试中收集数据
        performance: {
          duration,
          memory: memoryAfter - memoryBefore
        },
        timestamp: Date.now(),
        version: this.getCurrentVersion()
      };

      // 与基线比较
      const baselineResult = baseline?.get(test.name);
      const diff = baselineResult
        ? this.compareResults(current, baselineResult)
        : this.createEmptyDiff();

      // 检查是否在容忍范围内
      const tolerance = test.tolerance ?? 0.1; // 默认10%容忍度
      const withinTolerance = this.checkTolerance(diff, tolerance);

      return {
        name: test.name,
        module: test.module,
        status: withinTolerance ? 'passed' : 'degraded',
        current,
        diff,
        withinTolerance
      };

    } catch (error: any) {
      return {
        name: test.name,
        module: test.module,
        status: 'failed',
        current: {
          data: null,
          performance: { duration: 0, memory: 0 },
          timestamp: Date.now(),
          version: this.getCurrentVersion()
        },
        diff: this.createEmptyDiff(),
        withinTolerance: false
      };
    }
  }

  // ============================================================
  // 基线比较
  // ============================================================

  /**
   * 比较与基线结果的差异
   */
  compareWithBaseline(
    current: BaselineResult,
    baseline: BaselineResult
  ): ComparisonDiff {
    return {
      data: {
        passed: true, // 可以实现深度比较
        differences: []
      },
      performance: {
        durationChange: current.performance.duration - baseline.performance.duration,
        durationChangePercent: ((current.performance.duration - baseline.performance.duration) / baseline.performance.duration) * 100,
        memoryChange: current.performance.memory - baseline.performance.memory,
        memoryChangePercent: ((current.performance.memory - baseline.performance.memory) / baseline.performance.memory) * 100
      },
      passed: true
    };
  }

  /**
   * 比较两个结果
   */
  private compareResults(
    current: BaselineResult,
    baseline: BaselineResult
  ): ComparisonDiff {
    const durationChange = current.performance.duration - baseline.performance.duration;
    const durationChangePercent = baseline.performance.duration > 0
      ? (durationChange / baseline.performance.duration) * 100
      : 0;

    const memoryChange = current.performance.memory - baseline.performance.memory;
    const memoryChangePercent = baseline.performance.memory > 0
      ? (memoryChange / baseline.performance.memory) * 100
      : 0;

    return {
      data: {
        passed: true,
        differences: []
      },
      performance: {
        durationChange,
        durationChangePercent,
        memoryChange,
        memoryChangePercent
      },
      passed: true
    };
  }

  /**
   * 检查是否在容忍范围内
   */
  private checkTolerance(diff: ComparisonDiff, tolerance: number): boolean {
    const durationExceeded = Math.abs(diff.performance.durationChangePercent) > tolerance * 100;
    const memoryExceeded = Math.abs(diff.performance.memoryChangePercent) > tolerance * 100;

    return !durationExceeded && !memoryExceeded;
  }

  /**
   * 创建空的差异对象
   */
  private createEmptyDiff(): ComparisonDiff {
    return {
      data: { passed: true, differences: [] },
      performance: {
        durationChange: 0,
        durationChangePercent: 0,
        memoryChange: 0,
        memoryChangePercent: 0
      },
      passed: true
    };
  }

  // ============================================================
  // 报告生成
  // ============================================================

  /**
   * 生成比较报告
   */
  generateComparisonReport(baseline?: Map<string, BaselineResult>): ComparisonReport {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.status === 'passed').length;
    const failedTests = this.results.filter(r => r.status === 'failed').length;
    const degradedTests = this.results.filter(r => r.status === 'degraded').length;

    let summary = '';

    if (degradedTests > 0) {
      summary = `检测到 ${degradedTests} 个性能退化`;
    } else if (failedTests > 0) {
      summary = `${failedTests} 个测试失败`;
    } else {
      summary = '所有测试通过，无性能退化';
    }

    return {
      timestamp: Date.now(),
      currentVersion: this.getCurrentVersion(),
      baselineVersion: baseline?.values().next().value?.version || 'unknown',
      totalTests,
      passedTests,
      failedTests,
      degradedTests,
      differences: this.results,
      summary
    };
  }

  /**
   * 打印报告
   */
  private printReport(report: ComparisonReport): void {
    console.log('');
    console.log('═'.repeat(60));
    console.log('📊 回归测试比较报告');
    console.log('═'.repeat(60));
    console.log(`当前版本: ${report.currentVersion}`);
    console.log(`基线版本: ${report.baselineVersion}`);
    console.log('');
    console.log(`总测试数: ${report.totalTests}`);
    console.log(`✅ 通过: ${report.passedTests}`);
    console.log(`❌ 失败: ${report.failedTests}`);
    console.log(`⚠️  性能退化: ${report.degradedTests}`);
    console.log('');
    console.log(`摘要: ${report.summary}`);
    console.log('═'.repeat(60));
    console.log('');
  }

  // ============================================================
  // 基线管理
  // ============================================================

  /**
   * 加载基线结果
   */
  private loadBaseline(): Map<string, BaselineResult> | undefined {
    try {
      if (fs.existsSync(this.baselinePath)) {
        const data = fs.readFileSync(this.baselinePath, 'utf-8');
        const baselineData = JSON.parse(data);

        const baseline = new Map<string, BaselineResult>();

        for (const [key, value] of Object.entries(baselineData)) {
          baseline.set(key, value as BaselineResult);
        }

        console.log(`✓ 已加载基线结果: ${baseline.size} 条`);
        return baseline;
      }
    } catch (error) {
      console.error('加载基线失败:', error);
    }

    return undefined;
  }

  /**
   * 保存基线结果
   */
  saveBaseline(results: RegressionTestResult[]): void {
    try {
      const baselineData: Record<string, BaselineResult> = {};

      for (const result of results) {
        baselineData[result.name] = result.current;
      }

      const dir = path.dirname(this.baselinePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(this.baselinePath, JSON.stringify(baselineData, null, 2));
      console.log(`✓ 已保存基线结果: ${results.length} 条`);
    } catch (error) {
      console.error('保存基线失败:', error);
    }
  }

  // ============================================================
  // 辅助方法
  // ============================================================

  /**
   * 获取当前版本
   */
  private getCurrentVersion(): string {
    try {
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        return packageJson.version || '1.0.0';
      }
    } catch (error) {
      // 忽略错误
    }

    return '1.0.0';
  }
}

// ============================================================
// 预定义的回归测试
// ============================================================

export const createCommonRegressionTests = (): RegressionTest[] => {
  return [
    {
      name: '数据查询引擎性能',
      module: 'DataQueryEngine',
      priority: 'high',
      baseline: {
        data: null,
        performance: {
          duration: 100, // 基线: 100ms
          memory: 1024 * 1024 // 基线: 1MB
        },
        timestamp: Date.now(),
        version: '1.0.0'
      },
      tolerance: 0.2, // 20%容忍度
      test: async () => {
        // 模拟数据查询测试
        const startTime = Date.now();
        await new Promise(resolve => setTimeout(resolve, 100));
        const duration = Date.now() - startTime;

        if (duration > 150) {
          throw new Error('查询性能超过150ms');
        }
      }
    },
    {
      name: '缓存服务性能',
      module: 'CacheService',
      priority: 'high',
      baseline: {
        data: null,
        performance: {
          duration: 10, // 基线: 10ms
          memory: 512 * 1024 // 基线: 512KB
        },
        timestamp: Date.now(),
        version: '1.0.0'
      },
      tolerance: 0.15,
      test: async () => {
        // 模拟缓存操作测试
        const cache = new Map();
        cache.set('test', { value: 'data', timestamp: Date.now() });
        const result = cache.get('test');

        if (!result || result.value !== 'data') {
          throw new Error('缓存读取失败');
        }
      }
    },
    {
      name: '文档生成性能',
      module: 'DocumentService',
      priority: 'medium',
      baseline: {
        data: null,
        performance: {
          duration: 500, // 基线: 500ms
          memory: 5 * 1024 * 1024 // 基线: 5MB
        },
        timestamp: Date.now(),
        version: '1.0.0'
      },
      tolerance: 0.25,
      test: async () => {
        // 模拟文档生成测试
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    },
    {
      name: 'AI解析性能',
      module: 'AIService',
      priority: 'high',
      baseline: {
        data: null,
        performance: {
          duration: 3000, // 基线: 3s
          memory: 10 * 1024 * 1024 // 基线: 10MB
        },
        timestamp: Date.now(),
        version: '1.0.0'
      },
      tolerance: 0.2,
      test: async () => {
        // 模拟AI解析测试
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    },
    {
      name: 'Excel数据加载性能',
      module: 'ExcelService',
      priority: 'medium',
      baseline: {
        data: null,
        performance: {
          duration: 200, // 基线: 200ms
          memory: 2 * 1024 * 1024 // 基线: 2MB
        },
        timestamp: Date.now(),
        version: '1.0.0'
      },
      tolerance: 0.3,
      test: async () => {
        // 模拟Excel加载测试
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
  ];
};

// ============================================================
// 导出
// ============================================================

export default RegressionTestSuite;
