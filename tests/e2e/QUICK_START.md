# ExcelMind AI - OTAE 系统测试快速启动指南

## 🚀 5 分钟快速开始

### 第 1 步：启动应用（1 分钟）

打开一个终端窗口，启动开发服务器：

```bash
npm run dev
```

等待服务器启动，你应该看到：
```
VITE v6.x.x ready in xxx ms

➜  Local:   http://localhost:3000/
```

**保持这个终端窗口运行！**

---

### 第 2 步：运行测试（4 分钟）

打开**另一个**终端窗口，运行测试：

```bash
# 运行所有 OTAE 系统测试
npm run test:agentic
```

或者使用测试运行脚本：

```bash
node scripts/run-agentic-tests.js all
```

---

## 📊 测试执行过程

测试将自动执行以下步骤：

1. ✅ **基础功能测试** (~30 秒)
   - 连接到应用
   - 上传测试文件
   - 验证 UI 元素

2. ✅ **OTAE 循环测试** (~60 秒)
   - 执行"计算总销售额"任务
   - 监控观察-思考-执行-评估阶段
   - 验证质量评分

3. ✅ **错误修复测试** (~60 秒)
   - 执行复杂任务
   - 触发错误检测
   - 验证自动修复

4. ✅ **模式对比测试** (~90 秒)
   - 智能模式执行
   - 快速模式执行
   - 性能对比分析

5. ✅ **质量评估测试** (~60 秒)
   - 验证三维度质量评分
   - 生成质量报告

6. ✅ **多步骤测试** (~90 秒)
   - 执行复杂多步骤任务
   - 监控多个 OTAE 循环

**总耗时**: 约 6-7 分钟

---

## 📁 测试结果位置

测试完成后，查看以下位置：

### 截图和报告

```
tests/screenshots/agentic-otae/
├── 01-homepage.png
├── 02-smart-ops-interface.png
├── 03-file-uploaded.png
├── 04-otae-initial.png
├── 05-command-entered.png
├── 06-processing-started.png
├── 07-otae-phase-观察.png
├── 07-otae-phase-思考.png
├── 07-otae-phase-执行.png
├── 07-otae-phase-评估.png
├── 08-otae-final.png
├── mode-comparison-report.txt
├── quality-assessment-report.txt
└── comprehensive-test-report.txt
```

### 测试报告

```
tests/test-results/agentic-otae/
└── [HTML 报告和其他结果]
```

---

## 🎯 快速验证测试

如果你只想快速验证系统是否正常工作，运行：

```bash
# 只运行基础功能测试（最快）
npm run test:agentic:basic

# 或只运行 OTAE 循环测试
npm run test:agentic:otae
```

---

## 🐛 常见问题

### 问题 1: "Cannot connect to server"

**原因**: 应用未启动

**解决**:
```bash
# 确保在第一个终端运行
npm run dev
```

### 问题 2: "Test file not found"

**原因**: 测试文件不存在

**解决**:
```bash
# 生成测试文件
npm run test:generate-files
```

### 问题 3: 测试超时

**原因**: AI 服务响应慢或网络问题

**解决**:
- 等待测试完成（最多 2 分钟每个测试）
- 检查网络连接
- 重启应用和测试

### 问题 4: 测试失败

**原因**: 各种可能的原因

**解决**:
```bash
# 查看详细错误信息
npm run test:agentic:otae -- --debug

# 查看截图
ls tests/screenshots/agentic-otae/

# 查看日志
cat tests/test-results/agentic-otae/results.json
```

---

## 📊 性能基准测试

运行性能基准测试以建立性能基线：

```bash
npm run test:agentic:benchmark
```

这将测试：
- 简单任务性能（智能模式 vs 快速模式）
- 复杂任务性能
- 多步骤任务性能
- 质量评分对比

结果保存在：
```
tests/test-results/performance-benchmark/
├── performance-benchmark-report.txt
└── performance-benchmark-data.json
```

---

## 🔄 持续监控

### 日常测试

每天运行一次完整测试套件：

```bash
npm run test:agentic
```

### 性能监控

每周运行一次性能基准测试：

```bash
npm run test:agentic:benchmark
```

### 快速验证

每次代码更改后运行快速测试：

```bash
npm run test:agentic:otae
```

---

## 📈 性能基准参考

### 预期性能指标

| 任务类型 | 智能模式 | 快速模式 | 性能提升 |
|---------|----------|----------|----------|
| 简单任务 | 30-45 秒 | 15-25 秒 | ~40% |
| 复杂任务 | 45-60 秒 | 25-35 秒 | ~35% |
| 多步骤任务 | 60-90 秒 | N/A | N/A |

### 质量评分标准

- **优秀**: >= 90%
- **良好**: 80%-89%
- **及格**: 70%-79%
- **不及格**: < 70%

---

## 🎓 下一步

1. **查看完整文档**: `tests/e2e/AGENTIC_TEST_README.md`
2. **自定义测试**: 编辑 `tests/e2e/agentic-otae-system.spec.ts`
3. **添加测试用例**: 参考现有测试结构
4. **集成到 CI**: 设置 GitHub Actions 或其他 CI 工具

---

## 💡 提示

- 首次运行测试可能需要更长时间（下载浏览器）
- 保持应用在测试期间运行
- 测试期间不要与应用交互
- 如果测试失败，查看截图和日志
- 定期更新测试以匹配新功能

---

## 📞 获取帮助

如果遇到问题：

1. 查看测试日志
2. 检查截图
3. 阅读完整文档
4. 联系测试团队

---

**祝测试顺利！** 🎉

---

*最后更新: 2025-01-22*
*版本: 1.0.0*
