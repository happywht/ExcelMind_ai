/**
 * 集成测试自动修复脚本
 *
 * 用途：自动修复已发现的集成测试问题
 * 运行：node scripts/fix-integration-tests.js
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✓ ${message}`, 'green');
}

function warn(message) {
  log(`⚠ ${message}`, 'yellow');
}

function error(message) {
  log(`✗ ${message}`, 'red');
}

function info(message) {
  log(`ℹ ${message}`, 'blue');
}

// 修复 1: 在 tests/setup.ts 中添加 AlaSQL 初始化
function fixAlaSQLInitialization() {
  info('修复 AlaSQL 初始化...');

  const setupFilePath = path.join(ROOT_DIR, 'tests/setup.ts');

  if (!fs.existsSync(setupFilePath)) {
    error(`文件不存在: ${setupFilePath}`);
    return false;
  }

  let content = fs.readFileSync(setupFilePath, 'utf8');

  // 检查是否已经添加
  if (content.includes('alasql')) {
    success('AlaSQL 初始化已存在，跳过');
    return true;
  }

  // 在文件顶部添加导入
  const importStatement = `// 导入 AlaSQL 用于集成测试
import alasql from 'alasql';

// 将 AlaSQL 挂载到全局对象
(global as any).alasql = alasql;

`;

  // 在第一个注释块后插入
  content = content.replace(
    '/**\n * Jest 测试环境设置',
    `${importStatement}\n/**\n * Jest 测试环境设置`
  );

  fs.writeFileSync(setupFilePath, content, 'utf8');
  success('已添加 AlaSQL 初始化到 tests/setup.ts');
  return true;
}

// 修复 2: 创建 Mock 辅助函数
function createMockHelpers() {
  info('创建 Mock 辅助函数...');

  const helpersDir = path.join(ROOT_DIR, 'tests/helpers');

  // 确保目录存在
  if (!fs.existsSync(helpersDir)) {
    fs.mkdirSync(helpersDir, { recursive: true });
  }

  const mockAIHelperPath = path.join(helpersDir, 'mockAI.ts');

  const mockAIHelperContent = `/**
 * Mock AI 服务辅助函数
 * 用于测试中模拟智谱 AI 服务
 */

import Anthropic from '@anthropic-ai/sdk';

export interface MockAIResponse {
  explanation: string;
  code: string;
}

/**
 * 创建模拟的 AI 客户端
 */
export const createMockAIClient = () => {
  const mockCreate = jest.fn();

  return {
    messages: {
      create: mockCreate
    }
  };
};

/**
 * 创建模拟的 AI 响应
 */
export const mockAIResponse = (response: MockAIResponse) => {
  const mockClient = createMockAIClient();

  mockClient.messages.create.mockResolvedValue({
    content: [
      {
        type: 'text',
        text: JSON.stringify(response)
      }
    ]
  } as any);

  return mockClient;
};

/**
 * 创建模拟的错误响应
 */
export const mockAIError = (errorMessage: string) => {
  const mockClient = createMockAIClient();

  mockClient.messages.create.mockRejectedValue(
    new Error(errorMessage)
  );

  return mockClient;
};

/**
 * 在测试中设置 Anthropic Mock
 */
export const setupAnthropicMock = (response: MockAIResponse) => {
  const mockClient = mockAIResponse(response);

  (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(
    () => mockClient as any
  );

  return mockClient;
};

/**
 * 清理所有 Mock
 */
export const clearAllMocks = () => {
  jest.clearAllMocks();
};
`;

  fs.writeFileSync(mockAIHelperPath, mockAIHelperContent, 'utf8');
  success('已创建 Mock 辅助函数: tests/helpers/mockAI.ts');
  return true;
}

// 修复 3: 更新 documentMappingService.test.ts
function fixDocumentMappingTest() {
  info('修复 documentMappingService.test.ts...');

  const testFilePath = path.join(ROOT_DIR, 'services/documentMappingService.test.ts');

  if (!fs.existsSync(testFilePath)) {
    warn(`文件不存在: ${testFilePath}`);
    return false;
  }

  let content = fs.readFileSync(testFilePath, 'utf8');

  // 检查是否已经修复
  if (content.includes('mockAI')) {
    success('documentMappingService.test.ts 已修复，跳过');
    return true;
  }

  // 在导入语句后添加
  const importStatement = `
import { setupAnthropicMock, mockAIResponse } from '../tests/helpers/mockAI';
`;

  // 添加导入（如果不存在）
  if (!content.includes('tests/helpers/mockAI')) {
    content = content.replace(
      /"(\.\/\.\.\/types)"/,
      `"../tests/helpers/mockAI"${importStatement}"../src/types"`
    );
  }

  // 修复 beforeEach 中的 mock 初始化
  const beforeEachFix = `  beforeEach(() => {
    // 正确初始化 AI Mock
    const mockClient = mockAIResponse(mockAIResponse);
    (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(
      () => mockClient as any
    );`;

  // 替换错误的 mock 初始化
  content = content.replace(
    /beforeEach\(\(\) => \{[\s\S]*?mockClient\.messages\.create = jest\.fn\(\)\.mockResolvedValue\(mockResponse\);[\s\S]*?\}\);/,
    beforeEachFix
  );

  fs.writeFileSync(testFilePath, content, 'utf8');
  success('已修复 documentMappingService.test.ts');
  return true;
}

// 修复 4: 创建 .env.test 文件
function createEnvTestFile() {
  info('创建 .env.test 文件...');

  const envTestPath = path.join(ROOT_DIR, '.env.test');

  if (fs.existsSync(envTestPath)) {
    success('.env.test 已存在，跳过');
    return true;
  }

  const envTestContent = `# 测试环境变量
# 注意: 这是用于本地测试的占位符密钥
# 在 CI/CD 环境中应使用真实的密钥

ZHIPU_API_KEY=test_key_placeholder_for_local_development
API_KEY=test_key_placeholder_for_local_development

# 测试环境配置
NODE_ENV=test
`;

  fs.writeFileSync(envTestPath, envTestContent, 'utf8');
  success('已创建 .env.test 文件');
  return true;
}

// 修复 5: 更新 jest.config.cjs
function updateJestConfig() {
  info('检查 Jest 配置...');

  const configPath = path.join(ROOT_DIR, 'jest.config.cjs');

  if (!fs.existsSync(configPath)) {
    error(`Jest 配置文件不存在: ${configPath}`);
    return false;
  }

  const content = fs.readFileSync(configPath, 'utf8');

  // 检查 transformIgnorePatterns 配置
  if (content.includes('alasql')) {
    success('Jest 配置已包含 alasql，跳过');
    return true;
  }

  // 更新 transformIgnorePatterns
  const updatedContent = content.replace(
    /transformIgnorePatterns:\s*\[([\s\S]*?)\]/,
    'transformIgnorePatterns: [\'node_modules/(?!(alasql|@anthropic-ai/sdk)/)\']'
  );

  fs.writeFileSync(configPath, updatedContent, 'utf8');
  success('已更新 Jest 配置以支持 alasql');
  return true;
}

// 主函数
function main() {
  log('\n========================================', 'blue');
  log('  ExcelMind AI 集成测试自动修复工具', 'blue');
  log('========================================\n', 'blue');

  const fixes = [
    { name: 'AlaSQL 初始化', fn: fixAlaSQLInitialization },
    { name: 'Mock 辅助函数', fn: createMockHelpers },
    { name: 'documentMappingService 测试', fn: fixDocumentMappingTest },
    { name: '.env.test 文件', fn: createEnvTestFile },
    { name: 'Jest 配置', fn: updateJestConfig }
  ];

  let successCount = 0;
  let skipCount = 0;

  fixes.forEach(({ name, fn }) => {
    try {
      const result = fn();
      if (result === false) {
        skipCount++;
      } else {
        successCount++;
      }
    } catch (error) {
      error(`修复 ${name} 时出错: ${error.message}`);
    }
  });

  log('\n========================================', 'blue');
  log('修复总结', 'blue');
  log('========================================', 'blue');
  success(`成功应用修复: ${successCount}/${fixes.length}`);
  if (skipCount > 0) {
    warn(`跳过: ${skipCount}`);
  }

  log('\n下一步操作:', 'blue');
  info('1. 运行集成测试验证修复:');
  log('   npm run test:integration\n', 'reset');
  info('2. 运行所有测试验证整体状态:');
  log('   npm test\n', 'reset');
  info('3. 如需更多帮助，请参阅:');
  log('   INTEGRATION_TEST_EXECUTION_GUIDE.md\n', 'reset');

  log('========================================\n', 'blue');
}

// 运行主函数
main();
