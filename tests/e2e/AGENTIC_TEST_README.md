# ExcelMind AI - OTAE 系统自动化测试套件

## 📋 概述

这是一个全面的端到端测试套件，用于验证 ExcelMind AI 的**多步分析和自我修复系统**（OTAE: Observe-Think-Act-Evaluate）。

### 测试目标

- ✅ 验证 OTAE 循环完整执行
- ✅ 验证错误检测和自动修复机制
- ✅ 验证三维度质量评估系统（完整性、准确性、一致性）
- ✅ 对比智能模式与快速模式的性能差异
- ✅ 测试多文件、多Sheet场景
- ✅ 验证多步骤复杂任务处理能力

---

## 🚀 快速开始

### 前置条件

1. **安装依赖**
   ```bash
   npm install
   ```

2. **安装 Playwright 浏览器**
   ```bash
   npx playwright install
   ```

3. **启动应用**
   ```bash
   npm run dev
   ```

   确保应用运行在 `http://localhost:3000`

### 运行测试

#### 方法 1: 使用测试运行脚本（推荐）

```bash
# 运行所有测试
node scripts/run-agentic-tests.js all

# 运行特定测试
node scripts/run-agentic-tests.js otae
node scripts/run-agentic-tests.js error-repair
node scripts/run-agentic-tests.js mode-compare

# 查看帮助
node scripts/run-agentic-tests.js help
```

#### 方法 2: 直接使用 Playwright

```bash
# 运行所有测试
npx playwright test tests/e2e/agentic-otae-system.spec.ts

# 运行特定测试套件
npx playwright test tests/e2e/agentic-otae-system.spec.ts --grep "基础功能测试"

# 在有头模式下运行
npx playwright test tests/e2e/agentic-otae-system.spec.ts --headed

# 在调试模式下运行
npx playwright test tests/e2e/agentic-otae-system.spec.ts --debug
```

---

## 📁 测试文件结构

```
tests/
├── e2e/
│   ├── agentic-otae-system.spec.ts    # 主测试文件
│   ├── agentic-test-utils.ts          # 测试辅助工具
│   ├── quick-test.spec.ts             # 快速验证测试
│   ├── multisheet-support.spec.ts     # 多Sheet支持测试
│   └── multisheet-e2e.spec.ts         # 多Sheet端到端测试
├── screenshots/
│   └── agentic-otae/                  # 测试截图目录
└── test-results/
    └── agentic-otae/                  # 测试报告目录

public/test-files/                     # 测试数据文件
├── test-simple.xlsx                   # 简单销售数据
├── test-complex.xlsx                  # 多Sheet复杂数据
├── test-edge.xlsx                     # 边界情况
├── test-audit.xlsx                    # 财务审计数据
└── test-aggregation.xlsx              # 数据聚合
```

---

## 🧪 测试套件详情

### 1. 基础功能测试

**目标**: 验证应用连接和基本 UI 元素

**测试用例**:
- ✅ 连接到应用并显示智能处理界面
- ✅ 上传文件并显示预览

**预期结果**:
- 应用界面正常加载
- 文件上传功能正常工作
- 文件预览正确显示

### 2. OTAE 循环执行测试

**目标**: 验证完整的观察-思考-执行-评估流程

**测试用例**:
- ✅ 完整执行 OTAE 循环 - 基础计算任务
- ✅ 监控每个阶段的进度
- ✅ 验证质量评分显示

**预期结果**:
- 所有 4 个阶段依次执行
- 进度正确更新
- 质量评分 >= 90%

**测试场景**:
```
命令: "计算总销售额"
预期质量: 90%
预期耗时: < 60 秒
```

### 3. 错误修复测试

**目标**: 验证自动错误检测和修复机制

**测试用例**:
- ✅ 检测执行错误
- ✅ 触发自动修复机制
- ✅ 验证修复后的结果

**预期结果**:
- 错误能够被检测到
- 自动修复机制被触发
- 任务最终完成（可能经过修复）

**测试场景**:
```
命令: "计算每个部门的平均工资"
预期: 可能触发错误检测和修复
```

### 4. 模式对比测试

**目标**: 对比智能模式与快速模式的性能和结果

**测试用例**:
- ✅ 智能模式执行时间
- ✅ 快速模式执行时间
- ✅ 质量评分对比
- ✅ 性能提升百分比

**预期结果**:
- 快速模式比智能模式快至少 30%
- 智能模式质量评分更高
- 生成对比报告

**性能指标**:
```
智能模式: ~40-60 秒，质量 >= 90%
快速模式: ~20-30 秒，质量 >= 85%
性能提升: >= 30%
```

### 5. 质量评估测试

**目标**: 验证三维度质量评分系统

**测试用例**:
- ✅ 完整性评分
- ✅ 准确性评分
- ✅ 一致性评分
- ✅ 总体质量评分

**预期结果**:
- 所有三个维度都有评分
- 总体质量 >= 80%
- 生成质量评估报告

**测试场景**:
```
命令: "过滤无效数据并计算库存总值"
预期质量: 80%
```

### 6. 多步骤复杂任务测试

**目标**: 验证系统能够处理复杂的多步骤分析

**测试用例**:
- ✅ 执行多步骤命令
- ✅ 监控多个 OTAE 循环
- ✅ 验证最终结果

**预期结果**:
- 多个 OTAE 循环依次执行
- 任务最终完成
- 耗时 < 120 秒

**测试场景**:
```
命令: "按地区分组，计算每个地区的总销售额和平均订单金额，并按总销售额降序排列"
预期: 至少 2 个 OTAE 循环
```

---

## 📊 测试报告

测试完成后，会生成以下报告：

### 1. 截图报告

位置: `tests/screenshots/agentic-otae/`

包含所有关键步骤的截图：
- 主界面
- 文件上传
- OTAE 各阶段
- 错误和修复
- 最终结果

### 2. 性能对比报告

位置: `tests/screenshots/agentic-otae/mode-comparison-report.txt`

包含：
- 智能模式 vs 快速模式
- 执行时间对比
- 质量评分对比
- 性能提升百分比

### 3. 质量评估报告

位置: `tests/screenshots/agentic-otae/quality-assessment-report.txt`

包含：
- 完整性评分
- 准确性评分
- 一致性评分
- 总体质量评分

### 4. 综合测试报告

位置: `tests/screenshots/agentic-otae/comprehensive-test-report.txt`

包含：
- 测试概览
- 测试场景详情
- 测试结果汇总
- 质量保证建议

---

## 🔧 配置选项

### 环境变量

```bash
# 设置服务器地址
BASE_URL=http://localhost:3000 npx playwright test tests/e2e/agentic-otae-system.spec.ts

# 设置超时时间（毫秒）
PLAYWRIGHT_TIMEOUT=120000 npx playwright test tests/e2e/agentic-otae-system.spec.ts
```

### Playwright 配置

文件: `playwright.config.ts`

```typescript
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 120000,
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
```

---

## 🐛 故障排除

### 问题 1: 应用未启动

**错误**: `Cannot connect to server`

**解决方案**:
```bash
# 启动开发服务器
npm run dev

# 或使用 electron-dev
npm run electron-dev
```

### 问题 2: 文件未找到

**错误**: `Test file not found: test-simple.xlsx`

**解决方案**:
```bash
# 生成测试文件
npm run test:generate-files

# 或手动检查文件是否存在
ls public/test-files/
```

### 问题 3: 测试超时

**错误**: `Test timeout of 120000ms exceeded`

**解决方案**:
```bash
# 增加超时时间
PLAYWRIGHT_TIMEOUT=180000 npx playwright test

# 或在 playwright.config.ts 中修改
timeout: 180000
```

### 问题 4: 浏览器未安装

**错误**: `Executable doesn't exist at...`

**解决方案**:
```bash
# 安装 Playwright 浏览器
npx playwright install
```

---

## 📈 性能基准

### 预期性能指标

| 指标 | 智能模式 | 快速模式 |
|------|----------|----------|
| 简单任务 | 30-45 秒 | 15-25 秒 |
| 复杂任务 | 45-60 秒 | 25-35 秒 |
| 多步骤任务 | 60-90 秒 | N/A |
| 质量评分 | >= 90% | >= 85% |

### 质量评分标准

- **完整性**: 数据是否完整，无遗漏
- **准确性**: 计算结果是否准确
- **一致性**: 数据格式和逻辑是否一致
- **总质量**: 综合评分

---

## 🎯 质量门禁

测试应该满足以下条件才能通过：

1. ✅ 所有测试用例通过率 >= 95%
2. ✅ 质量评分 >= 80%
3. ✅ OTAE 循环完整性 = 100%
4. ✅ 错误修复成功率 >= 90%
5. ✅ 执行时间 <= 预期时间的 120%

---

## 🔄 持续集成

### GitHub Actions 示例

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npm run dev &
      - run: npx playwright test tests/e2e/agentic-otae-system.spec.ts
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-results
          path: tests/test-results/
```

---

## 📚 参考资料

- [Playwright 文档](https://playwright.dev/)
- [测试最佳实践](https://playwright.dev/docs/best-practices)
- [ExcelMind AI 架构文档](./ARCHITECTURE.md)
- [OTAE 系统设计文档](./services/agentic/README.md)

---

## 👥 贡献

如果您发现测试问题或有改进建议，请：

1. 查看现有测试用例
2. 添加新的测试场景
3. 更新测试数据
4. 提交 Pull Request

---

## 📝 许可证

本测试套件遵循项目的 MIT 许可证。

---

**最后更新**: 2025-01-22
**维护者**: Automation Engineer
**版本**: 1.0.0
