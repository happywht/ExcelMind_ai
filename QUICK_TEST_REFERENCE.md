# ExcelMind AI 快速测试参考指南

**文档版本**: 1.0.0
**制定日期**: 2025-01-24
**适用对象**: QA团队、开发团队、测试人员

---

## 快速命令参考

### 测试执行命令

```bash
# === 快速测试 ===
npm test                              # 运行所有测试
npm run test:unit                     # 所有单元测试
npm run test:integration              # 所有集成测试
npm run test:e2e                      # 所有E2E测试
npm run test:coverage                 # 生成覆盖率报告

# === Agentic测试 ===
npm run test:agentic                  # 所有Agentic测试
npm run test:agentic:basic           # 基础测试
npm run test:agentic:otae            # OTAE测试
npm run test:agentic:error-repair    # 错误修复测试
npm run test:agentic:quality         # 质量测试
npm run test:agentic:multistep       # 多步测试
```

### 核心测试场景清单

| 场景ID | 测试场景 | 优先级 | 执行时间 |
|--------|---------|--------|----------|
| TC-001 | 多步分析 - 简单任务 | P0 | 2分钟 |
| TC-002 | 多步分析 - 复杂任务 | P0 | 5分钟 |
| TC-003 | 错误自动修复 | P0 | 3分钟 |
| TC-101 | AI服务调用成功 | P0 | 1分钟 |
| TC-201 | 跨Sheet查找 | P1 | 2分钟 |
| TC-301 | 文档生成 | P1 | 2分钟 |

### 测试环境快速检查

```bash
# 1. 检查环境
node --version  # v22.18.0
python --version  # 3.13.9

# 2. 安装依赖
npm install

# 3. 运行快速测试
npm run test:unit -- --testNamePattern="quick"

# 4. 查看覆盖率
npm run test:coverage
```

### 5分钟功能验证

1. 启动应用: `npm run electron-dev`
2. 上传Excel文件
3. 输入简单指令: "计算总销售额"
4. 观察OTAE循环完成
5. 检查结果文件

### 缺陷报告模板

```markdown
**缺陷ID**: BUG-XXX
**标题**: [简短描述]
**严重级别**: 严重/高/中/低
**优先级**: P0/P1/P2/P3

## 重现步骤
1. 步骤1
2. 步骤2
3. 步骤3

## 预期结果
[应该出现的正确结果]

## 实际结果
[实际出现的错误结果]
```

### 质量指标

| 指标 | 目标值 |
|------|--------|
| 语句覆盖率 | ≥ 90% |
| 分支覆盖率 | ≥ 85% |
| 函数覆盖率 | ≥ 95% |
| P0用例通过率 | 100% |
| P1用例通过率 | ≥ 95% |

---

**相关文档**:
- TEST_STRATEGY.md - 测试策略
- TEST_PLAN.md - 测试计划
- ARCHITECTURE.md - 架构文档
