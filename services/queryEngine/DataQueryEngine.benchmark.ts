/**
 * DataQueryEngine 性能基准测试
 * 测试查询引擎在各种场景下的性能表现
 */

import { DataQueryEngine, QueryRequest, StructuredQuery } from './DataQueryEngine';
import { ExcelData } from '../../types';

// ============================================================
// 基准测试工具
// ============================================================

interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  opsPerSecond: number;
}

class Benchmark {
  private results: BenchmarkResult[] = [];

  /**
   * 执行基准测试
   */
  async run(
    name: string,
    fn: () => Promise<void> | void,
    options: { iterations?: number; warmup?: boolean } = {}
  ): Promise<BenchmarkResult> {
    const { iterations = 100, warmup = true } = options;

    // 预热
    if (warmup) {
      for (let i = 0; i < 10; i++) {
        await fn();
      }
    }

    // 执行测试
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await fn();
      const end = performance.now();
      times.push(end - start);
    }

    // 计算统计数据
    const totalTime = times.reduce((a, b) => a + b, 0);
    const avgTime = totalTime / iterations;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const opsPerSecond = 1000 / avgTime;

    const result: BenchmarkResult = {
      name,
      iterations,
      totalTime,
      avgTime,
      minTime,
      maxTime,
      opsPerSecond
    };

    this.results.push(result);
    return result;
  }

  /**
   * 打印结果表格
   */
  printResults(): void {
    console.log('\n========================================');
    console.log('性能基准测试结果');
    console.log('========================================\n');

    console.table(this.results.map(r => ({
      '测试名称': r.name,
      '迭代次数': r.iterations,
      '平均时间': `${r.avgTime.toFixed(2)}ms`,
      '最小时间': `${r.minTime.toFixed(2)}ms`,
      '最大时间': `${r.maxTime.toFixed(2)}ms`,
      '吞吐量': `${r.opsPerSecond.toFixed(2)} ops/s`
    })));

    console.log('\n========================================\n');
  }

  /**
   * 比较两个测试结果
   */
  compare(result1: BenchmarkResult, result2: BenchmarkResult): void {
    const speedup = result1.avgTime / result2.avgTime;
    const percentChange = ((result2.avgTime - result1.avgTime) / result1.avgTime) * 100;

    console.log(`\n比较: ${result1.name} vs ${result2.name}`);
    console.log(`加速比: ${speedup.toFixed(2)}x`);
    console.log(`性能变化: ${percentChange > 0 ? '+' : ''}${percentChange.toFixed(2)}%`);
  }
}

// ============================================================
// 测试数据生成器
// ============================================================

class TestDataGenerator {
  /**
   * 生成小型测试数据（100行）
   */
  static generateSmall(): ExcelData {
    const data = [];
    for (let i = 0; i < 100; i++) {
      data.push({
        ID: i + 1,
        姓名: `员工${i + 1}`,
        部门: ['销售部', '市场部', '技术部'][i % 3],
        销售额: Math.floor(Math.random() * 200000) + 50000,
        年份: 2023,
        季度: `Q${(i % 4) + 1}`
      });
    }

    return {
      id: 'test-small',
      fileName: 'small.xlsx',
      currentSheetName: 'Sheet1',
      sheets: { 'Sheet1': data }
    };
  }

  /**
   * 生成中型测试数据（1,000行）
   */
  static generateMedium(): ExcelData {
    const data = [];
    for (let i = 0; i < 1000; i++) {
      data.push({
        ID: i + 1,
        姓名: `员工${i + 1}`,
        部门: ['销售部', '市场部', '技术部', '人事部', '财务部'][i % 5],
        销售额: Math.floor(Math.random() * 300000) + 50000,
        年份: 2020 + (i % 4),
        季度: `Q${(i % 4) + 1}`,
        日期: new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString()
      });
    }

    return {
      id: 'test-medium',
      fileName: 'medium.xlsx',
      currentSheetName: 'Sheet1',
      sheets: { 'Sheet1': data }
    };
  }

  /**
   * 生成大型测试数据（10,000行）
   */
  static generateLarge(): ExcelData {
    const data = [];
    for (let i = 0; i < 10000; i++) {
      data.push({
        ID: i + 1,
        姓名: `员工${i + 1}`,
        部门: ['销售部', '市场部', '技术部', '人事部', '财务部', '运营部'][i % 6],
        销售额: Math.floor(Math.random() * 500000) + 50000,
        年份: 2020 + (i % 4),
        季度: `Q${(i % 4) + 1}`,
        日期: new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString(),
        备注: `这是第${i + 1}条记录的备注信息，包含一些较长的文本内容用于测试字符串处理性能`
      });
    }

    return {
      id: 'test-large',
      fileName: 'large.xlsx',
      currentSheetName: 'Sheet1',
      sheets: { 'Sheet1': data }
    };
  }

  /**
   * 生成多表测试数据
   */
  static generateMultiSheet(): ExcelData {
    const employees = [];
    const sales = [];

    for (let i = 0; i < 1000; i++) {
      employees.push({
        ID: i + 1,
        姓名: `员工${i + 1}`,
        部门: ['销售部', '市场部', '技术部'][i % 3],
        电话: `138${String(i).padStart(8, '0')}`,
        邮箱: `employee${i + 1}@company.com`
      });

      sales.push({
        员工ID: i + 1,
        销售额: Math.floor(Math.random() * 200000) + 50000,
        年份: 2023,
        季度: `Q${(i % 4) + 1}`
      });
    }

    return {
      id: 'test-multi',
      fileName: 'multi.xlsx',
      currentSheetName: 'employees',
      sheets: {
        'employees': employees,
        'sales': sales
      }
    };
  }
}

// ============================================================
// 基准测试套件
// ============================================================

export class QueryEngineBenchmark {
  private benchmark = new Benchmark();
  private engine: DataQueryEngine;

  constructor() {
    this.engine = new DataQueryEngine({
      enableCache: false,  // 基准测试禁用缓存
      enableAI: false,
      debugMode: false
    });
  }

  /**
   * 运行所有基准测试
   */
  async runAll(): Promise<void> {
    console.log('========================================');
    console.log('DataQueryEngine 性能基准测试');
    console.log('========================================\n');

    await this.benchmarkSimpleSelect();
    await this.benchmarkWhereFilter();
    await this.benchmarkAggregation();
    await this.benchmarkJoinQuery();
    await this.benchmarkStructuredQuery();
    await this.benchmarkCachePerformance();
    await this.benchmarkScalability();

    this.benchmark.printResults();
  }

  /**
   * 基准测试1: 简单SELECT
   */
  async benchmarkSimpleSelect(): Promise<void> {
    console.log('测试1: 简单SELECT查询...');

    const testData = TestDataGenerator.generateMedium();
    await this.engine.initialize();
    this.engine.loadExcelData(testData);

    const result = await this.benchmark.run(
      '简单SELECT (1,000行)',
      async () => {
        await this.engine.query('SELECT * FROM [Sheet1] LIMIT 100');
      },
      { iterations: 200 }
    );

    console.log(`  平均: ${result.avgTime.toFixed(2)}ms`);
    console.log(`  吞吐量: ${result.opsPerSecond.toFixed(2)} ops/s\n`);
  }

  /**
   * 基准测试2: WHERE过滤
   */
  async benchmarkWhereFilter(): Promise<void> {
    console.log('测试2: WHERE条件过滤...');

    const result = await this.benchmark.run(
      'WHERE过滤 (1,000行)',
      async () => {
        await this.engine.query({
          sql: 'SELECT * FROM [Sheet1] WHERE 销售额 > 150000'
        });
      },
      { iterations: 200 }
    );

    console.log(`  平均: ${result.avgTime.toFixed(2)}ms`);
    console.log(`  吞吐量: ${result.opsPerSecond.toFixed(2)} ops/s\n`);
  }

  /**
   * 基准测试3: 聚合查询
   */
  async benchmarkAggregation(): Promise<void> {
    console.log('测试3: 聚合查询...');

    const result = await this.benchmark.run(
      'GROUP BY聚合 (1,000行)',
      async () => {
        await this.engine.query({
          sql: `
            SELECT 部门, SUM(销售额) AS 总销售额, AVG(销售额) AS 平均销售额
            FROM [Sheet1]
            GROUP BY 部门
          `
        });
      },
      { iterations: 200 }
    );

    console.log(`  平均: ${result.avgTime.toFixed(2)}ms`);
    console.log(`  吞吐量: ${result.opsPerSecond.toFixed(2)} ops/s\n`);
  }

  /**
   * 基准测试4: JOIN查询
   */
  async benchmarkJoinQuery(): Promise<void> {
    console.log('测试4: JOIN查询...');

    const testData = TestDataGenerator.generateMultiSheet();
    this.engine.reset();
    await this.engine.initialize();
    this.engine.loadExcelData(testData);

    const result = await this.benchmark.run(
      'INNER JOIN (2×1,000行)',
      async () => {
        await this.engine.query({
          sql: `
            SELECT a.姓名, b.销售额
            FROM [employees] a
            INNER JOIN [sales] b ON a.ID = b.员工ID
            WHERE b.销售额 > 150000
          `
        });
      },
      { iterations: 100 }
    );

    console.log(`  平均: ${result.avgTime.toFixed(2)}ms`);
    console.log(`  吞吐量: ${result.opsPerSecond.toFixed(2)} ops/s\n`);
  }

  /**
   * 基准测试5: 结构化查询
   */
  async benchmarkStructuredQuery(): Promise<void> {
    console.log('测试5: 结构化查询...');

    const testData = TestDataGenerator.generateMedium();
    this.engine.reset();
    await this.engine.initialize();
    this.engine.loadExcelData(testData);

    const query: StructuredQuery = {
      from: 'Sheet1',
      select: ['姓名', '部门', '销售额'],
      where: { 销售额: { $gte: 150000 } },
      orderBy: { column: '销售额', direction: 'desc' },
      limit: 50
    };

    const result = await this.benchmark.run(
      '结构化查询 (1,000行)',
      async () => {
        await this.engine.query({ structured: query });
      },
      { iterations: 200 }
    );

    console.log(`  平均: ${result.avgTime.toFixed(2)}ms`);
    console.log(`  吞吐量: ${result.opsPerSecond.toFixed(2)} ops/s\n`);
  }

  /**
   * 基准测试6: 缓存性能
   */
  async benchmarkCachePerformance(): Promise<void> {
    console.log('测试6: 缓存性能...');

    const testData = TestDataGenerator.generateMedium();
    this.engine.reset();
    this.engine.setCacheEnabled(true);
    await this.engine.initialize();
    this.engine.loadExcelData(testData);

    const sql = 'SELECT * FROM [Sheet1] WHERE 销售额 > 150000';

    // 预热缓存
    await this.engine.query(sql);

    const result = await this.benchmark.run(
      '缓存查询 (1,000行)',
      async () => {
        await this.engine.query(sql);
      },
      { iterations: 1000, warmup: false }
    );

    console.log(`  平均: ${result.avgTime.toFixed(2)}ms`);
    console.log(`  吞吐量: ${result.opsPerSecond.toFixed(2)} ops/s\n`);

    // 比较无缓存性能
    this.engine.setCacheEnabled(false);
    const resultNoCache = await this.benchmark.run(
      '无缓存查询 (1,000行)',
      async () => {
        await this.engine.query(sql);
      },
      { iterations: 100, warmup: false }
    );

    console.log(`  平均: ${resultNoCache.avgTime.toFixed(2)}ms`);
    console.log(`  吞吐量: ${resultNoCache.opsPerSecond.toFixed(2)} ops/s\n`);

    this.benchmark.compare(resultNoCache, result);
  }

  /**
   * 基准测试7: 可扩展性
   */
  async benchmarkScalability(): Promise<void> {
    console.log('测试7: 可扩展性测试...');

    const sizes = [
      { name: '100行', data: TestDataGenerator.generateSmall() },
      { name: '1,000行', data: TestDataGenerator.generateMedium() },
      { name: '10,000行', data: TestDataGenerator.generateLarge() }
    ];

    const results: { size: string; time: number }[] = [];

    for (const { name, data } of sizes) {
      this.engine.reset();
      await this.engine.initialize();
      this.engine.loadExcelData(data);

      const start = performance.now();
      await this.engine.query('SELECT COUNT(*) AS 总数 FROM [Sheet1]');
      const time = performance.now() - start;

      results.push({ size: name, time });
      console.log(`  ${name}: ${time.toFixed(2)}ms`);
    }

    console.log('\n  可扩展性分析:');
    console.log(`  100行 → 10,000行: ${(results[2].time / results[0].time).toFixed(2)}x 时间增长`);
    console.log(`  数据增长100x，时间增长${(results[2].time / results[0].time).toFixed(2)}x\n`);
  }

  /**
   * 基准测试8: 辅助函数性能
   */
  async benchmarkHelperFunctions(): Promise<void> {
    console.log('测试8: 辅助函数性能...');

    const testData = TestDataGenerator.generateMultiSheet();
    this.engine.reset();
    await this.engine.initialize();
    this.engine.loadExcelData(testData);

    const functions = [
      { name: 'extractPhone', sql: 'SELECT extractPhone(电话) FROM [employees] LIMIT 100' },
      { name: 'extractEmail', sql: 'SELECT extractEmail(邮箱) FROM [employees] LIMIT 100' },
      { name: 'parseDateYear', sql: 'SELECT parseDateYear(日期) FROM [Sheet1] LIMIT 100' }
    ];

    for (const fn of functions) {
      const result = await this.benchmark.run(
        `辅助函数: ${fn.name}`,
        async () => {
          await this.engine.query(fn.sql);
        },
        { iterations: 100 }
      );

      console.log(`  ${fn.name}: ${result.avgTime.toFixed(2)}ms`);
    }

    console.log('');
  }
}

// ============================================================
// 运行基准测试
// ============================================================

/**
 * 运行完整的基准测试套件
 */
export async function runBenchmark(): Promise<void> {
  const benchmark = new QueryEngineBenchmark();
  await benchmark.runAll();
}

/**
 * 运行快速基准测试（仅关键指标）
 */
export async function runQuickBenchmark(): Promise<void> {
  console.log('========================================');
  console.log('DataQueryEngine 快速基准测试');
  console.log('========================================\n');

  const benchmark = new QueryEngineBenchmark();

  // 仅运行核心测试
  await benchmark.benchmarkSimpleSelect();
  await benchmark.benchmarkAggregation();
  await benchmark.benchmarkCachePerformance();

  benchmark['benchmark'].printResults();
}

// 如果直接运行此文件，执行基准测试
if (typeof window === 'undefined') {
  const isQuick = process.argv.includes('--quick');

  if (isQuick) {
    runQuickBenchmark().catch(console.error);
  } else {
    runBenchmark().catch(console.error);
  }
}
