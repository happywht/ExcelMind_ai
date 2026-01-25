# E2E 测试快速使用指南

## 🚀 快速开始

### 1. 安装和设置

```bash
# 安装依赖
npm install

# 安装 Playwright 浏览器
npx playwright install

# 生成测试文件 (可选)
npm run test:generate-files
```

### 2. 启动应用

```bash
# 在一个终端启动开发服务器
npm run dev

# 在另一个终端运行测试
npm run test:e2e
```

---

## 📋 运行特定测试

### 按测试套件

```bash
# 文件上传和管理
npx playwright test tests/e2e/file-management.spec.ts

# 执行状态持久化
npx playwright test tests/e2e/state-persistence.spec.ts

# 降级恢复
npx playwright test tests/e2e/degradation-recovery.spec.ts

# 多标签页协作
npx playwright test tests/e2e/multi-tab-collaboration.spec.ts
```

### 按测试名称

```bash
# 运行包含特定关键词的测试
npx playwright test -g "上传文件"

# 运行包含特定关键词的测试
npx playwright test -g "内存压力"
```

### 按文件状态

```bash
# 只运行失败的测试
npx playwright test --only-failed

# 只运行特定项目的测试
npx playwright test --project=chromium
```

---

## 🎨 不同的运行模式

### UI 模式 (推荐用于调试)

```bash
npm run test:e2e:ui
```

提供交互式界面，可以：
- 选择特定测试运行
- 查看测试执行时间轴
- 检查 DOM 快照
- 查看网络请求

### 调试模式

```bash
npm run test:e2e:debug
```

逐步执行测试，可以：
- 设置断点
- 检查变量
- 执行 Playwright Inspector

### 无头模式 (CI/CD)

```bash
npm run test:e2e:headless
```

不显示浏览器窗口，适合自动化环境。

---

## 📊 查看测试结果

### HTML 报告

```bash
# 自动打开 HTML 报告
npx playwright show-report tests/test-results/html

# 或手动打开
start tests/test-results/html/index.html  # Windows
open tests/test-results/html/index.html  # macOS
xdg-open tests/test-results/html/index.html  # Linux
```

### 文本报告

```bash
# 查看特定套件的报告
cat tests/screenshots/file-management/test-report.txt
cat tests/screenshots/state-persistence/test-report.txt
cat tests/screenshots/degradation-recovery/test-report.txt
cat tests/screenshots/multi-tab-collaboration/test-report.txt
```

### 截图

测试失败时会自动保存截图：

```bash
# Windows
start tests/screenshots/file-management

# macOS
open tests/screenshots/file-management

# Linux
xdg-open tests/screenshots/file-management
```

---

## 🔧 常用选项

### 并行运行

```bash
# 使用多个 worker
npx playwright test --workers=4
```

### 重试失败的测试

```bash
# 失败时重试 2 次
npx playwright test --retries=2
```

### 超时设置

```bash
# 设置全局超时
npx playwright test --timeout=60000

# 设置单个测试超时
test('should work', async ({ page }) => {
  test.setTimeout(60000);
  // ...
});
```

### 详细输出

```bash
# 显示详细日志
npx playwright test --reporter=list

# 只显示失败测试
npx playwright test --reporter=dotted
```

---

## 🐛 调试技巧

### 1. 使用 Playwright Inspector

```bash
npx playwright test --debug
```

### 2. 在代码中暂停

```typescript
test('example', async ({ page }) => {
  await page.pause(); // 在此处暂停，打开 Inspector
});
```

### 3. 查看页面状态

```typescript
test('example', async ({ page }) => {
  // 截图
  await page.screenshot({ path: 'debug.png' });

  // 获取页面 HTML
  const html = await page.content();
  console.log(html);

  // 在浏览器控制台执行代码
  await page.evaluate(() => {
    console.log('Debug info:', window.debugInfo);
  });
});
```

### 4. 慢动作模式

```typescript
// 在 playwright.config.ts 中设置
export default defineConfig({
  use: {
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },
});
```

---

## 📝 编写新测试

### 基本模板

```typescript
import { test, expect } from '@playwright/test';
import {
  waitForAppLoad,
  navigateToSmartOps,
  uploadFile,
  saveScreenshot,
} from '../helpers';

test.describe('我的测试套件', () => {
  test('应该能够做某事', async ({ page }) => {
    // 1. 导航到应用
    await waitForAppLoad(page);

    // 2. 执行操作
    await navigateToSmartOps(page);
    await uploadFile(page, './public/test-files/test.xlsx');

    // 3. 验证结果
    const element = page.locator('text=test.xlsx');
    await expect(element).toBeVisible();
  });
});
```

### 使用辅助函数

```typescript
import {
  uploadFile,
  executeCommand,
  waitForTaskCompletion,
  getExecutionProgress,
} from '../helpers';

test('执行任务并验证进度', async ({ page }) => {
  await uploadFile(page, TEST_FILES.simple);
  await executeCommand(page, '计算总和');

  const result = await waitForTaskCompletion(page);
  expect(result.completed).toBeTruthy();

  const progress = await getExecutionProgress(page);
  expect(progress).toBe(100);
});
```

### 截图和报告

```typescript
import { saveScreenshot, generateTestReport, saveTestReport } from '../helpers';

test('带截图的测试', async ({ page }) => {
  await saveScreenshot(page, 'my-test', '01-before.png');
  // 执行操作
  await saveScreenshot(page, 'my-test', '02-after.png');
});
```

---

## ⚠️ 常见问题

### Q: 测试失败，提示 "Test timeout"

**A**: 增加超时时间
```typescript
test.setTimeout(60000); // 60 秒
```

### Q: 找不到元素

**A**: 使用更稳定的选择器
```typescript
// 好
const button = page.locator('[data-testid="submit-button"]');

// 不好
const button = page.locator('button.btn-primary');
```

### Q: 测试在 CI 中失败但在本地通过

**A**: 检查环境差异
- 确保使用无头模式
- 增加等待时间
- 检查网络请求超时

### Q: 如何测试需要登录的功能？

**A**: 在 beforeEach 中登录
```typescript
test.beforeEach(async ({ page }) => {
  await login(page, 'username', 'password');
});
```

---

## 📚 更多资源

- [Playwright 官方文档](https://playwright.dev)
- [测试辅助函数文档](./helpers.ts)
- [完整测试报告](./TEST_REPORT.md)
- [项目架构文档](../../ARCHITECTURE.md)

---

**快速提示**: 大多数问题可以通过增加 `await page.waitForTimeout(1000)` 来解决，但最好使用 `waitForSelector` 代替固定延迟。
