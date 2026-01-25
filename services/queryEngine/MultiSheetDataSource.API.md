# MultiSheetDataSource API 参考

## 类: MultiSheetDataSource

### 构造函数

```typescript
constructor()
```

创建一个新的 MultiSheetDataSource 实例。

**异常:**
- 如果 AlaSQL 未加载，抛出错误

---

## 实例方法

### loadExcelData()

加载 Excel 数据到数据源。

```typescript
loadExcelData(excelData: ExcelData): void
```

**参数:**
- `excelData: ExcelData` - Excel 数据对象

**异常:**
- 如果 Excel 数据结构无效，抛出错误
- 如果 Excel 数据中没有 Sheet，抛出错误

**示例:**
```typescript
dataSource.loadExcelData({
  sheets: {
    "Sheet1": [{ 姓名: "张三", 部门: "销售部" }],
    "Sheet2": [{ 姓名: "张三", 绩效: "A" }]
  },
  currentSheetName: "Sheet1"
});
```

---

### registerSheet()

注册 Sheet 数据。

```typescript
registerSheet(sheetName: string, data: any[], priority?: number): void
```

**参数:**
- `sheetName: string` - Sheet 名称
- `data: any[]` - 数据数组
- `priority?: number` - 优先级（默认 0）

**异常:**
- 如果数据不是数组，抛出错误

---

### getSheet()

获取 Sheet 数据。

```typescript
getSheet(sheetName: string): any[]
```

**参数:**
- `sheetName: string` - Sheet 名称

**返回:** 数据数组

---

### getSheetNames()

获取所有 Sheet 名称。

```typescript
getSheetNames(): string[]
```

**返回:** Sheet 名称数组

**示例:**
```typescript
const names = dataSource.getSheetNames();
// ["Sheet1", "Sheet2", "Sheet3"]
```

---

### getColumns()

获取指定 Sheet 的列信息。

```typescript
getColumns(sheetName: string): string[]
```

**参数:**
- `sheetName: string` - Sheet 名称

**返回:** 列名数组

**异常:**
- 如果 Sheet 不存在，抛出错误

**示例:**
```typescript
const columns = dataSource.getColumns("Sheet1");
// ["姓名", "部门", "销售额"]
```

---

### getSheetMetadata()

获取 Sheet 元数据。

```typescript
getSheetMetadata(sheetName: string): SheetMetadata | undefined
```

**参数:**
- `sheetName: string` - Sheet 名称

**返回:** Sheet 元数据或 undefined

---

### getAllSheetMetadata()

获取所有 Sheet 的元数据。

```typescript
getAllSheetMetadata(): SheetMetadata[]
```

**返回:** Sheet 元数据数组

---

### hasSheet()

检查 Sheet 是否存在。

```typescript
hasSheet(sheetName: string): boolean
```

**参数:**
- `sheetName: string` - Sheet 名称

**返回:** 是否存在

---

### detectColumnConflicts()

检测列名冲突。

```typescript
detectColumnConflicts(): ColumnConflict[]
```

**返回:** 列冲突信息数组

**示例:**
```typescript
const conflicts = dataSource.detectColumnConflicts();
// [
//   {
//     columnName: "姓名",
//     sheets: ["Sheet1", "Sheet2"],
//     suggestedResolution: "alias",
//     recommendedPrefix: "Sheet1"
//   }
// ]
```

---

### findSheetByColumn()

智能查找包含指定字段的 Sheet。

```typescript
findSheetByColumn(columnName: string): string | null
```

**参数:**
- `columnName: string` - 列名

**返回:** Sheet 名称或 null

**特性:**
- 支持精确匹配
- 支持模糊匹配
- 自动解决冲突（基于优先级）

---

### createRelationship()

创建表间关系。

```typescript
createRelationship(
  fromSheet: string,
  toSheet: string,
  onColumn: string,
  type?: 'one-to-one' | 'one-to-many' | 'many-to-many'
): void
```

**参数:**
- `fromSheet: string` - 源 Sheet 名称
- `toSheet: string` - 目标 Sheet 名称
- `onColumn: string` - 关联列名
- `type?: 'one-to-one' | 'one-to-many' | 'many-to-many'` - 关系类型（默认 'one-to-many'）

**异常:**
- 如果 Sheet 不存在，抛出错误

---

### detectRelationships()

自动检测表间关系。

```typescript
detectRelationships(): Relationship[]
```

**返回:** 检测到的关系数组

**示例:**
```typescript
const relationships = dataSource.detectRelationships();
// [
//   {
//     fromSheet: "Sheet1",
//     fromColumn: "姓名",
//     toSheet: "Sheet2",
//     toColumn: "姓名",
//     type: "one-to-one",
//     confidence: 0.95
//   }
// ]
```

---

### getRelationshipPath()

获取关系路径（用于多表 JOIN）。

```typescript
getRelationshipPath(fromSheet: string, toSheet: string): RelationshipPath[]
```

**参数:**
- `fromSheet: string` - 起始 Sheet
- `toSheet: string` - 目标 Sheet

**返回:** 关系路径数组（按可信度降序排列）

**示例:**
```typescript
const paths = dataSource.getRelationshipPath("Sheet1", "Sheet3");
// [
//   {
//     path: [
//       { fromSheet: "Sheet1", toSheet: "Sheet2", onColumn: "姓名" },
//       { fromSheet: "Sheet2", toSheet: "Sheet3", onColumn: "部门" }
//     ],
//     confidence: 0.85,
//     joinType: "INNER"
//   }
// ]
```

---

### getRelationships()

获取所有关系。

```typescript
getRelationships(): Relationship[]
```

**返回:** 关系数组

---

### getAllColumns()

获取所有列名。

```typescript
getAllColumns(): string[]
```

**返回:** 所有列名数组（去重）

---

### getColumnsForSheet()

获取指定 Sheet 的列名。

```typescript
getColumnsForSheet(sheetName: string): string[]
```

**参数:**
- `sheetName: string` - Sheet 名称

**返回:** 列名数组

---

### findCommonColumns()

查找两个 Sheet 的共同字段。

```typescript
findCommonColumns(sheet1: string, sheet2: string): string[]
```

**参数:**
- `sheet1: string` - 第一个 Sheet 名称
- `sheet2: string` - 第二个 Sheet 名称

**返回:** 共同字段名数组

**示例:**
```typescript
const common = dataSource.findCommonColumns("Sheet1", "Sheet2");
// ["姓名", "部门"]
```

---

### getStatistics()

获取数据统计信息。

```typescript
getStatistics(): {
  sheetCount: number;
  totalRows: number;
  totalColumns: number;
  relationshipCount: number;
  conflictCount: number;
}
```

**返回:** 统计信息对象

---

### clear()

清空所有数据。

```typescript
clear(): void
```

---

### toJSON()

导出为 JSON（用于调试）。

```typescript
toJSON(): any
```

**返回:** JSON 对象

---

### generateSummaryReport()

生成数据源摘要报告。

```typescript
generateSummaryReport(): string
```

**返回:** 格式化的摘要字符串

**示例:**
```typescript
const report = dataSource.generateSummaryReport();
console.log(report);
// MultiSheet数据源摘要
// ===================
// Sheet数量: 3
// 总行数: 1500
// 总列数: 25
// 关系数量: 5
// 冲突数量: 2
//
// Sheet列表:
// - Sheet1: 1000行, 10列
// - Sheet2: 300行, 8列
// - Sheet3: 200行, 7列
```

---

## 私有方法

### indexColumn()

索引列。

```typescript
private indexColumn(sheetName: string, columnName: string): void
```

---

### detectColumnDataType()

检测列数据类型。

```typescript
private detectColumnDataType(sheetName: string, columnName: string): 'string' | 'number' | 'date' | 'boolean'
```

---

### escapeTableName()

转义表名（AlaSQL 要求）。

```typescript
private escapeTableName(name: string): string
```

---

### detectPrimaryKey()

检测主键。

```typescript
private detectPrimaryKey(sheetName: string): boolean
```

---

### findPrimaryKeys()

查找主键列。

```typescript
private findPrimaryKeys(sheetName: string): string[]
```

---

### fuzzyMatchColumn()

模糊匹配字段名。

```typescript
private fuzzyMatchColumn(columnName: string): string | null
```

---

### resolveColumnConflict()

解决字段冲突。

```typescript
private resolveColumnConflict(columnName: string, sheets: string[]): string
```

---

### suggestResolution()

建议冲突解决方案。

```typescript
private suggestResolution(columnName: string, sheets: string[]): 'prefix' | 'qualify' | 'alias'
```

---

### determineRelationshipType()

确定关系类型。

```typescript
private determineRelationshipType(sheet1: string, sheet2: string, column: string): 'one-to-one' | 'one-to-many' | 'many-to-many'
```

---

### calculateRelationshipConfidence()

计算关系可信度。

```typescript
private calculateRelationshipConfidence(sheet1: string, sheet2: string, column: string): number
```

---

### isColumnUnique()

检查列值是否唯一。

```typescript
private isColumnUnique(sheetName: string, columnName: string): boolean
```

---

### findDirectPath()

查找直接路径。

```typescript
private findDirectPath(fromSheet: string, toSheet: string): RelationshipPath | null
```

---

### findIndirectPaths()

查找间接路径（BFS）。

```typescript
private findIndirectPaths(fromSheet: string, toSheet: string, maxDepth: number): RelationshipPath[]
```

---

### calculatePathConfidence()

计算路径可信度。

```typescript
private calculatePathConfidence(path: RelationshipPath['path']): number
```

---

### findRelationship()

查找特定关系。

```typescript
private findRelationship(fromSheet: string, toSheet: string, column: string): Relationship | undefined
```

---

## 类型定义

### Relationship

```typescript
interface Relationship {
  fromSheet: string;      // 源Sheet名称
  fromColumn: string;     // 源列名
  toSheet: string;        // 目标Sheet名称
  toColumn: string;       // 目标列名
  type: 'one-to-one' | 'one-to-many' | 'many-to-many'; // 关系类型
  confidence: number;     // 可信度 (0-1)
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

### ColumnIndex

```typescript
interface ColumnIndex {
  columnName: string;
  sheets: string[];
  priority?: number;
  dataType?: 'string' | 'number' | 'date' | 'boolean';
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

### IMultiSheetDataSource

```typescript
interface IMultiSheetDataSource {
  registerSheet(sheetName: string, data: any[]): void;
  getSheet(sheetName: string): any[];
  findSheetByColumn(columnName: string): string | null;
  createRelationship(fromSheet: string, toSheet: string, onColumn: string): void;
  getRelationships(): Relationship[];
  getSheetNames(): string[];
  getAllColumns(): string[];
  hasSheet(sheetName: string): boolean;
}
```

---

## 全局导出

### globalDataSource

全局单例实例。

```typescript
export const globalDataSource = new MultiSheetDataSource();
```

**示例:**
```typescript
import { globalDataSource } from './services/queryEngine';

// 在应用的任何地方使用
globalDataSource.loadExcelData(excelData);
const sheets = globalDataSource.getSheetNames();
```

---

## 错误处理

所有方法都会正确处理错误情况，包括：

- 无效的输入参数
- 不存在的 Sheet
- AlaSQL 操作失败
- 数据格式错误

建议使用 try-catch 块包裹可能抛出异常的方法调用。

```typescript
try {
  dataSource.loadExcelData(excelData);
} catch (error) {
  console.error('加载数据失败:', error.message);
}
```
