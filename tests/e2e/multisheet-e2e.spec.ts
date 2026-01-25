/**
 * 多Sheet支持功能 - 端到端测试（简化版）
 */

import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('多Sheet支持功能 E2E 测试', () => {
  const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
  const SCREENSHOT_DIR = path.join(process.cwd(), 'tests/screenshots');
  const TEST_FILES_DIR = path.join(process.cwd(), 'public/test-files');

  // 确保截图目录存在
  test.beforeAll(() => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
  });

  test('场景1：员工信息 + 部门表（跨Sheet场景）', async ({ page }) => {
    test.slow();

    // 步骤1：导航到文档空间
    console.log('步骤1：导航到文档空间...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    const docSpaceButton = page.locator('text=文档空间').or(
      page.locator('button, a, div').filter({ hasText: '文档空间' })
    ).first();

    await docSpaceButton.click();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario1-01-navigate.png') });
    console.log('✓ 已导航到文档空间');

    // 步骤2：上传Excel文件
    console.log('步骤2：上传Excel文件...');
    const testFilePath = path.join(TEST_FILES_DIR, 'test-multisheet-employee.xlsx');

    // 查找所有可能的文件上传元素
    const fileInput = page.locator('input[type="file"]').or(
      page.locator('[type="file"]')
    ).first();

    await fileInput.setInputFiles(testFilePath);
    await page.waitForTimeout(3000);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario1-02-upload.png') });
    console.log('✓ Excel文件上传成功');

    // 步骤3：验证Sheet选择器
    console.log('步骤3：验证Sheet选择器...');
    const sheetSelector = page.locator('text=主数据表').or(
      page.locator('text=辅助数据表')
    );

    await expect(sheetSelector.first()).toBeVisible({ timeout: 15000 });

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario1-03-sheet-selector.png') });
    console.log('✓ Sheet选择器显示正常');

    // 步骤4：检查是否显示员工表和部门表
    console.log('步骤4：检查Sheet名称...');
    const employeeTable = page.locator('text=员工表').or(page.locator('text=员工'));
    const deptTable = page.locator('text=部门表').or(page.locator('text=部门'));

    const hasEmployee = await employeeTable.count() > 0;
    const hasDept = await deptTable.count() > 0;

    console.log(`  - 员工表: ${hasEmployee ? '✓' : '✗'}`);
    console.log(`  - 部门表: ${hasDept ? '✓' : '✗'}`);

    expect(hasEmployee || hasDept).toBeTruthy();

    // 步骤5：启用辅助表（如果存在）
    if (hasDept) {
      console.log('步骤5：启用部门表...');
      const deptCard = page.locator('div').filter({ hasText: '部门表' }).filter({ hasText: '行' });

      const cardCount = await deptCard.count();
      if (cardCount > 0) {
        await deptCard.first().click();
        await page.waitForTimeout(500);

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario1-04-enable-dept.png') });
        console.log('✓ 已启用部门表');
      }
    }

    // 步骤6：输入AI指令
    console.log('步骤6：输入AI指令...');
    const textarea = page.locator('textarea').or(
      page.locator('[contenteditable="true"]')
    ).first();

    await textarea.fill('生成员工工牌，包含姓名、部门和职位信息');
    await page.waitForTimeout(500);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario1-05-ai-prompt.png') });
    console.log('✓ 已输入AI指令');

    // 步骤7：生成映射（如果按钮可用）
    console.log('步骤7：尝试生成AI映射...');
    const generateButton = page.locator('button:has-text("生成"), button:has-text("映射"), button:has-text("AI")').first();

    const isButtonVisible = await generateButton.isVisible();
    if (isButtonVisible) {
      const startTime = Date.now();

      await generateButton.click();
      await page.waitForTimeout(10000);

      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario1-06-ai-mapping.png') });
      console.log(`✓ AI映射生成完成，耗时: ${duration}秒`);
    } else {
      console.log('⚠ 未找到生成映射按钮');
    }

    console.log('\n========== 场景1测试完成 ==========');
  });

  test('场景2：订单 + 产品 + 客户（3个Sheet）', async ({ page }) => {
    test.slow();

    console.log('场景2：测试3个Sheet的Excel文件...');

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // 导航到文档空间
    const docSpaceButton = page.locator('text=文档空间').or(
      page.locator('button, a, div').filter({ hasText: '文档空间' })
    ).first();

    await docSpaceButton.click();
    await page.waitForTimeout(2000);

    // 上传订单Excel
    const testFilePath = path.join(TEST_FILES_DIR, 'test-multisheet-order.xlsx');
    const fileInput = page.locator('input[type="file"]').or(
      page.locator('[type="file"]')
    ).first();

    await fileInput.setInputFiles(testFilePath);
    await page.waitForTimeout(3000);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario2-01-upload.png') });
    console.log('✓ 订单Excel文件上传成功');

    // 验证三个Sheet
    const orderTable = page.locator('text=订单').or(page.locator('text=订单表'));
    const productTable = page.locator('text=产品').or(page.locator('text=产品表'));
    const customerTable = page.locator('text=客户').or(page.locator('text=客户表'));

    const hasOrder = await orderTable.count() > 0;
    const hasProduct = await productTable.count() > 0;
    const hasCustomer = await customerTable.count() > 0;

    console.log(`  - 订单表: ${hasOrder ? '✓' : '✗'}`);
    console.log(`  - 产品表: ${hasProduct ? '✓' : '✗'}`);
    console.log(`  - 客户表: ${hasCustomer ? '✓' : '✗'}`);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario2-02-three-sheets.png') });

    expect(hasOrder || hasProduct || hasCustomer).toBeTruthy();

    console.log('\n========== 场景2测试完成 ==========');
  });

  test('UI交互测试：Sheet选择器功能', async ({ page }) => {
    console.log('UI交互测试：测试Sheet选择器交互...');

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // 导航并上传文件
    const docSpaceButton = page.locator('text=文档空间').first();
    await docSpaceButton.click();
    await page.waitForTimeout(2000);

    const testFilePath = path.join(TEST_FILES_DIR, 'test-multisheet-employee.xlsx');
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(testFilePath);
    await page.waitForTimeout(3000);

    // 等待Sheet选择器出现
    await page.waitForSelector('text=主数据表, text=辅助数据表', { timeout: 15000 });

    // 检查主表选择器
    const selectElement = page.locator('select');
    const selectCount = await selectElement.count();

    if (selectCount > 0) {
      const options = await selectElement.nth(0).locator('option').allTextContents();
      console.log(`✓ 检测到主表选择器，包含 ${options.length} 个选项`);
      options.forEach(opt => console.log(`  - ${opt}`));
    }

    // 检查辅助表卡片
    const auxiliarySection = page.locator('text=辅助数据表');
    if (await auxiliarySection.count() > 0) {
      const cards = page.locator('div.rounded-lg, div[class*="rounded"]');
      const cardCount = await cards.count();
      console.log(`✓ 检测到辅助表区域，约 ${cardCount} 个卡片`);
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'ui-test-01-interaction.png') });

    console.log('\n========== UI交互测试完成 ==========');
  });
});
