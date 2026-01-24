#!/usr/bin/env node

/**
 * ExcelMind AI 性能对比分析工具
 *
 * 用途:
 * - 对比两次性能测试结果
 * - 生成性能变化报告
 * - 识别性能回归
 * - 可视化性能趋势
 *
 * 使用方法:
 * node scripts/performance-comparator.js <before.json> <after.json> [options]
 *
 * @author Performance Testing Expert
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// 配置
// ============================================================================

const CONFIG = {
  colors: {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
  },
  thresholds: {
    significant: 10, // 显著变化阈值 (%)
    critical: 25,    // 严重变化阈值 (%)
  },
};

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 彩色日志输出
 */
const log = {
  info: (msg) => console.log(`${CONFIG.colors.cyan}[INFO]${CONFIG.colors.reset} ${msg}`),
  success: (msg) => console.log(`${CONFIG.colors.green}[SUCCESS]${CONFIG.colors.reset} ${msg}`),
  warning: (msg) => console.log(`${CONFIG.colors.yellow}[WARNING]${CONFIG.colors.reset} ${msg}`),
  error: (msg) => console.log(`${CONFIG.colors.red}[ERROR]${CONFIG.colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${CONFIG.colors.bright}${CONFIG.colors.cyan}${'='.repeat(70)}`),
  subheader: (msg) => console.log(`${msg}${CONFIG.colors.reset}\n`),
};

/**
 * 读取JSON文件
 */
function readJSON(filePath) {
  if (!fs.existsSync(filePath)) {
    log.error(`文件不存在: ${filePath}`);
    process.exit(1);
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    log.error(`读取文件失败: ${filePath}`);
    log.error(error.message);
    process.exit(1);
  }
}

/**
 * 计算变化百分比
 */
function calculateChange(before, after) {
  if (before === 0) return after === 0 ? 0 : 100;
  return ((after - before) / before) * 100;
}

/**
 * 格式化数字
 */
function formatNumber(num, decimals = 2) {
  return Number(num).toFixed(decimals);
}

/**
 * 格式化百分比
 */
function formatPercent(value) {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${formatNumber(value)}%`;
}

/**
 * 获取变化等级
 */
function getChangeLevel(change, metric) {
  const absChange = Math.abs(change);

  // 对于时间、内存等指标，负值是好的（减少）
  const isGood = (metric === 'duration' || metric === 'memory') ? change < 0 : change > 0;

  if (absChange >= CONFIG.thresholds.critical) {
    return { level: 'critical', isGood: isGood, icon: isGood ? '🚀' : '🔴' };
  } else if (absChange >= CONFIG.thresholds.significant) {
    return { level: 'significant', isGood: isGood, icon: isGood ? '✅' : '⚠️' };
  } else {
    return { level: 'normal', isGood: true, icon: '➡️' };
  }
}

// ============================================================================
// 性能对比分析器
// ============================================================================

class PerformanceComparator {
  constructor(beforeResults, afterResults) {
    this.before = beforeResults;
    this.after = afterResults;
    this.comparisons = [];
    this.summary = {
      total: 0,
      improved: 0,
      degraded: 0,
      stable: 0,
      critical: 0,
    };
  }

  /**
   * 执行对比分析
   */
  compare() {
    log.header('ExcelMind AI 性能对比分析');
    log.subheader(`${this.before.timestamp} → ${this.after.timestamp}`);

    // 构建测试映射
    const beforeTests = new Map(
      this.before.tests.map(t => [t.name, t])
    );
    const afterTests = new Map(
      this.after.tests.map(t => [t.name, t])
    );

    // 找出所有测试
    const allTestNames = new Set([
      ...this.before.tests.map(t => t.name),
      ...this.after.tests.map(t => t.name),
    ]);

    // 逐个对比
    allTestNames.forEach(testName => {
      const beforeTest = beforeTests.get(testName);
      const afterTest = afterTests.get(testName);

      if (!beforeTest) {
        this.comparisons.push({
          name: testName,
          status: 'new',
          after: afterTest,
          change: null,
        });
        this.summary.total++;
        return;
      }

      if (!afterTest) {
        this.comparisons.push({
          name: testName,
          status: 'removed',
          before: beforeTest,
          change: null,
        });
        this.summary.total++;
        return;
      }

      // 计算变化
      const change = calculateChange(beforeTest.value, afterTest.value);
      const level = getChangeLevel(change, beforeTest.metric);

      const comparison = {
        name: testName,
        category: beforeTest.category,
        status: 'compared',
        before: beforeTest.value,
        after: afterTest.value,
        unit: beforeTest.unit,
        metric: beforeTest.metric,
        change,
        level,
      };

      this.comparisons.push(comparison);
      this.summary.total++;

      // 统计
      if (level.level === 'critical' && !level.isGood) {
        this.summary.critical++;
      }
      if (level.level === 'critical' || level.level === 'significant') {
        if (level.isGood) {
          this.summary.improved++;
        } else {
          this.summary.degraded++;
        }
      } else {
        this.summary.stable++;
      }
    });

    return this;
  }

  /**
   * 打印对比结果
   */
  printResults() {
    console.log(`\n总测试数: ${this.summary.total}`);
    console.log(`${CONFIG.colors.green}性能提升: ${this.summary.improved}${CONFIG.colors.reset}`);
    console.log(`${CONFIG.colors.red}性能下降: ${this.summary.degraded}${CONFIG.colors.reset}`);
    console.log(`${CONFIG.colors.cyan}保持稳定: ${this.summary.stable}${CONFIG.colors.reset}`);
    console.log(`${CONFIG.colors.red}严重回归: ${this.summary.critical}${CONFIG.colors.reset}`);

    // 按类别分组
    const byCategory = this.groupByCategory();

    Object.entries(byCategory).forEach(([category, comparisons]) => {
      this.printCategoryComparison(category, comparisons);
    });

    // 打印关键变化
    this.printKeyChanges();

    // 打印新增/移除的测试
    this.printAddedRemovedTests();
  }

  /**
   * 按类别分组
   */
  groupByCategory() {
    const grouped = {};
    this.comparisons
      .filter(c => c.status === 'compared')
      .forEach(comparison => {
        if (!grouped[comparison.category]) {
          grouped[comparison.category] = [];
        }
        grouped[comparison.category].push(comparison);
      });
    return grouped;
  }

  /**
   * 打印类别对比
   */
  printCategoryComparison(category, comparisons) {
    console.log(`\n${CONFIG.colors.bright}${CONFIG.colors.cyan}【${category.toUpperCase()}】${CONFIG.colors.reset}`);

    // 表头
    console.log(`\n${'测试名称'.padEnd(30)} ${'基线'.padStart(10)} ${'当前'.padStart(10)} ${'变化'.padStart(12)}`);

    comparisons.forEach(comp => {
      const { name, before, after, unit, change, level } = comp;

      const changeStr = formatPercent(change);
      const icon = level.icon;
      const color = level.isGood ? CONFIG.colors.green : CONFIG.colors.red;

      console.log(
        `${name.padEnd(30)} ` +
        `${before.toFixed(2).padStart(10)} ` +
        `${after.toFixed(2).padStart(10)} ` +
        `${color}${icon} ${changeStr.padStart(8)}${CONFIG.colors.reset}`
      );
    });
  }

  /**
   * 打印关键变化
   */
  printKeyChanges() {
    const significantChanges = this.comparisons.filter(
      c => c.status === 'compared' &&
           Math.abs(c.change) >= CONFIG.thresholds.significant
    );

    if (significantChanges.length === 0) {
      console.log(`\n${CONFIG.colors.green}✅ 所有性能指标都在正常范围内${CONFIG.colors.reset}`);
      return;
    }

    console.log(`\n${CONFIG.colors.bright}关键性能变化:${CONFIG.colors.reset}\n`);

    // 性能提升
    const improvements = significantChanges.filter(c => c.level.isGood);
    if (improvements.length > 0) {
      console.log(`${CONFIG.colors.green}🚀 性能提升 (${improvements.length}):${CONFIG.colors.reset}`);
      improvements
        .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
        .slice(0, 10)
        .forEach(comp => {
          console.log(`  - ${comp.name}: ${comp.before} → ${comp.after} (${formatPercent(comp.change)})`);
        });
    }

    // 性能下降
    const degradations = significantChanges.filter(c => !c.level.isGood);
    if (degradations.length > 0) {
      console.log(`\n${CONFIG.colors.red}⚠️ 性能下降 (${degradations.length}):${CONFIG.colors.reset}`);
      degradations
        .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
        .slice(0, 10)
        .forEach(comp => {
          console.log(`  - ${comp.name}: ${comp.before} → ${comp.after} (${formatPercent(comp.change)})`);
        });
    }

    // 严重回归
    const critical = degradations.filter(c => c.level.level === 'critical');
    if (critical.length > 0) {
      console.log(`\n${CONFIG.colors.red}🔴 严重性能回归 (${critical.length}) - 需要立即处理:${CONFIG.colors.reset}`);
      critical.forEach(comp => {
        console.log(`  - ${comp.name}: ${formatPercent(comp.change)} 下降`);
      });
    }
  }

  /**
   * 打印新增/移除的测试
   */
  printAddedRemovedTests() {
    const newTests = this.comparisons.filter(c => c.status === 'new');
    const removedTests = this.comparisons.filter(c => c.status === 'removed');

    if (newTests.length > 0) {
      console.log(`\n${CONFIG.colors.green}新增测试 (${newTests.length}):${CONFIG.colors.reset}`);
      newTests.forEach(test => {
        console.log(`  + ${test.name}: ${test.after.value} ${test.after.unit}`);
      });
    }

    if (removedTests.length > 0) {
      console.log(`\n${CONFIG.colors.yellow}移除测试 (${removedTests.length}):${CONFIG.colors.reset}`);
      removedTests.forEach(test => {
        console.log(`  - ${test.name}: ${test.before.value} ${test.before.unit}`);
      });
    }
  }

  /**
   * 生成对比报告
   */
  generateReport(outputPath) {
    const report = {
      timestamp: new Date().toISOString(),
      before: this.before.timestamp,
      after: this.after.timestamp,
      summary: this.summary,
      comparisons: this.comparisons,
    };

    ensureDir(path.dirname(outputPath));
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf8');

    log.success(`\n对比报告已生成: ${outputPath}`);
  }

  /**
   * 生成HTML报告
   */
  generateHTMLReport(outputPath) {
    const html = this.generateHTMLContent();
    ensureDir(path.dirname(outputPath));
    fs.writeFileSync(outputPath, html, 'utf8');

    log.success(`HTML报告已生成: ${outputPath}`);
  }

  /**
   * 生成HTML内容
   */
  generateHTMLContent() {
    const { summary, comparisons, before, after } = this;

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ExcelMind AI 性能对比报告</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      padding: 30px;
    }
    h1 { color: #333; margin-bottom: 10px; }
    .subtitle { color: #666; margin-bottom: 30px; }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .summary-card {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 6px;
      text-align: center;
    }
    .summary-card h3 { font-size: 14px; color: #666; margin-bottom: 10px; }
    .summary-card .value { font-size: 32px; font-weight: bold; }
    .improved .value { color: #28a745; }
    .degraded .value { color: #dc3545; }
    .stable .value { color: #6c757d; }
    .critical .value { color: #dc3545; }
    .section { margin-bottom: 40px; }
    .section h2 {
      font-size: 18px;
      margin-bottom: 15px;
      color: #333;
      border-bottom: 2px solid #007bff;
      padding-bottom: 10px;
    }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f8f9fa; font-weight: 600; }
    .change-positive { color: #dc3545; }
    .change-negative { color: #28a745; }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }
    .badge.improved { background: #d4edda; color: #155724; }
    .badge.degraded { background: #f8d7da; color: #721c24; }
    .badge.stable { background: #e2e3e5; color: #383d41; }
    .badge.critical { background: #f5c6cb; color: #721c24; }
    .chart {
      height: 200px;
      display: flex;
      align-items: flex-end;
      gap: 20px;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 6px;
    }
    .bar-group {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .bar {
      width: 60px;
      background: linear-gradient(180deg, #007bff, #0056b3);
      border-radius: 4px 4px 0 0;
      transition: height 0.3s ease;
      position: relative;
    }
    .bar.after {
      background: linear-gradient(180deg, #28a745, #1e7e34);
    }
    .bar-label {
      margin-top: 10px;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
    .bar-value {
      position: absolute;
      top: -25px;
      font-size: 12px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>ExcelMind AI 性能对比报告</h1>
    <p class="subtitle">
      ${before.timestamp} → ${after.timestamp}
    </p>

    <div class="summary">
      <div class="summary-card">
        <h3>总测试数</h3>
        <div class="value">${summary.total}</div>
      </div>
      <div class="summary-card improved">
        <h3>性能提升</h3>
        <div class="value">${summary.improved}</div>
      </div>
      <div class="summary-card degraded">
        <h3>性能下降</h3>
        <div class="value">${summary.degraded}</div>
      </div>
      <div class="summary-card stable">
        <h3>保持稳定</h3>
        <div class="value">${summary.stable}</div>
      </div>
      <div class="summary-card critical">
        <h3>严重回归</h3>
        <div class="value">${summary.critical}</div>
      </div>
    </div>

    ${this.generateComparisonsHTML()}
  </div>
</body>
</html>`;
  }

  /**
   * 生成对比结果HTML
   */
  generateComparisonsHTML() {
    const byCategory = this.groupByCategory();
    let html = '';

    Object.entries(byCategory).forEach(([category, comparisons]) => {
      html += `
    <div class="section">
      <h2>${category.toUpperCase()}</h2>
      <table>
        <thead>
          <tr>
            <th>测试名称</th>
            <th>基线</th>
            <th>当前</th>
            <th>变化</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
      `;

      comparisons.forEach(comp => {
        const { name, before, after, unit, change, level } = comp;
        const changeClass = change > 0 ? 'change-positive' : 'change-negative';
        const badgeClass = level.level === 'critical' ? 'critical' :
                          level.level === 'significant' ? (level.isGood ? 'improved' : 'degraded') : 'stable';
        const badgeText = level.level === 'critical' ? '严重' :
                         level.level === 'significant' ? (level.isGood ? '提升' : '下降') : '稳定';

        html += `
          <tr>
            <td>${name}</td>
            <td>${before.toFixed(2)} ${unit}</td>
            <td>${after.toFixed(2)} ${unit}</td>
            <td class="${changeClass}">${formatPercent(change)}</td>
            <td><span class="badge ${badgeClass}">${badgeText}</span></td>
          </tr>
        `;
      });

      html += `
        </tbody>
      </table>
    </div>
      `;
    });

    return html;
  }
}

/**
 * 确保目录存在
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ============================================================================
// 命令行接口
// ============================================================================

function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('用法: node performance-comparator.js <before.json> <after.json> [options]');
    console.log('');
    console.log('选项:');
    console.log('  --report <path>     生成JSON对比报告');
    console.log('  --html <path>       生成HTML对比报告');
    console.log('');
    console.log('示例:');
    console.log('  node performance-comparator.js before.json after.json');
    console.log('  node performance-comparator.js before.json after.json --report comparison.json');
    console.log('  node performance-comparator.js before.json after.json --html comparison.html');
    process.exit(1);
  }

  const beforePath = args[0];
  const afterPath = args[1];
  const reportPath = args.indexOf('--report') >= 0 ? args[args.indexOf('--report') + 1] : null;
  const htmlPath = args.indexOf('--html') >= 0 ? args[args.indexOf('--html') + 1] : null;

  // 读取数据
  const beforeResults = readJSON(beforePath);
  const afterResults = readJSON(afterPath);

  // 执行对比
  const comparator = new PerformanceComparator(beforeResults, afterResults);
  comparator.compare();
  comparator.printResults();

  // 生成报告
  if (reportPath) {
    comparator.generateReport(reportPath);
  }

  if (htmlPath) {
    comparator.generateHTMLReport(htmlPath);
  }

  // 检查严重回归
  if (comparator.summary.critical > 0) {
    log.error(`\n检测到 ${comparator.summary.critical} 个严重性能回归！`);
    process.exit(1);
  }
}

// 运行
if (require.main === module) {
  main();
}

module.exports = { PerformanceComparator };
