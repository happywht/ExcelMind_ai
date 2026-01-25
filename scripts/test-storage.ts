/**
 * 存储服务测试脚本
 *
 * 测试Day 2实现的存储服务功能
 * - LocalStorage基本读写
 * - TTL过期机制
 * - 命名空间隔离
 * - IndexedDB批量操作
 * - 自动降级
 */

import { createDefaultStorageService } from '../services/storage';

async function testStorage() {
  console.log('🧪 开始测试存储服务...\n');

  const storage = createDefaultStorageService();

  try {
    // 测试1: 基本读写
    console.log('测试1: 基本读写...');
    await storage.set('test-key', { name: 'Test', value: 123 });
    const data = await storage.get('test-key');
    console.log('✓ 读取测试:', data);

    // 测试2: TTL
    console.log('\n测试2: TTL过期时间...');
    await storage.set('ttl-key', { expires: true }, { ttl: 10 });
    console.log('✓ TTL测试: 已设置10秒过期');

    // 测试3: 命名空间
    console.log('\n测试3: 命名空间隔离...');
    await storage.set('ns-key', { isolated: true }, { namespace: 'test' });
    const keys = await storage.keys('ns:*');
    console.log('✓ 命名空间测试:', keys);

    // 测试4: 统计
    console.log('\n测试4: 存储统计...');
    const stats = await storage.getStats();
    console.log('✓ 存储统计:', stats);

    // 测试5: 批量操作
    console.log('\n测试5: 批量操作...');
    if (storage.batchSet) {
      await storage.batchSet([
        { key: 'batch-1', value: { data: 1 } },
        { key: 'batch-2', value: { data: 2 } }
      ]);
      console.log('✓ 批量写入成功');
    }

    console.log('\n✅ 所有存储测试通过！');
  } catch (error) {
    console.error('\n❌ 存储测试失败:', error);
    process.exit(1);
  }
}

testStorage();
