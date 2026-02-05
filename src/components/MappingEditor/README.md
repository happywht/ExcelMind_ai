# 映射方案可视化编辑器

一个功能完整的React组件系统，用于可视化编辑Excel数据到Word模板的字段映射关系。

## 特性

- ✨ **直观的可视化界面** - 拖拽排序、状态指示、实时预览
- 🤖 **AI智能映射** - 自动匹配字段、相似度建议
- 🔧 **强大的转换功能** - 12+内置函数、自定义JavaScript表达式
- ✔️ **实时验证** - 语法检查、错误提示、一键修复
- 📱 **响应式设计** - 适配各种屏幕尺寸
- 🎨 **精美UI** - 基于Tailwind CSS的现代化设计

## 组件列表

### 核心组件

- **MappingEditor** - 主编辑器组件
- **MappingList** - 映射列表（支持拖拽排序）
- **MappingEditDialog** - 映射编辑对话框
- **TransformEditor** - 转换函数编辑器
- **UnmappedPanel** - 未映射字段面板
- **MappingValidator** - 映射验证器
- **AutoMapButton** - AI自动映射按钮
- **MappingPreview** - 数据预览组件

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 运行测试
npm test
```

## 基本使用

```typescript
import { MappingEditor } from './components/MappingEditor';

function App() {
  const [mappingScheme, setMappingScheme] = useState<MappingScheme>({
    explanation: '基础映射',
    filterCondition: null,
    mappings: [
      { placeholder: '{{产品名称}}', excelColumn: '产品名称' }
    ],
    unmappedPlaceholders: []
  });

  return (
    <MappingEditor
      mappingScheme={mappingScheme}
      excelInfo={{
        headers: ['产品名称', '销售额'],
        sheets: ['Sheet1'],
        sampleData: [{ '产品名称': 'iPhone', '销售额': 9999 }]
      }}
      templateInfo={{
        placeholders: ['{{产品名称}}', '{{销售额}}']
      }}
      onChange={setMappingScheme}
      onAutoMap={async () => {
        // AI自动映射逻辑
        return mappingScheme;
      }}
    />
  );
}
```

## 文件结构

```
components/MappingEditor/
├── MappingEditor.tsx           # 主组件
├── MappingList.tsx             # 映射列表
├── MappingEditDialog.tsx       # 编辑对话框
├── TransformEditor.tsx         # 转换编辑器
├── UnmappedPanel.tsx           # 未映射面板
├── MappingValidator.tsx        # 验证器
├── AutoMapButton.tsx           # AI按钮
├── MappingPreview.tsx          # 预览组件
├── index.ts                    # 导出文件
├── MappingEditorExample.tsx    # 使用示例
├── MappingEditor.test.tsx      # 单元测试
├── MAPPING_EDITOR_GUIDE.md     # 详细指南
└── README.md                   # 本文件
```

## 类型定义

```typescript
interface MappingScheme {
  explanation: string;              // AI说明
  filterCondition: string | null;   // 筛选条件
  mappings: FieldMapping[];         // 字段映射
  unmappedPlaceholders: string[];   // 未映射占位符
}

interface FieldMapping {
  placeholder: string;    // 模板占位符
  excelColumn: string;    // Excel列名
  transform?: string;     // 转换函数
}

interface ExcelInfo {
  headers: string[];      // 列名
  sheets: string[];       // Sheet名称
  sampleData: any[];      // 样本数据
}

interface TemplateInfo {
  placeholders: string[]; // 占位符列表
  textContent?: string;   // 模板文本
}
```

## 内置转换函数

| 函数名 | 代码 | 说明 |
|--------|------|------|
| 转大写 | `String(value).toUpperCase()` | 文本转大写 |
| 转小写 | `String(value).toLowerCase()` | 文本转小写 |
| 去空格 | `String(value).trim()` | 去除首尾空格 |
| 转数字 | `Number(value)` | 转换为数字 |
| 保留小数 | `Number(value).toFixed(2)` | 格式化小数 |
| 千分位 | `Number(value).toLocaleString()` | 添加千分位 |
| 格式化日期 | `new Date(value).toLocaleDateString("zh-CN")` | 中文日期 |
| 货币格式 | `"¥" + Number(value).toLocaleString()` | 货币符号 |
| 百分比 | `Number(value) * 100 + "%"` | 百分比格式 |

## 配置选项

```typescript
interface MappingEditorConfig {
  readonly?: boolean;           // 只读模式
  showAiSuggestions?: boolean;  // 显示AI建议
  allowManualAdd?: boolean;     // 允许手动添加
  showPreview?: boolean;        // 显示预览
  showValidation?: boolean;     // 显示验证
}
```

## API参考

### MappingEditor

主组件，包含所有映射编辑功能。

**Props:**

- `mappingScheme` (必需) - 当前映射方案
- `excelInfo` (必需) - Excel数据信息
- `templateInfo` (必需) - 模板占位符信息
- `aiInfo` (可选) - AI生成信息
- `config` (可选) - 配置选项
- `onChange` (可选) - 映射变更回调
- `onValidate` (可选) - 验证回调
- `onAutoMap` (可选) - AI自动映射回调

## 示例

### 基础示例

```typescript
<MappingEditor
  mappingScheme={mappingScheme}
  excelInfo={excelInfo}
  templateInfo={templateInfo}
  onChange={setMappingScheme}
/>
```

### 完整示例

```typescript
<MappingEditor
  mappingScheme={mappingScheme}
  excelInfo={{
    headers: ['产品名称', '销售额', '类别'],
    sheets: ['Sheet1'],
    sampleData: sampleData
  }}
  templateInfo={{
    placeholders: ['{{产品名称}}', '{{销售额}}', '{{类别}}']
  }}
  aiInfo={{
    explanation: '基于语义匹配',
    confidence: 0.92
  }}
  config={{
    readonly: false,
    showAiSuggestions: true,
    allowManualAdd: true,
    showPreview: true,
    showValidation: true
  }}
  onChange={setMappingScheme}
  onValidate={customValidate}
  onAutoMap={handleAutoMap}
/>
```

## 开发指南

### 运行示例

```typescript
import { MappingEditorExample } from './components/MappingEditor/MappingEditorExample';

export default MappingEditorExample;
```

### 运行测试

```bash
npm test -- MappingEditor.test.tsx
```

### 代码覆盖率

```bash
npm test:coverage -- MappingEditor.test.tsx
```

## 样式定制

组件使用Tailwind CSS，可以通过以下方式定制：

1. **修改主题色** - 在`tailwind.config.js`中配置
2. **自定义类名** - 使用`className`属性
3. **内联样式** - 使用`style`属性

## 浏览器支持

- Chrome/Edge (最新版)
- Firefox (最新版)
- Safari (最新版)

## 依赖项

- React 18+
- TypeScript 5+
- Tailwind CSS 3+

## 贡献指南

1. Fork本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建Pull Request

## 许可证

MIT License

## 作者

ExcelMind AI Team

## 相关资源

- [使用指南](./MAPPING_EDITOR_GUIDE.md)
- [示例代码](./MappingEditorExample.tsx)
- [测试文件](./MappingEditor.test.tsx)

## 更新日志

### v1.0.0 (2024-01-29)

- ✨ 初始版本发布
- ✨ 完整的映射编辑功能
- ✨ AI智能映射
- ✨ 转换函数编辑器
- ✨ 实时验证和预览
- ✨ 单元测试覆盖
- ✨ 完整文档
