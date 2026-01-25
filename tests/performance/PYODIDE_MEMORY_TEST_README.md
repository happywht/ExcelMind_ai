# Pyodide 内存压力测试 - Week 0 技术验证

> **Backend Performance Engineer**
>
> **测试目的**: 验证 Pyodide 在不同文件大小下的内存管理能力，确保 Phase 2 安全启动
>
> **测试日期**: 2026-01-24
>
> **版本**: 1.0.0

---

## 📋 测试概述

### 测试目标

验证 Pyodide 在以下场景的内存表现：

| 场景 | 文件大小 | 行数 | 预期内存 | 验收标准 |
|------|---------|------|----------|----------|
| 小文件 | 5MB | 25K | < 200MB | 无崩溃 |
| 中文件 | 15MB | 75K | < 600MB | 无崩溃 |
| 大文件 | 30MB | 150K | < 1.2GB | 无崩溃 |
| 超大文件 | 50MB | 250K | < 2GB | 允许降级 |

### 关键验证点

1. **内存泄漏检测**
   - 连续处理 10 个文件后内存是否释放
   - 内存增长率是否可控（< 10MB/文件）

2. **内存峰值监控**
   - 不同文件大小的内存峰值
   - 是否有硬性上限

3. **降级方案验证**
   - 超过 30MB 时是否触发降级
   - 降级到后端模式是否可行

4. **恢复能力测试**
   - 内存接近上限时自动清理是否生效
   - 清理后是否可以继续处理

---

## 🚀 快速开始

### 方法 1: 浏览器测试（推荐）

1. **启动开发服务器**
   ```bash
   npm run dev
   ```

2. **打开测试页面**
   ```
   http://localhost:3000/tests/performance/pyodide-memory-test.html
   ```

3. **点击"开始测试"按钮**
   - 测试将自动运行
   - 实时显示进度和日志
   - 完成后展示详细报告

4. **下载报告**
   - 点击"下载报告"按钮
   - 获取 JSON 格式的完整测试数据

### 方法 2: 命令行测试

1. **生成测试文件**
   ```bash
   python tests/performance/pyodide_memory_analyzer.py generate --output-dir test_files
   ```

2. **运行测试**（需要浏览器环境）
   ```bash
   # 使用 TypeScript 编译
   npx tsc tests/performance/pyodide-memory-stress-test.ts

   # 使用测试运行器
   npm run test:performance
   ```

3. **分析结果**
   ```bash
   python tests/performance/pyodide_memory_analyzer.py analyze \
       --result test_results.json \
       --output-dir reports
   ```

4. **生成报告**
   ```bash
   python tests/performance/pyodide_memory_analyzer.py report \
       --result test_results.json \
       --output-dir reports
   ```

---

## 📊 测试输出

### 测试报告格式

```json
{
  "timestamp": "2026-01-24T10:30:00.000Z",
  "testResults": [
    {
      "testCase": {
        "name": "小文件测试",
        "fileSize": 5242880,
        "rows": 25000,
        "expectedMaxMemory": 200,
        "tolerance": 20
      },
      "success": true,
      "actualMaxMemory": 185.5,
      "executionTime": 1500,
      "crashed": false,
      "memorySnapshots": [...]
    }
  ],
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
  "recommendations": [
    "⚠️ 大文件处理失败，建议限制单文件大小 ≤ 30MB"
  ],
  "riskAssessment": "CONDITIONAL_PASS"
}
```

### 生成的图表

1. **memory_usage_comparison.png** - 内存使用对比图
2. **memory_usage_rate.png** - 内存使用率图
3. **execution_time.png** - 执行时间对比图

### Markdown 报告

自动生成 `PYODIDE_MEMORY_TEST_REPORT.md`，包含：
- 测试摘要
- 详细测试结果
- 内存泄漏分析
- 建议和结论

---

## 🎯 风险评估标准

### PASS（通过）

**条件**：
- ✅ 所有测试用例通过（无崩溃）
- ✅ 内存泄漏率 < 5 MB/文件
- ✅ 降级方案可用
- ✅ 恢复能力良好

**结论**：
> Pyodide 内存管理表现良好，可以进入 Phase 2

### CONDITIONAL_PASS（有条件通过）

**条件**：
- ⚠️ 部分测试失败（但无崩溃）
- ⚠️ 内存泄漏率 5-10 MB/文件
- ⚠️ 降级方案未完善或恢复能力不足

**结论**：
> 需要实施缓解措施后才能进入 Phase 2

**必需的缓解措施**：
1. 实施文件大小限制（≤ 30MB）
2. 增强内存监控和自动清理
3. 完善降级到后端模式的逻辑
4. 添加内存压力告警

### FAIL（不通过）

**条件**：
- 🔴 任何测试崩溃
- 🔴 内存泄漏率 > 10 MB/文件
- 🔴 关键功能不可用

**结论**：
> 存在严重的内存管理问题，强烈建议不进入 Phase 2

**必须解决的关键问题**：
1. 修复内存泄漏
2. 优化内存使用策略
3. 实施更严格的内存限制
4. 考虑替代方案

---

## 🔍 测试细节

### 内存监控实现

测试使用 `performance.memory` API 监控内存：

```typescript
interface MemorySnapshot {
  timestamp: number;
  usedJSHeapSize: number;      // 已使用的堆内存
  totalJSHeapSize: number;     // 总堆内存
  jsHeapSizeLimit: number;     // 堆内存限制
  percentage: number;          // 使用率
}
```

### 内存泄漏检测方法

1. **连续迭代测试**
   - 处理 10 个相同大小的文件
   - 记录每次处理的内存使用
   - 计算内存增长率

2. **泄漏评估标准**
   - 无泄漏: < 5 MB/文件
   - 轻微泄漏: 5-10 MB/文件
   - 中等泄漏: 10-50 MB/文件
   - 严重泄漏: 50-100 MB/文件
   - 关键泄漏: > 100 MB/文件

### 恢复能力测试

1. **测试流程**
   - 记录初始内存
   - 执行大操作（峰值内存）
   - 清理并等待垃圾回收
   - 检查内存恢复率

2. **评估标准**
   - 良好: 恢复率 > 50%
   - 一般: 恢复率 20-50%
   - 差: 恢复率 < 20%

---

## 🛠️ 技术实现

### 测试架构

```
pyodide-memory-test.html (UI层)
    ↓
pyodide-memory-stress-test.ts (测试逻辑)
    ↓
├─ PyodideService (WASM 管理)
├─ FileSystemService (文件系统)
└─ ExecutionEngine (执行引擎)
```

### 核心组件

1. **MemoryMonitor**
   - 实时监控内存使用
   - 记录内存快照
   - 计算内存增长

2. **TestDataGenerator**
   - 生成测试用 Excel 文件
   - 生成测试 Python 代码
   - 模拟真实使用场景

3. **PyodideMemoryStressTest**
   - 运行测试用例
   - 分析测试结果
   - 生成测试报告

---

## 📈 性能基准

### 预期性能指标

| 指标 | 小文件 | 中文件 | 大文件 | 超大文件 |
|------|--------|--------|--------|----------|
| 初始化时间 | ~5s | ~5s | ~5s | ~5s |
| 文件加载 | < 1s | < 3s | < 5s | < 10s |
| 代码执行 | < 2s | < 5s | < 10s | < 20s |
| 总执行时间 | < 10s | < 15s | < 25s | < 40s |
| 峰值内存 | < 200MB | < 600MB | < 1.2GB | < 2GB |

### 内存增长率

- **健康**: < 5 MB/文件
- **警告**: 5-10 MB/文件
- **危险**: > 10 MB/文件

---

## 🐛 故障排除

### 常见问题

**Q1: 测试页面无法加载 Pyodide**
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
2. 启用 --enable-precise-memory-info 标志
3. 或使用 Chrome DevTools 的 Memory Profiler
```

**Q3: 测试超时**
```
错误: Test timeout
解决方案:
1. 增加超时时间配置
2. 检查系统资源
3. 关闭其他浏览器标签页
```

**Q4: 内存显示不准确**
```
问题: 内存数据波动大
解决方案:
1. 多次运行取平均值
2. 关闭其他占用内存的程序
3. 使用 Chrome 任务管理器监控
```

---

## 📝 测试检查清单

### 测试前准备

- [ ] 确认浏览器版本（Chrome 90+）
- [ ] 检查网络连接（CDN 访问）
- [ ] 关闭其他浏览器标签页
- [ ] 清空浏览器缓存
- [ ] 准备测试文件（或使用自动生成）

### 测试执行

- [ ] 运行小文件测试
- [ ] 运行中文件测试
- [ ] 运行大文件测试
- [ ] 运行超大文件测试
- [ ] 运行内存泄漏测试
- [ ] 运行恢复能力测试

### 测试后验证

- [ ] 检查测试报告
- [ ] 确认风险评估结果
- [ ] 查看内存使用图表
- [ ] 阅读建议列表
- [ ] 生成 Markdown 报告

---

## 📞 技术支持

### 联系方式

- **Backend Performance Engineer**: [项目邮箱]
- **技术文档**: `docs/PHASE2_GO_NO_GO_DECISION.md`
- **Pyodide 文档**: https://pyodide.org/

### 相关资源

- [WASM 实施总结](../../WASM_IMPLEMENTATION_SUMMARY.md)
- [WASM 集成指南](../../WASM_INTEGRATION_GUIDE.md)
- [性能监控服务](../../services/monitoring/PERFORMANCE_GUIDE.md)

---

## 📄 许可证

内部测试工具，仅供 ExcelMind AI 项目使用。

---

**文档版本**: 1.0.0
**最后更新**: 2026-01-24
**维护者**: Backend Performance Engineer
