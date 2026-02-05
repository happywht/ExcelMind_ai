/**
 * AI映射服务使用示例
 * 演示如何使用增强的多Sheet映射功能
 */

import {
  generateFieldMappingV2,
  generateFieldMapping,
  suggestPrimarySheet,
  detectCrossSheetRelationships,
  validateMappingScheme
} from './documentMappingService';
import type { SheetInfo } from '../types/documentTypes';

// ============================================================================
// 示例1: 使用V2 API - 多Sheet映射
// ============================================================================

async function exampleMultiSheetMapping() {
  // 准备多Sheet数据
  const allSheetsInfo: SheetInfo[] = [
    {
      sheetName: '员工表',
      headers: ['员工ID', '姓名', '部门ID', '职位', '入职日期', '工资'],
      rowCount: 100,
      sampleData: [
        { 员工ID: 'E001', 姓名: '张三', 部门ID: 'D001', 职位: '工程师', 入职日期: '2020-01-15', 工资: 15000 },
        { 员工ID: 'E002', 姓名: '李四', 部门ID: 'D002', 职位: '设计师', 入职日期: '2021-03-20', 工资: 12000 }
      ]
    },
    {
      sheetName: '部门表',
      headers: ['部门ID', '部门名称', '负责人', '办公地点'],
      rowCount: 5,
      sampleData: [
        { 部门ID: 'D001', 部门名称: '技术部', 负责人: '王总', 办公地点: '北京' },
        { 部门ID: 'D002', 部门名称: '设计部', 负责人: '赵总', 办公地点: '上海' }
      ]
    },
    {
      sheetName: '考勤表',
      headers: ['员工ID', '日期', '打卡时间', '状态'],
      rowCount: 300,
      sampleData: [
        { 员工ID: 'E001', 日期: '2024-01-01', 打卡时间: '09:00', 状态: '正常' },
        { 员工ID: 'E002', 日期: '2024-01-01', 打卡时间: '09:15', 状态: '迟到' }
      ]
    }
  ];

  // 模板占位符
  const templatePlaceholders = [
    '{{姓名}}',
    '{{职位}}',
    '{{工资}}',
    '{{部门名称}}',
    '{{部门负责人}}'
  ];

  // 用户指令
  const userInstruction = '生成员工工资单，包含部门信息';

  try {
    // 调用V2 API生成映射
    const mappingScheme = await generateFieldMappingV2({
      allSheetsInfo,
      templatePlaceholders,
      userInstruction
      // primarySheet是可选的，如果不提供AI会自动选择
    });

    console.log('AI选择的Sheet:', mappingScheme.primarySheet);
    console.log('映射数量:', mappingScheme.mappings.length);
    console.log('跨Sheet映射数量:', mappingScheme.crossSheetMappings?.length || 0);
    console.log('置信度:', mappingScheme.confidence);

    // 验证映射方案
    const validation = validateMappingScheme(mappingScheme, allSheetsInfo);
    if (!validation.valid) {
      console.error('映射方案验证失败:', validation.errors);
    }
    if (validation.warnings.length > 0) {
      console.warn('映射方案警告:', validation.warnings);
    }

    return mappingScheme;
  } catch (error) {
    console.error('映射生成失败:', error);
    throw error;
  }
}

// ============================================================================
// 示例2: 使用辅助函数 - 智能选择主Sheet
// ============================================================================

async function exampleSuggestPrimarySheet() {
  const allSheetsInfo: SheetInfo[] = [
    {
      sheetName: '产品表',
      headers: ['产品ID', '产品名称', '类别', '价格', '库存'],
      rowCount: 50,
      sampleData: []
    },
    {
      sheetName: '销售记录',
      headers: ['订单ID', '产品ID', '销售日期', '数量', '金额'],
      rowCount: 1000,
      sampleData: []
    },
    {
      sheetName: '客户表',
      headers: ['客户ID', '客户名称', '联系方式', '地区'],
      rowCount: 200,
      sampleData: []
    }
  ];

  // 自动推荐主Sheet
  const suggestedPrimary = suggestPrimarySheet(
    allSheetsInfo,
    '生成产品销售报告'
  );

  console.log('推荐的主Sheet:', suggestedPrimary);
  // 输出: 推荐的主Sheet: 销售记录 (因为数据量最大且包含"销售"关键词)

  return suggestedPrimary;
}

// ============================================================================
// 示例3: 使用辅助函数 - 检测跨Sheet关联
// ============================================================================

async function exampleDetectRelationships() {
  const allSheetsInfo: SheetInfo[] = [
    {
      sheetName: '订单表',
      headers: ['订单ID', '客户ID', '产品ID', '订单日期', '金额'],
      rowCount: 500,
      sampleData: []
    },
    {
      sheetName: '客户表',
      headers: ['客户ID', '客户名称', '联系方式', '地址'],
      rowCount: 100,
      sampleData: []
    },
    {
      sheetName: '产品表',
      headers: ['产品ID', '产品名称', '类别', '价格'],
      rowCount: 50,
      sampleData: []
    }
  ];

  // 检测关联关系
  const relationships = detectCrossSheetRelationships(allSheetsInfo);

  console.log('检测到的关联关系:');
  relationships.forEach(rel => {
    console.log(`  ${rel.fromSheet}.${rel.field} <-> ${rel.toSheet}.${rel.field} (置信度: ${rel.confidence})`);
  });

  // 输出示例:
  // 检测到的关联关系:
  //   订单表.客户ID <-> 客户表.客户ID (置信度: 1.0)
  //   订单表.产品ID <-> 产品表.产品ID (置信度: 1.0)

  return relationships;
}

// ============================================================================
// 示例4: 向后兼容 - 使用V1 API
// ============================================================================

async function exampleLegacyMapping() {
  // 旧的方式（仍然有效）
  const excelHeaders = ['姓名', '部门', '职位', '工资'];
  const excelSampleData = [
    { 姓名: '张三', 部门: '技术部', 职位: '工程师', 工资: 15000 },
    { 姓名: '李四', 部门: '设计部', 职位: '设计师', 工资: 12000 }
  ];
  const templatePlaceholders = ['{{姓名}}', '{{部门}}', '{{职位}}'];
  const userInstruction = '生成员工信息表';

  try {
    // V1 API仍然可用
    const mappingScheme = await generateFieldMapping({
      excelHeaders,
      excelSampleData,
      templatePlaceholders,
      userInstruction
    });

    console.log('映射方案:', mappingScheme);
    return mappingScheme;
  } catch (error) {
    console.error('映射生成失败:', error);
    throw error;
  }
}

// ============================================================================
// 示例5: 用户指定主Sheet
// ============================================================================

async function exampleUserSpecifiedPrimarySheet() {
  const allSheetsInfo: SheetInfo[] = [
    {
      sheetName: '员工表',
      headers: ['员工ID', '姓名', '部门ID', '工资'],
      rowCount: 100,
      sampleData: []
    },
    {
      sheetName: '部门表',
      headers: ['部门ID', '部门名称', '负责人'],
      rowCount: 10,
      sampleData: []
    }
  ];

  // 用户明确指定主Sheet
  const mappingScheme = await generateFieldMappingV2({
    allSheetsInfo,
    primarySheet: '员工表', // 明确指定主Sheet
    templatePlaceholders: ['{{姓名}}', '{{工资}}', '{{部门名称}}'],
    userInstruction: '生成员工工资单'
  });

  console.log('使用用户指定的主Sheet:', mappingScheme.primarySheet);
  return mappingScheme;
}

// ============================================================================
// 示例6: 复杂场景 - 筛选 + 跨Sheet映射
// ============================================================================

async function exampleComplexScenario() {
  const allSheetsInfo: SheetInfo[] = [
    {
      sheetName: '销售记录',
      headers: ['订单ID', '产品ID', '销售员ID', '销售日期', '销售额', '地区'],
      rowCount: 1000,
      sampleData: [
        { 订单ID: 'O001', 产品ID: 'P001', 销售员ID: 'S001', 销售日期: '2024-01-15', 销售额: 50000, 地区: '华东' },
        { 订单ID: 'O002', 产品ID: 'P002', 销售员ID: 'S002', 销售日期: '2024-01-16', 销售额: 30000, 地区: '华南' }
      ]
    },
    {
      sheetName: '产品表',
      headers: ['产品ID', '产品名称', '类别', '单价'],
      rowCount: 50,
      sampleData: [
        { 产品ID: 'P001', 产品名称: '笔记本电脑', 类别: '电子产品', 单价: 5000 },
        { 产品ID: 'P002', 产品名称: '办公桌', 类别: '家具', 单价: 1500 }
      ]
    },
    {
      sheetName: '销售员表',
      headers: ['销售员ID', '姓名', '所属区域', '入职时间'],
      rowCount: 20,
      sampleData: [
        { 销售员ID: 'S001', 姓名: '王销售', 所属区域: '华东', 入职时间: '2023-01-01' },
        { 销售员ID: 'S002', 姓名: '李销售', 所属区域: '华南', 入职时间: '2023-03-15' }
      ]
    }
  ];

  // 复杂的用户指令
  const userInstruction = '生成2024年华东地区销售额超过3万的订单记录，包含产品名称和销售员姓名';

  const mappingScheme = await generateFieldMappingV2({
    allSheetsInfo,
    templatePlaceholders: [
      '{{订单ID}}',
      '{{销售日期}}',
      '{{销售额}}',
      '{{产品名称}}',
      '{{销售员姓名}}'
    ],
    userInstruction
  });

  console.log('AI选择的Sheet:', mappingScheme.primarySheet);
  console.log('筛选条件:', mappingScheme.filterCondition);
  console.log('主Sheet映射:', mappingScheme.mappings);
  console.log('跨Sheet映射:', mappingScheme.crossSheetMappings);

  // 预期结果:
  // - AI选择 "销售记录" 作为主Sheet
  // - filterCondition: 类似 "row['地区'] === '华东' && row['销售额'] > 30000"
  // - 主Sheet映射: 订单ID, 销售日期, 销售额
  // - 跨Sheet映射:
  //   - 产品名称 (从产品表通过产品ID关联)
  //   - 销售员姓名 (从销售员表通过销售员ID关联)

  return mappingScheme;
}

// ============================================================================
// 导出示例函数供使用
// ============================================================================

export {
  exampleMultiSheetMapping,
  exampleSuggestPrimarySheet,
  exampleDetectRelationships,
  exampleLegacyMapping,
  exampleUserSpecifiedPrimarySheet,
  exampleComplexScenario
};

// 如果直接运行此文件
if (require.main === module) {
  console.log('运行示例...\n');

  // 选择要运行的示例
  const example = process.argv[2] || 'multiSheet';

  switch (example) {
    case 'multiSheet':
      exampleMultiSheetMapping().catch(console.error);
      break;
    case 'suggest':
      exampleSuggestPrimarySheet().catch(console.error);
      break;
    case 'detect':
      exampleDetectRelationships().catch(console.error);
      break;
    case 'legacy':
      exampleLegacyMapping().catch(console.error);
      break;
    case 'userSpecified':
      exampleUserSpecifiedPrimarySheet().catch(console.error);
      break;
    case 'complex':
      exampleComplexScenario().catch(console.error);
      break;
    default:
      console.log('可用示例: multiSheet, suggest, detect, legacy, userSpecified, complex');
  }
}
