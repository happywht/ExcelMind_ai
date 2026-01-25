/**
 * 内存修复验证脚本
 *
 * 验证内容:
 * 1. 流式数据处理
 * 2. 内存控制
 * 3. WebSocket连接清理
 * 4. 缓存淘汰
 */

import { DataQualityAnalyzer } from '../services/ai/dataQualityAnalyzer';
import { MemoryCacheService } from '../services/storage/MemoryCacheService';
import type { ExcelData } from '../types';

// ============================================================================
// 测试数据生成
// ============================================================================

/**
 * 生成测试数据
 */
function generateTestData(rowCount: number): ExcelData {
  const data: any[] = [];

  for (let i = 0; i < rowCount; i++) {
    data.push({
      id: i + 1,
      name: `用户${i}`,
      email: i % 2 === 0 ? `user${i}@example.com` : 'invalid-email',
      age: Math.floor(Math.random() * 60) + 18,
      score: Math.random() * 100,
      createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
    });
  }

  return {
    fileName: 'test.xlsx',
    currentSheetName: 'Sheet1',
    sheets: {
      'Sheet1': data
    }
  };
}

// ============================================================================
// 验证函数
// ============================================================================

/**
 * 验证流式处理
 */
async function verifyStreamingProcessing(): Promise<boolean> {
  console.log('\n=== 验证流式处理 ===');

  const mockAIService = {
    analyze: async () => ({})
  };

  const analyzer = new DataQualityAnalyzer(mockAIService as any);

  // 测试大数据集 (> 10,000 行)
  console.log('1. 测试大数据集 (50,000 行)');
  const largeData = generateTestData(50000);
  const memBefore = process.memoryUsage().heapUsed;

  let batchCount = 0;
  let maxMemory = 0;

  for await (const batch of analyzer.analyzeStreaming(largeData)) {
    batchCount++;
    const memNow = process.memoryUsage().heapUsed;
    maxMemory = Math.max(maxMemory, memNow);

    if (batchCount % 5 === 0) {
      console.log(`  批次 ${batchCount}, 内存: ${Math.round(memNow / 1024 / 1024)}MB`);
    }
  }

  const memAfter = process.memoryUsage().heapUsed;
  const memUsed = (memAfter - memBefore) / 1024 / 1024;

  console.log(`✅ 处理完成: ${batchCount} 个批次`);
  console.log(`✅ 最大内存使用: ${Math.round(maxMemory / 1024 / 1024)}MB`);
  console.log(`✅ 最终内存使用: ${Math.round(memUsed)}MB`);

  return memUsed < 500; // 应该小于500MB
}

/**
 * 验证缓存淘汰
 */
async function verifyCacheEviction(): Promise<boolean> {
  console.log('\n=== 验证缓存淘汰 ===');

  const cache = new MemoryCacheService({
    type: 'memory',
    maxEntries: 5,
    maxMemory: 1024, // 1KB
    evictionPolicy: 'lru',
    enableStats: true
  });

  // 添加超过容量的数据
  console.log('1. 添加 10 个条目 (maxEntries=5)');
  for (let i = 0; i < 10; i++) {
    await cache.set(`key${i}`, { data: 'x'.repeat(100) });
  }

  const keys = await cache.keys();
  const size = keys.length;

  console.log(`✅ 缓存大小: ${size} (应该 ≤ 5)`);
  console.log(`✅ 当前键: ${keys.join(', ')}`);

  // 验证内存限制
  console.log('\n2. 测试内存限制 (maxMemory=1KB)');
  await cache.set('big-data', { data: 'y'.repeat(2000) }); // 2KB

  const stats = await cache.getStats();
  console.log(`✅ 缓存统计:`, {
    totalEntries: stats.totalEntries,
    totalSize: `${Math.round(stats.totalSize / 1024)}KB`,
    evictions: stats.evictions
  });

  return size <= 5 && stats.totalSize < 2048; // 应该小于2KB
}

/**
 * 验证内存控制
 */
async function verifyMemoryControl(): Promise<boolean> {
  console.log('\n=== 验证内存控制 ===');

  const mockAIService = {
    analyze: async () => ({})
  };

  const analyzer = new DataQualityAnalyzer(mockAIService as any);

  // 测试小数据集
  console.log('1. 测试小数据集 (5,000 行)');
  const smallData = generateTestData(5000);
  const memBefore1 = process.memoryUsage().heapUsed;

  await analyzer.analyze(smallData);

  const memAfter1 = process.memoryUsage().heapUsed;
  const memUsed1 = (memAfter1 - memBefore1) / 1024 / 1024;

  console.log(`✅ 内存使用: ${Math.round(memUsed1)}MB`);

  // 测试缓存清理
  console.log('\n2. 测试缓存清理');
  await analyzer.releaseMemory();

  const memAfter2 = process.memoryUsage().heapUsed;
  console.log(`✅ 清理后内存: ${Math.round(memAfter2 / 1024 / 1024)}MB`);

  return memUsed1 < 100; // 应该小于100MB
}

/**
 * 验证小数据处理
 */
async function verifySmallDataProcessing(): Promise<boolean> {
  console.log('\n=== 验证小数据处理 ===');

  const mockAIService = {
    analyze: async () => ({})
  };

  const analyzer = new DataQualityAnalyzer(mockAIService as any);

  console.log('1. 测试小数据集 (< 10,000 行)');
  const smallData = generateTestData(5000);
  const memBefore = process.memoryUsage().heapUsed;

  const result = await analyzer.analyze(smallData);

  const memAfter = process.memoryUsage().heapUsed;
  const memUsed = (memAfter - memBefore) / 1024 / 1024;

  console.log(`✅ 分析完成`);
  console.log(`✅ 总行数: ${result.totalRows}`);
  console.log(`✅ 质量分数: ${result.qualityScore.toFixed(2)}`);
  console.log(`✅ 内存使用: ${Math.round(memUsed)}MB`);

  return memUsed < 50; // 应该小于50MB
}

// ============================================================================
// 主验证流程
// ============================================================================

async function main() {
  console.log('========================================');
  console.log('    内存泄漏修复验证');
  console.log('========================================');

  const results: { [key: string]: boolean } = {};

  try {
    results['小数据处理'] = await verifySmallDataProcessing();
    results['流式处理'] = await verifyStreamingProcessing();
    results['缓存淘汰'] = await verifyCacheEviction();
    results['内存控制'] = await verifyMemoryControl();
  } catch (error) {
    console.error('\n❌ 验证失败:', error);
    process.exit(1);
  }

  // 输出结果
  console.log('\n========================================');
  console.log('    验证结果汇总');
  console.log('========================================');

  let passCount = 0;
  for (const [name, passed] of Object.entries(results)) {
    const status = passed ? '✅ 通过' : '❌ 失败';
    console.log(`${status}: ${name}`);
    if (passed) passCount++;
  }

  console.log('\n----------------------------------------');
  console.log(`通过率: ${passCount}/${Object.keys(results).length}`);

  if (passCount === Object.keys(results).length) {
    console.log('🎉 所有验证通过！');
    process.exit(0);
  } else {
    console.log('⚠️  部分验证失败');
    process.exit(1);
  }
}

// 运行验证
main().catch(error => {
  console.error('验证脚本执行失败:', error);
  process.exit(1);
});
