/**
 * E2E 测试全局设置
 *
 * 负责测试环境的初始化和清理
 *
 * @module tests/e2e/setup
 * @version 1.0.0
 */

import { FullConfig, FullContext } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

/**
 * 测试配置
 */
const TEST_CONFIG = {
  baseURL: process.env.BASE_URL || 'http://localhost:3000',
  screenshotsDir: path.join(process.cwd(), 'tests/screenshots'),
  testResultsDir: path.join(process.cwd(), 'tests/test-results'),
  testFilesDir: path.join(process.cwd(), 'public/test-files'),
};

/**
 * 全局设置：在所有测试运行前执行
 */
async function globalSetup(config: FullConfig) {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('ExcelMind AI - E2E 测试环境初始化');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`📋 测试配置:`);
  console.log(`   基础URL: ${TEST_CONFIG.baseURL}`);
  console.log(`   浏览器: ${config.projects?.[0]?.use?.browserName || 'chromium'}`);
  console.log(`   超时时间: ${(config as any).timeout || 30000}ms\n`);

  // 创建必要的目录
  console.log('📁 创建测试目录...');

  const dirs = [
    TEST_CONFIG.screenshotsDir,
    TEST_CONFIG.testResultsDir,
    path.join(TEST_CONFIG.screenshotsDir, 'file-management'),
    path.join(TEST_CONFIG.screenshotsDir, 'state-persistence'),
    path.join(TEST_CONFIG.screenshotsDir, 'degradation-recovery'),
    path.join(TEST_CONFIG.screenshotsDir, 'multi-tab-collaboration'),
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`   ✅ 创建: ${dir}`);
    }
  });

  console.log('');

  // 验证测试文件
  console.log('📄 验证测试文件...');

  const testFiles = [
    'test-simple.xlsx',
    'test-complex.xlsx',
    'test-edge.xlsx',
    'test-audit.xlsx',
    'test-aggregation.xlsx',
    'test-multisheet-employee.xlsx',
    'test-multisheet-order.xlsx',
  ];

  let fileCount = 0;
  testFiles.forEach(file => {
    const filePath = path.join(TEST_CONFIG.testFilesDir, file);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      console.log(`   ✅ ${file} (${sizeKB} KB)`);
      fileCount++;
    } else {
      console.log(`   ⚠️ ${file} - 不存在`);
    }
  });

  console.log(`\n   测试文件统计: ${fileCount}/${testFiles.length} 个文件存在\n`);

  if (fileCount === 0) {
    console.warn('⚠️  警告: 没有找到测试文件，某些测试可能失败');
    console.log('   提示: 运行 npm run test:generate-files 生成测试文件\n');
  }

  // 检查应用是否运行
  console.log('🔍 检查应用状态...');

  // 注意：这里不做实际的HTTP检查，因为可能在Docker环境或有代理
  // 实际检查会在每个测试用例中进行
  console.log(`   ✅ 目标URL: ${TEST_CONFIG.baseURL}`);
  console.log('   提示: 确保应用在测试前已启动\n');

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('测试环境初始化完成');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

/**
 * 全局拆解：在所有测试运行后执行
 */
async function globalTeardown(config: FullConfig) {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('ExcelMind AI - E2E 测试环境清理');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // 这里可以添加清理逻辑
  // 例如：删除测试生成的临时文件、清理数据库等

  console.log('✅ 测试环境清理完成');
  console.log('📁 测试结果保存在: tests/test-results/');
  console.log('📸 截图保存在: tests/screenshots/\n');

  console.log('═══════════════════════════════════════════════════════════════\n');
}

/**
 * 每个测试 worker 的设置
 */
async function beforeEachTest(context: FullContext) {
  // 可以在这里设置每个worker的上下文
  // 例如：设置浏览器选项、注入测试脚本等
}

/**
 * 每个测试 worker 的拆解
 */
async function afterEachTest(context: FullContext) {
  // 可以在这里清理每个worker的上下文
}

export default globalSetup;
export { globalTeardown, beforeEachTest, afterEachTest };
