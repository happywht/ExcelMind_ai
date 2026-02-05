# 映射方案可视化编辑器 - 使用指南

## 概述

映射方案可视化编辑器是一个功能完整的React组件系统，用于可视化编辑Excel数据到Word模板的字段映射关系。

## 核心功能

### 1. 可视化映射管理
- 直观的映射列表展示
- 拖拽排序支持
- 实时状态指示
- 快速编辑和删除

### 2. 智能映射功能
- AI自动映射生成
- 相似度建议
- 智能字段匹配

### 3. 数据转换支持
- 12+内置转换函数
- 自定义JavaScript表达式
- 实时预览转换结果
- 语法验证

### 4. 验证和检查
- 实时映射验证
- 错误和警告提示
- 未映射字段高亮
- 一键修复建议

### 5. 预览功能
- 数据预览（前3行）
- 转换结果展示
- 数据类型指示
- 映射状态可视化

## 快速开始

### 基本使用

```typescript
import { MappingEditor } from './components/MappingEditor';
import { MappingScheme } from './types/documentTypes';

function App() {
  const [mappingScheme, setMappingScheme] = useState<MappingScheme>({
    explanation: '基础映射方案',
    filterCondition: null,
    mappings: [
      {
        placeholder: '{{产品名称}}',
        excelColumn: '产品名称'
      }
    ],
    unmappedPlaceholders: []
  });

  const excelInfo = {
    headers: ['产品名称', '销售额', '类别', '日期'],
    sheets: ['Sheet1'],
    sampleData: [
      { '产品名称': 'iPhone', '销售额': 9999, '类别': '电子产品', '日期': '2024-01-01' }
    ]
  };

  const templateInfo = {
    placeholders: ['{{产品名称}}', '{{销售额}}', '{{类别}}', '{{日期}}']
  };

  const handleAutoMap = async (): Promise<MappingScheme> => {
    // 调用AI服务生成映射
    const response = await fetch('/api/generate-mapping', {
      method: 'POST',
      body: JSON.stringify({ excelInfo, templateInfo })
    });
    return response.json();
  };

  return (
    <MappingEditor
      mappingScheme={mappingScheme}
      excelInfo={excelInfo}
      templateInfo={templateInfo}
      aiInfo={{
        explanation: '基于语义匹配自动生成',
        confidence: 0.92
      }}
      onChange={setMappingScheme}
      onAutoMap={handleAutoMap}
    />
  );
}
```

## 组件API

### MappingEditor

主组件，包含所有映射编辑功能。

**Props:**

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `mappingScheme` | `MappingScheme` | 是 | 当前映射方案 |
| `excelInfo` | `ExcelInfo` | 是 | Excel数据信息 |
| `templateInfo` | `TemplateInfo` | 是 | 模板占位符信息 |
| `aiInfo` | `AIInfo` | 否 | AI生成信息 |
| `config` | `MappingEditorConfig` | 否 | 配置选项 |
| `onChange` | `(mapping: MappingScheme) => void` | 否 | 映射变更回调 |
| `onValidate` | `() => ValidationResult` | 否 | 验证回调 |
| `onAutoMap` | `() => Promise<MappingScheme>` | 否 | AI自动映射回调 |

**配置选项:**

```typescript
interface MappingEditorConfig {
  readonly?: boolean;           // 只读模式，默认 false
  showAiSuggestions?: boolean;  // 显示AI建议，默认 true
  allowManualAdd?: boolean;     // 允许手动添加，默认 true
  showPreview?: boolean;        // 显示预览，默认 true
  showValidation?: boolean;     // 显示验证，默认 true
}
```

### MappingList

映射列表组件，显示所有字段映射。

**Props:**

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `mappings` | `FieldMapping[]` | 是 | 映射列表 |
| `excelHeaders` | `string[]` | 是 | Excel列名 |
| `templatePlaceholders` | `string[]` | 是 | 模板占位符 |
| `onMappingChange` | `(index, mapping) => void` | 是 | 映射变更回调 |
| `onMappingDelete` | `(index) => void` | 是 | 删除回调 |
| `onMappingReorder` | `(from, to) => void` | 是 | 重排序回调 |
| `onMappingEdit` | `(index) => void` | 是 | 编辑回调 |
| `readonly` | `boolean` | 否 | 只读模式 |

### MappingEditDialog

映射编辑对话框。

**Props:**

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `open` | `boolean` | 是 | 是否打开 |
| `mapping` | `FieldMapping` | 是 | 当前映射 |
| `excelHeaders` | `string[]` | 是 | Excel列名 |
| `templatePlaceholders` | `string[]` | 是 | 模板占位符 |
| `sampleData` | `any[]` | 否 | 样本数据 |
| `onSave` | `(mapping) => void` | 是 | 保存回调 |
| `onCancel` | `() => void` | 是 | 取消回调 |

### TransformEditor

转换函数编辑器。

**内置转换函数:**

| 名称 | 代码 | 说明 |
|------|------|------|
| 转大写 | `String(value).toUpperCase()` | 文本转大写 |
| 转小写 | `String(value).toLowerCase()` | 文本转小写 |
| 去空格 | `String(value).trim()` | 去除首尾空格 |
| 截取前N位 | `String(value).substring(0, 10)` | 截取前10字符 |
| 替换文本 | `String(value).replace("旧", "新")` | 替换文本 |
| 转数字 | `Number(value)` | 转换为数字 |
| 保留2位小数 | `Number(value).toFixed(2)` | 格式化小数 |
| 千分位 | `Number(value).toLocaleString()` | 添加千分位 |
| 格式化日期 | `new Date(value).toLocaleDateString("zh-CN")` | 中文日期 |
| 格式化时间 | `new Date(value).toLocaleString("zh-CN")` | 中文日期时间 |
| 货币格式 | `"¥" + Number(value).toLocaleString()` | 添加货币符号 |
| 百分比 | `Number(value) * 100 + "%"` | 转百分比 |

### UnmappedPanel

未映射字段面板。

**Props:**

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `unmappedPlaceholders` | `string[]` | 是 | 未映射占位符 |
| `unmappedColumns` | `string[]` | 是 | 未映射列 |
| `onMapPlaceholder` | `(placeholder, column) => void` | 是 | 映射占位符回调 |
| `onMapColumn` | `(column, placeholder) => void` | 是 | 映射列回调 |

### MappingValidator

映射验证器。

**验证项:**

- ✅ 所有必填占位符已映射
- ✅ Excel列存在性检查
- ✅ 转换函数语法验证
- ✅ 重复映射检测
- ✅ 数据类型兼容性

**Props:**

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `validationResult` | `ValidationResult` | 是 | 验证结果 |
| `onClose` | `() => void` | 否 | 关闭回调 |

### AutoMapButton

AI自动映射按钮。

**Props:**

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `loading` | `boolean` | 否 | 加载状态 |
| `disabled` | `boolean` | 否 | 禁用状态 |
| `onAutoMap` | `() => void` | 是 | 点击回调 |

### MappingPreview

映射预览组件。

**Props:**

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `mappingScheme` | `MappingScheme` | 是 | 映射方案 |
| `excelSampleData` | `any[]` | 是 | 样本数据 |

## 样式定制

组件使用Tailwind CSS，可以通过以下方式定制：

### 1. 修改颜色主题

```css
/* 在你的CSS文件中 */
.mapping-editor {
  --primary-color: #3b82f6;
  --success-color: #10b981;
  --warning-color: #f59e0b;
  --error-color: #ef4444;
}
```

### 2. 自定义样式

```typescript
<MappingEditor
  className="my-custom-class"
  style={{ borderRadius: '8px' }}
  // ...其他props
/>
```

## 高级用法

### 1. 只读模式

```typescript
<MappingEditor
  mappingScheme={mappingScheme}
  excelInfo={excelInfo}
  templateInfo={templateInfo}
  config={{ readonly: true }}
/>
```

### 2. 隐藏预览和验证

```typescript
<MappingEditor
  mappingScheme={mappingScheme}
  excelInfo={excelInfo}
  templateInfo={templateInfo}
  config={{
    showPreview: false,
    showValidation: false
  }}
/>
```

### 3. 自定义验证逻辑

```typescript
const customValidate = (): ValidationResult => {
  // 自定义验证逻辑
  return {
    valid: true,
    errors: [],
    warnings: [],
    unmappedCount: 0,
    mappedCount: 10
  };
};

<MappingEditor
  mappingScheme={mappingScheme}
  excelInfo={excelInfo}
  templateInfo={templateInfo}
  onValidate={customValidate}
/>
```

### 4. 集成AI服务

```typescript
const handleAutoMap = async (): Promise<MappingScheme> => {
  const response = await anthropic.messages.create({
    model: 'glm-4.6',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: buildMappingPrompt(excelInfo, templateInfo)
    }]
  });

  const mappingScheme = parseMappingResponse(response.content[0].text);
  return mappingScheme;
};
```

## 类型定义

```typescript
// Excel信息
interface ExcelInfo {
  headers: string[];        // 所有列名
  sheets: string[];         // 所有Sheet
  sampleData: any[];        // 样本数据
}

// 模板信息
interface TemplateInfo {
  placeholders: string[];   // 所有占位符
  textContent?: string;     // 模板文本
}

// AI信息
interface AIInfo {
  explanation: string;      // AI说明
  confidence?: number;      // 置信度
}

// 验证结果
interface ValidationResult {
  valid: boolean;           // 是否有效
  errors: string[];         // 错误列表
  warnings: string[];       // 警告列表
  unmappedCount: number;    // 未映射数量
  mappedCount: number;      // 已映射数量
}
```

## 最佳实践

### 1. 数据准备

确保提供高质量的样本数据：

```typescript
const excelInfo = {
  headers: ['产品名称', '销售额', '类别'],
  sampleData: [
    // 提供至少3行样本数据
    { '产品名称': 'iPhone', '销售额': 9999, '类别': '电子产品' },
    { '产品名称': 'MacBook', '销售额': 19999, '类别': '电子产品' },
    { '产品名称': 'AirPods', '销售额': 1299, '类别': '配件' }
  ]
};
```

### 2. 错误处理

```typescript
const handleAutoMap = async (): Promise<MappingScheme> => {
  try {
    const result = await aiService.generateMapping(params);
    return result;
  } catch (error) {
    console.error('AI映射生成失败:', error);
    // 返回降级映射
    return createFallbackMapping();
  }
};
```

### 3. 性能优化

```typescript
import { useMemo, useCallback } from 'react';

function App() {
  // 缓存计算结果
  const unmappedPlaceholders = useMemo(() => {
    return templateInfo.placeholders.filter(p =>
      !mappingScheme.mappings.some(m => m.placeholder === p)
    );
  }, [mappingScheme.mappings, templateInfo.placeholders]);

  // 稳定的回调函数
  const handleChange = useCallback((mapping: MappingScheme) => {
    setMappingScheme(mapping);
  }, []);
}
```

## 常见问题

### Q: 如何支持复杂的转换逻辑？

A: 使用自定义JavaScript表达式：

```typescript
const transform = `
  const value = Number(value);
  return value > 10000 ? '高' : value > 5000 ? '中' : '低';
`;
```

### Q: 如何处理嵌套数据？

A: 在转换函数中访问嵌套属性：

```typescript
const transform = `value.address?.city || '未知'`;
```

### Q: 如何批量添加映射？

A: 使用`onChange`回调更新整个映射方案：

```typescript
const addBatchMappings = () => {
  const newMappings = [
    { placeholder: '{{字段1}}', excelColumn: '列1' },
    { placeholder: '{{字段2}}', excelColumn: '列2' }
  ];

  setMappingScheme({
    ...mappingScheme,
    mappings: [...mappingScheme.mappings, ...newMappings]
  });
};
```

## 依赖项

- React 18+
- TypeScript 5+
- Tailwind CSS 3+

## 许可证

MIT
