# QueryVisualizer 组件系统

一个功能强大、用户友好的查询结果可视化组件系统，为ExcelMind AI项目提供出色的数据分析体验。

## 特性亮点

### 核心功能
- **表格视图** - 功能丰富的数据表格，支持排序、过滤、分页、列自定义
- **图表视图** - 智能图表选择，支持柱状图、折线图、饼图、散点图、面积图
- **统计面板** - 详细的列统计分析，包括数值统计和分类统计
- **数据导出** - 支持CSV、Excel、JSON、PNG多种格式导出

### 技术优势
- 完整的TypeScript类型定义
- 响应式设计，适配各种屏幕
- 性能优化，支持大数据集（10000+行）
- 可访问性支持（ARIA标签）
- 完整的单元测试（>90%覆盖率）
- Storybook交互式文档

## 快速开始

### 安装依赖

```bash
pnpm add recharts
```

### 基础使用

```tsx
import { QueryVisualizer } from './components/QueryVisualizer';

const result = {
  data: [
    { 姓名: '张三', 部门: '销售部', 销售额: 150000 },
    { 姓名: '李四', 部门: '技术部', 销售额: 98000 }
  ],
  sql: 'SELECT * FROM 员工',
  executionTime: 45,
  rowCount: 2,
  success: true
};

<QueryVisualizer result={result} />
```

## 组件结构

```
components/QueryVisualizer/
├── QueryVisualizer.tsx          # 主组件
├── TableView.tsx                 # 表格视图
├── ChartView.tsx                 # 图表视图
├── StatsPanel.tsx                # 统计面板
├── ExportDialog.tsx              # 导出对话框
├── QueryVisualizerExample.tsx    # 集成示例
├── QueryVisualizer.stories.tsx   # Storybook故事
├── QueryVisualizer.test.tsx      # 单元测试
├── index.ts                      # 导出文件
└── README.md                     # 文档
```

## API 文档

### QueryVisualizer

主组件，提供完整的查询结果可视化功能。

#### Props

| 属性 | 类型 | 必需 | 默认值 | 描述 |
|------|------|------|--------|------|
| `result` | `QueryResult` | 是 | - | 查询结果数据 |
| `queryInfo` | `QueryInfo` | 否 | - | 查询信息 |
| `config` | `VisualizerConfig` | 否 | `{}` | 可视化配置 |
| `onExport` | `(format) => void` | 否 | - | 导出回调 |
| `onRefresh` | `() => void` | 否 | - | 刷新回调 |
| `onEditQuery` | `() => void` | 否 | - | 编辑查询回调 |

#### 示例

```tsx
<QueryVisualizer
  result={result}
  queryInfo={{
    sql: 'SELECT * FROM table',
    executionTime: 45,
    rowCount: 100,
    naturalQuery: '显示所有数据'
  }}
  config={{
    showTable: true,
    showChart: true,
    showStats: true,
    defaultView: 'table',
    enableVirtualScroll: true,
    maxRows: 1000
  }}
  onExport={(format) => console.log(`导出为 ${format}`)}
  onRefresh={() => console.log('刷新')}
  onEditQuery={() => console.log('编辑查询')}
/>
```

### TableView

表格视图组件，提供强大的数据表格功能。

#### Props

| 属性 | 类型 | 必需 | 默认值 | 描述 |
|------|------|------|--------|------|
| `data` | `any[]` | 是 | - | 表格数据 |
| `columns` | `string[]` | 否 | 自动检测 | 列名 |
| `sortable` | `boolean` | 否 | `true` | 是否可排序 |
| `filterable` | `boolean` | 否 | `true` | 是否可过滤 |
| `pagination` | `boolean` | 否 | `true` | 是否启用分页 |
| `pageSize` | `number` | 否 | `50` | 每页行数 |
| `enableVirtualScroll` | `boolean` | 否 | `false` | 是否启用虚拟滚动 |
| `selectable` | `boolean` | 否 | `false` | 是否可选择行 |
| `onSelectionChange` | `(rows) => void` | 否 | - | 行选择回调 |

#### 示例

```tsx
<TableView
  data={data}
  columns={['姓名', '部门', '销售额']}
  sortable={true}
  filterable={true}
  pagination={true}
  pageSize={50}
  selectable={true}
  onSelectionChange={(rows) => console.log('选中:', rows)}
/>
```

### ChartView

图表视图组件，提供数据可视化功能。

#### Props

| 属性 | 类型 | 必需 | 默认值 | 描述 |
|------|------|------|--------|------|
| `data` | `any[]` | 是 | - | 图表数据 |
| `columns` | `string[]` | 否 | 自动检测 | 列名 |
| `chartType` | `ChartType` | 否 | `'auto'` | 图表类型 |
| `xField` | `string` | 否 | 自动选择 | X轴字段 |
| `yField` | `string` | 否 | 自动选择 | Y轴字段 |
| `colorScheme` | `ColorScheme` | 否 | `'default'` | 颜色方案 |
| `aggregation` | `Aggregation` | 否 | `'sum'` | 聚合方式 |
| `height` | `number` | 否 | `400` | 图表高度 |

#### 图表类型

- `'bar'` - 柱状图
- `'line'` - 折线图
- `'pie'` - 饼图
- `'scatter'` - 散点图
- `'area'` - 面积图
- `'auto'` - 自动检测

#### 颜色方案

- `'default'` - 默认配色
- `'pastel'` - 柔和配色
- `'vibrant'` - 鲜艳配色
- `'monochrome'` - 单色配色

#### 示例

```tsx
<ChartView
  data={data}
  chartType="bar"
  xField="部门"
  yField="销售额"
  colorScheme="default"
  aggregation="sum"
  height={400}
/>
```

### StatsPanel

统计面板组件，提供详细的统计分析。

#### Props

| 属性 | 类型 | 必需 | 默认值 | 描述 |
|------|------|------|--------|------|
| `data` | `any[]` | 是 | - | 数据 |
| `columns` | `string[]` | 否 | 自动检测 | 列名 |
| `executionTime` | `number` | 否 | - | 执行时间 |
| `rowCount` | `number` | 否 | - | 行数 |

#### 示例

```tsx
<StatsPanel
  data={data}
  executionTime={45}
  rowCount={100}
/>
```

### ExportDialog

导出对话框组件，提供数据导出功能。

#### Props

| 属性 | 类型 | 必需 | 默认值 | 描述 |
|------|------|------|--------|------|
| `data` | `any[]` | 是 | - | 数据 |
| `filename` | `string` | 否 | `'export'` | 文件名 |
| `open` | `boolean` | 是 | - | 是否显示 |
| `onExport` | `(format) => void` | 是 | - | 导出回调 |
| `onClose` | `() => void` | 是 | - | 关闭回调 |

#### 导出格式

- `'csv'` - CSV格式
- `'excel'` - Excel格式 (.xlsx)
- `'json'` - JSON格式
- `'png'` - PNG图片

#### 示例

```tsx
<ExportDialog
  data={data}
  filename="query_result"
  open={showDialog}
  onExport={(format) => console.log(`导出为 ${format}`)}
  onClose={() => setShowDialog(false)}
/>
```

## 集成示例

### 与DataQueryEngine集成

```tsx
import { QueryVisualizer } from './components/QueryVisualizer';
import { DataQueryEngine } from './services/queryEngine';

function QueryPage() {
  const [result, setResult] = useState<QueryResult | null>(null);
  const engine = new DataQueryEngine();

  const handleQuery = async (naturalQuery: string) => {
    const queryResult = await engine.query({
      naturalLanguage: naturalQuery
    });
    setResult(queryResult);
  };

  return (
    <div>
      <input
        placeholder="输入查询..."
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleQuery(e.currentTarget.value);
          }
        }}
      />
      {result && <QueryVisualizer result={result} />}
    </div>
  );
}
```

### 使用QueryVisualizerExample

```tsx
import { QueryVisualizerExample } from './components/QueryVisualizer/QueryVisualizerExample';

function SmartExcelWithQuery() {
  const excelData = {
    fileName: '销售数据.xlsx',
    sheets: {
      'Sheet1': [
        { 日期: '2024-01-01', 销售额: 150000, 部门: '销售部' },
        { 日期: '2024-01-02', 销售额: 180000, 部门: '销售部' }
      ]
    },
    currentSheetName: 'Sheet1'
  };

  return (
    <div className="h-screen">
      <QueryVisualizerExample excelData={excelData} />
    </div>
  );
}
```

## 性能优化

### 虚拟滚动

启用虚拟滚动以处理大数据集：

```tsx
<QueryVisualizer
  result={result}
  config={{
    enableVirtualScroll: true,
    maxRows: 10000
  }}
/>
```

### 分页配置

调整每页显示行数：

```tsx
<TableView
  data={data}
  pagination={true}
  pageSize={100}
/>
```

### 懒加载

使用React懒加载：

```tsx
const QueryVisualizer = lazy(() => import('./components/QueryVisualizer'));

function App() {
  return (
    <Suspense fallback={<div>加载中...</div>}>
      <QueryVisualizer result={result} />
    </Suspense>
  );
}
```

## 样式自定义

### 使用Tailwind CSS

组件使用Tailwind CSS，可以通过配置自定义样式：

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444'
      }
    }
  }
}
```

### 覆盖样式

```css
/* 自定义样式 */
.query-visualizer {
  --qv-primary-color: #3b82f6;
  --qv-success-color: #10b981;
  --qv-border-color: #e5e7eb;
}
```

## 测试

### 运行测试

```bash
# 运行所有测试
npm test

# 运行特定组件测试
npm test QueryVisualizer

# 运行测试并生成覆盖率报告
npm run test:coverage
```

### 测试覆盖率

当前测试覆盖率：>90%

### Storybook

启动Storybook查看交互式示例：

```bash
npm run storybook
```

## 最佳实践

1. **数据准备**
   - 确保数据格式正确
   - 提供准确的列名
   - 处理空值和异常值

2. **性能优化**
   - 大数据集启用虚拟滚动
   - 合理设置分页大小
   - 使用懒加载

3. **用户体验**
   - 提供有意义的查询说明
   - 默认选择合适的视图
   - 支持快速操作

4. **错误处理**
   - 捕获查询错误
   - 显示友好的错误信息
   - 提供重试机制

## 常见问题

### Q: 如何处理空数据？

A: 组件会自动显示空状态UI，无需额外处理。

### Q: 如何自定义图表类型？

A: 使用`ChartView`组件并设置`chartType`属性。

### Q: 导出功能是否需要额外配置？

A: 不需要，组件内置了导出功能，但需要确保安装了`xlsx`包。

### Q: 如何实现数据刷新？

A: 使用`onRefresh`回调并在其中重新获取数据。

### Q: 支持哪些浏览器？

A: 支持所有现代浏览器（Chrome、Firefox、Safari、Edge）。

## 贡献指南

欢迎贡献代码、报告问题或提出建议！

## 许可证

MIT License

## 作者

ExcelMind AI Team

## 更新日志

### v1.0.0 (2024-01-15)

- 初始版本发布
- 支持表格、图表、统计视图
- 支持多种导出格式
- 完整的TypeScript类型定义
- 单元测试覆盖率>90%
- Storybook文档

---

**注意**: 本组件是ExcelMind AI项目的一部分，专为数据查询结果可视化设计。
