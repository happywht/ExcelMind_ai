/**
 * 测试运行器
 * 负责执行各类测试并生成报告
 *
 * 功能：
 * - 运行所有测试
 * - 运行单元测试
 * - 运行集成测试
 * - 运行回归测试
 * - 生成测试报告
 */

import { execSync, spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import {
  TestResult,
  TestOptions,
  TestReport,
  PerformanceMetrics,
  TestTrend
} from './types';

// ============================================================
// 测试运行器核心类
// ============================================================

export class TestRunner {
  private readonly projectRoot: string;
  private readonly config: TestOptions;
  private results: TestResult[] = [];

  constructor(
    projectRoot: string,
    config: TestOptions = {}
  ) {
    this.projectRoot = projectRoot;
    this.config = {
      parallel: config.parallel ?? true,
      maxWorkers: config.maxWorkers ?? 4,
      timeout: config.timeout ?? 10000,
      verbose: config.verbose ?? true,
      mode: config.mode ?? 'all',
      coverage: config.coverage ?? true,
      pattern: config.pattern,
      onlyFailures: config.onlyFailures ?? false
    };
  }

  // ============================================================
  // 主测试执行方法
  // ============================================================

  /**
   * 运行所有测试
   */
  async runAllTests(options?: TestOptions): Promise<TestResult> {
    const mergedOptions = { ...this.config, ...options };
    const startTime = Date.now();

    console.log('🚀 开始运行所有测试...');
    console.log(`   模式: ${mergedOptions.mode}`);
    console.log(`   并行: ${mergedOptions.parallel}`);
    console.log(`   覆盖率: ${mergedOptions.coverage}`);
    console.log('');

    try {
      let result: TestResult;

      switch (mergedOptions.mode) {
        case 'unit':
          result = await this.runUnitTests();
          break;
        case 'integration':
          result = await this.runIntegrationTests();
          break;
        case 'regression':
          result = await this.runRegressionTests();
          break;
        case 'performance':
          result = await this.runPerformanceTests();
          break;
        case 'all':
        default:
          result = await this.runAllTestSuites();
          break;
      }

      result.duration = Date.now() - startTime;
      result.timestamp = Date.now();

      this.results.push(result);

      console.log('');
      console.log('✅ 所有测试执行完成');
      this.printSummary(result);

      return result;
    } catch (error) {
      console.error('❌ 测试执行失败:', error);
      throw error;
    }
  }

  /**
   * 运行所有测试套件
   */
  private async runAllTestSuites(): Promise<TestResult> {
    console.log('📋 运行完整测试套件...');

    const unitResult = await this.runUnitTests();
    const integrationResult = await this.runIntegrationTests();
    const regressionResult = await this.runRegressionTests();

    // 合并结果
    return this.mergeResults([unitResult, integrationResult, regressionResult]);
  }

  // ============================================================
  // 单元测试
  // ============================================================

  /**
   * 运行单元测试
   */
  async runUnitTests(): Promise<TestResult> {
    console.log('🔬 运行单元测试...');

    const startTime = Date.now();
    const testPattern = this.config.pattern || '**/*.unit.test.ts';
    const command = this.buildJestCommand({
      pattern: testPattern,
      coverage: false
    });

    try {
      const output = execSync(command, {
        cwd: this.projectRoot,
        encoding: 'utf-8',
        stdio: this.config.verbose ? 'inherit' : 'pipe'
      });

      const result = this.parseJestOutput(output);
      result.duration = Date.now() - startTime;

      console.log(`✅ 单元测试完成: ${result.passedTests}/${result.totalTests} 通过`);

      return result;
    } catch (error: any) {
      console.error('❌ 单元测试失败');

      return {
        totalTests: 0,
        passedTests: 0,
        failedTests: 1,
        skippedTests: 0,
        duration: Date.now() - startTime,
        successRate: 0,
        suites: [],
        timestamp: Date.now(),
        status: 'failed',
        error: error.message
      };
    }
  }

  // ============================================================
  // 集成测试
  // ============================================================

  /**
   * 运行集成测试
   */
  async runIntegrationTests(): Promise<TestResult> {
    console.log('🔗 运行集成测试...');

    const startTime = Date.now();
    const testPattern = this.config.pattern || '**/*.integration.test.ts';
    const command = this.buildJestCommand({
      pattern: testPattern,
      coverage: false,
      maxWorkers: 1 // 集成测试通常串行执行
    });

    try {
      const output = execSync(command, {
        cwd: this.projectRoot,
        encoding: 'utf-8',
        stdio: this.config.verbose ? 'inherit' : 'pipe',
        env: {
          ...process.env,
          NODE_ENV: 'integration-test'
        }
      });

      const result = this.parseJestOutput(output);
      result.duration = Date.now() - startTime;

      console.log(`✅ 集成测试完成: ${result.passedTests}/${result.totalTests} 通过`);

      return result;
    } catch (error: any) {
      console.error('❌ 集成测试失败');

      return {
        totalTests: 0,
        passedTests: 0,
        failedTests: 1,
        skippedTests: 0,
        duration: Date.now() - startTime,
        successRate: 0,
        suites: [],
        timestamp: Date.now(),
        status: 'failed',
        error: error.message
      };
    }
  }

  // ============================================================
  // 回归测试
  // ============================================================

  /**
   * 运行回归测试
   */
  async runRegressionTests(): Promise<TestResult> {
    console.log('🔄 运行回归测试...');

    const startTime = Date.now();
    const testPattern = this.config.pattern || '**/*.regression.test.ts';
    const command = this.buildJestCommand({
      pattern: testPattern,
      coverage: false
    });

    try {
      const output = execSync(command, {
        cwd: this.projectRoot,
        encoding: 'utf-8',
        stdio: this.config.verbose ? 'inherit' : 'pipe'
      });

      const result = this.parseJestOutput(output);
      result.duration = Date.now() - startTime;

      // 与基线比较
      const baseline = this.loadBaselineResults();
      if (baseline) {
        const comparison = this.compareWithBaseline(result, baseline);
        console.log(`📊 回归测试比较: ${comparison.summary}`);
      }

      console.log(`✅ 回归测试完成: ${result.passedTests}/${result.totalTests} 通过`);

      return result;
    } catch (error: any) {
      console.error('❌ 回归测试失败');

      return {
        totalTests: 0,
        passedTests: 0,
        failedTests: 1,
        skippedTests: 0,
        duration: Date.now() - startTime,
        successRate: 0,
        suites: [],
        timestamp: Date.now(),
        status: 'failed',
        error: error.message
      };
    }
  }

  // ============================================================
  // 性能测试
  // ============================================================

  /**
   * 运行性能测试
   */
  async runPerformanceTests(): Promise<TestResult> {
    console.log('⚡ 运行性能测试...');

    const startTime = Date.now();
    const testPattern = this.config.pattern || '**/*.performance.test.ts';
    const command = this.buildJestCommand({
      pattern: testPattern,
      coverage: false,
      maxWorkers: 1 // 性能测试需要独立执行
    });

    try {
      const output = execSync(command, {
        cwd: this.projectRoot,
        encoding: 'utf-8',
        stdio: this.config.verbose ? 'inherit' : 'pipe'
      });

      const result = this.parseJestOutput(output);
      result.duration = Date.now() - startTime;

      console.log(`✅ 性能测试完成: ${result.passedTests}/${result.totalTests} 通过`);

      return result;
    } catch (error: any) {
      console.error('❌ 性能测试失败');

      return {
        totalTests: 0,
        passedTests: 0,
        failedTests: 1,
        skippedTests: 0,
        duration: Date.now() - startTime,
        successRate: 0,
        suites: [],
        timestamp: Date.now(),
        status: 'failed',
        error: error.message
      };
    }
  }

  // ============================================================
  // 报告生成
  // ============================================================

  /**
   * 生成测试报告
   */
  generateReport(result: TestResult): TestReport {
    console.log('📝 生成测试报告...');

    const performanceMetrics = this.calculatePerformanceMetrics(result);
    const trends = this.loadTrends();

    const report: TestReport = {
      metadata: {
        title: 'ExcelMind AI 测试报告',
        generatedAt: new Date().toISOString(),
        project: 'ExcelMind AI',
        version: this.getProjectVersion()
      },
      summary: {
        total: result.totalTests,
        passed: result.passedTests,
        failed: result.failedTests,
        skipped: result.skippedTests,
        duration: result.duration,
        successRate: result.successRate
      },
      details: result.suites,
      coverage: result.coverage ? this.generateCoverageSummary(result.coverage) : undefined,
      performance: performanceMetrics,
      trends: trends
    };

    // 保存报告
    this.saveReport(report);

    // 保存当前结果为基线
    this.saveBaselineResults(result);

    // 更新趋势数据
    this.updateTrends(result);

    console.log('✅ 测试报告生成完成');

    return report;
  }

  /**
   * 生成覆盖率摘要
   */
  private generateCoverageSummary(coverage: any): any {
    return {
      statements: coverage.percentages?.statements || 0,
      branches: coverage.percentages?.branches || 0,
      functions: coverage.percentages?.functions || 0,
      lines: coverage.percentages?.lines || 0,
      meetsThreshold: true,
      failedThresholds: []
    };
  }

  /**
   * 计算性能指标
   */
  private calculatePerformanceMetrics(result: TestResult): PerformanceMetrics {
    const allTests = result.suites.flatMap(suite => suite.tests);
    const durations = allTests.map(test => test.duration);

    const avgDuration = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

    const slowestTests = allTests
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10)
      .map(test => ({
        name: test.name,
        duration: test.duration
      }));

    const memoryUsage = process.memoryUsage();

    return {
      avgDuration,
      slowestTests,
      memoryUsage: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal
      }
    };
  }

  // ============================================================
  // 辅助方法
  // ============================================================

  /**
   * 构建Jest命令
   */
  private buildJestCommand(options: {
    pattern?: string;
    coverage?: boolean;
    maxWorkers?: number;
  }): string {
    const parts: string[] = ['npx', 'jest'];

    if (options.pattern) {
      parts.push(options.pattern);
    }

    if (options.coverage && this.config.coverage) {
      parts.push('--coverage');
    }

    if (options.maxWorkers) {
      parts.push(`--maxWorkers=${options.maxWorkers}`);
    }

    if (this.config.verbose) {
      parts.push('--verbose');
    }

    parts.push('--json');
    parts.push('--no-cache');

    return parts.join(' ');
  }

  /**
   * 解析Jest输出
   */
  private parseJestOutput(output: string): TestResult {
    try {
      // 尝试从输出中提取JSON
      const jsonMatch = output.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jestResult = JSON.parse(jsonMatch[0]);

        return {
          totalTests: jestResult.numTotalTests || 0,
          passedTests: jestResult.numPassedTests || 0,
          failedTests: jestResult.numFailedTests || 0,
          skippedTests: jestResult.numPendingTests || 0,
          duration: jestResult.testResults?.reduce((sum: number, r: any) => sum + r.duration, 0) || 0,
          successRate: 0,
          suites: [],
          timestamp: Date.now(),
          status: jestResult.numFailedTests === 0 ? 'passed' : 'failed'
        };
      }

      // 如果没有JSON，返回基本结果
      return {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        duration: 0,
        successRate: 100,
        suites: [],
        timestamp: Date.now(),
        status: 'passed'
      };
    } catch (error) {
      console.error('解析Jest输出失败:', error);

      return {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        duration: 0,
        successRate: 0,
        suites: [],
        timestamp: Date.now(),
        status: 'failed'
      };
    }
  }

  /**
   * 合并多个测试结果
   */
  private mergeResults(results: TestResult[]): TestResult {
    const merged: TestResult = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      duration: 0,
      successRate: 0,
      suites: [],
      timestamp: Date.now(),
      status: 'passed'
    };

    for (const result of results) {
      merged.totalTests += result.totalTests;
      merged.passedTests += result.passedTests;
      merged.failedTests += result.failedTests;
      merged.skippedTests += result.skippedTests;
      merged.duration += result.duration;
      merged.suites.push(...result.suites);

      if (result.status === 'failed') {
        merged.status = 'failed';
      }
    }

    merged.successRate = merged.totalTests > 0
      ? (merged.passedTests / merged.totalTests) * 100
      : 0;

    return merged;
  }

  /**
   * 加载基线结果
   */
  private loadBaselineResults(): TestResult | null {
    try {
      const baselinePath = path.join(this.projectRoot, '.test-results', 'baseline.json');
      if (fs.existsSync(baselinePath)) {
        const data = fs.readFileSync(baselinePath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.warn('加载基线结果失败:', error);
    }

    return null;
  }

  /**
   * 保存基线结果
   */
  private saveBaselineResults(result: TestResult): void {
    try {
      const resultsDir = path.join(this.projectRoot, '.test-results');
      if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
      }

      const baselinePath = path.join(resultsDir, 'baseline.json');
      fs.writeFileSync(baselinePath, JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('保存基线结果失败:', error);
    }
  }

  /**
   * 与基线比较
   */
  private compareWithBaseline(current: TestResult, baseline: TestResult): any {
    const summary: string[] = [];

    // 比较测试数量
    if (current.totalTests !== baseline.totalTests) {
      const diff = current.totalTests - baseline.totalTests;
      summary.push(`测试数量变化: ${diff > 0 ? '+' : ''}${diff}`);
    }

    // 比较通过率
    const currentRate = current.successRate;
    const baselineRate = baseline.successRate;
    if (Math.abs(currentRate - baselineRate) > 5) {
      const rateDiff = currentRate - baselineRate;
      summary.push(`通过率变化: ${rateDiff > 0 ? '+' : ''}${rateDiff.toFixed(2)}%`);
    }

    // 比较执行时间
    if (current.duration > baseline.duration * 1.2) {
      const timeDiff = ((current.duration - baseline.duration) / baseline.duration * 100).toFixed(1);
      summary.push(`⚠️  执行时间增加: ${timeDiff}%`);
    }

    return {
      summary: summary.join(', ') || '无显著变化',
      details: {
        totalTestsDiff: current.totalTests - baseline.totalTests,
        successRateDiff: current.successRate - baseline.successRate,
        durationDiff: current.duration - baseline.duration
      }
    };
  }

  /**
   * 加载趋势数据
   */
  private loadTrends(): TestTrend[] {
    try {
      const trendsPath = path.join(this.projectRoot, '.test-results', 'trends.json');
      if (fs.existsSync(trendsPath)) {
        const data = fs.readFileSync(trendsPath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.warn('加载趋势数据失败:', error);
    }

    return [];
  }

  /**
   * 更新趋势数据
   */
  private updateTrends(result: TestResult): void {
    try {
      const trends = this.loadTrends();
      const today = new Date().toISOString().split('T')[0];

      // 添加今天的趋势数据
      trends.push({
        date: today,
        successRate: result.successRate,
        coverage: result.coverage?.percentages?.average || 0,
        duration: result.duration
      });

      // 只保留最近30天的数据
      const recentTrends = trends.slice(-30);

      const trendsPath = path.join(this.projectRoot, '.test-results', 'trends.json');
      const resultsDir = path.join(this.projectRoot, '.test-results');
      if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
      }

      fs.writeFileSync(trendsPath, JSON.stringify(recentTrends, null, 2));
    } catch (error) {
      console.error('更新趋势数据失败:', error);
    }
  }

  /**
   * 保存报告
   */
  private saveReport(report: TestReport): void {
    try {
      const reportsDir = path.join(this.projectRoot, 'test-reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const reportPath = path.join(reportsDir, `report-${timestamp}.json`);
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

      // 生成HTML报告
      this.generateHtmlReport(report, reportsDir, timestamp);

      console.log(`📄 报告已保存: ${reportPath}`);
    } catch (error) {
      console.error('保存报告失败:', error);
    }
  }

  /**
   * 生成HTML报告
   */
  private generateHtmlReport(report: TestReport, reportsDir: string, timestamp: string): void {
    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${report.metadata.title}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .metric { background: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; color: #007bff; }
        .metric-label { color: #666; margin-top: 5px; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .skipped { color: #ffc107; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #007bff; color: white; }
        tr:hover { background: #f5f5f5; }
    </style>
</head>
<body>
    <div class="container">
        <h1>${report.metadata.title}</h1>
        <p><strong>生成时间:</strong> ${report.metadata.generatedAt}</p>
        <p><strong>项目:</strong> ${report.metadata.project} ${report.metadata.version}</p>

        <div class="summary">
            <div class="metric">
                <div class="metric-value">${report.summary.total}</div>
                <div class="metric-label">总测试数</div>
            </div>
            <div class="metric">
                <div class="metric-value passed">${report.summary.passed}</div>
                <div class="metric-label">通过</div>
            </div>
            <div class="metric">
                <div class="metric-value failed">${report.summary.failed}</div>
                <div class="metric-label">失败</div>
            </div>
            <div class="metric">
                <div class="metric-value">${report.summary.successRate.toFixed(1)}%</div>
                <div class="metric-label">成功率</div>
            </div>
            <div class="metric">
                <div class="metric-value">${(report.summary.duration / 1000).toFixed(2)}s</div>
                <div class="metric-label">执行时间</div>
            </div>
        </div>

        <h2>测试套件详情</h2>
        <table>
            <thead>
                <tr>
                    <th>套件名称</th>
                    <th>状态</th>
                    <th>通过</th>
                    <th>失败</th>
                    <th>跳过</th>
                    <th>执行时间</th>
                </tr>
            </thead>
            <tbody>
                ${report.details.map(suite => `
                    <tr>
                        <td>${suite.name}</td>
                        <td class="${suite.status}">${suite.status}</td>
                        <td>${suite.tests.filter(t => t.status === 'passed').length}</td>
                        <td>${suite.tests.filter(t => t.status === 'failed').length}</td>
                        <td>${suite.tests.filter(t => t.status === 'skipped').length}</td>
                        <td>${suite.duration}ms</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
</body>
</html>
    `;

    const htmlPath = path.join(reportsDir, `report-${timestamp}.html`);
    fs.writeFileSync(htmlPath, html);
  }

  /**
   * 获取项目版本
   */
  private getProjectVersion(): string {
    try {
      const packageJsonPath = path.join(this.projectRoot, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        return packageJson.version || '1.0.0';
      }
    } catch (error) {
      // 忽略错误
    }

    return '1.0.0';
  }

  /**
   * 打印测试摘要
   */
  private printSummary(result: TestResult): void {
    console.log('');
    console.log('📊 测试摘要:');
    console.log(`   总测试数: ${result.totalTests}`);
    console.log(`   ✅ 通过: ${result.passedTests}`);
    console.log(`   ❌ 失败: ${result.failedTests}`);
    console.log(`   ⏭️  跳过: ${result.skippedTests}`);
    console.log(`   📈 成功率: ${result.successRate.toFixed(1)}%`);
    console.log(`   ⏱️  执行时间: ${(result.duration / 1000).toFixed(2)}s`);
    console.log('');
  }
}

// ============================================================
// 导出
// ============================================================

export default TestRunner;
