# 跨Sheet查找功能 - 快速参考指南

## 快速开始

### 1. 基本使用流程

```typescript
// 1. 上传包含多个Sheet的Excel文件
handleDataUpload(excelFile);

// 2. AI自动生成映射（包括跨Sheet映射）
handleGenerateMapping();

// 3. 生成文档（自动执行跨Sheet查找）
handleGenerateDocs();
```

### 2. 映射方案结构

```typescript
interface MappingScheme {
  primarySheet: string;              // 主Sheet名称
  mappings: FieldMapping[];          // 主Sheet字段映射
  crossSheetMappings?: CrossSheetMapping[];  // 跨Sheet映射（可选）
}

interface CrossSheetMapping {
  placeholder: string;      // 模板占位符: "{{部门名称}}"
  sourceSheet: string;      // 来源Sheet: "部门表"
  sourceColumn: string;     // 来源列: "部门名称"
  lookupKey: string;        // 关联字段: "部门ID"
}
```

### 3. 实际案例

#### 场景：生成员工档案

**Excel数据结构**:
```
Sheet1: 员工表 (主Sheet)
- 姓名
- 部门ID
- 职位

Sheet2: 部门表 (关联Sheet)
- 部门ID
- 部门名称
- 部门经理
```

**AI生成的映射**:
```json
{
  "primarySheet": "员工表",
  "mappings": [
    { "placeholder": "{{姓名}}", "excelColumn": "姓名" },
    { "placeholder": "{{职位}}", "excelColumn": "职位" }
  ],
  "crossSheetMappings": [
    {
      "placeholder": "{{部门名称}}",
      "sourceSheet": "部门表",
      "sourceColumn": "部门名称",
      "lookupKey": "部门ID"
    },
    {
      "placeholder": "{{部门经理}}",
      "sourceSheet": "部门表",
      "sourceColumn": "部门经理",
      "lookupKey": "部门ID"
    }
  ]
}
```

**生成的文档数据**:
```json
[
  {
    "姓名": "小明",
    "职位": "工程师",
    "部门名称": "技术部",      // 从部门表查找
    "部门经理": "张三"        // 从部门表查找
  }
]
```

## 日志解读

### 正常流程日志
```
✓ [INFO] 使用主数据表 "员工表" (1000行) 生成文档...
✓ [INFO] 检测到 2 个跨Sheet映射，正在构建查找索引...
✓ [INFO] 为Sheet "部门表" 构建索引 (500行，键字段: 部门ID)
✓ [INFO] 跨Sheet查找统计: 成功 980/1000 (98.0%)
✓ [SUCCESS] 成功生成 1000 个Word文档 (使用 2 个跨Sheet映射，跨Sheet查找成功率 98.0%)
```

### 警告日志处理

#### 警告1: 关联字段为空
```
⚠ [WARNING] 第5行: 关联字段 "部门ID" 为空，无法查找跨Sheet数据
```
**原因**: 主Sheet第5行的"部门ID"列为空
**处理**: 使用空字符串作为该字段的值
**建议**: 检查Excel数据完整性

#### 警告2: 找不到匹配数据
```
⚠ [WARNING] 第1行: 在Sheet "部门表" 中找不到关联键 "D999" 对应的数据
```
**原因**: 主Sheet中的部门ID "D999" 在部门表中不存在
**处理**: 使用空字符串作为该字段的值
**建议**: 检查关联数据的完整性

#### 警告3: 来源Sheet不存在
```
⚠ [WARNING] 找不到来源Sheet: 部门表
```
**原因**: 映射配置中指定的Sheet名不存在
**处理**: 跳过该跨Sheet映射
**建议**: 检查Sheet名称拼写

## 性能指标

### 查找成功率
- **优秀**: >95%
- **良好**: 85-95%
- **需关注**: <85%

### 性能优化效果
- **数据量**: 主Sheet 1000行，关联Sheet 500行
- **无索引**: ~150万次比较
- **有索引**: ~3500次操作
- **提升**: ~428倍

## 常见问题

### Q1: 跨Sheet查找会影响性能吗？
A: 不会。我们使用Map索引实现O(1)查找，对于大数据量场景反而性能更好。

### Q2: 如果找不到关联数据会怎样？
A: 使用空字符串作为默认值，并记录警告日志，不会中断文档生成。

### Q3: 支持多个跨Sheet映射吗？
A: 支持。可以为不同的占位符配置不同的跨Sheet映射。

### Q4: 关联字段的数据类型有要求吗？
A: 会自动转换为字符串进行比较，支持数字、文本等类型。

### Q5: 可以跨多个Sheet查找吗？
A: 当前版本支持一对一的跨Sheet查找。多级关联查找（链式查找）在规划中。

## 最佳实践

### 1. 数据准备
- ✅ 确保关联字段（lookupKey）在两个Sheet中都存在
- ✅ 关联字段值保持一致（注意空格、大小写）
- ✅ 避免关联字段为空或重复

### 2. Sheet命名
- ✅ 使用清晰的Sheet名称（如"员工表"、"部门表"）
- ✅ 避免使用特殊字符
- ✅ 名称与业务含义一致

### 3. 映射设计
- ✅ 优先选择唯一字段作为关联键（如ID）
- ✅ 避免使用可能重复的字段（如姓名）
- ✅ 确保关联字段已建立索引（如果使用数据库）

### 4. 性能优化
- ✅ 对于大Sheet（>10000行），建议在Excel中预先筛选
- ✅ 避免不必要的跨Sheet映射
- ✅ 定期清理无用的Sheet数据

## 调试技巧

### 1. 查看映射方案
```typescript
console.log('映射方案:', mappingScheme);
console.log('跨Sheet映射:', mappingScheme.crossSheetMappings);
```

### 2. 检查Sheet数据
```typescript
console.log('主Sheet数据:', excelData.sheets[mappingScheme.primarySheet]);
console.log('关联Sheet数据:', excelData.sheets['部门表']);
```

### 3. 验证查找结果
在日志中查找 "跨Sheet查找统计" 行，查看成功率。

### 4. 定位问题行
日志会显示具体的行号和关联键值，便于定位问题。

## 代码示例

### 手动构建映射方案（用于测试）

```typescript
const customMapping: MappingScheme = {
  explanation: "自定义跨Sheet映射",
  filterCondition: null,
  primarySheet: "员工表",
  mappings: [
    { placeholder: "{{姓名}}", excelColumn: "姓名" },
    { placeholder: "{{职位}}", excelColumn: "职位" }
  ],
  crossSheetMappings: [
    {
      placeholder: "{{部门名称}}",
      sourceSheet: "部门表",
      sourceColumn: "部门名称",
      lookupKey: "部门ID"
    }
  ],
  unmappedPlaceholders: []
};

setMappingScheme(customMapping);
```

## 版本历史

- **v2.0.0** (2025-01-18): 初始实现跨Sheet查找功能
  - 支持一对一跨Sheet映射
  - Map索引优化
  - 完善的错误处理
  - 详细的日志记录

## 相关文档

- [完整实现文档](./CROSS_SHEET_LOOKUP_IMPLEMENTATION.md)
- [类型定义](../types/documentTypes.ts)
- [DocumentSpace组件](../components/DocumentSpace/DocumentSpace.tsx)

## 技术支持

如遇问题，请检查：
1. Excel数据格式是否正确
2. Sheet名称是否匹配
3. 关联字段是否存在且一致
4. 查看日志中的具体错误信息

---

**更新日期**: 2025-01-18
**版本**: 1.0.0
**维护者**: Backend Development Team
