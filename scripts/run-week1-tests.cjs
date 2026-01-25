/**
 * Week 1 测试运行脚本
 * 快速验证已完成的测试
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('='.repeat(60));
console.log('🧪 ExcelMind AI - Week 1 单元测试');
console.log('='.repeat(60));
console.log('');

const tests = [
  {
    name: '共享类型库 - fileMetadata',
    path: 'packages/shared-types/__tests__/fileMetadata.test.ts',
    count: 67
  },
  {
    name: '共享类型库 - executionTypes',
    path: 'packages/shared-types/__tests__/executionTypes.test.ts',
    count: 45
  },
  {
    name: '内存监控器',
    path: 'services/infrastructure/degradation/__tests__/MemoryMonitor.test.ts',
    count: 52
  },
  {
    name: 'API熔断器',
    path: 'services/infrastructure/degradation/__tests__/APICircuitBreaker.test.ts',
    count: 48
  },
  {
    name: '降级管理器',
    path: 'services/infrastructure/degradation/__tests__/DegradationManager.test.ts',
    count: 43
  },
  {
    name: '降级通知器',
    path: 'services/infrastructure/degradation/__tests__/DegradationNotifier.test.ts',
    count: 47
  }
];

console.log('📋 测试列表:');
console.log('');

tests.forEach((test, index) => {
  console.log(`${index + 1}. ${test.name}`);
  console.log(`   路径: ${test.path}`);
  console.log(`   测试数: ${test.count}`);
  console.log('');
});

console.log('='.repeat(60));
console.log(`总计: ${tests.length} 个测试文件，${tests.reduce((sum, t) => sum + t.count, 0)} 个测试用例`);
console.log('='.repeat(60));
console.log('');

console.log('🚀 开始运行测试...');
console.log('');

try {
  // 运行所有测试
  const testPattern = tests.map(t => t.path).join(' ');

  const result = execSync(
    `npx jest ${testPattern} --verbose`,
    {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..')
    }
  );

  console.log('');
  console.log('='.repeat(60));
  console.log('✅ 所有测试通过！');
  console.log('='.repeat(60));
} catch (error) {
  console.log('');
  console.log('='.repeat(60));
  console.log('❌ 测试失败');
  console.log('='.repeat(60));
  console.log('');
  console.log('💡 提示:');
  console.log('1. 检查测试文件是否正确创建');
  console.log('2. 确保所有依赖已安装 (npm install)');
  console.log('3. 查看上面的错误信息');
  console.log('4. 运行单个测试文件: npm test -- <test-file>');
  process.exit(1);
}
