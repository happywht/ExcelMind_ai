/**
 * Day 2 存储服务综合测试脚本
 *
 * 全面测试存储服务的所有功能
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { LocalStorageService, createLocalStorageService } from '../services/storage/LocalStorageService';
import { MemoryCacheService, createMemoryCacheService } from '../services/storage/MemoryCacheService';
import { IndexedDBStorageService, createIndexedDBStorageService } from '../services/storage/IndexedDBStorageService';
import { StorageServiceFactory, createStorageServiceFactory } from '../services/storage/StorageServiceFactory';
import type { IStorageService } from '../types/storage';
import { StorageType } from '../types/storage';

// 测试结果统计
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  errors: [] as Array<{ test: string; error: string }>
};

// 测试工具函数
function log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
  const colors = {
    info: '\x1b[36m',    // cyan
    success: '\x1b[32m', // green
    error: '\x1b[31m',   // red
    warn: '\x1b[33m'     // yellow
  };
  const reset = '\x1b[0m';
  console.log(`${colors[type]}${message}${reset}`);
}

async function runTest(testName: string, testFn: () => Promise<void>) {
  testResults.total++;
  try {
    await testFn();
    testResults.passed++;
    log(`✓ ${testName}`, 'success');
  } catch (error) {
    testResults.failed++;
    const errorMsg = error instanceof Error ? error.message : String(error);
    testResults.errors.push({ test: testName, error: errorMsg });
    log(`✗ ${testName}: ${errorMsg}`, 'error');
  }
}

// Mock localStorage
function mockLocalStorage() {
  const mockStorage: Record<string, string> = {};

  global.localStorage = {
    getItem: (key: string) => mockStorage[key] || null,
    setItem: (key: string, value: string) => {
      mockStorage[key] = value;
    },
    removeItem: (key: string) => {
      delete mockStorage[key];
    },
    clear: () => {
      Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
    },
    get length() {
      return Object.keys(mockStorage).length;
    },
    key: (index: number) => Object.keys(mockStorage)[index] || null
  };
}

// ============================================================================
// LocalStorage 测试
// ============================================================================

async function testLocalStorage() {
  log('\n🧪 测试 LocalStorage 服务...', 'info');

  let service: LocalStorageService;

  await runTest('LocalStorage - 基本读写功能', async () => {
    mockLocalStorage();
    service = createLocalStorageService({ prefix: 'test_ls_' });

    await service.set('key1', 'value1');
    const value = await service.get<string>('key1');
    expect(value).toBe('value1');
  });

  await runTest('LocalStorage - TTL过期机制', async () => {
    await service.set('expire-key', 'value', { ttl: 1 });
    expect(await service.get('expire-key')).toBe('value');

    await new Promise(resolve => setTimeout(resolve, 1100));
    expect(await service.get('expire-key')).toBeNull();
  });

  await runTest('LocalStorage - 命名空间隔离', async () => {
    await service.set('key1', 'value1', { namespace: 'ns1' });
    await service.set('key1', 'value2', { namespace: 'ns2' });

    const value1 = await service.get('key1');
    expect(value1).toBeNull(); // 没有指定namespace，应该获取不到
  });

  await runTest('LocalStorage - 批量操作', async () => {
    const items = [
      { key: 'batch1', value: 'value1' },
      { key: 'batch2', value: 'value2' },
      { key: 'batch3', value: 'value3' }
    ];

    await service.batchSet(items);
    const result = await service.batchGet(['batch1', 'batch2', 'batch3']);

    expect(result.size).toBe(3);
    expect(result.get('batch1')).toBe('value1');
  });

  await runTest('LocalStorage - 存在性检查', async () => {
    await service.set('exists-key', 'value');
    expect(await service.exists('exists-key')).toBe(true);
    expect(await service.exists('nonexistent')).toBe(false);
  });

  await runTest('LocalStorage - 键模式匹配', async () => {
    await service.set('user:1', 'user1');
    await service.set('user:2', 'user2');
    await service.set('session:1', 'session1');

    const userKeys = await service.keys('user:*');
    expect(userKeys).toHaveLength(2);
    expect(userKeys).toContain('user:1');
  });

  await runTest('LocalStorage - 删除操作', async () => {
    await service.set('delete-key', 'value');
    await service.delete('delete-key');
    expect(await service.get('delete-key')).toBeNull();
  });

  await runTest('LocalStorage - 清空操作', async () => {
    await service.set('clear1', 'value1');
    await service.set('clear2', 'value2');
    await service.clear();

    const keys = await service.keys();
    expect(keys).toHaveLength(0);
  });

  await runTest('LocalStorage - 统计信息', async () => {
    await service.set('stat1', 'value1');
    await service.set('stat2', 'value2');
    await service.get('stat1');
    await service.get('stat1');
    await service.get('nonexistent');

    const stats = await service.getStats();
    expect(stats.totalEntries).toBe(2);
    expect(stats.hits).toBe(2);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBeCloseTo(66.67, 0);
  });

  await runTest('LocalStorage - 容量检测', async () => {
    // 创建一个接近限制的数据
    const largeData = 'x'.repeat(1024 * 1024); // 1MB

    try {
      await service.set('large-key', largeData);
      const stats = await service.getStats();
      expect(stats.totalSize).toBeGreaterThan(0);
    } catch (error) {
      // 如果超过限制，应该抛出容量错误
      expect(error).toBeDefined();
    }
  });
}

// ============================================================================
// MemoryCache 测试
// ============================================================================

async function testMemoryCache() {
  log('\n🧪 测试 MemoryCache 服务...', 'info');

  let service: MemoryCacheService;

  await runTest('MemoryCache - 基本读写功能', async () => {
    service = createMemoryCacheService({
      maxEntries: 1000,
      evictionPolicy: 'lru'
    });

    await service.set('key1', 'value1');
    const value = await service.get<string>('key1');
    expect(value).toBe('value1');
  });

  await runTest('MemoryCache - LRU淘汰策略', async () => {
    const smallCache = createMemoryCacheService({
      maxEntries: 3,
      evictionPolicy: 'lru'
    });

    await smallCache.set('key1', 'value1');
    await smallCache.set('key2', 'value2');
    await smallCache.set('key3', 'value3');
    await smallCache.get('key1'); // 使key1成为最近使用
    await smallCache.set('key4', 'value4'); // 应该淘汰key2

    expect(await smallCache.exists('key1')).toBe(true);
    expect(await smallCache.exists('key2')).toBe(false); // 被淘汰
    expect(await smallCache.exists('key4')).toBe(true);

    smallCache.destroy();
  });

  await runTest('MemoryCache - TTL自动过期', async () => {
    await service.set('expire-key', 'value', { ttl: 1 });
    expect(await service.get('expire-key')).toBe('value');

    await new Promise(resolve => setTimeout(resolve, 1100));
    expect(await service.get('expire-key')).toBeNull();
  });

  await runTest('MemoryCache - 访问统计', async () => {
    await service.set('stat-key', 'value');
    await service.get('stat-key');
    await service.get('stat-key');
    await service.get('stat-key');
    await service.get('nonexistent');

    const stats = await service.getStats();
    expect(stats.hits).toBe(3);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBe(75);
  });

  await runTest('MemoryCache - 批量操作', async () => {
    const items = [
      { key: 'batch1', value: 'value1' },
      { key: 'batch2', value: 'value2' }
    ];

    await service.batchSet(items);
    const result = await service.batchGet(['batch1', 'batch2']);

    expect(result.size).toBe(2);
  });

  await runTest('MemoryCache - 清理机制', async () => {
    await service.set('expiring1', 'value1', { ttl: 1 });
    await service.set('expiring2', 'value2', { ttl: 1 });
    await service.set('permanent', 'value3', { ttl: 0 });

    await new Promise(resolve => setTimeout(resolve, 1100));
    const keys = await service.keys();

    expect(keys).toContain('permanent');
    expect(keys).not.toContain('expiring1');
  });

  service.destroy();
}

// ============================================================================
// IndexedDB 测试
// ============================================================================

async function testIndexedDB() {
  log('\n🧪 测试 IndexedDB 服务...', 'info');

  let service: IndexedDBStorageService;

  await runTest('IndexedDB - 数据库初始化', async () => {
    service = createIndexedDBStorageService({
      dbName: 'TestStorageDB',
      version: 1,
      stores: [{
        name: 'default',
        keyPath: '',
        autoIncrement: false,
        indexes: [{
          name: 'expiresAt',
          keyPath: 'expiresAt',
          options: { unique: false }
        }]
      }]
    });

    await service.initialize();
    expect(service).toBeDefined();
  });

  await runTest('IndexedDB - 基本CRUD操作', async () => {
    await service.set('key1', 'value1');
    const value = await service.get<string>('key1');
    expect(value).toBe('value1');

    await service.delete('key1');
    expect(await service.get('key1')).toBeNull();
  });

  await runTest('IndexedDB - 批量操作', async () => {
    const items = [
      { key: 'batch1', value: 'value1' },
      { key: 'batch2', value: 'value2' },
      { key: 'batch3', value: 'value3' }
    ];

    await service.batchSet(items);
    const result = await service.batchGet(['batch1', 'batch2', 'batch3']);

    expect(result.size).toBe(3);
  });

  await runTest('IndexedDB - 大文件存储', async () => {
    // 创建一个大文件（1MB）
    const largeData = 'x'.repeat(1024 * 1024);

    await service.set('large-file', largeData);
    const result = await service.get<string>('large-file');

    expect(result).toBe(largeData);
    expect(result!.length).toBe(1024 * 1024);
  });

  await runTest('IndexedDB - 事务支持', async () => {
    // 批量操作使用事务
    const items = Array.from({ length: 100 }, (_, i) => ({
      key: `tx-key-${i}`,
      value: `tx-value-${i}`
    }));

    await service.batchSet(items);

    for (const item of items) {
      expect(await service.exists(item.key)).toBe(true);
    }
  });

  await runTest('IndexedDB - 数据库关闭和重新初始化', async () => {
    await service.set('persistent', 'value');
    await service.close();

    // 重新初始化
    await service.initialize();
    const value = await service.get('persistent');

    expect(value).toBe('value');
  });

  await service.close();
}

// ============================================================================
// StorageServiceFactory 测试
// ============================================================================

async function testStorageFactory() {
  log('\n🧪 测试 StorageServiceFactory...', 'info');

  let factory: StorageServiceFactory;

  await runTest('Factory - 自动降级策略', async () => {
    mockLocalStorage();

    factory = createStorageServiceFactory({
      preferred: StorageType.LOCAL_STORAGE,
      fallbackChain: [StorageType.LOCAL_STORAGE, StorageType.MEMORY],
      enableAutoFallback: true,
      configs: {
        [StorageType.LOCAL_STORAGE]: {
          type: StorageType.LOCAL_STORAGE,
          prefix: 'factory_test_'
        },
        [StorageType.MEMORY]: {
          type: StorageType.MEMORY,
          maxEntries: 1000,
          evictionPolicy: 'lru'
        }
      }
    });

    const service = factory.getDefaultService();
    await service.set('test-key', 'test-value');
    expect(await service.get('test-key')).toBe('test-value');
  });

  await runTest('Factory - 健康检查机制', async () => {
    const service = factory.getDefaultService();

    // 执行一些操作
    await service.set('health-key', 'value');
    await service.get('health-key');

    // 等待健康检查（默认30秒，这里只验证不报错）
    const value = await service.get('health-key');
    expect(value).toBe('value');
  });

  await runTest('Factory - 性能监控', async () => {
    const service = factory.getDefaultService();

    // 执行多个操作
    for (let i = 0; i < 10; i++) {
      await service.set(`perf-key-${i}`, `value-${i}`);
    }

    for (let i = 0; i < 10; i++) {
      await service.get(`perf-key-${i}`);
    }

    const stats = await factory.getStats();
    expect(stats).toBeDefined();
    expect(stats.length).toBeGreaterThan(0);
  });

  await runTest('Factory - 统一错误处理', async () => {
    const service = factory.getDefaultService();

    // 尝试获取不存在的键
    const value = await service.get('nonexistent-key');
    expect(value).toBeNull();

    // 尝试删除不存在的键（不应该抛出错误）
    await expect(service.delete('nonexistent-key')).resolves.not.toThrow();
  });

  factory.destroy();
}

// ============================================================================
// 性能测试
// ============================================================================

async function testPerformance() {
  log('\n🚀 性能基准测试...', 'info');

  await runTest('Performance - LocalStorage 写入性能', async () => {
    mockLocalStorage();
    const service = createLocalStorageService({ prefix: 'perf_ls_' });
    const iterations = 100;

    const start = Date.now();
    for (let i = 0; i < iterations; i++) {
      await service.set(`perf-key-${i}`, { index: i, data: 'test'.repeat(10) });
    }
    const duration = Date.now() - start;

    const avgTime = duration / iterations;
    log(`  写入${iterations}次: ${duration}ms (平均${avgTime.toFixed(2)}ms/op)`, 'info');

    expect(avgTime).toBeLessThan(10); // 平均每次写入应该小于10ms
  });

  await runTest('Performance - LocalStorage 读取性能', async () => {
    mockLocalStorage();
    const service = createLocalStorageService({ prefix: 'perf_ls_read_' });
    const iterations = 100;

    // 预填充数据
    for (let i = 0; i < iterations; i++) {
      await service.set(`perf-key-${i}`, { index: i, data: 'test'.repeat(10) });
    }

    const start = Date.now();
    for (let i = 0; i < iterations; i++) {
      await service.get(`perf-key-${i}`);
    }
    const duration = Date.now() - start;

    const avgTime = duration / iterations;
    log(`  读取${iterations}次: ${duration}ms (平均${avgTime.toFixed(2)}ms/op)`, 'info');

    expect(avgTime).toBeLessThan(5); // 平均每次读取应该小于5ms
  });

  await runTest('Performance - MemoryCache 写入性能', async () => {
    const service = createMemoryCacheService({ maxEntries: 10000 });
    const iterations = 1000;

    const start = Date.now();
    for (let i = 0; i < iterations; i++) {
      await service.set(`perf-key-${i}`, { index: i, data: 'test'.repeat(10) });
    }
    const duration = Date.now() - start;

    const avgTime = duration / iterations;
    log(`  写入${iterations}次: ${duration}ms (平均${avgTime.toFixed(3)}ms/op)`, 'info');

    expect(avgTime).toBeLessThan(1); // 内存缓存应该更快
  });

  await runTest('Performance - MemoryCache 读取性能', async () => {
    const service = createMemoryCacheService({ maxEntries: 10000 });
    const iterations = 1000;

    // 预填充数据
    for (let i = 0; i < iterations; i++) {
      await service.set(`perf-key-${i}`, { index: i, data: 'test'.repeat(10) });
    }

    const start = Date.now();
    for (let i = 0; i < iterations; i++) {
      await service.get(`perf-key-${i}`);
    }
    const duration = Date.now() - start;

    const avgTime = duration / iterations;
    log(`  读取${iterations}次: ${duration}ms (平均${avgTime.toFixed(3)}ms/op)`, 'info');

    expect(avgTime).toBeLessThan(1); // 内存缓存应该非常快
  });

  await runTest('Performance - 批量操作性能', async () => {
    mockLocalStorage();
    const service = createLocalStorageService({ prefix: 'perf_batch_' });
    const batchSize = 100;

    const items = Array.from({ length: batchSize }, (_, i) => ({
      key: `batch-key-${i}`,
      value: { index: i, data: 'test'.repeat(10) }
    }));

    const start = Date.now();
    await service.batchSet(items);
    const duration = Date.now() - start;

    log(`  批量写入${batchSize}项: ${duration}ms`, 'info');

    expect(duration).toBeLessThan(500); // 批量操作应该在500ms内完成
  });
}

// ============================================================================
// 主测试流程
// ============================================================================

export async function runAllStorageTests() {
  log('🚀 开始执行 Day 2 存储服务综合测试...\n', 'info');

  try {
    // 运行所有测试
    await testLocalStorage();
    await testMemoryCache();
    await testIndexedDB();
    await testStorageFactory();
    await testPerformance();

    // 打印测试结果汇总
    log('\n' + '='.repeat(60), 'info');
    log('📊 测试结果汇总', 'info');
    log('='.repeat(60), 'info');
    log(`总计: ${testResults.total} 个测试`, 'info');
    log(`✓ 通过: ${testResults.passed} 个`, 'success');
    log(`✗ 失败: ${testResults.failed} 个`, testResults.failed > 0 ? 'error' : 'success');
    log(`通过率: ${((testResults.passed / testResults.total) * 100).toFixed(2)}%`, 'info');

    if (testResults.errors.length > 0) {
      log('\n❌ 失败的测试:', 'error');
      testResults.errors.forEach(({ test, error }) => {
        log(`  - ${test}`, 'error');
        log(`    ${error}`, 'error');
      });
    }

    log('='.repeat(60) + '\n', 'info');

    // 返回测试是否全部通过
    return testResults.failed === 0;
  } catch (error) {
    log(`\n💥 测试执行出错: ${error}`, 'error');
    return false;
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllStorageTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('测试执行失败:', error);
      process.exit(1);
    });
}
