# 基础设施服务 - 运行脚本

## 推荐的 package.json 脚本配置

在项目的 `package.json` 中添加以下脚本：

```json
{
  "scripts": {
    "test:infrastructure": "jest services/infrastructure/__tests__",
    "test:infrastructure:watch": "jest services/infrastructure/__tests__ --watch",
    "test:infrastructure:coverage": "jest services/infrastructure/__tests__ --coverage",
    "test:cache": "jest services/infrastructure/__tests__/cacheService.test.ts",
    "test:eventbus": "jest services/infrastructure/__tests__/eventBus.test.ts",
    "test:retry": "jest services/infrastructure/__tests__/retryService.test.ts",
    "bench:infrastructure": "ts-node services/infrastructure/__tests__/performance.bench.ts",
    "example:infrastructure": "ts-node services/infrastructure/examples/usage-examples.ts"
  }
}
```

## 使用示例

### 运行所有测试

```bash
npm run test:infrastructure
```

### 运行特定服务的测试

```bash
# 测试缓存服务
npm run test:cache

# 测试事件总线
npm run test:eventbus

# 测试重试服务
npm run test:retry
```

### 监视模式测试

```bash
npm run test:infrastructure:watch
```

### 生成测试覆盖率报告

```bash
npm run test:infrastructure:coverage
```

### 运行性能基准测试

```bash
npm run bench:infrastructure
```

### 运行使用示例

```bash
npm run example:infrastructure
```

## Jest 配置

确保在 `jest.config.js` 或 `package.json` 中包含以下配置：

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/services'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'services/infrastructure/**/*.ts',
    '!services/infrastructure/**/*.test.ts',
    '!services/infrastructure/**/__tests__/**',
    '!services/infrastructure/**/*.d.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js']
};
```

## TS Config (tsconfig.json)

确保 TypeScript 配置支持测试：

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020", "DOM"],
    "jsx": "react",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "types": ["jest", "node"]
  },
  "include": [
    "services/**/*.ts"
  ],
  "exclude": [
    "node_modules",
    "**/*.test.ts"
  ]
}
```

## 开发工作流

### 1. 开发新功能

```bash
# 启动监视模式，实时反馈
npm run test:infrastructure:watch
```

### 2. 提交前检查

```bash
# 运行所有测试并生成覆盖率报告
npm run test:infrastructure:coverage
```

### 3. 性能验证

```bash
# 运行性能基准测试
npm run bench:infrastructure
```

### 4. 本地验证示例

```bash
# 运行使用示例，验证功能
npm run example:infrastructure
```

## CI/CD 集成

### GitHub Actions 示例

```yaml
name: Infrastructure Tests

on:
  push:
    paths:
      - 'services/infrastructure/**'
  pull_request:
    paths:
      - 'services/infrastructure/**'

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run infrastructure tests
        run: npm run test:infrastructure

      - name: Generate coverage report
        run: npm run test:infrastructure:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: infrastructure
```

## 调试技巧

### VS Code 调试配置

创建 `.vscode/launch.json`：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Jest: Current File",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": [
        "${fileBasename}",
        "--config",
        "jest.config.js"
      ],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Run Infrastructure Examples",
      "program": "${workspaceFolder}/node_modules/ts-node/dist/bin.js",
      "args": [
        "services/infrastructure/examples/usage-examples.ts"
      ],
      "console": "integratedTerminal"
    }
  ]
}
```

### 调试测试

1. 在测试文件中设置断点
2. 按 F5 或选择 "Jest: Current File" 配置
3. 开始调试

### 日志输出

在测试中使用 `console.log` 输出调试信息：

```typescript
test('调试示例', () => {
  console.log('调试信息:', someVariable);
  expect(someVariable).toBe(expectedValue);
});
```

## 常见问题

### Q: 测试运行很慢怎么办？

A: 使用 `jest.maxWorkers` 限制并行工作进程数：

```json
{
  "scripts": {
    "test:infrastructure": "jest --maxWorkers=2"
  }
}
```

### Q: 如何只运行失败的测试？

```bash
npm run test:infrastructure -- --onlyFailures
```

### Q: 如何运行特定的测试用例？

```bash
npm run test:infrastructure -- -t "缓存命中统计"
```

### Q: 内存缓存测试失败？

确保每个测试后清理缓存：

```typescript
afterEach(async () => {
  await cacheService.clear();
});
```

## 性能基准参考值

根据性能基准测试，以下是期望的性能指标：

### 缓存服务
- 内存写入: < 1ms
- 内存读取: < 0.1ms
- 键生成: < 0.05ms
- LRU淘汰 (150条): < 50ms

### 事件总线
- 发布 (无订阅者): < 0.1ms
- 发布 (1个订阅者): < 0.2ms
- 发布 (10个订阅者): < 1ms
- 订阅操作: < 0.1ms

### 重试服务
- 延迟计算: < 0.01ms
- 错误判断: < 0.01ms
- 成功执行: < 1ms
- 快速重试 (3次): < 500ms

如果测试结果明显超过这些值，可能需要检查实现或优化。
