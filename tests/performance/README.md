# 性能基准测试框架

## 概述

这是 ExcelMind AI 项目的性能基准测试框架，用于对 Week 1 的所有模块进行性能测试，确保系统满足性能要求。

## 测试覆盖范围

### 1. 共享类型库编译性能 (`shared-types.compile.test.ts`)

- 完整编译时间 < 5s
- 类型检查时间 < 3s
- 声明文件生成 < 2s
- 增量编译 < 1s

### 2. AI 降级策略性能 (`degradation.strategy.test.ts`)

- CPU 开销 < 5%
- 内存开销 < 20MB
- 降级决策时间 < 10ms
- 监控检查时间 < 5ms

### 3. 状态存储性能 (`state.storage.test.ts`)

- Redis SET+GET < 50ms
- IndexedDB SET+GET < 100ms
- 状态同步延迟 < 100ms
- 查询延迟 < 75ms

### 4. 虚拟文件系统性能 (`vfs.operations.test.ts`)

- 文件上传 (1MB) < 200ms
- 文件列表查询 < 100ms
- 关系查询 < 150ms
- 图谱渲染 (50节点) < 150ms

### 5. 前端组件渲染性能 (`component.rendering.test.tsx`)

- FileBrowser 渲染 < 100ms
- ProgressPanel 渲染 < 80ms
- RelationshipGraph 渲染 (100节点) < 500ms
- 组件重新渲染 < 50ms

## 运行测试

### 运行所有性能测试

```bash
npm run test:performance
```

### 运行特定性能测试

```bash
# 编译性能测试
npm test -- tests/performance/shared-types.compile.test.ts

# 降级策略测试
npm test -- tests/performance/degradation.strategy.test.ts

# 状态存储测试
npm test -- tests/performance/state.storage.test.ts

# VFS 操作测试
npm test -- tests/performance/vfs.operations.test.ts

# 组件渲染测试
npm test -- tests/performance/component.rendering.test.tsx
```

### 更新性能基线

```bash
npm test -- tests/performance/run-performance-tests.ts -- --update-baseline
```

### 对比性能基线

```bash
npm test -- tests/performance/run-performance-tests.ts -- --compare
```

## 性能报告

测试完成后，报告将保存在 `test-results/performance/` 目录：

- `PERFORMANCE_REPORT.md` - 人类可读的性能报告
- `performance-report.json` - 机器可读的性能数据
- `PERFORMANCE_COMPARISON.md` - 与基线的对比报告（如果存在基线）

## 性能阈值

所有性能阈值在各自的测试文件中定义。如果某个测试未达到阈值，将标记为失败。

## 质量标准

- ✅ 所有性能指标都有测试覆盖
- ✅ 测试结果可重复（运行多次取平均值）
- ✅ 报告清晰易读
- ✅ 失败测试有详细分析和建议

## 注意事项

1. **测试环境**：性能测试应该在隔离环境中运行，避免其他进程干扰
2. **多次运行**：每个测试运行多次取平均值，确保结果稳定
3. **机器差异**：性能阈值考虑了不同机器的性能差异
4. **优化建议**：失败的测试会提供具体的优化建议

## 性能基线管理

### 创建基线

首次运行测试时，使用 `--update-baseline` 标志创建性能基线：

```bash
npm test -- tests/performance/run-performance-tests.ts -- --update-baseline
```

### 更新基线

当进行了性能优化后，可以更新基线：

```bash
npm test -- tests/performance/run-performance-tests.ts -- --update-baseline
```

### 对比基线

每次运行测试时，自动与基线对比，显示性能改进或退化：

```bash
npm test -- tests/performance/run-performance-tests.ts -- --compare
```

## 性能测试最佳实践

1. **定期运行**：在 CI/CD 中定期运行性能测试
2. **性能监控**：监控性能趋势，及时发现性能退化
3. **性能预算**：为每个功能设置性能预算
4. **性能优化**：根据测试结果进行针对性优化

## 故障排除

### 测试超时

如果测试超时，可能需要调整 Jest 配置中的 `testTimeout` 值。

### 内存不足

对于内存密集型测试，确保有足够的系统内存。

### 性能波动

如果性能结果波动较大，尝试：
- 增加测试迭代次数
- 增加预热次数
- 在稳定的系统负载下运行

## 性能优化建议

根据测试结果，框架会自动生成优化建议，包括：

1. 识别性能瓶颈
2. 提供具体的优化方向
3. 显示性能改进的优先级
4. 给出预期改进效果

## 持续集成

在 CI/CD 中集成性能测试：

```yaml
# .github/workflows/performance.yml
name: Performance Tests

on: [push, pull_request]

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run test:performance
      - uses: actions/upload-artifact@v2
        with:
          name: performance-report
          path: test-results/performance/
```

## 性能指标说明

- **平均时间 (Average)**: 所有运行的平均执行时间
- **最小时间 (Min)**: 最快的执行时间
- **最大时间 (Max)**: 最慢的执行时间
- **P95/P99**: 95%/99% 的执行时间都低于此值
- **标准差**: 反映性能稳定性
- **阈值**: 预期的性能目标

## 贡献指南

添加新的性能测试：

1. 创建测试文件在 `tests/performance/` 目录
2. 使用 `PerformanceTestRunner` 进行测量
3. 设置合理的性能阈值
4. 运行测试并验证结果
5. 更新此 README 文档

## 许可证

MIT
