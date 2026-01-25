/**
 * SmartExcel 多Sheet功能使用示例
 *
 * 本文件包含真实场景中的多Sheet操作示例
 */

// ============================================
// 示例1：员工薪资管理系统
// ============================================

/**
 * 场景：Excel文件包含3个sheets
 * - 员工信息：员工基本信息
 * - 薪资数据：每月薪资明细
 * - 考勤记录：出勤情况
 */

// 用户指令示例：
/*
指令1：跨Sheet数据查询
"找出考勤天数少于20天的员工，并显示他们的薪资信息"

指令2：跨Sheet数据更新
"根据考勤记录，计算实际工资（基本工资 * 出勤天数 / 22）"

指令3：创建汇总报表
"创建一个新的分析文件，包含两个sheets：
 1. 部门工资汇总（按部门统计总工资）
 2. 异常考勤名单（考勤不足的员工）"
*/

// AI生成的代码示例（指令1）：
const code1 = `
const employees = files['员工管理.xlsx']['员工信息'];
const salaries = files['员工管理.xlsx']['薪资数据'];
const attendance = files['员工管理.xlsx']['考勤记录'];

// 找出考勤不足的员工
const lowAttendance = attendance.filter(a => a.出勤天数 < 20);

// 关联薪资信息
const result = lowAttendance.map(att => {
  const emp = employees.find(e => e.员工ID === att.员工ID);
  const salary = salaries.find(s => s.员工ID === att.员工ID);

  return {
    员工ID: att.员工ID,
    姓名: emp ? emp.姓名 : '未知',
    部门: emp ? emp.部门 : '未知',
    出勤天数: att.出勤天数,
    基本工资: salary ? salary.基本工资 : 0,
    绩效工资: salary ? salary.绩效工资 : 0
  };
});

files['考勤异常.xlsx'] = { '异常名单': result };
return files;
`;

// AI生成的代码示例（指令2）：
const code2 = `
const employees = files['员工管理.xlsx']['员工信息'];
const salaries = files['员工管理.xlsx']['薪资数据'];
const attendance = files['员工管理.xlsx']['考勤记录'];

// 计算实际工资
const updatedSalaries = salaries.map(salary => {
  const att = attendance.find(a => a.员工ID === salary.员工ID);
  const attendanceDays = att ? att.出勤天数 : 22;
  const baseSalary = salary.基本工资 || 0;

  return {
    ...salary,
    出勤天数: attendanceDays,
    实际工资: Math.round(baseSalary * attendanceDays / 22)
  };
});

files['员工管理.xlsx']['薪资数据'] = updatedSalaries;
return files;
`;

// AI生成的代码示例（指令3）：
const code3 = `
const employees = files['员工管理.xlsx']['员工信息'];
const salaries = files['员工管理.xlsx']['薪资数据'];
const attendance = files['员工管理.xlsx']['考勤记录'];

// 部门工资汇总
const deptSummary = {};
employees.forEach(emp => {
  if (!deptSummary[emp.部门]) {
    deptSummary[emp.部门] = { 部门: emp.部门, 人数: 0, 工资总额: 0 };
  }
  deptSummary[emp.部门].人数 += 1;

  const salary = salaries.find(s => s.员工ID === emp.员工ID);
  if (salary) {
    deptSummary[emp.部门].工资总额 += salary.基本工资 + (salary.绩效工资 || 0);
  }
});

const summaryData = Object.values(deptSummary);

// 异常考勤名单
const abnormalAttendance = attendance.filter(a => a.出勤天数 < 20).map(att => {
  const emp = employees.find(e => e.员工ID === att.员工ID);
  return {
    员工ID: att.员工ID,
    姓名: emp ? emp.姓名 : '未知',
    部门: emp ? emp.部门 : '未知',
    出勤天数: att.出勤天数
  };
});

files['月度分析.xlsx'] = {
  '部门工资汇总': summaryData,
  '异常考勤名单': abnormalAttendance
};

return files;
`;

// ============================================
// 示例2：销售数据分析
// ============================================

/**
 * 场景：Excel文件包含多个销售相关的sheets
 * - 产品信息：产品目录和价格
 * - 销售记录：每笔销售交易
 * - 客户信息：客户基本资料
 * - 退货记录：退货明细
 */

// 用户指令示例：
/*
指令1：销售业绩统计
"统计每个产品的总销售额和销量，从销售记录和产品信息中获取数据"

指令2：客户购买分析
"找出购买金额最高的前10名客户，显示他们的详细信息和购买历史"

指令3：产品销售趋势
"创建一个新的报表，包含：
 1. 畅销产品榜（按销量排序）
 2. 滞销产品榜（销量为0或很低）
 3. 高利润产品（销售额 - 成本最高的产品）"
*/

// AI生成的代码示例：
const code4 = `
const products = files['销售数据.xlsx']['产品信息'];
const sales = files['销售数据.xlsx']['销售记录'];
const customers = files['销售数据.xlsx']['客户信息'];

// 计算每个产品的销售统计
const productStats = {};
sales.forEach(sale => {
  if (!productStats[sale.产品ID]) {
    const product = products.find(p => p.产品ID === sale.产品ID);
    productStats[sale.产品ID] = {
      产品ID: sale.产品ID,
      产品名称: product ? product.产品名称 : '未知',
      单价: product ? product.单价 : 0,
      销量: 0,
      销售额: 0
    };
  }

  productStats[sale.产品ID].销量 += sale.数量;
  productStats[sale.产品ID].销售额 += sale.金额;
});

const statsData = Object.values(productStats).sort((a, b) => b.销售额 - a.销售额);

files['销售分析.xlsx'] = { '产品销售统计': statsData };
return files;
`;

// ============================================
// 示例3：财务报表合并
// ============================================

/**
 * 场景：多个部门的财务报表需要合并
 * - 每个部门有自己的Excel文件
 * - 需要生成公司整体财务报表
 */

// 用户指令示例：
/*
"合并所有部门的财务数据，生成公司整体报表，
包含各部门数据和汇总数据"
*/

// 假设有以下文件：
// - 技术部财务.xlsx
// - 销售部财务.xlsx
// - 市场部财务.xlsx

// AI生成的代码示例：
const code5 = `
const tech = files['技术部财务.xlsx'];
const sales = files['销售部财务.xlsx'];
const marketing = files['市场部财务.xlsx'];

// 获取各部数据（假设每个文件只有一个sheet）
const techData = Array.isArray(tech) ? tech : tech['Sheet1'];
const salesData = Array.isArray(sales) ? sales : sales['Sheet1'];
const marketingData = Array.isArray(marketing) ? marketing : marketing['Sheet1'];

// 计算公司汇总
const companySummary = {
  部门: '公司总计',
  收入: techData[0].收入 + salesData[0].收入 + marketingData[0].收入,
  支出: techData[0].支出 + salesData[0].支出 + marketingData[0].支出,
  利润: 0
};
companySummary.利润 = companySummary.收入 - companySummary.支出;

// 创建公司报表
files['公司财务报表.xlsx'] = {
  '技术部': techData,
  '销售部': salesData,
  '市场部': marketingData,
  '公司汇总': [companySummary]
};

return files;
`;

// ============================================
// 示例4：库存管理
// ============================================

/**
 * 场景：仓库管理系统
 * - 库存清单：当前库存数量
 * - 入库记录：所有入库操作
 * - 出库记录：所有出库操作
 * - 采购订单：待处理的采购
 */

// 用户指令示例：
/*
"分析库存数据，找出：
1. 库存不足的商品（库存 < 安全库存）
2. 滞销商品（30天内无出库记录）
3. 需要补货的商品"

并生成一个包含三个sheets的采购建议报表
*/

// AI生成的代码示例：
const code6 = `
const inventory = files['库存管理.xlsx']['库存清单'];
const outbound = files['库存管理.xlsx']['出库记录'];

// 库存不足的商品
const lowStock = inventory.filter(item => item.当前库存 < item.安全库存);

// 计算每个商品的最近出库时间
const lastOutbound = {};
outbound.forEach(record => {
  if (!lastOutbound[record.商品ID] || record.日期 > lastOutbound[record.商品ID]) {
    lastOutbound[record.商品ID] = record.日期;
  }
});

// 滞销商品（30天以上无出库）
const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
const slowMoving = inventory.filter(item => {
  const lastDate = lastOutbound[item.商品ID];
  return !lastDate || new Date(lastDate).getTime() < thirtyDaysAgo;
});

// 需要补货的商品
const needReorder = inventory.filter(item => item.当前库存 < item.补货点);

files['采购建议.xlsx'] = {
  '库存不足': lowStock.map(i => ({
    商品ID: i.商品ID,
    商品名称: i.商品名称,
    当前库存: i.当前库存,
    安全库存: i.安全库存,
    缺口: i.安全库存 - i.当前库存
  })),
  '滞销商品': slowMoving.map(i => ({
    商品ID: i.商品ID,
    商品名称: i.商品名称,
    当前库存: i.当前库存,
    最后出库: lastOutbound[i.商品ID] || '从未出库'
  })),
  '补货建议': needReorder.map(i => ({
    商品ID: i.商品ID,
    商品名称: i.商品名称,
    当前库存: i.当前库存,
    建议补货量: i.最大库存 - i.当前库存,
    优先级: i.当前库存 < i.安全库存 ? '高' : '中'
  }))
};

return files;
`;

// ============================================
// 实用技巧
// ============================================

/**
 * 技巧1：明确指定Sheet名称
 *
 * 好的指令：
 * "使用Sheet2的汇率数据，更新Sheet1的美元金额"
 * "从'员工信息'sheet中查找数据"
 *
 * 避免的指令：
 * "用另一个sheet的数据"
 * "从第二个sheet获取"
 */

/**
 * 技巧2：说明数据关联关系
 *
 * 好的指令：
 * "通过'员工ID'字段，关联Sheet1和Sheet2的数据"
 * "使用产品名称匹配两个sheet的记录"
 *
 * 避免的指令：
 * "合并两个sheet"
 * "把sheet1和sheet2关联起来"
 */

/**
 * 技巧3：明确输出格式
 *
 * 好的指令：
 * "创建一个新文件，包含两个sheets：
  1. 汇总表：按部门统计
  2. 明细表：所有记录"
 *
 * 避免的指令：
 * "生成一个报表"
 * "做一个分析"
 */

/**
 * 技巧4：利用Sheet语义命名
 *
 * 推荐的Sheet命名：
 * - 员工信息（而不是 Sheet1）
 * - 薪资数据（而不是 Sheet2）
 * - 2024年1月（而不是 202401）
 * - 部门A（而不是 A）
 */

export {
  code1,
  code2,
  code3,
  code4,
  code5,
  code6
};

/**
 * 使用说明：
 *
 * 1. 在SmartExcel组件中上传相应的Excel文件
 * 2. 在AI指令输入框中输入上述用户指令
 * 3. 点击"执行智能处理"按钮
 * 4. AI将自动生成并执行相应的代码
 * 5. 查看处理结果和生成的文件
 */
