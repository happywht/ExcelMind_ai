# 自动化测试引擎 - ExcelMind AI

## 📋 概述

这是 ExcelMind AI 项目的完整自动化测试引擎，提供全面的测试能力，确保代码质量和系统稳定性。

### 特性

- ✅ **完整的测试体系**：单元测试、集成测试、回归测试、性能测试
- ✅ **高覆盖率目标**：语句覆盖率 ≥90%，分支覆盖率 ≥85%
- ✅ **CI/CD集成**：GitHub Actions 自动化测试流水线
- ✅ **智能测试生成**：自动生成测试代码框架
- ✅ **性能基准**：内置性能测试和回归检测
- ✅ **详细报告**：HTML、JSON、控制台多格式测试报告

---

## 🚀 快速开始

### 安装依赖

```bash
pnpm install
```

### 运行测试

```bash
# 运行所有测试
pnpm test

# 运行单元测试
pnpm test:unit

# 运行集成测试
pnpm test:integration

# 运行回归测试
pnpm test:regression

# 运行性能测试
pnpm test:performance

# 生成覆盖率报告
pnpm test:coverage

# 监视模式
pnpm test:watch

# CI模式（验证）
pnpm test:ci
```

---

## 📁 项目结构

```
tests/
├── qa/                                    # QA测试引擎
│   ├── types.ts                          # 类型定义
│   ├── testGenerator.ts                  # 测试生成器
│   ├── testRunner.ts                     # 测试运行器
│   ├── coverageAnalyzer.ts               # 覆盖率分析器
│   ├── integrationTestSuite.ts           # 集成测试框架
│   ├── regressionTestSuite.ts            # 回归测试框架
│   ├── performanceTestSuite.ts           # 性能测试框架
│   ├── index.ts                          # 主入口
│   ├── TESTING_GUIDE.md                  # 测试指南
│   └── README.md                         # 本文件
├── setup.ts                              # 测试环境设置
└── ...

services/                                 # 业务代码
├── queryEngine/
│   ├── DataQueryEngine.unit.test.ts     # 单元测试示例
│   └── ...
├── infrastructure/
│   ├── cacheService.unit.test.ts        # 单元测试示例
│   └── ...
├── integration.end-to-end.test.ts        # 集成测试示例
└── ...

.github/workflows/
└── test.yml                              # CI/CD配置

jest.config.js                            # Jest配置
```

---

## 🧪 测试类型

### 1. 单元测试

测试单个函数或类的行为。

```typescript
describe('CacheService', () => {
  it('应该正确存储和获取数据', async () => {
    const cache = new CacheService();
    await cache.set('key', { value: 'data' });
    const result = await cache.get('key');
    expect(result?.value).toBe('data');
  });
});
```

### 2. 集成测试

测试多个组件协同工作。

```typescript
describe('端到端集成测试', () => {
  it('应该完成完整的查询流程', async () => {
    const engine = new DataQueryEngine();
    await engine.initialize();
    engine.loadExcelData(data);
    const result = await engine.query({ sql: 'SELECT * FROM table' });
    expect(result.success).toBe(true);
  });
});
```

### 3. 回归测试

确保新代码不破坏现有功能。

```typescript
const suite = new RegressionTestSuite();
suite.addTests(createCommonRegressionTests());
await suite.runAll();
```

### 4. 性能测试

验证系统性能是否达标。

```typescript
const perfSuite = new PerformanceTestSuite();
await perfSuite.runPerformanceTest({
  name: '查询性能',
  test: async () => { /* 测试代码 */ },
  benchmark: { iterations: 100 },
  thresholds: { maxDuration: 100 }
});
```

---

## 📊 覆盖率目标

| 指标 | 目标 | 当前状态 |
|------|------|----------|
| 语句覆盖率 | ≥90% | 🎯 待测试 |
| 分支覆盖率 | ≥85% | 🎯 待测试 |
| 函数覆盖率 | ≥95% | 🎯 待测试 |
| 行覆盖率 | ≥90% | 🎯 待测试 |

### 查看覆盖率

```bash
pnpm test:coverage
```

报告生成在 `coverage/index.html`

---

## 🔄 CI/CD集成

### GitHub Actions

测试在以下情况自动运行：

- ✅ 推送到主分支
- ✅ 创建 Pull Request
- ✅ 每日定时运行（凌晨2点）

### 质量门

代码合并前必须通过：

1. 所有单元测试通过
2. 所有集成测试通过
3. 覆盖率达到阈值
4. 没有性能退化

### 查看CI状态

```bash
# 查看最近的workflow运行
gh run list

# 查看特定运行的详情
gh run view <run-id>
```

---

## 🛠️ 使用QA引擎

### 编程方式使用

```typescript
import { createTestEngine, runAllTests } from './tests/qa';

// 创建测试引擎
const engine = createTestEngine(process.cwd());

// 运行所有测试
const result = await engine.runner.runAllTests();

// 分析覆盖率
const coverage = await engine.coverage.analyzeCoverage();

// 生成报告
const report = engine.runner.generateReport(result);
```

### 便捷函数

```typescript
import { runAllTests, analyzeCoverage, generateTestReport } from './tests/qa';

// 运行所有测试
const testResult = await runAllTests(process.cwd());

// 分析覆盖率
const coverageData = await analyzeCoverage(process.cwd());

// 生成完整报告
const report = await generateTestReport(process.cwd());
```

---

## 📝 测试编写规范

### 命名规范

- 单元测试：`{ServiceName}.unit.test.ts`
- 集成测试：`{ModuleName}.integration.test.ts`
- 回归测试：`{ModuleName}.regression.test.ts`
- 性能测试：`{ServiceName}.performance.test.ts`

### 测试结构

使用 AAA 模式（Arrange-Act-Assert）：

```typescript
it('应该正确过滤数据', () => {
  // Arrange (准备)
  const data = [1, 2, 3, 4, 5];
  const filter = new DataFilter();

  // Act (执行)
  const result = filter.greaterThan(data, 3);

  // Assert (断言)
  expect(result).toEqual([4, 5]);
});
```

### 最佳实践

1. **保持测试简单**：每个测试只验证一件事
2. **使用有意义的断言**：避免使用 `toBeDefined()` 等
3. **Mock外部依赖**：隔离测试环境
4. **测试边界条件**：空值、null、大数组等
5. **保持测试独立**：每个测试应该能独立运行

详细指南请参考 [TESTING_GUIDE.md](./TESTING_GUIDE.md)

---

## 🐛 调试测试

### 运行特定测试

```bash
# 运行特定文件
pnpm test DataQueryEngine

# 运行特定测试
pnpm test --testNamePattern="应该正确初始化"

# 只运行失败的测试
pnpm test --onlyFailures
```

### 调试模式

在测试中使用 `debugger`：

```typescript
it('调试测试', () => {
  const result = service.process();
  debugger; // 在这里暂停
  expect(result).toBe(true);
});
```

然后使用 Node.js 调试器运行：

```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

---

## 📈 性能基准

### 目标性能指标

| 操作 | 目标 | 当前 |
|------|------|------|
| 简单查询 | <100ms | 🎯 待测试 |
| 复杂查询 | <500ms | 🎯 待测试 |
| 缓存读取 | <10ms | 🎯 待测试 |
| 数据加载 | <200ms | 🎯 待测试 |

### 运行性能测试

```bash
pnpm test:performance
```

---

## 🔧 配置

### Jest配置

`jest.config.js` 包含完整的Jest配置：

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  coverageThresholds: {
    global: {
      statements: 90,
      branches: 85,
      functions: 95,
      lines: 90
    }
  }
};
```

### 自定义配置

可以在项目中创建 `jest.config.local.js` 覆盖默认配置：

```javascript
module.exports = {
  // 项目特定的配置
  testMatch: ['**/*.custom.test.ts'],
  coverageThresholds: {
    global: {
      statements: 95  // 更高的覆盖率要求
    }
  }
};
```

---

## 🤝 贡献

提交代码前请确保：

1. ✅ 新功能包含对应的单元测试
2. ✅ 覆盖率没有下降
3. ✅ 所有测试通过：`pnpm test:all`
4. ✅ 添加了集成测试（如适用）

### 添加新测试

```bash
# 创建测试文件
touch services/yourService/yourService.unit.test.ts

# 编写测试
# ...

# 运行验证
pnpm test yourService
```

---

## 📚 相关文档

- [测试指南](./TESTING_GUIDE.md) - 详细的测试编写指南
- [Jest文档](https://jestjs.io/) - Jest官方文档
- [最佳实践](https://github.com/goldbergyoni/javascript-testing-best-practices) - JavaScript测试最佳实践

---

## ❓ 常见问题

### Q: 测试运行很慢怎么办？

A: 可以使用并行测试：
```bash
pnpm test --maxWorkers=4
```

### Q: 如何跳过某些测试？

A: 使用 `skip`：
```typescript
it.skip('暂跳过的测试', () => {
  // ...
});
```

### Q: 如何只运行特定测试？

A: 使用 `only`：
```typescript
it.only('只运行这个测试', () => {
  // ...
});
```

### Q: 覆盖率不达标怎么办？

A: 查看未覆盖代码并添加测试：
```bash
pnpm test:coverage
# 打开 coverage/lcov-report/index.html
```

---

## 📞 支持

如有问题，请：

1. 查阅 [TESTING_GUIDE.md](./TESTING_GUIDE.md)
2. 搜索现有 Issues
3. 创建新的 Issue 并附上详细信息

---

**版本**: 1.0.0
**最后更新**: 2025-12-28
**维护者**: ExcelMind AI 团队
