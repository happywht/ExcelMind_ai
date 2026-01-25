# QueryVisualizer 组件系统 - 文件结构说明

## 目录结构

```
components/QueryVisualizer/
├── QueryVisualizer.tsx              # 主组件（350行）
│   └── 功能：整合所有视图，提供统一的查询结果可视化界面
│
├── TableView.tsx                    # 表格视图（600行）
│   └── 功能：可排序、可过滤、可分页的数据表格
│
├── ChartView.tsx                    # 图表视图（550行）
│   └── 功能：5种图表类型（柱状/折线/饼图/散点/面积）
│
├── StatsPanel.tsx                   # 统计面板（450行）
│   └── 功能：详细的列统计信息和数据质量分析
│
├── ExportDialog.tsx                 # 导出对话框（450行）
│   └── 功能：支持CSV/Excel/JSON/PNG导出
│
├── QueryVisualizerExample.tsx       # 集成示例（250行）
│   └── 功能：展示如何与DataQueryEngine集成
│
├── QueryVisualizer.stories.tsx      # Storybook故事（350行）
│   └── 功能：交互式组件示例和文档
│
├── QueryVisualizer.test.tsx         # 单元测试（600行）
│   └── 功能：完整的单元测试覆盖
│
├── index.ts                         # 导出文件（20行）
│   └── 功能：统一导出所有组件和类型
│
└── README.md                        # 组件文档（400行）
    └── 功能：详细的API文档和使用说明

docs/
├── QUERY_VISUALIZER_GUIDE.md        # 使用指南
│   └── 内容：完整的功能说明和API参考
│
├── QUERY_VISUALIZER_QUICKSTART.md   # 快速开始
│   └── 内容：5分钟快速上手指南
│
└── QUERY_VISUALIZER_SUMMARY.md      # 项目总结
    └── 内容：交付清单和项目亮点
```

## 文件说明

### 核心组件

#### 1. QueryVisualizer.tsx（主组件）

**主要功能**：
- 视图切换（表格/图表/统计）
- 查询信息显示
- 导出、刷新、编辑查询功能
- 错误和空状态处理

**关键接口**：
```typescript
interface QueryVisualizerProps {
  result: QueryResult;
  queryInfo?: QueryInfo;
  config?: VisualizerConfig;
  onExport?: (format: ExportFormat) => void;
  onRefresh?: () => void;
  onEditQuery?: () => void;
}
```

#### 2. TableView.tsx（表格视图）

**主要功能**：
- 列排序（点击列头）
- 全局搜索过滤
- 分页控制
- 列显示/隐藏
- 行选择
- 单元格复制
- 数据类型自动检测和格式化

**关键特性**：
- 悬停显示单元格操作
- 排序状态指示
- 分页控件（首页/末页）
- 空值友好显示

#### 3. ChartView.tsx（图表视图）

**主要功能**：
- 5种图表类型
- 自动检测最佳图表
- 4种颜色方案
- 5种聚合方式
- X/Y轴字段选择
- 图例和工具提示

**支持的图表类型**：
- 柱状图（Bar）
- 折线图（Line）
- 饼图（Pie）
- 散点图（Scatter）
- 面积图（Area）

#### 4. StatsPanel.tsx（统计面板）

**主要功能**：
- 整体统计概览
- 列级别统计
- 数值统计（最小/最大/平均/中位数/标准差/总和）
- 分类统计（唯一值、Top值分布）
- 数据质量评估
- 数据预览

**统计指标**：
- 空值统计（数量和百分比）
- 唯一值数量
- 数据质量等级
- 频率分布

#### 5. ExportDialog.tsx（导出对话框）

**主要功能**：
- 4种导出格式
- 文件名自定义
- 预估文件大小
- 导出进度提示

**支持的格式**：
- CSV（逗号分隔值）
- Excel（.xlsx）
- JSON（格式化）
- PNG（图片，需要html2canvas）

### 配置和工具

#### 6. QueryVisualizerExample.tsx（集成示例）

**主要功能**：
- 展示完整的查询流程
- 自然语言查询
- SQL查询
- 快速查询示例
- 与DataQueryEngine集成

**使用场景**：
- 作为独立页面使用
- 集成到SmartExcel组件
- 学习参考实现

#### 7. QueryVisualizer.stories.tsx（Storybook）

**主要功能**：
- 交互式组件示例
- 各种使用场景演示
- Props配置说明

**包含的故事**：
- Default（基础用法）
- TableView（表格视图）
- ChartView（图表视图）
- StatsPanel（统计面板）
- TimeSeries（时间序列）
- LargeDataSet（大数据集）
- ErrorState（错误状态）
- EmptyState（空数据状态）
- CustomConfig（自定义配置）
- SalesAnalysis（销售分析）
- PerformanceDistribution（绩效分布）
- MultiDimensionalAnalysis（多维分析）

#### 8. QueryVisualizer.test.tsx（单元测试）

**测试覆盖**：
- 组件渲染测试
- 交互功能测试
- 数据处理测试
- 边界情况测试
- 性能测试

**测试框架**：
- Jest
- React Testing Library
- @testing-library/jest-dom

#### 9. index.ts（导出文件）

**导出内容**：
- 所有组件
- 所有类型
- 辅助函数

### 文档

#### 10. README.md（组件文档）

**包含内容**：
- 组件介绍
- 快速开始
- API文档
- 使用示例
- 性能优化
- 常见问题

#### 11. QUERY_VISUALIZER_GUIDE.md（使用指南）

**包含内容**：
- 功能特性详解
- API参考
- 子组件使用
- 使用场景示例
- 样式自定义
- 性能优化建议

#### 12. QUERY_VISUALIZER_QUICKSTART.md（快速开始）

**包含内容**：
- 5分钟快速上手
- 常见使用场景
- 样式调整
- 性能优化
- 故障排查

#### 13. QUERY_VISUALIZER_SUMMARY.md（项目总结）

**包含内容**：
- 交付清单
- 功能实现详情
- 技术架构
- 设计系统
- 测试覆盖
- 性能指标
- 项目亮点

## 依赖关系

```
QueryVisualizer（主组件）
├── TableView（表格视图）
├── ChartView（图表视图）
│   └── recharts（图表库）
├── StatsPanel（统计面板）
└── ExportDialog（导出对话框）
    └── xlsx（Excel导出）

QueryVisualizerExample（示例）
├── QueryVisualizer
└── DataQueryEngine（查询引擎）
```

## 数据流向

```
用户输入
    ↓
DataQueryEngine（查询执行）
    ↓
QueryResult（查询结果）
    ↓
QueryVisualizer（可视化）
    ↓
├── TableView（表格展示）
├── ChartView（图表展示）
├── StatsPanel（统计展示）
└── ExportDialog（数据导出）
```

## 代码统计

| 类别 | 文件数 | 代码行数 | 说明 |
|------|--------|---------|------|
| 核心组件 | 5 | ~2,400 | 主要功能实现 |
| 配置工具 | 4 | ~1,200 | 示例、测试、文档 |
| 文档 | 4 | ~1,000 | 使用指南和说明 |
| **总计** | **13** | **~4,600** | **完整系统** |

## 使用方式

### 基础使用

```tsx
import { QueryVisualizer } from './components/QueryVisualizer';

<QueryVisualizer result={queryResult} />
```

### 高级使用

```tsx
import { QueryVisualizer, TableView, ChartView, StatsPanel } from './components/QueryVisualizer';

// 使用主组件
<QueryVisualizer
  result={queryResult}
  config={{ defaultView: 'chart' }}
  onExport={(format) => handleExport(format)}
/>

// 或单独使用子组件
<TableView data={data} columns={columns} />
<ChartView data={data} chartType="bar" />
<StatsPanel data={data} executionTime={45} />
```

### 使用示例组件

```tsx
import { QueryVisualizerExample } from './components/QueryVisualizer/QueryVisualizerExample';

<QueryVisualizerExample excelData={excelData} />
```

## 开发指南

### 添加新功能

1. 在相应的组件文件中添加功能
2. 更新TypeScript类型定义
3. 添加单元测试
4. 更新Storybook故事
5. 更新文档

### 修改样式

- 使用Tailwind CSS类名
- 遵循设计系统的颜色和间距
- 保持响应式设计

### 性能优化

- 使用React.memo优化组件
- 使用useMemo缓存计算结果
- 使用useCallback稳定函数引用
- 大数据集考虑虚拟滚动

## 维护建议

1. **定期更新依赖**：保持recharts、xlsx等库的最新版本
2. **监控性能**：使用React DevTools分析组件性能
3. **收集反馈**：记录用户使用反馈，持续改进
4. **扩展功能**：根据需求添加新的图表类型或功能

---

**文档版本**: v1.0.0
**最后更新**: 2024-01-15
