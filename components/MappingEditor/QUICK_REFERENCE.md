# 映射编辑器 - 快速参考卡片

## 🚀 快速开始

```typescript
import { MappingEditor } from './components/MappingEditor';

<MappingEditor
  mappingScheme={mappingScheme}
  excelInfo={excelInfo}
  templateInfo={templateInfo}
  onChange={setMappingScheme}
/>
```

## 📁 文件结构

```
MappingEditor/
├── 🎯 核心 (8个组件)
│   ├── MappingEditor.tsx          主组件
│   ├── MappingList.tsx            映射列表
│   ├── MappingEditDialog.tsx      编辑对话框
│   ├── TransformEditor.tsx        转换编辑器
│   ├── UnmappedPanel.tsx          未映射面板
│   ├── MappingValidator.tsx       验证器
│   ├── AutoMapButton.tsx          AI按钮
│   └── MappingPreview.tsx         预览组件
│
├── 📚 文档 (7个文件)
│   ├── index.ts                   导出
│   ├── README.md                  概览
│   ├── MAPPING_EDITOR_GUIDE.md    API文档
│   ├── INTEGRATION.md             集成指南
│   ├── DELIVERY.md                交付清单
│   ├── VISUAL_PREVIEW.md          设计规范
│   └── PROJECT_SUMMARY.md         项目总结
│
└── 💻 代码 (3个文件)
    ├── MappingEditorExample.tsx   示例
    └── MappingEditor.test.tsx     测试
```

## 🎨 主要功能

| 功能 | 组件 | 说明 |
|------|------|------|
| 📋 映射列表 | MappingList | 拖拽排序 |
| ✏️ 编辑映射 | MappingEditDialog | 编辑对话框 |
| 🔧 数据转换 | TransformEditor | 12个内置函数 |
| ⚠️ 未映射字段 | UnmappedPanel | 快速映射 |
| ✔️ 验证映射 | MappingValidator | 实时检查 |
| 🤖 AI映射 | AutoMapButton | 智能匹配 |
| 👁️ 数据预览 | MappingPreview | 结果展示 |

## 🔧 配置选项

```typescript
config={{
  readonly: false,              // 只读模式
  showAiSuggestions: true,      // AI建议
  allowManualAdd: true,         // 手动添加
  showPreview: true,            // 显示预览
  showValidation: true          // 显示验证
}}
```

## 🎯 内置转换函数

### 字符串
- `toUpperCase()` - 转大写
- `toLowerCase()` - 转小写
- `trim()` - 去空格
- `substring(0, 10)` - 截取
- `replace("旧", "新")` - 替换

### 数字
- `Number(value)` - 转数字
- `toFixed(2)` - 保留小数
- `toLocaleString()` - 千分位

### 日期
- `toLocaleDateString("zh-CN")` - 日期
- `toLocaleString("zh-CN")` - 时间

### 格式化
- `"¥" + toLocaleString()` - 货币
- `* 100 + "%"` - 百分比

## 📊 数据流

```
用户操作
  ↓
组件事件
  ↓
onChange回调
  ↓
状态更新
  ↓
重新渲染
```

## 🎨 UI组件

### 状态指示
- ✅ 绿色 - 成功
- ⚠️ 黄色 - 警告
- ❌ 红色 - 错误

### 操作按钮
- 🖱️ 拖拽 - 排序
- ✏️ 编辑 - 修改
- 🗑️ 删除 - 移除

## 📖 文档导航

| 需求 | 查看文档 |
|------|----------|
| 快速开始 | README.md |
| API文档 | MAPPING_EDITOR_GUIDE.md |
| 集成指南 | INTEGRATION.md |
| UI设计 | VISUAL_PREVIEW.md |
| 项目信息 | PROJECT_SUMMARY.md |
| 交付内容 | DELIVERY.md |

## 🔍 常见问题

### Q: 如何启用只读模式？
```typescript
config={{ readonly: true }}
```

### Q: 如何隐藏预览？
```typescript
config={{ showPreview: false }}
```

### Q: 如何自定义验证？
```typescript
onValidate={customValidateFunction}
```

### Q: 如何集成AI服务？
```typescript
onAutoMap={async () => {
  return await aiService.generateMapping();
}}
```

## 🎯 核心优势

1. ✨ **功能完整** - 覆盖所有映射场景
2. 🎨 **视觉精美** - 现代化UI设计
3. 🤖 **AI智能** - 自动匹配字段
4. 📝 **文档完善** - 7个详细文档
5. 🔒 **类型安全** - 完整TypeScript支持

## 📦 技术栈

- React 18+
- TypeScript 5+
- Tailwind CSS 3+
- Vite 6+

---

**版本：** v1.0.0
**状态：** ✅ 已完成
**总代码量：** 4,790行
**组件数量：** 8个核心组件
**文档数量：** 7个文档文件
