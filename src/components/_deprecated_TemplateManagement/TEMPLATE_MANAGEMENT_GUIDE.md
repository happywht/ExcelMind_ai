# 模板管理模块使用指南

## 概述

模板管理模块提供了完整的 Word 模板（.docx）管理功能，包括模板上传、变量映射、预览和版本管理。

## 组件列表

### 1. TemplateList
**路径**: `components/TemplateManagement/TemplateList.tsx`

**功能**:
- 显示已上传的模板列表
- 支持搜索和分类筛选
- 模板下载、删除、编辑操作
- 显示模板统计信息

**使用示例**:
```tsx
import { TemplateList } from './components/TemplateManagement';

function App() {
  const handleSelectTemplate = (templateId: string) => {
    console.log('Selected template:', templateId);
  };

  return (
    <TemplateList onSelectTemplate={handleSelectTemplate} />
  );
}
```

**Props**:
- `onSelectTemplate`: (templateId: string) => void - 选择模板时的回调
- `className?: string` - 自定义类名

---

### 2. TemplateEditor
**路径**: `components/TemplateManagement/TemplateEditor.tsx`

**功能**:
- 集成的模板编辑器
- 支持创建和编辑两种模式
- 多标签页界面（上传、映射、预览、历史）
- 完整的表单验证

**使用示例**:
```tsx
import { TemplateEditor } from './components/TemplateManagement';

function App() {
  const handleSave = (template) => {
    console.log('Template saved:', template);
  };

  const handleCancel = () => {
    console.log('Edit cancelled');
  };

  return (
    <TemplateEditor
      mode="create"
      onSave={handleSave}
      onCancel={handleCancel}
    />
  );
}
```

**Props**:
- `mode?: 'create' | 'edit'` - 编辑器模式，默认 'create'
- `templateId?: string` - 编辑模式下的模板 ID
- `onSave?: (template: TemplateMetadata) => void` - 保存回调
- `onCancel?: () => void` - 取消回调
- `className?: string` - 自定义类名

---

### 3. TemplateUpload
**路径**: `components/TemplateManagement/TemplateUpload.tsx`

**功能**:
- 拖拽和点击上传
- 文件类型验证（.docx）
- 上传进度显示
- 文件大小限制（默认 10MB）
- 错误处理和重试

**使用示例**:
```tsx
import { TemplateUpload } from './components/TemplateManagement';

function App() {
  const handleUpload = async (file: File) => {
    console.log('Uploading:', file.name);
    // 上传逻辑
  };

  const handleExtractVariables = async (file: File) => {
    console.log('Extracting variables from:', file.name);
    // 提取变量逻辑
  };

  return (
    <TemplateUpload
      onUpload={handleUpload}
      onExtractVariables={handleExtractVariables}
      maxSize={10 * 1024 * 1024} // 10MB
    />
  );
}
```

**Props**:
- `onUpload: (file: File) => Promise<void>` - 上传回调
- `onExtractVariables?: (file: File) => Promise<void>` - 提取变量回调
- `accept?: Record<string, string[]>` - 接受的文件类型
- `maxSize?: number` - 最大文件大小（字节）
- `className?: string` - 自定义类名

---

### 4. TemplatePreview
**路径**: `components/TemplateManagement/TemplatePreview.tsx`

**功能**:
- 模板内容预览
- 变量占位符高亮
- 缩放控制（50% - 200%）
- 全屏模式
- 数据绑定预览
- 下载预览文件

**使用示例**:
```tsx
import { TemplatePreview } from './components/TemplateManagement';

function App() {
  const template = {
    previewHtml: '<p>你好，{name}！</p>',
    placeholders: [
      {
        key: 'name',
        rawPlaceholder: 'name',
        dataType: 'string',
        required: true,
      },
    ],
  };

  const data = {
    name: '张三',
  };

  const handleDownload = () => {
    console.log('Downloading preview');
  };

  return (
    <TemplatePreview
      template={template}
      data={data}
      onDownload={handleDownload}
    />
  );
}
```

**Props**:
- `template: TemplateData | null` - 模板数据
- `data?: Record<string, any>` - 预览数据
- `onDownload?: () => void` - 下载回调
- `onRefresh?: () => void` - 刷新回调
- `className?: string` - 自定义类名

---

### 5. VariableMapping
**路径**: `components/TemplateManagement/VariableMapping.tsx`

**功能**:
- 显示模板变量列表
- Excel 字段映射
- 智能自动映射
- 映射验证（必填字段、类型兼容性）
- 批量操作
- 高级选项（默认值、数据转换）

**使用示例**:
```tsx
import { VariableMapping } from './components/TemplateManagement';

function App() {
  const variables = [
    {
      key: 'name',
      rawPlaceholder: 'name',
      dataType: 'string',
      required: true,
    },
  ];

  const dataFields = ['姓名', '身份证号', '联系电话'];

  const [mappings, setMappings] = useState([
    {
      placeholder: 'name',
      excelColumn: '',
      dataType: 'string',
      required: true,
    },
  ]);

  const handleAutoMap = () => {
    console.log('Auto mapping');
    // 智能映射逻辑
  };

  return (
    <VariableMapping
      variables={variables}
      dataFields={dataFields}
      mappings={mappings}
      onChange={setMappings}
      onAutoMap={handleAutoMap}
    />
  );
}
```

**Props**:
- `variables: Variable[]` - 模板变量列表
- `dataFields: string[]` - Excel 数据字段
- `mappings: VariableMapping[]` - 当前映射
- `onChange: (mappings: VariableMapping[]) => void` - 映射变化回调
- `onAutoMap?: () => void` - 自动映射回调
- `className?: string` - 自定义类名

---

### 6. TemplateVersionHistory
**路径**: `components/TemplateManagement/TemplateVersionHistory.tsx`

**功能**:
- 显示版本历史列表
- 版本对比（选择两个版本）
- 回滚到指定版本
- 版本标签和备注
- 版本下载

**使用示例**:
```tsx
import { TemplateVersionHistory } from './components/TemplateManagement';

function App() {
  const versions = [
    {
      id: '1',
      version: '1.0.0',
      createdAt: '2024-01-01T00:00:00Z',
      createdBy: '张三',
      changes: ['初始版本'],
      file: {
        name: 'template.docx',
        size: 1024,
        downloadUrl: '/download/1',
      },
    },
  ];

  const handleRollback = async (versionId: string) => {
    console.log('Rolling back to:', versionId);
  };

  const handleCompare = (v1: string, v2: string) => {
    console.log('Comparing:', v1, v2);
  };

  return (
    <TemplateVersionHistory
      versions={versions}
      currentVersion="1.0.0"
      onRollback={handleRollback}
      onCompare={handleCompare}
    />
  );
}
```

**Props**:
- `versions: TemplateVersion[]` - 版本列表
- `currentVersion: string` - 当前版本号
- `onRollback?: (versionId: string) => Promise<void>` - 回滚回调
- `onViewVersion?: (versionId: string) => void` - 查看版本回调
- `onDownloadVersion?: (versionId: string) => Promise<void>` - 下载版本回调
- `onCompare?: (version1: string, version2: string) => void` - 对比回调
- `className?: string` - 自定义类名

---

## 类型定义

所有类型定义在 `components/TemplateManagement/types.ts` 中：

```typescript
// 上传进度
interface TemplateUploadProgress {
  stage: 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  message: string;
}

// 变量映射
interface VariableMapping {
  placeholder: string;
  excelColumn: string;
  dataType: string;
  required: boolean;
  defaultValue?: any;
  transform?: string;
}

// 映射验证
interface MappingValidation {
  valid: boolean;
  errors: Array<{
    placeholder: string;
    message: string;
  }>;
  warnings: Array<{
    placeholder: string;
    message: string;
  }>;
}

// 从 templateAPI 导出的类型
export type { TemplateConfig, TemplateMetadata, TemplatePlaceholder } from '../../api/templateAPI';
```

---

## 完整使用示例

```tsx
import React, { useState } from 'react';
import {
  TemplateList,
  TemplateEditor,
  TemplateUpload,
  TemplatePreview,
  VariableMapping,
  TemplateVersionHistory,
} from './components/TemplateManagement';

function TemplateManagementApp() {
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const handleCreateTemplate = () => {
    setView('create');
  };

  const handleEditTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setView('edit');
  };

  const handleSaveTemplate = (template: any) => {
    console.log('Template saved:', template);
    setView('list');
  };

  const handleCancelEdit = () => {
    setView('list');
  };

  return (
    <div className="template-management">
      {view === 'list' && (
        <div>
          <button onClick={handleCreateTemplate}>
            创建新模板
          </button>
          <TemplateList onSelectTemplate={handleEditTemplate} />
        </div>
      )}

      {view === 'create' && (
        <TemplateEditor
          mode="create"
          onSave={handleSaveTemplate}
          onCancel={handleCancelEdit}
        />
      )}

      {view === 'edit' && selectedTemplateId && (
        <TemplateEditor
          mode="edit"
          templateId={selectedTemplateId}
          onSave={handleSaveTemplate}
          onCancel={handleCancelEdit}
        />
      )}
    </div>
  );
}

export default TemplateManagementApp;
```

---

## 样式约定

所有组件使用 Tailwind CSS，遵循以下设计规范：

### 颜色
- 主色: `emerald-500` / `emerald-600`
- 成功: `emerald-500`
- 错误: `red-500`
- 警告: `yellow-500` / `amber-500`
- 信息: `blue-500`
- 边框: `slate-200`
- 文本: `slate-800` (主), `slate-600` (次), `slate-500` (辅助)

### 间距
- 容器内边距: `p-4` 或 `p-6`
- 组件间距: `space-y-4` 或 `gap-4`
- 紧凑间距: `gap-2` 或 `space-y-2`

### 圆角
- 卡片: `rounded-xl`
- 按钮: `rounded-lg`
- 输入框: `rounded-lg`

### 阴影
- 卡片悬停: `hover:shadow-md`
- 弹出菜单: `shadow-lg`

---

## 测试

运行组件测试：

```bash
# 运行所有组件测试
npm run test:component

# 运行特定组件测试
npm run test -- TemplateEditor

# 运行测试并生成覆盖率报告
npm run test:coverage
```

---

## 注意事项

1. **文件上传**: 确保后端 API 支持 FormData 和文件上传
2. **变量提取**: 模板必须使用 `{变量名}` 格式的占位符
3. **类型安全**: 所有组件使用 TypeScript 严格模式
4. **错误处理**: 所有异步操作都应包含错误处理
5. **可访问性**: 组件包含 ARIA 标签和键盘导航支持

---

## 常见问题

### Q: 如何自定义文件大小限制？
A: 在 TemplateUpload 组件中设置 `maxSize` 属性（单位：字节）。

### Q: 如何添加自定义数据转换？
A: 在 VariableMapping 组件的高级选项中，可以扩展 `transform` 选择器的选项。

### Q: 如何集成到现有页面？
A: 根据需求选择合适的组件，通过 props 传递数据和回调函数。

### Q: 支持哪些模板格式？
A: 目前仅支持 .docx 格式的 Word 文档。

---

## 版本历史

- **v2.0.0** (2024-01-25)
  - 完整的模板管理功能
  - 支持上传、映射、预览、版本管理
  - TypeScript 严格模式
  - 完整的测试覆盖
