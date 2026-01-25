# 🚀 自动化测试引擎 - 快速入门

## 1️⃣ 安装依赖

```bash
pnpm install
```

这将安装以下新增的测试依赖：
- `jest` - 测试框架
- `ts-jest` - TypeScript预处理器
- `@types/jest` - Jest类型定义
- `jest-environment-jsdom` - 浏览器环境模拟

---

## 2️⃣ 运行第一个测试

```bash
# 运行所有测试
pnpm test
```

你应该看到类似输出：
```
 PASS  services/infrastructure/cacheService.unit.test.ts
  CacheService
    基本操作
      ✓ 应该正确存储和获取数据 (5ms)
      ✓ 应该在数据不存在时返回null (2ms)
    ...
```

---

## 3️⃣ 生成覆盖率报告

```bash
pnpm test:coverage
```

报告生成在：
- `coverage/index.html` - HTML格式（推荐）
- `coverage/coverage-final.json` - JSON格式
- `coverage/lcov.info` - LCOV格式（用于CI）

打开报告：
```bash
# Windows
start coverage/index.html

# macOS
open coverage/index.html

# Linux
xdg-open coverage/index.html
```

---

## 4️⃣ 编写你的第一个测试

### 创建测试文件

```bash
# 在services目录下创建测试文件
touch services/myService/myService.unit.test.ts
```

### 编写测试代码

```typescript
import { MyService } from './myService';

describe('MyService', () => {
  let service: MyService;

  beforeEach(() => {
    service = new MyService();
  });

  describe('基本功能', () => {
    it('应该正确处理数据', () => {
      const input = { value: 'test' };
      const result = service.process(input);

      expect(result).toBeDefined();
      expect(result.value).toBe('test');
    });
  });
});
```

### 运行测试

```bash
# 运行特定测试文件
pnpm test myService

# 或使用监视模式
pnpm test:watch myService
```

---

## 5️⃣ 运行不同类型的测试

```bash
# 单元测试
pnpm test:unit

# 集成测试
pnpm test:integration

# 回归测试
pnpm test:regression

# 性能测试
pnpm test:performance

# 所有测试
pnpm test:all
```

---

## 6️⃣ 使用测试引擎

### 编程方式

```typescript
import { createTestEngine } from './tests/qa';

// 创建引擎
const engine = createTestEngine(process.cwd());

// 运行测试
const result = await engine.runner.runAllTests();

// 分析覆盖率
const coverage = await engine.coverage.analyzeCoverage();

// 生成报告
const report = engine.runner.generateReport(result);
```

### 使用便捷函数

```typescript
import { runAllTests, analyzeCoverage } from './tests/qa';

// 运行测试
const result = await runAllTests(process.cwd());

// 分析覆盖率
const coverage = await analyzeCoverage(process.cwd());
```

---

## 7️⃣ 集成测试示例

```typescript
import { IntegrationTestSuite, predefinedE2EScenarios } from './tests/qa';

const suite = new IntegrationTestSuite();

// 运行预定义场景
for (const scenario of predefinedE2EScenarios) {
  await suite.testE2E(scenario);
}
```

---

## 8️⃣ 性能测试示例

```typescript
import { PerformanceTestSuite } from './tests/qa';

const suite = new PerformanceTestSuite();

await suite.runPerformanceTest({
  name: '我的性能测试',
  test: async () => {
    // 你的测试代码
  },
  benchmark: {
    iterations: 100,
    warmupIterations: 10,
    concurrency: 1
  },
  thresholds: {
    maxDuration: 100,  // 最大100ms
    maxMemory: 1024 * 1024  // 最大1MB
  }
});
```

---

## 9️⃣ CI/CD集成

### 本地验证

```bash
# 运行CI模式（模拟CI环境）
pnpm test:ci
```

### GitHub Actions

推送到GitHub后，CI会自动运行：
1. 单元测试
2. 集成测试
3. 覆盖率检查
4. 性能测试
5. 质量门验证

查看状态：
```bash
# 使用GitHub CLI
gh run list

# 查看特定运行
gh run view <run-id>
```

---

## 🔟 调试测试

### 运行特定测试

```bash
# 运行特定文件
pnpm test cacheService

# 运行特定测试
pnpm test --testNamePattern="应该正确存储"

# 只运行失败的测试
pnpm test --onlyFailures
```

### 使用调试器

在代码中添加`debugger`：

```typescript
it('调试测试', () => {
  const result = service.process();
  debugger; // 在这里暂停
  expect(result).toBe(true);
});
```

然后：
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

---

## 📚 常用命令速查

| 命令 | 说明 |
|------|------|
| `pnpm test` | 运行所有测试 |
| `pnpm test:unit` | 单元测试 |
| `pnpm test:integration` | 集成测试 |
| `pnpm test:coverage` | 生成覆盖率 |
| `pnpm test:watch` | 监视模式 |
| `pnpm test:ci` | CI模式 |
| `pnpm test:check-coverage` | 检查覆盖率阈值 |

---

## 🆘 遇到问题？

### 测试失败

1. 查看详细错误信息：`pnpm test --verbose`
2. 运行特定测试：`pnpm test <test-name>`
3. 使用调试器定位问题

### 覆盖率不达标

1. 打开 `coverage/index.html` 查看未覆盖代码
2. 为红色区域（未覆盖）添加测试
3. 重新运行覆盖率测试

### 测试太慢

1. 使用并行执行：`pnpm test --maxWorkers=4`
2. 跳过慢测试：使用`skip`或修改配置

---

## 📖 更多资源

- 📖 [完整测试指南](./TESTING_GUIDE.md)
- 📖 [QA引擎README](./README.md)
- 📖 [实施总结](./AUTOMATION_ENGINE_SUMMARY.md)
- 📚 [Jest官方文档](https://jestjs.io/)

---

**祝你测试愉快！** 🎉
