/**
 * DataQueryEngine 测试用例
 * 演示查询引擎的各种使用方式
 */

import { DataQueryEngine, QueryRequest, StructuredQuery } from './DataQueryEngine';
import { ExcelData } from '../../types';

// ============================================================
// 测试数据
// ============================================================

/**
 * 创建测试用的Excel数据
 */
function createTestExcelData(): ExcelData {
  return {
    id: 'test-1',
    fileName: '销售数据.xlsx',
    currentSheetName: '销售记录',
    sheets: {
      '销售记录': [
        { 姓名: '张三', 部门: '销售部', 销售额: 120000, 年份: 2023, 季度: 'Q1' },
        { 姓名: '李四', 部门: '销售部', 销售额: 98000, 年份: 2023, 季度: 'Q1' },
        { 姓名: '王五', 部门: '市场部', 销售额: 85000, 年份: 2023, 季度: 'Q1' },
        { 姓名: '张三', 部门: '销售部', 销售额: 135000, 年份: 2023, 季度: 'Q2' },
        { 姓名: '李四', 部门: '销售部', 销售额: 110000, 年份: 2023, 季度: 'Q2' },
        { 姓名: '赵六', 部门: '市场部', 销售额: 92000, 年份: 2023, 季度: 'Q2' },
      ],
      '员工信息': [
        { 姓名: '张三', 电话: '13800138000', 邮箱: 'zhangsan@company.com', 入职日期: '2020-01-15' },
        { 姓名: '李四', 电话: '13900139000', 邮箱: 'lisi@company.com', 入职日期: '2020-03-20' },
        { 姓名: '王五', 电话: '13700137000', 邮箱: 'wangwu@company.com', 入职日期: '2021-06-10' },
        { 姓名: '赵六', 电话: '13600136000', 邮箱: 'zhaoliu@company.com', 入职日期: '2021-09-05' },
      ]
    },
    metadata: {
      '销售记录': {
        comments: {},
        rowCount: 6,
        columnCount: 5
      },
      '员工信息': {
        comments: {},
        rowCount: 4,
        columnCount: 4
      }
    }
  };
}

// ============================================================
// 测试用例
// ============================================================

/**
 * 测试1: 基本初始化和数据加载
 */
export async function test1_BasicInitialization() {
  console.log('\n=== 测试1: 基本初始化 ===');

  const engine = new DataQueryEngine(undefined, {
    debugMode: true,
    enableCache: true,
    enableAI: false // 测试时禁用AI以避免API调用
  });

  // 初始化引擎
  await engine.initialize();

  // 加载测试数据
  const excelData = createTestExcelData();
  engine.loadExcelData(excelData);

  // 查看统计信息
  const stats = engine.getStatistics();
  console.log('数据统计:', stats);

  // 查看可用的表
  const tables = engine.getTableNames();
  console.log('可用的表:', tables);

  // 查看表的字段
  tables.forEach(table => {
    const columns = engine.getColumns(table);
    console.log(`表 ${table} 的字段:`, columns);
  });

  return engine;
}

/**
 * 测试2: SQL查询
 */
export async function test2_SQLQuery(engine: DataQueryEngine) {
  console.log('\n=== 测试2: SQL查询 ===');

  // 示例1: 简单SELECT
  const result1 = await engine.query(`
    SELECT 姓名, 部门, 销售额
    FROM [销售记录]
    WHERE 销售额 > 100000
  `);

  console.log('SQL查询结果1:', result1);

  // 示例2: 聚合查询
  const result2 = await engine.query(`
    SELECT 部门, SUM(销售额) AS 总销售额, AVG(销售额) AS 平均销售额
    FROM [销售记录]
    GROUP BY 部门
  `);

  console.log('SQL查询结果2:', result2);

  // 示例3: ORDER BY + LIMIT
  const result3 = await engine.query(`
    SELECT *
    FROM [销售记录]
    ORDER BY 销售额 DESC
    LIMIT 3
  `);

  console.log('SQL查询结果3:', result3);
}

/**
 * 测试3: 结构化查询
 */
export async function test3_StructuredQuery(engine: DataQueryEngine) {
  console.log('\n=== 测试3: 结构化查询 ===');

  // 示例1: 简单查询
  const query1: StructuredQuery = {
    from: '销售记录',
    select: ['姓名', '部门', '销售额'],
    where: { 销售额: { $gte: 100000 } },
    orderBy: { column: '销售额', direction: 'desc' },
    limit: 5
  };

  const result1 = await engine.query({ structured: query1 });
  console.log('结构化查询结果1:', result1);

  // 示例2: 聚合查询
  const query2: StructuredQuery = {
    from: '销售记录',
    aggregations: [
      { function: 'SUM', column: '销售额', alias: '总销售额' },
      { function: 'COUNT', column: '*', alias: '记录数' }
    ],
    groupBy: ['部门']
  };

  const result2 = await engine.query({ structured: query2 });
  console.log('结构化查询结果2:', result2);

  // 示例3: IN查询
  const query3: StructuredQuery = {
    from: '销售记录',
    select: ['姓名', '销售额'],
    where: { 姓名: ['张三', '李四'] }
  };

  const result3 = await engine.query({ structured: query3 });
  console.log('结构化查询结果3:', result3);

  // 示例4: 复杂条件
  const query4: StructuredQuery = {
    from: '销售记录',
    where: {
      部门: '销售部',
      销售额: { $gt: 100000, $lt: 130000 }
    }
  };

  const result4 = await engine.query({ structured: query4 });
  console.log('结构化查询结果4:', result4);
}

/**
 * 测试4: 快速查询
 */
export async function test4_QuickQuery(engine: DataQueryEngine) {
  console.log('\n=== 测试4: 快速查询 ===');

  // 示例1: 查询所有记录
  const allRecords = await engine.quickQuery('销售记录');
  console.log('所有记录:', allRecords);

  // 示例2: 查询特定列
  const names = await engine.quickQuery('销售记录', '姓名');
  console.log('所有姓名:', names);

  // 示例3: 带条件查询
  const salesDeals = await engine.quickQuery('销售记录', undefined, '部门 = "销售部"');
  console.log('销售部记录:', salesDeals);
}

/**
 * 测试5: 批量查询
 */
export async function test5_BatchQuery(engine: DataQueryEngine) {
  console.log('\n=== 测试5: 批量查询 ===');

  const queries: QueryRequest[] = [
    { sql: 'SELECT COUNT(*) AS 总数 FROM [销售记录]' },
    { sql: 'SELECT SUM(销售额) AS 总销售额 FROM [销售记录]' },
    {
      structured: {
        from: '销售记录',
        select: ['姓名', '销售额'],
        orderBy: { column: '销售额', direction: 'desc' },
        limit: 1
      }
    }
  ];

  const results = await engine.batchQuery(queries);

  results.forEach((result, index) => {
    console.log(`批量查询结果${index + 1}:`, result);
  });
}

/**
 * 测试6: 缓存性能测试
 */
export async function test6_CachePerformance(engine: DataQueryEngine) {
  console.log('\n=== 测试6: 缓存性能测试 ===');

  const sql = 'SELECT * FROM [销售记录] WHERE 销售额 > 100000';

  // 第一次查询（未缓存）
  console.log('第一次查询（未缓存）...');
  const start1 = performance.now();
  await engine.query(sql);
  const time1 = performance.now() - start1;
  console.log(`执行时间: ${time1.toFixed(2)}ms`);

  // 第二次查询（使用缓存）
  console.log('第二次查询（使用缓存）...');
  const start2 = performance.now();
  await engine.query(sql);
  const time2 = performance.now() - start2;
  console.log(`执行时间: ${time2.toFixed(2)}ms`);

  // 缓存统计
  const cacheStats = engine.getCacheStats();
  console.log('缓存统计:', cacheStats);

  console.log(`缓存加速: ${(time1 / time2).toFixed(2)}x`);
}

/**
 * 测试7: 辅助函数使用
 */
export async function test7_HelperFunctions(engine: DataQueryEngine) {
  console.log('\n=== 测试7: 辅助函数使用 ===');

  // 提取年份
  const result1 = await engine.query(`
    SELECT 姓名, parseDateYear(入职日期) AS 入职年份
    FROM [员工信息]
  `);
  console.log('提取年份:', result1);

  // 提取电话号码
  const result2 = await engine.query(`
    SELECT 姓名, extractPhone(电话) AS 提取的电话
    FROM [员工信息]
  `);
  console.log('提取电话:', result2);

  // 提取邮箱
  const result3 = await engine.query(`
    SELECT 姓名, extractEmail(邮箱) AS 提取的邮箱
    FROM [员工信息]
  `);
  console.log('提取邮箱:', result3);
}

/**
 * 测试8: 错误处理
 */
export async function test8_ErrorHandling(engine: DataQueryEngine) {
  console.log('\n=== 测试8: 错误处理 ===');

  // 测试SQL错误
  const result1 = await engine.query('SELECT * FROM [不存在的表]');
  console.log('SQL错误处理:', result1.success, result1.error);

  // 测试空结果
  const result2 = await engine.query('SELECT * FROM [销售记录] WHERE 销售额 > 999999');
  console.log('空结果处理:', result2.success, result2.rowCount);
}

/**
 * 测试9: 配置管理
 */
export async function test9_Configuration() {
  console.log('\n=== 测试9: 配置管理 ===');

  const engine = new DataQueryEngine(undefined, {
    enableCache: true,
    enableAI: false,
    debugMode: true,
    cacheSize: 50,
    cacheTTL: 60000
  });

  await engine.initialize();
  const excelData = createTestExcelData();
  engine.loadExcelData(excelData);

  // 执行查询
  await engine.query('SELECT * FROM [销售记录] LIMIT 1');

  // 切换调试模式
  engine.setDebugMode(false);
  console.log('调试模式已关闭');

  // 禁用缓存
  engine.setCacheEnabled(false);
  console.log('缓存已禁用');

  // 清除缓存
  engine.setCacheEnabled(true);
  engine.clearCache();
  console.log('缓存已清除');

  // 重置引擎
  engine.reset();
  console.log('引擎已重置');
}

/**
 * 测试10: 自然语言查询（需要AI）
 */
export async function test10_NaturalLanguage() {
  console.log('\n=== 测试10: 自然语言查询（需要AI）===');

  const engine = new DataQueryEngine(undefined, {
    enableAI: true, // 启用AI
    debugMode: true
  });

  await engine.initialize();
  const excelData = createTestExcelData();
  engine.loadExcelData(excelData);

  try {
    // 自然语言查询
    const result = await engine.query('张三在2023年的总销售额是多少？');
    console.log('自然语言查询结果:', result);
  } catch (error) {
    console.log('AI查询失败（可能未配置API密钥）:', error);
  }
}

// ============================================================
// 运行所有测试
// ============================================================

/**
 * 运行所有测试用例
 */
export async function runAllTests() {
  console.log('========================================');
  console.log('DataQueryEngine 测试套件');
  console.log('========================================');

  try {
    // 测试1: 初始化
    const engine = await test1_BasicInitialization();

    // 测试2: SQL查询
    await test2_SQLQuery(engine);

    // 测试3: 结构化查询
    await test3_StructuredQuery(engine);

    // 测试4: 快速查询
    await test4_QuickQuery(engine);

    // 测试5: 批量查询
    await test5_BatchQuery(engine);

    // 测试6: 缓存性能
    await test6_CachePerformance(engine);

    // 测试7: 辅助函数
    await test7_HelperFunctions(engine);

    // 测试8: 错误处理
    await test8_ErrorHandling(engine);

    // 测试9: 配置管理
    await test9_Configuration();

    // 测试10: 自然语言（可选）
    // await test10_NaturalLanguage();

    console.log('\n========================================');
    console.log('所有测试完成！');
    console.log('========================================');
  } catch (error) {
    console.error('测试失败:', error);
  }
}

// 如果直接运行此文件，执行所有测试
if (typeof window === 'undefined') {
  runAllTests().catch(console.error);
}
