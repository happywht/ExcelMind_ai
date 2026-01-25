/**
 * 生成多Sheet测试Excel文件
 *
 * 生成两个测试文件：
 * 1. test-multisheet-employee.xlsx - 员工表 + 部门表
 * 2. test-multisheet-order.xlsx - 订单表 + 产品表 + 客户表
 */

import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// ES模块中获取__dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 确保测试文件目录存在
const testFilesDir = path.join(__dirname, '../public/test-files');
if (!fs.existsSync(testFilesDir)) {
  fs.mkdirSync(testFilesDir, { recursive: true });
}

// 生成员工+部门表Excel
function generateEmployeeDeptExcel() {
  // 员工表数据
  const employeeData = [
    { '员工ID': 'E001', '姓名': '张三', '部门ID': 'D001', '职位': '工程师', '工资': 15000 },
    { '员工ID': 'E002', '姓名': '李四', '部门ID': 'D002', '职位': '设计师', '工资': 12000 },
    { '员工ID': 'E003', '姓名': '王五', '部门ID': 'D001', '职位': '高级工程师', '工资': 20000 },
    { '员工ID': 'E004', '姓名': '赵六', '部门ID': 'D003', '职位': '产品经理', '工资': 18000 },
    { '员工ID': 'E005', '姓名': '钱七', '部门ID': 'D002', '职位': 'UI设计师', '工资': 13000 },
    { '员工ID': 'E006', '姓名': '孙八', '部门ID': 'D001', '职位': '技术主管', '工资': 25000 },
    { '员工ID': 'E007', '姓名': '周九', '部门ID': 'D004', '职位': '销售经理', '工资': 16000 },
    { '员工ID': 'E008', '姓名': '吴十', '部门ID': 'D003', '职位': '产品专员', '工资': 11000 }
  ];

  // 部门表数据
  const departmentData = [
    { '部门ID': 'D001', '部门名称': '技术部', '部门地址': 'A栋301' },
    { '部门ID': 'D002', '部门名称': '设计部', '部门地址': 'A栋302' },
    { '部门ID': 'D003', '部门名称': '产品部', '部门地址': 'B栋201' },
    { '部门ID': 'D004', '部门名称': '销售部', '部门地址': 'B栋202' },
    { '部门ID': 'D005', '部门名称': '市场部', '部门地址': 'B栋301' }
  ];

  // 创建工作簿
  const workbook = XLSX.utils.book_new();

  // 添加员工表
  const employeeSheet = XLSX.utils.json_to_sheet(employeeData);
  XLSX.utils.book_append_sheet(workbook, employeeSheet, '员工表');

  // 添加部门表
  const departmentSheet = XLSX.utils.json_to_sheet(departmentData);
  XLSX.utils.book_append_sheet(workbook, departmentSheet, '部门表');

  // 保存文件
  const filePath = path.join(testFilesDir, 'test-multisheet-employee.xlsx');
  XLSX.writeFile(workbook, filePath);

  console.log(`✓ 已生成: ${filePath}`);
  console.log(`  - 员工表: ${employeeData.length} 条记录`);
  console.log(`  - 部门表: ${departmentData.length} 条记录`);

  return filePath;
}

// 生成订单+产品+客户表Excel
function generateOrderProductCustomerExcel() {
  // 订单表数据
  const orderData = [
    { '订单ID': 'O001', '产品ID': 'P001', '客户ID': 'C001', '数量': 2, '日期': '2024-01-15' },
    { '订单ID': 'O002', '产品ID': 'P002', '客户ID': 'C002', '数量': 1, '日期': '2024-01-16' },
    { '订单ID': 'O003', '产品ID': 'P001', '客户ID': 'C003', '数量': 5, '日期': '2024-01-17' },
    { '订单ID': 'O004', '产品ID': 'P003', '客户ID': 'C001', '数量': 3, '日期': '2024-01-18' },
    { '订单ID': 'O005', '产品ID': 'P004', '客户ID': 'C004', '数量': 1, '日期': '2024-01-19' },
    { '订单ID': 'O006', '产品ID': 'P002', '客户ID': 'C005', '数量': 2, '日期': '2024-01-20' },
    { '订单ID': 'O007', '产品ID': 'P005', '客户ID': 'C002', '数量': 4, '日期': '2024-01-21' },
    { '订单ID': 'O008', '产品ID': 'P003', '客户ID': 'C006', '数量': 1, '日期': '2024-01-22' }
  ];

  // 产品表数据
  const productData = [
    { '产品ID': 'P001', '产品名': '笔记本电脑', '单价': 5999 },
    { '产品ID': 'P002', '产品名': '无线鼠标', '单价': 199 },
    { '产品ID': 'P003', '产品名': '机械键盘', '单价': 699 },
    { '产品ID': 'P004', '产品名': '显示器', '单价': 1299 },
    { '产品ID': 'P005', '产品名': '耳机', '单价': 399 },
    { '产品ID': 'P006', '产品名': '摄像头', '单价': 299 }
  ];

  // 客户表数据
  const customerData = [
    { '客户ID': 'C001', '客户名': '腾讯科技', '地址': '深圳市南山区', '电话': '0755-12345678' },
    { '客户ID': 'C002', '客户名': '阿里巴巴', '地址': '杭州市余杭区', '电话': '0571-87654321' },
    { '客户ID': 'C003', '客户名': '百度在线', '地址': '北京市海淀区', '电话': '010-11112222' },
    { '客户ID': 'C004', '客户名': '字节跳动', '地址': '北京市海淀区', '电话': '010-33334444' },
    { '客户ID': 'C005', '客户名': '美团', '地址': '北京市朝阳区', '电话': '010-55556666' },
    { '客户ID': 'C006', '客户名': '京东集团', '地址': '北京市大兴区', '电话': '010-77778888' }
  ];

  // 创建工作簿
  const workbook = XLSX.utils.book_new();

  // 添加订单表
  const orderSheet = XLSX.utils.json_to_sheet(orderData);
  XLSX.utils.book_append_sheet(workbook, orderSheet, '订单表');

  // 添加产品表
  const productSheet = XLSX.utils.json_to_sheet(productData);
  XLSX.utils.book_append_sheet(workbook, productSheet, '产品表');

  // 添加客户表
  const customerSheet = XLSX.utils.json_to_sheet(customerData);
  XLSX.utils.book_append_sheet(workbook, customerSheet, '客户表');

  // 保存文件
  const filePath = path.join(testFilesDir, 'test-multisheet-order.xlsx');
  XLSX.writeFile(workbook, filePath);

  console.log(`✓ 已生成: ${filePath}`);
  console.log(`  - 订单表: ${orderData.length} 条记录`);
  console.log(`  - 产品表: ${productData.length} 条记录`);
  console.log(`  - 客户表: ${customerData.length} 条记录`);

  return filePath;
}

// 生成单Sheet测试文件（用于错误处理测试）
function generateSingleSheetExcel() {
  const data = [
    { 'ID': '1', '名称': '测试项1', '值': 100 },
    { 'ID': '2', '名称': '测试项2', '值': 200 },
    { 'ID': '3', '名称': '测试项3', '值': 300 }
  ];

  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(workbook, sheet, '数据');

  const filePath = path.join(testFilesDir, 'test-single-sheet.xlsx');
  XLSX.writeFile(workbook, filePath);

  console.log(`✓ 已生成: ${filePath}`);
  console.log(`  - 数据表: ${data.length} 条记录`);

  return filePath;
}

// 主函数
function main() {
  console.log('========== 生成测试Excel文件 ==========\n');

  try {
    generateEmployeeDeptExcel();
    console.log('');

    generateOrderProductCustomerExcel();
    console.log('');

    generateSingleSheetExcel();
    console.log('');

    console.log('========== 所有测试文件生成完成 ==========');
    console.log(`\n文件位置: ${testFilesDir}`);
  } catch (error) {
    console.error('生成文件时出错:', error);
    process.exit(1);
  }
}

// 运行
main();

// 导出函数（如果需要）
export {
  generateEmployeeDeptExcel,
  generateOrderProductCustomerExcel,
  generateSingleSheetExcel
};
