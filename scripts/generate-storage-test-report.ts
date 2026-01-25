/**
 * 存储服务测试报告生成器
 *
 * 生成详细的测试报告，包括：
 * - 测试执行统计
 * - 性能基准测试结果
 * - 失败测试详情
 * - 质量指标分析
 */

import fs from 'fs';
import path from 'path';

interface TestResult {
  name: string;
  status: 'passed' | 'failed';
  duration: number;
  error?: string;
}

interface PerformanceMetric {
  operation: string;
  iterations: number;
  totalTime: number;
  avgTime: number;
  throughput: number;
}

interface TestReport {
  timestamp: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    passRate: number;
  };
  testResults: TestResult[];
  performanceMetrics: PerformanceMetric[];
  issues: Array<{
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    recommendation?: string;
  }>;
}

export class StorageTestReportGenerator {
  private report: TestReport;
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
    this.report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        passRate: 0
      },
      testResults: [],
      performanceMetrics: [],
      issues: []
    };
  }

  /**
   * 添加测试结果
   */
  addTestResult(name: string, status: 'passed' | 'failed', duration: number, error?: string) {
    this.report.testResults.push({
      name,
      status,
      duration,
      error
    });

    this.report.summary.total++;
    if (status === 'passed') {
      this.report.summary.passed++;
    } else {
      this.report.summary.failed++;
    }

    this.report.summary.passRate =
      (this.report.summary.passed / this.report.summary.total) * 100;
  }

  /**
   * 添加性能指标
   */
  addPerformanceMetric(
    operation: string,
    iterations: number,
    totalTime: number
  ) {
    const avgTime = totalTime / iterations;
    const throughput = iterations / (totalTime / 1000);

    this.report.performanceMetrics.push({
      operation,
      iterations,
      totalTime,
      avgTime,
      throughput
    });

    // 检查性能问题
    if (operation.includes('LocalStorage 写入') && avgTime > 10) {
      this.addIssue('high', 'LocalStorage 写入性能低于预期', '考虑使用批量操作或切换到IndexedDB');
    }

    if (operation.includes('MemoryCache 读取') && avgTime > 1) {
      this.addIssue('medium', 'MemoryCache 读取性能可以优化', '检查LRU链表操作效率');
    }
  }

  /**
   * 添加问题
   */
  addIssue(
    severity: 'critical' | 'high' | 'medium' | 'low',
    description: string,
    recommendation?: string
  ) {
    this.report.issues.push({
      severity,
      description,
      recommendation
    });
  }

  /**
   * 生成Markdown报告
   */
  generateMarkdown(): string {
    const lines: string[] = [];

    // 标题
    lines.push('# Day 2 存储服务测试报告');
    lines.push('');
    lines.push(`**生成时间**: ${this.report.timestamp}`);
    lines.push('');

    // 执行摘要
    lines.push('## 📊 执行摘要');
    lines.push('');
    lines.push('| 指标 | 数值 |');
    lines.push('|------|------|');
    lines.push(`| 总测试数 | ${this.report.summary.total} |`);
    lines.push(`| 通过数 | ${this.report.summary.passed} |`);
    lines.push(`| 失败数 | ${this.report.summary.failed} |`);
    lines.push(`| 通过率 | ${this.report.summary.passRate.toFixed(2)}% |`);
    lines.push('');

    // 测试结果详情
    lines.push('## 🧪 测试结果详情');
    lines.push('');

    // 按服务分组
    const groupedTests = this.groupTestsByService();

    for (const [service, tests] of Object.entries(groupedTests)) {
      lines.push(`### ${service}`);
      lines.push('');

      tests.forEach(test => {
        const icon = test.status === 'passed' ? '✅' : '❌';
        lines.push(`- ${icon} **${test.name}** (${test.duration}ms)`);
        if (test.error) {
          lines.push(`  - 错误: ${test.error}`);
        }
      });
      lines.push('');
    }

    // 性能基准测试
    if (this.report.performanceMetrics.length > 0) {
      lines.push('## 🚀 性能基准测试');
      lines.push('');
      lines.push('| 操作 | 迭代次数 | 总时间 | 平均时间 | 吞吐量 |');
      lines.push('|------|---------|--------|----------|--------|');

      this.report.performanceMetrics.forEach(metric => {
        lines.push(
          `| ${metric.operation} | ${metric.iterations} | ${metric.totalTime.toFixed(2)}ms | ${metric.avgTime.toFixed(3)}ms | ${metric.throughput.toFixed(2)} ops/s |`
        );
      });
      lines.push('');

      // 性能分析
      lines.push('### 性能分析');
      lines.push('');

      const writeMetrics = this.report.performanceMetrics.filter(m => m.operation.includes('写入'));
      const readMetrics = this.report.performanceMetrics.filter(m => m.operation.includes('读取'));

      if (writeMetrics.length > 0) {
        const avgWriteTime = writeMetrics.reduce((sum, m) => sum + m.avgTime, 0) / writeMetrics.length;
        lines.push(`- **平均写入性能**: ${avgWriteTime.toFixed(3)}ms/op`);
        lines.push(`  - LocalStorage: ${writeMetrics.find(m => m.operation.includes('LocalStorage'))?.avgTime.toFixed(3) || 'N/A'}ms/op`);
        lines.push(`  - MemoryCache: ${writeMetrics.find(m => m.operation.includes('MemoryCache'))?.avgTime.toFixed(3) || 'N/A'}ms/op`);
      }

      if (readMetrics.length > 0) {
        const avgReadTime = readMetrics.reduce((sum, m) => sum + m.avgTime, 0) / readMetrics.length;
        lines.push(`- **平均读取性能**: ${avgReadTime.toFixed(3)}ms/op`);
        lines.push(`  - LocalStorage: ${readMetrics.find(m => m.operation.includes('LocalStorage'))?.avgTime.toFixed(3) || 'N/A'}ms/op`);
        lines.push(`  - MemoryCache: ${readMetrics.find(m => m.operation.includes('MemoryCache'))?.avgTime.toFixed(3) || 'N/A'}ms/op`);
      }

      lines.push('');
    }

    // 发现的问题
    if (this.report.issues.length > 0) {
      lines.push('## ⚠️ 发现的问题');
      lines.push('');

      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const sortedIssues = [...this.report.issues].sort(
        (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
      );

      const severityIcons = {
        critical: '🔴',
        high: '🟠',
        medium: '🟡',
        low: '🟢'
      };

      sortedIssues.forEach(issue => {
        lines.push(`### ${severityIcons[issue.severity]} ${issue.severity.toUpperCase()}`);
        lines.push('');
        lines.push(`**描述**: ${issue.description}`);
        if (issue.recommendation) {
          lines.push(`**建议**: ${issue.recommendation}`);
        }
        lines.push('');
      });
    } else {
      lines.push('## ✅ 质量评估');
      lines.push('');
      lines.push('未发现严重问题。所有测试通过，性能指标符合预期。');
      lines.push('');
    }

    // 结论
    lines.push('## 📝 结论');
    lines.push('');

    if (this.report.summary.passRate === 100) {
      lines.push('✅ **所有测试通过！** 存储服务实现符合质量标准，可以投入使用。');
    } else if (this.report.summary.passRate >= 95) {
      lines.push('⚠️ **大部分测试通过**。存在少量失败，需要修复后重新测试。');
    } else if (this.report.summary.passRate >= 80) {
      lines.push('❌ **测试通过率偏低**。存在较多问题，需要全面检查和修复。');
    } else {
      lines.push('🚨 **测试通过率严重不足**。存储服务存在严重问题，不建议投入使用。');
    }

    lines.push('');

    return lines.join('\n');
  }

  /**
   * 按服务分组测试
   */
  private groupTestsByService(): Record<string, TestResult[]> {
    const groups: Record<string, TestResult[]> = {};

    this.report.testResults.forEach(test => {
      let service = '其他';

      if (test.name.includes('LocalStorage')) {
        service = 'LocalStorage 服务';
      } else if (test.name.includes('MemoryCache')) {
        service = 'MemoryCache 服务';
      } else if (test.name.includes('IndexedDB')) {
        service = 'IndexedDB 服务';
      } else if (test.name.includes('Factory')) {
        service = 'StorageServiceFactory';
      } else if (test.name.includes('Performance')) {
        service = '性能测试';
      }

      if (!groups[service]) {
        groups[service] = [];
      }

      groups[service].push(test);
    });

    return groups;
  }

  /**
   * 保存报告到文件
   */
  async saveReport(outputPath: string) {
    const markdown = this.generateMarkdown();

    // 确保目录存在
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 写入文件
    fs.writeFileSync(outputPath, markdown, 'utf-8');

    console.log(`✅ 测试报告已生成: ${outputPath}`);
  }

  /**
   * 打印报告到控制台
   */
  printReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📋 测试报告');
    console.log('='.repeat(80));
    console.log(this.generateMarkdown());
    console.log('='.repeat(80) + '\n');
  }
}

export default StorageTestReportGenerator;
