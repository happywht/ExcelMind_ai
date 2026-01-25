# QueryVisualizer 快速开始指南

## 5分钟快速上手

### 第1步：确认依赖

确保已安装`recharts`依赖：

```bash
cd "D:\家庭\青聪赋能\excelmind-ai"
pnpm install recharts
```

### 第2步：导入组件

在你的组件中导入QueryVisualizer：

```tsx
import { QueryVisualizer } from './components/QueryVisualizer';
import type { QueryResult } from './services/queryEngine/DataQueryEngine';
```

### 第3步：准备数据

准备查询结果数据：

```tsx
const queryResult: QueryResult = {
  data: [
    { 姓名: '张三', 部门: '销售部', 销售额: 150000, 日期: '2024-01-15' },
    { 姓名: '李四', 部门: '技术部', 销售额: 98000, 日期: '2024-01-16' },
    { 姓名: '王五', 部门: '销售部', 销售额: 187000, 日期: '2024-01-17' }
  ],
  sql: 'SELECT * FROM 员工 WHERE 销售额 > 50000',
  executionTime: 45,
  rowCount: 3,
  explanation: '查询销售额大于5万的员工',
  success: true
};
```

### 第4步：使用组件

渲染组件：

```tsx
function MyComponent() {
  return (
    <div style={{ height: '600px' }}>
      <QueryVisualizer result={queryResult} />
    </div>
  );
}
```

## 常见使用场景

### 场景1：基础查询结果展示

```tsx
import { QueryVisualizer } from './components/QueryVisualizer';

function QueryResultPage() {
  const [result, setResult] = useState<QueryResult | null>(null);

  // 执行查询后设置结果
  const executeQuery = async () => {
    const queryResult = await fetchQueryResult();
    setResult(queryResult);
  };

  return (
    <div className="h-screen">
      {result && <QueryVisualizer result={result} />}
    </div>
  );
}
```

### 场景2：与DataQueryEngine集成

```tsx
import { QueryVisualizer } from './components/QueryVisualizer';
import { DataQueryEngine } from './services/queryEngine';

function SmartQueryPage() {
  const [result, setResult] = useState<QueryResult | null>(null);
  const engine = useRef(new DataQueryEngine());

  const handleNaturalQuery = async (query: string) => {
    const queryResult = await engine.current.query({
      naturalLanguage: query
    });
    setResult(queryResult);
  };

  return (
    <div>
      <input
        placeholder="输入查询，例如：显示销售额最高的10个员工"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleNaturalQuery(e.currentTarget.value);
          }
        }}
      />
      {result && (
        <QueryVisualizer
          result={result}
          queryInfo={{
            naturalQuery: e.currentTarget.value,
            executionTime: result.executionTime,
            rowCount: result.rowCount
          }}
        />
      )}
    </div>
  );
}
```

### 场景3：自定义视图配置

```tsx
<QueryVisualizer
  result={result}
  config={{
    showTable: true,          // 显示表格视图
    showChart: true,          // 显示图表视图
    showStats: true,          // 显示统计面板
    defaultView: 'chart',     // 默认显示图表
    enableVirtualScroll: true, // 启用虚拟滚动
    maxRows: 1000             // 最大显示1000行
  }}
/>
```

### 场景4：处理导出和刷新

```tsx
<QueryVisualizer
  result={result}
  onExport={(format) => {
    console.log(`用户导出数据为 ${format}`);
    // 可以在这里添加额外的导出逻辑
  }}
  onRefresh={() => {
    console.log('用户请求刷新数据');
    // 重新执行查询
    executeQuery();
  }}
  onEditQuery={() => {
    console.log('用户想要编辑查询');
    // 打开查询编辑器
    setShowQueryEditor(true);
  }}
/>
```

### 场景5：使用QueryVisualizerExample

使用预构建的示例组件：

```tsx
import { QueryVisualizerExample } from './components/QueryVisualizer/QueryVisualizerExample';

function MyExcelPage() {
  const excelData = {
    fileName: '销售数据.xlsx',
    sheets: {
      'Sheet1': [
        { 日期: '2024-01-01', 销售额: 150000, 部门: '销售部', 员工: '张三' },
        { 日期: '2024-01-02', 销售额: 180000, 部门: '销售部', 员工: '李四' }
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

## 样式调整

### 调整组件高度

```tsx
<div style={{ height: '800px' }}>
  <QueryVisualizer result={result} />
</div>
```

### 自定义容器样式

```tsx
<div className="my-custom-class">
  <QueryVisualizer result={result} />
</div>
```

```css
.my-custom-class {
  height: 100vh;
  padding: 20px;
  background: #f8fafc;
}
```

## 性能优化建议

### 处理大数据集

```tsx
<QueryVisualizer
  result={largeResult}
  config={{
    enableVirtualScroll: true,  // 启用虚拟滚动
    maxRows: 5000               // 限制最大行数
  }}
/>
```

### 懒加载组件

```tsx
import { lazy, Suspense } from 'react';

const QueryVisualizer = lazy(() => import('./components/QueryVisualizer'));

function MyComponent() {
  return (
    <Suspense fallback={<div>加载中...</div>}>
      <QueryVisualizer result={result} />
    </Suspense>
  );
}
```

## 故障排查

### 问题：组件不显示数据

**解决方案**：
1. 检查`result.data`是否为数组
2. 确认`result.success`为`true`
3. 查看浏览器控制台是否有错误

### 问题：图表不显示

**解决方案**：
1. 确认数据包含数值列
2. 检查是否正确安装了`recharts`
3. 尝试手动指定`xField`和`yField`

### 问题：导出失败

**解决方案**：
1. 确认安装了`xlsx`包
2. 检查浏览器是否支持下载
3. 查看控制台错误信息

## 下一步

- 阅读完整文档：`docs/QUERY_VISUALIZER_GUIDE.md`
- 查看API文档：组件README.md
- 运行Storybook：`npm run storybook`
- 查看测试用例：`QueryVisualizer.test.tsx`

## 获取帮助

- 查看示例代码：`QueryVisualizerExample.tsx`
- 阅读Storybook故事：`QueryVisualizer.stories.tsx`
- 参考单元测试：`QueryVisualizer.test.tsx`

---

**提示**: 遇到问题时，首先检查浏览器控制台的错误信息，这通常会提供有用的线索。
