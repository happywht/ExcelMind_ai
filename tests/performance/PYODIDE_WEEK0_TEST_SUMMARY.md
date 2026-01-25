# Pyodide 内存压力测试 - 技术验证总结

> **Week 0 技术验证 - Phase 2 启动前检查**
>
> **Backend Performance Engineer**
>
> **日期**: 2026-01-24

---

## 📋 执行摘要

### 测试目标

验证 Pyodide WASM 环境在处理不同大小 Excel 文件时的内存管理能力，确保 ExcelMind AI Phase 2 可以安全启动。

### 测试覆盖

| 测试场景 | 文件大小 | 数据行数 | 预期内存 | 状态 |
|---------|---------|---------|---------|------|
| 小文件测试 | 5 MB | 25,000 | < 200 MB | ⏳ 待测试 |
| 中文件测试 | 15 MB | 75,000 | < 600 MB | ⏳ 待测试 |
| 大文件测试 | 30 MB | 150,000 | < 1.2 GB | ⏳ 待测试 |
| 超大文件测试 | 50 MB | 250,000 | < 2 GB | ⏳ 待测试 |
| 内存泄漏测试 | N/A | 10 次迭代 | < 50 MB | ⏳ 待测试 |
| 恢复能力测试 | N/A | 峰值后 | > 50% | ⏳ 待测试 |

---

## 🧪 测试文件清单

### 1. 核心测试文件

| 文件路径 | 功能 | 行数 |
|---------|------|-----|
| `tests/performance/pyodide-memory-stress-test.ts` | 测试逻辑实现 | ~700 |
| `tests/performance/pyodide-memory-test.html` | 浏览器测试页面 | ~600 |
| `tests/performance/pyodide_memory_analyzer.py` | 结果分析和报告生成 | ~500 |
| `tests/performance/PYODIDE_MEMORY_TEST_README.md` | 完整使用文档 | ~600 |

### 2. 辅助脚本

| 文件路径 | 功能 |
|---------|------|
| `scripts/run-pyodide-memory-test.cjs` | 快速测试启动脚本 |

**总计**: ~2,400 行代码 + 文档

---

## 🚀 快速开始

### 方法 1: 浏览器测试（推荐）

```bash
# 1. 启动开发服务器
npm run dev

# 2. 打开浏览器访问
http://localhost:3000/tests/performance/pyodide-memory-test.html

# 3. 点击"开始测试"按钮

# 4. 等待测试完成（约 5-10 分钟）

# 5. 下载测试报告（JSON 格式）
```

### 方法 2: 命令行测试

```bash
# 1. 生成测试页面
node scripts/run-pyodide-memory-test.cjs

# 2. 在浏览器中打开生成的页面

# 3. 运行测试并下载报告

# 4. 分析结果并生成报告
python tests/performance/pyodide_memory_analyzer.py report \\
    --result test-results.json \\
    --output-dir reports
```

---

## 📊 测试输出

### 1. JSON 格式测试报告

```json
{
  "timestamp": "2026-01-24T10:30:00.000Z",
  "testResults": [...],
  "summary": {
    "totalTests": 4,
    "passed": 3,
    "failed": 1,
    "crashed": 0,
    "passRate": 75
  },
  "memoryLeakAnalysis": {
    "hasLeak": false,
    "leakRate": 2.5,
    "severity": "none"
  },
  "recommendations": [...],
  "riskAssessment": "CONDITIONAL_PASS"
}
```

### 2. Markdown 格式报告

自动生成 `PYODIDE_MEMORY_TEST_REPORT.md`，包含：
- 测试摘要
- 详细测试结果
- 内存泄漏分析
- 性能图表
- 建议和结论

### 3. 性能图表

- `charts/memory_usage_comparison.png` - 内存使用对比
- `charts/memory_usage_rate.png` - 内存使用率
- `charts/execution_time.png` - 执行时间对比

---

## 🎯 风险评估标准

### ✅ PASS（通过）

**条件**：
- 所有测试用例通过（无崩溃）
- 内存泄漏率 < 5 MB/文件
- 降级方案可用
- 恢复能力良好（> 50%）

**结论**：
> Pyodide 内存管理表现良好，可以进入 Phase 2

### ⚠️ CONDITIONAL_PASS（有条件通过）

**条件**：
- 部分测试失败（但无崩溃）
- 内存泄漏率 5-10 MB/文件
- 降级方案未完善或恢复能力不足

**结论**：
> 需要实施缓解措施后才能进入 Phase 2

**必需的缓解措施**：
1. 实施文件大小限制（≤ 30MB）
2. 增强内存监控和自动清理
3. 完善降级到后端模式的逻辑
4. 添加内存压力告警

### ❌ FAIL（不通过）

**条件**：
- 任何测试崩溃
- 内存泄漏率 > 10 MB/文件
- 关键功能不可用

**结论**：
> 存在严重的内存管理问题，强烈建议不进入 Phase 2

---

## 📈 预期性能指标

### 内存使用

| 测试场景 | 预期内存 | 容差 | 最大允许内存 |
|---------|---------|------|------------|
| 小文件 (5MB) | 200 MB | +20% | 240 MB |
| 中文件 (15MB) | 600 MB | +20% | 720 MB |
| 大文件 (30MB) | 1.2 GB | +20% | 1.44 GB |
| 超大文件 (50MB) | 2 GB | +30% | 2.6 GB |

### 执行时间

| 测试场景 | 预期时间 | 最大允许时间 |
|---------|---------|------------|
| 小文件 | < 10s | 30s |
| 中文件 | < 15s | 45s |
| 大文件 | < 25s | 60s |
| 超大文件 | < 40s | 90s |

### 内存增长率

- **健康**: < 5 MB/文件
- **警告**: 5-10 MB/文件
- **危险**: > 10 MB/文件

---

## 🔍 关键验证点

### 1. 内存泄漏检测

**测试方法**：
- 连续处理 10 个相同大小的文件
- 记录每次处理的内存使用
- 计算内存增长率

**评估标准**：
- 无泄漏: < 5 MB/文件
- 轻微泄漏: 5-10 MB/文件
- 中等泄漏: 10-50 MB/文件
- 严重泄漏: 50-100 MB/文件
- 关键泄漏: > 100 MB/文件

### 2. 内存峰值监控

**测试方法**：
- 使用 `performance.memory` API 实时监控
- 记录每个测试场景的峰值内存
- 对比预期值和实际值

**评估标准**：
- 峰值内存 ≤ 预期内存 × (1 + 容差率)
- 无明显的内存跳跃
- 内存释放及时

### 3. 降级方案验证

**测试方法**：
- 模拟超大文件处理（> 30MB）
- 验证是否触发降级逻辑
- 测试降级到后端模式

**评估标准**：
- 超过阈值时自动触发降级
- 降级过程无缝过渡
- 后端模式正常工作

### 4. 恢复能力测试

**测试方法**：
- 记录初始内存
- 执行大操作达到峰值
- 清理并触发垃圾回收
- 检查内存恢复率

**评估标准**：
- 恢复率 > 50%: 良好
- 恢复率 20-50%: 一般
- 恢复率 < 20%: 差

---

## 🛠️ 技术实现

### 测试架构

```
┌─────────────────────────────────────────────┐
│   pyodide-memory-test.html (UI 层)         │
│   - 进度显示                                │
│   - 实时日志                                │
│   - 结果可视化                              │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│   pyodide-memory-stress-test.ts (测试逻辑)  │
│   - MemoryMonitor (内存监控)                │
│   - TestDataGenerator (数据生成)            │
│   - PyodideMemoryStressTest (测试执行)      │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│   WASM 服务层                               │
│   - PyodideService (WASM 管理)              │
│   - FileSystemService (文件系统)            │
│   - ExecutionEngine (执行引擎)              │
└─────────────────────────────────────────────┘
```

### 核心组件

1. **MemoryMonitor**
   - 实时监控内存使用
   - 采样间隔: 100ms
   - 记录峰值和增长趋势

2. **TestDataGenerator**
   - 生成指定大小的测试文件
   - 模拟真实数据分布
   - 生成测试 Python 代码

3. **PyodideMemoryStressTest**
   - 运行所有测试用例
   - 收集测试数据
   - 生成综合报告

---

## 📝 测试检查清单

### 测试前准备

- [ ] 确认浏览器版本（Chrome 90+）
- [ ] 检查网络连接（Pyodide CDN 访问）
- [ ] 关闭其他浏览器标签页
- [ ] 清空浏览器缓存
- [ ] 准备测试环境

### 测试执行

- [ ] 启动测试页面
- [ ] 运行小文件测试
- [ ] 运行中文件测试
- [ ] 运行大文件测试
- [ ] 运行超大文件测试
- [ ] 运行内存泄漏测试
- [ ] 运行恢复能力测试
- [ ] 下载测试报告

### 测试后验证

- [ ] 检查测试报告完整性
- [ ] 确认风险评估结果
- [ ] 查看内存使用图表
- [ ] 阅读建议列表
- [ ] 生成 Markdown 报告
- [ ] 形成 Go/No-Go 决策

---

## 🐛 故障排除

### 常见问题

**Q1: Pyodide 加载失败**
```
错误: Failed to load Pyodide
解决方案:
1. 检查网络连接
2. 确认 CDN 可访问
3. 尝试使用备用 CDN
```

**Q2: performance.memory 不可用**
```
错误: performance.memory is undefined
解决方案:
1. 使用 Chrome 浏览器
2. 启用 --enable-precise-memory-info
3. 或使用 Chrome DevTools Memory Profiler
```

**Q3: 测试超时**
```
错误: Test timeout
解决方案:
1. 增加超时配置
2. 检查系统资源
3. 关闭其他占用内存的程序
```

**Q4: 内存数据不准确**
```
问题: 内存数据波动大
解决方案:
1. 多次运行取平均值
2. 关闭其他浏览器标签
3. 使用 Chrome 任务管理器监控
```

---

## 📞 技术支持

### 联系方式

- **Backend Performance Engineer**: [项目邮箱]
- **技术文档**: `docs/PHASE2_GO_NO_GO_DECISION.md`

### 相关资源

- [WASM 实施总结](../../WASM_IMPLEMENTATION_SUMMARY.md)
- [WASM 集成指南](../../WASM_INTEGRATION_GUIDE.md)
- [性能监控服务](../../services/monitoring/PERFORMANCE_GUIDE.md)
- [Pyodide 官方文档](https://pyodide.org/)

---

## 📄 附录

### A. 测试报告示例

详细的测试报告示例请参考：
- `tests/performance/PYODIDE_MEMORY_TEST_README.md`

### B. 性能基准数据

历史测试数据用于对比：
- `test-results/baseline/`

### C. 优化建议

根据测试结果的优化建议：
- `docs/BACKEND_OPTIMIZATION_GUIDE.md`

---

## ✅ 下一步行动

### 如果测试通过 (PASS)

1. ✅ 在 `docs/PHASE2_GO_NO_GO_DECISION.md` 中标记 C1.1 为完成
2. ✅ 生成测试报告并提交给项目评审委员会
3. ✅ 继续其他 Week 0 技术验证任务

### 如果有条件通过 (CONDITIONAL_PASS)

1. ⚠️ 实施必需的缓解措施
2. ⚠️ 重新运行测试验证修复效果
3. ⚠️ 更新 Go/No-Go 决策文档

### 如果测试不通过 (FAIL)

1. 🔴 分析失败原因
2. 🔴 制定详细的问题修复计划
3. 🔴 考虑替代方案（如纯后端模式）
4. 🔴 重新评估 Phase 2 可行性

---

**文档版本**: 1.0.0
**最后更新**: 2026-01-24
**维护者**: Backend Performance Engineer
**状态**: ✅ 测试套件就绪，等待执行

---

## 📋 测试执行记录

### 测试执行历史

| 日期 | 执行人 | 结果 | 报告链接 |
|------|-------|------|---------|
| 待填写 | - | - | - |

### 变更历史

| 版本 | 日期 | 变更内容 | 变更人 |
|------|------|---------|--------|
| 1.0.0 | 2026-01-24 | 初始版本 | Backend Performance Engineer |
