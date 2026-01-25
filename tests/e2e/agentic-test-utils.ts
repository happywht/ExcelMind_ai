/**
 * OTAE 系统测试辅助工具
 *
 * 提供测试中常用的辅助函数和工具方法
 *
 * @author Automation Engineer
 * @version 1.0.0
 */

import { Page, Locator } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 测试数据接口
 */
export interface TestData {
  command: string;
  description: string;
  expectedQuality: number;
  expectedDuration?: number;
}

/**
 * 测试结果接口
 */
export interface TestResult {
  success: boolean;
  duration: number;
  qualityScore?: number;
  otaePhases?: string[];
  errorDetected?: boolean;
  repairAttempted?: boolean;
  screenshots: string[];
}

/**
 * OTAE 系统测试辅助类
 */
export class AgenticTestHelper {
  private page: Page;
  private baseURL: string;
  private screenshotDir: string;
  private testResults: Map<string, TestResult> = new Map();

  constructor(page: Page, baseURL: string, screenshotDir: string) {
    this.page = page;
    this.baseURL = baseURL;
    this.screenshotDir = screenshotDir;

    // 确保截图目录存在
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }
  }

  /**
   * 导航到智能处理界面
   */
  async navigateToSmartOps(): Promise<void> {
    await this.page.goto(this.baseURL);
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(2000);

    const smartOpsButton = this.page.locator('text=智能处理').or(
      this.page.locator('div').filter({ hasText: '智能处理' })
    ).first();

    await smartOpsButton.click();
    await this.page.waitForTimeout(2000);
  }

  /**
   * 上传测试文件
   */
  async uploadTestFile(filePath: string): Promise<void> {
    const fileInput = this.page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(filePath);
    await this.page.waitForTimeout(3000);
  }

  /**
   * 切换到智能模式
   */
  async enableSmartMode(): Promise<void> {
    const smartModeButton = this.page.locator('button:has-text("智能模式")').or(
      this.page.locator('button').filter({ hasText: /智能|快速/ })
    ).first();

    const isSmartMode = await this.page.locator('button:has-text("智能模式")').count() > 0;
    if (!isSmartMode) {
      await smartModeButton.click();
      await this.page.waitForTimeout(1000);
    }
  }

  /**
   * 切换到快速模式
   */
  async enableFastMode(): Promise<void> {
    const modeToggle = this.page.locator('button').filter({ hasText: /智能|快速/ }).first();
    await modeToggle.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * 输入命令
   */
  async enterCommand(command: string): Promise<void> {
    const commandInput = this.page.locator('textarea[placeholder*="描述"], textarea').first();
    await commandInput.fill(command);
  }

  /**
   * 执行任务
   */
  async executeTask(): Promise<void> {
    const executeButton = this.page.locator('button:has-text("执行智能处理")').or(
      this.page.locator('button').filter({ hasText: '执行' })
    ).first();

    await executeButton.click();
    await this.page.waitForTimeout(2000);
  }

  /**
   * 监控 OTAE 循环进度
   */
  async monitorOTAEProgress(timeout: number = 120000): Promise<TestResult> {
    const startTime = Date.now();
    const result: TestResult = {
      success: false,
      duration: 0,
      screenshots: [],
      otaePhases: []
    };

    const otaePhases = ['观察', '思考', '执行', '评估'];
    const completedPhases: string[] = [];

    while (Date.now() - startTime < timeout) {
      await this.page.waitForTimeout(2000);

      const pageText = await this.page.textContent('body');

      // 记录完成的阶段
      for (const phase of otaePhases) {
        if (pageText.includes(phase) && !completedPhases.includes(phase)) {
          completedPhases.push(phase);

          // 截图每个阶段
          const screenshotPath = path.join(
            this.screenshotDir,
            `otae-phase-${phase}-${Date.now()}.png`
          );
          await this.page.screenshot({ path: screenshotPath });
          result.screenshots.push(screenshotPath);
        }
      }

      // 检查是否完成
      if (pageText.includes('已完成') || pageText.includes('执行完成')) {
        result.success = true;
        break;
      }

      // 检查是否有错误
      if (pageText.includes('失败') || pageText.includes('错误')) {
        result.errorDetected = true;

        // 检查是否在修复
        if (pageText.includes('修复')) {
          result.repairAttempted = true;
        }
      }
    }

    result.duration = Date.now() - startTime;
    result.otaePhases = completedPhases;

    // 提取质量评分
    const pageText = await this.page.textContent('body');
    const qualityMatch = pageText?.match(/质量[评分:]\s*(\d+%?)/);
    if (qualityMatch) {
      const qualityStr = qualityMatch[1].replace('%', '');
      result.qualityScore = parseFloat(qualityStr) / 100;
    }

    return result;
  }

  /**
   * 截图并保存
   */
  async screenshot(name: string): Promise<string> {
    const screenshotPath = path.join(this.screenshotDir, `${name}-${Date.now()}.png`);
    await this.page.screenshot({ path: screenshotPath, fullPage: true });
    return screenshotPath;
  }

  /**
   * 等待任务完成
   */
  async waitForCompletion(timeout: number = 120000): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      await this.page.waitForTimeout(2000);

      const pageText = await this.page.textContent('body');

      if (pageText?.includes('已完成') || pageText?.includes('执行完成')) {
        return true;
      }

      if (pageText?.includes('失败') || pageText?.includes('错误')) {
        return false;
      }
    }

    return false;
  }

  /**
   * 获取质量指标
   */
  async getQualityMetrics(): Promise<{
    completeness?: string;
    accuracy?: string;
    consistency?: string;
    overall?: string;
  }> {
    const pageText = await this.page.textContent('body');
    const metrics: any = {};

    const completenessMatch = pageText?.match(/完整性[：:]\s*(\d+%?)/);
    const accuracyMatch = pageText?.match(/准确性[：:]\s*(\d+%?)/);
    const consistencyMatch = pageText?.match(/一致性[：:]\s*(\d+%?)/);
    const overallMatch = pageText?.match(/总质量[：:]\s*(\d+%?)/);

    if (completenessMatch) metrics.completeness = completenessMatch[1];
    if (accuracyMatch) metrics.accuracy = accuracyMatch[1];
    if (consistencyMatch) metrics.consistency = consistencyMatch[1];
    if (overallMatch) metrics.overall = overallMatch[1];

    return metrics;
  }

  /**
   * 保存测试结果
   */
  saveResult(testName: string, result: TestResult): void {
    this.testResults.set(testName, result);
  }

  /**
   * 生成测试报告
   */
  generateReport(): string {
    const timestamp = new Date().toISOString();
    let report = `
OTAE 系统测试报告
生成时间: ${timestamp}
测试环境: ${this.baseURL}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
测试结果汇总
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;

    this.testResults.forEach((result, testName) => {
      report += `
【${testName}】
  状态: ${result.success ? '✅ 成功' : '❌ 失败'}
  耗时: ${result.duration}ms
  质量评分: ${result.qualityScore ? `${(result.qualityScore * 100).toFixed(1)}%` : 'N/A'}
  OTAE 阶段: ${result.otaePhases?.join(', ') || 'N/A'}
  错误检测: ${result.errorDetected ? '是' : '否'}
  修复尝试: ${result.repairAttempted ? '是' : '否'}

`;
    });

    return report;
  }

  /**
   * 清理测试数据
   */
  cleanup(): void {
    this.testResults.clear();
  }
}

/**
 * 文件工具函数
 */
export class FileUtils {
  /**
   * 确保目录存在
   */
  static ensureDir(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * 检查文件是否存在
   */
  static exists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  /**
   * 获取文件大小
   */
  static getSize(filePath: string): number {
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      return stats.size;
    }
    return 0;
  }

  /**
   * 保存文本到文件
   */
  static saveText(filePath: string, content: string): void {
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  /**
   * 读取文本文件
   */
  static readText(filePath: string): string {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
    return '';
  }
}

/**
 * 日志工具函数
 */
export class Logger {
  private static colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
  };

  static log(message: string, color: keyof typeof Logger.colors = 'reset'): void {
    console.log(`${Logger.colors[color]}${message}${Logger.colors.reset}`);
  }

  static success(message: string): void {
    this.log(`✅ ${message}`, 'green');
  }

  static error(message: string): void {
    this.log(`❌ ${message}`, 'red');
  }

  static warning(message: string): void {
    this.log(`⚠️ ${message}`, 'yellow');
  }

  static info(message: string): void {
    this.log(`ℹ️ ${message}`, 'blue');
  }

  static step(message: string): void {
    this.log(`🔸 ${message}`, 'cyan');
  }

  static header(message: string): void {
    console.log(`\n${Logger.colors.bright}${Logger.colors.cyan}${'='.repeat(60)}`);
    console.log(message);
    console.log(`${'='.repeat(60)}${Logger.colors.reset}\n`);
  }
}

/**
 * 断言工具函数
 */
export class Assertions {
  /**
   * 断言质量评分
   */
  static assertQuality(actual: number, expected: number, threshold: number = 0.1): void {
    const diff = Math.abs(actual - expected);
    if (diff > threshold) {
      throw new Error(
        `质量评分不匹配: 实际=${(actual * 100).toFixed(1)}%, ` +
        `期望=${(expected * 100).toFixed(1)}%, 差异=${(diff * 100).toFixed(1)}%`
      );
    }
  }

  /**
   * 断言 OTAE 阶段完整性
   */
  static assertOTAECompleteness(phases: string[]): void {
    const requiredPhases = ['观察', '思考', '执行', '评估'];
    const missingPhases = requiredPhases.filter(phase => !phases.includes(phase));

    if (missingPhases.length > 0) {
      throw new Error(`OTAE 循环不完整，缺少阶段: ${missingPhases.join(', ')}`);
    }
  }

  /**
   * 断言执行时间
   */
  static assertDuration(actual: number, max: number): void {
    if (actual > max) {
      throw new Error(
        `执行时间过长: 实际=${actual}ms, 最大允许=${max}ms`
      );
    }
  }
}
