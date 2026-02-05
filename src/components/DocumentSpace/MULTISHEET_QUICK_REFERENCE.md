# DocumentSpace多Sheet支持 - 快速参考

## 修改摘要

### 文件修改列表
| 文件 | 修改类型 | 说明 |
|------|---------|------|
| `components/DocumentSpace/DocumentSpace.tsx` | 更新 | 添加多Sheet状态和逻辑 |
| `components/DocumentSpace/DocumentSpaceSidebar.tsx` | 更新 | 集成SheetSelector组件 |
| `components/DocumentSpace/SheetSelector.tsx` | 已存在 | Sheet选择器组件 |

### 核心改动

#### 1. 新增状态
```typescript
const [primarySheet, setPrimarySheet] = useState<string>('');
const [enabledSheets, setEnabledSheets] = useState<string[]>([]);
```

#### 2. AI映射API升级
```typescript
// 旧版本（V1）
const mapping = await generateFieldMapping({
  excelHeaders: headers,
  excelSampleData: sampleData,
  templatePlaceholders: templateFile.placeholders,
  userInstruction: userInstruction.trim()
});

// 新版本（V2）- 支持多Sheet
const allSheetsInfo: SheetInfo[] = Object.entries(excelData.sheets).map(([sheetName, data]) => ({
  sheetName,
  headers: data.length > 0 ? Object.keys(data[0]) : [],
  rowCount: data.length,
  sampleData: data.slice(0, 5)
}));

const mapping = await generateFieldMappingV2({
  allSheetsInfo,
  primarySheet: primarySheet || undefined,
  templatePlaceholders: templateFile.placeholders,
  userInstruction: userInstruction.trim()
});
```

#### 3. 文档生成逻辑更新
```typescript
// 使用映射方案中的主Sheet
const sheetToUse = mappingScheme.primarySheet || excelData.currentSheetName;
const currentSheetData = excelData.sheets[sheetToUse] || [];
```

## 使用示例

### 单Sheet场景
```typescript
// 上传Excel
用户上传: single_sheet.xlsx (一个工作表)
→ 自动设置: primarySheet = "Sheet1"
→ UI显示: 单Sheet提示
→ AI映射: 使用V2 API（向后兼容）
→ 文档生成: 使用"Sheet1"数据
```

### 多Sheet场景
```typescript
// 上传Excel
用户上传: multi_sheet.xlsx (多个工作表)
→ 自动设置: primarySheet = 第一个Sheet
→ UI显示: SheetSelector（可选择主Sheet和辅助Sheet）

// 用户操作
1. 选择主Sheet: "员工信息"
2. 启用辅助Sheet: ["部门信息", "职位信息"]

// AI映射
AI分析所有Sheet → 生成映射方案（可能包含跨Sheet映射）

// 映射方案显示
- 主数据表: "员工信息"
- 已映射: 5个字段
- 跨Sheet查找: 2个（从"部门信息"获取部门名称等）

// 文档生成
使用主Sheet "员工信息" 的每一行数据生成文档
```

## UI组件层次

```
DocumentSpace (主组件)
├── DocumentSpaceSidebar (左侧边栏)
│   ├── 模板上传
│   ├── 数据上传
│   ├── SheetSelector (新增) ← 多Sheet选择
│   │   ├── 主数据表选择
│   │   └── 辅助数据表启用
│   ├── AI指令输入
│   ├── 生成映射按钮
│   ├── 映射方案显示 (增强)
│   │   ├── 主数据表信息 (新增)
│   │   ├── 已映射字段
│   │   ├── 跨Sheet查找 (新增)
│   │   └── 置信度 (新增)
│   ├── 生成文档按钮
│   ├── 已生成文档列表
│   └── 处理日志
└── DocumentSpaceMain (右侧主内容)
    ├── 模板预览
    ├── 数据预览
    ├── 映射编辑器
    └── 文档列表
```

## 数据流图

```
┌─────────────────────────────────────────────────────────┐
│                    用户上传Excel                          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │  readExcelFile()        │
        │  返回: {                │
        │    sheets: {            │
        │      "Sheet1": [...],   │
        │      "Sheet2": [...]    │
        │    },                   │
        │    currentSheetName     │
        │  }                      │
        └───────────┬────────────┘
                    │
                    ▼
        ┌────────────────────────┐
        │  自动设置primarySheet   │
        │  = currentSheetName     │
        └───────────┬────────────┘
                    │
                    ▼
        ┌────────────────────────┐
        │  显示SheetSelector      │
        │  - 用户可调整主Sheet    │
        │  - 用户可启用辅助Sheet  │
        └───────────┬────────────┘
                    │
                    ▼
        ┌────────────────────────┐
        │  用户点击"生成映射"     │
        └───────────┬────────────┘
                    │
                    ▼
        ┌────────────────────────┐
        │  构建allSheetsInfo      │
        │  [{                     │
        │    sheetName,           │
        │    headers,             │
        │    rowCount,            │
        │    sampleData           │
        │  }]                     │
        └───────────┬────────────┘
                    │
                    ▼
        ┌────────────────────────┐
        │  调用generateFieldMap-  │
        │  pingV2({              │
        │    allSheetsInfo,       │
        │    primarySheet,        │
        │    ...                  │
        │  })                     │
        └───────────┬────────────┘
                    │
                    ▼
        ┌────────────────────────┐
        │  AI分析并返回映射方案   │
        │  {                     │
        │    primarySheet,        │
        │    mappings,            │
        │    crossSheetMappings,  │
        │    confidence,          │
        │    ...                  │
        │  }                     │
        └───────────┬────────────┘
                    │
                    ▼
        ┌────────────────────────┐
        │  更新primarySheet       │
        │  (如果AI建议不同)       │
        └───────────┬────────────┘
                    │
                    ▼
        ┌────────────────────────┐
        │  显示映射方案           │
        │  - 主数据表信息         │
        │  - 跨Sheet映射          │
        │  - 置信度               │
        └───────────┬────────────┘
                    │
                    ▼
        ┌────────────────────────┐
        │  用户点击"生成文档"     │
        └───────────┬────────────┘
                    │
                    ▼
        ┌────────────────────────┐
        │  使用primarySheet       │
        │  生成文档               │
        └────────────────────────┘
```

## 关键接口

### SheetInfo接口
```typescript
interface SheetInfo {
  sheetName: string;              // Sheet名称
  headers: string[];              // 表头字段列表
  rowCount: number;               // 数据行数
  sampleData: Record<string, any>[];  // 示例数据（前5行）
}
```

### MappingScheme扩展
```typescript
interface MappingScheme {
  explanation: string;           // 映射思路说明
  primarySheet: string;           // 主数据sheet（新增）
  filterCondition: string | null; // 筛选条件
  mappings: FieldMapping[];       // 主sheet的字段映射
  crossSheetMappings?: CrossSheetMapping[];  // 跨sheet映射（新增）
  unmappedPlaceholders: string[]; // 未映射的占位符
  allSheetsInfo?: SheetInfo[];   // 所有可用sheet的信息（新增）
  confidence?: number;           // 映射方案的置信度（新增）
}
```

### CrossSheetMapping接口
```typescript
interface CrossSheetMapping {
  placeholder: string;           // 模板占位符
  sourceSheet: string;           // 来源sheet名称
  sourceColumn: string;          // 来源列名
  lookupKey: string;            // 关联字段
  relationshipType?: 'oneToOne' | 'manyToOne';  // 关系类型
  transform?: string;           // 可选的数据转换代码
}
```

## Props变更

### DocumentSpace新增Props
```typescript
// 传递给DocumentSpaceSidebar
<DocumentSpaceSidebar
  // ... 现有props
  excelData={excelData}              // 新增：Excel数据
  primarySheet={primarySheet}         // 新增：主Sheet
  enabledSheets={enabledSheets}       // 新增：启用的辅助Sheet
  onPrimarySheetChange={setPrimarySheet}    // 新增：主Sheet变更回调
  onEnabledSheetsChange={setEnabledSheets}  // 新增：辅助Sheet变更回调
/>
```

## 样式说明

### SheetSelector样式
- 主数据表区：绿色渐变背景 (emerald-50 to teal-50)
- 辅助数据表区：蓝色渐变背景 (blue-50 to indigo-50)
- 启用状态：蓝色边框和背景 (blue-50, border-blue-300)
- 禁用状态：灰色样式 (bg-slate-50, opacity-60)

### 映射方案样式
- 主数据表信息：绿色背景 (bg-emerald-50)
- 已映射字段：绿色边框 (border-emerald-200)
- 跨Sheet映射：紫色背景 (bg-purple-50, border-purple-200)
- 未映射字段：橙色背景 (bg-amber-50)

## 调试技巧

### 查看Sheet信息
```typescript
console.log('所有Sheet:', Object.keys(excelData.sheets));
console.log('主Sheet:', primarySheet);
console.log('启用的辅助Sheet:', enabledSheets);
```

### 查看映射方案
```typescript
console.log('映射方案:', {
  主Sheet: mappingScheme.primarySheet,
  映射数量: mappingScheme.mappings.length,
  跨Sheet映射数量: mappingScheme.crossSheetMappings?.length || 0,
  置信度: mappingScheme.confidence
});
```

### 查看AI请求参数
```typescript
console.log('AI请求参数:', {
  allSheetsInfo: allSheetsInfo.map(s => ({
    name: s.sheetName,
    rows: s.rowCount,
    columns: s.headers.length
  })),
  primarySheet: primarySheet
});
```

## 性能考虑

### 大数据集优化
- 使用slice(0, 5)只发送前5行样本数据给AI
- SheetSelector使用虚拟滚动（如果Sheet很多）
- 映射方案显示区域限制最大高度并使用滚动

### 内存优化
- 避免在状态中存储完整的Excel数据副本
- 使用useMemo缓存计算结果
- 及时清理不需要的状态

## 兼容性

### 浏览器支持
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

### 依赖版本
- React 18+
- TypeScript 5+
- Lucide React (图标库)

## 常见问题

**Q: 单Sheet场景会显示SheetSelector吗？**
A: 不会。如果Excel只有一个Sheet，SheetSelector会显示单Sheet提示信息。

**Q: AI总是使用用户选择的主Sheet吗？**
A: 不一定。AI可能会根据数据分析和用户指令建议更合适的主Sheet，但会记录在日志中。

**Q: 跨Sheet映射什么时候会出现？**
A: 当模板需要的字段在主Sheet中不存在，但在其他Sheet中存在时，AI会生成跨Sheet映射。

**Q: 如何禁用多Sheet功能？**
A: 不需要特别禁用。如果Excel只有一个Sheet，系统会自动回退到单Sheet模式。

## 相关文档

- [集成总结](./MULTISHEET_INTEGRATION_SUMMARY.md) - 详细的实现说明
- [测试指南](./MULTISHEET_INTEGRATION_TEST.md) - 完整的测试步骤
- [SheetSelector文档](./SheetSelector.example.tsx) - 组件使用示例
- [API文档](../../services/documentMappingService.ts) - 映射服务API
