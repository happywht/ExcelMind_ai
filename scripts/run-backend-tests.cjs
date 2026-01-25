/**
 * 快速运行后端服务测试
 *
 * 使用方法:
 * npm run test:backend
 * node scripts/run-backend-tests.cjs [module]
 *
 * 模块选项:
 * - all: 运行所有测试 (默认)
 * - storage: 只运行 storage 模块测试
 * - vfs: 只运行 vfs 模块测试
 * - coverage: 生成覆盖率报告
 */

const { execSync } = require('child_process');
const path = require('path');

const MODULE = process.argv[2] || 'all';
const ROOT_DIR = path.resolve(__dirname, '..');

console.log('\n========================================');
console.log('  ExcelMind AI - 后端服务测试运行器');
console.log('========================================\n');

function runCommand(command, description) {
  console.log(`\n📋 ${description}`);
  console.log(`\n命令: ${command}\n`);

  try {
    const output = execSync(command, {
      cwd: ROOT_DIR,
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'test' },
    });

    console.log('\n✅ 成功\n');
    return true;
  } catch (error) {
    console.log('\n❌ 失败\n');
    return false;
  }
}

function main() {
  let success = true;
  const startTime = Date.now();

  switch (MODULE) {
    case 'storage':
      console.log('运行 Storage 模块测试...\n');
      success = runCommand(
        'npm test -- services/infrastructure/storage/__tests__',
        'Storage 模块测试'
      );
      break;

    case 'vfs':
      console.log('运行 VFS 模块测试...\n');
      success = runCommand(
        'npm test -- services/infrastructure/vfs/__tests__',
        'VFS 模块测试'
      );
      break;

    case 'coverage':
      console.log('生成测试覆盖率报告...\n');
      success = runCommand(
        'npm run test:coverage -- services/infrastructure',
        '测试覆盖率报告'
      );
      break;

    case 'all':
    default:
      console.log('运行所有后端服务测试...\n');

      // Storage 模块测试
      const storageSuccess = runCommand(
        'npm test -- services/infrastructure/storage/__tests__',
        'Storage 模块测试'
      );

      // VFS 模块测试
      const vfsSuccess = runCommand(
        'npm test -- services/infrastructure/vfs/__tests__',
        'VFS 模块测试'
      );

      success = storageSuccess && vfsSuccess;
      break;
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n========================================');
  console.log(`  测试完成! 耗时: ${duration}秒`);
  console.log('========================================\n');

  if (success) {
    console.log('✅ 所有测试通过!\n');
    process.exit(0);
  } else {
    console.log('❌ 部分测试失败，请查看详细日志\n');
    process.exit(1);
  }
}

main();
