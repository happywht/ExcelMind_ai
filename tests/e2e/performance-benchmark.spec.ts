/**
 * OTAE 系统性能基准测试
 *
 * 用于建立性能基线并跟踪性能变化
 *
 * @author Automation Engineer
 * @version 1.0.0
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

// 性能基准配置
const BENCHMARK_CONFIG = {
  baseURL: process.env.BASE_URL || 'http://localhost:3000',
  testFilesDir: path.join(process.cwd(), 'public/test-files'),
  resultsDir: 'tests/test-results/performance-benchmark/',
  iterations: 3 // 每个测试运行 3 次以获取平均值
};

// 性能基准（目标值）
const PERFORMANCE_BASELINES = {
  simpleTask: {
    smartMode: { min: 20000, max: 45000, avg: 35000 },   // 毫秒
    fastMode: { min: 10000, max: 25000, avg: 18000 }
  },
  complexTask: {
    smartMode: { min: 30000, max: 60000, avg: 45000 },
    fastMode: { min: 15000, max: 35000, avg: 25000 }
  },
  multiStepTask: {
    smartMode: { min: 45000, max: 90000, avg: 65000 },
    fastMode: null // 快速模式不支持复杂多步骤
  }
};

// 质量基准
const QUALITY_BASELINES = {
  simpleTask: { smartMode: 0.90, fastMode: 0.85 },
  complexTask: { smartMode: 0.85, fastMode: 0.80 },
  multiStepTask: { smartMode: 0.85, fastMode: null }
};

/**
 * 性能测试套件
 */
test.describe('OTAE 系统性能基准测试', () => {
  let benchmarkResults: any[] = [];

  test.beforeAll(async () => {
    // 确保结果目录存在
    if (!fs.existsSync(BENCHMARK_CONFIG.resultsDir)) {
      fs.mkdirSync(BENCHMARK_CONFIG.resultsDir, { recursive: true });
    }
  });

  /**
   * 测试 1: 简单任务性能 - 智能模式
   */
  test('简单任务 - 智能模式性能基准', async ({ page }) => {
    const taskName = '简单任务 - 智能模式';
    const results = [];

    console.log(`\n🚀 开始性能测试: ${taskName}`);

    for (let i = 0; i < BENCHMARK_CONFIG.iterations; i++) {
      console.log(`\n📊 第 ${i + 1} 次迭代...`);

      const result = await runPerformanceTest(page, {
        file: 'test-simple.xlsx',
        command: '计算总销售额',
        mode: 'smart'
      });

      results.push(result);
      console.log(`✅ 耗时: ${result.duration}ms, 质量: ${result.qualityScore}`);
    }

    // 计算平均值
    const avgResult = calculateAverage(results);
    const baseline = PERFORMANCE_BASELINES.simpleTask.smartMode;

    console.log(`\n📊 ${taskName} - 平均结果:`);
    console.log(`   平均耗时: ${avgResult.duration}ms`);
    console.log(`   平均质量: ${(avgResult.qualityScore * 100).toFixed(1)}%`);
    console.log(`   基准耗时: ${baseline.avg}ms`);

    // 验证性能
    expect(avgResult.duration).toBeGreaterThanOrEqual(baseline.min);
    expect(avgResult.duration).toBeLessThanOrEqual(baseline.max);
    expect(avgResult.qualityScore).toBeGreaterThanOrEqual(QUALITY_BASELINES.simpleTask.smartMode);

    benchmarkResults.push({
      task: taskName,
      mode: 'smart',
      ...avgResult,
      baseline
    });

    // 保存截图
    await page.screenshot({
      path: path.join(BENCHMARK_CONFIG.resultsDir, 'simple-task-smart-mode.png')
    });
  });

  /**
   * 测试 2: 简单任务性能 - 快速模式
   */
  test('简单任务 - 快速模式性能基准', async ({ page }) => {
    const taskName = '简单任务 - 快速模式';
    const results = [];

    console.log(`\n🚀 开始性能测试: ${taskName}`);

    for (let i = 0; i < BENCHMARK_CONFIG.iterations; i++) {
      console.log(`\n📊 第 ${i + 1} 次迭代...`);

      const result = await runPerformanceTest(page, {
        file: 'test-simple.xlsx',
        command: '计算总销售额',
        mode: 'fast'
      });

      results.push(result);
      console.log(`✅ 耗时: ${result.duration}ms, 质量: ${result.qualityScore}`);
    }

    // 计算平均值
    const avgResult = calculateAverage(results);
    const baseline = PERFORMANCE_BASELINES.simpleTask.fastMode;

    console.log(`\n📊 ${taskName} - 平均结果:`);
    console.log(`   平均耗时: ${avgResult.duration}ms`);
    console.log(`   平均质量: ${(avgResult.qualityScore * 100).toFixed(1)}%`);
    console.log(`   基准耗时: ${baseline.avg}ms`);

    // 验证性能
    expect(avgResult.duration).toBeGreaterThanOrEqual(baseline.min);
    expect(avgResult.duration).toBeLessThanOrEqual(baseline.max);
    expect(avgResult.qualityScore).toBeGreaterThanOrEqual(QUALITY_BASELINES.simpleTask.fastMode);

    // 验证性能提升
    const speedup = calculateSpeedup(
      PERFORMANCE_BASELINES.simpleTask.smartMode.avg,
      avgResult.duration
    );
    console.log(`   性能提升: ${speedup.toFixed(1)}%`);
    expect(speedup).toBeGreaterThan(30); // 至少快 30%

    benchmarkResults.push({
      task: taskName,
      mode: 'fast',
      ...avgResult,
      baseline
    });

    // 保存截图
    await page.screenshot({
      path: path.join(BENCHMARK_CONFIG.resultsDir, 'simple-task-fast-mode.png')
    });
  });

  /**
   * 测试 3: 复杂任务性能 - 智能模式
   */
  test('复杂任务 - 智能模式性能基准', async ({ page }) => {
    const taskName = '复杂任务 - 智能模式';
    const results = [];

    console.log(`\n🚀 开始性能测试: ${taskName}`);

    for (let i = 0; i < BENCHMARK_CONFIG.iterations; i++) {
      console.log(`\n📊 第 ${i + 1} 次迭代...`);

      const result = await runPerformanceTest(page, {
        file: 'test-complex.xlsx',
        command: '计算每个部门的平均工资',
        mode: 'smart'
      });

      results.push(result);
      console.log(`✅ 耗时: ${result.duration}ms, 质量: ${result.qualityScore}`);
    }

    // 计算平均值
    const avgResult = calculateAverage(results);
    const baseline = PERFORMANCE_BASELINES.complexTask.smartMode;

    console.log(`\n📊 ${taskName} - 平均结果:`);
    console.log(`   平均耗时: ${avgResult.duration}ms`);
    console.log(`   平均质量: ${(avgResult.qualityScore * 100).toFixed(1)}%`);
    console.log(`   基准耗时: ${baseline.avg}ms`);

    // 验证性能
    expect(avgResult.duration).toBeGreaterThanOrEqual(baseline.min);
    expect(avgResult.duration).toBeLessThanOrEqual(baseline.max);
    expect(avgResult.qualityScore).toBeGreaterThanOrEqual(QUALITY_BASELINES.complexTask.smartMode);

    benchmarkResults.push({
      task: taskName,
      mode: 'smart',
      ...avgResult,
      baseline
    });

    // 保存截图
    await page.screenshot({
      path: path.join(BENCHMARK_CONFIG.resultsDir, 'complex-task-smart-mode.png')
    });
  });

  /**
   * 测试 4: 多步骤任务性能 - 智能模式
   */
  test('多步骤任务 - 智能模式性能基准', async ({ page }) => {
    const taskName = '多步骤任务 - 智能模式';
    const results = [];

    console.log(`\n🚀 开始性能测试: ${taskName}`);

    for (let i = 0; i < BENCHMARK_CONFIG.iterations; i++) {
      console.log(`\n📊 第 ${i + 1} 次迭代...`);

      const result = await runPerformanceTest(page, {
        file: 'test-aggregation.xlsx',
        command: '按地区分组，计算每个地区的总销售额和平均订单金额，并按总销售额降序排列',
        mode: 'smart',
        timeout: 150000 // 多步骤任务需要更长时间
      });

      results.push(result);
      console.log(`✅ 耗时: ${result.duration}ms, 质量: ${result.qualityScore}`);
    }

    // 计算平均值
    const avgResult = calculateAverage(results);
    const baseline = PERFORMANCE_BASELINES.multiStepTask.smartMode;

    console.log(`\n📊 ${taskName} - 平均结果:`);
    console.log(`   平均耗时: ${avgResult.duration}ms`);
    console.log(`   平均质量: ${(avgResult.qualityScore * 100).toFixed(1)}%`);
    console.log(`   基准耗时: ${baseline.avg}ms`);

    // 验证性能
    expect(avgResult.duration).toBeGreaterThanOrEqual(baseline.min);
    expect(avgResult.duration).toBeLessThanOrEqual(baseline.max);
    expect(avgResult.qualityScore).toBeGreaterThanOrEqual(QUALITY_BASELINES.multiStepTask.smartMode);

    benchmarkResults.push({
      task: taskName,
      mode: 'smart',
      ...avgResult,
      baseline
    });

    // 保存截图
    await page.screenshot({
      path: path.join(BENCHMARK_CONFIG.resultsDir, 'multistep-task-smart-mode.png')
    });
  });

  /**
   * 生成性能基准报告
   */
  test.afterAll(async () => {
    console.log('\n📊 生成性能基准报告...');

    const reportPath = path.join(BENCHMARK_CONFIG.resultsDir, 'performance-benchmark-report.txt');
    const jsonReportPath = path.join(BENCHMARK_CONFIG.resultsDir, 'performance-benchmark-data.json');

    // 生成文本报告
    let report = `
═══════════════════════════════════════════════════════════════
OTAE 系统性能基准测试报告
═══════════════════════════════════════════════════════════════

生成时间: ${new Date().toISOString()}
测试环境: ${BENCHMARK_CONFIG.baseURL}
迭代次数: ${BENCHMARK_CONFIG.iterations}

───────────────────────────────────────────────────────────────
测试结果汇总
───────────────────────────────────────────────────────────────

`;

    benchmarkResults.forEach(result => {
      const baseline = result.baseline;
      const durationDiff = ((result.duration - baseline.avg) / baseline.avg * 100).toFixed(1);
      const durationStatus = Math.abs(parseFloat(durationDiff)) <= 10 ? '✅' : '⚠️';

      report += `
【${result.task}】
  模式: ${result.mode === 'smart' ? '智能模式' : '快速模式'}
  平均耗时: ${result.duration}ms (${baseline.avg}ms 基准) [${durationDiff}%] ${durationStatus}
  质量评分: ${(result.qualityScore * 100).toFixed(1)}%
  OTAE 阶段: ${result.otaePhases?.length || 0}

`;

      if (result.mode === 'fast') {
        const smartModeResult = benchmarkResults.find(
          r => r.task === result.task.replace('快速', '智能')
        );
        if (smartModeResult) {
          const speedup = calculateSpeedup(smartModeResult.duration, result.duration);
          report += `  性能提升: ${speedup.toFixed(1)}% 相对于智能模式\n`;
        }
      }
    });

    report += `
───────────────────────────────────────────────────────────────
性能基准对比
───────────────────────────────────────────────────────────────

任务类型         智能模式      快速模式      性能提升
───────────────────────────────────────────────────────────────
`;

    const taskTypes = ['简单任务', '复杂任务', '多步骤任务'];
    taskTypes.forEach(taskType => {
      const smartResult = benchmarkResults.find(r => r.task.includes(taskType) && r.mode === 'smart');
      const fastResult = benchmarkResults.find(r => r.task.includes(taskType) && r.mode === 'fast');

      if (smartResult && fastResult) {
        const speedup = calculateSpeedup(smartResult.duration, fastResult.duration);
        report +=(`${taskType.padEnd(16)} ${smartResult.duration.toString().padStart(6)}ms    ` +
                  `${fastResult.duration.toString().padStart(6)}ms    ${speedup.toFixed(1)}%\n`);
      } else if (smartResult) {
        report +=(`${taskType.padEnd(16)} ${smartResult.duration.toString().padStart(6)}ms    ` +
                  `N/A         N/A\n`);
      }
    });

    report += `
───────────────────────────────────────────────────────────────
质量评分对比
───────────────────────────────────────────────────────────────

任务类型         智能模式      快速模式      质量差异
───────────────────────────────────────────────────────────────
`;

    taskTypes.forEach(taskType => {
      const smartResult = benchmarkResults.find(r => r.task.includes(taskType) && r.mode === 'smart');
      const fastResult = benchmarkResults.find(r => r.task.includes(taskType) && r.mode === 'fast');

      if (smartResult && fastResult) {
        const qualityDiff = ((smartResult.qualityScore - fastResult.qualityScore) * 100).toFixed(1);
        report +=(`${taskType.padEnd(16)} ${(smartResult.qualityScore * 100).toFixed(1)}%    ` +
                  `${(fastResult.qualityScore * 100).toFixed(1)}%    ${qualityDiff}%\n`);
      } else if (smartResult) {
        report +=(`${taskType.padEnd(16)} ${(smartResult.qualityScore * 100).toFixed(1)}%    ` +
                  `N/A         N/A\n`);
      }
    });

    report += `
───────────────────────────────────────────────────────────────
性能建议
───────────────────────────────────────────────────────────────

1. 如果性能下降超过 10%，建议检查:
   - AI 服务响应时间
   - 网络延迟
   - 数据处理逻辑

2. 如果质量评分下降，建议检查:
   - AI 模型准确性
   - 数据预处理逻辑
   - 结果验证机制

3. 性能优化建议:
   - 智能模式: 优化 AI 提示词，减少迭代次数
   - 快速模式: 优化代码执行效率
   - 两种模式: 实现结果缓存

═══════════════════════════════════════════════════════════════
报告结束
═══════════════════════════════════════════════════════════════
`;

    fs.writeFileSync(reportPath, report);
    fs.writeFileSync(jsonReportPath, JSON.stringify(benchmarkResults, null, 2));

    console.log(`✅ 性能基准报告已生成:`);
    console.log(`   - 文本报告: ${reportPath}`);
    console.log(`   - JSON 数据: ${jsonReportPath}`);
    console.log(report);
  });
});

/**
 * 辅助函数：运行性能测试
 */
async function runPerformanceTest(
  page: any,
  options: {
    file: string;
    command: string;
    mode: 'smart' | 'fast';
    timeout?: number;
  }
): Promise<{
  duration: number;
  qualityScore: number;
  otaePhases?: string[];
  success: boolean;
}> {
  const { file, command, mode, timeout = 120000 } = options;

  // 导航到应用
  await page.goto(BENCHMARK_CONFIG.baseURL);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);

  // 点击智能处理
  const smartOpsButton = page.locator('text=智能处理').or(
    page.locator('div').filter({ hasText: '智能处理' })
  ).first();
  await smartOpsButton.click();
  await page.waitForTimeout(2000);

  // 上传文件
  const filePath = path.join(BENCHMARK_CONFIG.testFilesDir, file);
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles(filePath);
  await page.waitForTimeout(3000);

  // 设置模式
  if (mode === 'smart') {
    const isSmartMode = await page.locator('button:has-text("智能模式")').count() > 0;
    if (!isSmartMode) {
      const modeToggle = page.locator('button').filter({ hasText: /智能|快速/ }).first();
      await modeToggle.click();
      await page.waitForTimeout(1000);
    }
  } else {
    const modeToggle = page.locator('button').filter({ hasText: /智能|快速/ }).first();
    await modeToggle.click();
    await page.waitForTimeout(1000);
  }

  // 输入命令
  const commandInput = page.locator('textarea[placeholder*="描述"], textarea').first();
  await commandInput.fill(command);

  // 开始计时
  const startTime = Date.now();

  // 执行任务
  const executeButton = page.locator('button:has-text("执行智能处理")').or(
    page.locator('button').filter({ hasText: '执行' })
  ).first();
  await executeButton.click();

  // 等待完成
  let completed = false;
  let errorDetected = false;
  const otaePhases: string[] = [];

  for (let i = 0; i < timeout / 2000; i++) {
    await page.waitForTimeout(2000);

    const pageText = await page.textContent('body');

    // 记录 OTAE 阶段
    const phases = ['观察', '思考', '执行', '评估'];
    phases.forEach(phase => {
      if (pageText.includes(phase) && !otaePhases.includes(phase)) {
        otaePhases.push(phase);
      }
    });

    // 检查是否完成
    if (pageText.includes('已完成') || pageText.includes('执行完成')) {
      completed = true;
      break;
    }

    // 检查错误
    if (pageText.includes('失败') || pageText.includes('错误')) {
      errorDetected = true;
    }
  }

  const duration = Date.now() - startTime;

  // 获取质量评分
  const pageText = await page.textContent('body');
  const qualityMatch = pageText?.match(/质量[评分:]\s*(\d+%?)/);
  const qualityScore = qualityMatch ? parseFloat(qualityMatch[1].replace('%', '')) / 100 : 0;

  return {
    duration,
    qualityScore,
    otaePhases,
    success: completed && !errorDetected
  };
}

/**
 * 辅助函数：计算平均值
 */
function calculateAverage(results: any[]): any {
  const sum = results.reduce((acc, result) => ({
    duration: acc.duration + result.duration,
    qualityScore: acc.qualityScore + result.qualityScore
  }), { duration: 0, qualityScore: 0 });

  return {
    duration: Math.round(sum.duration / results.length),
    qualityScore: sum.qualityScore / results.length,
    otaePhases: results[0]?.otaePhases || []
  };
}

/**
 * 辅助函数：计算性能提升百分比
 */
function calculateSpeedup(baseline: number, actual: number): number {
  return ((baseline - actual) / baseline) * 100;
}
