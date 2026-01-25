# QueryVisualizer 组件使用指南

## 概述

`QueryVisualizer` 是一个功能强大的查询结果可视化组件系统，提供表格视图、图表视图、统计信息和导出功能。

## 功能特性

### 核心功能

- **表格视图**: 可排序、可过滤、可分页的数据表格
- **图表视图**: 自动检测数据类型，生成最佳图表（柱状图、折线图、饼图、散点图、面积图）
- **统计信息**: 详细的列统计信息（数值统计、分类统计、空值分析）
- **导出功能**: 支持CSV、Excel、JSON、PNG格式导出

### 技术特性

- TypeScript类型安全
- 响应式设计
- 性能优化（虚拟滚动、懒加载）
- 可访问性（ARIA标签）
- 完整的单元测试

## 快速开始

### 基础使用

```tsx
import { QueryVisualizer } from './components/QueryVisualizer';

const result = {
  data: [
    { 姓名: '张三', 部门: '销售部', 销售额: 150000 },
    { 姓名: '李四', 部门: '技术部', 销售额: 98000 }
  ],
  sql: 'SELECT * FROM 员工 WHERE 销售额 > 50000',
  executionTime: 45,
  rowCount: 2,
  success: true
};

<QueryVisualizer
  result={result}
  queryInfo={{
    sql: result.sql,
    executionTime: result.executionTime,
    rowCount: result.rowCount,
    naturalQuery: '显示销售额大于5万的员工'
  }}
/>
```

### 高级配置

```tsx
<QueryVisualizer
  result={result}
  queryInfo={queryInfo}
  config={{
    showTable: true,          // 显示表格视图
    showChart: true,          // 显示图表视图
    showStats: true,          // 显示统计信息
    defaultView: 'table',     // 默认视图: 'table' | 'chart' | 'stats'
    enableVirtualScroll: true, // 启用虚拟滚动
    maxRows: 1000             // 最大显示行数
  }}
  onExport={(format) => {
    console.log(`导出为 ${format}`);
  }}
  onRefresh={() => {
    console.log('刷新数据');
  }}
  onEditQuery={() => {
    console.log('编辑查询');
  }}
/>
```

## API 参考

### QueryVisualizerProps

| 属性 | 类型 | 必需 | 默认值 | 描述 |
|------|------|------|--------|------|
| `result` | `QueryResult` | 是 | - | 查询结果数据 |
| `queryInfo` | `QueryInfo` | 否 | - | 查询信息 |
| `config` | `VisualizerConfig` | 否 | `{}` | 可视化配置 |
| `onExport` | `(format) => void` | 否 | - | 导出回调 |
| `onRefresh` | `() => void` | 否 | - | 刷新回调 |
| `onEditQuery` | `() => void` | 否 | - | 编辑查询回调 |

### QueryResult

```typescript
interface QueryResult {
  data: any[];              // 查询数据
  sql: string;              // 实际执行的SQL
  executionTime: number;    // 执行时间（毫秒）
  rowCount: number;         // 返回行数
  explanation?: string;     // 查询说明
  plan?: QueryPlan;         // 查询计划
  error?: string;           // 错误信息
  success: boolean;         // 成功标志
}
```

### VisualizerConfig

```typescript
interface VisualizerConfig {
  showTable?: boolean;          // 显示表格视图，默认 true
  showChart?: boolean;          // 显示图表视图，默认 true
  showStats?: boolean;          // 显示统计信息，默认 true
  defaultView?: 'table' | 'chart' | 'stats';  // 默认视图
  enableVirtualScroll?: boolean; // 启用虚拟滚动，默认 true
  maxRows?: number;             // 最大显示行数，默认 1000
}
```

## 子组件使用

### TableView（表格视图）

```tsx
import { TableView } from './components/QueryVisualizer';

<TableView
  data={data}
  columns={['姓名', '部门', '销售额']}
  sortable={true}          // 可排序
  filterable={true}        // 可过滤
  pagination={true}         // 启用分页
  pageSize={50}            // 每页50行
  enableVirtualScroll={true} // 启用虚拟滚动
  selectable={true}        // 启用行选择
  onSelectionChange={(rows) => {
    console.log('选中行:', rows);
  }}
/>
```

### ChartView（图表视图）

```tsx
import { ChartView } from './components/QueryVisualizer';

<ChartView
  data={data}
  columns={['日期', '销售额']}
  chartType="bar"          // 'bar' | 'line' | 'pie' | 'scatter' | 'area' | 'auto'
  xField="日期"            // X轴字段
  yField="销售额"          // Y轴字段
  colorScheme="default"    // 'default' | 'pastel' | 'vibrant' | 'monochrome'
  aggregation="sum"        // 'sum' | 'avg' | 'count' | 'max' | 'min'
  height={400}             // 图表高度
/>
```

### StatsPanel（统计面板）

```tsx
import { StatsPanel } from './components/QueryVisualizer';

<StatsPanel
  data={data}
  columns={['姓名', '部门', '销售额']}
  executionTime={45}       // 执行时间
  rowCount={100}           // 行数
/>
```

### ExportDialog（导出对话框）

```tsx
import { ExportDialog } from './components/QueryVisualizer';

<ExportDialog
  data={data}
  filename="query_result"
  open={showDialog}
  onExport={(format) => {
    console.log(`导出为 ${format}`);
  }}
  onClose={() => setShowDialog(false)}
/>
```

## 使用场景示例

### 场景1: 查询引擎集成

```tsx
import { QueryVisualizer } from './components/QueryVisualizer';
import { DataQueryEngine } from './services/queryEngine';

function QueryPage() {
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleQuery = async (naturalQuery: string) => {
    setLoading(true);
    try {
      const engine = new DataQueryEngine();
      const queryResult = await engine.query({
        naturalLanguage: naturalQuery
      });
      setResult(queryResult);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        type="text"
        placeholder="输入查询..."
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleQuery(e.currentTarget.value);
          }
        }}
      />
      {loading && <div>查询中...</div>}
      {result && <QueryVisualizer result={result} />}
    </div>
  );
}
```

### 场景2: 数据分析仪表板

```tsx
import { QueryVisualizer, ChartView } from './components/QueryVisualizer';

function Dashboard() {
  const [view, setView] = useState<'overview' | 'details'>('overview');

  return (
    <div>
      {view === 'overview' ? (
        <ChartView
          data={salesData}
          chartType="bar"
          xField="部门"
          yField="销售额"
        />
      ) : (
        <QueryVisualizer
          result={queryResult}
          config={{ defaultView: 'table' }}
        />
      )}
    </div>
  );
}
```

### 场景3: 数据导出功能

```tsx
import { ExportDialog, exportData } from './components/QueryVisualizer';

function DataExport() {
  const [showDialog, setShowDialog] = useState(false);

  const handleQuickExport = () => {
    // 快速导出为Excel
    exportData.excel(data, 'sales_report');
  };

  return (
    <div>
      <button onClick={handleQuickExport}>
        快速导出Excel
      </button>
      <button onClick={() => setShowDialog(true)}>
        选择格式导出
      </button>
      {showDialog && (
        <ExportDialog
          data={data}
          filename="sales_report"
          open={showDialog}
          onExport={(format) => {
            console.log(`已导出为 ${format}`);
          }}
          onClose={() => setShowDialog(false)}
        />
      )}
    </div>
  );
}
```

## 样式自定义

组件使用 Tailwind CSS，可以通过以下方式自定义样式：

### 1. 使用 className 覆盖

```tsx
<QueryVisualizer
  result={result}
  className="custom-visualizer"
/>
```

### 2. 自定义颜色方案

在 `tailwind.config.js` 中扩展颜色：

```js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
        success: '#10b981',
        // ...
      }
    }
  }
}
```

### 3. 使用 CSS 变量

```css
:root {
  --qv-primary-color: #3b82f6;
  --qv-success-color: #10b981;
  --qv-border-color: #e5e7eb;
}
```

## 性能优化建议

### 1. 大数据集处理

```tsx
<QueryVisualizer
  result={result}
  config={{
    enableVirtualScroll: true,  // 启用虚拟滚动
    maxRows: 1000               // 限制最大行数
  }}
/>
```

### 2. 懒加载

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

### 3. 分页配置

```tsx
<TableView
  data={data}
  pagination={true}
  pageSize={50}  // 根据数据量调整
/>
```

## 常见问题

### Q: 如何处理空数据？

A: 组件会自动显示空状态UI，无需额外处理。

### Q: 如何自定义图表类型？

A: 使用 `ChartView` 组件并设置 `chartType` 属性。

### Q: 导出功能支持哪些格式？

A: CSV、Excel (.xlsx)、JSON、PNG。

### Q: 如何实现数据刷新？

A: 使用 `onRefresh` 回调并在其中重新获取数据。

## 贡献指南

欢迎贡献代码、报告问题或提出建议！

## 许可证

MIT License
