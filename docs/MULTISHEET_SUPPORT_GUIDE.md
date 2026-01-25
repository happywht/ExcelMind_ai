# SmartExcel 多Sheet支持指南

## 概述

SmartExcel模块现已完全支持多Sheet数据处理，AI可以访问和分析Excel文件中的所有sheets，并支持跨sheet的数据查询和操作。

## 核心功能

### 1. 多Sheet数据识别

系统会自动识别并加载Excel文件中的所有sheets：

```typescript
// ExcelData类型支持多sheet
interface ExcelData {
  id: string;
  fileName: string;
  sheets: { [sheetName: string]: any[] };  // 所有sheets
  currentSheetName: string;                 // 当前活动sheet
  metadata?: { ... };
}
```

### 2. AI上下文增强

AI现在可以接收所有sheets的信息：

```typescript
// 单sheet文件（向后兼容）
files['data.xlsx'] = [
  { name: '张三', age: 30 },
  { name: '李四', age: 25 }
];

// 多sheet文件
files['data.xlsx'] = {
  'Sheet1': [
    { name: '张三', age: 30 },
    { name: '李四', age: 25 }
  ],
  'Sheet2': [
    { name: '张三', salary: 5000 },
    { name: '李四', salary: 4500 }
  ]
};
```

### 3. 跨Sheet操作示例

#### 示例1：跨Sheet数据合并

**用户指令：**
```
将Sheet1的员工信息和Sheet2的薪资信息合并，创建一个新的汇总表
```

**AI生成的代码：**
```javascript
const sheet1 = files['员工表.xlsx']['Sheet1'];
const sheet2 = files['员工表.xlsx']['Sheet2'];

const merged = sheet1.map(emp => {
  const salaryInfo = sheet2.find(s => s.姓名 === emp.姓名);
  return {
    ...emp,
    基本工资: salaryInfo ? salaryInfo.基本工资 : 0
  };
});

files['员工表.xlsx']['Sheet1'] = merged;
return files;
```

#### 示例2：跨Sheet数据查找

**用户指令：**
```
使用Sheet2的部门信息，更新Sheet1中的部门列
```

**AI生成的代码：**
```javascript
const sheet1 = files['数据.xlsx']['Sheet1'];
const sheet2 = files['数据.xlsx']['Sheet2'];

const deptMap = {};
sheet2.forEach(row => {
  deptMap[row.员工ID] = row.部门;
});

const updated = sheet1.map(row => ({
  ...row,
  部门: deptMap[row.员工ID] || '未知'
}));

files['数据.xlsx']['Sheet1'] = updated;
return files;
```

#### 示例3：创建多Sheet结果

**用户指令：**
```
创建一个新文件，包含汇总表和明细表两个sheet
```

**AI生成的代码：**
```javascript
const data = files['原始数据.xlsx']['Sheet1'];

// 汇总表
const summary = [
  { 总人数: data.length },
  { 总金额: data.reduce((sum, r) => sum + r.金额, 0) }
];

// 明细表
const details = data.filter(r => r.金额 > 1000);

files['分析结果.xlsx'] = {
  '汇总': summary,
  '明细': details
};

return files;
```

## 技术实现

### 1. 数据准备阶段

```typescript
// components/SmartExcel.tsx
const filesPreview = filesData.map(f => {
  // 收集所有sheet的信息
  const sheetsInfo: { [sheetName: string]: {
    headers: string[];
    sampleRows: any[];
    rowCount: number;
    metadata?: any;
  }} = {};

  Object.entries(f.sheets).forEach(([sheetName, data]) => {
    const headers = data.length > 0 ? Object.keys(data[0]) : [];
    const sampleRows = data.slice(0, 5);
    const metadata = f.metadata ? f.metadata[sheetName] : undefined;

    sheetsInfo[sheetName] = {
      headers,
      sampleRows,
      rowCount: data.length,
      metadata
    };
  });

  return {
    fileName: f.fileName,
    currentSheetName: f.currentSheetName,
    sheets: sheetsInfo,
    // 向后兼容
    headers: sheetsInfo[f.currentSheetName]?.headers || [],
    sampleRows: sheetsInfo[f.currentSheetName]?.sampleRows || [],
    metadata: sheetsInfo[f.currentSheetName]?.metadata
  };
});
```

### 2. 数据传递策略

```typescript
// 单sheet文件：传递数组（向后兼容）
datasets[f.fileName] = f.sheets[f.currentSheetName] || [];

// 多sheet文件：传递对象
datasets[f.fileName] = f.sheets;
```

### 3. 结果回写逻辑

```typescript
// 支持单数组结果（更新当前sheet）
if (Array.isArray(data)) {
  f.sheets[f.currentSheetName] = data;
}
// 支持多sheet对象结果（更新多个sheets）
else if (typeof data === 'object' && data !== null) {
  Object.entries(data).forEach(([sheetName, sheetData]) => {
    if (Array.isArray(sheetData)) {
      f.sheets[sheetName] = sheetData;
    }
  });
}
```

## AI提示词增强

系统会向AI提供以下信息：

### 单Sheet文件
```
--- FILE: "data.xlsx" ---
HEADERS: ["姓名", "年龄"]
SAMPLE DATA (Top 5 rows):
[{"姓名": "张三", "年龄": 30}, ...]
```

### 多Sheet文件
```
--- FILE: "data.xlsx" ---
📊 MULTIPLE SHEETS DETECTED (3 sheets):
  → Sheet "员工信息": 100 rows, columns: 姓名, 年龄, 部门
    Sheet "薪资数据": 100 rows, columns: 姓名, 基本工资, 绩效
    Sheet "考勤记录": 100 rows, columns: 姓名, 出勤天数

📄 CURRENT SHEET: "员工信息"
HEADERS: ["姓名", "年龄", "部门"]
SAMPLE DATA (Top 5 rows):
[{"姓名": "张三", "年龄": 30, "部门": "技术部"}, ...]

📄 SHEET: "薪资数据"
HEADERS: ["姓名", "基本工资", "绩效"]
SAMPLE DATA (Top 5 rows):
[{"姓名": "张三", "基本工资": 5000, "绩效": 1000}, ...]

📄 SHEET: "考勤记录"
HEADERS: ["姓名", "出勤天数"]
SAMPLE DATA (Top 5 rows):
[{"姓名": "张三", "出勤天数": 22}, ...]
```

## 向后兼容性

系统完全向后兼容单sheet文件：

1. **数据结构兼容**：单sheet文件继续使用数组格式
2. **API兼容**：现有代码无需修改
3. **UI兼容**：用户界面保持一致

## 测试场景

### 场景1：单Sheet文件（向后兼容）
- 上传只有一个sheet的Excel文件
- 执行简单的数据处理操作
- 验证结果正确更新到当前sheet

### 场景2：多Sheet读取
- 上传包含多个sheets的Excel文件
- AI能够识别所有sheets
- 日志显示所有sheets的信息

### 场景3：跨Sheet查询
- 上传多sheet文件
- 使用自然语言指令跨sheet查询
- AI能够正确关联不同sheet的数据

### 场景4：多Sheet结果创建
- 执行数据分析任务
- AI创建包含多个sheets的结果文件
- 验证所有sheets都正确生成

## 最佳实践

### 1. 明确指定Sheet名称

在用户指令中明确指定要操作的sheet：

```
好的做法：
"使用Sheet2的数据更新Sheet1"
"从薪资表中查找信息"

不好的做法：
"使用另一个sheet"
"从第二个sheet"
```

### 2. 利用Sheet语义命名

给sheets起有意义的名称，而不是默认的Sheet1、Sheet2：

```
推荐：员工信息、薪资数据、考勤记录
不推荐：Sheet1、Sheet2、Sheet3
```

### 3. 合理规划Sheet结构

- 每个sheet应该有明确的主题
- 相关的sheet应该使用一致的列名
- 在sheet名称中体现数据层级关系

## 故障排查

### 问题1：AI无法识别Sheet

**症状**：AI只处理了第一个sheet

**解决**：
1. 检查文件是否真的包含多个sheets
2. 查看控制台日志，确认sheets信息已正确传递
3. 在指令中明确指定sheet名称

### 问题2：跨Sheet数据关联失败

**症状**：AI无法正确关联不同sheet的数据

**解决**：
1. 确保不同sheet中有关联字段（如员工ID）
2. 在指令中明确说明关联关系
3. 检查关联字段的数据格式是否一致

### 问题3：结果文件只有一个Sheet

**症状**：期望生成多个sheets，但结果只有一个

**解决**：
1. 检查AI生成的代码是否正确创建了多sheet对象
2. 验证代码格式：`files['结果.xlsx'] = { 'Sheet1': [...], 'Sheet2': [...] }`
3. 查看处理日志，确认处理了多个sheets

## 技术细节

### 类型定义更新

```typescript
// services/zhipuService.ts
export const generateDataProcessingCode = async (
  userPrompt: string,
  filesPreview: ({ fileName: string; headers: string[]; sampleRows: any[]; metadata?: any } & {
    currentSheetName?: string;
    sheets?: { [sheetName: string]: {
      headers: string[];
      sampleRows: any[];
      rowCount: number;
      metadata?: any;
    }};
  })[]
): Promise<AIProcessResult>
```

### 数据集类型

```typescript
// components/SmartExcel.tsx
const datasets: {
  [fileName: string]:
    any[] |  // 单sheet：数组
    { [sheetName: string]: any[] }  // 多sheet：对象
} = {};
```

## 未来增强

计划中的功能增强：

1. **Sheet切换UI**：在界面上添加sheet tabs，方便用户切换查看
2. **Sheet关系图**：可视化显示不同sheet之间的关联关系
3. **智能Sheet推荐**：AI根据任务自动推荐最相关的sheet
4. **Sheet数据预览**：在AI分析前预览所有sheets的样本数据

## 相关文件

- `components/SmartExcel.tsx` - 主要组件
- `services/zhipuService.ts` - AI服务
- `services/excelService.ts` - Excel文件读取
- `types.ts` - 类型定义
- `types/documentTypes.ts` - 文档类型定义

---

**更新日期**：2025-01-18
**版本**：v2.0.0
**状态**：✅ 已完成并测试
