# AI映射服务使用指南 (V2.0)

## 概述

`documentMappingService.ts` 提供了AI驱动的智能文档映射功能，能够将Excel数据自动映射到Word模板的占位符。

**V2.0 新增功能：**
- 支持多Sheet数据源分析
- 智能选择主数据Sheet
- 跨Sheet关联映射
- 增强的验证和错误处理
- 向后兼容V1 API

## 安装依赖

```bash
npm install @anthropic-ai/sdk
```

## 环境配置

在 `.env` 文件中配置智谱AI的API密钥：

```env
ZHIPU_API_KEY=your_zhipu_api_key_here
# 或
API_KEY=your_api_key_here
```

## 核心功能

### 1. 多Sheet映射 (V2 API)

#### 基本用法

```typescript
import { generateFieldMappingV2 } from './services/documentMappingService';
import type { SheetInfo } from './types/documentTypes';

const allSheetsInfo: SheetInfo[] = [
  {
    sheetName: '员工表',
    headers: ['员工ID', '姓名', '部门ID', '工资'],
    rowCount: 100,
    sampleData: [
      { 员工ID: 'E001', 姓名: '张三', 部门ID: 'D001', 工资: 15000 }
    ]
  },
  {
    sheetName: '部门表',
    headers: ['部门ID', '部门名称', '负责人'],
    rowCount: 10,
    sampleData: [
      { 部门ID: 'D001', 部门名称: '技术部', 负责人: '王总' }
    ]
  }
];

const mappingScheme = await generateFieldMappingV2({
  allSheetsInfo,
  templatePlaceholders: ['{{姓名}}', '{{工资}}', '{{部门名称}}'],
  userInstruction: '生成员工工资单'
});

console.log('AI选择的主Sheet:', mappingScheme.primarySheet);
console.log('主Sheet映射:', mappingScheme.mappings);
console.log('跨Sheet映射:', mappingScheme.crossSheetMappings);
```

#### 用户指定主Sheet

```typescript
const mappingScheme = await generateFieldMappingV2({
  allSheetsInfo,
  primarySheet: '员工表', // 明确指定主Sheet
  templatePlaceholders: ['{{姓名}}', '{{工资}}'],
  userInstruction: '生成员工信息表'
});
```

### 2. 辅助工具函数

#### 智能选择主Sheet

```typescript
import { suggestPrimarySheet } from './services/documentMappingService';

const suggested = suggestPrimarySheet(
  allSheetsInfo,
  '生成产品销售报告' // 可选的用户指令
);

console.log('推荐的主Sheet:', suggested);
```

**选择因素：**
- 数据行数 (权重: 40%)
- 字段数量 (权重: 20%)
- 字段语义相关性 (权重: 30%)
- 用户指令匹配度 (权重: 10%)

#### 检测跨Sheet关联

```typescript
import { detectCrossSheetRelationships } from './services/documentMappingService';

const relationships = detectCrossSheetRelationships(allSheetsInfo);

relationships.forEach(rel => {
  console.log(`${rel.fromSheet}.${rel.field} <-> ${rel.toSheet}.${rel.field}`);
  console.log(`置信度: ${rel.confidence}`);
});
```

**检测规则：**
- 共同字段匹配
- ID字段识别 (ID, 编号, 代码等)
- 唯一性分析

#### 验证映射方案

```typescript
import { validateMappingScheme } from './services/documentMappingService';

const validation = validateMappingScheme(mappingScheme, allSheetsInfo);

if (!validation.valid) {
  console.error('验证失败:', validation.errors);
}
if (validation.warnings.length > 0) {
  console.warn('警告:', validation.warnings);
}
```

**验证项目：**
- 主Sheet是否存在
- 映射字段是否存在
- 跨Sheet映射是否有效
- 未映射占位符警告
- 低置信度警告

### 3. 向后兼容 (V1 API)

旧的API仍然可用，自动适配为新格式：

```typescript
import { generateFieldMapping } from './services/documentMappingService';

const mappingScheme = await generateFieldMapping({
  excelHeaders: ['姓名', '部门', '工资'],
  excelSampleData: [
    { 姓名: '张三', 部门: '技术部', 工资: 15000 }
  ],
  templatePlaceholders: ['{{姓名}}', '{{部门}}', '{{工资}}'],
  userInstruction: '生成员工信息表'
});
```

## 类型定义

### GenerateMappingParamsV2

```typescript
interface GenerateMappingParamsV2 {
  allSheetsInfo: SheetInfo[];      // 所有sheet信息
  primarySheet?: string;            // 可选：用户指定的主sheet
  templatePlaceholders: string[];   // 模板占位符列表
  userInstruction: string;          // 用户指令
}
```

### SheetInfo

```typescript
interface SheetInfo {
  sheetName: string;              // Sheet名称
  headers: string[];              // 表头字段列表
  rowCount: number;               // 数据行数
  sampleData: Record<string, any>[];  // 示例数据（前5行）
}
```

### MappingScheme (V2)

```typescript
interface MappingScheme {
  explanation: string;            // 映射思路说明
  primarySheet: string;           // 主数据sheet
  reasoning?: string;             // 选择主sheet的原因
  filterCondition: string | null; // 筛选条件
  mappings: FieldMapping[];       // 主sheet映射
  crossSheetMappings?: CrossSheetMapping[]; // 跨sheet映射
  unmappedPlaceholders: string[]; // 未映射的占位符
  allSheetsInfo?: SheetInfo[];    // 所有sheet信息
  confidence?: number;            // 置信度 (0-1)
}
```

### CrossSheetMapping

```typescript
interface CrossSheetMapping {
  placeholder: string;           // 模板占位符
  sourceSheet: string;           // 来源sheet
  sourceColumn: string;          // 来源列名
  lookupKey: string;            // 关联字段
  relationshipType?: 'oneToOne' | 'manyToOne'; // 关系类型
  transform?: string;           // 数据转换代码
}
```

## 使用场景

### 场景1: 简单单Sheet映射

**输入：**
- Excel: 一个包含员工信息的Sheet
- 模板: 员工信息表
- 指令: "生成员工信息表"

**输出：**
```json
{
  "primarySheet": "员工表",
  "mappings": [
    {"placeholder": "{{姓名}}", "excelColumn": "姓名"},
    {"placeholder": "{{部门}}", "excelColumn": "部门"}
  ],
  "crossSheetMappings": []
}
```

### 场景2: 跨Sheet查找

**输入：**
- Excel: 员工表 + 部门表
- 模板: 包含部门负责人的工资单
- 指令: "生成包含部门负责人的工资单"

**输出：**
```json
{
  "primarySheet": "员工表",
  "mappings": [
    {"placeholder": "{{姓名}}", "excelColumn": "姓名"},
    {"placeholder": "{{工资}}", "excelColumn": "工资"}
  ],
  "crossSheetMappings": [
    {
      "placeholder": "{{部门负责人}}",
      "sourceSheet": "部门表",
      "sourceColumn": "负责人",
      "lookupKey": "部门ID",
      "relationshipType": "manyToOne"
    }
  ]
}
```

### 场景3: 筛选 + 跨Sheet

**输入：**
- Excel: 销售记录 + 产品表 + 销售员表
- 模板: 销售订单详情
- 指令: "生成2024年华东地区销售额超过3万的订单"

**输出：**
```json
{
  "primarySheet": "销售记录",
  "filterCondition": "row['地区'] === '华东' && row['销售额'] > 30000",
  "mappings": [
    {"placeholder": "{{订单ID}}", "excelColumn": "订单ID"},
    {"placeholder": "{{销售额}}", "excelColumn": "销售额"}
  ],
  "crossSheetMappings": [
    {
      "placeholder": "{{产品名称}}",
      "sourceSheet": "产品表",
      "sourceColumn": "产品名称",
      "lookupKey": "产品ID"
    }
  ]
}
```

## 最佳实践

### 1. 准备高质量的Sheet信息

```typescript
const sheetInfo: SheetInfo = {
  sheetName: '员工表',
  headers: ['员工ID', '姓名', '部门ID', '工资'],
  rowCount: data.length,
  sampleData: data.slice(0, 5) // 提供3-5行样本数据
};
```

### 2. 编写清晰的用户指令

```typescript
// 好的指令
const goodInstruction = '生成2024年销售部门的员工工资单，包含部门负责人信息';

// 不好的指令
const badInstruction = '做个表';
```

### 3. 验证映射结果

```typescript
const mappingScheme = await generateFieldMappingV2(params);
const validation = validateMappingScheme(mappingScheme, allSheetsInfo);

if (!validation.valid) {
  // 处理错误
  console.error('映射验证失败:', validation.errors);
}

// 检查警告
if (validation.warnings.length > 0) {
  // 可能需要用户确认
  console.warn('注意事项:', validation.warnings);
}
```

### 4. 处理跨Sheet映射

```typescript
// 检查是否有跨Sheet映射
if (mappingScheme.crossSheetMappings && mappingScheme.crossSheetMappings.length > 0) {
  console.log('此映射方案需要跨Sheet数据查找');

  // 在生成文档时，需要实现跨Sheet查找逻辑
  mappingScheme.crossSheetMappings.forEach(crossMapping => {
    console.log(`需要从 ${crossMapping.sourceSheet} 查找 ${crossMapping.sourceColumn}`);
    console.log(`通过关联字段: ${crossMapping.lookupKey}`);
  });
}
```

## 错误处理

### 常见错误

1. **API密钥未配置**
```typescript
Error: AI映射生成失败: API密钥未配置
```
解决: 检查 `.env` 文件中的 `ZHIPU_API_KEY`

2. **AI响应解析失败**
```typescript
Warning: 多Sheet映射JSON解析失败，使用降级策略
```
解决: 系统会自动使用降级策略，返回基础映射

3. **主Sheet不存在**
```typescript
Error: 主Sheet "XXX" 不存在
```
解决: 检查Sheet名称是否正确，或让AI自动选择

## 性能优化

1. **缓存Sheet信息**: 避免重复读取Excel文件
2. **限制样本数据**: 只提供前5行数据作为样本
3. **批量处理**: 对于多个文档生成，复用同一个映射方案

## 示例代码

完整的使用示例请参考：
`services/documentMappingService.example.ts`

运行示例：
```bash
node services/documentMappingService.example.ts multiSheet
```

## 更新日志

### V2.0 (2024-01-18)
- 新增多Sheet数据源支持
- 新增智能主Sheet选择
- 新增跨Sheet关联映射
- 新增辅助工具函数
- 增强错误处理和验证
- 保持向后兼容

### V1.0 (初始版本)
- 基础的单Sheet映射功能
- AI驱动的字段匹配
- 筛选条件支持

## 技术支持

如有问题，请查看：
- 类型定义: `types/documentTypes.ts`
- 示例代码: `services/documentMappingService.example.ts`
- 测试文件: `services/documentMappingService.test.ts`
