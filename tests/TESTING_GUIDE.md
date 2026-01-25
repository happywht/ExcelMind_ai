# Phase 2 测试指南

## 概述

本指南提供了Phase 2功能测试的完整说明，包括如何运行测试、编写新测试以及理解测试结果。

## 目录

1. [快速开始](#快速开始)
2. [测试框架](#测试框架)
3. [运行测试](#运行测试)
4. [编写测试](#编写测试)
5. [测试最佳实践](#测试最佳实践)
6. [故障排查](#故障排查)

## 快速开始

### 安装依赖

```bash
npm install
```

### 运行所有测试

```bash
npm test
```

### 运行特定类型的测试

```bash
# 单元测试
npm run test:unit

# 集成测试
npm run test:integration

# E2E测试
npm run test:e2e
```

### 查看覆盖率报告

```bash
npm run test:coverage
```

## 测试框架

### Vitest (单元测试和集成测试)

**配置文件**: `vitest.config.ts`

**特点**:
- 原生ESM支持
- 与Vite完美集成
- 更快的执行速度
- 内置覆盖率工具

**测试设置**:
- `tests/setup.vitest.ts` - 通用测试设置
- `tests/mocks/vitestSetup.ts` - Mock和全局配置

### Playwright (E2E测试)

**配置文件**: `playwright.config.ts`

**特点**:
- 跨浏览器支持
- 自动等待机制
- 强大的选择器
- 内置截图和录屏

## 运行测试

### 开发模式

运行测试并监听文件变化：

```bash
npx vitest --watch
```

### 调试模式

使用UI模式调试测试：

```bash
npx vitest --ui
```

### 单个测试文件

运行特定的测试文件：

```bash
npx vitest tests/unit/services/cleaningRecommendationEngine.test.ts
```

### 单个测试用例

使用`.only`运行单个测试：

```typescript
test.only('应该成功分析数据', async () => {
  // 测试代码
});
```

### 跳过测试

使用`.skip`跳过测试：

```typescript
test.skip('暂未实现的功能', async () => {
  // 测试代码
});
```

## 编写测试

### 单元测试模板

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { YourService } from '../../../services/YourService';
import { MockAIService, MockCacheService } from '../../../utils/apiMock';

describe('YourService', () => {
  let service: YourService;
  let mockAIService: MockAIService;
  let mockCacheService: MockCacheService;

  beforeEach(() => {
    mockAIService = new MockAIService();
    mockCacheService = new MockCacheService();
    service = new YourService(mockAIService, mockCacheService);
  });

  afterEach(() => {
    mockCacheService.reset();
    mockAIService.reset();
  });

  it('应该成功执行操作', async () => {
    // Arrange
    const input = createMockInput();

    // Act
    const result = await service.execute(input);

    // Assert
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });
});
```

### 集成测试模板

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ServiceA } from '../../../services/ServiceA';
import { ServiceB } from '../../../services/ServiceB';

describe('集成测试场景', () => {
  let serviceA: ServiceA;
  let serviceB: ServiceB;

  beforeAll(() => {
    serviceA = new ServiceA();
    serviceB = new ServiceB();
  });

  afterAll(() => {
    // 清理资源
  });

  it('应该完成完整的业务流程', async () => {
    // 步骤1
    const result1 = await serviceA.step1();
    expect(result1).toBeDefined();

    // 步骤2
    const result2 = await serviceB.step2(result1);
    expect(result2).toBeDefined();

    // 验证最终结果
    expect(result2.success).toBe(true);
  });
});
```

### E2E测试模板

```typescript
import { test, expect } from '@playwright/test';

test.describe('用户功能测试', () => {
  test('应该完成用户操作流程', async ({ page }) => {
    // 1. 导航到页面
    await page.goto('/your-page');
    await expect(page.locator('h1')).toContainText('标题');

    // 2. 执行操作
    await page.click('button:has-text("点击")');

    // 3. 验证结果
    await expect(page.locator('.result')).toBeVisible();
  });
});
```

## 测试最佳实践

### 1. AAA模式

使用Arrange-Act-Assert模式组织测试：

```typescript
it('应该计算总价', async () => {
  // Arrange - 准备测试数据
  const items = [
    { price: 100, quantity: 2 },
    { price: 50, quantity: 1 }
  ];

  // Act - 执行被测试的操作
  const total = calculateTotal(items);

  // Assert - 验证结果
  expect(total).toBe(250);
});
```

### 2. 测试命名

使用清晰的测试描述：

```typescript
// 好的命名
it('当数据包含缺失值时，应该返回medium严重程度', async () => {
  // 测试代码
});

// 不好的命名
it('测试1', async () => {
  // 测试代码
});
```

### 3. 测试隔离

确保测试之间相互独立：

```typescript
describe('测试套件', () => {
  beforeEach(() => {
    // 每个测试前重置状态
    mockService.reset();
  });

  afterEach(() => {
    // 每个测试后清理
  });
});
```

### 4. 使用测试辅助函数

利用测试工具函数简化代码：

```typescript
import {
  createMockDataQualityIssue,
  createMockExcelData,
  measureExecutionTime
} from '../../../utils/testHelpers';

it('应该快速处理大数据', async () => {
  const largeData = createMockExcelData(createLargeTestData(10000));

  const { result, duration } = await measureExecutionTime(
    () => analyzer.analyze(largeData)
  );

  expect(duration).toBeLessThan(5000);
});
```

### 5. Mock外部依赖

正确Mock外部服务：

```typescript
it('应该正确处理AI服务响应', async () => {
  // 设置Mock响应
  mockAIService.setCustomResponse('预定义的AI响应');

  // 执行测试
  const result = await service.processData();

  // 验证结果
  expect(result).toBe('预定义的AI响应');
});
```

### 6. 测试边界条件

覆盖边界情况和异常情况：

```typescript
describe('边界条件测试', () => {
  it('应该处理空数据', async () => {
    const result = await service.process([]);
    expect(result).toBeDefined();
  });

  it('应该处理无效输入', async () => {
    await expect(
      service.process(null)
    ).rejects.toThrow('Invalid input');
  });

  it('应该处理大数据集', async () => {
    const largeData = createLargeData(100000);
    const result = await service.process(largeData);
    expect(result).toBeDefined();
  });
});
```

## 测试工具

### 测试辅助函数

**文件**: `tests/utils/testHelpers.ts`

提供以下功能：

```typescript
// 创建Mock对象
createMockDataQualityIssue(overrides?)
createMockCleaningSuggestion(overrides?)
createMockTemplateInfo(overrides?)
createMockBatchTask(overrides?)

// 创建测试数据
createMockExcelData(data, sheetName?)
createTestDataWithMissingValues()
createTestDataWithOutliers()
createTestDataWithDuplicates()
createCleanTestData()
createLargeTestData(rowCount?)

// 性能测试
measureExecutionTime(fn)
measureMultipleRuns(fn, runs?)

// API测试
createMockRequest(overrides?)
createMockResponse()
```

### Mock数据集

**文件**: `tests/utils/mockData.ts`

包含各种预定义的测试数据：

```typescript
import {
  customerData,
  salesData,
  employeeData,
  mockDataQualityReports,
  mockCleaningSuggestions,
  mockTemplates,
  mockBatchTasks
} from '../../../utils/mockData';
```

### API Mock服务

**文件**: `tests/utils/apiMock.ts`

提供可配置的Mock服务：

```typescript
import {
  MockAIService,
  MockCacheService,
  MockFileService,
  MockWebSocketService,
  MockDatabaseService
} from '../../../utils/apiMock';

// 使用示例
const mockAI = new MockAIService();
mockAI.setResponseDelay(1000); // 设置延迟
mockAI.setShouldFail(true); // 模拟错误
mockAI.setCustomResponse('自定义响应'); // 自定义响应
```

## 故障排查

### 测试超时

**问题**: 测试超时失败

**解决方案**:
1. 增加测试超时时间：
```typescript
test('慢速测试', async () => {
  // 测试代码
}, { timeout: 30000 });
```

2. 检查异步操作是否正确等待：
```typescript
it('应该等待异步操作', async () => {
  await asyncOperation(); // 使用await
  expect(result).toBeDefined();
});
```

### Mock不工作

**问题**: Mock函数没有被调用

**解决方案**:
1. 确保Mock正确设置：
```typescript
beforeEach(() => {
  vi.clearAllMocks(); // 清除之前的Mock
});
```

2. 验证Mock调用：
```typescript
expect(mockFunction).toHaveBeenCalled();
expect(mockFunction).toHaveBeenCalledWith(expectedArgs);
```

### 测试环境问题

**问题**: 测试环境中缺少浏览器API

**解决方案**:
1. 检查测试设置文件：
```typescript
// tests/setup.vitest.ts
global.localStorage = {...};
global.fetch = vi.fn();
```

2. 使用正确的测试环境：
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom' // 或 'node'
  }
});
```

### 覆盖率不达标

**问题**: 测试覆盖率低于目标

**解决方案**:
1. 查看覆盖率报告：
```bash
npm run test:coverage
```

2. 识别未覆盖的代码
3. 添加相应的测试用例
4. 使用分支覆盖确保所有代码路径都被测试

## 持续集成

### CI配置示例

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - run: npm install
      - run: npm run test:coverage

      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

## 资源链接

### 官方文档
- [Vitest文档](https://vitest.dev/)
- [Playwright文档](https://playwright.dev/)
- [Testing Library文档](https://testing-library.com/)

### 项目文档
- [API规范](../API_SPECIFICATION.md)
- [架构文档](../ARCHITECTURE.md)
- [测试覆盖率报告](./TEST_COVERAGE_REPORT.md)

## 贡献指南

### 添加新测试

1. 确定测试类型（单元/集成/E2E）
2. 选择合适的测试文件位置
3. 使用模板创建测试
4. 确保测试命名清晰
5. 添加必要的Mock和辅助函数
6. 运行测试验证通过
7. 更新覆盖率报告

### 测试审查清单

- [ ] 测试命名清晰且描述性强
- [ ] 测试独立且可重复运行
- [ ] 包含正面和负面测试用例
- [ ] 覆盖边界条件
- [ ] 正确Mock外部依赖
- [ ] 包含必要的断言
- [ ] 测试性能可接受
- [ ] 文档完整

## 常见问题

### Q: 如何测试异步代码？
A: 使用async/await和返回Promise：

```typescript
it('应该处理异步操作', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});
```

### Q: 如何测试错误情况？
A: 使用assertions或expect().toThrow():

```typescript
it('应该抛出错误', async () => {
  await expect(
    asyncFunction()
  ).rejects.toThrow('Expected error');
});
```

### Q: 如何共享测试数据？
A: 使用测试辅助函数或fixture：

```typescript
const testData = createTestData();

it('测试1', () => {
  const data = { ...testData };
  // 使用data
});

it('测试2', () => {
  const data = { ...testData };
  // 使用data
});
```

## 总结

本指南涵盖了Phase 2测试的各个方面。遵循这些最佳实践，可以确保测试质量和可维护性。

记住：
- 测试是代码质量的重要保障
- 好的测试需要精心设计
- 持续维护和更新测试
- 保持测试简单和 focused

如有疑问，请参考官方文档或联系测试团队。
