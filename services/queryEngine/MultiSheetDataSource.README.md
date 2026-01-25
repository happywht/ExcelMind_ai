# MultiSheetDataSource 使用指南

## 概述

`MultiSheetDataSource` 是查询引擎的核心数据层，负责管理多Sheet Excel数据的加载、索引、关系检测和冲突解决。

## 核心功能

### 1. 数据加载
- 支持从 `ExcelData` 对象加载多Sheet数据
- 自动构建列索引
- 与AlaSQL集成，支持SQL查询

### 2. 列名冲突检测
- 自动检测跨Sheet的同名列
- 提供冲突解决建议（prefix/qualify/alias）
- 基于优先级的自动冲突解决

### 3. 表间关系推断
- 基于共同字段名自动检测关系
- 智能识别关系类型（一对一、一对多、多对多）
- 计算关系可信度（0-1）

### 4. 关系路径查找
- 支持直接关系查找
- 支持间接关系查找（多跳JOIN）
- BFS路径搜索算法
- 可信度排序

## 快速开始

### 基础用法

```typescript
import { MultiSheetDataSource } from './services/queryEngine';

// 创建数据源实例
const dataSource = new MultiSheetDataSource();

// 加载Excel数据
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

dataSource.loadExcelData(excelData);

// 查看统计信息
console.log(dataSource.generateSummaryReport());
```

### 获取Sheet信息

```typescript
// 获取所有Sheet名称
const sheetNames = dataSource.getSheetNames();
console.log(sheetNames); // ["Sheet1", "Sheet2"]

// 获取指定Sheet的列
const columns = dataSource.getColumns("Sheet1");
console.log(columns); // ["姓名", "部门", "销售额"]

// 获取Sheet元数据
const metadata = dataSource.getSheetMetadata("Sheet1");
console.log(metadata);
// {
//   name: "Sheet1",
//   rowCount: 2,
//   columnCount: 3,
//   columns: ["姓名", "部门", "销售额"],
//   hasPrimaryKey: false,
//   primaryKeys: [],
//   sampleData: [...]
// }
```

### 检测列名冲突

```typescript
// 检测所有列名冲突
const conflicts = dataSource.detectColumnConflicts();

conflicts.forEach(conflict => {
  console.log(`列名 "${conflict.columnName}" 存在于多个Sheet:`);
  console.log(`  - 涉及Sheet: ${conflict.sheets.join(', ')}`);
  console.log(`  - 建议解决方案: ${conflict.suggestedResolution}`);
  console.log(`  - 推荐前缀: ${conflict.recommendedPrefix}`);
});

// 输出示例:
// 列名 "姓名" 存在于多个Sheet:
//   - 涉及Sheet: Sheet1, Sheet2
//   - 建议解决方案: alias
//   - 推荐前缀: Sheet1
```

### 自动检测表间关系

```typescript
// 自动检测关系（loadExcelData时会自动调用）
const relationships = dataSource.detectRelationships();

relationships.forEach(rel => {
  console.log(`${rel.fromSheet}.${rel.fromColumn} -> ${rel.toSheet}.${rel.toColumn}`);
  console.log(`  类型: ${rel.type}`);
  console.log(`  可信度: ${rel.confidence.toFixed(2)}`);
});

// 输出示例:
// Sheet1.姓名 -> Sheet2.姓名
//   类型: one-to-one
//   可信度: 0.95
//
// Sheet1.部门 -> Sheet2.部门
//   类型: one-to-many
//   可信度: 0.80
```

### 查找关系路径（用于多表JOIN）

```typescript
// 查找从Sheet1到Sheet3的路径
const paths = dataSource.getRelationshipPath("Sheet1", "Sheet3");

paths.forEach((path, index) => {
  console.log(`路径 ${index + 1} (可信度: ${path.confidence.toFixed(2)}):`);

  path.path.forEach((step, stepIndex) => {
    console.log(`  ${stepIndex + 1}. ${step.fromSheet} -> ${step.toSheet} (on: ${step.onColumn})`);
  });
});

// 输出示例:
// 路径 1 (可信度: 0.85):
//   1. Sheet1 -> Sheet2 (on: 姓名)
//   2. Sheet2 -> Sheet3 (on: 部门)
```

### 手动创建关系

```typescript
// 手动创建关系
dataSource.createRelationship(
  "Sheet1",    // 源Sheet
  "Sheet2",    // 目标Sheet
  "员工ID",    // 关联列
  "one-to-many" // 关系类型（可选）
);

// 查询所有关系
const allRelationships = dataSource.getRelationships();
```

### 智能字段查找

```typescript
// 根据列名查找Sheet（支持模糊匹配）
const sheetName = dataSource.findSheetByColumn("销售额");
console.log(sheetName); // "Sheet1"

// 如果列名不存在，会尝试模糊匹配
const fuzzySheet = dataSource.findSheetByColumn("销售");
console.log(fuzzySheet); // "Sheet1"（匹配到"销售额"）
```

### 查找共同字段

```typescript
// 查找两个Sheet的共同字段
const commonColumns = dataSource.findCommonColumns("Sheet1", "Sheet2");
console.log(commonColumns); // ["姓名", "部门"]
```

### 数据统计

```typescript
// 获取统计信息
const stats = dataSource.getStatistics();
console.log(stats);
// {
//   sheetCount: 2,
//   totalRows: 4,
//   totalColumns: 5,
//   relationshipCount: 2,
//   conflictCount: 2
// }

// 生成摘要报告
const report = dataSource.generateSummaryReport();
console.log(report);
```

### 清空数据

```typescript
// 清空所有数据
dataSource.clear();
```

## 高级用法

### 自定义Sheet优先级

```typescript
// 注册Sheet时指定优先级
dataSource.registerSheet("MainSheet", data, 10); // 高优先级
dataSource.registerSheet("DetailSheet", data, 5); // 中优先级
dataSource.registerSheet("ReferenceSheet", data, 0); // 默认优先级

// 优先级影响冲突解决时的选择
```

### 使用全局单例

```typescript
import { globalDataSource } from './services/queryEngine';

// 使用全局单例实例
globalDataSource.loadExcelData(excelData);

// 在应用的任何地方访问
const sheetNames = globalDataSource.getSheetNames();
```

### 调试和诊断

```typescript
// 导出为JSON（用于调试）
const debugInfo = dataSource.toJSON();
console.log(JSON.stringify(debugInfo, null, 2));

// 生成人类可读的摘要报告
console.log(dataSource.generateSummaryReport());
```

## 类型定义

### Relationship

```typescript
interface Relationship {
  fromSheet: string;    // 源Sheet名称
  fromColumn: string;   // 源列名
  toSheet: string;      // 目标Sheet名称
  toColumn: string;     // 目标列名
  type: 'one-to-one' | 'one-to-many' | 'many-to-many'; // 关系类型
  confidence: number;   // 可信度 (0-1)
}
```

### RelationshipPath

```typescript
interface RelationshipPath {
  path: Array<{
    fromSheet: string;
    toSheet: string;
    onColumn: string;
  }>;
  confidence: number;   // 路径可信度
  joinType: 'INNER' | 'LEFT' | 'RIGHT';
}
```

### ColumnConflict

```typescript
interface ColumnConflict {
  columnName: string;
  sheets: string[];
  suggestedResolution: 'prefix' | 'qualify' | 'alias';
  recommendedPrefix?: string;
}
```

### SheetMetadata

```typescript
interface SheetMetadata {
  name: string;
  rowCount: number;
  columnCount: number;
  columns: string[];
  hasPrimaryKey: boolean;
  primaryKeys?: string[];
  sampleData?: any[];
}
```

## 最佳实践

### 1. 数据加载

```typescript
// ✅ 推荐：使用loadExcelData批量加载
dataSource.loadExcelData(excelData);

// ❌ 避免：逐个注册Sheet（除非有特殊需求）
dataSource.registerSheet("Sheet1", sheet1Data);
dataSource.registerSheet("Sheet2", sheet2Data);
```

### 2. 冲突处理

```typescript
// 检测冲突后，根据建议处理
const conflicts = dataSource.detectColumnConflicts();

conflicts.forEach(conflict => {
  switch (conflict.suggestedResolution) {
    case 'prefix':
      // 在SQL中使用表前缀: Sheet1.姓名
      break;
    case 'qualify':
      // 使用完整限定名
      break;
    case 'alias':
      // 使用表别名: s1.姓名
      break;
  }
});
```

### 3. 关系使用

```typescript
// 优先使用自动检测的关系
const relationships = dataSource.detectRelationships();

// 过滤高可信度关系
const strongRelationships = relationships.filter(r => r.confidence > 0.7);

// 对于复杂查询，查找最佳路径
const paths = dataSource.getRelationshipPath("Sheet1", "Sheet3");
const bestPath = paths[0]; // 最高可信度路径
```

### 4. 性能优化

```typescript
// 缓存元数据避免重复计算
const metadata = dataSource.getAllSheetMetadata();

// 使用索引加速查找
const sheetName = dataSource.findSheetByColumn("columnName");

// 批量操作避免多次调用
const stats = dataSource.getStatistics(); // 一次性获取所有统计信息
```

## 错误处理

```typescript
// 捕获并处理错误
try {
  dataSource.loadExcelData(excelData);
} catch (error) {
  if (error.message.includes('无效的Excel数据结构')) {
    console.error('Excel数据格式错误');
  } else if (error.message.includes('Sheet不存在')) {
    console.error('指定的Sheet不存在');
  }
}

// 检查Sheet是否存在
if (dataSource.hasSheet("Sheet1")) {
  const columns = dataSource.getColumns("Sheet1");
} else {
  console.warn('Sheet1不存在');
}
```

## 与AlaSQL集成

`MultiSheetDataSource` 自动将加载的数据同步到AlaSQL，可以直接使用SQL查询：

```typescript
// 数据加载后，AlaSQL表已自动创建
dataSource.loadExcelData(excelData);

// 直接使用AlaSQL查询
const result = alasql('SELECT * FROM [Sheet1] WHERE 销售额 > 90000');

// 跨Sheet查询
const joinResult = alasql(`
  SELECT s1.姓名, s1.销售额, s2.绩效
  FROM [Sheet1] s1
  JOIN [Sheet2] s2 ON s1.姓名 = s2.姓名
`);
```

## 单元测试示例

参见 `MultiSheetDataSource.test.md` 文件中的详细测试用例。

## API参考

完整的API文档请参考源代码中的JSDoc注释。

## 更新日志

### v2.0.0 (当前版本)
- 添加 `loadExcelData()` 方法
- 添加 `detectColumnConflicts()` 方法
- 添加 `detectRelationships()` 方法
- 添加 `getRelationshipPath()` 方法
- 添加 `getSheetMetadata()` 方法
- 添加 `generateSummaryReport()` 方法
- 增强类型定义
- 改进错误处理
