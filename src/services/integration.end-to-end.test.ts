/**
 * 端到端集成测试
 * 测试完整的文档生成流程
 */

import { DataQueryEngine } from './queryEngine/DataQueryEngine';
import { CacheService } from './infrastructure/cacheService';
import { generateExcelFormula, chatWithKnowledgeBase, generateDataProcessingCode } from './zhipuService';
import { ExcelData } from '../types';

describe('端到端集成测试', () => {
  let queryEngine: DataQueryEngine;
  let cacheService: CacheService;

  const mockExcelData: ExcelData = {
    id: 'test-1',
    fileName: 'test.xlsx',
    currentSheetName: 'Products',
    sheets: {
      'Products': [
        { id: 1, name: '笔记本电脑', price: 5999, category: '电子产品', stock: 50 },
        { id: 2, name: '无线鼠标', price: 99, category: '电子产品', stock: 200 },
        { id: 3, name: '机械键盘', price: 299, category: '电子产品', stock: 150 },
        { id: 4, name: 'Python编程', price: 89, category: '图书', stock: 80 },
        { id: 5, name: 'JavaScript指南', price: 79, category: '图书', stock: 100 }
      ]
    }
  };

  beforeAll(async () => {
    // 初始化组件
    queryEngine = new DataQueryEngine();
    await queryEngine.initialize();

    cacheService = CacheService as any;
  });

  afterAll(async () => {
    queryEngine.reset();
  });

  describe('场景1: 查询高价产品', () => {
    it('应该完成从数据加载到查询的完整流程', async () => {
      // 步骤1: 加载Excel数据
      queryEngine.loadExcelData(mockExcelData);
      const tables = queryEngine.getTableNames();
      expect(tables).toContain('Products');

      // 步骤2: 执行查询 - 查找价格大于100的产品
      const queryResult = await queryEngine.query({
        sql: 'SELECT * FROM [Products] WHERE price > 100 ORDER BY price DESC'
      });

      expect(queryResult.success).toBe(true);
      expect(queryResult.data).toHaveLength(3);
      expect(queryResult.data[0].name).toBe('笔记本电脑');

      // 步骤3: 验证结果
      expect(queryResult.data.every((item: any) => item.price > 100)).toBe(true);
    });
  });

  describe('场景2: 统计分析', () => {
    it('应该完成聚合统计查询', async () => {
      queryEngine.loadExcelData(mockExcelData);

      // 按分类统计产品数量和平均价格
      const result = await queryEngine.query({
        sql: `
          SELECT
            category,
            COUNT(*) as count,
            AVG(price) as avg_price,
            SUM(stock) as total_stock
          FROM [Products]
          GROUP BY category
        `
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);

      const electronics = result.data.find((d: any) => d.category === '电子产品');
      expect(electronics.count).toBe(3);
      expect(electronics.avg_price).toBeCloseTo(2132.33, 2);
    });
  });

  describe('场景3: 缓存加速查询', () => {
    it('应该利用缓存加速重复查询', async () => {
      queryEngine.loadExcelData(mockExcelData);

      // 第一次查询
      const start1 = Date.now();
      const result1 = await queryEngine.query({
        sql: 'SELECT * FROM [Products] WHERE category = "电子产品"'
      });
      const duration1 = Date.now() - start1;

      // 第二次查询（应该使用缓存）
      const start2 = Date.now();
      const result2 = await queryEngine.query({
        sql: 'SELECT * FROM [Products] WHERE category = "电子产品"'
      });
      const duration2 = Date.now() - start2;

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(duration2).toBeLessThan(duration1); // 缓存应该更快

      // 验证数据一致性
      expect(result1.data).toEqual(result2.data);
    });
  });

  describe('场景4: 批量查询', () => {
    it('应该执行多个相关查询', async () => {
      queryEngine.loadExcelData(mockExcelData);

      const queries = [
        { sql: 'SELECT * FROM [Products] WHERE price > 100' },
        { sql: 'SELECT * FROM [Products] WHERE stock < 100' },
        { sql: 'SELECT category, COUNT(*) as count FROM [Products] GROUP BY category' }
      ];

      const results = await queryEngine.batchQuery(queries);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);

      expect(results[0].data).toHaveLength(3); // 价格>100
      expect(results[1].data).toHaveLength(1); // 库存<100
      expect(results[2].data).toHaveLength(2); // 2个分类
    });
  });

  describe('场景5: 结构化查询', () => {
    it('应该使用结构化接口进行查询', async () => {
      queryEngine.loadExcelData(mockExcelData);

      const result = await queryEngine.query({
        structured: {
          from: 'Products',
          select: ['name', 'price', 'stock'],
          where: { category: '电子产品' },
          orderBy: { column: 'price', direction: 'asc' },
          limit: 2
        }
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].name).toBe('无线鼠标');
      expect(result.data[0]).toHaveProperty('name');
      expect(result.data[0]).toHaveProperty('price');
      expect(result.data[0]).toHaveProperty('stock');
      expect(result.data[0]).not.toHaveProperty('id'); // 不在select中
    });
  });

  describe('场景6: 错误恢复', () => {
    it('应该优雅处理查询错误', async () => {
      queryEngine.loadExcelData(mockExcelData);

      // 查询不存在的表
      const result1 = await queryEngine.query({
        sql: 'SELECT * FROM [NonExistent]'
      });

      expect(result1.success).toBe(false);
      expect(result1.error).toBeDefined();

      // 错误后系统应该仍然可用
      const result2 = await queryEngine.query({
        sql: 'SELECT * FROM [Products]'
      });

      expect(result2.success).toBe(true);
    });
  });

  describe('场景7: 性能压力测试', () => {
    it('应该在短时间内处理大量查询', async () => {
      queryEngine.loadExcelData(mockExcelData);

      const startTime = Date.now();
      const promises = [];

      // 执行50个并发查询
      for (let i = 0; i < 50; i++) {
        promises.push(
          queryEngine.query({
            sql: `SELECT * FROM [Products] WHERE id = ${i % 5 + 1}`
          })
        );
      }

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(50);
      expect(results.every(r => r.success)).toBe(true);
      expect(duration).toBeLessThan(5000); // 应该在5秒内完成
    });
  });

  describe('场景8: 动态条件查询', () => {
    it('应该处理各种复杂的WHERE条件', async () => {
      queryEngine.loadExcelData(mockExcelData);

      // 使用操作符
      const result = await queryEngine.query({
        structured: {
          from: 'Products',
          where: {
            price: { $gt: 50, $lt: 500 },
            stock: { $gte: 50 }
          }
        }
      });

      expect(result.success).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data.every((item: any) =>
        item.price > 50 && item.price < 500 && item.stock >= 50
      )).toBe(true);
    });
  });

  describe('场景9: IN查询', () => {
    it('应该支持IN操作符', async () => {
      queryEngine.loadExcelData(mockExcelData);

      const result = await queryEngine.query({
        structured: {
          from: 'Products',
          where: {
            category: ['电子产品', '图书']
          }
        }
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(5);
    });
  });

  describe('场景10: 缓存统计', () => {
    it('应该正确跟踪缓存性能', async () => {
      queryEngine.loadExcelData(mockExcelData);

      // 执行一些查询
      await queryEngine.query({ sql: 'SELECT * FROM [Products]' });
      await queryEngine.query({ sql: 'SELECT * FROM [Products]' });
      await queryEngine.query({ sql: 'SELECT * FROM [Products] WHERE price > 100' });

      const stats = queryEngine.getCacheStats();

      expect(stats.size).toBe(2); // 2个不同的查询
      expect(stats.hits).toBeGreaterThan(0);
    });
  });
});
