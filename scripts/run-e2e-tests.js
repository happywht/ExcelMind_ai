/**
 * 多Sheet支持功能 - 端到端测试运行脚本 (Windows)
 *
 * @version 1.0.0
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 颜色输出（Windows可能不支持，使用简单文本）
const log = {
  info: (msg) => console.log(`ℹ️  ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  warning: (msg) => console.log(`⚠️  ${msg}`),
  error: (msg) => console.log(`❌ ${msg}`),
  step: (num, msg) => console.log(`\n${num}️⃣  ${msg}`)
};

async function checkServer() {
  log.step(1, '检查开发服务器状态...');

  try {
    // Windows使用PowerShell检查
    const { stdout } = await execAsync('powershell -Command "try { $response = Invoke-WebRequest -Uri http://localhost:3000 -TimeoutSec 2; $response.StatusCode } catch { \"404\" }"');

    if (stdout.includes('200') || stdout.includes('304')) {
      log.success('开发服务器正在运行 (http://localhost:3000)');
      return true;
    }
  } catch (error) {
    log.warning('开发服务器未运行');
    console.log('\n请先运行: pnpm dev');
    console.log('或在另一个终端运行: npm run dev');
    return false;
  }
}

async function installPlaywright() {
  log.step(2, '检查Playwright浏览器...');

  try {
    await execAsync('npx playwright --version', { stdio: 'pipe' });
    log.success('Playwright已安装');
    return true;
  } catch (error) {
    log.info('安装Playwright浏览器...');
    try {
      await execAsync('npx playwright install chromium', { stdio: 'inherit' });
      log.success('Playwright安装完成');
      return true;
    } catch (installError) {
      log.error('Playwright安装失败');
      return false;
    }
  }
}

async function generateTestFiles() {
  log.step(3, '生成测试Excel文件...');

  try {
    await execAsync('node scripts/generate-test-files.js', { stdio: 'inherit' });
    log.success('测试文件生成完成');
    return true;
  } catch (error) {
    log.error('测试文件生成失败');
    return false;
  }
}

async function runTests() {
  log.step(4, '运行端到端测试...\n');

  try {
    // 创建测试结果目录
    const projectRoot = path.resolve(__dirname, '..');
    const testResultsDir = path.join(projectRoot, 'tests/test-results');
    const fs = await import('fs');
    if (!fs.existsSync(testResultsDir)) {
      fs.mkdirSync(testResultsDir, { recursive: true });
    }

    // 运行Playwright测试
    const args = process.argv.slice(2).join(' ');
    const command = `npx playwright test ${args}`;

    await execAsync(command, { stdio: 'inherit' });

    return true;
  } catch (error) {
    log.error('测试执行失败');
    return false;
  }
}

async function showResults() {
  console.log('\n==========================================');
  console.log('  测试完成');
  console.log('==========================================\n');
  console.log('📊 测试报告:');
  console.log('  - HTML报告: tests/test-results/html/index.html');
  console.log('  - JSON报告: tests/test-results/results.json');
  console.log('  - 截图: tests/screenshots/\n');
  console.log('查看HTML报告:');
  console.log('  npx playwright show-report tests/test-results/html\n');
}

async function main() {
  console.log('==========================================');
  console.log('  多Sheet支持功能 - 端到端测试');
  console.log('==========================================');

  const serverOk = await checkServer();
  if (!serverOk) {
    process.exit(1);
  }

  const playwrightOk = await installPlaywright();
  if (!playwrightOk) {
    process.exit(1);
  }

  const filesOk = await generateTestFiles();
  if (!filesOk) {
    process.exit(1);
  }

  const testsOk = await runTests();

  await showResults();

  process.exit(testsOk ? 0 : 1);
}

// 运行
main().catch((error) => {
  console.error('未预期的错误:', error);
  process.exit(1);
});
