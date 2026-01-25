/**
 * MultiSheetDataSource 快速使用示例
 *
 * 这个文件展示了如何在应用中集成和使用MultiSheetDataSource
 */

import { MultiSheetDataSource, globalDataSource } from './index';

// ============================================
// 示例 1: 基础数据加载和查询
// ============================================

export function example1_basicUsage() {
  console.log('=== 示例 1: 基础数据加载 ===\n');

  const dataSource = new MultiSheetDataSource();

  // 准备Excel数据
  const excelData = {
    sheets: {
      "Sheet1": [
        { 姓名: "张三", 部门: "销售部", 销售额: 100000 },
        { 姓名: "李四", 部门: "市场部", 销售额: 80000 }
      ],
      "Sheet2": [
        { 姓名: "张三", 部门: "销售部", 绩效: "A" },
        { 姓名: "李四", 部门: "市场部", 绩效: "B" }
      ]
    },
    currentSheetName: "Sheet1"
  };

  // 加载数据
  dataSource.loadExcelData(excelData);

  // 查看统计
  console.log(dataSource.generateSummaryReport());

  return dataSource;
}

// ============================================
// 示例 2: 检测和解决列名冲突
// ============================================

export function example2_columnConflicts() {
  console.log('=== 示例 2: 列名冲突检测 ===\n');

  const dataSource = new MultiSheetDataSource();

  const excelData = {
    sheets: {
      "员工表": [
        { 员工ID: 1, 姓名: "张三", 部门: "销售部" },
        { 员工ID: 2, 姓名: "李四", 部门: "市场部" }
      ],
      "绩效表": [
        { 记录ID: 101, 姓名: "张三", 绩效: "A" },
        { 记录ID: 102, 姓名: "李四", 绩效: "B" }
      ],
      "考勤表": [
        { 日期: "2024-01-01", 姓名: "张三", 状态: "出勤" },
        { 日期: "2024-01-01", 姓名: "李四", 状态: "出勤" }
      ]
    },
    currentSheetName: "员工表"
  };

  dataSource.loadExcelData(excelData);

  // 检测冲突
  const conflicts = dataSource.detectColumnConflicts();

  console.log(`检测到 ${conflicts.length} 个列名冲突:\n`);

  conflicts.forEach((conflict, index) => {
    console.log(`${index + 1}. 列名: "${conflict.columnName}"`);
    console.log(`   涉及Sheet: ${conflict.sheets.join(', ')}`);
    console.log(`   建议解决方案: ${conflict.suggestedResolution}`);
    console.log(`   推荐前缀: ${conflict.recommendedPrefix}\n`);
  });

  return dataSource;
}

// ============================================
// 示例 3: 自动关系检测和使用
// ============================================

export function example3_relationshipDetection() {
  console.log('=== 示例 3: 关系检测 ===\n');

  const dataSource = new MultiSheetDataSource();

  const excelData = {
    sheets: {
      "员工信息": [
        { 员工ID: 1, 姓名: "张三", 部门: "销售部" },
        { 员工ID: 2, 姓名: "李四", 部门: "市场部" }
      ],
      "销售记录": [
        { 记录ID: 101, 员工ID: 1, 销售额: 50000 },
        { 记录ID: 102, 员工ID: 1, 销售额: 75000 },
        { 记录ID: 103, 员工ID: 2, 销售额: 80000 }
      ],
      "部门预算": [
        { 部门: "销售部", 预算: 1000000 },
        { 部门: "市场部", 预算: 800000 }
      ]
    },
    currentSheetName: "员工信息"
  };

  dataSource.loadExcelData(excelData);

  // 自动检测关系
  const relationships = dataSource.detectRelationships();

  console.log(`检测到 ${relationships.length} 个关系:\n`);

  relationships.forEach((rel, index) => {
    console.log(`${index + 1}. ${rel.fromSheet}.${rel.fromColumn} -> ${rel.toSheet}.${rel.toColumn}`);
    console.log(`   类型: ${rel.type}`);
    console.log(`   可信度: ${(rel.confidence * 100).toFixed(1)}%\n`);
  });

  return dataSource;
}

// ============================================
// 示例 4: 查找关系路径（多表JOIN）
// ============================================

export function example4_relationshipPaths() {
  console.log('=== 示例 4: 关系路径查找 ===\n');

  const dataSource = new MultiSheetDataSource();

  const excelData = {
    sheets: {
      "员工信息": [
        { 员工ID: 1, 姓名: "张三", 部门: "销售部" },
        { 员工ID: 2, 姓名: "李四", 部门: "市场部" }
      ],
      "销售记录": [
        { 记录ID: 101, 员工ID: 1, 销售额: 50000 },
        { 记录ID: 102, 员工ID: 2, 销售额: 80000 }
      ],
      "部门预算": [
        { 部门: "销售部", 预算: 1000000 },
        { 部门: "市场部", 预算: 800000 }
      ]
    },
    currentSheetName: "员工信息"
  };

  dataSource.loadExcelData(excelData);

  // 查找从销售记录到部门预算的路径
  const paths = dataSource.getRelationshipPath("销售记录", "部门预算");

  console.log(`从 "销售记录" 到 "部门预算" 的路径:\n`);

  if (paths.length === 0) {
    console.log('没有找到直接路径\n');
  } else {
    paths.forEach((path, index) => {
      console.log(`路径 ${index + 1} (可信度: ${(path.confidence * 100).toFixed(1)}%, JOIN类型: ${path.joinType}):`);

      path.path.forEach((step, stepIndex) => {
        console.log(`  ${stepIndex + 1}. ${step.fromSheet} -> ${step.toSheet}`);
        console.log(`     关联字段: ${step.onColumn}`);
      });

      console.log();
    });
  }

  return dataSource;
}

// ============================================
// 示例 5: 与AlaSQL集成查询
// ============================================

export function example5_alasqlIntegration() {
  console.log('=== 示例 5: AlaSQL集成查询 ===\n');

  const dataSource = new MultiSheetDataSource();

  const excelData = {
    sheets: {
      "员工信息": [
        { 员工ID: 1, 姓名: "张三", 部门: "销售部" },
        { 员工ID: 2, 姓名: "李四", 部门: "市场部" }
      ],
      "销售记录": [
        { 记录ID: 101, 员工ID: 1, 销售额: 50000 },
        { 记录ID: 102, 员工ID: 1, 销售额: 75000 },
        { 记录ID: 103, 员工ID: 2, 销售额: 80000 }
      ]
    },
    currentSheetName: "员工信息"
  };

  dataSource.loadExcelData(excelData);

  // 使用AlaSQL查询
  console.log('查询1: 基本查询');
  const result1 = alasql('SELECT * FROM [员工信息]');
  console.log(result1);

  console.log('\n查询2: JOIN查询');
  const result2 = alasql(`
    SELECT e.姓名, e.部门, s.销售额
    FROM [员工信息] e
    JOIN [销售记录] s ON e.员工ID = s.员工ID
  `);
  console.log(result2);

  console.log('\n查询3: 聚合查询');
  const result3 = alasql(`
    SELECT e.部门, SUM(s.销售额) as 总销售额
    FROM [员工信息] e
    JOIN [销售记录] s ON e.员工ID = s.员工ID
    GROUP BY e.部门
  `);
  console.log(result3);

  return dataSource;
}

// ============================================
// 示例 6: 智能字段查找
// ============================================

export function example6_intelligentFieldLookup() {
  console.log('=== 示例 6: 智能字段查找 ===\n');

  const dataSource = new MultiSheetDataSource();

  const excelData = {
    sheets: {
      "员工表": [
        { 员工ID: 1, 姓名: "张三", 工资: 5000 },
        { 员工ID: 2, 姓名: "李四", 工资: 6000 }
      ],
      "部门表": [
        { 部门ID: 1, 部门名称: "销售部", 预算: 100000 }
      ]
    },
    currentSheetName: "员工表"
  };

  dataSource.loadExcelData(excelData);

  // 精确匹配
  console.log('精确匹配 "姓名":');
  const exactMatch = dataSource.findSheetByColumn("姓名");
  console.log(`  找到: ${exactMatch}\n`);

  // 模糊匹配
  console.log('模糊匹配 "员工":');
  const fuzzyMatch = dataSource.findSheetByColumn("员工");
  console.log(`  找到: ${fuzzyMatch} (匹配 "员工ID")\n`);

  // 查找不存在的字段
  console.log('查找不存在的字段 "XXX":');
  const notFound = dataSource.findSheetByColumn("XXX");
  console.log(`  结果: ${notFound}\n`);

  return dataSource;
}

// ============================================
// 示例 7: 使用全局单例
// ============================================

export function example7_globalSingleton() {
  console.log('=== 示例 7: 全局单例使用 ===\n');

  // 在应用的任何地方使用全局实例
  globalDataSource.loadExcelData({
    sheets: {
      "数据表": [
        { ID: 1, 名称: "测试", 值: 100 }
      ]
    },
    currentSheetName: "数据表"
  });

  // 在其他模块中访问
  console.log('Sheet名称:', globalDataSource.getSheetNames());
  console.log('列名:', globalDataSource.getColumns("数据表"));
  console.log('统计:', globalDataSource.getStatistics());

  return globalDataSource;
}

// ============================================
// 示例 8: 完整工作流程
// ============================================

export function example8_completeWorkflow() {
  console.log('=== 示例 8: 完整工作流程 ===\n');

  const dataSource = new MultiSheetDataSource();

  // 步骤 1: 加载数据
  console.log('步骤 1: 加载Excel数据');
  const excelData = {
    sheets: {
      "员工": [
        { 员工ID: 1, 姓名: "张三", 部门: "销售部", 入职日期: "2020-01-01" },
        { 员工ID: 2, 姓名: "李四", 部门: "市场部", 入职日期: "2019-06-01" }
      ],
      "销售": [
        { 记录ID: 101, 员工ID: 1, 金额: 50000, 日期: "2024-01-01" },
        { 记录ID: 102, 员工ID: 1, 金额: 75000, 日期: "2024-01-15" },
        { 记录ID: 103, 员工ID: 2, 金额: 80000, 日期: "2024-01-20" }
      ],
      "部门": [
        { 部门: "销售部", 预算: 1000000, 负责人: "王总" },
        { 部门: "市场部", 预算: 800000, 负责人: "李总" }
      ]
    },
    currentSheetName: "员工"
  };

  dataSource.loadExcelData(excelData);
  console.log('✓ 数据加载完成\n');

  // 步骤 2: 检测冲突
  console.log('步骤 2: 检测列名冲突');
  const conflicts = dataSource.detectColumnConflicts();
  console.log(`✓ 检测到 ${conflicts.length} 个冲突\n`);

  // 步骤 3: 检测关系
  console.log('步骤 3: 自动检测表间关系');
  const relationships = dataSource.detectRelationships();
  console.log(`✓ 检测到 ${relationships.length} 个关系\n`);

  // 步骤 4: 查找JOIN路径
  console.log('步骤 4: 查找多表JOIN路径');
  const paths = dataSource.getRelationshipPath("销售", "部门");
  if (paths.length > 0) {
    console.log(`✓ 找到路径 (可信度: ${(paths[0].confidence * 100).toFixed(1)}%)\n`);
  }

  // 步骤 5: 执行跨表查询
  console.log('步骤 5: 执行跨表查询');
  const joinResult = alasql(`
    SELECT e.姓名, s.金额, d.预算
    FROM [员工] e
    JOIN [销售] s ON e.员工ID = s.员工ID
    JOIN [部门] d ON e.部门 = d.部门
  `);
  console.log('✓ 查询结果:', joinResult, '\n');

  // 步骤 6: 生成报告
  console.log('步骤 6: 生成数据报告');
  console.log(dataSource.generateSummaryReport());

  return dataSource;
}

// ============================================
// 主函数：运行所有示例
// ============================================

export function runAllExamples() {
  console.clear();
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  MultiSheetDataSource 使用示例集合      ║');
  console.log('╚══════════════════════════════════════════╝\n');

  // 运行所有示例
  example1_basicUsage();
  console.log('\n' + '='.repeat(50) + '\n');

  example2_columnConflicts();
  console.log('\n' + '='.repeat(50) + '\n');

  example3_relationshipDetection();
  console.log('\n' + '='.repeat(50) + '\n');

  example4_relationshipPaths();
  console.log('\n' + '='.repeat(50) + '\n');

  example5_alasqlIntegration();
  console.log('\n' + '='.repeat(50) + '\n');

  example6_intelligentFieldLookup();
  console.log('\n' + '='.repeat(50) + '\n');

  example7_globalSingleton();
  console.log('\n' + '='.repeat(50) + '\n');

  example8_completeWorkflow();
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples();
}
