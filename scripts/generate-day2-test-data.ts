/**
 * Day 2 测试数据生成脚本
 *
 * 生成测试所需的Excel和Word文档
 */

import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const TEST_DATA_DIR = path.join(process.cwd(), 'test-data');

// 确保测试数据目录存在
if (!fs.existsSync(TEST_DATA_DIR)) {
  fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
}

/**
 * 生成Excel测试数据
 */
function generateExcelTestData() {
  console.log('生成Excel测试数据...');

  // 模拟100行客户数据
  const customers = [];
  const categories = ['VIP', '普通', '潜在', '流失'];
  const cities = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '西安'];

  for (let i = 1; i <= 100; i++) {
    // 模拟缺失值（5%概率）
    const hasMissing = Math.random() < 0.05;

    // 模拟异常值（3%概率）
    const hasAnomaly = Math.random() < 0.03;

    customers.push({
      '客户ID': `CUST${String(i).padStart(4, '0')}`,
      '客户名称': `客户${i}`,
      '联系人': hasMissing ? '' : `张${i}`,
      '电话': hasMissing ? '' : `138${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
      '邮箱': `customer${i}@example.com`,
      '类别': categories[Math.floor(Math.random() * categories.length)],
      '城市': cities[Math.floor(Math.random() * cities.length)],
      '地址': `${cities[Math.floor(Math.random() * cities.length)]}市某某区某某街道${i}号`,
      '注册日期': new Date(2023 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
      '消费金额': hasAnomaly ? -100 : Math.floor(Math.random() * 50000) + 1000,
      '订单数量': Math.floor(Math.random() * 100) + 1,
      '会员等级': Math.floor(Math.random() * 5) + 1,
      '备注': i % 20 === 0 ? '重要客户' : ''
    });
  }

  // 添加一些重复行（模拟重复数据）
  customers.push(...customers.slice(0, 3));

  // 创建工作簿
  const worksheet = XLSX.utils.json_to_sheet(customers);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '客户数据');

  // 保存文件
  const outputPath = path.join(TEST_DATA_DIR, 'sample-data.xlsx');
  XLSX.writeFile(workbook, outputPath);

  console.log(`✓ Excel测试数据已生成: ${outputPath}`);
  console.log(`  - 总行数: ${customers.length}`);
  console.log(`  - 包含: 缺失值、异常值、重复值`);
}

/**
 * 生成Word模板说明
 */
function generateWordTemplateReadme() {
  console.log('\n生成Word模板说明...');

  const readmeContent = `# Word模板使用说明

## 模板变量

以下变量可以在模板中使用：

### 基本变量
- {{客户名称}} - 客户名称
- {{客户ID}} - 客户ID
- {{联系人}} - 联系人姓名
- {{电话}} - 联系电话
- {{邮箱}} - 电子邮箱
- {{地址}} - 详细地址

### 分类变量
- {{类别}} - 客户类别（VIP/普通/潜在/流失）
- {{城市}} - 所在城市
- {{会员等级}} - 会员等级（1-5）

### 业务变量
- {{注册日期}} - 注册日期
- {{消费金额}} - 总消费金额
- {{订单数量}} - 订单数量
- {{备注}} - 备注信息

### 循环变量
- {{#订单列表}} ... {{/订单列表}} - 订单列表循环

## 模板示例

\`\`\`
尊敬的{{客户名称}}：

您好！感谢您成为我们的{{类别}}客户。

您的会员等级为：{{会员等级}}
累计消费：¥{{消费金额}}
订单数量：{{订单数量}}个

我们会继续为您提供优质服务。

此致
敬礼！

{{日期}}
\`\`\`

## 创建自定义模板

1. 在Microsoft Word中创建文档
2. 使用 {{变量名}} 格式插入变量
3. 保存为.docx格式
4. 通过模板管理功能上传

## 注意事项

- 变量名必须与数据字段完全匹配
- 支持条件判断：{{#if 条件}} ... {{/if}}
- 支持循环：{{#list}} ... {{/list}}
- 建议使用.docx格式（不支持.doc）
`;

  const readmePath = path.join(TEST_DATA_DIR, 'word-template-guide.md');
  fs.writeFileSync(readmePath, readmeContent, 'utf-8');

  console.log(`✓ Word模板说明已生成: ${readmePath}`);
}

/**
 * 生成API测试数据
 */
function generateAPITestData() {
  console.log('\n生成API测试数据...');

  const testData = {
    templates: [
      {
        templateId: 'tpl-001',
        name: '客户通知模板',
        category: '客户管理',
        description: '用于向客户发送通知的标准模板',
        variables: ['客户名称', '客户ID', '日期', '内容']
      },
      {
        templateId: 'tpl-002',
        name: '订单确认模板',
        category: '订单管理',
        description: '订单确认函模板',
        variables: ['订单号', '客户名称', '产品列表', '总金额', '日期']
      }
    ],
    batchTasks: [
      {
        taskId: 'task-001',
        templateId: 'tpl-001',
        status: 'processing',
        progress: 45,
        total: 100,
        completed: 45,
        failed: 2
      }
    ],
    dataQuality: {
      totalRows: 100,
      validRows: 92,
      missingValues: 5,
      duplicates: 3,
      anomalies: 2,
      score: 92
    }
  };

  const testDataPath = path.join(TEST_DATA_DIR, 'api-test-data.json');
  fs.writeFileSync(testDataPath, JSON.stringify(testData, null, 2), 'utf-8');

  console.log(`✓ API测试数据已生成: ${testDataPath}`);
}

// 主函数
function main() {
  console.log('========================================');
  console.log('Day 2 测试数据生成');
  console.log('========================================\n');

  try {
    generateExcelTestData();
    generateWordTemplateReadme();
    generateAPITestData();

    console.log('\n========================================');
    console.log('✅ 测试数据生成完成');
    console.log('========================================');
    console.log('\n测试数据位置:');
    console.log(`- Excel: ${path.join(TEST_DATA_DIR, 'sample-data.xlsx')}`);
    console.log(`- Word说明: ${path.join(TEST_DATA_DIR, 'word-template-guide.md')}`);
    console.log(`- API数据: ${path.join(TEST_DATA_DIR, 'api-test-data.json')}`);
  } catch (error) {
    console.error('\n❌ 生成测试数据失败:', error);
    process.exit(1);
  }
}

main();
