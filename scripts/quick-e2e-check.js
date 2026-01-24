/**
 * 快速 E2E 测试检查和执行脚本
 *
 * 用途: 快速验证测试环境并运行关键测试
 * 作者: Senior QA Engineer
 * 版本: 1.0.0
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
  console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}${title}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
}

function printSection(title) {
  console.log(`\n${colors.bright}${colors.blue}▶ ${title}${colors.reset}\n`);
}

// 检查项目路径
function checkProjectPath() {
  printSection('1. 检查项目路径');

  const projectPath = process.cwd();
  log(`当前工作目录: ${projectPath}`, 'cyan');

  const requiredFiles = [
    'package.json',
    'playwright.config.ts',
    'tests/e2e'
  ];

  let allExist = true;
  for (const file of requiredFiles) {
    const filePath = path.join(projectPath, file);
    const exists = fs.existsSync(filePath);
    const status = exists ? '✓' : '✗';
    const color = exists ? 'green' : 'red';
    log(`${status} ${file}`, color);
    if (!exists) allExist = false;
  }

  if (!allExist) {
    log('\n错误: 项目结构不完整', 'red');
    return false;
  }

  log('✓ 项目结构完整', 'green');
  return true;
}

// 检查 Node.js 环境
function checkNodeEnvironment() {
  printSection('2. 检查 Node.js 环境');

  try {
    const nodeVersion = process.version;
    log(`Node.js 版本: ${nodeVersion}`, 'cyan');

    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    if (majorVersion < 18) {
      log('警告: Node.js 版本过低，建议使用 v18 或更高版本', 'yellow');
    } else {
      log('✓ Node.js 版本符合要求', 'green');
    }

    return true;
  } catch (error) {
    log('✗ 无法检查 Node.js 版本', 'red');
    return false;
  }
}

// 检查依赖安装
function checkDependencies() {
  printSection('3. 检查依赖安装');

  const requiredPackages = [
    { name: '@playwright/test', command: 'npx playwright --version' },
    { name: 'playwright', command: 'npx playwright --version' }
  ];

  let allInstalled = true;
  for (const pkg of requiredPackages) {
    try {
      const output = execSync(pkg.command, { encoding: 'utf-8', stdio: 'pipe' });
      log(`✓ ${pkg.name}: ${output.trim()}`, 'green');
    } catch (error) {
      log(`✗ ${pkg.name}: 未安装`, 'red');
      allInstalled = false;
    }
  }

  if (!allInstalled) {
    log('\n提示: 运行 pnpm install 安装依赖', 'yellow');
  }

  return allInstalled;
}

// 检查测试文件
function checkTestFiles() {
  printSection('4. 检查测试文件');

  const testDir = path.join(process.cwd(), 'tests/e2e');
  const files = fs.readdirSync(testDir).filter(f => f.endsWith('.spec.ts'));

  if (files.length === 0) {
    log('✗ 未找到测试文件', 'red');
    return false;
  }

  log(`找到 ${files.length} 个测试文件:`, 'cyan');
  files.forEach(file => {
    log(`  - ${file}`, 'cyan');
  });

  return true;
}

// 检查测试数据
function checkTestData() {
  printSection('5. 检查测试数据');

  const testDataDir = path.join(process.cwd(), 'public/test-files');
  if (!fs.existsSync(testDataDir)) {
    log('✗ 测试数据目录不存在', 'red');
    return false;
  }

  const files = fs.readdirSync(testDataDir).filter(f => f.endsWith('.xlsx'));

  if (files.length === 0) {
    log('✗ 未找到测试 Excel 文件', 'red');
    log('提示: 运行 npm run test:generate-files 生成测试文件', 'yellow');
    return false;
  }

  log(`找到 ${files.length} 个测试文件:`, 'cyan');
  files.forEach(file => {
    const filePath = path.join(testDataDir, file);
    const stats = fs.statSync(filePath);
    const size = (stats.size / 1024).toFixed(2);
    log(`  - ${file} (${size} KB)`, 'cyan');
  });

  return true;
}

// 检查服务器状态
async function checkServerStatus() {
  printSection('6. 检查开发服务器');

  const baseURL = 'http://localhost:3000';

  try {
    const http = require('http');
    return new Promise((resolve) => {
      const req = http.get(baseURL, () => {
        log(`✓ 服务器正在运行: ${baseURL}`, 'green');
        resolve(true);
      });

      req.on('error', () => {
        log(`✗ 服务器未运行: ${baseURL}`, 'red');
        log('请先启动服务器:', 'yellow');
        log('  npm run dev', 'cyan');
        log('  或', 'cyan');
        log('  npm run electron-dev', 'cyan');
        resolve(false);
      });

      req.setTimeout(3000, () => {
        req.destroy();
        log('✗ 服务器响应超时', 'red');
        resolve(false);
      });
    });
  } catch (error) {
    log('✗ 无法检查服务器状态', 'red');
    return false;
  }
}

// 创建必要的目录
function createDirectories() {
  printSection('7. 创建测试目录');

  const dirs = [
    'tests/screenshots',
    'tests/screenshots/agentic-otae',
    'tests/test-results',
    'tests/test-results/html'
  ];

  dirs.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      log(`✓ 创建目录: ${dir}`, 'green');
    } else {
      log(`✓ 目录已存在: ${dir}`, 'cyan');
    }
  });
}

// 生成检查报告
function generateReport(checks) {
  printSection('8. 检查报告');

  const report = {
    timestamp: new Date().toISOString(),
    checks: checks,
    summary: {
      passed: checks.filter(c => c.passed).length,
      failed: checks.filter(c => !c.passed).length,
      total: checks.length
    }
  };

  console.log('\n检查结果汇总:');
  console.log('━'.repeat(60));
  checks.forEach(check => {
    const status = check.passed ? '✓ 通过' : '✗ 失败';
    const color = check.passed ? 'green' : 'red';
    log(`${status.padEnd(8)} ${check.name}`, color);
  });
  console.log('━'.repeat(60));

  const allPassed = report.summary.failed === 0;

  if (allPassed) {
    log('\n✓ 所有检查通过！可以运行测试了。', 'green');
    log('\n建议的下一步操作:', 'cyan');
    log('  1. 运行快速测试:', 'yellow');
    log('     npx playwright test tests/e2e/quick-test.spec.ts --headed', 'cyan');
    log('  2. 运行完整测试:', 'yellow');
    log('     npm run test:e2e', 'cyan');
    log('  3. 查看 HTML 报告:', 'yellow');
    log('     npx playwright show-report tests/test-results/html', 'cyan');
  } else {
    log(`\n✗ ${report.summary.failed} 项检查失败`, 'red');
    log('请修复上述问题后重新检查。', 'yellow');
  }

  // 保存报告
  const reportPath = path.join(process.cwd(), 'tests/test-results/e2e-check-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`\n报告已保存: ${reportPath}`, 'cyan');

  return allPassed;
}

// 主函数
async function main() {
  printHeader('ExcelMind AI - E2E 测试环境检查');

  const checks = [];

  // 执行检查
  checks.push({ name: '项目路径', passed: checkProjectPath() });
  checks.push({ name: 'Node.js 环境', passed: checkNodeEnvironment() });
  checks.push({ name: '依赖安装', passed: checkDependencies() });
  checks.push({ name: '测试文件', passed: checkTestFiles() });
  checks.push({ name: '测试数据', passed: checkTestData() });
  checks.push({ name: '服务器状态', passed: await checkServerStatus() });

  // 创建目录
  createDirectories();

  // 生成报告
  const allPassed = generateReport(checks);

  // 退出码
  process.exit(allPassed ? 0 : 1);
}

// 运行
main().catch(error => {
  log(`\n错误: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
