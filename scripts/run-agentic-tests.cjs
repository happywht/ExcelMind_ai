/**
 * OTAE 系统测试运行器
 *
 * 提供便捷的命令行工具来运行自动化测试
 *
 * @author Automation Engineer
 * @version 1.0.0
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
  screenshotDir: 'tests/screenshots/agentic-otae/',
  testResultsDir: 'tests/test-results/agentic-otae/',
  baseURL: process.env.BASE_URL || 'http://localhost:3000'
};

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

function createDirectories() {
  const dirs = [CONFIG.screenshotDir, CONFIG.testResultsDir];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      log(`✅ 创建目录: ${dir}`, 'green');
    }
  });
}

function checkServerRunning() {
  log('\n🔍 检查服务器状态...', 'cyan');

  try {
    // 尝试连接到服务器
    const http = require('http');
    return new Promise((resolve) => {
      const req = http.get(CONFIG.baseURL, () => {
        log(`✅ 服务器正在运行: ${CONFIG.baseURL}`, 'green');
        resolve(true);
      });

      req.on('error', () => {
        log(`❌ 服务器未运行: ${CONFIG.baseURL}`, 'red');
        log('请先启动服务器: npm run dev', 'yellow');
        resolve(false);
      });

      req.setTimeout(5000, () => {
        req.destroy();
        log(`❌ 服务器响应超时: ${CONFIG.baseURL}`, 'red');
        resolve(false);
      });
    });
  } catch (error) {
    log(`❌ 无法检查服务器状态: ${error.message}`, 'red');
    return false;
  }
}

function runTest(testFile, options = {}) {
  const {
    headed = true,
    debug = false,
    browser = 'chromium'
  } = options;

  log(`\n🚀 运行测试: ${testFile}`, 'cyan');

  let command = `npx playwright test ${testFile}`;
  command += ` --project=${browser}`;
  command += headed ? ' --headed' : ' --headed=false';
  command += debug ? ' --debug' : '';

  try {
    log(`执行命令: ${command}`, 'blue');
    execSync(command, {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    log('✅ 测试完成', 'green');
    return true;
  } catch (error) {
    log(`❌ 测试失败: ${error.message}`, 'red');
    return false;
  }
}

function showHelp() {
  console.log(`
${colors.bright}${colors.cyan}
╔═══════════════════════════════════════════════════════════════╗
║     ExcelMind AI - OTAE 系统测试运行器 v1.0.0               ║
╚═══════════════════════════════════════════════════════════════╝
${colors.reset}

${colors.bright}用法:${colors.reset}
  node scripts/run-agentic-tests.js [命令] [选项]

${colors.bright}命令:${colors.reset}
  all              运行所有测试
  basic            运行基础功能测试
  otae             运行 OTAE 循环测试
  error-repair     运行错误修复测试
  mode-compare     运行模式对比测试
  quality          运行质量评估测试
  multistep        运行多步骤任务测试
  report           生成综合测试报告

${colors.bright}选项:${colors.reset}
  --headed         在有头模式下运行（默认）
  --headless       在无头模式下运行
  --debug          启用调试模式
  --browser=<name> 指定浏览器 (chromium, firefox, webkit)

${colors.bright}示例:${colors.reset}
  node scripts/run-agentic-tests.js all
  node scripts/run-agentic-tests.js otae --headless
  node scripts/run-agentic-tests.js mode-compare --browser=firefox
  node scripts/run-agentic-tests.js report

${colors.bright}测试场景:${colors.reset}
  • 基础功能测试 - 验证应用连接和文件上传
  • OTAE 循环测试 - 验证观察-思考-执行-评估流程
  • 错误修复测试 - 验证自动错误检测和修复
  • 模式对比测试 - 对比智能模式与快速模式
  • 质量评估测试 - 验证三维度质量评分
  • 多步骤测试 - 验证复杂任务处理能力

${colors.bright}环境变量:${colors.reset}
  BASE_URL         指定服务器地址 (默认: http://localhost:3000)

${colors.bright}示例:${colors.reset}
  BASE_URL=http://localhost:3000 node scripts/run-agentic-tests.js all

${colors.bright}输出:${colors.reset}
  测试截图: ${CONFIG.screenshotDir}
  测试报告: ${CONFIG.testResultsDir}

${colors.cyan}───────────────────────────────────────────────────────────────${colors.reset}
  `);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  // 显示帮助
  if (command === 'help' || command === '--help' || command === '-h') {
    showHelp();
    return;
  }

  // 创建必要的目录
  createDirectories();

  // 检查服务器状态
  const serverRunning = await checkServerRunning();
  if (!serverRunning && command !== 'report') {
    log('\n⚠️ 警告: 服务器未运行，测试可能会失败', 'yellow');
    log('是否继续? (Ctrl+C 取消，任意键继续)', 'yellow');
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  // 解析选项
  const options = {
    headed: !args.includes('--headless'),
    debug: args.includes('--debug'),
    browser: 'chromium'
  };

  const browserArg = args.find(arg => arg.startsWith('--browser='));
  if (browserArg) {
    options.browser = browserArg.split('=')[1];
  }

  // 执行命令
  const testFile = 'tests/e2e/agentic-otae-system.spec.ts';

  switch (command) {
    case 'all':
      log(`\n${colors.bright}${colors.cyan}═══ 运行所有测试 ═══${colors.reset}`);
      runTest(testFile, options);
      break;

    case 'basic':
      log(`\n${colors.bright}${colors.cyan}═══ 运行基础功能测试 ═══${colors.reset}`);
      runTest(`${testFile} --grep "基础功能测试"`, options);
      break;

    case 'otae':
      log(`\n${colors.bright}${colors.cyan}═══ 运行 OTAE 循环测试 ═══${colors.reset}`);
      runTest(`${testFile} --grep "OTAE.*循环执行测试"`, options);
      break;

    case 'error-repair':
      log(`\n${colors.bright}${colors.cyan}═══ 运行错误修复测试 ═══${colors.reset}`);
      runTest(`${testFile} --grep "错误修复测试"`, options);
      break;

    case 'mode-compare':
      log(`\n${colors.bright}${colors.cyan}═══ 运行模式对比测试 ═══${colors.reset}`);
      runTest(`${testFile} --grep "模式对比测试"`, options);
      break;

    case 'quality':
      log(`\n${colors.bright}${colors.cyan}═══ 运行质量评估测试 ═══${colors.reset}`);
      runTest(`${testFile} --grep "质量评估测试"`, options);
      break;

    case 'multistep':
      log(`\n${colors.bright}${colors.cyan}═══ 运行多步骤任务测试 ═══${colors.reset}`);
      runTest(`${testFile} --grep "多步骤复杂任务测试"`, options);
      break;

    case 'report':
      log(`\n${colors.bright}${colors.cyan}═══ 生成测试报告 ═══${colors.reset}`);
      runTest(`${testFile} --grep "综合测试报告"`, options);
      break;

    default:
      log(`\n❌ 未知命令: ${command}`, 'red');
      log('使用 "help" 查看可用命令', 'yellow');
      showHelp();
      break;
  }

  log(`\n${colors.bright}${colors.cyan}═══ 测试完成 ═══${colors.reset}`);
  log(`📁 截图保存位置: ${CONFIG.screenshotDir}`, 'blue');
  log(`📊 测试报告位置: ${CONFIG.testResultsDir}`, 'blue');
}

// 运行主函数
main().catch(error => {
  console.error('❌ 发生错误:', error);
  process.exit(1);
});
