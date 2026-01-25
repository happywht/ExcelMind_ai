/**
 * 跨Sheet查找功能测试用例
 *
 * 测试场景：
 * 1. 单Sheet场景（无跨Sheet映射）
 * 2. 多Sheet场景（有跨Sheet映射）
 * 3. 找不到匹配数据
 * 4. 关联字段为空
 * 5. 来源Sheet不存在
 * 6. 性能测试（大数据量）
 */

// ===== 类型定义（独立运行） =====

interface MappingScheme {
  explanation: string;
  filterCondition: string | null;
  primarySheet: string;
  mappings: FieldMapping[];
  crossSheetMappings?: CrossSheetMapping[];
  unmappedPlaceholders: string[];
}

interface FieldMapping {
  placeholder: string;
  excelColumn: string;
  transform?: string;
}

interface CrossSheetMapping {
  placeholder: string;
  sourceSheet: string;
  sourceColumn: string;
  lookupKey: string;
  relationshipType?: 'oneToOne' | 'manyToOne';
  transform?: string;
}

// ===== 测试数据 =====

/**
 * 模拟Excel数据结构
 */
interface MockExcelData {
  sheets: {
    [sheetName: string]: any[];
  };
  currentSheetName: string;
}

/**
 * 创建测试数据
 */
function createTestData(): {
  excelData: MockExcelData;
  mappingScheme: MappingScheme;
  expectedResult: any[];
} {
  const excelData: MockExcelData = {
    sheets: {
      '员工表': [
        { 姓名: '小明', 部门ID: 'D001', 职位: '工程师' },
        { 姓名: '小红', 部门ID: 'D002', 职位: '专员' },
        { 姓名: '小刚', 部门ID: 'D001', 职位: '架构师' },
        { 姓名: '小丽', 部门ID: 'D003', 职位: '助理' },
        { 姓名: '小华', 部门ID: '', 职位: '实习生' }, // 部门ID为空
        { 姓名: '小龙', 部门ID: 'D999', 职位: '经理' }  // 不存在的部门ID
      ],
      '部门表': [
        { 部门ID: 'D001', 部门名称: '技术部', 部门经理: '张三' },
        { 部门ID: 'D002', 部门名称: '市场部', 部门经理: '李四' },
        { 部门ID: 'D003', 部门名称: '财务部', 部门经理: '王五' }
      ]
    },
    currentSheetName: '员工表'
  };

  const mappingScheme: MappingScheme = {
    explanation: '员工档案映射',
    filterCondition: null,
    primarySheet: '员工表',
    mappings: [
      { placeholder: '{{姓名}}', excelColumn: '姓名' },
      { placeholder: '{{职位}}', excelColumn: '职位' }
    ],
    crossSheetMappings: [
      {
        placeholder: '{{部门名称}}',
        sourceSheet: '部门表',
        sourceColumn: '部门名称',
        lookupKey: '部门ID'
      },
      {
        placeholder: '{{部门经理}}',
        sourceSheet: '部门表',
        sourceColumn: '部门经理',
        lookupKey: '部门ID'
      }
    ],
    unmappedPlaceholders: []
  };

  const expectedResult = [
    { 姓名: '小明', 职位: '工程师', 部门名称: '技术部', 部门经理: '张三' },
    { 姓名: '小红', 职位: '专员', 部门名称: '市场部', 部门经理: '李四' },
    { 姓名: '小刚', 职位: '架构师', 部门名称: '技术部', 部门经理: '张三' },
    { 姓名: '小丽', 职位: '助理', 部门名称: '财务部', 部门经理: '王五' },
    { 姓名: '小华', 职位: '实习生', 部门名称: '', 部门经理: '' }, // 部门ID为空
    { 姓名: '小龙', 职位: '经理', 部门名称: '', 部门经理: '' }      // 找不到匹配
  ];

  return { excelData, mappingScheme, expectedResult };
}

// ===== 核心函数实现（从DocumentSpace.tsx提取） =====

/**
 * 构建查找索引
 */
function buildLookupIndex(data: any[], keyField: string): Map<string, any> {
  const index = new Map<string, any>();
  data.forEach(row => {
    const keyValue = String(row[keyField] || '');
    if (keyValue) {
      index.set(keyValue, row);
    }
  });
  return index;
}

/**
 * 处理跨Sheet映射
 */
function processCrossSheetMappings(
  primarySheetData: any[],
  mappingScheme: MappingScheme,
  excelData: MockExcelData
): { mappedDataList: any[]; stats: any } {
  const hasCrossSheetMappings = mappingScheme.crossSheetMappings &&
    mappingScheme.crossSheetMappings.length > 0;

  // 为跨Sheet映射构建查找索引
  const crossSheetIndexes = new Map<string, Map<string, any>>();
  let totalIndexedRows = 0;

  if (hasCrossSheetMappings) {
    mappingScheme.crossSheetMappings!.forEach(crossMapping => {
      const sourceSheet = excelData.sheets[crossMapping.sourceSheet];
      if (sourceSheet) {
        const index = buildLookupIndex(sourceSheet, crossMapping.lookupKey);
        crossSheetIndexes.set(crossMapping.sourceSheet, index);
        totalIndexedRows += sourceSheet.length;
      }
    });
  }

  // 统计跨Sheet查找的成功率
  let crossSheetLookupSuccess = 0;
  let crossSheetLookupTotal = 0;

  // 构建映射数据
  const mappedDataList = primarySheetData.map((row: any) => {
    const mappedData: any = {};

    // 1. 处理主Sheet的字段映射
    mappingScheme.mappings.forEach(mapping => {
      const key = mapping.placeholder.replace(/\{\{|\}\}/g, '').trim();
      mappedData[key] = row[mapping.excelColumn];
    });

    // 2. 处理跨Sheet映射
    if (hasCrossSheetMappings) {
      mappingScheme.crossSheetMappings!.forEach(crossMapping => {
        const lookupValue = String(row[crossMapping.lookupKey] || '');
        const key = crossMapping.placeholder.replace(/\{\{|\}\}/g, '').trim();

        if (!lookupValue) {
          mappedData[key] = '';
          return;
        }

        crossSheetLookupTotal++;

        // 使用预构建的索引进行快速查找
        const sourceIndex = crossSheetIndexes.get(crossMapping.sourceSheet);
        let matchedRow: any = null;

        if (sourceIndex) {
          matchedRow = sourceIndex.get(lookupValue);
        }

        if (matchedRow) {
          mappedData[key] = matchedRow[crossMapping.sourceColumn];
          crossSheetLookupSuccess++;
        } else {
          mappedData[key] = '';
        }
      });
    }

    return mappedData;
  });

  const stats = {
    crossSheetLookupSuccess,
    crossSheetLookupTotal,
    totalIndexedRows,
    successRate: crossSheetLookupTotal > 0
      ? (crossSheetLookupSuccess / crossSheetLookupTotal) * 100
      : 100
  };

  return { mappedDataList, stats };
}

// ===== 测试用例 =====

/**
 * 测试1: 基本跨Sheet查找
 */
function testBasicCrossSheetLookup() {
  console.log('\n=== 测试1: 基本跨Sheet查找 ===');

  const { excelData, mappingScheme, expectedResult } = createTestData();
  const primarySheetData = excelData.sheets[mappingScheme.primarySheet];

  const { mappedDataList, stats } = processCrossSheetMappings(
    primarySheetData,
    mappingScheme,
    excelData
  );

  console.log('映射结果:', JSON.stringify(mappedDataList, null, 2));
  console.log('统计信息:', stats);

  // 验证结果
  const passed = JSON.stringify(mappedDataList) === JSON.stringify(expectedResult);
  console.log('测试结果:', passed ? '✓ 通过' : '✗ 失败');

  return passed;
}

/**
 * 测试2: 单Sheet场景（无跨Sheet映射）
 */
function testSingleSheetScenario() {
  console.log('\n=== 测试2: 单Sheet场景（无跨Sheet映射） ===');

  const { excelData } = createTestData();

  const singleSheetMapping: MappingScheme = {
    explanation: '单Sheet映射',
    filterCondition: null,
    primarySheet: '员工表',
    mappings: [
      { placeholder: '{{姓名}}', excelColumn: '姓名' },
      { placeholder: '{{职位}}', excelColumn: '职位' }
    ],
    unmappedPlaceholders: []
    // 没有 crossSheetMappings
  };

  const primarySheetData = excelData.sheets[singleSheetMapping.primarySheet];
  const { mappedDataList, stats } = processCrossSheetMappings(
    primarySheetData,
    singleSheetMapping,
    excelData
  );

  console.log('映射结果:', JSON.stringify(mappedDataList, null, 2));
  console.log('统计信息:', stats);

  // 验证：应该只包含主Sheet的字段
  const passed = mappedDataList.every(item =>
    item.hasOwnProperty('姓名') &&
    item.hasOwnProperty('职位') &&
    !item.hasOwnProperty('部门名称')
  );

  console.log('测试结果:', passed ? '✓ 通过' : '✗ 失败');

  return passed;
}

/**
 * 测试3: 来源Sheet不存在
 */
function testNonExistentSourceSheet() {
  console.log('\n=== 测试3: 来源Sheet不存在 ===');

  const { excelData } = createTestData();

  const invalidMapping: MappingScheme = {
    explanation: '包含不存在Sheet的映射',
    filterCondition: null,
    primarySheet: '员工表',
    mappings: [
      { placeholder: '{{姓名}}', excelColumn: '姓名' }
    ],
    crossSheetMappings: [
      {
        placeholder: '{{部门名称}}',
        sourceSheet: '不存在的Sheet',
        sourceColumn: '部门名称',
        lookupKey: '部门ID'
      }
    ],
    unmappedPlaceholders: []
  };

  const primarySheetData = excelData.sheets[invalidMapping.primarySheet];
  const { mappedDataList, stats } = processCrossSheetMappings(
    primarySheetData,
    invalidMapping,
    excelData
  );

  console.log('映射结果:', JSON.stringify(mappedDataList, null, 2));
  console.log('统计信息:', stats);

  // 验证：应该正常完成，但跨Sheet字段为空
  const passed = mappedDataList.every(item =>
    item.hasOwnProperty('姓名') &&
    item.部门名称 === ''
  );

  console.log('测试结果:', passed ? '✓ 通过' : '✗ 失败');

  return passed;
}

/**
 * 测试4: 性能测试（大数据量）
 */
function testPerformance() {
  console.log('\n=== 测试4: 性能测试（大数据量） ===');

  // 生成大量测试数据
  const largeEmployeeData: any[] = [];
  const largeDepartmentData: any[] = [];

  // 生成100个部门
  for (let i = 1; i <= 100; i++) {
    largeDepartmentData.push({
      部门ID: `D${String(i).padStart(3, '0')}`,
      部门名称: `部门${i}`,
      部门经理: `经理${i}`
    });
  }

  // 生成10000个员工
  for (let i = 1; i <= 10000; i++) {
    const deptId = `D${String(Math.floor(Math.random() * 100) + 1).padStart(3, '0')}`;
    largeEmployeeData.push({
      姓名: `员工${i}`,
      部门ID: deptId,
      职位: '员工'
    });
  }

  const largeExcelData: MockExcelData = {
    sheets: {
      '员工表': largeEmployeeData,
      '部门表': largeDepartmentData
    },
    currentSheetName: '员工表'
  };

  const largeMappingScheme: MappingScheme = {
    explanation: '大数据量映射',
    filterCondition: null,
    primarySheet: '员工表',
    mappings: [
      { placeholder: '{{姓名}}', excelColumn: '姓名' },
      { placeholder: '{{职位}}', excelColumn: '职位' }
    ],
    crossSheetMappings: [
      {
        placeholder: '{{部门名称}}',
        sourceSheet: '部门表',
        sourceColumn: '部门名称',
        lookupKey: '部门ID'
      },
      {
        placeholder: '{{部门经理}}',
        sourceSheet: '部门表',
        sourceColumn: '部门经理',
        lookupKey: '部门ID'
      }
    ],
    unmappedPlaceholders: []
  };

  const startTime = Date.now();
  const primarySheetData = largeExcelData.sheets[largeMappingScheme.primarySheet];
  const { mappedDataList, stats } = processCrossSheetMappings(
    primarySheetData,
    largeMappingScheme,
    largeExcelData
  );
  const duration = Date.now() - startTime;

  console.log('数据量:', {
    员工数: largeEmployeeData.length,
    部门数: largeDepartmentData.length,
    映射数: largeMappingScheme.mappings.length + largeMappingScheme.crossSheetMappings!.length
  });
  console.log('处理耗时:', duration, 'ms');
  console.log('平均每行耗时:', (duration / largeEmployeeData.length).toFixed(2), 'ms');
  console.log('统计信息:', stats);

  // 验证：所有数据都应该成功映射
  const passed = mappedDataList.length === largeEmployeeData.length &&
    stats.successRate === 100;

  console.log('测试结果:', passed ? '✓ 通过' : '✗ 失败');

  return passed;
}

/**
 * 测试5: 边界情况处理
 */
function testEdgeCases() {
  console.log('\n=== 测试5: 边界情况处理 ===');

  const edgeCaseData: MockExcelData = {
    sheets: {
      '主表': [
        { id: '', name: '空ID' },           // ID为空
        { id: null, name: 'Null ID' },      // ID为null
        { id: undefined, name: 'Undefined ID' }, // ID为undefined
        { id: 'MATCH', name: '正常数据' }   // 正常数据
      ],
      '关联表': [
        { id: 'MATCH', value: '匹配成功' }
      ]
    },
    currentSheetName: '主表'
  };

  const edgeCaseMapping: MappingScheme = {
    explanation: '边界情况测试',
    filterCondition: null,
    primarySheet: '主表',
    mappings: [
      { placeholder: '{{name}}', excelColumn: 'name' }
    ],
    crossSheetMappings: [
      {
        placeholder: '{{value}}',
        sourceSheet: '关联表',
        sourceColumn: 'value',
        lookupKey: 'id'
      }
    ],
    unmappedPlaceholders: []
  };

  const primarySheetData = edgeCaseData.sheets[edgeCaseMapping.primarySheet];
  const { mappedDataList } = processCrossSheetMappings(
    primarySheetData,
    edgeCaseMapping,
    edgeCaseData
  );

  console.log('映射结果:', JSON.stringify(mappedDataList, null, 2));

  // 验证：只有最后一条数据应该有value
  const passed =
    mappedDataList[0].value === '' &&
    mappedDataList[1].value === '' &&
    mappedDataList[2].value === '' &&
    mappedDataList[3].value === '匹配成功';

  console.log('测试结果:', passed ? '✓ 通过' : '✗ 失败');

  return passed;
}

// ===== 运行所有测试 =====

function runAllTests() {
  console.log('========================================');
  console.log('跨Sheet查找功能 - 测试套件');
  console.log('========================================');

  const results = {
    '测试1 - 基本跨Sheet查找': testBasicCrossSheetLookup(),
    '测试2 - 单Sheet场景': testSingleSheetScenario(),
    '测试3 - 来源Sheet不存在': testNonExistentSourceSheet(),
    '测试4 - 性能测试': testPerformance(),
    '测试5 - 边界情况': testEdgeCases()
  };

  console.log('\n========================================');
  console.log('测试总结');
  console.log('========================================');

  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(r => r).length;

  Object.entries(results).forEach(([name, passed]) => {
    console.log(`${passed ? '✓' : '✗'} ${name}`);
  });

  console.log('\n总计:', `${passedTests}/${totalTests} 通过`);
  console.log('成功率:', `${((passedTests / totalTests) * 100).toFixed(1)}%`);

  return passedTests === totalTests;
}

// 如果直接运行此文件
// 如果直接运行此文件
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// 检测是否直接运行
const isDirectRun = () => {
  try {
    // ESM 环境
    if (import.meta && import.meta.url) {
      const currentFile = fileURLToPath(import.meta.url);
      const executedFile = process.argv[1];
      return currentFile === executedFile || executedFile.endsWith(currentFile);
    }
  } catch (e) {
    // 忽略错误
  }
  return false;
};

if (isDirectRun()) {
  const allPassed = runAllTests();
  process.exit(allPassed ? 0 : 1);
}

export {
  buildLookupIndex,
  processCrossSheetMappings,
  createTestData,
  runAllTests
};
