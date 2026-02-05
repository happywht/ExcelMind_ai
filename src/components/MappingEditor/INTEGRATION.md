# 映射编辑器快速集成指南

## 一、项目结构概览

```
components/MappingEditor/
├── 📦 核心组件
│   ├── MappingEditor.tsx          # 主编辑器（8个组件的集成）
│   ├── MappingList.tsx            # 映射列表（拖拽排序）
│   ├── MappingEditDialog.tsx      # 编辑对话框
│   ├── TransformEditor.tsx        # 转换函数编辑器
│   ├── UnmappedPanel.tsx          # 未映射字段面板
│   ├── MappingValidator.tsx       # 验证器
│   ├── AutoMapButton.tsx          # AI自动映射按钮
│   └── MappingPreview.tsx         # 数据预览
│
├── 📄 文档和示例
│   ├── index.ts                   # 统一导出
│   ├── MappingEditorExample.tsx   # 完整使用示例
│   ├── MappingEditor.test.tsx     # 单元测试
│   ├── MAPPING_EDITOR_GUIDE.md    # 详细使用指南
│   ├── README.md                  # 组件说明
│   └── INTEGRATION.md             # 本文件
```

## 二、快速集成（3步）

### 步骤1: 导入组件

```typescript
import { MappingEditor } from './components/MappingEditor';
import { MappingScheme } from './types/documentTypes';
```

### 步骤2: 准备数据

```typescript
// Excel数据信息
const excelInfo = {
  headers: ['产品名称', '销售额', '类别', '日期'],
  sheets: ['Sheet1'],
  sampleData: [
    { '产品名称': 'iPhone', '销售额': 9999, '类别': '电子产品', '日期': '2024-01-01' }
  ]
};

// 模板信息
const templateInfo = {
  placeholders: ['{{产品名称}}', '{{销售额}}', '{{类别}}', '{{日期}}']
};

// 映射方案
const [mappingScheme, setMappingScheme] = useState<MappingScheme>({
  explanation: '基础映射',
  filterCondition: null,
  mappings: [],
  unmappedPlaceholders: []
});
```

### 步骤3: 使用组件

```typescript
<MappingEditor
  mappingScheme={mappingScheme}
  excelInfo={excelInfo}
  templateInfo={templateInfo}
  onChange={setMappingScheme}
  onAutoMap={async () => {
    // 调用AI服务生成映射
    return await aiService.generateMapping({ excelInfo, templateInfo });
  }}
/>
```

## 三、在现有页面中集成

### 场景1: 在DocumentGeneratorConfig中集成

```typescript
// components/DocumentGeneratorConfig.tsx

import { MappingEditor } from './MappingEditor';

export const DocumentGeneratorConfigComponent: React.FC<Props> = (props) => {
  const [mappingScheme, setMappingScheme] = useState<MappingScheme>({...});

  return (
    <div className="space-y-6">
      {/* 原有配置 */}
      <EngineSelector {...engineProps} />

      {/* 新增映射编辑器 */}
      <MappingEditor
        mappingScheme={mappingScheme}
        excelInfo={excelInfo}
        templateInfo={templateInfo}
        onChange={setMappingScheme}
      />
    </div>
  );
};
```

### 场景2: 在DocumentSpace中集成

```typescript
// components/DocumentSpace.tsx

import { MappingEditor } from './MappingEditor';

export const DocumentSpace: React.FC = () => {
  const { templateFile, excelData } = useDocumentSpace();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 左侧：文件上传 */}
      <FileUploadSection />

      {/* 右侧：映射编辑器 */}
      {templateFile && excelData && (
        <MappingEditor
          mappingScheme={mappingScheme}
          excelInfo={{
            headers: excelData.headers,
            sheets: excelData.sheets,
            sampleData: excelData.sampleData
          }}
          templateInfo={{
            placeholders: templateFile.placeholders
          }}
          onChange={setMappingScheme}
        />
      )}
    </div>
  );
};
```

### 场景3: 独立页面使用

```typescript
// pages/MappingEditorPage.tsx

import { MappingEditor } from '../components/MappingEditor';
import { useState } from 'react';

export default function MappingEditorPage() {
  const [mappingScheme, setMappingScheme] = useState<MappingScheme>({...});

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">字段映射配置</h1>

      <MappingEditor
        mappingScheme={mappingScheme}
        excelInfo={excelInfo}
        templateInfo={templateInfo}
        aiInfo={{
          explanation: 'AI自动生成的映射方案',
          confidence: 0.92
        }}
        onChange={setMappingScheme}
        onAutoMap={handleAutoMap}
      />
    </div>
  );
}
```

## 四、集成AI服务

### 方法1: 使用现有的documentMappingService

```typescript
import { generateFieldMapping } from '../services/documentMappingService';

const handleAutoMap = async (): Promise<MappingScheme> => {
  const result = await generateFieldMapping({
    excelHeaders: excelInfo.headers,
    excelSampleData: excelInfo.sampleData,
    templatePlaceholders: templateInfo.placeholders,
    userInstruction: '自动映射所有字段'
  });

  return result;
};

<MappingEditor
  // ...
  onAutoMap={handleAutoMap}
/>
```

### 方法2: 自定义AI服务

```typescript
const handleAutoMap = async (): Promise<MappingScheme> => {
  try {
    // 调用你的AI API
    const response = await fetch('/api/ai/mapping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        excelInfo,
        templateInfo
      })
    });

    const mappingScheme = await response.json();
    return mappingScheme;
  } catch (error) {
    console.error('AI映射失败:', error);
    // 返回默认映射
    return createDefaultMapping();
  }
};
```

## 五、样式定制

### 方法1: 使用Tailwind配置

```javascript
// tailwind.config.js
export default {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          // ...
        }
      }
    }
  }
}
```

### 方法2: 自定义CSS类

```css
/* app.css */
.my-mapping-editor {
  --editor-border-radius: 12px;
  --editor-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
```

```typescript
<MappingEditor
  className="my-mapping-editor"
  // ...
/>
```

## 六、常见集成场景

### 场景1: 只读模式

```typescript
<MappingEditor
  mappingScheme={savedMappingScheme}
  excelInfo={excelInfo}
  templateInfo={templateInfo}
  config={{ readonly: true }}
/>
```

### 场景2: 隐藏预览和验证

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

### 场景3: 自定义验证

```typescript
const customValidate = (): ValidationResult => {
  // 自定义验证逻辑
  const errors = [];
  const warnings = [];

  // 检查业务规则
  mappingScheme.mappings.forEach(mapping => {
    if (mapping.placeholder.includes('必填') && !mapping.excelColumn) {
      errors.push(`必填字段 ${mapping.placeholder} 未映射`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    unmappedCount: unmappedPlaceholders.length,
    mappedCount: mappingScheme.mappings.length
  };
};

<MappingEditor
  // ...
  onValidate={customValidate}
/>
```

## 七、数据流示例

```
用户上传Excel
    ↓
解析Excel → excelInfo
    ↓
用户上传Word模板
    ↓
解析模板 → templateInfo
    ↓
点击"AI自动映射"
    ↓
AI生成映射 → mappingScheme
    ↓
用户手动调整
    ↓
保存映射方案
    ↓
生成文档
```

## 八、测试集成

```typescript
import { render, screen } from '@testing-library/react';
import { MappingEditor } from './components/MappingEditor';

test('映射编辑器集成测试', () => {
  const { container } = render(
    <MappingEditor
      mappingScheme={mockMappingScheme}
      excelInfo={mockExcelInfo}
      templateInfo={mockTemplateInfo}
    />
  );

  expect(screen.getByText('字段映射编辑器')).toBeInTheDocument();
  expect(container.querySelector('.mapping-editor')).toBeInTheDocument();
});
```

## 九、性能优化建议

### 1. 使用useMemo缓存计算

```typescript
const unmappedPlaceholders = useMemo(() => {
  return templateInfo.placeholders.filter(p =>
    !mappingScheme.mappings.some(m => m.placeholder === p)
  );
}, [mappingScheme.mappings, templateInfo.placeholders]);
```

### 2. 使用useCallback稳定回调

```typescript
const handleChange = useCallback((mapping: MappingScheme) => {
  setMappingScheme(mapping);
}, []);
```

### 3. 虚拟化长列表

```typescript
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={400}
  itemCount={mappings.length}
  itemSize={60}
>
  {MappingItem}
</FixedSizeList>
```

## 十、故障排查

### 问题1: 组件不显示

**检查:**
- 确保导入了正确的组件
- 检查数据格式是否正确
- 查看浏览器控制台错误

### 问题2: 映射不保存

**检查:**
- 确保传入了`onChange`回调
- 检查回调函数是否正确更新状态

### 问题3: AI映射失败

**检查:**
- 确保AI服务正常
- 检查API密钥配置
- 查看网络请求错误

## 十一、下一步

1. ✅ 基础集成完成
2. 🎯 根据需要定制样式
3. 🎯 集成AI服务
4. 🎯 添加业务逻辑验证
5. 🎯 编写集成测试

## 十二、获取帮助

- 查看 [MAPPING_EDITOR_GUIDE.md](./MAPPING_EDITOR_GUIDE.md) 了解详细API
- 查看 [MappingEditorExample.tsx](./MappingEditorExample.tsx) 查看完整示例
- 查看 [README.md](./README.md) 了解组件特性

---

**祝你集成顺利！** 如有问题，请参考详细文档或查看示例代码。
