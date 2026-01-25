# Week 1 单元测试快速指南

## 🚀 快速开始

### 安装依赖
```bash
npm install --save-dev jest @types/jest ts-jest
```

### 运行所有测试
```bash
npm test
```

### 运行特定测试
```bash
# 共享类型库测试
npm test -- packages/shared-types/__tests__/fileMetadata.test.ts
npm test -- packages/shared-types/__tests__/executionTypes.test.ts

# 降级策略测试
npm test -- services/infrastructure/degradation/__tests__/MemoryMonitor.test.ts
npm test -- services/infrastructure/degradation/__tests__/APICircuitBreaker.test.ts
npm test -- services/infrastructure/degradation/__tests__/DegradationManager.test.ts
npm test -- services/infrastructure/degradation/__tests__/DegradationNotifier.test.ts
```

### 生成覆盖率报告
```bash
npm test -- --coverage --coverageReporters="html"
```

---

## 📁 测试文件结构

```
excelmind-ai/
├── packages/
│   └── shared-types/
│       ├── __tests__/
│       │   ├── fileMetadata.test.ts      ✅ 67 tests
│       │   ├── executionTypes.test.ts    ✅ 45 tests
│       │   ├── validationTypes.test.ts   ⏸️  TODO
│       │   ├── errorTypes.test.ts        ⏸️  TODO
│       │   └── index.test.ts            ⏸️  TODO
│       └── types/
│           ├── fileMetadata.ts
│           ├── executionTypes.ts
│           ├── validationTypes.ts
│           └── errorTypes.ts
│
└── services/
    └── infrastructure/
        └── degradation/
            ├── __tests__/
            │   ├── MemoryMonitor.test.ts        ✅ 52 tests
            │   ├── APICircuitBreaker.test.ts    ✅ 48 tests
            │   ├── DegradationManager.test.ts   ✅ 43 tests
            │   └── DegradationNotifier.test.ts  ✅ 47 tests
            ├── MemoryMonitor.ts
            ├── APICircuitBreaker.ts
            ├── DegradationManager.ts
            └── DegradationNotifier.ts
```

---

## 📊 测试覆盖范围

### 共享类型库 (112个测试已完成)
- ✅ **fileMetadata.test.ts** - 67个测试
  - FileRole枚举、RelationshipType枚举
  - FileInfo、SheetInfo、DataQualityMetrics接口
  - FileRelationship、CrossSheetMapping、FileCollection
  - DataSourceConfig、ColumnDefinition
  - 类型兼容性和边界情况

- ✅ **executionTypes.test.ts** - 45个测试
  - ExecutionStage、ExecutionStatus、StepType枚举
  - TaskProgress、ExecutionStep、StepResult接口
  - ExecutionState、ExecutionHistoryEntry
  - DocumentGenerationTask、QualityReport
  - 类型兼容性和边界情况

- ⏸️ **validationTypes.test.ts** - TODO
  - ValidationLevel、ValidationStatus枚举
  - ValidationError、ValidationResult接口
  - ValidationMetrics、InternalControlMetrics
  - ValidationConfig、ValidationRule

- ⏸️ **errorTypes.test.ts** - TODO
  - ErrorCategory、ErrorSeverity、ErrorCode枚举
  - StandardError、ErrorResponse接口
  - ErrorAnalysis、ErrorStatistics
  - ErrorContext、ErrorHandlingOptions

### AI降级策略 (190个测试已完成)
- ✅ **MemoryMonitor.test.ts** - 52个测试
  - 内存监控和状态管理
  - 内存溢出预测
  - 操作风险评估
  - 内存清理和趋势分析
  - 边界情况和错误处理

- ✅ **APICircuitBreaker.test.ts** - 48个测试
  - API调用记录和统计
  - 熔断器状态转换
  - 自动恢复机制
  - 手动控制功能
  - 降级级别评估

- ✅ **DegradationManager.test.ts** - 43个测试
  - 降级决策和模式切换
  - 恢复条件和尝试
  - 健康检查
  - 统计信息收集
  - 自动降级触发

- ✅ **DegradationNotifier.test.ts** - 47个测试
  - 通知和事件系统
  - 模式变更通知
  - 预警触发
  - 历史记录管理
  - 并发操作处理

---

## 🎯 测试目标

### 覆盖率目标: 80%+
```
当前预估覆盖率:
├── fileMetadata          85-90%  ✅
├── executionTypes        85-90%  ✅
├── MemoryMonitor         80-85%  ✅
├── APICircuitBreaker     82-88%  ✅
├── DegradationManager    75-82%  ✅
└── DegradationNotifier   80-86%  ✅
```

### 测试质量标准
- ✅ 所有公共函数都有测试
- ✅ 包含边界情况测试
- ✅ 包含错误处理测试
- ✅ 测试命名清晰（describe/it）
- ✅ 使用beforeEach/afterEach清理
- ✅ 测试执行时间 < 5秒

---

## 🔧 Jest配置

### jest.config.cjs 关键配置
```javascript
{
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['services', 'tests', 'packages'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80
    }
  }
}
```

---

## 📝 编写新测试指南

### 测试模板
```typescript
describe('ModuleName', () => {
  let instance: ModuleClass;

  beforeEach(() => {
    // 准备测试环境
    instance = new ModuleClass();
    jest.useFakeTimers();
  });

  afterEach(() => {
    // 清理测试环境
    instance.destroy();
    jest.useRealTimers();
  });

  describe('methodName', () => {
    it('应该正确处理正常情况', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = instance.methodName(input);

      // Assert
      expect(result).toBeDefined();
    });

    it('应该处理边界情况', () => {
      // 测试零值、空值等
    });

    it('应该处理错误情况', () => {
      // 测试错误处理
    });
  });
});
```

### 测试命名规范
- ✅ 使用中文描述测试意图
- ✅ 格式: "应该..." (should...)
- ✅ 包含测试条件和预期结果
- ✅ 使用describe分组相关测试

### Mock使用
```typescript
// Mock函数
const mockFn = jest.fn();
mockFn.mockReturnValue('value');
mockFn.mockResolvedValue('asyncValue');

// Spy console
const logSpy = jest.spyOn(console, 'log');
logSpy.mockRestore();

// Mock timers
jest.useFakeTimers();
jest.advanceTimersByTime(1000);
jest.runOnlyPendingTimers();
jest.useRealTimers();
```

---

## 🐛 调试测试

### 运行单个测试
```bash
npm test -- -t "应该正确处理正常情况"
```

### 查看详细输出
```bash
npm test -- --verbose
```

### 调试模式
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

---

## 📈 测试报告

### 生成HTML覆盖率报告
```bash
npm test -- --coverage --coverageReporters="html"
open coverage/lcov-report/index.html
```

### 查看覆盖率摘要
```bash
npm test -- --coverage --coverageReporters="text-summary"
```

### 生成JSON报告
```bash
npm test -- --coverage --coverageReporters="json"
```

---

## ✅ 测试检查清单

### 测试完整性
- [ ] 所有公共函数都有测试
- [ ] 包含正常情况测试
- [ ] 包含边界情况测试
- [ ] 包含错误处理测试
- [ ] 包含异步操作测试

### 测试质量
- [ ] 测试命名清晰
- [ ] 测试结构良好
- [ ] 适当的Mock使用
- [ ] 正确的清理操作
- [ ] 良好的代码注释

### 性能要求
- [ ] 测试执行 < 5秒
- [ ] 无不必要的等待
- [ ] 高效的Mock使用
- [ ] 合理的测试数量

---

## 🚨 常见问题

### 问题1: TypeScript类型错误
**解决**: 确保ts-jest配置正确，检查tsconfig.json

### 问题2: Mock不生效
**解决**: 使用jest.mock()在文件顶部mock模块

### 问题3: 异步测试超时
**解决**: 增加testTimeout或正确使用async/await

### 问题4: 定时器问题
**解决**: 使用jest.useFakeTimers()和jest.advanceTimersByTime()

---

## 📚 参考资源

### 官方文档
- [Jest文档](https://jestjs.io/docs/getting-started)
- [ts-jest文档](https://kulshekhar.github.io/ts-jest/)
- [Testing Library](https://testing-library.com/)

### 最佳实践
- [Jest最佳实践](https://jestjs.io/docs/tutorial-react)
- [测试驱动开发](https://martinfowler.com/bliki/TestDrivenDevelopment.html)
- [单元测试原则](https://martinfowler.com/bliki/UnitTest.html)

---

## 🎓 测试知识

### 测试类型
- **单元测试**: 测试单个函数/类
- **集成测试**: 测试模块间交互
- **端到端测试**: 测试完整流程

### 测试金字塔
```
     /\
    /  \        E2E测试 (少量)
   /    \
  /______\     集成测试 (适量)
 /        \
/__________\  单元测试 (大量)
```

### 测试原则
- **FAST**: 快速执行
- **ISOLATED**: 相互独立
- **REPEATABLE**: 可重复执行
- **SELF-VALIDATING**: 自我验证
- **TIMELY**: 及时编写

---

## 📞 支持

如有问题，请联系：
**Senior QA Engineer**
**文档版本**: 1.0.0
**最后更新**: 2026-01-24

---

**备注**: 本指南将随着项目进展持续更新。确保测试覆盖率达到80%+的目标。
