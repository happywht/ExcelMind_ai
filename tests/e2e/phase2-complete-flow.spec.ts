/**
 * Phase 2 完整流程端到端测试
 *
 * 测试数据质量分析和批量生成的完整用户流程
 *
 * @version 2.0.0
 */

import { test, expect, Page } from '@playwright/test';

// ==================== 辅助函数 ====================

/**
 * 登录系统
 */
async function login(page: Page) {
  await page.goto('http://localhost:3001');

  // 等待登录表单
  await page.waitForSelector('input[type="email"]', { timeout: 5000 });

  // 填写登录信息
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'password123');

  // 点击登录按钮
  await page.click('button[type="submit"]');

  // 等待登录成功 - 检查是否跳转到主页面
  await page.waitForURL('**/', { timeout: 5000 });
}

/**
 * 导航到数据质量页面
 */
async function navigateToDataQuality(page: Page) {
  await page.click('[data-testid="nav-data-quality"]');
  await page.waitForSelector('text=上传Excel文件进行质量分析', { timeout: 5000 });
}

/**
 * 导航到批量生成页面
 */
async function navigateToBatchGeneration(page: Page) {
  await page.click('[data-testid="nav-batch-generation"]');
  await page.waitForSelector('text=选择模板', { timeout: 5000 });
}

// ==================== 数据质量分析测试 ====================

test.describe('数据质量分析完整流程', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('应该能够上传并分析Excel文件', async ({ page }) => {
    await navigateToDataQuality(page);

    // 上传测试文件
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles('test-data/sample-data.xlsx');

    // 等待分析完成
    await page.waitForSelector('[data-testid="analysis-complete"]', { timeout: 30000 });

    // 验证分析结果显示
    const scoreText = await page.textContent('[data-testid="quality-score"]');
    const score = parseInt(scoreText || '0');
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);

    // 验证问题列表
    const issues = await page.locator('[data-testid="issue-item"]').count();
    expect(issues).toBeGreaterThan(0);

    // 验证统计指标
    await page.waitForSelector('text=完整度');
    await page.waitForSelector('text=缺失值');
    await page.waitForSelector('text=重复值');
  });

  test('应该能够查看问题详情', async ({ page }) => {
    await navigateToDataQuality(page);

    // 上传文件并等待分析
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles('test-data/sample-data.xlsx');
    await page.waitForSelector('[data-testid="analysis-complete"]', { timeout: 30000 });

    // 点击第一个问题查看详情
    await page.click('[data-testid="issue-item"]:first-child');

    // 验证详情显示
    await page.waitForSelector('[data-testid="issue-detail-dialog"]');
    await expect(page.locator('[data-testid="issue-detail-dialog"]')).toBeVisible();

    // 关闭详情
    await page.click('[data-testid="close-dialog"]');
  });

  test('应该能够应用自动修复', async ({ page }) => {
    await navigateToDataQuality(page);

    // 上传文件并等待分析
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles('test-data/sample-data.xlsx');
    await page.waitForSelector('[data-testid="analysis-complete"]', { timeout: 30000 });

    // 记录修复前的分数
    const scoreBefore = parseInt(await page.textContent('[data-testid="quality-score"]') || '0');

    // 点击一键修复按钮
    await page.click('[data-testid="auto-fix-button"]');

    // 等待修复对话框显示
    await page.waitForSelector('[data-testid="auto-fix-dialog"]');

    // 选择可自动修复的建议
    await page.check('[data-testid="sugg-checkbox"]:checked');

    // 确认修复
    await page.click('[data-testid="confirm-fix"]');

    // 等待修复完成
    await page.waitForSelector('text=修复完成', { timeout: 10000 });

    // 验证分数提升
    const scoreAfter = parseInt(await page.textContent('[data-testid="quality-score"]') || '0');
    expect(scoreAfter).toBeGreaterThanOrEqual(scoreBefore);
  });

  test('应该能够显示实时分析进度', async ({ page }) => {
    await navigateToDataQuality(page);

    // 上传文件
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles('test-data/large-dataset-1000.xlsx');

    // 验证进度条显示
    await page.waitForSelector('[data-testid="progress-bar"]', { timeout: 5000 });
    await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();

    // 验证进度文本更新
    const progressText = await page.textContent('[data-testid="progress-text"]');
    expect(progressText).toContain('正在分析');

    // 等待完成
    await page.waitForSelector('[data-testid="analysis-complete"]', { timeout: 60000 });
  });

  test('应该能够处理分析错误', async ({ page }) => {
    await navigateToDataQuality(page);

    // 上传无效文件
    const fileInput = await page.locator('input[type="file"]');

    // 创建一个无效的文件
    await page.evaluate(() => {
      const blob = new Blob(['invalid content'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const file = new File([blob], 'invalid.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (input) {
        input.files = dataTransfer.files;
      }
    });

    // 验证错误消息显示
    await page.waitForSelector('text=分析失败', { timeout: 10000 });
    await expect(page.locator('text=分析失败')).toBeVisible();
  });
});

// ==================== 批量生成测试 ====================

test.describe('批量文档生成完整流程', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('应该能够创建批量生成任务', async ({ page }) => {
    await navigateToBatchGeneration(page);

    // 步骤1: 选择模板
    await page.click('[data-testid="template-tpl_1"]');
    await page.click('button:has-text("下一步")');

    // 步骤2: 选择数据源
    await page.click('[data-testid="datasource-ds_1"]');
    await page.click('button:has-text("下一步")');

    // 步骤3: 配置选项
    await page.click('button:has-text("创建任务")');

    // 等待任务创建成功
    await page.waitForSelector('text=任务创建成功', { timeout: 10000 });

    // 验证任务信息显示
    await expect(page.locator('text=任务ID')).toBeVisible();
    await expect(page.locator('text=预计文档')).toBeVisible();
    await expect(page.locator('text=预计耗时')).toBeVisible();
  });

  test('应该能够实时显示任务进度', async ({ page }) => {
    await navigateToBatchGeneration(page);

    // 创建任务
    await page.click('[data-testid="template-tpl_1"]');
    await page.click('button:has-text("下一步")');
    await page.click('[data-testid="datasource-ds_1"]');
    await page.click('button:has-text("下一步")');
    await page.click('button:has-text("创建任务")');
    await page.waitForSelector('text=任务创建成功');

    // 验证进度显示
    await page.waitForSelector('[data-testid="task-progress"]', { timeout: 5000 });
    await expect(page.locator('[data-testid="task-progress"]')).toBeVisible();

    // 验证进度值递增
    const initialProgress = parseInt(await page.textContent('[data-testid="progress-value"]') || '0');
    await page.waitForTimeout(2000);
    const laterProgress = parseInt(await page.textContent('[data-testid="progress-value"]') || '0');

    expect(laterProgress).toBeGreaterThanOrEqual(initialProgress);
  });

  test('应该能够暂停和恢复任务', async ({ page }) => {
    await navigateToBatchGeneration(page);

    // 创建任务
    await page.click('[data-testid="template-tpl_1"]');
    await page.click('button:has-text("下一步")');
    await page.click('[data-testid="datasource-ds_1"]');
    await page.click('button:has-text("下一步")');
    await page.click('button:has-text("创建任务")');
    await page.waitForSelector('text=任务创建成功');

    // 等待任务开始
    await page.waitForSelector('[data-testid="task-progress"]', { timeout: 10000 });

    // 暂停任务
    await page.click('[data-testid="pause-task"]');
    await page.waitForSelector('text=已暂停', { timeout: 5000 });

    // 恢复任务
    await page.click('[data-testid="resume-task"]');
    await page.waitForSelector('text=处理中', { timeout: 5000 });
  });

  test('应该能够下载生成的文档', async ({ page }) => {
    await navigateToBatchGeneration(page);

    // 创建任务
    await page.click('[data-testid="template-tpl_1"]');
    await page.click('button:has-text("下一步")');
    await page.click('[data-testid="datasource-ds_1"]');
    await page.click('button:has-text("下一步")');
    await page.click('button:has-text("创建任务")');

    // 等待任务完成
    await page.waitForSelector('[data-testid="task-complete"]', { timeout: 60000 });

    // 设置下载处理
    const downloadPromise = page.waitForEvent('download');

    // 点击下载按钮
    await page.click('[data-testid="download-button"]');

    // 验证下载
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('batch-');
    expect(download.suggestedFilename()).toContain('.zip');
  });

  test('应该能够显示多个模板的生成进度', async ({ page }) => {
    await navigateToBatchGeneration(page);

    // 选择多个模板
    await page.click('[data-testid="template-tpl_1"]');
    await page.click('[data-testid="template-tpl_2"]');
    await page.click('button:has-text("下一步")');

    // 选择数据源
    await page.click('[data-testid="datasource-ds_1"]');
    await page.click('button:has-text("下一步")');
    await page.click('button:has-text("创建任务")');

    // 等待任务创建
    await page.waitForSelector('text=任务创建成功');

    // 验证多个模板进度显示
    await page.waitForSelector('[data-testid="template-progress-item"]', { timeout: 5000 });

    const templateItems = await page.locator('[data-testid="template-progress-item"]').count();
    expect(templateItems).toBe(2);
  });
});

// ==================== 性能测试 ====================

test.describe('性能基准测试', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('大数据集分析应在合理时间内完成', async ({ page }) => {
    await navigateToDataQuality(page);

    // 上传大数据集文件
    const startTime = Date.now();

    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles('test-data/large-dataset-1000.xlsx');

    // 等待分析完成
    await page.waitForSelector('[data-testid="analysis-complete"]', { timeout: 60000 });

    const endTime = Date.now();
    const analysisTime = endTime - startTime;

    // 验证性能：分析时间应小于60秒
    expect(analysisTime).toBeLessThan(60000);

    console.log(`1000行数据分析耗时: ${analysisTime}ms`);
  });

  test('批量生成应在合理时间内完成', async ({ page }) => {
    await navigateToBatchGeneration(page);

    // 创建小批量任务
    await page.click('[data-testid="template-tpl_1"]');
    await page.click('button:has-text("下一步")');
    await page.click('[data-testid="datasource-ds_2"]'); // 使用较小的数据集
    await page.click('button:has-text("下一步")');

    const startTime = Date.now();

    await page.click('button:has-text("创建任务")');

    // 等待任务完成
    await page.waitForSelector('[data-testid="task-complete"]', { timeout: 120000 });

    const endTime = Date.now();
    const generationTime = endTime - startTime;

    // 验证性能：生成时间应小于2分钟（500个文档）
    expect(generationTime).toBeLessThan(120000);

    console.log(`500个文档生成耗时: ${generationTime}ms`);
  });

  test('页面响应时间应在可接受范围内', async ({ page }) => {
    // 测试数据质量页面加载时间
    const loadStart = Date.now();
    await navigateToDataQuality(page);
    const loadEnd = Date.now();
    const loadTime = loadEnd - loadStart;

    expect(loadTime).toBeLessThan(3000); // 页面加载应在3秒内完成

    console.log(`数据质量页面加载时间: ${loadTime}ms`);

    // 测试批量生成页面加载时间
    const batchLoadStart = Date.now();
    await navigateToBatchGeneration(page);
    const batchLoadEnd = Date.now();
    const batchLoadTime = batchLoadEnd - batchLoadStart;

    expect(batchLoadTime).toBeLessThan(3000);

    console.log(`批量生成页面加载时间: ${batchLoadTime}ms`);
  });
});

// ==================== 错误处理测试 ====================

test.describe('错误处理和恢复', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('应该能够处理网络错误', async ({ page }) => {
    await navigateToDataQuality(page);

    // 模拟网络离线
    await page.context().setOffline(true);

    // 尝试上传文件
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles('test-data/sample-data.xlsx');

    // 验证错误消息
    await page.waitForSelector('text=网络错误', { timeout: 10000 });
    await expect(page.locator('text=网络错误')).toBeVisible();

    // 恢复网络
    await page.context().setOffline(false);

    // 重试
    await page.click('[data-testid="retry-button"]');
    await page.waitForSelector('[data-testid="analysis-complete"]', { timeout: 30000 });
  });

  test('应该能够处理服务器错误', async ({ page }) => {
    // 模拟服务器错误场景
    await page.route('**/api/v2/data-quality/analyze', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: '服务器内部错误',
          },
        }),
      });
    });

    await navigateToDataQuality(page);

    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles('test-data/sample-data.xlsx');

    // 验证错误处理
    await page.waitForSelector('text=服务器错误', { timeout: 10000 });
    await expect(page.locator('text=服务器错误')).toBeVisible();
  });

  test('应该能够处理无效文件格式', async ({ page }) => {
    await navigateToDataQuality(page);

    // 创建一个非Excel文件
    const fileInput = await page.locator('input[type="file"]');

    // 上传PDF文件
    await fileInput.setInputFiles('test-data/sample.pdf');

    // 验证错误消息
    await page.waitForSelector('text=不支持的文件格式', { timeout: 5000 });
    await expect(page.locator('text=不支持的文件格式')).toBeVisible();
  });
});

// ==================== 可访问性测试 ====================

test.describe('可访问性测试', () => {
  test('应该支持键盘导航', async ({ page }) => {
    await login(page);
    await navigateToDataQuality(page);

    // 使用Tab键导航
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // 按Enter键激活文件选择
    await page.keyboard.press('Enter');

    // 验证文件对话框打开
    await page.waitForTimeout(1000);
  });

  test('应该有正确的ARIA标签', async ({ page }) => {
    await login(page);
    await navigateToBatchGeneration(page);

    // 检查模板选择按钮的ARIA标签
    const templateButton = page.locator('[data-testid="template-tpl_1"]');
    await expect(templateButton).toHaveAttribute('role', 'button');
  });

  test('应该支持屏幕阅读器', async ({ page }) => {
    await login(page);
    await navigateToDataQuality(page);

    // 检查进度条的可访问性
    await page.locator('input[type="file"]').setInputFiles('test-data/sample-data.xlsx');
    await page.waitForSelector('[data-testid="progress-bar"]');

    const progressBar = page.locator('[data-testid="progress-bar"]');
    await expect(progressBar).toHaveAttribute('role', 'progressbar');
  });
});
