/**
 * 跨Sheet查找功能测试用例
 * 运行方式: node tests/crossSheetLookup.test.js
 */

// ===== 测试数据 =====

function createTestData() {
  const excelData = {
    sheets: {
      '员工表': [
        { 姓名: '小明', 部门ID: 'D001', 职位: '工程师' },
        { 姓名: '小红', 部门ID: 'D002', 职位: '专员' },
        { 姓名: '小刚', 部门ID: 'D001', 职位: '架构师' },
        { 姓名: '小丽', 部门ID: 'D003', 职位: '助理' },
        { 姓名: '小华', 部门ID: '', 职位: '实习生' },
        { 姓名: '小龙', 部门ID: 'D999', 职位: '经理' }
      ],
      '部门表': [
        { 部门ID: 'D001', 部门名称: '技术部', 部门经理: '张三' },
        { 部门ID: 'D002', 部门名称: '市场部', 部门经理: '李四' },
        { 部门ID: 'D003', 部门名称: '财务部', 部门经理: '王五' }
      ]
    },
    currentSheetName: '员工表'
  };

  const mappingScheme = {
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
    { 姓名: '小华', 职位: '实习生', 部门名称: '', 部门经理: '' },
    { 姓名: '小龙', 职位: '经理', 部门名称: '', 部门经理: '' }
  ];

  return { excelData, mappingScheme, expectedResult };
}

// ===== 核心函数 =====

function buildLookupIndex(data, keyField) {
  const index = new Map();
  data.forEach(row => {
    const keyValue = String(row[keyField] || '');
    if (keyValue) {
      index.set(keyValue, row);
    }
  });
  return index;
}

function processCrossSheetMappings(primarySheetData, mappingScheme, excelData) {
  const hasCrossSheetMappings = mappingScheme.crossSheetMappings &&
                                 mappingScheme.crossSheetMappings.length > 0;

  const crossSheetIndexes = new Map();
  let totalIndexedRows = 0;

  if (hasCrossSheetMappings) {
    mappingScheme.crossSheetMappings.forEach(crossMapping => {
      const sourceSheet = excelData.sheets[crossMapping.sourceSheet];
      if (sourceSheet) {
        const index = buildLookupIndex(sourceSheet, crossMapping.lookupKey);
        crossSheetIndexes.set(crossMapping.sourceSheet, index);
        totalIndexedRows += sourceSheet.length;
      }
    });
  }

  let crossSheetLookupSuccess = 0;
  let crossSheetLookupTotal = 0;

  const mappedDataList = primarySheetData.map((row) => {
    const mappedData = {};

    mappingScheme.mappings.forEach(mapping => {
      const key = mapping.placeholder.replace(/\{\{|\}\}/g, '').trim();
      mappedData[key] = row[mapping.excelColumn];
    });

    if (hasCrossSheetMappings) {
      mappingScheme.crossSheetMappings.forEach(crossMapping => {
        const lookupValue = String(row[crossMapping.lookupKey] || '');
        const key = crossMapping.placeholder.replace(/\{\{|\}\}/g, '').trim();

        if (!lookupValue) {
          mappedData[key] = '';
          return;
        }

        crossSheetLookupTotal++;

        const sourceIndex = crossSheetIndexes.get(crossMapping.sourceSheet);
        let matchedRow = null;

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

  return {
    mappedDataList,
    stats: {
      crossSheetLookupSuccess,
      crossSheetLookupTotal,
      totalIndexedRows,
      successRate: crossSheetLookupTotal > 0
        ? (crossSheetLookupSuccess / crossSheetLookupTotal) * 100
        : 100
    }
  };
}

// ===== 测试用例 =====

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

  const passed = JSON.stringify(mappedDataList) === JSON.stringify(expectedResult);
  console.log('测试结果:', passed ? '✓ 通过' : '✗ 失败');

  return passed;
}

function testSingleSheetScenario() {
  console.log('\n=== 测试2: 单Sheet场景（无跨Sheet映射） ===');

  const { excelData } = createTestData();

  const singleSheetMapping = {
    explanation: '单Sheet映射',
    filterCondition: null,
    primarySheet: '员工表',
    mappings: [
      { placeholder: '{{姓名}}', excelColumn: '姓名' },
      { placeholder: '{{职位}}', excelColumn: '职位' }
    ],
    unmappedPlaceholders: []
  };

  const primarySheetData = excelData.sheets[singleSheetMapping.primarySheet];
  const { mappedDataList, stats } = processCrossSheetMappings(
    primarySheetData,
    singleSheetMapping,
    excelData
  );

  console.log('映射结果:', JSON.stringify(mappedDataList, null, 2));
  console.log('统计信息:', stats);

  const passed = mappedDataList.every(item =>
    item.hasOwnProperty('姓名') &&
    item.hasOwnProperty('职位') &&
    !item.hasOwnProperty('部门名称')
  );

  console.log('测试结果:', passed ? '✓ 通过' : '✗ 失败');

  return passed;
}

function testPerformance() {
  console.log('\n=== 测试3: 性能测试（大数据量） ===');

  const largeEmployeeData = [];
  const largeDepartmentData = [];

  for (let i = 1; i <= 100; i++) {
    largeDepartmentData.push({
      部门ID: `D${String(i).padStart(3, '0')}`,
      部门名称: `部门${i}`,
      部门经理: `经理${i}`
    });
  }

  for (let i = 1; i <= 10000; i++) {
    const deptId = `D${String(Math.floor(Math.random() * 100) + 1).padStart(3, '0')}`;
    largeEmployeeData.push({
      姓名: `员工${i}`,
      部门ID: deptId,
      职位: '员工'
    });
  }

  const largeExcelData = {
    sheets: {
      '员工表': largeEmployeeData,
      '部门表': largeDepartmentData
    },
    currentSheetName: '员工表'
  };

  const largeMappingScheme = {
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
    映射数: largeMappingScheme.mappings.length + largeMappingScheme.crossSheetMappings.length
  });
  console.log('处理耗时:', duration, 'ms');
  console.log('平均每行耗时:', (duration / largeEmployeeData.length).toFixed(2), 'ms');
  console.log('统计信息:', stats);

  const passed = mappedDataList.length === largeEmployeeData.length &&
                 stats.successRate === 100;

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
    '测试3 - 性能测试': testPerformance()
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

// 运行测试
const allPassed = runAllTests();
process.exit(allPassed ? 0 : 1);
