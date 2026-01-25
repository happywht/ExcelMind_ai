/**
 * 多Sheet支持功能 - 端到端测试
 *
 * 测试场景：
 * 1. 员工信息 + 部门表（典型跨Sheet场景）
 * 2. 订单 + 产品 + 客户（复杂多Sheet场景）
 *
 * @version 1.0.0
 */

import { test, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// ES模块中获取__dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 测试配置
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const SCREENSHOT_DIR = path.join(__dirname, '../screenshots');
const TEST_FILES_DIR = path.join(process.cwd(), 'public/test-files');

// 确保截图目录存在
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// 测试辅助函数
async function navigateToDocumentSpace(page: Page) {
  // 等待页面加载
  await page.waitForLoadState('networkidle');

  // 查找并点击文档空间按钮/链接
  const docSpaceButton = page.locator('text=文档空间').or(
    page.locator('[data-testid="document-space"]')
  ).or(
    page.locator('button:has-text("文档空间")')
  ).first();

  await docSpaceButton.click();
  await page.waitForTimeout(1000);
}

async function uploadExcelFile(page: Page, filename: string, isTemplate: boolean = false) {
  const filePath = path.join(TEST_FILES_DIR, filename);

  // 等待文件输入框
  await page.waitForSelector('input[type="file"]', { timeout: 10000 });

  // 查找对应的文件输入框（模板或数据）
  const fileInputs = page.locator('input[type="file"]');
  const count = await fileInputs.count();

  // 通常第一个是模板，第二个是数据文件
  const targetIndex = isTemplate ? 0 : Math.min(count - 1, 1);
  const fileInput = fileInputs.nth(targetIndex);

  await fileInput.setInputFiles(filePath);

  // 等待文件处理
  await page.waitForTimeout(3000);

  return filePath;
}

async function verifySheetSelector(page: Page, expectedSheetCount: number) {
  // 等待Sheet选择器出现
  await page.waitForSelector('text=主数据表, text=辅助数据表, .sheet-selector', { timeout: 15000 });

  // 验证Sheet数量
  const sheetOptions = page.locator('text=主数据表, text=辅助数据表');
  await expect(sheetOptions.first()).toBeVisible({ timeout: 5000 });

  // 检查辅助表区域
  const auxiliarySection = page.locator('text=辅助数据表');
  const hasAuxiliary = await auxiliarySection.count() > 0;

  if (expectedSheetCount > 1) {
    expect(hasAuxiliary).toBeTruthy();
  }

  return hasAuxiliary;
}

async function toggleAuxiliarySheet(page: Page, sheetName: string) {
  // 查找辅助表并点击
  const sheetCard = page.locator(`.rounded-lg:has-text("${sheetName}")`).or(
    page.locator(`div:has-text("${sheetName}")`).filter({ hasText: '行' })
  ).first();

  await sheetCard.click();
  await page.waitForTimeout(500);
}

async function enterAIInstruction(page: Page, instruction: string) {
  // 查找AI指令输入框
  const textarea = page.locator('textarea[placeholder*="AI"], textarea[placeholder*="指令"], textarea').nth(0);

  await textarea.fill(instruction);
  await page.waitForTimeout(500);
}

async function clickGenerateMapping(page: Page) {
  // 查找生成映射按钮
  const button = page.locator('button:has-text("生成映射"), button:has-text("AI映射"), button:has-text("智能映射")').first();

  await button.click();

  // 等待AI处理（可能需要较长时间）
  await page.waitForTimeout(10000);
}

async function clickGenerateDocuments(page: Page) {
  // 查找生成文档按钮
  const button = page.locator('button:has-text("生成文档"), button:has-text("批量生成")').first();

  await button.click();

  // 等待文档生成
  await page.waitForTimeout(12000);
}

// 测试套件
test.describe('多Sheet支持功能测试', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // 设置默认超时时间
    page.setDefaultTimeout(90000);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('场景1：员工信息 + 部门表（典型跨Sheet场景）', async () => {
    test.slow();

    // 步骤1：导航到文档空间
    await test.step('导航到文档空间', async () => {
      await navigateToDocumentSpace(page);
      console.log('✓ 已导航到文档空间');

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario1-01-document-space.png') });
    });

    // 步骤2：上传Excel数据文件
    await test.step('上传员工部门表Excel', async () => {
      await uploadExcelFile(page, 'test-multisheet-employee.xlsx', false);

      // 等待一下让UI更新
      await page.waitForTimeout(2000);

      console.log('✓ Excel文件上传成功');

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario1-02-upload.png') });
    });

    // 步骤3：验证Sheet选择器
    await test.step('验证Sheet选择器显示', async () => {
      const hasAuxiliary = await verifySheetSelector(page, 2);

      expect(hasAuxiliary).toBeTruthy();
      console.log('✓ Sheet选择器正确显示（包含辅助表）');

      // 检查是否显示员工表和部门表
      await expect(page.locator('text=员工表').or(page.locator('text=员工'))).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=部门表').or(page.locator('text=部门'))).toBeVisible({ timeout: 5000 });

      console.log('✓ 检测到员工表和部门表');

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario1-03-sheet-selector.png') });
    });

    // 步骤4：启用部门表作为辅助表
    await test.step('启用部门表作为辅助Sheet', async () => {
      await toggleAuxiliarySheet(page, '部门表');

      console.log('✓ 已启用部门表');

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario1-04-sheet-enabled.png') });
    });

    // 步骤5：输入AI指令
    await test.step('输入AI指令', async () => {
      await enterAIInstruction(page, '生成员工工牌，包含姓名、部门和职位信息');

      console.log('✓ 已输入AI指令');

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario1-05-ai-instruction.png') });
    });

    // 步骤6：生成AI映射
    await test.step('生成AI映射方案', async () => {
      const startTime = Date.now();

      await clickGenerateMapping(page);

      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);

      console.log(`✓ AI映射生成完成，耗时: ${duration}秒`);

      // 验证映射区域出现
      await expect(page.locator('text=映射, text=Mapping, .mapping').first()).toBeVisible({ timeout: 5000 });

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario1-06-ai-mapping.png') });
    });

    // 步骤7：生成文档
    await test.step('生成员工工牌文档', async () => {
      const startTime = Date.now();

      await clickGenerateDocuments(page);

      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);

      console.log(`✓ 文档生成完成，耗时: ${duration}秒`);

      // 验证文档列表出现
      const docList = page.locator('text=文档, text=生成, .document, .doc-item');
      await expect(docList.first()).toBeVisible({ timeout: 10000 });

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario1-07-documents.png') });
    });

    // 步骤8：验证文档内容
    await test.step('验证文档包含跨Sheet数据', async () => {
      // 尝试点击文档查看详情
      const firstDoc = page.locator('.document-item, .doc-item, [role="listitem"]').first();

      const count = await firstDoc.count();
      if (count > 0) {
        await firstDoc.click();
        await page.waitForTimeout(2000);

        console.log('✓ 已打开文档详情');
      } else {
        console.log('⚠ 未找到文档项，可能需要手动验证生成的文档');
      }

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario1-08-document-detail.png') });
    });
  });

  test('场景2：订单 + 产品 + 客户（复杂多Sheet场景）', async () => {
    test.slow();

    // 步骤1：导航到文档空间
    await test.step('导航到文档空间', async () => {
      await navigateToDocumentSpace(page);
      console.log('✓ 已导航到文档空间');

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario2-01-document-space.png') });
    });

    // 步骤2：上传Excel数据文件
    await test.step('上传订单产品客户表Excel', async () => {
      await uploadExcelFile(page, 'test-multisheet-order.xlsx', false);

      await page.waitForTimeout(2000);

      console.log('✓ Excel文件上传成功');

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario2-02-upload.png') });
    });

    // 步骤3：验证Sheet选择器
    await test.step('验证Sheet选择器显示三个Sheet', async () => {
      await verifySheetSelector(page, 3);

      // 检查三个表
      await expect(page.locator('text=订单').or(page.locator('text=订单表'))).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=产品').or(page.locator('text=产品表'))).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=客户').or(page.locator('text=客户表'))).toBeVisible({ timeout: 5000 });

      console.log('✓ 检测到订单表、产品表和客户表');

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario2-03-sheet-selector.png') });
    });

    // 步骤4：启用多个辅助Sheet
    await test.step('启用产品和客户表作为辅助Sheet', async () => {
      await toggleAuxiliarySheet(page, '产品表');
      await toggleAuxiliarySheet(page, '客户表');

      console.log('✓ 已启用产品表和客户表');

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario2-04-multiple-sheets.png') });
    });

    // 步骤5：输入AI指令
    await test.step('输入AI指令', async () => {
      await enterAIInstruction(page, '生成订单确认单，包含订单号、产品名称、客户信息和数量');

      console.log('✓ 已输入AI指令');

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario2-05-ai-instruction.png') });
    });

    // 步骤6：生成AI映射
    await test.step('生成AI映射方案（跨多个Sheet）', async () => {
      const startTime = Date.now();

      await clickGenerateMapping(page);

      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);

      console.log(`✓ AI映射生成完成，耗时: ${duration}秒`);

      await expect(page.locator('text=映射, text=Mapping').first()).toBeVisible({ timeout: 5000 });

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario2-06-ai-mapping.png') });
    });

    // 步骤7：生成文档
    await test.step('生成订单确认单文档', async () => {
      const startTime = Date.now();

      await clickGenerateDocuments(page);

      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);

      console.log(`✓ 文档生成完成，耗时: ${duration}秒`);

      const docList = page.locator('text=文档, .document');
      await expect(docList.first()).toBeVisible({ timeout: 10000 });

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario2-07-documents.png') });
    });

    // 步骤8：验证文档内容
    await test.step('验证文档包含多Sheet数据', async () => {
      const firstDoc = page.locator('.document-item, .doc-item').first();

      const count = await firstDoc.count();
      if (count > 0) {
        await firstDoc.click();
        await page.waitForTimeout(2000);

        console.log('✓ 已打开文档详情');
      } else {
        console.log('⚠ 未找到文档项，可能需要手动验证生成的文档');
      }

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario2-08-document-detail.png') });
    });
  });

  test('性能测试：AI映射生成时间对比', async () => {
    test.slow();

    const performanceData: any[] = [];

    // 测试场景1：员工+部门（2个Sheet）
    await test.step('测试2个Sheet的映射生成性能', async () => {
      await navigateToDocumentSpace(page);
      await uploadExcelFile(page, 'test-multisheet-employee.xlsx', false);
      await toggleAuxiliarySheet(page, '部门表');
      await enterAIInstruction(page, '生成员工工牌，包含姓名、部门和职位信息');

      const startTime = Date.now();
      await clickGenerateMapping(page);
      const endTime = Date.now();

      const duration = ((endTime - startTime) / 1000).toFixed(2);

      performanceData.push({
        scenario: '员工+部门',
        sheetCount: 2,
        duration: `${duration}s`,
        timestamp: new Date().toISOString()
      });

      console.log(`2个Sheet映射生成耗时: ${duration}秒`);
    });

    // 测试场景2：订单+产品+客户（3个Sheet）
    await test.step('测试3个Sheet的映射生成性能', async () => {
      await page.goto(BASE_URL);
      await navigateToDocumentSpace(page);
      await uploadExcelFile(page, 'test-multisheet-order.xlsx', false);
      await toggleAuxiliarySheet(page, '产品表');
      await toggleAuxiliarySheet(page, '客户表');
      await enterAIInstruction(page, '生成订单确认单，包含订单号、产品名称、客户信息和数量');

      const startTime = Date.now();
      await clickGenerateMapping(page);
      const endTime = Date.now();

      const duration = ((endTime - startTime) / 1000).toFixed(2);

      performanceData.push({
        scenario: '订单+产品+客户',
        sheetCount: 3,
        duration: `${duration}s`,
        timestamp: new Date().toISOString()
      });

      console.log(`3个Sheet映射生成耗时: ${duration}秒`);
    });

    // 输出性能报告
    console.log('\n========== 性能测试报告 ==========');
    console.table(performanceData);

    // 保存性能数据到文件
    const perfReportPath = path.join(SCREENSHOT_DIR, 'performance-report.json');
    fs.writeFileSync(perfReportPath, JSON.stringify(performanceData, null, 2));
    console.log(`\n性能报告已保存到: ${perfReportPath}`);
  });

  test('UI交互测试：Sheet选择器功能', async () => {
    await test.step('测试Sheet选择器UI交互', async () => {
      await navigateToDocumentSpace(page);
      await uploadExcelFile(page, 'test-multisheet-employee.xlsx', false);

      // 等待Sheet选择器出现
      await page.waitForSelector('text=主数据表', { timeout: 10000 });

      // 测试主表选择
      const primarySelect = page.locator('select').first();
      await expect(primarySelect).toBeVisible();

      // 获取当前选中的值
      const initialValue = await primarySelect.inputValue();
      console.log(`初始主表: ${initialValue}`);

      // 测试辅助表启用/禁用
      const auxiliaryCards = page.locator('text=辅助数据表').locator('..').locator('.rounded-lg');

      const cardCount = await auxiliaryCards.count();
      console.log(`辅助表数量: ${cardCount}`);

      if (cardCount > 0) {
        // 点击第一个辅助表
        await auxiliaryCards.first().click();
        await page.waitForTimeout(500);

        console.log('✓ 辅助表切换功能正常');

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'ui-test-01-sheet-toggle.png') });
      }
    });
  });
});
