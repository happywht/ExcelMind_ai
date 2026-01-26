/**
 * Phase 2 性能测试运行脚本
 *
 * 快速运行所有Phase 2相关的性能测试并生成报告
 *
 * @author Performance Tester
 * @version 1.0.0
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

// ============================================================================
// 性能测试结果接口
// ============================================================================

interface TestSuiteResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  tests: number;
  passed: number;
  failed: number;
}

interface PerformanceReport {
  timestamp: string;
  testSuites: TestSuiteResult[];
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    totalDuration: number;
    passRate: number;
  };
  recommendations: string[];
}

// ============================================================================
// Phase 2 性能测试运行器
// ============================================================================

class Phase2TestRunner {
  private results: TestSuiteResult[] = [];
  private testSuites = [
    {
      name: 'API性能测试',
      file: 'api-performance.test.ts',
      enabled: true
    },
    {
      name: 'WebSocket性能测试',
      file: 'websocket-performance.test.ts',
      enabled: true
    },
    {
      name: '数据质量分析性能测试',
      file: 'data-quality-performance.test.ts',
      enabled: true
    },
    {
      name: 'Phase 2 基准对比',
      file: 'phase2-benchmark.ts',
      enabled: true
    }
  ];

  /**
   * 运行所有测试套件
   */
  async runAll(): Promise<void> {
    console.log('\n' + '='.repeat(80));
    console.log('🚀 Phase 2 性能测试套件');
    console.log('='.repeat(80) + '\n');

    const startTime = Date.now();

    for (const suite of this.testSuites) {
      if (suite.enabled) {
        await this.runTestSuite(suite);
      }
    }

    const totalDuration = Date.now() - startTime;

    // 生成报告
    await this.generateReport(totalDuration);
  }

  /**
   * 运行单个测试套件
   */
  async runTestSuite(suite: { name: string; file: string }): Promise<void> {
    console.log(`\n🧪 运行: ${suite.name}`);
    console.log('─'.repeat(80));

    const startTime = Date.now();

    try {
      const testPath = path.join('tests', 'performance', suite.file);

      // 运行测试
      const { stdout, stderr } = await execAsync(
        `npx ts-node ${testPath}`,
        {
          cwd: process.cwd(),
          timeout: 120000 // 2分钟超时
        }
      );

      const duration = Date.now() - startTime;

      // 解析测试输出
      const result = this.parseTestOutput(stdout, stderr, suite.name, duration);

      this.results.push(result);

      console.log(`\n✅ ${suite.name} 完成 (${duration}ms)`);
      console.log(`   通过: ${result.passed}/${result.tests}`);

    } catch (error: any) {
      const duration = Date.now() - startTime;

      const result: TestSuiteResult = {
        name: suite.name,
        status: 'failed',
        duration,
        tests: 0,
        passed: 0,
        failed: 1
      };

      this.results.push(result);

      console.log(`\n❌ ${suite.name} 失败: ${error.message}`);
    }
  }

  /**
   * 解析测试输出
   */
  private parseTestOutput(
    stdout: string,
    stderr: string,
    name: string,
    duration: number
  ): TestSuiteResult {
    // 简单解析 - 在实际应用中可能需要更复杂的解析逻辑
    const testMatches = stdout.match(/✓|✅|PASS/g);
    const failMatches = stdout.match(/✗|❌|FAIL/g);

    const tests = (testMatches?.length || 0) + (failMatches?.length || 0);
    const passed = testMatches?.length || 0;
    const failed = failMatches?.length || 0;

    return {
      name,
      status: failed === 0 ? 'passed' : 'failed',
      duration,
      tests,
      passed,
      failed
    };
  }

  /**
   * 生成综合报告
   */
  async generateReport(totalDuration: number): Promise<void> {
    const summary = {
      totalTests: this.results.reduce((sum, r) => sum + r.tests, 0),
      passedTests: this.results.reduce((sum, r) => sum + r.passed, 0),
      failedTests: this.results.reduce((sum, r) => sum + r.failed, 0),
      totalDuration,
      passRate: 0
    };

    summary.passRate = summary.totalTests > 0
      ? (summary.passedTests / summary.totalTests) * 100
      : 0;

    const report: PerformanceReport = {
      timestamp: new Date().toISOString(),
      testSuites: this.results,
      summary,
      recommendations: this.generateRecommendations()
    };

    // 确保报告目录存在
    const reportDir = path.join(process.cwd(), 'test-results', 'performance');
    if (!existsSync(reportDir)) {
      mkdirSync(reportDir, { recursive: true });
    }

    // 保存JSON报告
    const jsonPath = path.join(reportDir, 'phase2-performance-report.json');
    writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`\n✅ JSON报告: ${jsonPath}`);

    // 保存Markdown报告
    const markdownPath = path.join(reportDir, 'PHASE2_PERFORMANCE_REPORT.md');
    const markdown = this.generateMarkdownReport(report);
    writeFileSync(markdownPath, markdown, 'utf-8');
    console.log(`✅ Markdown报告: ${markdownPath}`);

    // 打印摘要
    this.printSummary(report);
  }

  /**
   * 生成Markdown报告
   */
  private generateMarkdownReport(report: PerformanceReport): string {
    let markdown = '# Phase 2 性能测试报告\n\n';
    markdown += `**测试时间**: ${new Date(report.timestamp).toLocaleString()}\n\n`;

    // 摘要
    markdown += '## 📊 测试摘要\n\n';
    markdown += `| 指标 | 数值 |\n`;
    markdown += `|------|------|\n`;
    markdown += `| 总测试数 | ${report.summary.totalTests} |\n`;
    markdown += `| 通过测试 | ${report.summary.passedTests} |\n`;
    markdown += `| 失败测试 | ${report.summary.failedTests} |\n`;
    markdown += `| 通过率 | ${report.summary.passRate.toFixed(1)}% |\n`;
    markdown += `| 总耗时 | ${report.summary.totalDuration}ms |\n\n`;

    // 详细结果
    markdown += '## 📈 详细测试结果\n\n';
    markdown += '| 测试套件 | 状态 | 测试数 | 通过 | 失败 | 耗时 |\n';
    markdown += '|----------|------|--------|------|------|------|\n';

    report.testSuites.forEach(suite => {
      const statusIcon = suite.status === 'passed' ? '✅' : '❌';
      markdown += `| ${suite.name} | ${statusIcon} ${suite.status} | ${suite.tests} | ${suite.passed} | ${suite.failed} | ${suite.duration}ms |\n`;
    });

    // 优化建议
    markdown += '\n## 💡 优化建议\n\n';
    report.recommendations.forEach((rec, i) => {
      markdown += `${i + 1}. ${rec}\n`;
    });

    return markdown;
  }

  /**
   * 生成优化建议
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const failed = this.results.filter(r => r.status === 'failed');
    const passed = this.results.filter(r => r.status === 'passed');

    if (passed.length === this.results.length) {
      recommendations.push('✅ 所有性能测试通过!Phase 2优化目标已达成。');
    } else {
      recommendations.push(`⚠️  ${failed.length}个测试套件失败,需要进一步优化:`);
      failed.forEach(suite => {
        recommendations.push(`   - ${suite.name}: 检查性能瓶颈`);
      });
    }

    // 基于通过率的建议
    const passRate = (passed.length / this.results.length) * 100;
    if (passRate >= 80) {
      recommendations.push('📈 性能优化效果显著,可以考虑进入下一阶段开发。');
    } else if (passRate >= 50) {
      recommendations.push('📊 性能有一定改善,但仍有优化空间。');
    } else {
      recommendations.push('⚠️  需要重新评估优化策略。');
    }

    return recommendations;
  }

  /**
   * 打印测试摘要
   */
  private printSummary(report: PerformanceReport): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 Phase 2 性能测试摘要');
    console.log('='.repeat(80) + '\n');

    console.log(`总测试数: ${report.summary.totalTests}`);
    console.log(`✅ 通过: ${report.summary.passedTests}`);
    console.log(`❌ 失败: ${report.summary.failedTests}`);
    console.log(`📈 通过率: ${report.summary.passRate.toFixed(1)}%`);
    console.log(`⏱️  总耗时: ${report.summary.totalDuration}ms\n`);

    console.log('📋 测试套件结果:\n');
    report.testSuites.forEach(suite => {
      const statusIcon = suite.status === 'passed' ? '✅' : '❌';
      console.log(
        `  ${statusIcon} ${suite.name}: ` +
        `${suite.passed}/${suite.tests} 通过 ` +
        `(${suite.duration}ms)`
      );
    });

    console.log('\n💡 优化建议:\n');
    report.recommendations.forEach(rec => {
      console.log(`  ${rec}`);
    });

    console.log('\n' + '='.repeat(80) + '\n');
  }
}

// ============================================================================
// 主函数
// ============================================================================

async function main() {
  const runner = new Phase2TestRunner();

  try {
    await runner.runAll();
    process.exit(0);
  } catch (error) {
    console.error('❌ 测试运行失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}
