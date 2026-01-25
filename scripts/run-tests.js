/**
 * 测试执行脚本
 * 提供便捷的测试执行和报告生成功能
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function printHeader(title) {
  console.log('');
  log('═'.repeat(60), 'cyan');
  log(`  ${title}`, 'cyan');
  log('═'.repeat(60), 'cyan');
  console.log('');
}

// 获取项目根目录
const projectRoot = process.cwd();

// 测试命令
const testCommands = {
  unit: 'jest --testPathPattern=unit',
  integration: 'jest --testPathPattern=integration',
  regression: 'jest --testPathPattern=regression',
  performance: 'jest --testPathPattern=performance',
  coverage: 'jest --coverage',
  all: 'jest --testPathPattern="(unit|integration|regression)"',
  watch: 'jest --watch',
  ci: 'jest --ci --coverage --maxWorkers=2'
};

// 执行测试
function runTests(type) {
  const command = testCommands[type];

  if (!command) {
    log(`❌ 未知的测试类型: ${type}`, 'red');
    process.exit(1);
  }

  printHeader(`运行 ${type.toUpperCase()} 测试`);
  log(`命令: ${command}`, 'blue');
  console.log('');

  try {
    const startTime = Date.now();
    execSync(command, {
      cwd: projectRoot,
      stdio: 'inherit'
    });
    const duration = Date.now() - startTime;

    console.log('');
    log(`✅ ${type.toUpperCase()} 测试完成 (${(duration / 1000).toFixed(2)}s)`, 'green');
    return true;
  } catch (error) {
    console.log('');
    log(`❌ ${type.toUpperCase()} 测试失败`, 'red');
    return false;
  }
}

// 生成报告
function generateReport() {
  printHeader('生成测试报告');

  const reportsDir = path.join(projectRoot, 'test-reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  // 运行测试并生成覆盖率
  log('运行测试并收集覆盖率...', 'blue');
  const success = runTests('coverage');

  if (success) {
    log('✅ 测试报告已生成', 'green');
    log(`📄 覆盖率报告: ${path.join(projectRoot, 'coverage', 'index.html')}`, 'cyan');
  }

  return success;
}

// 检查覆盖率
function checkCoverage() {
  printHeader('检查覆盖率阈值');

  const thresholds = {
    statements: 90,
    branches: 85,
    functions: 95,
    lines: 90
  };

  log('覆盖率阈值:', 'yellow');
  log(`  - 语句: ${thresholds.statements}%`, 'yellow');
  log(`  - 分支: ${thresholds.branches}%`, 'yellow');
  log(`  - 函数: ${thresholds.functions}%`, 'yellow');
  log(`  - 行: ${thresholds.lines}%`, 'yellow');
  console.log('');

  const thresholdArg = JSON.stringify({
    global: thresholds
  }).replace(/"/g, "'");

  const command = `jest --coverage --coverageThreshold=${thresholdArg}`;

  try {
    execSync(command, {
      cwd: projectRoot,
      stdio: 'inherit'
    });

    log('✅ 覆盖率检查通过', 'green');
    return true;
  } catch (error) {
    log('❌ 覆盖率检查失败', 'red');
    return false;
  }
}

// 运行完整测试套件
async function runFullSuite() {
  printHeader('运行完整测试套件');

  const results = {};

  for (const [type, command] of Object.entries(testCommands)) {
    if (['watch', 'ci'].includes(type)) continue;

    log(`▶️  运行 ${type.toUpperCase()} 测试...`, 'blue');
    results[type] = runTests(type);
    console.log('');
  }

  // 汇总结果
  printHeader('测试结果汇总');

  for (const [type, passed] of Object.entries(results)) {
    const status = passed ? '✅ 通过' : '❌ 失败';
    const color = passed ? 'green' : 'red';
    log(`  ${type.padEnd(15)}: ${status}`, color);
  }

  console.log('');

  const allPassed = Object.values(results).every(r => r);

  if (allPassed) {
    log('🎉 所有测试通过！', 'green');
  } else {
    log('⚠️  存在失败的测试', 'yellow');
  }

  return allPassed;
}

// 清理测试文件
function cleanTests() {
  printHeader('清理测试文件');

  const dirsToClean = [
    'coverage',
    'test-reports',
    '.test-results'
  ];

  for (const dir of dirsToClean) {
    const fullPath = path.join(projectRoot, dir);
    if (fs.existsSync(fullPath)) {
      fs.rmSync(fullPath, { recursive: true, force: true });
      log(`✓ 已清理: ${dir}`, 'green');
    }
  }

  log('✅ 清理完成', 'green');
}

// 显示帮助
function showHelp() {
  printHeader('测试命令帮助');

  log('可用命令:', 'yellow');
  console.log('');

  const commands = [
    ['unit', '运行单元测试'],
    ['integration', '运行集成测试'],
    ['regression', '运行回归测试'],
    ['performance', '运行性能测试'],
    ['coverage', '生成覆盖率报告'],
    ['all', '运行完整测试套件'],
    ['watch', '监视模式'],
    ['ci', 'CI模式（用于自动化）'],
    ['report', '生成完整测试报告'],
    ['check', '检查覆盖率是否达标'],
    ['clean', '清理测试文件'],
    ['help', '显示此帮助信息']
  ];

  for (const [cmd, desc] of commands) {
    log(`  ${cmd.padEnd(15)} - ${desc}`, 'cyan');
  }

  console.log('');
  log('示例:', 'yellow');
  log(`  node scripts/run-tests.js unit`, 'cyan');
  log(`  node scripts/run-tests.js coverage`, 'cyan');
  log(`  node scripts/run-tests.js report`, 'cyan');
  console.log('');
}

// 主函数
async function main() {
  const command = process.argv[2] || 'help';

  switch (command) {
    case 'unit':
    case 'integration':
    case 'regression':
    case 'performance':
    case 'coverage':
    case 'all':
    case 'watch':
    case 'ci':
      runTests(command);
      break;

    case 'report':
      generateReport();
      break;

    case 'check':
      checkCoverage();
      break;

    case 'clean':
      cleanTests();
      break;

    case 'full':
      await runFullSuite();
      break;

    case 'help':
    default:
      showHelp();
      break;
  }
}

// 运行
main().catch(error => {
  log(`❌ 错误: ${error.message}`, 'red');
  process.exit(1);
});
