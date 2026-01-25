# AI映射服务快速参考

## 导入

```typescript
import {
  generateFieldMappingV2,        // V2 API - 多Sheet支持
  generateFieldMapping,           // V1 API - 向后兼容
  suggestPrimarySheet,            // 智能选择主Sheet
  detectCrossSheetRelationships,  // 检测跨Sheet关联
  validateMappingScheme           // 验证映射方案
} from './services/documentMappingService';
```

## 快速开始

### 1. 基本用法（多Sheet）

```typescript
const mappingScheme = await generateFieldMappingV2({
  allSheetsInfo: [
    {
      sheetName: '员工表',
      headers: ['员工ID', '姓名', '部门ID', '工资'],
      rowCount: 100,
      sampleData: [{...}]
    },
    {
      sheetName: '部门表',
      headers: ['部门ID', '部门名称', '负责人'],
      rowCount: 10,
      sampleData: [{...}]
    }
  ],
  templatePlaceholders: ['{{姓名}}', '{{工资}}', '{{部门名称}}'],
  userInstruction: '生成员工工资单'
});
```

### 2. 指定主Sheet

```typescript
const mappingScheme = await generateFieldMappingV2({
  allSheetsInfo,
  primarySheet: '员工表',  // 明确指定
  templatePlaceholders: ['{{姓名}}'],
  userInstruction: '生成员工表'
});
```

### 3. 向后兼容（V1）

```typescript
const mappingScheme = await generateFieldMapping({
  excelHeaders: ['姓名', '部门'],
  excelSampleData: [{姓名: '张三', 部门: '技术部'}],
  templatePlaceholders: ['{{姓名}}'],
  userInstruction: '生成员工表'
});
```

## 辅助函数

### 智能选择主Sheet

```typescript
const primarySheet = suggestPrimarySheet(
  allSheetsInfo,
  '生成产品销售报告'  // 可选的用户指令
);
```

### 检测跨Sheet关联

```typescript
const relationships = detectCrossSheetRelationships(allSheetsInfo);
// 返回: [{ fromSheet, toSheet, field, confidence }, ...]
```

### 验证映射方案

```typescript
const validation = validateMappingScheme(mappingScheme, allSheetsInfo);
// 返回: { valid: boolean, errors: string[], warnings: string[] }
```

## 返回结构

```typescript
interface MappingScheme {
  explanation: string;              // 映射思路说明
  primarySheet: string;             // 主Sheet名称
  reasoning?: string;               // 选择原因
  filterCondition?: string | null;  // 筛选条件
  mappings: FieldMapping[];         // 主Sheet映射
  crossSheetMappings?: CrossSheetMapping[];  // 跨Sheet映射
  unmappedPlaceholders: string[];   // 未映射的占位符
  allSheetsInfo?: SheetInfo[];      // 所有Sheet信息
  confidence?: number;              // 置信度 (0-1)
}
```

## 常见使用模式

### 模式1: 简单单Sheet映射

```typescript
// 输入: 单Sheet数据
// 输出: 主Sheet映射 + 空 crossSheetMappings
```

### 模式2: 跨Sheet查找

```typescript
// 输入: 主Sheet + 关联Sheet
// 输出: 主Sheet映射 + 跨Sheet映射
// 示例: 员工表 -> 部门表 (通过 部门ID)
```

### 模式3: 筛选 + 跨Sheet

```typescript
// 输入: 多Sheet + 筛选条件
// 输出: filterCondition + 主Sheet映射 + 跨Sheet映射
// 示例: "销售额 > 100000" 的订单 + 产品信息
```

## 错误处理

```typescript
try {
  const mappingScheme = await generateFieldMappingV2(params);
  const validation = validateMappingScheme(mappingScheme, allSheetsInfo);

  if (!validation.valid) {
    console.error('映射验证失败:', validation.errors);
  }

  if (validation.warnings.length > 0) {
    console.warn('警告:', validation.warnings);
  }

} catch (error) {
  console.error('映射生成失败:', error);
  // 系统会自动使用降级策略
}
```

## 类型定义

```typescript
// Sheet信息
interface SheetInfo {
  sheetName: string;
  headers: string[];
  rowCount: number;
  sampleData: Record<string, any>[];
}

// 跨Sheet映射
interface CrossSheetMapping {
  placeholder: string;
  sourceSheet: string;
  sourceColumn: string;
  lookupKey: string;
  relationshipType?: 'oneToOne' | 'manyToOne';
  transform?: string;
}
```

## 最佳实践

1. ✅ 提供3-5行高质量样本数据
2. ✅ 编写清晰的用户指令
3. ✅ 始终验证映射方案
4. ✅ 处理跨Sheet映射警告
5. ✅ 使用辅助函数预检查

## 相关文件

- 详细文档: `services/documentMappingService.README.md`
- 示例代码: `services/documentMappingService.example.ts`
- 单元测试: `services/documentMappingService.test.ts`
- 总结文档: `services/MULTI_SHEET_MAPPING_SUMMARY.md`
