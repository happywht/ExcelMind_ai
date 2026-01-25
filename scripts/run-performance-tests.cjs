#!/usr/bin/env node

/**
 * 性能测试快速启动脚本
 *
 * 用法:
 *   node scripts/run-performance-tests.cjs                    # 运行所有测试
 *   node scripts/run-performance-tests.cjs --quick            # 快速测试
 *   node scripts/run-performance-tests.cjs --update-baseline  # 更新基线
 *   node scripts/run-performance-tests.cjs --compare          # 对比基线
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const isQuick = args.includes('--quick');
const updateBaseline = args.includes('--update-baseline');
const compareBaseline = args.includes('--compare') || !args.includes('--no-compare');
const verbose = args.includes('--verbose');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(80));
  log(title, 'bright');
  console.log('='.repeat(80));
}

// 检查依赖
function checkDependencies() {
  logSection('检查依赖');

  const requiredPackages = [
    '@types/jest',
    'jest',
    'ts-jest'
  ];

  for (const pkg of requiredPackages) {
    try {
      require.resolve(pkg);
      log(`✓ ${pkg}`, 'green');
    } catch (error) {
      log(`✗ ${pkg} 未安装`, 'red');
      log('请运行: npm install', 'yellow');
      process.exit(1);
    }
  }
}

// 创建结果目录
function prepareDirectories() {
  const dirs = [
    path.join(process.cwd(), 'test-results'),
    path.join(process.cwd(), 'test-results', 'performance')
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      log(`✓ 创建目录: ${dir}`, 'green');
    }
  }
}

// 运行性能测试
function runPerformanceTests() {
  logSection('运行性能基准测试');

  const testPattern = isQuick
    ? 'tests/performance/*.test.{ts,tsx}'
    : 'tests/performance/**/*.test.{ts,tsx}';

  const jestArgs = [
    `--testPathPattern="${testPattern}"`,
    '--verbose',
    '--no-coverage'
  ];

  if (verbose) {
    log('Jest 参数:', 'blue');
    console.log(jestArgs.join(' '));
  }

  try {
    const startTime = Date.now();
    execSync(`npx jest ${jestArgs.join(' ')}`, {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'test' }
    });
    const duration = Date.now() - startTime;

    logSection('测试完成');
    log(`总耗时: ${(duration / 1000).toFixed(2)}秒`, 'green');
  } catch (error) {
    logSection('测试失败');
    log('性能测试运行失败', 'red');
    log('\n请检查错误信息并重试', 'yellow');
    process.exit(1);
  }
}

// 显示报告位置
function showReportLocation() {
  logSection('性能报告');

  const reportDir = path.join(process.cwd(), 'test-results', 'performance');
  const reports = [
    { name: 'Markdown 报告', file: 'PERFORMANCE_REPORT.md' },
    { name: 'JSON 数据', file: 'performance-report.json' },
    { name: '对比报告', file: 'PERFORMANCE_COMPARISON.md' }
  ];

  for (const report of reports) {
    const reportPath = path.join(reportDir, report.file);
    if (fs.existsSync(reportPath)) {
      log(`✓ ${report.name}: ${reportPath}`, 'green');
    } else {
      log(`○ ${report.name}: 未生成`, 'yellow');
    }
  }

  console.log('');
  log('提示: 运行 --compare 以查看与基线的对比', 'blue');
}

// 更新基线
function updateBaseline() {
  logSection('更新性能基线');

  const baselinePath = path.join(process.cwd(), 'test-results', 'performance-baseline.json');
  const reportPath = path.join(process.cwd(), 'test-results', 'performance', 'performance-report.json');

  if (!fs.existsSync(reportPath)) {
    log('错误: 未找到性能报告，无法更新基线', 'red');
    log('请先运行性能测试', 'yellow');
    process.exit(1);
  }

  try {
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
    const baseline = {
      timestamp: report.timestamp,
      tests: report.tests.map(test => ({
        name: test.name,
        average: test.average,
        threshold: test.threshold
      }))
    };

    fs.writeFileSync(baselinePath, JSON.stringify(baseline, null, 2));
    log(`✓ 基线已保存: ${baselinePath}`, 'green');
    log(`✓ 测试时间: ${new Date(baseline.timestamp).toLocaleString()}`, 'green');
  } catch (error) {
    log('错误: 无法保存基线数据', 'red');
    console.error(error);
    process.exit(1);
  }
}

// 对比基线
function compareToBaseline() {
  logSection('对比性能基线');

  const baselinePath = path.join(process.cwd(), 'test-results', 'performance-baseline.json');
  const reportPath = path.join(process.cwd(), 'test-results', 'performance', 'performance-report.json');

  if (!fs.existsSync(baselinePath)) {
    log('提示: 未找到基线数据', 'yellow');
    log('运行 --update-baseline 以创建基线', 'blue');
    return;
  }

  if (!fs.existsSync(reportPath)) {
    log('错误: 未找到性能报告', 'red');
    log('请先运行性能测试', 'yellow');
    return;
  }

  try {
    const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf-8'));
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));

    let improved = 0;
    let degraded = 0;
    let stable = 0;

    console.log('');
    console.log('性能对比结果:');
    console.log('');

    for (const currentTest of report.tests) {
      const baselineTest = baseline.tests.find(t => t.name === currentTest.name);
      if (!baselineTest) continue;

      const change = currentTest.average - baselineTest.average;
      const changePercent = (change / baselineTest.average) * 100;

      if (change < -10) {
        log(`✓ ${currentTest.name}`, 'green');
        console.log(`  改进: ${changePercent.toFixed(1)}% (${currentTest.average.toFixed(2)}ms vs ${baselineTest.average.toFixed(2)}ms)`);
        improved++;
      } else if (change > 10) {
        log(`✗ ${currentTest.name}`, 'red');
        console.log(`  退化: +${changePercent.toFixed(1)}% (${currentTest.average.toFixed(2)}ms vs ${baselineTest.average.toFixed(2)}ms)`);
        degraded++;
      } else {
        log(`→ ${currentTest.name}`, 'yellow');
        console.log(`  稳定: ${changePercent.toFixed(1)}%`);
        stable++;
      }
      console.log('');
    }

    console.log('摘要:');
    console.log(`  改进: ${improved}`);
    console.log(`  退化: ${degraded}`);
    console.log(`  稳定: ${stable}`);
    console.log('');

  } catch (error) {
    log('错误: 无法对比基线', 'red');
    console.error(error);
  }
}

// 显示帮助
function showHelp() {
  logSection('性能测试帮助');

  console.log(`
用法:
  node scripts/run-performance-tests.cjs [选项]

选项:
  --quick               运行快速测试（较少迭代）
  --update-baseline     更新性能基线
  --compare             与基线对比（默认启用）
  --no-compare          不与基线对比
  --verbose             显示详细输出
  --help                显示帮助信息

示例:
  node scripts/run-performance-tests.cjs                    # 运行所有测试
  node scripts/run-performance-tests.cjs --quick            # 快速测试
  node scripts/run-performance-tests.cjs --update-baseline  # 更新基线
  node scripts/run-performance-tests.cjs --compare          # 对比基线

报告位置:
  test-results/performance/PERFORMANCE_REPORT.md
  test-results/performance/performance-report.json
  test-results/performance/PERFORMANCE_COMPARISON.md
  `);
}

// 主函数
function main() {
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }

  log('ExcelMind AI - 性能基准测试', 'bright');
  log('版本: 1.0.0', 'blue');

  // 准备环境
  checkDependencies();
  prepareDirectories();

  // 运行测试
  runPerformanceTests();

  // 显示报告
  showReportLocation();

  // 处理基线
  if (updateBaseline) {
    updateBaseline();
  } else if (compareBaseline) {
    compareToBaseline();
  }

  logSection('完成');
  log('所有性能测试已完成', 'green');
}

// 运行
try {
  main();
} catch (error) {
  log('错误: ' + error.message, 'red');
  console.error(error);
  process.exit(1);
}
