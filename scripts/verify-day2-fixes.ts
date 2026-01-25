/**
 * Day 2 P0问题修复验证脚本
 *
 * 验证所有Day 2发现的关键问题是否已修复
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface FixVerification {
  issue: string;
  priority: string;
  status: 'PASSED' | 'FAILED' | 'SKIPPED';
  details: string;
  filePath?: string;
}

const verifications: FixVerification[] = [];

/**
 * 检查文件是否存在
 */
function checkFileExists(filePath: string, description: string): FixVerification {
  const exists = existsSync(filePath);
  return {
    issue: description,
    priority: 'P0',
    status: exists ? 'PASSED' : 'FAILED',
    details: exists ? `✓ 文件存在: ${filePath}` : `✗ 文件缺失: ${filePath}`,
    filePath,
  };
}

/**
 * 检查文件内容是否包含特定字符串
 */
function checkFileContent(
  filePath: string,
  searchString: string,
  description: string
): FixVerification {
  if (!existsSync(filePath)) {
    return {
      issue: description,
      priority: 'P0',
      status: 'FAILED',
      details: `✗ 文件不存在: ${filePath}`,
      filePath,
    };
  }

  const content = readFileSync(filePath, 'utf-8');
  const contains = content.includes(searchString);

  return {
    issue: description,
    priority: 'P0',
    status: contains ? 'PASSED' : 'FAILED',
    details: contains
      ? `✓ 找到期望代码: ${searchString.substring(0, 50)}...`
      : `✗ 未找到期望代码: ${searchString.substring(0, 50)}...`,
    filePath,
  };
}

/**
 * 检查package.json中是否安装了特定依赖
 */
function checkDependencyInstalled(
  packageName: string,
  description: string
): FixVerification {
  const packageJsonPath = join(process.cwd(), 'package.json');

  if (!existsSync(packageJsonPath)) {
    return {
      issue: description,
      priority: 'P1',
      status: 'FAILED',
      details: `✗ package.json不存在`,
    };
  }

  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  const installed =
    packageName in (packageJson.dependencies || {}) ||
    packageName in (packageJson.devDependencies || {});

  return {
    issue: description,
    priority: 'P1',
    status: installed ? 'PASSED' : 'FAILED',
    details: installed
      ? `✓ 依赖已安装: ${packageName}`
      : `✗ 依赖未安装: ${packageName}`,
  };
}

/**
 * 运行验证测试
 */
function runVerifications(): void {
  console.log('🔍 Day 2 P0问题修复验证\n');
  console.log('='.repeat(80));

  // 问题1: API认证未启用
  console.log('\n🔴 问题1: API认证未启用 - P0\n');

  verifications.push(
    checkFileExists(
      join(process.cwd(), '.env.production'),
      '生产环境配置文件存在'
    )
  );

  verifications.push(
    checkFileContent(
      join(process.cwd(), '.env.production'),
      'AUTH_ENABLED=true',
      'AUTH_ENABLED配置正确'
    )
  );

  verifications.push(
    checkFileContent(
      join(process.cwd(), '.env.production'),
      'API_KEYS=',
      'API_KEYS配置存在'
    )
  );

  verifications.push(
    checkFileContent(
      join(process.cwd(), 'api/middleware/authMiddleware.ts'),
      "if (this.config.enabled === false)",
      '认证中间件逻辑已修复'
    )
  );

  verifications.push(
    checkFileExists(
      join(process.cwd(), 'scripts/test-api-auth.ts'),
      'API认证测试脚本存在'
    )
  );

  // 问题2: WebSocket消息时序
  console.log('\n🟡 问题2: WebSocket消息时序 - P1\n');

  verifications.push(
    checkFileContent(
      join(process.cwd(), 'server/websocket/websocketServer.ts'),
      'await this.sendMessage(clientId, {',
      'WebSocket连接消息使用await'
    )
  );

  // 问题3: IndexedDB测试环境
  console.log('\n🟡 问题3: IndexedDB测试环境 - P1\n');

  verifications.push(
    checkDependencyInstalled('fake-indexeddb', 'fake-indexeddb依赖已安装')
  );

  verifications.push(
    checkFileExists(
      join(process.cwd(), 'tests/mocks/indexedDB.ts'),
      'IndexedDB mock文件存在'
    )
  );

  verifications.push(
    checkFileContent(
      join(process.cwd(), 'vitest.config.ts'),
      './tests/mocks/indexedDB.ts',
      'Vitest配置包含IndexedDB mock'
    )
  );

  // 打印结果
  console.log('\n📊 验证结果\n');
  console.log('='.repeat(80));

  let passed = 0;
  let failed = 0;

  verifications.forEach((v, index) => {
    const icon = v.status === 'PASSED' ? '✓' : v.status === 'FAILED' ? '✗' : '○';
    const priority = v.priority === 'P0' ? '🔴 P0' : '🟡 P1';

    console.log(
      `${index + 1}. ${priority} ${v.issue}: ${v.status === 'PASSED' ? '通过' : v.status === 'FAILED' ? '失败' : '跳过'}`
    );
    console.log(`   ${v.details}`);

    if (v.filePath) {
      console.log(`   文件: ${v.filePath}`);
    }

    console.log();

    if (v.status === 'PASSED') passed++;
    if (v.status === 'FAILED') failed++;
  });

  console.log('='.repeat(80));
  console.log(`总计: ${passed}/${verifications.length} 通过`);

  if (failed === 0) {
    console.log('\n🎉 所有问题修复验证通过！');
    console.log('\n下一步:');
    console.log('1. 运行API认证测试: npx tsx scripts/test-api-auth.ts');
    console.log('2. 运行WebSocket测试: npm run test:websocket');
    console.log('3. 运行IndexedDB测试: npm run test:phase2');
  } else {
    console.log(`\n⚠️ ${failed}个验证失败，请检查修复状态`);
  }
}

/**
 * 主函数
 */
function main(): void {
  try {
    runVerifications();
  } catch (error) {
    console.error('验证执行失败:', error);
    process.exit(1);
  }
}

// 运行验证
main();
