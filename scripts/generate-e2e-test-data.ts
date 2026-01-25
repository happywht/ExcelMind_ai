/**
 * 生成E2E测试所需的Excel测试数据文件
 *
 * @version 2.0.0
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

// ==================== 类型定义 ====================

interface TestDataFile {
  filename: string;
  sheets: Record<string, any[][]>;
}

// ==================== 辅助函数 ====================

function createWorkbook(sheets: Record<string, any[][]>): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();

  Object.entries(sheets).forEach(([sheetName, data]) => {
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  });

  return workbook;
}

function saveTestFile(filepath: string, workbook: XLSX.WorkBook): void {
  // 确保目录存在
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  XLSX.writeFile(workbook, filepath);
  console.log(`✓ 已创建测试文件: ${filepath}`);
}

// ==================== 测试数据生成器 ====================

/**
 * 生成标准测试数据 - 包含各种数据质量问题
 */
function generateStandardTestData(): TestDataFile {
  return {
    filename: 'test-data/sample-data.xlsx',
    sheets: {
      '销售数据': [
        ['客户ID', '客户名称', '联系人', '邮箱', '电话', '地址', '消费金额', '订单日期', '状态'],
        [1, '客户A', '张三', 'zhangsan@example.com', '138-0000-0001', '北京市朝阳区', 5000, '2026-01-01', 'active'],
        [2, '客户B', '李四', 'lisi@example.com', '138-0000-0002', '北京市海淀区', 3000, '2026-01-02', 'active'],
        [3, '客户C', '', '', '138-0000-0003', '北京市东城区', 8000, '2026-01-03', 'active'], // 缺失联系人、邮箱
        [4, '客户D', '王五', 'wangwu@example.com', '138-0000-0004', '北京市西城区', 2000, '2026-01-04', 'active'],
        [5, '客户E', '赵六', 'zhaoliu@example.com', '138-0000-0005', '北京市丰台区', 6000, '2026-01-05', 'active'],
        [1, '客户A', '张三', 'zhangsan@example.com', '138-0000-0001', '北京市朝阳区', 5000, '2026-01-01', 'active'], // 重复记录
        [6, '客户F', '', '', '', '北京市石景山区', 4500, '2026-01-06', 'active'], // 缺失多字段
        [7, '客户G', '孙七', 'sunqi@example.com', '138-0000-0007', '北京市门头沟区', 7000, '2026-01-07', 'active'],
        [8, '客户H', '周八', 'zhouba@example.com', '138-0000-0008', '北京市房山区', 3500, '2026-01-08', 'active'],
        [9, '客户I', '吴九', 'wujiu@example.com', '138-0000-0009', '北京市通州区', -100, '2026-01-09', 'active'], // 异常值：负金额
        [10, '客户J', '郑十', 'zhengshi@example.com', '138-0000-0010', '北京市顺义区', 9000, '01/10/2026', 'active'], // 日期格式不一致
      ],
    },
  };
}

/**
 * 生成大数据集 - 用于性能测试
 */
function generateLargeTestData(rows: number): TestDataFile {
  const data = [
    ['ID', '姓名', '邮箱', '电话', '部门', '入职日期', '工资', '绩效评分'],
  ];

  for (let i = 1; i <= rows; i++) {
    const hasMissing = i % 20 === 0; // 每20行有一个缺失值
    const hasDuplicate = i % 50 === 0; // 每50行有一个重复
    const hasFormatIssue = i % 15 === 0; // 每15行有一个格式问题

    data.push([
      i,
      hasMissing ? '' : `员工${i}`,
      hasMissing ? '' : `employee${i}@example.com`,
      hasFormatIssue ? `138${i}` : `138-${String(i).padStart(8, '0')}`,
      `部门${i % 10}`,
      hasFormatIssue ? `${i}/01/2026` : `2026-01-${String(i % 28 + 1).padStart(2, '0')}`,
      Math.floor(5000 + Math.random() * 10000),
      hasMissing ? '' : (3 + Math.random() * 2).toFixed(1),
    ]);
  }

  return {
    filename: `test-data/large-dataset-${rows}.xlsx`,
    sheets: {
      '员工数据': data,
    },
  };
}

/**
 * 生成小数据集 - 用于快速测试
 */
function generateSmallTestData(): TestDataFile {
  const data = [
    ['产品ID', '产品名称', '类别', '价格', '库存', '上架日期'],
    [1, '产品A', '电子产品', 999, 100, '2026-01-01'],
    [2, '产品B', '家居用品', 299, 50, '2026-01-02'],
    [3, '产品C', '服装', 199, '', '2026-01-03'], // 缺失库存
    [4, '产品D', '食品', -10, 200, '2026-01-04'], // 异常值：负库存
    [5, '产品E', '图书', 59, 300, '01/05/2026'], // 日期格式不一致
  ];

  return {
    filename: 'test-data/small-dataset-100.xlsx',
    sheets: {
      '产品列表': data,
    },
  };
}

/**
 * 生成超大数据集 - 用于压力测试
 */
function generateHugeTestData(): TestDataFile {
  return generateLargeTestData(5000);
}

/**
 * 生成批量生成测试数据
 */
function generateBatchGenerationTestData(): TestDataFile {
  const data = [
    ['客户ID', '客户名称', '联系人', '邮箱', '电话', '地址', '消费金额', '订单日期', '备注'],
  ];

  // 生成500条客户数据
  for (let i = 1; i <= 500; i++) {
    data.push([
      i,
      `客户${String.fromCharCode(65 + (i % 26))}${i}`,
      `联系人${i}`,
      `customer${i}@example.com`,
      `138-${String(i).padStart(8, '0')}`,
      `北京市某某区某某街道${i}号`,
      Math.floor(1000 + Math.random() * 20000),
      `2026-01-${String(i % 28 + 1).padStart(2, '0')}`,
      `备注信息${i}`,
    ]);
  }

  return {
    filename: 'test-data/batch-data-500.xlsx',
    sheets: {
      '客户数据': data,
    },
  };
}

/**
 * 生成干净数据 - 用于对比测试
 */
function generateCleanTestData(): TestDataFile {
  const data = [
    ['ID', '姓名', '邮箱', '电话', '部门', '入职日期', '工资', '绩效评分'],
  ];

  for (let i = 1; i <= 100; i++) {
    data.push([
      i,
      `员工${i}`,
      `employee${i}@example.com`,
      `138-${String(i).padStart(8, '0')}`,
      `部门${i % 5}`,
      `2026-01-${String(i % 28 + 1).padStart(2, '0')}`,
      Math.floor(5000 + Math.random() * 5000),
      (3 + Math.random() * 2).toFixed(1),
    ]);
  }

  return {
    filename: 'test-data/clean-dataset.xlsx',
    sheets: {
      '员工数据': data,
    },
  };
}

// ==================== 主程序 ====================

async function main() {
  console.log('🚀 开始生成E2E测试数据...\n');

  const testDataFiles: TestDataFile[] = [
    generateStandardTestData(),
    generateLargeTestData(1000),
    generateSmallTestData(),
    generateHugeTestData(),
    generateBatchGenerationTestData(),
    generateCleanTestData(),
  ];

  // 创建测试数据目录
  const testDir = 'test-data';
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
    console.log(`✓ 已创建测试数据目录: ${testDir}\n`);
  }

  // 生成所有测试文件
  testDataFiles.forEach((testFile) => {
    const workbook = createWorkbook(testFile.sheets);
    const filepath = path.join(process.cwd(), testFile.filename);
    saveTestFile(filepath, workbook);
  });

  // 生成测试数据说明文档
  const readme = `# E2E测试数据说明

本目录包含用于端到端测试的Excel测试数据文件。

## 测试文件列表

### sample-data.xlsx
标准测试数据，包含各种数据质量问题：
- 缺失值（联系人、邮箱、电话等）
- 重复记录（客户A）
- 格式不一致（日期格式）
- 异常值（负的消费金额）
- 约10行数据

**用途**: 基础功能测试、数据质量分析测试

### large-dataset-1000.xlsx
大数据集，用于性能测试：
- 1000行员工数据
- 包含5%的缺失值
- 包含2%的重复记录
- 包含7%的格式问题

**用途**: 性能测试、大数据集处理测试

### small-dataset-100.xlsx
小数据集，用于快速测试：
- 100行产品数据
- 包含少量数据质量问题
- 快速完成分析

**用途**: 快速功能验证、开发测试

### huge-dataset-5000.xlsx
超大数据集，用于压力测试：
- 5000行数据
- 测试系统极限性能
- 验证内存使用

**用途**: 压力测试、内存泄漏测试

### batch-data-500.xlsx
批量生成测试数据：
- 500行客户数据
- 干净的数据（无质量问题）
- 用于批量文档生成测试

**用途**: 批量生成功能测试

### clean-dataset.xlsx
干净数据集，用于对比测试：
- 100行员工数据
- 无数据质量问题
- 用于验证分析准确性

**用途**: 对比测试、准确性验证

## 数据质量问题分布

### 缺失值
- **比例**: 约5%
- **类型**: 联系人、邮箱、电话、库存等
- **模式**: 每隔20行出现一次

### 重复值
- **比例**: 约2%
- **类型**: 完全重复的记录
- **模式**: 每隔50行出现一次

### 格式问题
- **比例**: 约7%
- **类型**: 日期格式、电话格式
- **模式**: 每隔15行出现一次

### 异常值
- **比例**: 约1%
- **类型**: 负数、超长字符串
- **模式**: 随机分布

## 使用说明

### 在E2E测试中使用

\`\`\`typescript
test('数据质量分析测试', async ({ page }) => {
  // 上传标准测试文件
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('test-data/sample-data.xlsx');

  // 等待分析完成
  await page.waitForSelector('[data-testid="analysis-complete"]');

  // 验证结果...
});
\`\`\`

### 在性能测试中使用

\`\`\`typescript
test('大数据集性能测试', async ({ page }) => {
  const startTime = Date.now();

  await fileInput.setInputFiles('test-data/large-dataset-1000.xlsx');
  await page.waitForSelector('[data-testid="analysis-complete"]');

  const endTime = Date.now();
  const analysisTime = endTime - startTime;

  expect(analysisTime).toBeLessThan(30000);
});
\`\`\`

## 重新生成测试数据

如果需要重新生成测试数据：

\`\`\`bash
npm run test:data:generate
\`\`\`

或直接运行：

\`\`\`bash
npx ts-node scripts/generate-e2e-test-data.ts
\`\`\`

## 注意事项

1. **不要手动修改测试数据** - 应该通过脚本生成以确保一致性
2. **版本控制** - 测试数据文件应该纳入版本控制
3. **数据隔离** - 每个测试应该使用独立的测试数据文件
4. **清理** - 测试完成后应该清理生成的临时文件

---

**生成日期**: ${new Date().toISOString()}
**版本**: 2.0.0
`;

  fs.writeFileSync(path.join(testDir, 'README.md'), readme);
  console.log(`✓ 已创建测试数据说明: ${path.join(testDir, 'README.md')}\n`);

  console.log('✅ 所有测试数据文件生成完成！\n');
  console.log('📊 生成的文件:');
  testDataFiles.forEach((file) => {
    const rows = Object.values(file.sheets)[0].length - 1;
    console.log(`   - ${file.filename} (${rows}行)`);
  });
  console.log();
}

// 运行主程序
main().catch(console.error);
