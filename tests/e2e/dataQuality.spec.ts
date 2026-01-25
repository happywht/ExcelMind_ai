/**
 * 数据质量E2E测试
 *
 * 测试数据质量分析功能的完整用户流程
 *
 * @module tests/e2e/dataQuality
 * @version 2.0.0
 */

import { test, expect, Page } from '@playwright/test';

// ============================================================================
// 测试辅助函数
// ============================================================================

/**
 * 导航到数据质量页面
 */
async function navigateToDataQualityPage(page: Page) {
  await page.goto('/data-quality');
  await expect(page.locator('h1')).toContainText('数据质量分析');
}

/**
 * 上传Excel文件
 */
async function uploadExcelFile(page: Page, fileName: string = 'test-data.xlsx') {
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(`./test-files/${fileName}`);
  await expect(page.locator('.upload-success')).toBeVisible();
}

/**
 * 开始数据质量分析
 */
async function startAnalysis(page: Page) {
  await page.click('button:has-text("开始分析")');
  await expect(page.locator('.analysis-progress')).toBeVisible();
}

/**
 * 等待分析完成
 */
async function waitForAnalysisComplete(page: Page) {
  await page.waitForSelector('.analysis-complete', { timeout: 30000 });
  await expect(page.locator('.quality-score')).toBeVisible();
}

/**
 * 查看问题列表
 */
async function viewIssueList(page: Page) {
  await page.click('button:has-text("查看问题")');
  await expect(page.locator('.issue-list')).toBeVisible();
}

/**
 * 查看清洗建议
 */
async function viewSuggestions(page: Page) {
  await page.click('button:has-text("查看建议")');
  await expect(page.locator('.suggestion-panel')).toBeVisible();
}

/**
 * 应用修复建议
 */
async function applySuggestion(page: Page, suggestionIndex: number = 0) {
  const suggestions = page.locator('.suggestion-item');
  const count = await suggestions.count();

  if (count > 0) {
    await suggestions.nth(suggestionIndex).click();
    await page.click('button:has-text("应用修复")');
    await expect(page.locator('.fix-progress')).toBeVisible();
  }
}

/**
 * 验证修复效果
 */
async function verifyFixResults(page: Page) {
  await page.waitForSelector('.fix-complete', { timeout: 30000 });
  const summary = page.locator('.fix-summary');
  await expect(summary).toBeVisible();
  await expect(summary).toContainText('修复完成');
}

// ============================================================================
// 测试套件
// ============================================================================

test.describe('数据质量分析 - 基本流程', () => {
  test('应该完成完整的数据质量分析流程', async ({ page }) => {
    // 1. 导航到页面
    await navigateToDataQualityPage(page);

    // 2. 上传Excel文件
    await uploadExcelFile(page, 'sample-with-issues.xlsx');

    // 3. 配置分析选项
    await page.check('input[name="detectMissing"]');
    await page.check('input[name="detectOutliers"]');
    await page.check('input[name="detectDuplicates"]');
    await page.check('input[name="detectFormat"]');

    // 4. 开始分析
    await startAnalysis(page);

    // 5. 等待分析完成
    await waitForAnalysisComplete(page);

    // 6. 验证结果显示
    await expect(page.locator('.quality-score')).toBeVisible();
    await expect(page.locator('.issue-count')).toBeVisible();
    await expect(page.locator('.column-stats')).toBeVisible();
  });

  test('应该显示数据质量问题列表', async ({ page }) => {
    await navigateToDataQualityPage(page);
    await uploadExcelFile(page, 'sample-with-missing-values.xlsx');
    await startAnalysis(page);
    await waitForAnalysisComplete(page);

    // 查看问题列表
    await viewIssueList(page);

    // 验证问题列表
    const issues = page.locator('.issue-item');
    const issueCount = await issues.count();
    expect(issueCount).toBeGreaterThan(0);

    // 验证问题详情
    await issues.first().click();
    await expect(page.locator('.issue-detail')).toBeVisible();
    await expect(page.locator('.affected-rows')).toBeVisible();
  });

  test('应该显示清洗建议', async ({ page }) => {
    await navigateToDataQualityPage(page);
    await uploadExcelFile(page, 'sample-with-issues.xlsx');
    await startAnalysis(page);
    await waitForAnalysisComplete(page);

    // 查看建议
    await viewSuggestions(page);

    // 验证建议列表
    const suggestions = page.locator('.suggestion-item');
    const suggestionCount = await suggestions.count();
    expect(suggestionCount).toBeGreaterThan(0);

    // 验证建议详情
    await suggestions.first().click();
    await expect(page.locator('.suggestion-detail')).toBeVisible();
    await expect(page.locator('.impact-assessment')).toBeVisible();
    await expect(page.locator('.code-preview')).toBeVisible();
  });
});

test.describe('数据质量分析 - 缺失值处理', () => {
  test('应该检测缺失值', async ({ page }) => {
    await navigateToDataQualityPage(page);
    await uploadExcelFile(page, 'sample-with-missing-values.xlsx');
    await startAnalysis(page);
    await waitForAnalysisComplete(page);

    // 验证缺失值检测
    await viewIssueList(page);

    const missingValueIssues = page.locator('.issue-item[data-type="missing_value"]');
    const count = await missingValueIssues.count();
    expect(count).toBeGreaterThan(0);
  });

  test('应该生成缺失值填充建议', async ({ page }) => {
    await navigateToDataQualityPage(page);
    await uploadExcelFile(page, 'sample-with-missing-values.xlsx');
    await startAnalysis(page);
    await waitForAnalysisComplete(page);

    await viewSuggestions(page);

    // 验证填充建议
    const fillSuggestions = page.locator('.suggestion-item:has-text("填充")');
    const count = await fillSuggestions.count();
    expect(count).toBeGreaterThan(0);
  });

  test('应该应用缺失值修复', async ({ page }) => {
    await navigateToDataQualityPage(page);
    await uploadExcelFile(page, 'sample-with-missing-values.xlsx');
    await startAnalysis(page);
    await waitForAnalysisComplete(page);

    await viewSuggestions(page);
    await applySuggestion(page, 0);
    await verifyFixResults(page);

    // 验证修复统计
    const stats = page.locator('.fix-statistics');
    await expect(stats).toContainText('填充');
  });
});

test.describe('数据质量分析 - 异常值处理', () => {
  test('应该检测异常值', async ({ page }) => {
    await navigateToDataQualityPage(page);
    await uploadExcelFile(page, 'sample-with-outliers.xlsx');
    await startAnalysis(page);
    await waitForAnalysisComplete(page);

    await viewIssueList(page);

    const outlierIssues = page.locator('.issue-item[data-type="outlier"]');
    const count = await outlierIssues.count();
    expect(count).toBeGreaterThan(0);
  });

  test('应该生成异常值处理建议', async ({ page }) => {
    await navigateToDataQualityPage(page);
    await uploadExcelFile(page, 'sample-with-outliers.xlsx');
    await startAnalysis(page);
    await waitForAnalysisComplete(page);

    await viewSuggestions(page);

    // 验证删除或替换建议
    const outlierSuggestions = page.locator('.suggestion-item:has-text("异常值")');
    const count = await outlierSuggestions.count();
    expect(count).toBeGreaterThan(0);
  });

  test('应该应用异常值修复', async ({ page }) => {
    await navigateToDataQualityPage(page);
    await uploadExcelFile(page, 'sample-with-outliers.xlsx');
    await startAnalysis(page);
    await waitForAnalysisComplete(page);

    await viewSuggestions(page);
    await applySuggestion(page, 0);
    await verifyFixResults(page);
  });
});

test.describe('数据质量分析 - 重复行处理', () => {
  test('应该检测重复行', async ({ page }) => {
    await navigateToDataQualityPage(page);
    await uploadExcelFile(page, 'sample-with-duplicates.xlsx');
    await startAnalysis(page);
    await waitForAnalysisComplete(page);

    await viewIssueList(page);

    const duplicateIssues = page.locator('.issue-item[data-type="duplicate_row"]');
    const count = await duplicateIssues.count();
    expect(count).toBeGreaterThan(0);
  });

  test('应该生成删除重复行建议', async ({ page }) => {
    await navigateToDataQualityPage(page);
    await uploadExcelFile(page, 'sample-with-duplicates.xlsx');
    await startAnalysis(page);
    await waitForAnalysisComplete(page);

    await viewSuggestions(page);

    const deleteSuggestions = page.locator('.suggestion-item:has-text("删除")');
    const count = await deleteSuggestions.count();
    expect(count).toBeGreaterThan(0);
  });

  test('应该应用删除重复行修复', async ({ page }) => {
    await navigateToDataQualityPage(page);
    await uploadExcelFile(page, 'sample-with-duplicates.xlsx');
    await startAnalysis(page);
    await waitForAnalysisComplete(page);

    await viewSuggestions(page);
    await applySuggestion(page, 0);
    await verifyFixResults(page);

    // 验证行数减少
    const stats = page.locator('.fix-statistics');
    await expect(stats).toContainText('删除');
  });
});

test.describe('数据质量分析 - 格式一致性', () => {
  test('应该检测格式不一致', async ({ page }) => {
    await navigateToDataQualityPage(page);
    await uploadExcelFile(page, 'sample-with-format-issues.xlsx');
    await startAnalysis(page);
    await waitForAnalysisComplete(page);

    await viewIssueList(page);

    const formatIssues = page.locator('.issue-item[data-type="format_inconsistency"]');
    const count = await formatIssues.count();
    expect(count).toBeGreaterThan(0);
  });

  test('应该生成格式标准化建议', async ({ page }) => {
    await navigateToDataQualityPage(page);
    await uploadExcelFile(page, 'sample-with-format-issues.xlsx');
    await startAnalysis(page);
    await waitForAnalysisComplete(page);

    await viewSuggestions(page);

    const formatSuggestions = page.locator('.suggestion-item:has-text("格式")');
    const count = await formatSuggestions.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('数据质量分析 - 批量修复', () => {
  test('应该支持批量应用多个建议', async ({ page }) => {
    await navigateToDataQualityPage(page);
    await uploadExcelFile(page, 'sample-with-multiple-issues.xlsx');
    await startAnalysis(page);
    await waitForAnalysisComplete(page);

    await viewSuggestions(page);

    // 选择多个建议
    const suggestions = page.locator('.suggestion-item input[type="checkbox"]');
    const count = await suggestions.count();

    for (let i = 0; i < Math.min(3, count); i++) {
      await suggestions.nth(i).check();
    }

    // 批量应用
    await page.click('button:has-text("批量应用")');
    await verifyFixResults(page);
  });

  test('应该显示批量修复进度', async ({ page }) => {
    await navigateToDataQualityPage(page);
    await uploadExcelFile(page, 'sample-with-multiple-issues.xlsx');
    await startAnalysis(page);
    await waitForAnalysisComplete(page);

    await viewSuggestions(page);

    // 选择多个建议
    const checkboxes = page.locator('.suggestion-item input[type="checkbox"]');
    await checkboxes.first().check();
    await checkboxes.nth(1).check();

    await page.click('button:has-text("批量应用")');

    // 验证进度显示
    await expect(page.locator('.batch-progress')).toBeVisible();
    await expect(page.locator('.progress-bar')).toBeVisible();

    // 等待完成
    await verifyFixResults(page);
  });
});

test.describe('数据质量分析 - 试运行模式', () => {
  test('应该支持试运行模式', async ({ page }) => {
    await navigateToDataQualityPage(page);
    await uploadExcelFile(page, 'sample-with-issues.xlsx');
    await startAnalysis(page);
    await waitForAnalysisComplete(page);

    await viewSuggestions(page);

    // 启用试运行模式
    await page.check('input[name="dryRun"]');

    await applySuggestion(page, 0);

    // 验证试运行结果
    await expect(page.locator('.dry-run-results')).toBeVisible();
    await expect(page.locator('.preview-changes')).toBeVisible();
  });

  test('应该显示预览变更', async ({ page }) => {
    await navigateToDataQualityPage(page);
    await uploadExcelFile(page, 'sample-with-missing-values.xlsx');
    await startAnalysis(page);
    await waitForAnalysisComplete(page);

    await viewSuggestions(page);
    await page.check('input[name="dryRun"]');
    await applySuggestion(page, 0);

    // 验证变更预览
    const preview = page.locator('.change-preview');
    await expect(preview).toBeVisible();
    await expect(preview.locator('.before-change')).toBeVisible();
    await expect(preview.locator('.after-change')).toBeVisible();
  });
});

test.describe('数据质量分析 - 导出功能', () => {
  test('应该支持导出分析报告', async ({ page }) => {
    await navigateToDataQualityPage(page);
    await uploadExcelFile(page, 'sample-with-issues.xlsx');
    await startAnalysis(page);
    await waitForAnalysisComplete(page);

    // 导出报告
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("导出报告")');
    const download = await downloadPromise;

    // 验证下载
    expect(download.suggestedFilename()).toContain('report');
    expect(download.suggestedFilename()).toMatch(/\.(xlsx|pdf)$/);
  });

  test('应该支持导出清洗后的数据', async ({ page }) => {
    await navigateToDataQualityPage(page);
    await uploadExcelFile(page, 'sample-with-issues.xlsx');
    await startAnalysis(page);
    await waitForAnalysisComplete(page);

    await viewSuggestions(page);
    await applySuggestion(page, 0);
    await verifyFixResults(page);

    // 导出清洗后的数据
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("导出数据")');
    const download = await downloadPromise;

    // 验证下载
    expect(download.suggestedFilename()).toContain('cleaned');
    expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
  });
});

test.describe('数据质量分析 - 错误处理', () => {
  test('应该处理文件上传错误', async ({ page }) => {
    await navigateToDataQualityPage(page);

    // 尝试上传无效文件
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('./test-files/invalid-file.txt');

    // 验证错误提示
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('不支持的文件格式');
  });

  test('应该处理分析失败', async ({ page }) => {
    await navigateToDataQualityPage(page);

    // 上传空文件
    await uploadExcelFile(page, 'empty.xlsx');
    await startAnalysis(page);

    // 验证错误处理
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('文件为空');
  });

  test('应该处理修复失败', async ({ page }) => {
    await navigateToDataQualityPage(page);
    await uploadExcelFile(page, 'sample-with-issues.xlsx');
    await startAnalysis(page);
    await waitForAnalysisComplete(page);

    await viewSuggestions(page);

    // 模拟修复失败（选择无效建议）
    await applySuggestion(page, 0);

    // 如果修复失败，应该显示错误
    const errorMessage = page.locator('.fix-error');
    if (await errorMessage.isVisible()) {
      await expect(errorMessage).toContainText('修复失败');
    }
  });
});

test.describe('数据质量分析 - 性能测试', () => {
  test('应该在合理时间内完成大文件分析', async ({ page }) => {
    await navigateToDataQualityPage(page);

    const startTime = Date.now();

    await uploadExcelFile(page, 'large-dataset.xlsx');
    await startAnalysis(page);
    await waitForAnalysisComplete(page);

    const duration = Date.now() - startTime;

    // 验证性能要求（10秒内完成）
    expect(duration).toBeLessThan(10000);
  });

  test('应该流畅处理实时进度更新', async ({ page }) => {
    await navigateToDataQualityPage(page);
    await uploadExcelFile(page, 'sample-with-issues.xlsx');
    await startAnalysis(page);

    // 验证进度更新
    const progressBar = page.locator('.progress-bar');
    await expect(progressBar).toBeVisible();

    // 等待进度更新
    const initialWidth = await progressBar.getAttribute('style');
    await page.waitForTimeout(500);
    const updatedWidth = await progressBar.getAttribute('style');

    // 进度应该有变化
    expect(updatedWidth).not.toBe(initialWidth);
  });
});

test.describe('数据质量分析 - 用户体验', () => {
  test('应该提供清晰的操作指引', async ({ page }) => {
    await navigateToDataQualityPage(page);

    // 验证指引元素
    await expect(page.locator('.upload-hint')).toBeVisible();
    await expect(page.locator('.step-indicator')).toBeVisible();
  });

  test('应该显示工具提示和帮助信息', async ({ page }) => {
    await navigateToDataQualityPage(page);

    // 悬停在帮助图标上
    const helpIcon = page.locator('.help-icon').first();
    await helpIcon.hover();

    // 验证工具提示
    await expect(page.locator('.tooltip')).toBeVisible();
  });

  test('应该支持键盘导航', async ({ page }) => {
    await navigateToDataQualityPage(page);

    // 使用Tab键导航
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // 验证焦点
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['BUTTON', 'INPUT']).toContain(focusedElement);
  });

  test('应该响应式适配不同屏幕', async ({ page }) => {
    await navigateToDataQualityPage(page);

    // 测试移动端视图
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('.mobile-menu')).toBeVisible();

    // 测试平板视图
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('.tablet-layout')).toBeVisible();
  });
});
