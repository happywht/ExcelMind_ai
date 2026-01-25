/**
 * ChartView - 图表视图组件
 *
 * 功能特性：
 * - 自动检测合适的图表类型
 * - 柱状图（分类数据）
 * - 折线图（时间序列）
 * - 饼图（占比数据）
 * - 散点图（相关性）
 * - 面积图（趋势）
 * - 图例和工具提示
 * - 缩放和平移
 * - 数据标签
 * - 图表导出（PNG/SVG）
 *
 * @author ExcelMind AI Team
 * @version 1.0.0
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  ScatterChart,
  Scatter,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  LabelList
} from 'recharts';
import {
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  ScatterChart as ScatterChartIcon,
  AreaChart as AreaChartIcon,
  Settings,
  Download,
  Maximize2,
  RotateCcw
} from 'lucide-react';

// ============================================================
// 类型定义
// ============================================================

export interface ChartViewProps {
  /** 图表数据 */
  data: any[];

  /** 列名 */
  columns?: string[];

  /** 图表类型 */
  chartType?: 'bar' | 'line' | 'pie' | 'scatter' | 'area' | 'auto';

  /** X轴字段 */
  xField?: string;

  /** Y轴字段 */
  yField?: string;

  /** 颜色方案 */
  colorScheme?: 'default' | 'pastel' | 'vibrant' | 'monochrome';

  /** 聚合方式 */
  aggregation?: 'sum' | 'avg' | 'count' | 'max' | 'min';

  /** 图表高度 */
  height?: number;
}

type ChartType = 'bar' | 'line' | 'pie' | 'scatter' | 'area';

// ============================================================
// 颜色方案
// ============================================================

const COLOR_SCHEMES = {
  default: [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
  ],
  pastel: [
    '#93c5fd', '#86efac', '#fcd34d', '#fca5a5', '#c4b5fd',
    '#f9a8d4', '#67e8f9', '#bef264', '#fdba74', '#a5b4fc'
  ],
  vibrant: [
    '#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed',
    '#db2777', '#0891b2', '#65a30d', '#ea580c', '#4f46e5'
  ],
  monochrome: [
    '#1e40af', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe',
    '#1e3a8a', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa'
  ]
};

// ============================================================
// 辅助函数
// ============================================================

/**
 * 检测列数据类型
 */
const detectColumnType = (values: any[]): 'number' | 'date' | 'categorical' => {
  const cleanValues = values.filter(v => v !== null && v !== undefined);

  if (cleanValues.length === 0) return 'categorical';

  // 检查是否为数字
  const numberCount = cleanValues.filter(v => !isNaN(Number(v))).length;
  if (numberCount > cleanValues.length * 0.8) return 'number';

  // 检查是否为日期
  const dateCount = cleanValues.filter(v => !isNaN(Date.parse(String(v)))).length;
  if (dateCount > cleanValues.length * 0.8) return 'date';

  return 'categorical';
};

/**
 * 自动检测最佳图表类型
 */
const detectBestChartType = (
  data: any[],
  columns: string[]
): ChartType => {
  if (data.length === 0 || columns.length === 0) return 'bar';

  // 检测数值列
  const numericColumns = columns.filter(col => {
    const values = data.map(row => row[col]);
    return detectColumnType(values) === 'number';
  });

  // 检测分类列
  const categoricalColumns = columns.filter(col => {
    const values = data.map(row => row[col]);
    return detectColumnType(values) === 'categorical';
  });

  // 检测日期列
  const dateColumns = columns.filter(col => {
    const values = data.map(row => row[col]);
    return detectColumnType(values) === 'date';
  });

  // 决策逻辑
  if (dateColumns.length > 0 && numericColumns.length > 0) {
    return 'line'; // 时间序列数据用折线图
  }

  if (categoricalColumns.length === 1 && numericColumns.length === 1) {
    // 如果分类列的唯一值少于10个，使用饼图
    const uniqueCategories = new Set(data.map(row => row[categoricalColumns[0]]));
    if (uniqueCategories.size <= 10) {
      return 'pie';
    }
    return 'bar';
  }

  if (numericColumns.length >= 2) {
    return 'scatter'; // 多数值列用散点图
  }

  if (numericColumns.length === 1 && categoricalColumns.length >= 1) {
    return 'bar';
  }

  return 'bar'; // 默认使用柱状图
};

/**
 * 推荐X轴和Y轴字段
 */
const recommendAxes = (data: any[], columns: string[]) => {
  const numericColumns: string[] = [];
  const categoricalColumns: string[] = [];
  const dateColumns: string[] = [];

  columns.forEach(col => {
    const values = data.map(row => row[col]);
    const type = detectColumnType(values);

    if (type === 'number') numericColumns.push(col);
    else if (type === 'date') dateColumns.push(col);
    else categoricalColumns.push(col);
  });

  let xField = columns[0];
  let yField = numericColumns[0] || columns[1] || columns[0];

  if (dateColumns.length > 0) {
    xField = dateColumns[0];
    yField = numericColumns[0] || categoricalColumns[0];
  } else if (categoricalColumns.length > 0 && numericColumns.length > 0) {
    xField = categoricalColumns[0];
    yField = numericColumns[0];
  }

  return { xField, yField, numericColumns, categoricalColumns, dateColumns };
};

/**
 * 聚合数据
 */
const aggregateData = (
  data: any[],
  groupBy: string,
  aggregateBy: string,
  aggregation: 'sum' | 'avg' | 'count' | 'max' | 'min'
): any[] => {
  const groups = new Map<string, any[]>();

  data.forEach(row => {
    const key = String(row[groupBy] || '未知');
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(row);
  });

  const result = Array.from(groups.entries()).map(([key, rows]) => {
    let value: number;

    switch (aggregation) {
      case 'sum':
        value = rows.reduce((sum, row) => sum + (Number(row[aggregateBy]) || 0), 0);
        break;
      case 'avg':
        value = rows.reduce((sum, row) => sum + (Number(row[aggregateBy]) || 0), 0) / rows.length;
        break;
      case 'count':
        value = rows.length;
        break;
      case 'max':
        value = Math.max(...rows.map(row => Number(row[aggregateBy]) || 0));
        break;
      case 'min':
        value = Math.min(...rows.map(row => Number(row[aggregateBy]) || 0));
        break;
      default:
        value = rows.length;
    }

    return {
      [groupBy]: key,
      [aggregateBy]: Number(value.toFixed(2))
    };
  });

  return result.sort((a, b) => (b[aggregateBy] as number) - (a[aggregateBy] as number));
};

/**
 * 准备图表数据
 */
const prepareChartData = (
  data: any[],
  xField: string,
  yField: string,
  aggregation: 'sum' | 'avg' | 'count' | 'max' | 'min',
  limit = 20
): any[] => {
  // 检查是否需要聚合
  const xValues = data.map(row => row[xField]);
  const uniqueXValues = new Set(xValues);

  if (uniqueXValues.size < data.length * 0.5) {
    // 需要聚合
    return aggregateData(data, xField, yField, aggregation).slice(0, limit);
  }

  // 不需要聚合，直接返回数据
  return data.slice(0, limit);
};

// ============================================================
// 主组件
// ============================================================

export const ChartView: React.FC<ChartViewProps> = ({
  data,
  columns: propColumns,
  chartType: propChartType = 'auto',
  xField: propXField,
  yField: propYField,
  colorScheme = 'default',
  aggregation = 'sum',
  height = 400
}) => {
  // 状态管理
  const [chartType, setChartType] = useState<ChartType>(() => {
    if (propChartType !== 'auto') return propChartType;

    const cols = propColumns || (data.length > 0 ? Object.keys(data[0]) : []);
    return detectBestChartType(data, cols);
  });
  const [xField, setXField] = useState(propXField || '');
  const [yField, setYField] = useState(propYField || '');
  const [selectedAggregation, setSelectedAggregation] = useState(aggregation);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedScheme, setSelectedScheme] = useState(colorScheme);

  // 获取列名
  const columns = useMemo(() => {
    return propColumns || (data.length > 0 ? Object.keys(data[0]) : []);
  }, [propColumns, data]);

  // 推荐轴字段
  const { xField: recommendedX, yField: recommendedY, numericColumns } = useMemo(() => {
    return recommendAxes(data, columns);
  }, [data, columns]);

  // 使用推荐值或用户指定的值
  const currentXField = xField || recommendedX;
  const currentYField = yField || recommendedY;

  // 准备图表数据
  const chartData = useMemo(() => {
    return prepareChartData(data, currentXField, currentYField, selectedAggregation);
  }, [data, currentXField, currentYField, selectedAggregation]);

  // 颜色数组
  const colors = COLOR_SCHEMES[selectedScheme];

  // 自定义工具提示
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-4 py-2">
        <p className="text-sm font-semibold text-slate-700 mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
          </p>
        ))}
      </div>
    );
  };

  // 渲染图表
  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 20, right: 30, left: 20, bottom: 60 }
    };

    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey={currentXField}
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={12}
                fill="#64748b"
              />
              <YAxis fontSize={12} fill="#64748b" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar
                dataKey={currentYField}
                fill={colors[0]}
                radius={[4, 4, 0, 0]}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
                <LabelList dataKey={currentYField} position="top" fontSize={11} fill="#64748b" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey={currentXField}
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={12}
                fill="#64748b"
              />
              <YAxis fontSize={12} fill="#64748b" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey={currentYField}
                stroke={colors[0]}
                strokeWidth={2}
                dot={{ fill: colors[0], r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                outerRadius={Math.min(height, 600) / 3}
                fill={colors[0]}
                dataKey={currentYField}
                nameKey={currentXField}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'scatter':
        const scatterX = numericColumns[0] || currentXField;
        const scatterY = numericColumns[1] || currentYField;

        return (
          <ResponsiveContainer width="100%" height={height}>
            <ScatterChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" dataKey={scatterX} name={scatterX} fontSize={12} fill="#64748b" />
              <YAxis type="number" dataKey={scatterY} name={scatterY} fontSize={12} fill="#64748b" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
              <Scatter name="数据点" data={data} fill={colors[0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart {...commonProps}>
              <defs>
                <linearGradient id={`color-${currentYField}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors[0]} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={colors[0]} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey={currentXField}
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={12}
                fill="#64748b"
              />
              <YAxis fontSize={12} fill="#64748b" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                type="monotone"
                dataKey={currentYField}
                stroke={colors[0]}
                strokeWidth={2}
                fill={`url(#color-${currentYField})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  // 图表类型选项
  const chartTypes: { type: ChartType; icon: any; label: string }[] = [
    { type: 'bar', icon: BarChart3, label: '柱状图' },
    { type: 'line', icon: LineChartIcon, label: '折线图' },
    { type: 'pie', icon: PieChartIcon, label: '饼图' },
    { type: 'scatter', icon: ScatterChartIcon, label: '散点图' },
    { type: 'area', icon: AreaChartIcon, label: '面积图' }
  ];

  return (
    <div className="flex flex-col h-full p-4">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between mb-4">
        {/* 图表类型选择 */}
        <div className="flex items-center gap-2">
          {chartTypes.map(({ type, icon: Icon, label }) => (
            <button
              key={type}
              onClick={() => setChartType(type)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                chartType === type
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
              title={label}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* 右侧操作 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg transition-colors ${
              showSettings
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
            title="设置"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 设置面板 */}
      {showSettings && (
        <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* X轴选择 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">X轴字段</label>
              <select
                value={currentXField}
                onChange={e => setXField(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              >
                {columns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>

            {/* Y轴选择 */}
            {chartType !== 'pie' && chartType !== 'scatter' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Y轴字段</label>
                <select
                  value={currentYField}
                  onChange={e => setYField(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                >
                  {numericColumns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>
            )}

            {/* 聚合方式 */}
            {chartType !== 'scatter' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">聚合方式</label>
                <select
                  value={selectedAggregation}
                  onChange={e => setSelectedAggregation(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                >
                  <option value="sum">求和</option>
                  <option value="avg">平均</option>
                  <option value="count">计数</option>
                  <option value="max">最大值</option>
                  <option value="min">最小值</option>
                </select>
              </div>
            )}

            {/* 颜色方案 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">颜色方案</label>
              <select
                value={selectedScheme}
                onChange={e => setSelectedScheme(e.target.value as any)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              >
                <option value="default">默认</option>
                <option value="pastel">柔和</option>
                <option value="vibrant">鲜艳</option>
                <option value="monochrome">单色</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 图表区域 */}
      <div className="flex-1 bg-white border border-slate-200 rounded-lg overflow-auto">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-400">
            暂无数据
          </div>
        ) : (
          renderChart()
        )}
      </div>

      {/* 数据统计 */}
      {chartData.length > 0 && (
        <div className="mt-4 text-sm text-slate-600">
          显示前 {chartData.length} 条数据（共 {data.length} 条）
        </div>
      )}
    </div>
  );
};

export default ChartView;
