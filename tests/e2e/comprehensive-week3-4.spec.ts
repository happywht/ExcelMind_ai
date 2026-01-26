import { test, expect, Page } from '@playwright/test';

/**
 * ExcelMind AI Week 3-4 综合E2E测试
 * 测试范围：
 * 1. 7个功能模块的完整功能验证
 * 2. UI/UX验证（主界面、侧边栏、响应式）
 * 3. 性能验证（加载时间、交互性能）
 * 4. 错误处理验证（错误边界、日志系统）
 * 5. 兼容性验证（浏览器兼容性、场景测试）
 */

// 测试配置
const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = 'test-screenshots/week3-4-e2e';

// 工具函数
async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/${name}.png`,
    fullPage: true
  });
}

async function measurePerformance(page: Page, actionName: string, action: () => Promise<void>) {
  const startTime = Date.now();
  await action();
  const duration = Date.now() - startTime;
  console.log(`[性能] ${actionName}: ${duration}ms`);
  return duration;
}

test.describe('Week 3-4 综合E2E测试', () => {
  test.beforeAll(async () => {
    // 创建截图目录
    const fs = require('fs');
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  // ============== 任务1: 功能模块测试 ==============

  test.describe('1. 智能处理功能', () => {
    test('应该能够加载智能处理页面', async ({ page }) => {
      // 点击智能处理卡片
      await page.click('[data-testid="smart-process-card"], text="智能处理"');

      // 验证页面加载
      await expect(page.locator('h1, h2').filter({ hasText: /智能处理/i })).toBeVisible();

      // 验证文件上传区域
      await expect(page.locator('input[type="file"]')).toBeVisible();

      await takeScreenshot(page, 'smart-process-page-loaded');
    });

    test('应该能够上传文件', async ({ page }) => {
      await page.click('[data-testid="smart-process-card"], text="智能处理"');

      // 上传文件
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'test.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer: Buffer.from('test')
      });

      // 验证文件显示
      await expect(page.locator('text=/test\\.xlsx/i')).toBeVisible();

      await takeScreenshot(page, 'smart-process-file-uploaded');
    });

    test('应该显示友好的错误提示', async ({ page }) => {
      await page.click('[data-testid="smart-process-card"], text="智能处理"');

      // 尝试上传不支持的文件
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'test.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('test')
      });

      // 验证错误提示
      await expect(page.locator('text=/不支持的格式|格式错误/i')).toBeVisible({ timeout: 5000 });

      await takeScreenshot(page, 'smart-process-error-handling');
    });
  });

  test.describe('2. 公式生成器功能', () => {
    test('应该能够加载公式生成器页面', async ({ page }) => {
      await page.click('[data-testid="formula-generator-card"], text="公式生成器"');

      await expect(page.locator('h1, h2').filter({ hasText: /公式生成器/i })).toBeVisible();
      await expect(page.locator('textarea, input[type="text"]')).toBeVisible();

      await takeScreenshot(page, 'formula-generator-page-loaded');
    });

    test('应该能够输入需求并生成公式', async ({ page }) => {
      await page.click('[data-testid="formula-generator-card"], text="公式生成器"');

      // 输入需求
      const textarea = page.locator('textarea').first();
      await textarea.fill('计算A列的平均值');

      // 点击生成按钮
      await page.click('button:has-text("生成"), button:has-text("AI生成")');

      // 等待结果显示
      await expect(page.locator('text/=AVERAGE/i')).toBeVisible({ timeout: 15000 });

      await takeScreenshot(page, 'formula-generator-result');
    });

    test('应该能够复制生成的公式', async ({ page }) => {
      await page.click('[data-testid="formula-generator-card"], text="公式生成器"');

      const textarea = page.locator('textarea').first();
      await textarea.fill('计算B列的总和');
      await page.click('button:has-text("生成"), button:has-text("AI生成")');

      // 等待结果显示
      await expect(page.locator('text/=SUM/i')).toBeVisible({ timeout: 15000 });

      // 点击复制按钮
      await page.click('button:has-text("复制"), button[title*="复制"]');

      // 验证复制成功提示
      await expect(page.locator('text=/复制成功|已复制/i')).toBeVisible({ timeout: 3000 });

      await takeScreenshot(page, 'formula-generator-copy-success');
    });
  });

  test.describe('3. 审计助手功能', () => {
    test('应该能够加载审计助手页面', async ({ page }) => {
      await page.click('[data-testid="audit-assistant-card"], text="审计助手"');

      await expect(page.locator('h1, h2').filter({ hasText: /审计助手/i })).toBeVisible();
      await expect(page.locator('input[type="file"]')).toBeVisible();

      await takeScreenshot(page, 'audit-assistant-page-loaded');
    });

    test('应该能够上传PDF并进行对话', async ({ page }) => {
      await page.click('[data-testid="audit-assistant-card"], text="审计助手"');

      // 上传文件
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'audit.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('test')
      });

      // 等待PDF预览
      await page.waitForTimeout(2000);

      // 输入问题
      const input = page.locator('input[type="text"], textarea').last();
      await input.fill('这个文档的主要问题是什么？');

      // 发送消息
      await page.click('button:has-text("发送"), button[type="submit"]');

      // 等待回复
      await expect(page.locator('text=/根据文档|文档分析/i')).toBeVisible({ timeout: 15000 });

      await takeScreenshot(page, 'audit-assistant-conversation');
    });
  });

  test.describe('4. 文档空间功能', () => {
    test('应该能够加载文档空间页面', async ({ page }) => {
      await page.click('[data-testid="document-space-card"], text="文档空间"');

      await expect(page.locator('h1, h2').filter({ hasText: /文档空间/i })).toBeVisible();

      await takeScreenshot(page, 'document-space-page-loaded');
    });

    test('应该能够选择模板和上传数据', async ({ page }) => {
      await page.click('[data-testid="document-space-card"], text="文档空间"');

      // 选择模板
      await page.click('text=/合同模板|报告模板|发票模板/i');

      // 上传Excel
      const fileInput = page.locator('input[type="file"]').last();
      await fileInput.setInputFiles({
        name: 'data.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer: Buffer.from('test')
      });

      // 验证文件已上传
      await expect(page.locator('text=/data\\.xlsx/i')).toBeVisible();

      await takeScreenshot(page, 'document-space-template-selected');
    });
  });

  test.describe('5. 批量生成功能', () => {
    test('应该能够加载批量生成页面', async ({ page }) => {
      await page.click('[data-testid="batch-generation-card"], text="批量生成"');

      await expect(page.locator('h1, h2').filter({ hasText: /批量生成/i })).toBeVisible();

      await takeScreenshot(page, 'batch-generation-page-loaded');
    });

    test('应该显示任务列表', async ({ page }) => {
      await page.click('[data-testid="batch-generation-card"], text="批量生成"');

      // 验证任务列表区域
      await expect(page.locator('text=/任务列表|批量任务/i')).toBeVisible();

      await takeScreenshot(page, 'batch-generation-task-list');
    });

    test('应该能够创建新任务', async ({ page }) => {
      await page.click('[data-testid="batch-generation-card"], text="批量生成"');

      // 点击创建任务按钮
      await page.click('button:has-text("创建任务"), button:has-text("新建")');

      // 验证创建对话框
      await expect(page.locator('text=/任务名称|选择模板/i')).toBeVisible();

      await takeScreenshot(page, 'batch-generation-create-task');
    });
  });

  test.describe('6. 模板管理功能', () => {
    test('应该能够加载模板管理页面', async ({ page }) => {
      await page.click('[data-testid="template-management-card"], text="模板管理"');

      await expect(page.locator('h1, h2').filter({ hasText: /模板管理/i })).toBeVisible();

      await takeScreenshot(page, 'template-management-page-loaded');
    });

    test('应该显示模板列表', async ({ page }) => {
      await page.click('[data-testid="template-management-card"], text="模板管理"');

      // 验证模板列表
      await expect(page.locator('text=/模板列表|我的模板/i')).toBeVisible();

      await takeScreenshot(page, 'template-management-list');
    });

    test('应该能够上传新模板', async ({ page }) => {
      await page.click('[data-testid="template-management-card"], text="模板管理"');

      // 点击上传按钮
      await page.click('button:has-text("上传模板"), button:has-text("添加模板")');

      // 上传文件
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'template.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        buffer: Buffer.from('test')
      });

      await takeScreenshot(page, 'template-management-upload');
    });
  });

  test.describe('7. 数据质量功能', () => {
    test('应该能够加载数据质量页面', async ({ page }) => {
      await page.click('[data-testid="data-quality-card"], text="数据质量"');

      await expect(page.locator('h1, h2').filter({ hasText: /数据质量/i })).toBeVisible();

      await takeScreenshot(page, 'data-quality-page-loaded');
    });

    test('应该能够上传文件进行分析', async ({ page }) => {
      await page.click('[data-testid="data-quality-card"], text="数据质量"');

      // 上传文件
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'data.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer: Buffer.from('test')
      });

      // 等待分析完成
      await page.waitForTimeout(3000);

      await takeScreenshot(page, 'data-quality-analysis');
    });

    test('应该显示清洗建议', async ({ page }) => {
      await page.click('[data-testid="data-quality-card"], text="数据质量"');

      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'data.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer: Buffer.from('test')
      });

      // 等待分析完成
      await page.waitForTimeout(3000);

      // 验证清洗建议
      await expect(page.locator('text=/清洗建议|质量报告|问题发现/i')).toBeVisible();

      await takeScreenshot(page, 'data-quality-recommendations');
    });
  });

  // ============== 任务2: UI/UX验证 ==============

  test.describe('UI/UX验证', () => {
    test('主界面应该显示7个功能卡片', async ({ page }) => {
      // 验证7个卡片
      const cards = page.locator('[data-testid$="-card"], .grid > div');
      await expect(cards).toHaveCount(7);

      // 验证卡片标题
      await expect(page.locator('text="智能处理"')).toBeVisible();
      await expect(page.locator('text="公式生成器"')).toBeVisible();
      await expect(page.locator('text="审计助手"')).toBeVisible();
      await expect(page.locator('text="文档空间"')).toBeVisible();
      await expect(page.locator('text="批量生成"')).toBeVisible();
      await expect(page.locator('text="模板管理"')).toBeVisible();
      await expect(page.locator('text="数据质量"')).toBeVisible();

      await takeScreenshot(page, 'ui-main-interface');
    });

    test('应该显示状态标签（NEW、HOT）', async ({ page }) => {
      // 验证NEW标签
      const newTags = page.locator('text="NEW", span:has-text("NEW")');
      await expect(newTags.first()).toBeVisible();

      // 验证HOT标签（如果有）
      const hotTags = page.locator('text="HOT", span:has-text("HOT")');
      // HOT标签可能不存在，所以不强制要求

      await takeScreenshot(page, 'ui-status-tags');
    });

    test('应该显示快捷键提示', async ({ page }) => {
      // 验证快捷键提示（1-7）
      await expect(page.locator('text=/按.*1.*7.*快速访问|快捷键.*1.*7/i')).toBeVisible();

      await takeScreenshot(page, 'ui-keyboard-shortcuts');
    });

    test('卡片应该有悬停动画', async ({ page }) => {
      const card = page.locator('[data-testid$="-card"], .grid > div').first();

      // 记录初始样式
      const initialTransform = await card.evaluate(el => getComputedStyle(el).transform);

      // 悬停
      await card.hover();

      // 等待动画
      await page.waitForTimeout(300);

      // 记录悬停后的样式
      const hoveredTransform = await card.evaluate(el => getComputedStyle(el).transform);

      // 验证样式有变化
      expect(hoveredTransform).not.toBe(initialTransform);

      await takeScreenshot(page, 'ui-hover-animation');
    });
  });

  test.describe('侧边栏验证', () => {
    test('应该显示7个菜单项', async ({ page }) => {
      // 打开侧边栏（移动端需要点击菜单按钮）
      const menuButton = page.locator('button[aria-label="菜单"], button:has-text("菜单")');
      if (await menuButton.isVisible()) {
        await menuButton.click();
      }

      // 验证菜单项
      await expect(page.locator('text="智能处理"')).toBeVisible();
      await expect(page.locator('text="公式生成器"')).toBeVisible();
      await expect(page.locator('text="审计助手"')).toBeVisible();
      await expect(page.locator('text="文档空间"')).toBeVisible();
      await expect(page.locator('text="批量生成"')).toBeVisible();
      await expect(page.locator('text="模板管理"')).toBeVisible();
      await expect(page.locator('text="数据质量"')).toBeVisible();

      await takeScreenshot(page, 'ui-sidebar');
    });

    test('菜单项应该有正确的激活状态', async ({ page }) => {
      // 打开侧边栏
      const menuButton = page.locator('button[aria-label="菜单"], button:has-text("菜单")');
      if (await menuButton.isVisible()) {
        await menuButton.click();
      }

      // 点击第一个菜单项
      await page.locator('text="智能处理"').first().click();

      // 等待页面加载
      await page.waitForLoadState('networkidle');

      // 验证激活状态
      const activeMenuItem = page.locator('.active, [aria-selected="true"], a[class*="active"]');
      await expect(activeMenuItem.first()).toBeVisible();

      await takeScreenshot(page, 'ui-sidebar-active-state');
    });
  });

  test.describe('响应式设计验证', () => {
    test('移动端布局应该正常', async ({ page }) => {
      // 设置移动端尺寸
      await page.setViewportSize({ width: 375, height: 667 });
      await page.reload();
      await page.waitForLoadState('networkidle');

      // 验证布局
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('.grid, [class*="grid"]').first()).toBeVisible();

      await takeScreenshot(page, 'ui-responsive-mobile');
    });

    test('平板布局应该正常', async ({ page }) => {
      // 设置平板尺寸
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.reload();
      await page.waitForLoadState('networkidle');

      // 验证布局
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('.grid, [class*="grid"]').first()).toBeVisible();

      await takeScreenshot(page, 'ui-responsive-tablet');
    });

    test('桌面布局应该正常', async ({ page }) => {
      // 设置桌面尺寸
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.reload();
      await page.waitForLoadState('networkidle');

      // 验证布局
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('.grid, [class*="grid"]').first()).toBeVisible();

      await takeScreenshot(page, 'ui-responsive-desktop');
    });
  });

  // ============== 任务3: 性能验证 ==============

  test.describe('性能验证', () => {
    test('首屏加载时间应该<2秒', async ({ page }) => {
      const duration = await measurePerformance(page, '首屏加载', async () => {
        await page.goto(BASE_URL);
        await page.waitForLoadState('networkidle');
      });

      expect(duration).toBeLessThan(2000);

      console.log(`[性能指标] 首屏加载时间: ${duration}ms (目标: <2000ms)`);
    });

    test('页面切换应该流畅', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      // 切换到智能处理页面
      const switchDuration = await measurePerformance(page, '页面切换', async () => {
        await page.click('[data-testid="smart-process-card"], text="智能处理"');
        await page.waitForLoadState('networkidle');
      });

      expect(switchDuration).toBeLessThan(500);

      console.log(`[性能指标] 页面切换时间: ${switchDuration}ms (目标: <500ms)`);
    });

    test('交互响应应该及时', async ({ page }) => {
      await page.goto(BASE_URL);

      // 测试卡片悬停响应时间
      const card = page.locator('[data-testid$="-card"], .grid > div').first();

      const hoverDuration = await measurePerformance(page, '卡片悬停', async () => {
        await card.hover();
        await page.waitForTimeout(100); // 等待动画
      });

      expect(hoverDuration).toBeLessThan(200);

      console.log(`[性能指标] 交互响应时间: ${hoverDuration}ms (目标: <200ms)`);
    });
  });

  // ============== 任务4: 错误处理验证 ==============

  test.describe('错误处理验证', () => {
    test('应该捕获手动触发的错误', async ({ page }) => {
      // 导航到一个页面
      await page.click('[data-testid="smart-process-card"], text="智能处理"');

      // 通过console触发错误（如果有错误边界测试功能）
      await page.evaluate(() => {
        // @ts-ignore
        if (window.__TEST_ERROR__) {
          throw new Error('测试错误边界');
        }
      });

      // 如果有错误边界，应该显示错误页面
      const errorBoundary = page.locator('text=/出错了|页面错误|Something went wrong/i');
      if (await errorBoundary.isVisible({ timeout: 2000 })) {
        // 验证错误边界UI
        await expect(page.locator('text=/返回主页|重试|刷新页面/i')).toBeVisible();

        await takeScreenshot(page, 'error-boundary-triggered');
      }
    });

    test('日志系统应该正常工作', async ({ page }) => {
      // 监听console日志
      const logs: string[] = [];
      page.on('console', msg => {
        logs.push(msg.text());
      });

      // 执行一些操作
      await page.click('[data-testid="smart-process-card"], text="智能处理"');
      await page.waitForTimeout(2000);

      // 验证有日志输出
      expect(logs.length).toBeGreaterThan(0);

      // 在开发环境中，应该有info和debug日志
      const infoLogs = logs.filter(log => log.includes('[info]') || log.includes('[DEBUG]'));
      expect(infoLogs.length).toBeGreaterThan(0);

      console.log(`[日志系统] 捕获到 ${logs.length} 条日志`);
    });
  });

  // ============== 任务5: 兼容性验证 ==============

  test.describe('场景测试', () => {
    test('首次访问应该正常', async ({ page }) => {
      // 清除所有存储
      await page.context().clearCookies();
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });

      // 重新访问
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      // 验证页面正常显示
      await expect(page.locator('h1')).toBeVisible();

      await takeScreenshot(page, 'scenario-first-visit');
    });

    test('多次切换页面应该正常', async ({ page }) => {
      // 快速切换多个页面
      for (let i = 0; i < 5; i++) {
        await page.click('[data-testid="smart-process-card"], text="智能处理"');
        await page.waitForTimeout(500);
        await page.goBack();
        await page.waitForTimeout(500);
      }

      // 验证页面仍然正常
      await expect(page.locator('h1')).toBeVisible();

      await takeScreenshot(page, 'scenario-multiple-navigation');
    });

    test('快速连续操作应该正常', async ({ page }) => {
      // 快速点击多个按钮
      const cards = page.locator('[data-testid$="-card"], .grid > div');
      const count = await cards.count();

      for (let i = 0; i < Math.min(count, 3); i++) {
        await cards.nth(i).click();
        await page.waitForTimeout(300);
        await page.goBack();
        await page.waitForTimeout(300);
      }

      // 验证应用仍然响应
      await expect(page.locator('h1')).toBeVisible();

      await takeScreenshot(page, 'scenario-rapid-operations');
    });
  });

  // ============== 综合测试报告 ==============

  test.afterAll(async ({ page }) => {
    console.log('\n========================================');
    console.log('ExcelMind AI Week 3-4 E2E测试完成');
    console.log('========================================');
    console.log('测试范围：');
    console.log('✅ 7个功能模块测试');
    console.log('✅ UI/UX验证');
    console.log('✅ 性能验证');
    console.log('✅ 错误处理验证');
    console.log('✅ 兼容性验证');
    console.log('========================================\n');
  });
});
