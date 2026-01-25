/**
 * DataQueryEngine 单元测试
 * 测试数据查询引擎的核心功能
 */

import { DataQueryEngine, QueryRequest, StructuredQuery } from './DataQueryEngine';
import { ExcelData } from '../../types';

// Mock依赖
jest.mock('./AIQueryParser', () => ({
  AIQueryParser: jest.fn().mockImplementation(() => ({
    parse: jest.fn().mockResolvedValue({
      type: 'simple',
      tables: ['Products'],
      select: ['*'],
      where: 'price > 100'
    })
  }))
}));

jest.mock('./SQLGenerator', () => ({
  SQLGenerator: jest.fn().mockImplementation(() => ({
    generate: jest.fn().mockReturnValue('SELECT * FROM [Products] WHERE price > 100')
  }))
}));

describe('DataQueryEngine', () => {
  let engine: DataQueryEngine;
  let mockExcelData: ExcelData;

  beforeEach(() => {
    engine = new DataQueryEngine();
    mockExcelData = {
      id: 'test-1',
      fileName: 'test.xlsx',
      currentSheetName: 'Products',
      sheets: {
        'Products': [
          { id: 1, name: 'Product A', price: 100, category: 'Electronics' },
          { id: 2, name: 'Product B', price: 200, category: 'Electronics' },
          { id: 3, name: 'Product C', price: 150, category: 'Books' }
        ]
      }
    };
  });

  afterEach(async () => {
    engine.reset();
  });

  describe('初始化', () => {
    it('应该成功初始化引擎', async () => {
      await expect(engine.initialize()).resolves.not.toThrow();
    });

    it('应该支持重复初始化', async () => {
      await engine.initialize();
      await expect(engine.initialize()).resolves.not.toThrow();
    });

    it('应该在未初始化时抛出错误', async () => {
      const uninitializedEngine = new DataQueryEngine();
      expect(() => {
        uninitializedEngine.loadExcelData(mockExcelData);
      }).toThrow('引擎未初始化');
    });
  });

  describe('数据加载', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('应该成功加载Excel数据', () => {
      expect(() => {
        engine.loadExcelData(mockExcelData);
      }).not.toThrow();
    });

    it('应该正确创建表', () => {
      engine.loadExcelData(mockExcelData);
      const tables = engine.getTableNames();

      expect(tables).toContain('Products');
      expect(tables).toHaveLength(1);
    });

    it('应该正确获取列名', () => {
      engine.loadExcelData(mockExcelData);
      const columns = engine.getColumns('Products');

      expect(columns).toContain('id');
      expect(columns).toContain('name');
      expect(columns).toContain('price');
    });

    it('应该清空现有数据后再加载', () => {
      engine.loadExcelData(mockExcelData);

      const newData: ExcelData = {
        id: 'test-2',
        fileName: 'test2.xlsx',
        currentSheetName: 'NewTable',
        sheets: {
          'NewTable': [{ id: 1, value: 'test' }]
        }
      };

      engine.loadExcelData(newData);
      const tables = engine.getTableNames();

      expect(tables).not.toContain('Products');
      expect(tables).toContain('NewTable');
    });
  });

  describe('SQL查询', () => {
    beforeEach(async () => {
      await engine.initialize();
      engine.loadExcelData(mockExcelData);
    });

    it('应该执行简单的SELECT查询', async () => {
      const result = await engine.query({
        sql: 'SELECT * FROM [Products]'
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
    });

    it('应该执行带WHERE条件的查询', async () => {
      const result = await engine.query({
        sql: 'SELECT * FROM [Products] WHERE price > 100'
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data.every((item: any) => item.price > 100)).toBe(true);
    });

    it('应该执行带ORDER BY的查询', async () => {
      const result = await engine.query({
        sql: 'SELECT * FROM [Products] ORDER BY price DESC'
      });

      expect(result.success).toBe(true);
      expect(result.data[0].price).toBe(200);
      expect(result.data[2].price).toBe(100);
    });

    it('应该执行带LIMIT的查询', async () => {
      const result = await engine.query({
        sql: 'SELECT * FROM [Products] LIMIT 2'
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('应该执行聚合查询', async () => {
      const result = await engine.query({
        sql: 'SELECT COUNT(*) as count, AVG(price) as avg_price FROM [Products]'
      });

      expect(result.success).toBe(true);
      expect(result.data[0].count).toBe(3);
    });

    it('应该处理无效的SQL', async () => {
      const result = await engine.query({
        sql: 'INVALID SQL QUERY'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('应该缓存查询结果', async () => {
      const query1 = await engine.query({
        sql: 'SELECT * FROM [Products]'
      });

      const query2 = await engine.query({
        sql: 'SELECT * FROM [Products]'
      });

      expect(query1.executionTime).toBeGreaterThan(0);
      expect(query2.executionTime).toBeLessThan(query1.executionTime);
    });
  });

  describe('结构化查询', () => {
    beforeEach(async () => {
      await engine.initialize();
      engine.loadExcelData(mockExcelData);
    });

    it('应该执行结构化查询', async () => {
      const request: QueryRequest = {
        structured: {
          from: 'Products',
          select: ['id', 'name'],
          where: { price: { $gt: 100 } },
          orderBy: { column: 'price', direction: 'desc' },
          limit: 2
        }
      };

      const result = await engine.query(request);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toHaveProperty('id');
      expect(result.data[0]).toHaveProperty('name');
      expect(result.data[0]).not.toHaveProperty('category');
    });

    it('应该执行IN查询', async () => {
      const request: QueryRequest = {
        structured: {
          from: 'Products',
          where: { category: ['Electronics', 'Books'] }
        }
      };

      const result = await engine.query(request);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
    });

    it('应该执行聚合查询', async () => {
      const request: QueryRequest = {
        structured: {
          from: 'Products',
          aggregations: [
            { function: 'SUM', column: 'price', alias: 'total' },
            { function: 'AVG', column: 'price', alias: 'average' }
          ]
        }
      };

      const result = await engine.query(request);

      expect(result.success).toBe(true);
      expect(result.data[0].total).toBe(450);
      expect(result.data[0].average).toBeCloseTo(150);
    });
  });

  describe('快速查询', () => {
    beforeEach(async () => {
      await engine.initialize();
      engine.loadExcelData(mockExcelData);
    });

    it('应该执行快速查询', async () => {
      const result = await engine.quickQuery('Products', 'name');

      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('name');
    });

    it('应该支持条件过滤', async () => {
      const result = await engine.quickQuery('Products', 'name', 'Product A');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Product A');
    });
  });

  describe('批量查询', () => {
    beforeEach(async () => {
      await engine.initialize();
      engine.loadExcelData(mockExcelData);
    });

    it('应该执行批量查询', async () => {
      const queries: QueryRequest[] = [
        { sql: 'SELECT * FROM [Products] WHERE price > 100' },
        { sql: 'SELECT * FROM [Products] WHERE category = "Books"' }
      ];

      const results = await engine.batchQuery(queries);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });
  });

  describe('缓存管理', () => {
    beforeEach(async () => {
      await engine.initialize();
      engine.loadExcelData(mockExcelData);
    });

    it('应该清除缓存', async () => {
      // 执行查询以填充缓存
      await engine.query({ sql: 'SELECT * FROM [Products]' });

      // 清除缓存
      engine.clearCache();

      // 获取缓存统计
      const stats = engine.getCacheStats();

      expect(stats.size).toBe(0);
    });

    it('应该返回缓存统计', async () => {
      await engine.query({ sql: 'SELECT * FROM [Products]' });

      const stats = engine.getCacheStats();

      expect(stats.size).toBeGreaterThan(0);
    });
  });

  describe('配置管理', () => {
    it('应该支持禁用缓存', async () => {
      const engineWithoutCache = new DataQueryEngine(undefined, {
        enableCache: false
      });

      await engineWithoutCache.initialize();
      engineWithoutCache.loadExcelData(mockExcelData);

      await engineWithoutCache.query({ sql: 'SELECT * FROM [Products]' });

      const stats = engineWithoutCache.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('应该支持禁用AI', async () => {
      const engineWithoutAI = new DataQueryEngine(undefined, {
        enableAI: false
      });

      await engineWithoutAI.initialize();

      await expect(
        engineWithoutAI.query({ naturalLanguage: '查询所有产品' })
      ).rejects.toThrow('AI查询未启用');
    });

    it('应该支持调试模式', async () => {
      const debugEngine = new DataQueryEngine(undefined, {
        debugMode: true
      });

      expect(() => debugEngine.setDebugMode(true)).not.toThrow();
      expect(() => debugEngine.setDebugMode(false)).not.toThrow();
    });
  });

  describe('错误处理', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('应该处理空数据', () => {
      const emptyData: ExcelData = {
        id: 'empty',
        fileName: 'empty.xlsx',
        currentSheetName: '',
        sheets: {}
      };

      expect(() => {
        engine.loadExcelData(emptyData);
      }).not.toThrow();
    });

    it('应该处理查询不存在的表', async () => {
      const result = await engine.query({
        sql: 'SELECT * FROM [NonExistentTable]'
      });

      expect(result.success).toBe(false);
    });

    it('应该处理无效的查询请求', async () => {
      const result = await engine.query({});

      expect(result.success).toBe(false);
      expect(result.error).toContain('必须包含');
    });
  });
});
