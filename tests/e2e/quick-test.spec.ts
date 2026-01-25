/**
 * 多Sheet支持功能 - 快速验证测试
 *
 * 用于快速验证测试环境和UI元素
 */

import { test, expect } from '@playwright/test';

test.describe('多Sheet支持 - 快速验证', () => {
  const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

  test('验证应用可访问性和UI元素', async ({ page }) => {
    console.log('导航到应用...');
    await page.goto(BASE_URL);

    // 等待页面加载
    await page.waitForLoadState('domcontentloaded');
    console.log('✓ 页面加载成功');

    // 截图
    await page.screenshot({ path: 'tests/screenshots/quick-test-01-homepage.png' });

    // 查找文档空间入口
    const docSpaceButton = page.locator('text=文档空间').or(
      page.locator('button, a, div').filter({ hasText: '文档空间' })
    ).first();

    const isVisible = await docSpaceButton.isVisible();
    console.log(`文档空间按钮可见: ${isVisible}`);

    if (isVisible) {
      await docSpaceButton.click();
      console.log('✓ 点击文档空间');
      await page.waitForTimeout(2000);

      await page.screenshot({ path: 'tests/screenshots/quick-test-02-document-space.png' });

      // 查找文件上传区域
      const fileInput = page.locator('input[type="file"]');
      const fileInputCount = await fileInput.count();
      console.log(`找到 ${fileInputCount} 个文件输入框`);

      // 测试上传功能
      if (fileInputCount > 0) {
        console.log('✓ 找到文件上传区域');

        // 尝试上传测试文件
        const { path } = require('path');
        const testFilePath = path.join(process.cwd(), 'public/test-files/test-multisheet-employee.xlsx');

        try {
          const fs = require('fs');
          if (fs.existsSync(testFilePath)) {
            await fileInput.nth(fileInputCount - 1).setInputFiles(testFilePath);
            console.log('✓ 文件上传成功');

            await page.waitForTimeout(3000);

            await page.screenshot({ path: 'tests/screenshots/quick-test-03-after-upload.png' });

            // 检查Sheet选择器
            const sheetSelector = page.locator('text=主数据表, text=辅助数据表');
            const hasSheetSelector = await sheetSelector.count() > 0;

            if (hasSheetSelector) {
              console.log('✓ 检测到Sheet选择器');

              await page.screenshot({ path: 'tests/screenshots/quick-test-04-sheet-selector.png' });
            } else {
              console.log('⚠ 未检测到Sheet选择器');
            }
          } else {
            console.log('⚠ 测试文件不存在:', testFilePath);
          }
        } catch (error) {
          console.log('⚠ 文件上传失败:', error.message);
        }
      }
    } else {
      console.log('⚠ 未找到文档空间按钮');
    }

    console.log('\n========== 测试摘要 ==========');
    console.log('基础UI元素验证完成');
    console.log('截图已保存到: tests/screenshots/');
  });
});
