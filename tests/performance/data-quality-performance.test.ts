/**
 * 数据质量分析器性能测试 - Phase 2核心优化验证
 *
 * 测试目标:
 * 1. 小数据集分析 <500ms
 * 2. 中等数据集分析 <2000ms
 * 3. 大数据集流式处理不OOM
 * 4. 内存增长受控
 * 5. 并行检测性能提升
 *
 * @author Performance Tester
 * @version 1.0.0
 */

import { describe, test, expect, beforeAll, afterEach } from '@jest/globals';
import { DataQualityAnalyzer } from '../../services/ai/dataQualityAnalyzer';
import { AIServiceAdapter } from '../../services/agentic/aiServiceAdapter';
import { InMemoryCacheService } from '../../services/cache/inMemoryCacheService';
import { ExcelData } from '../../types';

// ============================================================================
// 测试基础设施
// ============================================================================

describe('Phase 2 数据质量分析器性能测试套件', () => {
  let analyzer: DataQualityAnalyzer;
  let aiService: AIServiceAdapter;
  let cacheService: InMemoryCacheService;

  beforeAll(() => {
    // 初始化服务
    aiService = new AIServiceAdapter();
    cacheService = new InMemoryCacheService();

    analyzer = new DataQualityAnalyzer(
      aiService,
      cacheService,
      {
        enableCache: true,
        cacheTTL: 1800000,
        parallelDetection: true,
        maxSampleSize: 10000
      }
    );

    console.log('✓ 数据质量分析器初始化完成');
  });

  afterEach(() => {
    // 每个测试后强制GC
    if (global.gc) {
      global.gc();
    }
  });

  // ============================================================================
  // 小数据集性能测试
  // ============================================================================

  describe('小数据集分析性能 (<1000行)', () => {
    test('100行数据分析 <200ms', async () => {
      const data = generateExcelData(100, 10);
      const startTime = Date.now();

      const report = await analyzer.analyze(data, {
        detectMissing: true,
        detectOutliers: true,
        detectDuplicates: true,
        detectFormat: false
      });

      const duration = Date.now() - startTime;

      expect(report).toBeDefined();
      expect(report.totalRows).toBe(100);
      expect(report.qualityScore).toBeGreaterThan(0);

      console.log(`✓ 100行数据分析耗时: ${duration}ms`);
      expect(duration).toBeLessThan(200);
    });

    test('1000行数据分析 <500ms', async () => {
      const data = generateExcelData(1000, 20);
      const startTime = Date.now();

      const report = await analyzer.analyze(data, {
        detectMissing: true,
        detectOutliers: true,
        detectDuplicates: true,
        detectFormat: true
      });

      const duration = Date.now() - startTime;

      expect(report).toBeDefined();
      expect(report.totalRows).toBe(1000);

      console.log(`✓ 1000行数据分析耗时: ${duration}ms`);
      console.log(`  质量评分: ${report.qualityScore}`);
      console.log(`  问题数量: ${report.issues.length}`);

      expect(duration).toBeLessThan(500);
    });
  });

  // ============================================================================
  // 中等数据集性能测试
  // ============================================================================

  describe('中等数据集分析性能 (1000-10000行)', () => {
    test('5000行数据分析 <1500ms', async () => {
      const data = generateExcelData(5000, 30);
      const startTime = Date.now();

      const report = await analyzer.analyze(data, {
        detectMissing: true,
        detectOutliers: true,
        detectDuplicates: true,
        detectFormat: false
      });

      const duration = Date.now() - startTime;

      expect(report).toBeDefined();
      expect(report.totalRows).toBe(5000);

      console.log(`✓ 5000行数据分析耗时: ${duration}ms`);
      console.log(`  质量评分: ${report.qualityScore}`);
      console.log(`  列统计数量: ${report.columnStats.length}`);

      expect(duration).toBeLessThan(1500);
    });

    test('10000行数据分析 <2500ms', async () => {
      const data = generateExcelData(10000, 50);
      const startTime = Date.now();

      const report = await analyzer.analyze(data, {
        detectMissing: true,
        detectOutliers: true,
        detectDuplicates: false,
        detectFormat: false
      });

      const duration = Date.now() - startTime;

      expect(report).toBeDefined();
      expect(report.totalRows).toBe(10000);

      console.log(`✓ 10000行数据分析耗时: ${duration}ms`);
      expect(duration).toBeLessThan(2500);
    });
  });

  // ============================================================================
  // 大数据集流式处理性能测试
  // ============================================================================

  describe('大数据集流式处理性能 (>10000行)', () => {
    test('50000行数据流式分析不OOM', async () => {
      const data = generateExcelData(50000, 20);
      const initialMemory = process.memoryUsage().heapUsed;

      const startTime = Date.now();
      const reports: any[] = [];

      try {
        for await (const report of analyzer.analyzeStreaming(data, {
          detectMissing: true,
          detectOutliers: false,
          detectDuplicates: false,
          detectFormat: false
        })) {
          reports.push(report);

          // 检查进度
          if (reports.length % 5 === 0) {
            const currentMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = currentMemory - initialMemory;
            console.log(
              `  批次 ${reports.length}: ` +
              `内存 ${Math.round(currentMemory / 1024 / 1024)}MB, ` +
              `增长 ${Math.round(memoryIncrease / 1024 / 1024)}MB`
            );

            // 内存增长应该小于500MB
            expect(memoryIncrease).toBeLessThan(500 * 1024 * 1024);
          }
        }

        const duration = Date.now() - startTime;
        const finalMemory = process.memoryUsage().heapUsed;
        const totalMemoryIncrease = finalMemory - initialMemory;

        console.log(`✓ 50000行数据流式分析耗时: ${duration}ms`);
        console.log(`✓ 批次数量: ${reports.length}`);
        console.log(`✓ 总内存增长: ${Math.round(totalMemoryIncrease / 1024 / 1024)}MB`);

        expect(reports.length).toBeGreaterThan(1);
        expect(duration).toBeLessThan(30000);
        expect(totalMemoryIncrease).toBeLessThan(500 * 1024 * 1024);

      } catch (error) {
        console.error('流式分析失败:', error);
        throw error;
      }
    });

    test('100000行数据流式处理稳定性', async () => {
      const data = generateExcelData(100000, 10);
      const initialMemory = process.memoryUsage().heapUsed;

      const startTime = Date.now();
      let batchCount = 0;
      let maxMemory = 0;

      for await (const report of analyzer.analyzeStreaming(data, {
        detectMissing: true,
        detectOutliers: false,
        detectDuplicates: false,
        detectFormat: false
      })) {
        batchCount++;

        const currentMemory = process.memoryUsage().heapUsed;
        if (currentMemory > maxMemory) {
          maxMemory = currentMemory;
        }

        // 每10个批次检查一次
        if (batchCount % 10 === 0) {
          const memoryIncrease = currentMemory - initialMemory;
          console.log(
            `  批次 ${batchCount}: ` +
            `内存 ${Math.round(currentMemory / 1024 / 1024)}MB`
          );
        }
      }

      const duration = Date.now() - startTime;
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      console.log(`✓ 100000行数据流式分析耗时: ${duration}ms`);
      console.log(`✓ 处理批次: ${batchCount}`);
      console.log(`✓ 峰值内存: ${Math.round(maxMemory / 1024 / 1024)}MB`);
      console.log(`✓ 最终内存增长: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);

      expect(batchCount).toBeGreaterThan(5);
      expect(memoryIncrease).toBeLessThan(500 * 1024 * 1024);
    });
  });

  // ============================================================================
  // 内存使用效率测试
  // ============================================================================

  describe('内存使用效率', () => {
    test('连续分析不导致内存泄漏', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const iterations = 10;

      const durations: number[] = [];
      const memorySnapshots: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const data = generateExcelData(5000, 20);
        const startTime = Date.now();

        await analyzer.analyze(data, {
          detectMissing: true,
          detectOutliers: true,
          detectDuplicates: true
        });

        const duration = Date.now() - startTime;
        durations.push(duration);

        const currentMemory = process.memoryUsage().heapUsed;
        const memoryIncrease = currentMemory - initialMemory;
        memorySnapshots.push(memoryIncrease);

        console.log(
          `  迭代 ${i + 1}: ${duration}ms, ` +
          `内存增长 ${Math.round(memoryIncrease / 1024 / 1024)}MB`
        );

        // 每3次清理一次缓存
        if (i % 3 === 2) {
          await cacheService.clear();
        }
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const finalMemoryIncrease = memorySnapshots[memorySnapshots.length - 1];

      console.log(`✓ 平均分析时间: ${avgDuration.toFixed(2)}ms`);
      console.log(`✓ 最终内存增长: ${Math.round(finalMemoryIncrease / 1024 / 1024)}MB`);

      // 强制GC
      if (global.gc) {
        global.gc();
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const afterGCMemory = process.memoryUsage().heapUsed;
      const memoryFreed = finalMemoryIncrease - (afterGCMemory - initialMemory);

      console.log(`✓ GC释放内存: ${Math.round(memoryFreed / 1024 / 1024)}MB`);

      // 平均每次分析应该小于1500ms
      expect(avgDuration).toBeLessThan(1500);

      // GC应该释放至少30%的内存
      expect(memoryFreed).toBeGreaterThan(finalMemoryIncrease * 0.3);
    });

    test('缓存命中时性能提升', async () => {
      const data = generateExcelData(5000, 20);

      // 第一次分析（缓存未命中）
      const firstStart = Date.now();
      const report1 = await analyzer.analyze(data, {
        detectMissing: true,
        detectOutliers: true
      });
      const firstDuration = Date.now() - firstStart;

      // 第二次分析（缓存命中）
      const secondStart = Date.now();
      const report2 = await analyzer.analyze(data, {
        detectMissing: true,
        detectOutliers: true
      });
      const secondDuration = Date.now() - secondStart;

      const speedup = firstDuration / secondDuration;
      const timeSaved = firstDuration - secondDuration;

      console.log(`✓ 第一次分析: ${firstDuration}ms`);
      console.log(`✓ 第二次分析: ${secondDuration}ms (缓存)`);
      console.log(`✓ 性能提升: ${speedup.toFixed(2)}x`);
      console.log(`✓ 节省时间: ${timeSaved}ms`);

      expect(report2.reportId).toBe(report1.reportId);
      expect(secondDuration).toBeLessThan(firstDuration);
      expect(speedup).toBeGreaterThan(1.5); // 至少1.5倍提升
    });
  });

  // ============================================================================
  // 并行检测性能测试
  // ============================================================================

  describe('并行检测性能', () => {
    test('并行检测vs串行检测性能对比', async () => {
      const data = generateExcelData(5000, 20);

      // 并行检测
      const parallelAnalyzer = new DataQualityAnalyzer(
        aiService,
        cacheService,
        { parallelDetection: true }
      );

      const parallelStart = Date.now();
      const parallelReport = await parallelAnalyzer.analyze(data, {
        detectMissing: true,
        detectOutliers: true,
        detectDuplicates: true,
        detectFormat: true
      });
      const parallelDuration = Date.now() - parallelStart;

      // 串行检测（模拟）
      const serialAnalyzer = new DataQualityAnalyzer(
        aiService,
        cacheService,
        { parallelDetection: false }
      );

      const serialStart = Date.now();
      const serialReport = await serialAnalyzer.analyze(data, {
        detectMissing: true,
        detectOutliers: true,
        detectDuplicates: true,
        detectFormat: true
      });
      const serialDuration = Date.now() - serialStart;

      const speedup = serialDuration / parallelDuration;
      const improvement = ((serialDuration - parallelDuration) / serialDuration) * 100;

      console.log(`✓ 串行检测耗时: ${serialDuration}ms`);
      console.log(`✓ 并行检测耗时: ${parallelDuration}ms`);
      console.log(`✓ 性能提升: ${speedup.toFixed(2)}x (${improvement.toFixed(1)}%)`);

      expect(parallelReport.totalRows).toBe(serialReport.totalRows);
      expect(parallelDuration).toBeLessThan(serialDuration);
      expect(speedup).toBeGreaterThan(1.2); // 至少20%提升
    });
  });

  // ============================================================================
  // 不同检测器性能测试
  // ============================================================================

  describe('各检测器性能分析', () => {
    test('缺失值检测性能', async () => {
      const data = generateExcelData(10000, 50, { missingRate: 0.1 });
      const startTime = Date.now();

      const report = await analyzer.analyze(data, {
        detectMissing: true,
        detectOutliers: false,
        detectDuplicates: false,
        detectFormat: false
      });

      const duration = Date.now() - startTime;

      const missingIssues = report.issues.filter(i => i.issueType === 'missing_value');

      console.log(`✓ 缺失值检测耗时: ${duration}ms`);
      console.log(`  检测到缺失值问题: ${missingIssues.length}个`);

      expect(duration).toBeLessThan(1000);
      expect(missingIssues.length).toBeGreaterThan(0);
    });

    test('异常值检测性能', async () => {
      const data = generateExcelData(10000, 30, { outlierRate: 0.05 });
      const startTime = Date.now();

      const report = await analyzer.analyze(data, {
        detectMissing: false,
        detectOutliers: true,
        detectDuplicates: false,
        detectFormat: false
      });

      const duration = Date.now() - startTime;

      const outlierIssues = report.issues.filter(i => i.issueType === 'outlier');

      console.log(`✓ 异常值检测耗时: ${duration}ms`);
      console.log(`  检测到异常值问题: ${outlierIssues.length}个`);

      expect(duration).toBeLessThan(2000);
    });

    test('重复行检测性能', async () => {
      const data = generateExcelData(8000, 20, { duplicateRate: 0.05 });
      const startTime = Date.now();

      const report = await analyzer.analyze(data, {
        detectMissing: false,
        detectOutliers: false,
        detectDuplicates: true,
        detectFormat: false
      });

      const duration = Date.now() - startTime;

      const duplicateIssues = report.issues.filter(i => i.issueType === 'duplicate_row');

      console.log(`✓ 重复行检测耗时: ${duration}ms`);
      console.log(`  检测到重复行问题: ${duplicateIssues.length}个`);

      expect(duration).toBeLessThan(1500);
    });

    test('格式一致性检测性能', async () => {
      const data = generateExcelData(10000, 20);
      // 添加一些格式不一致的数据
      for (let i = 0; i < data.sheets['Sheet1'].length; i++) {
        if (Math.random() < 0.1) {
          data.sheets['Sheet1'][i]['Column1'] = 'invalid-email';
        }
      }

      const startTime = Date.now();

      const report = await analyzer.analyze(data, {
        detectMissing: false,
        detectOutliers: false,
        detectDuplicates: false,
        detectFormat: true
      });

      const duration = Date.now() - startTime;

      console.log(`✓ 格式检测耗时: ${duration}ms`);
      console.log(`  检测到格式问题: ${report.issues.length}个`);

      expect(duration).toBeLessThan(2000);
    });
  });

  // ============================================================================
  // 边界情况和压力测试
  // ============================================================================

  describe('边界情况和压力测试', () => {
    test('空数据集快速处理', async () => {
      const data: ExcelData = {
        fileName: 'empty.xlsx',
        currentSheetName: 'Sheet1',
        sheets: {
          'Sheet1': []
        }
      };

      const startTime = Date.now();

      await expect(
        analyzer.analyze(data)
      ).rejects.toThrow();

      const duration = Date.now() - startTime;

      console.log(`✓ 空数据集错误处理耗时: ${duration}ms`);
      expect(duration).toBeLessThan(100);
    });

    test('单行数据快速处理', async () => {
      const data = generateExcelData(1, 5);
      const startTime = Date.now();

      const report = await analyzer.analyze(data);

      const duration = Date.now() - startTime;

      console.log(`✓ 单行数据分析耗时: ${duration}ms`);
      expect(duration).toBeLessThan(100);
    });

    test('大量列数据处理', async () => {
      const data = generateExcelData(1000, 200);
      const startTime = Date.now();

      const report = await analyzer.analyze(data, {
        detectMissing: true,
        detectOutliers: false,
        detectDuplicates: false,
        detectFormat: false
      });

      const duration = Date.now() - startTime;

      console.log(`✓ 200列数据分析耗时: ${duration}ms`);
      console.log(`  列统计数量: ${report.columnStats.length}`);

      expect(duration).toBeLessThan(5000);
      expect(report.columnStats.length).toBe(200);
    });
  });
});

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 生成测试用Excel数据
 */
function generateExcelData(
  rows: number,
  columns: number,
  options: {
    missingRate?: number;
    duplicateRate?: number;
    outlierRate?: number;
  } = {}
): ExcelData {
  const {
    missingRate = 0.05,
    duplicateRate = 0.02,
    outlierRate = 0.03
  } = options;

  const data: any[] = [];
  const columnNames = Array.from({ length: columns }, (_, i) => `Column${i + 1}`);

  // 生成唯一行
  for (let i = 0; i < rows * (1 - duplicateRate); i++) {
    const row: any = {};

    columnNames.forEach((col, colIndex) => {
      const rand = Math.random();

      // 缺失值
      if (rand < missingRate) {
        row[col] = null;
      }
      // 数值列（前3列）
      else if (colIndex < 3) {
        const value = Math.random() * 1000;
        // 异常值
        if (rand < missingRate + outlierRate) {
          row[col] = value > 0.5 ? 10000 : -1000;
        } else {
          row[col] = value;
        }
      }
      // 日期列（列3-5）
      else if (colIndex < 5) {
        const date = new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000);
        row[col] = date.toISOString().split('T')[0];
      }
      // 邮箱列（列5-7）
      else if (colIndex < 7) {
        row[col] = `user${i}@example.com`;
      }
      // 普通字符串
      else {
        row[col] = `value_${i}_${col}`;
      }
    });

    data.push(row);
  }

  // 添加重复行
  const duplicateCount = Math.floor(rows * duplicateRate);
  for (let i = 0; i < duplicateCount; i++) {
    const sourceIndex = Math.floor(Math.random() * data.length);
    data.push({ ...data[sourceIndex] });
  }

  return {
    fileName: `test_${rows}x${columns}.xlsx`,
    currentSheetName: 'Sheet1',
    sheets: {
      'Sheet1': data
    }
  };
}
