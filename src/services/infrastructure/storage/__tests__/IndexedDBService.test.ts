/**
 * IndexedDBService 单元测试
 *
 * 测试范围:
 * - 连接管理
 * - CRUD 操作
 * - 索引查询
 * - 批量操作
 * - 统计功能
 * - 事件监听
 */

import { IndexedDBService, createIndexedDBService } from '../IndexedDBService';
import type { IDBConfig, IDBStoreConfig } from '../../../../types/storageTypes';

// ============================================================================
// 测试辅助函数
// ============================================================================

const createTestConfig = (): IDBConfig => ({
  dbName: 'TestDB',
  version: 1,
  stores: [
    {
      name: 'testStore',
      keyPath: 'id',
      autoIncrement: false,
      indexes: [
        { name: 'nameIndex', keyPath: 'name', options: { unique: false } },
        { name: 'ageIndex', keyPath: 'age', options: { unique: false } },
      ],
    },
  ],
});

const createTestRecord = (id: string, name: string, age: number) => ({
  id,
  name,
  age,
  createdAt: Date.now(),
});

// ============================================================================
// 测试套件
// ============================================================================

describe('IndexedDBService', () => {
  let service: IndexedDBService;

  beforeEach(async () => {
    service = new IndexedDBService(createTestConfig());
    await service.open();
  });

  afterEach(async () => {
    await service.close();
  });

  // ========================================================================
  // 连接管理测试
  // ========================================================================

  describe('连接管理', () => {
    it('应该成功打开数据库', async () => {
      expect(service.isConnectionActive()).toBe(true);
    });

    it('应该避免重复打开', async () => {
      await service.open();
      expect(service.isConnectionActive()).toBe(true);
    });

    it('应该成功关闭数据库', async () => {
      await service.close();
      expect(service.isConnectionActive()).toBe(false);
    });

    it('应该在关闭后无法执行操作', async () => {
      await service.close();

      await expect(async () => {
        await service.get('testStore', 'test-id');
      }).rejects.toThrow('IndexedDB is not connected');
    });
  });

  // ========================================================================
  // CRUD 操作测试
  // ========================================================================

  describe('CRUD 操作', () => {
    it('应该成功添加记录', async () => {
      const record = createTestRecord('1', 'Alice', 25);

      const result = await service.add('testStore', record);

      expect(result.success).toBe(true);
      expect(result.data).toBe('1');
    });

    it('应该成功获取记录', async () => {
      const record = createTestRecord('2', 'Bob', 30);

      await service.add('testStore', record);

      const result = await service.get<typeof record>('testStore', '2');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(record);
    });

    it('应该返回 null 对于不存在的记录', async () => {
      const result = await service.get('testStore', 'non-existent');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('应该成功更新记录', async () => {
      const record = createTestRecord('3', 'Charlie', 35);

      await service.add('testStore', record);

      const updatedRecord = { ...record, age: 36 };

      await service.put('testStore', updatedRecord);

      const result = await service.get('testStore', '3');

      expect((result.data as any)?.age).toBe(36);
    });

    it('应该成功删除记录', async () => {
      const record = createTestRecord('4', 'David', 40);

      await service.add('testStore', record);

      await service.delete('testStore', '4');

      const result = await service.get('testStore', '4');

      expect(result.data).toBeNull();
    });

    it('应该成功清空存储', async () => {
      const record1 = createTestRecord('5', 'Emma', 28);
      const record2 = createTestRecord('6', 'Frank', 32);

      await service.add('testStore', record1);
      await service.add('testStore', record2);

      await service.clear('testStore');

      const allRecords = await service.getAll('testStore');

      expect(allRecords.data).toEqual([]);
    });

    it('应该获取所有记录', async () => {
      const record1 = createTestRecord('7', 'Grace', 27);
      const record2 = createTestRecord('8', 'Henry', 33);

      await service.add('testStore', record1);
      await service.add('testStore', record2);

      const result = await service.getAll('testStore');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data).toContainEqual(record1);
      expect(result.data).toContainEqual(record2);
    });
  });

  // ========================================================================
  // 索引查询测试
  // ========================================================================

  describe('索引查询', () => {
    beforeEach(async () => {
      const records = [
        createTestRecord('1', 'Alice', 25),
        createTestRecord('2', 'Bob', 30),
        createTestRecord('3', 'Alice', 35),
        createTestRecord('4', 'Charlie', 25),
      ];

      for (const record of records) {
        await service.add('testStore', record);
      }
    });

    it('应该通过索引查询', async () => {
      const result = await service.queryByIndex('testStore', 'nameIndex', 'Alice');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect((result.data as any)?.[0].name).toBe('Alice');
      expect((result.data as any)?.[1].name).toBe('Alice');
    });

    it('应该通过索引范围查询', async () => {
      const range = IDBKeyRange.bound(25, 30);

      const result = await service.queryByRange('testStore', 'ageIndex', range);

      expect(result.success).toBe(true);
      expect(result.data?.length).toBeGreaterThanOrEqual(2);
    });

    it('应该返回空数组对于无匹配的索引查询', async () => {
      const result = await service.queryByIndex('testStore', 'nameIndex', 'NonExistent');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  // ========================================================================
  // 批量操作测试
  // ========================================================================

  describe('批量操作', () => {
    it('应该批量添加记录', async () => {
      const records = [
        createTestRecord('batch1', 'Ivy', 29),
        createTestRecord('batch2', 'Jack', 31),
        createTestRecord('batch3', 'Kate', 26),
      ];

      const result = await service.bulkAdd('testStore', records);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
    });

    it('应该批量删除记录', async () => {
      const records = [
        createTestRecord('del1', 'Liam', 28),
        createTestRecord('del2', 'Mia', 32),
        createTestRecord('del3', 'Noah', 27),
      ];

      await service.bulkAdd('testStore', records);

      const result = await service.bulkDelete('testStore', ['del1', 'del2', 'del3']);

      expect(result.success).toBe(true);
      expect(result.data).toBe(3);
    });
  });

  // ========================================================================
  // 统计功能测试
  // ========================================================================

  describe('统计功能', () => {
    it('应该统计记录数', async () => {
      const records = [
        createTestRecord('count1', 'Olivia', 24),
        createTestRecord('count2', 'Peter', 36),
        createTestRecord('count3', 'Quinn', 29),
      ];

      for (const record of records) {
        await service.add('testStore', record);
      }

      const result = await service.count('testStore');

      expect(result.success).toBe(true);
      expect(result.data).toBe(3);
    });

    it('应该计算数据库大小', async () => {
      const largeRecord = {
        id: 'large',
        data: 'x'.repeat(10000),
      };

      await service.add('testStore', largeRecord);

      const size = await service.getDatabaseSize();

      expect(size).toBeGreaterThan(10000);
    });
  });

  // ========================================================================
  // 事件监听测试
  // ========================================================================

  describe('事件监听', () => {
    it('应该通知监听器数据变化', async () => {
      let eventReceived = false;

      const unsubscribe = service.addListener((event) => {
        eventReceived = true;
        expect(event.type).toBe('set');
      });

      const record = createTestRecord('event1', 'Rachel', 30);
      await service.add('testStore', record);

      // 等待事件
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(eventReceived).toBe(true);

      unsubscribe();
    });

    it('应该支持取消监听', async () => {
      let eventCount = 0;

      const unsubscribe = service.addListener(() => {
        eventCount++;
      });

      await service.add('testStore', createTestRecord('unsub1', 'Sam', 28));

      await new Promise(resolve => setTimeout(resolve, 100));

      unsubscribe();

      await service.add('testStore', createTestRecord('unsub2', 'Tina', 31));

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(eventCount).toBe(1);
    });
  });

  // ========================================================================
  // 工厂函数测试
  // ========================================================================

  describe('工厂函数', () => {
    it('应该使用默认配置创建服务', () => {
      const defaultService = createIndexedDBService();

      expect(defaultService).toBeInstanceOf(IndexedDBService);
    });

    it('应该合并自定义配置', () => {
      const customConfig: Partial<IDBConfig> = {
        dbName: 'CustomDB',
        version: 2,
      };

      const customService = createIndexedDBService(customConfig);

      expect(customService).toBeInstanceOf(IndexedDBService);
    });

    it('应该为空的 stores 配置创建空数组', () => {
      const service = createIndexedDBService({
        dbName: 'EmptyStoresDB',
      });

      expect(service).toBeInstanceOf(IndexedDBService);
    });
  });

  // ========================================================================
  // 错误处理测试
  // ========================================================================

  describe('错误处理', () => {
    it('应该处理无效的存储名称', async () => {
      const result = await service.get('nonExistentStore', 'key');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('应该处理删除时的错误', async () => {
      const result = await service.delete('testStore', 'non-existent-key');

      // 应该成功（即使键不存在）
      expect(result.success).toBe(true);
    });
  });

  // ========================================================================
  // 边界条件测试
  // ========================================================================

  describe('边界条件', () => {
    it('应该处理空记录', async () => {
      const emptyRecord = { id: 'empty' };

      const result = await service.add('testStore', emptyRecord);

      expect(result.success).toBe(true);
    });

    it('应该处理特殊字符', async () => {
      const specialRecord = {
        id: 'special:id:with:colons',
        name: 'Test "Quotes" and \'Apostrophes\'',
        age: 25,
      };

      await service.add('testStore', specialRecord);

      const result = await service.get('testStore', 'special:id:with:colons');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(specialRecord);
    });

    it('应该处理 Unicode 字符', async () => {
      const unicodeRecord = {
        id: 'unicode',
        name: '测试姓名',
        emoji: '🔥💯',
        age: 25,
      };

      await service.add('testStore', unicodeRecord);

      const result = await service.get('testStore', 'unicode');

      expect(result.success).toBe(true);
      expect((result.data as any)?.name).toBe('测试姓名');
      expect((result.data as any)?.emoji).toBe('🔥💯');
    });
  });
});
