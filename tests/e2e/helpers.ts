/**
 * E2E 测试辅助函数库
 *
 * 提供可重用的测试辅助函数，减少代码重复，提高测试维护性
 *
 * @module tests/e2e/helpers
 * @version 1.0.0
 */

import { Page, Locator, BrowserContext, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

/**
 * 测试配置
 */
export const TEST_CONFIG = {
  baseURL: process.env.BASE_URL || 'http://localhost:3000',
  testFilesDir: path.join(process.cwd(), 'public/test-files'),
  screenshotsDir: path.join(process.cwd(), 'tests/screenshots'),
  timeouts: {
    navigation: 30000,
    elementLoad: 10000,
    taskExecution: 120000,
    phaseTransition: 30000,
  },
};

/**
 * 测试文件路径映射
 */
export const TEST_FILES = {
  simple: path.join(TEST_CONFIG.testFilesDir, 'test-simple.xlsx'),
  complex: path.join(TEST_CONFIG.testFilesDir, 'test-complex.xlsx'),
  edge: path.join(TEST_CONFIG.testFilesDir, 'test-edge.xlsx'),
  audit: path.join(TEST_CONFIG.testFilesDir, 'test-audit.xlsx'),
  aggregation: path.join(TEST_CONFIG.testFilesDir, 'test-aggregation.xlsx'),
  multisheetEmployee: path.join(TEST_CONFIG.testFilesDir, 'test-multisheet-employee.xlsx'),
  multisheetOrder: path.join(TEST_CONFIG.testFilesDir, 'test-multisheet-order.xlsx'),
};

/**
 * 数据测试标识符
 */
export const DATA_TEST_IDS = {
  appContainer: 'data-testid="app-container"',
  fileCard: 'data-testid="file-card"',
  fileBrowser: 'data-testid="file-browser"',
  executionProgress: 'data-testid="execution-progress"',
  progressBar: 'data-testid="progress-bar"',
  progressPercentage: 'data-testid="progress-percentage"',
  logViewer: 'data-testid="log-viewer"',
  logEntry: 'data-testid="log-entry"',
  relationshipGraph: 'data-testid="relationship-graph"',
  graphNode: 'data-testid="graph-node"',
  graphEdge: 'data-testid="graph-edge"',
  degradationWarning: 'data-testid="degradation-warning"',
  degradationNotice: 'data-testid="degradation-notice"',
  executionMode: 'data-testid="execution-mode"',
  sessionList: 'data-testid="session-list"',
  sessionItem: 'data-testid="session-item"',
};

/**
 * 等待应用完全加载
 */
export async function waitForAppLoad(page: Page): Promise<void> {
  await page.goto(TEST_CONFIG.baseURL);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000); // 额外等待确保React组件挂载

  // 等待关键元素出现
  await page.waitForSelector('body', { timeout: TEST_CONFIG.timeouts.navigation });
}

/**
 * 导航到智能处理界面
 */
export async function navigateToSmartOps(page: Page): Promise<void> {
  const smartOpsButton = page.locator('text=智能处理').or(
    page.locator('div').filter({ hasText: '智能处理' })
  ).first();

  await expect(smartOpsButton).toBeVisible();
  await smartOpsButton.click();
  await page.waitForTimeout(1500); // 等待页面切换完成
}

/**
 * 上传单个文件
 */
export async function uploadFile(page: Page, filePath: string): Promise<void> {
  // 验证文件存在
  if (!fs.existsSync(filePath)) {
    throw new Error(`测试文件不存在: ${filePath}`);
  }

  // 查找文件输入框
  const fileInput = page.locator('input[type="file"]').first();
  const count = await fileInput.count();
  if (count !== 1) {
    throw new Error(`文件输入框数量不正确，期望1个，实际${count}个`);
  }

  // 上传文件
  await fileInput.setInputFiles(filePath);

  // 等待文件处理完成
  await page.waitForTimeout(2500);

  // 验证文件上传成功
  const fileName = path.basename(filePath);
  const fileInList = page.locator(`text=${fileName}`).or(
    page.locator('li').filter({ hasText: new RegExp(fileName.replace(/\./g, '\\.')) })
  );

  await expect(fileInList.first()).toBeVisible({ timeout: 5000 });
}

/**
 * 上传多个文件
 */
export async function uploadMultipleFiles(page: Page, filePaths: string[]): Promise<void> {
  for (const filePath of filePaths) {
    await uploadFile(page, filePath);
  }
}

/**
 * 获取文件卡片元素
 */
export async function getFileCard(page: Page, fileName: string): Promise<Locator> {
  return page.locator('[data-testid="file-card"]').filter({ hasText: new RegExp(fileName.replace(/\./g, '\\.')) });
}

/**
 * 点击文件卡片
 */
export async function clickFileCard(page: Page, fileName: string): Promise<void> {
  const fileCard = await getFileCard(page, fileName);
  await fileCard.click();
}

/**
 * 右键点击文件卡片
 */
export async function rightClickFileCard(page: Page, fileName: string): Promise<void> {
  const fileCard = await getFileCard(page, fileName);
  await fileCard.click({ button: 'right' });
}

/**
 * 等待文件上传完成
 */
export async function waitForFileUpload(page: Page, fileName: string): Promise<void> {
  const fileCard = await getFileCard(page, fileName);
  await expect(fileCard).toBeVisible({ timeout: 10000 });
}

/**
 * 输入命令并执行
 */
export async function executeCommand(page: Page, command: string): Promise<void> {
  // 查找命令输入框
  const commandInput = page.locator('textarea[placeholder*="描述"], textarea').first();
  await expect(commandInput).toBeVisible();

  // 输入命令
  await commandInput.fill(command);
  await page.waitForTimeout(500);

  // 查找并点击执行按钮
  const executeButton = page.locator('button:has-text("执行智能处理")').or(
    page.locator('button').filter({ hasText: '执行' })
  ).first();

  await expect(executeButton).toBeVisible();
  await executeButton.click();
  await page.waitForTimeout(1000);
}

/**
 * 切换执行模式（智能模式/快速模式）
 */
export async function switchExecutionMode(page: Page, mode: 'smart' | 'fast'): Promise<void> {
  const modeToggle = page.locator('button').filter({ hasText: /智能|快速/ }).first();
  await modeToggle.click();
  await page.waitForTimeout(1000);

  const currentMode = await page.locator('button:has-text("智能模式")').count() > 0 ? 'smart' : 'fast';

  if (currentMode !== mode) {
    await modeToggle.click();
    await page.waitForTimeout(1000);
  }
}

/**
 * 等待任务执行完成
 */
export async function waitForTaskCompletion(
  page: Page,
  options: {
    timeout?: number;
    checkInterval?: number;
    onError?: 'throw' | 'continue';
  } = {}
): Promise<{ completed: boolean; duration: number; hasErrors: boolean }> {
  const {
    timeout = 120000,
    checkInterval = 2000,
    onError = 'throw'
  } = options;

  const startTime = Date.now();
  let hasErrors = false;

  while (Date.now() - startTime < timeout) {
    await page.waitForTimeout(checkInterval);

    const pageText = await page.textContent('body');

    // 检查是否完成
    if (pageText?.includes('已完成') || pageText?.includes('执行完成')) {
      return {
        completed: true,
        duration: Date.now() - startTime,
        hasErrors,
      };
    }

    // 检查是否有错误
    if (pageText?.includes('失败') || pageText?.includes('错误')) {
      hasErrors = true;

      if (onError === 'throw') {
        throw new Error('任务执行失败');
      }
    }
  }

  return {
    completed: false,
    duration: Date.now() - startTime,
    hasErrors,
  };
}

/**
 * 获取执行进度
 */
export async function getExecutionProgress(page: Page): Promise<number> {
  const progressElement = page.locator('[data-testid="progress-percentage"]');
  if (await progressElement.count() > 0) {
    const progressText = await progressElement.textContent() || '0';
    return parseInt(progressText.replace('%', '')) || 0;
  }
  return 0;
}

/**
 * 获取质量评分
 */
export async function getQualityMetrics(page: Page): Promise<{
  completeness?: string;
  accuracy?: string;
  consistency?: string;
  overall?: string;
}> {
  const pageText = await page.textContent('body') || '';

  const completenessMatch = pageText.match(/完整性[：:]\s*(\d+%?)/);
  const accuracyMatch = pageText.match(/准确性[：:]\s*(\d+%?)/);
  const consistencyMatch = pageText.match(/一致性[：:]\s*(\d+%?)/);
  const overallMatch = pageText.match(/总质量[：:]\s*(\d+%?)/);

  return {
    completeness: completenessMatch?.[1],
    accuracy: accuracyMatch?.[1],
    consistency: consistencyMatch?.[1],
    overall: overallMatch?.[1],
  };
}

/**
 * 截图保存
 */
export async function saveScreenshot(
  page: Page,
  testName: string,
  fileName: string,
  options: { fullPage?: boolean } = {}
): Promise<void> {
  const screenshotDir = path.join(TEST_CONFIG.screenshotsDir, testName);
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const screenshotPath = path.join(screenshotDir, fileName);
  await page.screenshot({
    path: screenshotPath,
    fullPage: options.fullPage || false,
  });
}

/**
 * 清理测试环境
 */
export async function cleanupTestData(page: Page): Promise<void> {
  // TODO: 实现测试数据清理逻辑
  // - 删除上传的文件
  // - 清空会话状态
  // - 重置应用状态
}

/**
 * 模拟内存压力
 */
export async function simulateMemoryPressure(page: Page, usage: number = 95): Promise<void> {
  await page.evaluate((pressure) => {
    window.dispatchEvent(new CustomEvent('memory-pressure', {
      detail: { usage: pressure }
    }));
  }, usage);
}

/**
 * 释放内存压力
 */
export async function releaseMemoryPressure(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('memory-release'));
  });
}

/**
 * 创建新的浏览器标签页
 */
export async function createNewTab(context: BrowserContext): Promise<Page> {
  const page = await context.newPage();
  await page.goto(TEST_CONFIG.baseURL);
  await page.waitForLoadState('domcontentloaded');
  return page;
}

/**
 * 等待跨标签页同步
 */
export async function waitForCrossTabSync(
  sourcePage: Page,
  targetPage: Page,
  expectedText: string,
  timeout: number = 5000
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const targetText = await targetPage.textContent('body');
    if (targetText?.includes(expectedText)) {
      return true;
    }
    await sourcePage.waitForTimeout(200);
  }

  return false;
}

/**
 * 读取测试文件信息
 */
export function getTestFileInfo(filePath: string): {
  exists: boolean;
  size: number;
  sizeKB: number;
  name: string;
} {
  const exists = fs.existsSync(filePath);
  const stats = exists ? fs.statSync(filePath) : null;
  return {
    exists,
    size: stats?.size || 0,
    sizeKB: stats ? Math.round(stats.size / 1024 * 100) / 100 : 0,
    name: path.basename(filePath),
  };
}

/**
 * 生成测试报告
 */
export function generateTestReport(
  testName: string,
  results: Array<{
    scenario: string;
    passed: boolean;
    duration: number;
    error?: string;
  }>
): string {
  const timestamp = new Date().toISOString();
  const totalTests = results.length;
  const passedTests = results.filter(r => r.passed).length;
  const successRate = (passedTests / totalTests * 100).toFixed(1);
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  return `
═══════════════════════════════════════════════════════════════
${testName} - E2E 测试报告
═══════════════════════════════════════════════════════════════

报告生成时间: ${timestamp}
测试环境: ${TEST_CONFIG.baseURL}

───────────────────────────────────────────────────────────────
测试概览
───────────────────────────────────────────────────────────────

总测试数: ${totalTests}
通过数: ${passedTests}
失败数: ${totalTests - passedTests}
成功率: ${successRate}%
总耗时: ${totalDuration}ms

───────────────────────────────────────────────────────────────
详细结果
───────────────────────────────────────────────────────────────

${results.map(r => `
【${r.passed ? '✅' : '❌'}】${r.scenario}
  耗时: ${r.duration}ms
  ${r.error ? `错误: ${r.error}` : ''}
`).join('\n')}

═══════════════════════════════════════════════════════════════
报告结束
═══════════════════════════════════════════════════════════════
`;
}

/**
 * 保存测试报告
 */
export function saveTestReport(testName: string, report: string): void {
  const reportDir = path.join(TEST_CONFIG.screenshotsDir, testName);
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const reportPath = path.join(reportDir, 'test-report.txt');
  fs.writeFileSync(reportPath, report, 'utf-8');
}
