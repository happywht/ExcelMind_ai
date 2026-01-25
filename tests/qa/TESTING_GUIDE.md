# ExcelMind AI 测试指南

## 📚 目录

- [测试策略](#测试策略)
- [测试类型](#测试类型)
- [测试编写规范](#测试编写规范)
- [测试最佳实践](#测试最佳实践)
- [CI/CD集成](#cicd集成)
- [常见问题解答](#常见问题解答)

---

## 🎯 测试策略

### 测试金字塔

我们采用测试金字塔策略，确保测试覆盖的平衡：

```
        /\
       /  \      E2E Tests (少量)
      /    \
     /------\    Integration Tests (适量)
    /        \
   /----------\  Unit Tests (大量)
  /____________\
```

**分配比例**：
- 单元测试：70% - 快速、隔离、可靠
- 集成测试：20% - 验证组件交互
- E2E测试：10% - 验证关键用户流程

### 覆盖率目标

| 指标 | 目标 | 说明 |
|------|------|------|
| 语句覆盖率 | ≥90% | 代码语句执行比例 |
| 分支覆盖率 | ≥85% | 条件分支覆盖比例 |
| 函数覆盖率 | ≥95% | 函数调用覆盖比例 |
| 行覆盖率 | ≥90% | 代码行执行比例 |

---

## 🧪 测试类型

### 1. 单元测试 (Unit Tests)

**定义**：测试单个函数、类或组件的行为。

**示例**：
```typescript
// services/cacheService.unit.test.ts

import { CacheService } from './cacheService';

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    cacheService = new CacheService({
      memory: { maxSize: 100, ttl: 3600 },
      localStorage: { enabled: false, maxSize: 0, ttl: 0 },
      indexedDB: { enabled: false, dbName: '', storeName: '' },
      strategy: 'memory'
    });
  });

  describe('set/get', () => {
    it('应该正确存储和获取数据', async () => {
      await cacheService.set('test', { value: 'data' });
      const result = await cacheService.get('test');

      expect(result).toBeDefined();
      expect(result?.value).toEqual('data');
    });

    it('应该在数据不存在时返回null', async () => {
      const result = await cacheService.get('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('TTL', () => {
    it('应该在TTL过期后返回null', async () => {
      await cacheService.set('test', { value: 'data' }, 0.1); // 100ms TTL

      await new Promise(resolve => setTimeout(resolve, 150));

      const result = await cacheService.get('test');
      expect(result).toBeNull();
    });
  });
});
```

### 2. 集成测试 (Integration Tests)

**定义**：测试多个组件协同工作的行为。

**示例**：
```typescript
// services/queryEngine.integration.test.ts

import { DataQueryEngine } from './queryEngine';
import { ExcelData } from '../../types';

describe('DataQueryEngine - 集成测试', () => {
  let engine: DataQueryEngine;
  let excelData: ExcelData;

  beforeAll(async () => {
    engine = new DataQueryEngine();
    await engine.initialize();

    excelData = {
      sheets: {
        'Products': [
          { id: 1, name: 'Product A', price: 100 },
          { id: 2, name: 'Product B', price: 200 }
        ]
      }
    };
  });

  it('应该完成从数据加载到查询的完整流程', async () => {
    // 1. 加载数据
    engine.loadExcelData(excelData);

    // 2. 执行查询
    const result = await engine.query({
      sql: 'SELECT * FROM [Products] WHERE price > 100'
    });

    // 3. 验证结果
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe('Product B');
  });
});
```

### 3. 回归测试 (Regression Tests)

**定义**：确保新代码不会破坏现有功能。

**示例**：
```typescript
// services/performance.regression.test.ts

import { RegressionTestSuite } from '../qa/regressionTestSuite';

describe('性能回归测试', () => {
  const suite = new RegressionTestSuite();

  beforeAll(() => {
    suite.addTests(createCommonRegressionTests());
  });

  it('数据查询性能应该在基线范围内', async () => {
    const results = await suite.runModuleTests('DataQueryEngine');

    const queryTest = results.find(r => r.name === '数据查询引擎性能');
    expect(queryTest?.withinTolerance).toBe(true);
  });
});
```

### 4. 性能测试 (Performance Tests)

**定义**：验证系统性能是否满足要求。

**示例**：
```typescript
// services/cacheService.performance.test.ts

import { PerformanceTestSuite } from '../qa/performanceTestSuite';

describe('CacheService 性能测试', () => {
  const suite = new PerformanceTestSuite();

  it('缓存读写应该满足性能要求', async () => {
    const result = await suite.runPerformanceTest({
      name: '缓存读写性能',
      test: async () => {
        const cache = new Map();
        for (let i = 0; i < 1000; i++) {
          cache.set(`key${i}`, { value: i });
          cache.get(`key${i}`);
        }
      },
      benchmark: {
        iterations: 100,
        warmupIterations: 10,
        concurrency: 1
      },
      thresholds: {
        maxDuration: 50,
        maxMemory: 1024 * 1024
      }
    });

    expect(result.meetsThreshold).toBe(true);
    expect(result.avgDuration).toBeLessThan(50);
  });
});
```

---

## 📝 测试编写规范

### 命名规范

**文件命名**：
- 单元测试：`{serviceName}.unit.test.ts`
- 集成测试：`{serviceName}.integration.test.ts`
- 回归测试：`{moduleName}.regression.test.ts`
- 性能测试：`{serviceName}.performance.test.ts`

**测试描述**：
- 使用清晰、描述性的名称
- 格式：`应该{预期行为}当{条件}`
- 示例：`应该返回空数组当数据不存在`

### 测试结构

使用AAA模式（Arrange-Act-Assert）：

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

### 测试隔离

每个测试应该独立运行：

```typescript
describe('MyService', () => {
  let service: MyService;

  beforeEach(() => {
    // 每个测试前创建新实例
    service = new MyService();
  });

  afterEach(() => {
    // 每个测试后清理
    service.dispose();
  });

  it('测试1', () => {
    // 不依赖其他测试的状态
  });

  it('测试2', () => {
    // 完全独立
  });
});
```

---

## ✨ 测试最佳实践

### 1. 保持测试简单

❌ 不好的做法：
```typescript
it('复杂的测试', () => {
  const service = new Service();
  service.init(config1, config2, config3);
  service.connect();
  service.authenticate();
  service.loadData();
  service.process();
  service.save();
  service.disconnect();

  // 太多步骤，难以定位问题
});
```

✅ 好的做法：
```typescript
it('应该正确初始化', () => {
  const service = new Service();
  service.init(config);

  expect(service.isInitialized).toBe(true);
});

it('应该成功连接', () => {
  const service = new Service();
  service.init(config);
  service.connect();

  expect(service.isConnected).toBe(true);
});
```

### 2. 使用有意义的断言

❌ 不好的做法：
```typescript
expect(result).toBeDefined();
expect(result).toBeTruthy();
```

✅ 好的做法：
```typescript
expect(result.id).toBe(123);
expect(result.name).toEqual('Product A');
expect(result.items).toHaveLength(5);
```

### 3. Mock外部依赖

```typescript
import { jest } from '@jest/globals';

describe('MyService', () => {
  it('应该正确调用API', async () => {
    // Mock API调用
    const apiMock = jest.fn().mockResolvedValue({ data: 'test' });

    const service = new MyService(apiMock);
    await service.fetchData();

    expect(apiMock).toHaveBeenCalledWith('/endpoint');
    expect(apiMock).toHaveBeenCalledTimes(1);
  });
});
```

### 4. 测试边界条件

```typescript
describe('ArrayUtils', () => {
  describe('filter', () => {
    it('应该处理空数组', () => {
      expect(filter([], () => true)).toEqual([]);
    });

    it('应该处理null输入', () => {
      expect(filter(null as any, () => true)).toEqual([]);
    });

    it('应该处理单元素数组', () => {
      expect(filter([1], () => true)).toEqual([1]);
    });

    it('应该处理大数组', () => {
      const largeArray = new Array(10000).fill(0);
      expect(() => filter(largeArray, () => true)).not.toThrow();
    });
  });
});
```

### 5. 使用测试工具函数

```typescript
// helpers/testHelpers.ts

export async function waitForCondition(
  condition: () => boolean,
  timeout: number = 5000
): Promise<void> {
  const startTime = Date.now();

  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Condition not met within timeout');
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

export function createMockExcelData(): ExcelData {
  return {
    sheets: {
      'Sheet1': [
        { id: 1, name: 'Item 1', value: 100 }
      ]
    }
  };
}
```

---

## 🔄 CI/CD集成

### GitHub Actions工作流

测试在以下情况下自动运行：
- 推送到主分支
- 创建Pull Request
- 每日定时运行（凌晨2点）

### 质量门

代码必须满足以下条件才能合并：
1. ✅ 所有单元测试通过
2. ✅ 所有集成测试通过
3. ✅ 覆盖率达到阈值
4. ✅ 没有性能退化

### 本地运行测试

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

# CI模式（用于本地验证）
pnpm test:ci
```

---

## ❓ 常见问题解答

### Q1: 如何调试失败的测试？

使用`.only`专注运行特定测试：

```typescript
describe('MyService', () => {
  it.only('失败的测试', () => {
    // 只运行这个测试
  });

  it('其他测试', () => {
    // 不会运行
  });
});
```

使用`console.log`或`debugger`：

```typescript
it('调试测试', () => {
  const result = service.process();
  console.log('结果:', result); // 查看输出
  debugger; // 在调试器中暂停
  expect(result).toBe(true);
});
```

### Q2: 如何处理异步代码？

使用`async/await`：

```typescript
it('应该正确处理异步操作', async () => {
  const result = await asyncFunction();
  expect(result).toBe('expected');
});
```

使用`done`回调（旧方式）：

```typescript
it('应该正确处理回调', (done) => {
  callbackFunction((result) => {
    expect(result).toBe('expected');
    done(); // 记得调用done
  });
});
```

### Q3: 如何Mock模块？

使用`jest.mock`：

```typescript
import { ExternalService } from './external';

jest.mock('./external', () => ({
  ExternalService: jest.fn().mockImplementation(() => ({
    fetchData: jest.fn().mockResolvedValue({ data: 'mocked' })
  }))
}));
```

### Q4: 如何测试错误处理？

```typescript
it('应该正确处理错误', async () => {
  const service = new Service();

  // 测试抛出错误
  await expect(service.processInvalidData())
    .rejects.toThrow('Invalid data');

  // 测试错误消息
  await expect(service.processInvalidData())
    .rejects.toThrow('Invalid data');
});
```

### Q5: 如何提高测试性能？

1. **使用测试隔离**：避免不必要的`beforeAll`初始化
2. **减少I/O操作**：Mock文件系统、数据库等
3. **并行执行**：Jest默认并行运行测试
4. **选择性运行**：使用匹配模式只运行相关测试

```bash
# 只运行特定文件的测试
pnpm test cacheService

# 只运行匹配模式的测试
pnpm test --testNamePattern="缓存"
```

### Q6: 覆盖率不达标怎么办？

1. **识别未覆盖代码**：
```bash
pnpm test:coverage
# 查看 coverage/lcov-report/index.html
```

2. **为未覆盖代码添加测试**：
- 检查`coverage/lcov.info`文件
- 找到标记为`DA:0`的行（未执行）
- 编写测试覆盖这些行

3. **忽略不重要的代码**：
在测试文件中添加注释：
```typescript
/* istanbul ignore next */
function unusedFunction() {
  // 这个函数不会被测试
}
```

---

## 📚 参考资源

- [Jest官方文档](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [单元测试的艺术](https://martinfowler.com/bliki/UnitTest.html)

---

## 🤝 贡献指南

提交代码前请确保：

1. ✅ 新功能包含对应的单元测试
2. ✅ 覆盖率没有下降
3. ✅ 所有测试通过
4. ✅ 添加了集成测试（如适用）

```bash
# 完整测试流程
pnpm test:all           # 运行所有测试
pnpm test:coverage      # 检查覆盖率
pnpm test:ci            # CI验证
```

---

**最后更新**: 2025-12-28
**维护者**: ExcelMind AI 团队
