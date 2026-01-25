/**
 * 性能流程测试
 *
 * 测试系统在不同负载下的性能表现
 *
 * @version 2.0.0
 */

import { test, expect, Page } from '@playwright/test';

// ==================== 辅助函数 ====================

interface PerformanceMetrics {
  pageLoad: number;
  apiResponse: number;
  processingTime: number;
  memoryUsage?: number;
}

async function measurePageLoad(page: Page, url: string): Promise<number> {
  const start = Date.now();
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  return Date.now() - start;
}

async function measureAPIResponse(page: Page, apiCall: () => Promise<void>): Promise<number> {
  const start = Date.now();
  await apiCall();
  return Date.now() - start;
}

// ==================== 页面加载性能测试 ====================

test.describe('页面加载性能', () => {
  test('数据质量页面加载时间应小于3秒', async ({ page }) => {
    const loadTime = await measurePageLoad(page, 'http://localhost:3001/data-quality');

    console.log(`数据质量页面加载时间: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(3000);
  });

  test('批量生成页面加载时间应小于3秒', async ({ page }) => {
    const loadTime = await measurePageLoad(page, 'http://localhost:3001/batch-generation');

    console.log(`批量生成页面加载时间: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(3000);
  });

  test('主页面加载时间应小于2秒', async ({ page }) => {
    const loadTime = await measurePageLoad(page, 'http://localhost:3001/');

    console.log(`主页面加载时间: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(2000);
  });
});

// ==================== API响应性能测试 ====================

test.describe('API响应性能', () => {
  test('数据质量分析API响应时间应小于2秒', async ({ page }) => {
    await page.goto('http://localhost:3001/data-quality');

    // 监听API响应
    let apiTime = 0;
    page.on('response', async (response) => {
      if (response.url().includes('/data-quality/analyze')) {
        const timing = await response.timing();
        apiTime = timing.responseEnd;
      }
    });

    // 上传文件触发API
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('test-data/sample-data.xlsx');

    // 等待分析完成
    await page.waitForSelector('[data-testid="analysis-complete"]', { timeout: 30000 });

    console.log(`数据质量分析API响应时间: ${apiTime}ms`);
    expect(apiTime).toBeLessThan(2000);
  });

  test('批量创建任务API响应时间应小于1秒', async ({ page }) => {
    await page.goto('http://localhost:3001/batch-generation');

    // 监听API响应
    let apiTime = 0;
    page.on('response', async (response) => {
      if (response.url().includes('/generation/batch')) {
        const timing = await response.timing();
        apiTime = timing.responseEnd;
      }
    });

    // 选择模板和数据源
    await page.click('[data-testid="template-tpl_1"]');
    await page.click('button:has-text("下一步")');
    await page.click('[data-testid="datasource-ds_1"]');
    await page.click('button:has-text("下一步")');
    await page.click('button:has-text("创建任务")');

    // 等待任务创建
    await page.waitForSelector('text=任务创建成功', { timeout: 10000 });

    console.log(`批量创建任务API响应时间: ${apiTime}ms`);
    expect(apiTime).toBeLessThan(1000);
  });
});

// ==================== 数据处理性能测试 ====================

test.describe('数据处理性能', () => {
  test('1000行数据应在30秒内完成分析', async ({ page }) => {
    await page.goto('http://localhost:3001/data-quality');

    const startTime = Date.now();

    // 上传大数据集文件
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('test-data/large-dataset-1000.xlsx');

    // 等待分析完成
    await page.waitForSelector('[data-testid="analysis-complete"]', { timeout: 60000 });

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    console.log(`1000行数据总处理时间: ${totalTime}ms`);
    expect(totalTime).toBeLessThan(30000);
  });

  test('100个文档批量生成应在60秒内完成', async ({ page }) => {
    await page.goto('http://localhost:3001/batch-generation');

    // 使用小数据集创建任务
    await page.click('[data-testid="template-tpl_1"]');
    await page.click('button:has-text("下一步")');
    await page.click('[data-testid="datasource-ds_2"]'); // 500行数据
    await page.click('button:has-text("下一步")');

    const startTime = Date.now();
    await page.click('button:has-text("创建任务")');

    // 等待任务完成
    await page.waitForSelector('[data-testid="task-complete"]', { timeout: 120000 });

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    console.log(`100个文档批量生成时间: ${totalTime}ms`);
    expect(totalTime).toBeLessThan(60000);
  });
});

// ==================== WebSocket性能测试 ====================

test.describe('WebSocket性能', () => {
  test('WebSocket连接应在1秒内建立', async ({ page }) => {
    await page.goto('http://localhost:3001/data-quality');

    const startTime = Date.now();

    // 监听WebSocket连接
    let wsConnected = false;
    page.on('websocket', ws => {
      ws.on('framesent', () => {
        if (!wsConnected) {
          wsConnected = true;
          const endTime = Date.now();
          const connectTime = endTime - startTime;
          console.log(`WebSocket连接时间: ${connectTime}ms`);
          expect(connectTime).toBeLessThan(1000);
        }
      });
    });

    // 上传文件触发WebSocket
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('test-data/sample-data.xlsx');

    // 等待分析开始
    await page.waitForSelector('[data-testid="progress-bar"]', { timeout: 5000 });
  });

  test('WebSocket消息延迟应小于100ms', async ({ page }) => {
    await page.goto('http://localhost:3001/batch-generation');

    const messageDelays: number[] = [];

    // 监听WebSocket消息
    page.on('websocket', ws => {
      ws.on('framereceived', frame => {
        try {
          const message = JSON.parse(frame.payload.toString());
          if (message.timestamp) {
            const delay = Date.now() - new Date(message.timestamp).getTime();
            messageDelays.push(delay);
          }
        } catch (e) {
          // 忽略解析错误
        }
      });
    });

    // 创建任务
    await page.click('[data-testid="template-tpl_1"]');
    await page.click('button:has-text("下一步")');
    await page.click('[data-testid="datasource-ds_1"]');
    await page.click('button:has-text("下一步")');
    await page.click('button:has-text("创建任务")');

    // 等待任务进度更新
    await page.waitForSelector('[data-testid="task-progress"]', { timeout: 10000 });

    // 计算平均延迟
    await page.waitForTimeout(3000); // 等待收集足够的数据

    if (messageDelays.length > 0) {
      const avgDelay = messageDelays.reduce((a, b) => a + b, 0) / messageDelays.length;
      console.log(`平均WebSocket消息延迟: ${avgDelay}ms`);
      expect(avgDelay).toBeLessThan(100);
    }
  });
});

// ==================== 内存和资源使用测试 ====================

test.describe('内存和资源使用', () => {
  test('页面内存使用应保持稳定', async ({ page }) => {
    await page.goto('http://localhost:3001/data-quality');

    // 获取初始内存使用
    const metrics1 = await page.metrics();
    const initialMemory = metrics1.JSHeapUsedSize;

    // 执行一系列操作
    for (let i = 0; i < 5; i++) {
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('test-data/sample-data.xlsx');
      await page.waitForSelector('[data-testid="analysis-complete"]', { timeout: 30000 });
      await page.click('[data-testid="reset-button"]');
      await page.waitForTimeout(1000);
    }

    // 获取最终内存使用
    const metrics2 = await page.metrics();
    const finalMemory = metrics2.JSHeapUsedSize;

    const memoryGrowth = ((finalMemory - initialMemory) / initialMemory) * 100;

    console.log(`内存增长: ${memoryGrowth.toFixed(2)}%`);
    expect(memoryGrowth).toBeLessThan(50); // 内存增长应小于50%
  });

  test('不应有明显的内存泄漏', async ({ page }) => {
    await page.goto('http://localhost:3001/batch-generation');

    const memorySnapshots: number[] = [];

    // 多次创建和完成任务
    for (let i = 0; i < 3; i++) {
      await page.click('[data-testid="template-tpl_1"]');
      await page.click('button:has-text("下一步")');
      await page.click('[data-testid="datasource-ds_2"]');
      await page.click('button:has-text("下一步")');
      await page.click('button:has-text("创建任务")');

      // 等待任务完成
      await page.waitForSelector('[data-testid="task-complete"]', { timeout: 60000 });

      // 记录内存使用
      const metrics = await page.metrics();
      memorySnapshots.push(metrics.JSHeapUsedSize);

      // 创建新任务
      await page.click('button:has-text("创建新任务")');
    }

    // 检查内存是否持续增长
    const firstSnapshot = memorySnapshots[0];
    const lastSnapshot = memorySnapshots[memorySnapshots.length - 1];
    const growth = ((lastSnapshot - firstSnapshot) / firstSnapshot) * 100;

    console.log(`内存增长趋势: ${growth.toFixed(2)}%`);
    expect(growth).toBeLessThan(100); // 允许一定程度的增长，但不应过度
  });
});

// ==================== 并发性能测试 ====================

test.describe('并发性能', () => {
  test('应能同时处理多个文件上传', async ({ browser }) => {
    const pages = await Promise.all([
      browser.newPage(),
      browser.newPage(),
      browser.newPage(),
    ]);

    const startTime = Date.now();

    // 在多个页面中同时上传文件
    await Promise.all(
      pages.map(async (page, index) => {
        await page.goto('http://localhost:3001/data-quality');
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(`test-data/dataset-${index + 1}.xlsx`);
      })
    );

    // 等待所有页面完成分析
    await Promise.all(
      pages.map(async (page) => {
        await page.waitForSelector('[data-testid="analysis-complete"]', { timeout: 60000 });
      })
    );

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    console.log(`3个并发文件分析总时间: ${totalTime}ms`);

    // 关闭所有页面
    await Promise.all(pages.map(page => page.close()));

    // 并发处理应该比串行快
    expect(totalTime).toBeLessThan(60000);
  });
});

// ==================== 网络性能测试 ====================

test.describe('网络性能', () => {
  test('应在慢速网络下正常工作', async ({ page }) => {
    // 模拟慢速3G网络
    await page.emulateNetwork({
      downloadThroughput: (500 * 1024) / 8, // 500 Kbps
      uploadThroughput: (500 * 1024) / 8, // 500 Kbps
      latency: 100, // 100ms延迟
    });

    const startTime = Date.now();

    await page.goto('http://localhost:3001/data-quality');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('test-data/sample-data.xlsx');

    await page.waitForSelector('[data-testid="analysis-complete"]', { timeout: 90000 });

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    console.log(`慢速网络下分析时间: ${totalTime}ms`);
    expect(totalTime).toBeLessThan(90000); // 即使在慢速网络下也应能完成
  });

  test('应能处理网络中断和恢复', async ({ page }) => {
    await page.goto('http://localhost:3001/data-quality');

    // 开始上传
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('test-data/sample-data.xlsx');

    // 等待进度显示
    await page.waitForSelector('[data-testid="progress-bar"]', { timeout: 5000 });

    // 模拟网络中断
    await page.context().setOffline(true);
    await page.waitForTimeout(2000);

    // 恢复网络
    await page.context().setOffline(false);

    // 验证能够恢复并完成
    await page.waitForSelector('[data-testid="analysis-complete"]', { timeout: 60000 });

    await expect(page.locator('[data-testid="analysis-complete"]')).toBeVisible();
  });
});

// ==================== 压力测试 ====================

test.describe('压力测试', () => {
  test('应能处理大量数据(5000行)', async ({ page }) => {
    await page.goto('http://localhost:3001/data-quality');

    const startTime = Date.now();

    // 上传超大文件
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('test-data/huge-dataset-5000.xlsx');

    // 等待分析完成（增加超时时间）
    await page.waitForSelector('[data-testid="analysis-complete"]', { timeout: 180000 });

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    console.log(`5000行数据处理时间: ${totalTime}ms`);

    // 验证结果正确性
    const scoreText = await page.textContent('[data-testid="quality-score"]');
    const score = parseInt(scoreText || '0');
    expect(score).toBeGreaterThan(0);
  });

  test('应能快速响应多次操作', async ({ page }) => {
    await page.goto('http://localhost:3001/data-quality');

    const operationTimes: number[] = [];

    // 连续执行10次分析操作
    for (let i = 0; i < 10; i++) {
      const start = Date.now();

      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('test-data/small-dataset-100.xlsx');
      await page.waitForSelector('[data-testid="analysis-complete"]', { timeout: 30000 });

      await page.click('[data-testid="reset-button"]');
      await page.waitForTimeout(500);

      const end = Date.now();
      operationTimes.push(end - start);
    }

    // 计算平均操作时间
    const avgTime = operationTimes.reduce((a, b) => a + b, 0) / operationTimes.length;

    console.log(`平均单次操作时间: ${avgTime.toFixed(0)}ms`);

    // 性能应保持稳定，不应随操作次数增加而明显变慢
    const firstFive = operationTimes.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
    const lastFive = operationTimes.slice(5).reduce((a, b) => a + b, 0) / 5;
    const degradation = ((lastFive - firstFive) / firstFive) * 100;

    console.log(`性能下降: ${degradation.toFixed(2)}%`);
    expect(degradation).toBeLessThan(30); // 性能下降应小于30%
  });
});
