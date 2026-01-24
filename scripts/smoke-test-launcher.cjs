#!/usr/bin/env node

/**
 * ExcelMind AI 冒烟测试启动器
 *
 * 快速启动打包后的应用进行冒烟测试
 */

const { spawn } = require('child_process');
const path = require('path');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function info(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

function header(message) {
  log(`\n${'='.repeat(60)}`, 'blue');
  log(`  ${message}`, 'blue');
  log(`${'='.repeat(60)}`, 'blue');
}

// 主函数
async function main() {
  header('ExcelMind AI 冒烟测试启动器');

  const projectRoot = path.resolve(__dirname, '..');
  const unpackedDir = path.join(projectRoot, 'dist-electron', 'win-unpacked');
  const exePath = path.join(unpackedDir, 'ExcelMind AI.exe');

  // 检查可执行文件
  if (!require('fs').existsSync(exePath)) {
    error(`未找到可执行文件: ${exePath}`);
    info('\n请先运行: npm run dist');
    process.exit(1);
  }

  success(`找到可执行文件: ${exePath}`);

  // 启动应用
  header('启动应用');
  info('正在启动 ExcelMind AI...');
  info('应用窗口应该会在几秒内打开\n');

  info('冒烟测试清单:');
  info('1. ✅ 应用窗口正常打开');
  info('2. ✅ 窗口尺寸正确（1400x900）');
  info('3. ✅ 界面加载完整（无白屏）');
  info('4. ✅ 可以点击上传按钮');
  info('5. ✅ 可以选择Excel文件');
  info('6. ✅ 文件加载并显示预览');
  info('7. ✅ 可以输入查询问题');
  info('8. ✅ AI响应正常显示');
  info('9. ✅ 可以正常关闭应用');
  info('');

  let child;
  try {
    child = spawn(exePath, [], {
      detached: true,
      stdio: 'ignore'
    });

    success(`应用已启动 (PID: ${child.pid})`);
    info('\n按 Ctrl+C 退出此脚本（应用会继续运行）');

    // 等待用户输入
    process.stdin.resume();

    // 监听退出
    process.on('SIGINT', () => {
      info('\n\n正在退出...');
      process.exit(0);
    });

  } catch (err) {
    error(`启动应用失败: ${err.message}`);
    process.exit(1);
  }
}

main().catch(err => {
  error(`冒烟测试启动器执行失败: ${err.message}`);
  console.error(err);
  process.exit(1);
});
