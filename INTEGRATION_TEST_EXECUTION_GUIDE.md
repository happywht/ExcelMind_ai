# 集成测试执行指南和修复建议

**文档版本**: 1.0.0
**生成时间**: 2026-01-24
**负责人**: Senior QA Engineer

---

## 📋 目录

1. [快速开始](#快速开始)
2. [测试环境配置](#测试环境配置)
3. [测试执行说明](#测试执行说明)
4. [已知问题和修复](#已知问题和修复)
5. [测试覆盖率目标](#测试覆盖率目标)
6. [CI/CD 集成](#cicd-集成)

---

## 🚀 快速开始

### 前置条件

```bash
# 确保 Node.js 版本
node --version  # v22.18.0 或更高

# 安装依赖
npm install

# 检查环境变量
cat .env
```

### 必需的环境变量

```bash
# 智谱 AI API 密钥
ZHIPU_API_KEY=your_api_key_here

# 或者使用通用 API_KEY
API_KEY=your_api_key_here
```

---

## 🔧 测试环境配置

### 1. 修复 AlaSQL 未加载问题

**问题**: 集成测试失败，提示 "AlaSQL未加载"

**解决方案**:

在 `tests/setup.ts` 中添加 AlaSQL 初始化：

```typescript
/**
 * Jest 测试环境设置
 * 在所有测试运行前执行的初始化代码
 */

// 导入 AlaSQL
import alasql from 'alasql';

// 将 AlaSQL 挂载到全局对象
(global as any).alasql = alasql;

// 模拟浏览器环境
global.performance = {
  ...global.performance,
  now: jest.fn(() => Date.now())
} as any;

// ... 其他设置保持不变
```

### 2. 修复 documentMappingService 测试 Mock

**问题**: Mock 对象初始化不完整

**解决方案**:

在 `services/documentMappingService.test.ts` 中修复 Mock：

```typescript
import Anthropic from '@anthropic-ai/sdk';

// 在测试文件顶部或 beforeEach 中添加
const createMockClient = () => ({
  messages: {
    create: jest.fn().mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            explanation: '测试说明',
            code: 'print("test")'
          })
        }
      ]
    })
  }
});

describe('DocumentMappingService', () => {
  beforeEach(() => {
    // 正确初始化 Mock
    const mockClient = createMockClient();
    (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(
      () => mockClient as any
    );
  });

  // ... 测试用例
});
```

### 3. 配置 Jest 转换忽略

确保 `jest.config.cjs` 正确配置：

```javascript
module.exports = {
  // ... 其他配置

  transformIgnorePatterns: [
    'node_modules/(?!(alasql|@anthropic-ai/sdk)/)'
  ],

  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts']
};
```

---

## 🧪 测试执行说明

### 运行所有测试

```bash
# 运行所有单元测试和集成测试
npm test

# 运行所有测试（包括覆盖率）
npm run test:coverage
```

### 运行特定测试类型

```bash
# 单元测试
npm run test:unit

# 集成测试
npm run test:integration

# 回归测试
npm run test:regression

# 性能测试
npm run test:performance
```

### 运行 E2E 测试

```bash
# 运行所有 Playwright E2E 测试
npm run test:e2e

# 运行特定测试文件
npx playwright test tests/e2e/agentic-otae-system.spec.ts

# 运行特定测试用例
npx playwright test -g "应该完整执行 OTAE 循环"

# 调试模式
npm run test:e2e:debug

# UI 模式
npm run test:e2e:ui

# 无头模式（CI 环境）
npm run test:e2e:headless
```

### 运行 Agentic 系统测试

```bash
# 运行所有 Agentic 测试
npm run test:agentic

# 运行特定 Agentic 测试
npm run test:agentic:basic        # 基础功能
npm run test:agentic:otae         # OTAE 循环
npm run test:agentic:error-repair # 错误修复
npm run test:agentic:mode-compare # 模式对比
npm run test:agentic:quality      # 质量评估
npm run test:agentic:multistep    # 多步骤任务
npm run test:agentic:report       # 生成报告
npm run test:agentic:benchmark    # 性能基准
```

### 监视模式

```bash
# Jest 监视模式（自动重新运行）
npm run test:watch

# Playwright 监视模式
npx playwright test --watch
```

---

## 🐛 已知问题和修复

### 问题 1: AlaSQL 未加载

**错误信息**:
```
Error: AlaSQL未加载。请确保在项目中安装并导入了alasql库。
```

**影响范围**:
- `services/integration.end-to-end.test.ts`
- 任何使用 DataQueryEngine 的测试

**修复步骤**:

1. 在 `tests/setup.ts` 中添加：
```typescript
import alasql from 'alasql';
(global as any).alasql = alasql;
```

2. 确保安装了 alasql：
```bash
npm install alasql --save-dev
```

3. 验证配置：
```bash
npm run test:integration
```

**预期结果**: 测试应该能够正常运行

### 问题 2: Anthropic Mock 配置错误

**错误信息**:
```
TypeError: Cannot set properties of undefined (setting 'create')
```

**影响范围**:
- `services/documentMappingService.test.ts`
- 任何使用 AI 服务的测试

**修复步骤**:

1. 创建辅助函数：
```typescript
// tests/helpers/mockAI.ts
import Anthropic from '@anthropic-ai/sdk';

export const createMockAIClient = () => ({
  messages: {
    create: jest.fn()
  }
});

export const mockAIResponse = (response: any) => {
  const mockClient = createMockAIClient();
  mockClient.messages.create.mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify(response) }]
  });
  return mockClient;
};
```

2. 在测试中使用：
```typescript
import { mockAIResponse } from '../helpers/mockAI';

beforeEach(() => {
  const mockClient = mockAIResponse({
    explanation: '测试',
    code: 'print("test")'
  });

  (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(
    () => mockClient as any
  );
});
```

### 问题 3: E2E 测试环境未启动

**错误信息**:
```
Error: Test code failed: connect ECONNREFUSED localhost:3000
```

**影响范围**:
- 所有 Playwright E2E 测试

**修复步骤**:

1. 启动开发服务器：
```bash
# 终端 1: 启动应用
npm run dev

# 终端 2: 运行测试
npm run test:e2e
```

2. 或使用 Electron 环境：
```bash
npm run electron-dev
```

3. 配置 baseURL（如果需要）：
```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000'
  }
});
```

### 问题 4: API 密钥未配置

**错误信息**:
```
Error: API key is missing. Please set ZHIPU_API_KEY environment variable.
```

**影响范围**:
- 所有调用 AI 服务的测试

**修复步骤**:

1. 创建 `.env.test` 文件：
```bash
# .env.test
ZHIPU_API_KEY=test_key_placeholder
API_KEY=test_key_placeholder
```

2. 在测试中使用 Mock：
```typescript
// tests/setup.ts
process.env.ZHIPU_API_KEY = 'test_key';
```

3. 或在 CI 环境中设置：
```yaml
# .github/workflows/test.yml
env:
  ZHIPU_API_KEY: ${{ secrets.ZHIPU_API_KEY }}
```

---

## 📊 测试覆盖率目标

### 当前目标（Phase 2）

```javascript
// jest.config.cjs
coverageThreshold: {
  global: {
    statements: 90,  // 语句覆盖率 90%
    branches: 85,    // 分支覆盖率 85%
    functions: 95,   // 函数覆盖率 95%
    lines: 90        // 行覆盖率 90%
  }
}
```

### 生成覆盖率报告

```bash
# 生成覆盖率报告
npm run test:coverage

# 查看详细报告
open coverage/lcov-report/index.html

# 检查覆盖率是否达标
npm run test:check-coverage
```

### 覆盖率报告文件

生成的报告位置：
- JSON: `coverage/coverage-final.json`
- HTML: `coverage/lcov-report/index.html`
- LCov: `coverage/lcov.info`

---

## 🔄 CI/CD 集成

### GitHub Actions 配置

创建 `.github/workflows/test.yml`：

```yaml
name: 集成测试

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18.x, 20.x]

    steps:
      - name: 检出代码
        uses: actions/checkout@v3

      - name: 设置 Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: 安装依赖
        run: npm ci

      - name: 运行单元测试
        run: npm run test:unit

      - name: 运行集成测试
        run: npm run test:integration
        env:
          ZHIPU_API_KEY: ${{ secrets.ZHIPU_API_KEY }}

      - name: 生成覆盖率报告
        run: npm run test:coverage

      - name: 上传覆盖率到 Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: unittests
          name: codecov-umbrella

      - name: 构建应用
        run: npm run build

      - name: 安装 Playwright 浏览器
        run: npx playwright install --with-deps

      - name: 运行 E2E 测试
        run: npm run test:e2e:headless

      - name: 上传测试报告
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-report
          path: |
            coverage/
            test-results/
            playwright-report/
```

### 本地 Pre-commit Hook

使用 Husky 设置 pre-commit hook：

```bash
# 安装 Husky
npm install --save-dev husky lint-staged

# 初始化 Husky
npx husky install

# 添加 pre-commit hook
npx husky add .husky/pre-commit "npx lint-staged"
```

配置 `.lintstagedrc.json`：

```json
{
  "*.{ts,tsx}": [
    "eslint --fix",
    "jest --bail --findRelatedTests"
  ]
}
```

---

## 📝 测试最佳实践

### 1. 测试命名规范

```typescript
// ✅ 好的命名
describe('AgenticOrchestrator', () => {
  describe('executeTask', () => {
    it('应该成功执行简单的数据处理任务', async () => {
      // 测试代码
    });

    it('应该在 AI 服务失败时使用降级策略', async () => {
      // 测试代码
    });

    it('应该在数据质量低时触发修复机制', async () => {
      // 测试代码
    });
  });
});

// ❌ 不好的命名
describe('Test', () => {
  it('works', () => {
    // 测试代码
  });
});
```

### 2. 测试隔离

```typescript
// ✅ 好的做法：每个测试独立
beforeEach(() => {
  // 重置所有 mocks
  jest.clearAllMocks();
});

afterEach(() => {
  // 清理副作用
  cleanup();
});

// ❌ 不好的做法：测试相互依赖
let sharedState;
```

### 3. 异步测试

```typescript
// ✅ 好的做法：使用 async/await
it('应该异步处理数据', async () => {
  const result = await asyncFunction();
  expect(result).toBe('expected');
});

// ✅ 或者使用 Promise
it('应该异步处理数据', () => {
  return asyncFunction().then(result => {
    expect(result).toBe('expected');
  });
});

// ❌ 不好的做法：忘记等待
it('应该异步处理数据', () => {
  asyncFunction(); // 缺少 await
  expect(result).toBe('expected');
});
```

### 4. Mock 和 Stub

```typescript
// ✅ 好的做法：Mock 外部依赖
jest.mock('../services/aiService', () => ({
  generateCode: jest.fn().mockResolvedValue({
    code: 'print("test")',
    explanation: '测试'
  })
}));

// ✅ 监控函数调用
expect(mockFunction).toHaveBeenCalledWith(expectedArgs);
expect(mockFunction).toHaveBeenCalledTimes(1);

// ❌ 不好的做法：Mock 被测试的代码
jest.mock('../services/targetService', () => ({
  targetFunction: jest.fn() // 不要 mock 被测试的函数
});
```

---

## 🔍 调试测试

### Jest 调试

```bash
# 运行单个测试文件
npm test -- services/agentic/AgenticOrchestrator.test.ts

# 运行单个测试用例
npm test -- -t "应该完整执行 OTAE 循环"

# 详细输出
npm test -- --verbose

# 调试模式（使用 Chrome DevTools）
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Playwright 调试

```bash
# 调试模式
npm run test:e2e:debug

# UI 模式
npm run test:e2e:ui

# 显示浏览器
npx playwright test --headed

# 慢动作模式
npx playwright test --slow-mo=1000
```

---

## 📚 相关文档

- [集成测试报告](./INTEGRATION_TEST_REPORT.md)
- [架构设计文档](./ARCHITECTURE.md)
- [API 规范](./API_SPECIFICATION.md)
- [测试文件示例](./services/integration.end-to-end.test.ts)

---

**最后更新**: 2026-01-24
**维护者**: Senior QA Engineer
**反馈**: 如有问题请提交 Issue
