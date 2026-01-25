/**
 * WebSocket 测试报告生成器
 *
 * 生成详细的测试报告，包括：
 * - 测试结果汇总
 * - 性能指标
 * - 稳定性指标
 * - 优化建议
 */

import * as fs from 'fs';
import * as path from 'path';

interface TestReportData {
  testSuite: string;
  testDate: string;
  environment: {
    nodeVersion: string;
    platform: string;
    architecture: string;
  };
  stabilityResults: StabilityTestResult[];
  performanceResults: PerformanceTestResult[];
  summary: {
    overallStatus: 'PASS' | 'FAIL' | 'CONDITIONAL_PASS';
    totalTests: number;
    passedTests: number;
    failedTests: number;
    passRate: number;
  };
  recommendations: string[];
}

interface StabilityTestResult {
  testName: string;
  status: 'PASS' | 'FAIL';
  duration: number;
  metrics: any;
  notes?: string;
}

interface PerformanceTestResult {
  testName: string;
  status: 'PASS' | 'FAIL';
  metrics: {
    latency?: {
      min: number;
      max: number;
      avg: number;
      p50: number;
      p95: number;
      p99: number;
    };
    throughput?: {
      messagesPerSecond: number;
    };
    resourceUsage?: {
      cpuPercent: number;
      memoryMB: number;
    };
  };
  notes?: string;
}

export class WebSocketTestReport {
  private reportData: TestReportData;

  constructor() {
    this.reportData = {
      testSuite: 'WebSocket Stability Test',
      testDate: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch
      },
      stabilityResults: [],
      performanceResults: [],
      summary: {
        overallStatus: 'PASS',
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        passRate: 0
      },
      recommendations: []
    };
  }

  /**
   * 添加稳定性测试结果
   */
  addStabilityResult(result: StabilityTestResult): void {
    this.reportData.stabilityResults.push(result);
    this.updateSummary();
  }

  /**
   * * 添加性能测试结果
   */
  addPerformanceResult(result: PerformanceTestResult): void {
    this.reportData.performanceResults.push(result);
    this.updateSummary();
  }

  /**
   * 更新测试摘要
   */
  private updateSummary(): void {
    const allResults = [
      ...this.reportData.stabilityResults,
      ...this.reportData.performanceResults
    ];

    this.reportData.summary.totalTests = allResults.length;
    this.reportData.summary.passedTests = allResults.filter(r => r.status === 'PASS').length;
    this.reportData.summary.failedTests = allResults.filter(r => r.status === 'FAIL').length;
    this.reportData.summary.passRate =
      this.reportData.summary.totalTests > 0
        ? (this.reportData.summary.passedTests / this.reportData.summary.totalTests) * 100
        : 0;

    // 确定整体状态
    if (this.reportData.summary.passRate >= 95) {
      this.reportData.summary.overallStatus = 'PASS';
    } else if (this.reportData.summary.passRate >= 80) {
      this.reportData.summary.overallStatus = 'CONDITIONAL_PASS';
    } else {
      this.reportData.summary.overallStatus = 'FAIL';
    }

    // 生成建议
    this.generateRecommendations();
  }

  /**
   * 生成优化建议
   */
  private generateRecommendations(): void {
    const recommendations: string[] = [];

    // 分析稳定性测试结果
    for (const result of this.reportData.stabilityResults) {
      if (result.status === 'FAIL') {
        switch (result.testName) {
          case 'Connection Stability':
            recommendations.push('实现连接池管理和自动重连机制');
            recommendations.push('添加连接健康检查和心跳优化');
            break;
          case 'Reconnection Mechanism':
            recommendations.push('优化重连策略，使用指数退避算法');
            recommendations.push('增加最大重连次数限制');
            break;
          case 'Heartbeat Detection':
            recommendations.push('调整心跳间隔，平衡网络负载和实时性');
            recommendations.push('实现心跳超时后的优雅降级');
            break;
          case 'Concurrent Connections':
            recommendations.push('优化连接管理，减少内存占用');
            recommendations.push('考虑实施连接数限制和排队机制');
            break;
          case 'Message Ordering':
            recommendations.push('实现消息序列号和去重机制');
            recommendations.push('添加消息缓存和重放保护');
            break;
        }
      }
    }

    // 分析性能测试结果
    for (const result of this.reportData.performanceResults) {
      if (result.status === 'FAIL') {
        if (result.metrics.latency?.p99 && result.metrics.latency.p99 > 100) {
          recommendations.push('优化消息处理逻辑，减少延迟');
          recommendations.push('考虑使用二进制协议替代 JSON');
        }
        if (result.metrics.throughput && result.metrics.throughput.messagesPerSecond < 100) {
          recommendations.push('实现消息批处理和管道化');
          recommendations.push('优化网络缓冲区大小');
        }
        if (result.metrics.resourceUsage?.cpuPercent && result.metrics.resourceUsage.cpuPercent > 20) {
          recommendations.push('优化消息序列化/反序列化性能');
          recommendations.push('使用对象池减少 GC 压力');
        }
        if (result.metrics.resourceUsage?.memoryMB && result.metrics.resourceUsage.memoryMB > 100) {
          recommendations.push('实施消息大小限制和流式处理');
          recommendations.push('优化内存管理，及时释放资源');
        }
      }
    }

    // 通用优化建议
    if (recommendations.length === 0) {
      recommendations.push('所有测试通过，建议在生产环境中持续监控');
      recommendations.push('定期进行压力测试，确保系统稳定性');
      recommendations.push('实施告警机制，及时发现异常');
    }

    this.reportData.recommendations = recommendations;
  }

  /**
   * 生成 Markdown 报告
   */
  generateMarkdownReport(): string {
    const md = [];

    // 标题
    md.push('# WebSocket 稳定性测试报告');
    md.push('');
    md.push('**Week 0 技术验证**');
    md.push('');
    md.push(`**测试日期**: ${this.reportData.testDate}`);
    md.push(`**测试状态**: ${this.getStatusBadge(this.reportData.summary.overallStatus)}`);
    md.push('');

    // 环境信息
    md.push('## 测试环境');
    md.push('');
    md.push('- **Node.js 版本**: ' + this.reportData.environment.nodeVersion);
    md.push('- **操作系统**: ' + this.reportData.environment.platform);
    md.push('- **系统架构**: ' + this.reportData.environment.architecture);
    md.push('');

    // 测试摘要
    md.push('## 测试摘要');
    md.push('');
    md.push(`- **总测试数**: ${this.reportData.summary.totalTests}`);
    md.push(`- **通过**: ${this.reportData.summary.passedTests}`);
    md.push(`- **失败**: ${this.reportData.summary.failedTests}`);
    md.push(`- **通过率**: ${this.reportData.summary.passRate.toFixed(2)}%`);
    md.push('');

    // 稳定性测试结果
    md.push('## 稳定性测试结果');
    md.push('');
    for (const result of this.reportData.stabilityResults) {
      md.push(`### ${result.testName}`);
      md.push('');
      md.push(`**状态**: ${getStatusIcon(result.status)} ${result.status}`);
      md.push('');
      md.push(`**持续时间**: ${result.duration}ms`);
      md.push('');
      md.push('**详细指标**:');
      md.push('```json');
      md.push(JSON.stringify(result.metrics, null, 2));
      md.push('```');
      if (result.notes) {
        md.push('');
        md.push(`**备注**: ${result.notes}`);
      }
      md.push('');
    }

    // 性能测试结果
    md.push('## 性能测试结果');
    md.push('');
    for (const result of this.reportData.performanceResults) {
      md.push(`### ${result.testName}`);
      md.push('');
      md.push(`**状态**: ${getStatusIcon(result.status)} ${result.status}`);
      md.push('');

      if (result.metrics.latency) {
        md.push('**延迟指标**:');
        md.push(`- 最小: ${result.metrics.latency.min}ms`);
        md.push(`- 平均: ${result.metrics.latency.avg.toFixed(2)}ms`);
        md.push(`- P50: ${result.metrics.latency.p50}ms`);
        md.push(`- P95: ${result.metrics.latency.p95}ms`);
        md.push(`- P99: ${result.metrics.latency.p99}ms`);
        md.push(`- 最大: ${result.metrics.latency.max}ms`);
        md.push('');
      }

      if (result.metrics.throughput) {
        md.push('**吞吐量**:');
        md.push(`- ${result.metrics.throughput.messagesPerSecond.toFixed(2)} msg/s`);
        md.push('');
      }

      if (result.metrics.resourceUsage) {
        md.push('**资源使用**:');
        md.push(`- CPU: ${result.metrics.resourceUsage.cpuPercent.toFixed(2)}%`);
        md.push(`- 内存: ${result.metrics.resourceUsage.memoryMB.toFixed(2)}MB`);
        md.push('');
      }

      if (result.notes) {
        md.push(`**备注**: ${result.notes}`);
      }
      md.push('');
    }

    // 优化建议
    md.push('## 优化建议');
    md.push('');
    for (let i = 0; i < this.reportData.recommendations.length; i++) {
      md.push(`${i + 1}. ${this.reportData.recommendations[i]}`);
    }
    md.push('');

    // 结论
    md.push('## 验证结论');
    md.push('');
    switch (this.reportData.summary.overallStatus) {
      case 'PASS':
        md.push('**✅ 通过** - WebSocket 实现满足所有稳定性要求，可以进入 Phase 2 开发。');
        break;
      case 'CONDITIONAL_PASS':
        md.push('**⚠️ 有条件通过** - WebSocket 实现基本满足要求，但建议完成优化后再进入 Phase 2。');
        break;
      case 'FAIL':
        md.push('**❌ 不通过** - WebSocket 实现存在严重问题，必须修复后才能进入 Phase 2。');
        break;
    }
    md.push('');

    return md.join('\n');
  }

  /**
   * 保存报告到文件
   */
  saveReport(outputDir: string = './test-results'): string {
    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 生成文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `websocket-test-report-${timestamp}.md`;
    const filepath = path.join(outputDir, filename);

    // 生成并保存报告
    const markdown = this.generateMarkdownReport();
    fs.writeFileSync(filepath, markdown, 'utf-8');

    console.log(`\n[Report] Test report saved to: ${filepath}`);

    return filepath;
  }

  /**
   * 获取状态徽章
   */
  private getStatusBadge(status: string): string {
    switch (status) {
      case 'PASS':
        return '✅ 通过';
      case 'CONDITIONAL_PASS':
        return '⚠️ 有条件通过';
      case 'FAIL':
        return '❌ 不通过';
      default:
        return status;
    }
  }
}

/**
 * 获取状态图标
 */
function getStatusIcon(status: string): string {
  switch (status) {
    case 'PASS':
      return '✅';
    case 'FAIL':
      return '❌';
    default:
      return '❓';
  }
}

export default WebSocketTestReport;
