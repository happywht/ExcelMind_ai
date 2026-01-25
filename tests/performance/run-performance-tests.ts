/**
 * 性能测试运行脚本
 * 运行所有性能测试并生成综合报告
 *
 * @author Performance Tester
 * @version 1.0.0
 */

import { PerformanceTestRunner } from './PerformanceTestRunner';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import * as path from 'path';

interface PerformanceBaseline {
  timestamp: string;
  tests: Array<{
    name: string;
    average: number;
    threshold: number;
  }>;
}

interface PerformanceComparison {
  name: string;
  current: number;
  baseline: number;
  change: number;
  changePercent: number;
  status: 'improved' | 'degraded' | 'stable';
}

/**
 * 性能测试运行器类
 */
export class PerformanceTestSuite {
  private runner: PerformanceTestRunner;
  private baselinePath: string;
  private reportDir: string;

  constructor() {
    this.runner = new PerformanceTestRunner();
    this.baselinePath = path.join(process.cwd(), 'test-results', 'performance-baseline.json');
    this.reportDir = path.join(process.cwd(), 'test-results', 'performance');

    // 确保报告目录存在
    if (!existsSync(this.reportDir)) {
      mkdirSync(this.reportDir, { recursive: true });
    }
  }

  /**
   * 设置性能阈值
   */
  setThresholds(thresholds: Record<string, number>): void {
    this.runner.setThresholds(thresholds);
  }

  /**
   * 加载基线数据
   */
  loadBaseline(): PerformanceBaseline | null {
    if (!existsSync(this.baselinePath)) {
      return null;
    }

    try {
      const data = readFileSync(this.baselinePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.warn('无法加载基线数据:', error);
      return null;
    }
  }

  /**
   * 保存基线数据
   */
  saveBaseline(): void {
    const report = this.runner.generateReport();
    const baseline: PerformanceBaseline = {
      timestamp: report.timestamp.toISOString(),
      tests: report.tests.map(test => ({
        name: test.name,
        average: test.average,
        threshold: test.threshold
      }))
    };

    writeFileSync(this.baselinePath, JSON.stringify(baseline, null, 2), 'utf-8');
    console.log(`\n✅ 基线数据已保存到: ${this.baselinePath}`);
  }

  /**
   * 与基线对比
   */
  compareToBaseline(): PerformanceComparison[] {
    const baseline = this.loadBaseline();
    if (!baseline) {
      console.log('\n⚠️  未找到基线数据，跳过对比');
      return [];
    }

    const currentReport = this.runner.generateReport();
    const comparisons: PerformanceComparison[] = [];

    for (const currentTest of currentReport.tests) {
      const baselineTest = baseline.tests.find(t => t.name === currentTest.name);
      if (!baselineTest) {
        continue;
      }

      const change = currentTest.average - baselineTest.average;
      const changePercent = (change / baselineTest.average) * 100;

      let status: 'improved' | 'degraded' | 'stable';
      if (change < -10) {
        status = 'improved';
      } else if (change > 10) {
        status = 'degraded';
      } else {
        status = 'stable';
      }

      comparisons.push({
        name: currentTest.name,
        current: currentTest.average,
        baseline: baselineTest.average,
        change,
        changePercent,
        status
      });
    }

    return comparisons;
  }

  /**
   * 生成对比报告
   */
  generateComparisonReport(comparisons: PerformanceComparison[]): string {
    if (comparisons.length === 0) {
      return '无可用的对比数据';
    }

    let markdown = '# 性能对比报告\n\n';
    markdown += `**基线时间**: ${new Date(this.loadBaseline()!.timestamp).toLocaleString()}\n`;
    markdown += `**当前时间**: ${new Date().toLocaleString()}\n\n`;

    markdown += '## 性能变化摘要\n\n';

    const improved = comparisons.filter(c => c.status === 'improved');
    const degraded = comparisons.filter(c => c.status === 'degraded');
    const stable = comparisons.filter(c => c.status === 'stable');

    markdown += `- **改进**: ${improved.length} 项\n`;
    markdown += `- **退化**: ${degraded.length} 项\n`;
    markdown += `- **稳定**: ${stable.length} 项\n\n`;

    if (improved.length > 0) {
      markdown += '### ✅ 性能改进\n\n';
      markdown += '| 测试项 | 当前 (ms) | 基线 (ms) | 变化 | 改进 % |\n';
      markdown += '|--------|----------|----------|------|--------|\n';

      for (const item of improved) {
        markdown += `| ${item.name} | ${item.current.toFixed(2)} | ${item.baseline.toFixed(2)} | ${item.change.toFixed(2)} | ${item.changePercent.toFixed(1)}% |\n`;
      }
      markdown += '\n';
    }

    if (degraded.length > 0) {
      markdown += '### ⚠️  性能退化\n\n';
      markdown += '| 测试项 | 当前 (ms) | 基线 (ms) | 变化 | 退化 % |\n';
      markdown += '|--------|----------|----------|------|--------|\n';

      for (const item of degraded) {
        markdown += `| ${item.name} | ${item.current.toFixed(2)} | ${item.baseline.toFixed(2)} | +${item.change.toFixed(2)} | +${item.changePercent.toFixed(1)}% |\n`;
      }
      markdown += '\n';
    }

    if (stable.length > 0) {
      markdown += '### ➡️  性能稳定\n\n';
      markdown += '| 测试项 | 当前 (ms) | 基线 (ms) | 变化 % |\n';
      markdown += '|--------|----------|----------|--------|\n';

      for (const item of stable) {
        markdown += `| ${item.name} | ${item.current.toFixed(2)} | ${item.baseline.toFixed(2)} | ${item.changePercent.toFixed(1)}% |\n`;
      }
      markdown += '\n';
    }

    return markdown;
  }

  /**
   * 运行性能测试套件
   */
  async run(): Promise<void> {
    console.log('\n' + '='.repeat(80));
    console.log('开始运行性能基准测试套件');
    console.log('='.repeat(80) + '\n');

    try {
      // 这里会运行所有性能测试
      // 实际测试通过 Jest 运行
      console.log('提示: 请使用以下命令运行性能测试:');
      console.log('  npm run test:performance');
      console.log('');

    } catch (error) {
      console.error('运行性能测试时出错:', error);
      process.exit(1);
    }
  }

  /**
   * 生成综合报告
   */
  async generateReports(options?: {
    saveBaseline?: boolean;
    compareToBaseline?: boolean;
  }): Promise<void> {
    const { saveBaseline = false, compareToBaseline = true } = options || {};

    // 生成性能报告
    const report = this.runner.generateReport();

    // 保存 JSON 报告
    const jsonPath = path.join(this.reportDir, 'performance-report.json');
    writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`\n✅ JSON 报告已保存: ${jsonPath}`);

    // 保存 Markdown 报告
    await this.runner.saveMarkdownReport(path.join(this.reportDir, 'PERFORMANCE_REPORT.md'));
    console.log(`✅ Markdown 报告已保存: ${path.join(this.reportDir, 'PERFORMANCE_REPORT.md')}`);

    // 打印报告
    this.runner.printReport();

    // 对比基线
    if (compareToBaseline) {
      const comparisons = this.compareToBaseline();
      if (comparisons.length > 0) {
        const comparisonReport = this.generateComparisonReport(comparisons);
        const comparisonPath = path.join(this.reportDir, 'PERFORMANCE_COMPARISON.md');
        writeFileSync(comparisonPath, comparisonReport, 'utf-8');
        console.log(`✅ 对比报告已保存: ${comparisonPath}`);

        console.log('\n' + comparisonReport);
      }
    }

    // 保存基线
    if (saveBaseline) {
      this.saveBaseline();
    }
  }
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  const options = {
    saveBaseline: args.includes('--update-baseline'),
    compareToBaseline: args.includes('--compare') || !args.includes('--no-compare')
  };

  const suite = new PerformanceTestSuite();

  // 设置默认阈值
  suite.setThresholds({
    'shared-types-full-compile': 5000,
    'shared-types-type-check': 3000,
    'shared-types-declaration-gen': 2000,
    'degradation-decision-time': 10,
    'redis-set-get': 50,
    'indexeddb-set-get': 100,
    'redis-to-indexeddb-sync': 100,
    'file-upload-1mb': 200,
    'file-list-query-100': 100,
    'relationship-query-50': 150,
    'file-browser-render-10': 100,
    'progress-panel-render': 80,
    'relationship-graph-render-50': 300
  });

  await suite.run();
  await suite.generateReports(options);
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}
