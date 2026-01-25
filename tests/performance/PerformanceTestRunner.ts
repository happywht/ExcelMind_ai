/**
 * 性能测试运行器
 * 用于执行性能基准测试并生成报告
 *
 * @author Performance Tester
 * @version 1.0.0
 */

export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface PerformanceTestResult {
  name: string;
  average: number;
  min: number;
  max: number;
  median: number;
  percentile95: number;
  percentile99: number;
  samples: number;
  standardDeviation: number;
  passed: boolean;
  threshold: number;
  metadata?: Record<string, any>;
}

export interface PerformanceReport {
  timestamp: Date;
  tests: PerformanceTestResult[];
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    overallScore: number;
  };
  systemInfo: {
    platform: string;
    arch: string;
    nodeVersion: string;
    cpuCount: number;
    totalMemory: number;
  };
  recommendations: string[];
}

/**
 * 性能测试运行器
 */
export class PerformanceTestRunner {
  private results: Map<string, number[]> = new Map();
  private metadata: Map<string, Record<string, any>> = new Map();
  private thresholds: Map<string, number> = new Map();

  /**
   * 测量单个操作的执行时间
   */
  async measureTime<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<{ result: T; duration: number }> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;

    this.recordResult(name, duration, metadata);
    return { result, duration };
  }

  /**
   * 测量同步操作的执行时间
   */
  measureTimeSync<T>(
    name: string,
    fn: () => T,
    metadata?: Record<string, any>
  ): { result: T; duration: number } {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;

    this.recordResult(name, duration, metadata);
    return { result, duration };
  }

  /**
   * 多次运行取平均值
   */
  async measureAverage<T>(
    name: string,
    fn: () => Promise<T>,
    iterations: number = 10,
    options?: {
      warmup?: number;
      delay?: number;
      metadata?: Record<string, any>;
    }
  ): Promise<{ result: T[]; average: number; stats: PerformanceTestResult }> {
    const { warmup = 2, delay = 0, metadata } = options || {};

    // 预热
    if (warmup > 0) {
      for (let i = 0; i < warmup; i++) {
        await fn();
      }
      // 给 GC 时间清理
      await this.sleep(100);
    }

    const durations: number[] = [];
    const results: T[] = [];

    // 正式测试
    for (let i = 0; i < iterations; i++) {
      const { result, duration } = await this.measureTime(name, fn, metadata);
      durations.push(duration);
      results.push(result);

      if (delay > 0) {
        await this.sleep(delay);
      }
    }

    const avg = durations.reduce((a, b) => a + b) / durations.length;
    const stats = this.calculateStats(name, durations, metadata);

    return { result: results, average: avg, stats };
  }

  /**
   * 测量内存使用
   */
  async measureMemory<T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<{ result: T; memoryUsed: number; memoryDelta: number }> {
    // 强制 GC（如果可用）
    if (global.gc) {
      global.gc();
    }

    const memoryBefore = process.memoryUsage().heapUsed;
    const result = await fn();

    if (global.gc) {
      global.gc();
    }

    const memoryAfter = process.memoryUsage().heapUsed;
    const memoryUsed = memoryAfter - memoryBefore;

    return {
      result,
      memoryUsed,
      memoryDelta: (memoryAfter - memoryBefore) / 1024 / 1024 // MB
    };
  }

  /**
   * 测量 CPU 使用率
   */
  async measureCpuUsage<T>(
    name: string,
    fn: () => Promise<T>,
    duration: number = 1000
  ): Promise<{ result: T; cpuUsage: number }> {
    const cpuStart = process.cpuUsage();

    // 运行测试
    const result = await fn();

    const cpuEnd = process.cpuUsage(cpuStart);
    const totalCpuTime = cpuEnd.user + cpuEnd.system;
    const cpuUsage = (totalCpuTime / (duration * 1000)) * 100;

    return { result, cpuUsage };
  }

  /**
   * 设置性能阈值
   */
  setThreshold(name: string, threshold: number): void {
    this.thresholds.set(name, threshold);
  }

  /**
   * 批量设置阈值
   */
  setThresholds(thresholds: Record<string, number>): void {
    Object.entries(thresholds).forEach(([name, threshold]) => {
      this.setThreshold(name, threshold);
    });
  }

  /**
   * 记录测试结果
   */
  private recordResult(
    name: string,
    duration: number,
    metadata?: Record<string, any>
  ): void {
    if (!this.results.has(name)) {
      this.results.set(name, []);
    }
    this.results.get(name)!.push(duration);

    if (metadata) {
      this.metadata.set(name, metadata);
    }
  }

  /**
   * 计算统计数据
   */
  private calculateStats(
    name: string,
    durations: number[],
    metadata?: Record<string, any>
  ): PerformanceTestResult {
    const sorted = [...durations].sort((a, b) => a - b);
    const sum = durations.reduce((a, b) => a + b, 0);
    const avg = sum / durations.length;
    const variance = durations.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / durations.length;
    const stdDev = Math.sqrt(variance);

    const threshold = this.thresholds.get(name) || 0;
    const passed = threshold === 0 || avg <= threshold;

    return {
      name,
      average: avg,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      median: sorted[Math.floor(sorted.length / 2)],
      percentile95: sorted[Math.floor(sorted.length * 0.95)],
      percentile99: sorted[Math.floor(sorted.length * 0.99)],
      samples: durations.length,
      standardDeviation: stdDev,
      passed,
      threshold,
      metadata: metadata || this.metadata.get(name)
    };
  }

  /**
   * 获取测试结果
   */
  getResult(name: string): PerformanceTestResult | undefined {
    const durations = this.results.get(name);
    if (!durations || durations.length === 0) {
      return undefined;
    }
    return this.calculateStats(name, durations);
  }

  /**
   * 获取所有结果
   */
  getAllResults(): PerformanceTestResult[] {
    const results: PerformanceTestResult[] = [];
    for (const [name, durations] of this.results.entries()) {
      if (durations.length > 0) {
        results.push(this.calculateStats(name, durations));
      }
    }
    return results;
  }

  /**
   * 生成性能报告
   */
  generateReport(): PerformanceReport {
    const results = this.getAllResults();
    const passedTests = results.filter(r => r.passed).length;
    const failedTests = results.length - passedTests;

    // 计算总体评分
    const overallScore = results.length > 0
      ? (passedTests / results.length) * 100
      : 0;

    // 生成优化建议
    const recommendations = this.generateRecommendations(results);

    return {
      timestamp: new Date(),
      tests: results,
      summary: {
        totalTests: results.length,
        passedTests,
        failedTests,
        overallScore
      },
      systemInfo: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        cpuCount: require('os').cpus().length,
        totalMemory: require('os').totalmem()
      },
      recommendations
    };
  }

  /**
   * 生成优化建议
   */
  private generateRecommendations(results: PerformanceTestResult[]): string[] {
    const recommendations: string[] = [];

    // 识别失败的测试
    const failedTests = results.filter(r => !r.passed);
    if (failedTests.length > 0) {
      recommendations.push(`有 ${failedTests.length} 个测试未达到性能目标:`);
      failedTests.forEach(test => {
        recommendations.push(
          `  - ${test.name}: 平均 ${test.average.toFixed(2)}ms (目标: ${test.threshold}ms)`
        );
      });
    }

    // 识别高变异性的测试
    const variableTests = results.filter(r =>
      r.standardDeviation / r.average > 0.3
    );
    if (variableTests.length > 0) {
      recommendations.push('\n以下测试存在较高性能波动:');
      variableTests.forEach(test => {
        const cv = (test.standardDeviation / test.average * 100).toFixed(1);
        recommendations.push(
          `  - ${test.name}: 变异系数 ${cv}%`
        );
      });
    }

    // 识别慢测试
    const slowTests = results.filter(r => r.average > 1000);
    if (slowTests.length > 0) {
      recommendations.push('\n以下测试执行时间较长，建议优化:');
      slowTests.forEach(test => {
        recommendations.push(
          `  - ${test.name}: 平均 ${test.average.toFixed(2)}ms`
        );
      });
    }

    if (recommendations.length === 0) {
      recommendations.push('所有性能测试通过！系统性能表现良好。');
    }

    return recommendations;
  }

  /**
   * 清除所有结果
   */
  clear(): void {
    this.results.clear();
    this.metadata.clear();
  }

  /**
   * 保存报告到文件
   */
  async saveReport(filepath: string): Promise<void> {
    const report = this.generateReport();
    const fs = await import('fs/promises');
    await fs.writeFile(filepath, JSON.stringify(report, null, 2), 'utf-8');
  }

  /**
   * 保存 Markdown 报告
   */
  async saveMarkdownReport(filepath: string): Promise<void> {
    const report = this.generateReport();
    const markdown = this.formatMarkdownReport(report);
    const fs = await import('fs/promises');
    await fs.writeFile(filepath, markdown, 'utf-8');
  }

  /**
   * 格式化 Markdown 报告
   */
  private formatMarkdownReport(report: PerformanceReport): string {
    let md = '# 性能基准测试报告\n\n';
    md += `**测试时间**: ${report.timestamp.toISOString()}\n`;
    md += `**系统**: ${report.systemInfo.platform} ${report.systemInfo.arch}\n`;
    md += `**Node.js**: ${report.systemInfo.nodeVersion}\n`;
    md += `**CPU**: ${report.systemInfo.cpuCount} 核心\n`;
    md += `**内存**: ${(report.systemInfo.totalMemory / 1024 / 1024 / 1024).toFixed(2)} GB\n\n`;

    md += '## 测试摘要\n\n';
    md += `- **总测试数**: ${report.summary.totalTests}\n`;
    md += `- **通过**: ${report.summary.passedTests}\n`;
    md += `- **失败**: ${report.summary.failedTests}\n`;
    md += `- **总体评分**: ${report.summary.overallScore.toFixed(1)}%\n\n`;

    md += '## 测试结果\n\n';
    md += '| 测试名称 | 平均 (ms) | 最小 (ms) | 最大 (ms) | P95 (ms) | P99 (ms) | 目标 (ms) | 状态 |\n';
    md += '|---------|----------|----------|----------|----------|----------|-----------|------|\n';

    report.tests.forEach(test => {
      const status = test.passed ? '✅ 通过' : '❌ 失败';
      md += `| ${test.name} | ${test.average.toFixed(2)} | ${test.min.toFixed(2)} | ${test.max.toFixed(2)} | ${test.percentile95.toFixed(2)} | ${test.percentile99.toFixed(2)} | ${test.threshold} | ${status} |\n`;
    });

    if (report.recommendations.length > 0) {
      md += '\n## 优化建议\n\n';
      report.recommendations.forEach(rec => {
        md += `${rec}\n`;
      });
    }

    return md;
  }

  /**
   * 辅助方法：休眠
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 打印控制台报告
   */
  printReport(): void {
    const report = this.generateReport();

    console.log('\n' + '='.repeat(80));
    console.log('性能基准测试报告');
    console.log('='.repeat(80));
    console.log(`测试时间: ${report.timestamp.toISOString()}`);
    console.log(`系统: ${report.systemInfo.platform} ${report.systemInfo.arch}`);
    console.log(`Node.js: ${report.systemInfo.nodeVersion}`);
    console.log('');

    console.log('测试摘要:');
    console.log(`  总测试数: ${report.summary.totalTests}`);
    console.log(`  通过: ${report.summary.passedTests}`);
    console.log(`  失败: ${report.summary.failedTests}`);
    console.log(`  总体评分: ${report.summary.overallScore.toFixed(1)}%`);
    console.log('');

    console.log('测试结果:');
    console.log('');

    report.tests.forEach(test => {
      const status = test.passed ? '✅' : '❌';
      console.log(`${status} ${test.name}`);
      console.log(`   平均: ${test.average.toFixed(2)}ms (最小: ${test.min.toFixed(2)}ms, 最大: ${test.max.toFixed(2)}ms)`);
      console.log(`   P95: ${test.percentile95.toFixed(2)}ms, P99: ${test.percentile99.toFixed(2)}ms`);
      console.log(`   标准差: ${test.standardDeviation.toFixed(2)}ms`);
      if (test.threshold > 0) {
        console.log(`   目标: ${test.threshold}ms`);
      }
      console.log('');
    });

    if (report.recommendations.length > 0) {
      console.log('优化建议:');
      console.log('');
      report.recommendations.forEach(rec => {
        console.log(rec);
      });
    }

    console.log('='.repeat(80));
    console.log('');
  }
}

/**
 * 性能测试辅助函数
 */
export class PerformanceTestHelpers {
  /**
   * 创建测试数据
   */
  static createTestData(size: number): any[] {
    return Array.from({ length: size }, (_, i) => ({
      id: i,
      name: `Item ${i}`,
      value: Math.random() * 1000,
      timestamp: Date.now()
    }));
  }

  /**
   * 创建大文件模拟数据
   */
  static createLargeFileData(sizeInMB: number): string {
    const chunk = 'x'.repeat(1024 * 1024); // 1MB
    let result = '';
    for (let i = 0; i < sizeInMB; i++) {
      result += chunk;
    }
    return result;
  }

  /**
   * 模拟网络延迟
   */
  static async simulateNetworkDelay(min: number = 50, max: number = 200): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * 模拟 CPU 密集型操作
   */
  static simulateCPUWork(iterations: number = 1000000): number {
    let result = 0;
    for (let i = 0; i < iterations; i++) {
      result += Math.sqrt(i);
    }
    return result;
  }

  /**
   * 模拟内存分配
   */
  static simulateMemoryAllocation(sizeMB: number): any[] {
    const chunkSize = 1024;
    const chunks = (sizeMB * 1024 * 1024) / chunkSize;
    const data: any[] = [];

    for (let i = 0; i < chunks; i++) {
      data.push(new Array(chunkSize).fill(i));
    }

    return data;
  }
}
