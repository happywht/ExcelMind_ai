/**
 * StatsPanel - 统计信息面板组件
 *
 * 功能特性：
 * - 总行数和列数统计
 * - 空值统计
 * - 数值列统计（最小/最大/平均/中位数/标准差）
 * - 分类列统计（唯一值数量、频率分布）
 * - 执行时间
 * - 数据预览（前5行）
 * - 数据质量评估
 * - 异常值检测
 *
 * @author ExcelMind AI Team
 * @version 1.0.0
 */

import React, { useMemo } from 'react';
import {
  TrendingUp,
  Database,
  Clock,
  AlertTriangle,
  CheckCircle,
  BarChart2,
  Hash,
  List,
  PieChart as PieChartIcon
} from 'lucide-react';

// ============================================================
// 类型定义
// ============================================================

export interface StatsPanelProps {
  /** 数据 */
  data: any[];

  /** 列名 */
  columns?: string[];

  /** 执行时间 */
  executionTime?: number;

  /** 行数 */
  rowCount?: number;
}

interface ColumnStats {
  name: string;
  type: 'number' | 'string' | 'date' | 'boolean';
  nullCount: number;
  nullPercentage: number;
  uniqueCount: number;
  // 数值列统计
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  stdDev?: number;
  sum?: number;
  // 分类列统计
  topValues?: { value: any; count: number; percentage: number }[];
}

// ============================================================
// 辅助函数
// ============================================================

/**
 * 检测列数据类型
 */
const detectColumnType = (values: any[]): 'number' | 'string' | 'date' | 'boolean' => {
  const cleanValues = values.filter(v => v !== null && v !== undefined);

  if (cleanValues.length === 0) return 'string';

  // 检查是否为布尔值
  const booleanCount = cleanValues.filter(v =>
    typeof v === 'boolean' || v === 'true' || v === 'false' || v === 0 || v === 1
  ).length;
  if (booleanCount > cleanValues.length * 0.8) return 'boolean';

  // 检查是否为数字
  const numberCount = cleanValues.filter(v => !isNaN(Number(v)) && v !== '').length;
  if (numberCount > cleanValues.length * 0.8) return 'number';

  // 检查是否为日期
  const dateCount = cleanValues.filter(v => {
    const date = new Date(v);
    return !isNaN(date.getTime()) && v.match(/^\d{4}-\d{2}-\d{2}/);
  }).length;
  if (dateCount > cleanValues.length * 0.8) return 'date';

  return 'string';
};

/**
 * 计算中位数
 */
const calculateMedian = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
};

/**
 * 计算标准差
 */
const calculateStdDev = (values: number[], mean: number): number => {
  const squareDiffs = values.map(value => Math.pow(value - mean, 2));
  const avgSquareDiff = squareDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  return Math.sqrt(avgSquareDiff);
};

/**
 * 计算列统计信息
 */
const calculateColumnStats = (data: any[], column: string): ColumnStats => {
  const values = data.map(row => row[column]);
  const nonNullValues = values.filter(v => v !== null && v !== undefined);
  const nullCount = values.length - nonNullValues.length;

  const type = detectColumnType(nonNullValues);
  const uniqueValues = new Set(nonNullValues);
  const uniqueCount = uniqueValues.size;

  const baseStats: ColumnStats = {
    name: column,
    type,
    nullCount,
    nullPercentage: (nullCount / values.length) * 100,
    uniqueCount
  };

  // 数值列统计
  if (type === 'number') {
    const numericValues = nonNullValues.map(v => Number(v)).filter(v => !isNaN(v));

    if (numericValues.length > 0) {
      const min = Math.min(...numericValues);
      const max = Math.max(...numericValues);
      const sum = numericValues.reduce((a, b) => a + b, 0);
      const mean = sum / numericValues.length;
      const median = calculateMedian(numericValues);
      const stdDev = calculateStdDev(numericValues, mean);

      return {
        ...baseStats,
        min,
        max,
        mean,
        median,
        stdDev,
        sum
      };
    }
  }

  // 分类列统计
  if (type === 'string' || type === 'boolean') {
    const valueCount = new Map<any, number>();
    nonNullValues.forEach(v => {
      valueCount.set(v, (valueCount.get(v) || 0) + 1);
    });

    const topValues = Array.from(valueCount.entries())
      .map(([value, count]) => ({
        value,
        count,
        percentage: (count / nonNullValues.length) * 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      ...baseStats,
      topValues
    };
  }

  return baseStats;
};

/**
 * 格式化数字
 */
const formatNumber = (num: number, decimals = 2): string => {
  if (Number.isInteger(num)) {
    return num.toLocaleString('zh-CN');
  }
  return num.toFixed(decimals);
};

// ============================================================
// 子组件
// ============================================================

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'red';
  subtitle?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color = 'blue', subtitle }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    red: 'bg-red-50 text-red-700 border-red-200'
  };

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium opacity-80">{title}</span>
        {icon && <span className="opacity-80">{icon}</span>}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {subtitle && <div className="text-xs mt-1 opacity-70">{subtitle}</div>}
    </div>
  );
};

interface ColumnStatCardProps {
  stats: ColumnStats;
}

const ColumnStatCard: React.FC<ColumnStatCardProps> = ({ stats }) => {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'number': return 'bg-blue-100 text-blue-700';
      case 'string': return 'bg-purple-100 text-purple-700';
      case 'date': return 'bg-green-100 text-green-700';
      case 'boolean': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="p-4 bg-white border border-slate-200 rounded-lg hover:shadow-md transition-shadow">
      {/* 列名和类型 */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-slate-800">{stats.name}</h4>
        <span className={`px-2 py-1 text-xs font-medium rounded ${getTypeColor(stats.type)}`}>
          {stats.type}
        </span>
      </div>

      {/* 基本统计 */}
      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
        <div>
          <span className="text-slate-500">空值:</span>
          <span className="ml-2 font-medium text-slate-700">
            {stats.nullCount} ({stats.nullPercentage.toFixed(1)}%)
          </span>
        </div>
        <div>
          <span className="text-slate-500">唯一值:</span>
          <span className="ml-2 font-medium text-slate-700">{stats.uniqueCount}</span>
        </div>
      </div>

      {/* 数值统计 */}
      {stats.type === 'number' && stats.mean !== undefined && (
        <div className="border-t border-slate-100 pt-3">
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <div className="text-slate-500 text-xs">最小值</div>
              <div className="font-medium text-slate-700">{formatNumber(stats.min!)}</div>
            </div>
            <div>
              <div className="text-slate-500 text-xs">最大值</div>
              <div className="font-medium text-slate-700">{formatNumber(stats.max!)}</div>
            </div>
            <div>
              <div className="text-slate-500 text-xs">平均值</div>
              <div className="font-medium text-slate-700">{formatNumber(stats.mean)}</div>
            </div>
            <div>
              <div className="text-slate-500 text-xs">中位数</div>
              <div className="font-medium text-slate-700">{formatNumber(stats.median!)}</div>
            </div>
            <div>
              <div className="text-slate-500 text-xs">标准差</div>
              <div className="font-medium text-slate-700">{formatNumber(stats.stdDev!)}</div>
            </div>
            <div>
              <div className="text-slate-500 text-xs">总和</div>
              <div className="font-medium text-slate-700">{formatNumber(stats.sum!)}</div>
            </div>
          </div>
        </div>
      )}

      {/* 分类统计 */}
      {stats.topValues && stats.topValues.length > 0 && (
        <div className="border-t border-slate-100 pt-3">
          <div className="text-slate-500 text-xs mb-2">Top 值分布</div>
          {stats.topValues.map((item, index) => (
            <div key={index} className="flex items-center gap-2 text-sm py-1">
              <div className="flex-1 truncate text-slate-700" title={String(item.value)}>
                {String(item.value)}
              </div>
              <div className="text-slate-500 text-xs">{item.count}次</div>
              <div className="w-16 bg-slate-100 rounded-full h-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
              <div className="text-slate-600 text-xs w-10 text-right">
                {item.percentage.toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================
// 主组件
// ============================================================

export const StatsPanel: React.FC<StatsPanelProps> = ({
  data,
  columns: propColumns,
  executionTime = 0,
  rowCount
}) => {
  // 获取列名
  const columns = useMemo(() => {
    return propColumns || (data.length > 0 ? Object.keys(data[0]) : []);
  }, [propColumns, data]);

  // 计算列统计信息
  const columnStats = useMemo(() => {
    return columns.map(col => calculateColumnStats(data, col));
  }, [data, columns]);

  // 整体统计
  const overallStats = useMemo(() => {
    const totalCells = data.length * columns.length;
    const totalNulls = columnStats.reduce((sum, stat) => sum + stat.nullCount, 0);
    const nullPercentage = (totalNulls / totalCells) * 100;

    const numericColumns = columnStats.filter(s => s.type === 'number');
    const textColumns = columnStats.filter(s => s.type === 'string');
    const dateColumns = columnStats.filter(s => s.type === 'date');

    return {
      totalCells,
      totalNulls,
      nullPercentage,
      numericCount: numericColumns.length,
      textCount: textColumns.length,
      dateCount: dateColumns.length,
      dataQuality: nullPercentage < 5 ? 'excellent' : nullPercentage < 20 ? 'good' : 'poor'
    };
  }, [columnStats, data.length, columns.length]);

  // 数据质量评估
  const getDataQualityInfo = () => {
    switch (overallStats.dataQuality) {
      case 'excellent':
        return {
          icon: <CheckCircle className="w-5 h-5" />,
          text: '数据质量优秀',
          color: 'green'
        };
      case 'good':
        return {
          icon: <CheckCircle className="w-5 h-5" />,
          text: '数据质量良好',
          color: 'blue'
        };
      case 'poor':
        return {
          icon: <AlertTriangle className="w-5 h-5" />,
          text: '数据质量较差，空值较多',
          color: 'orange'
        };
      default:
        return {
          icon: <AlertTriangle className="w-5 h-5" />,
          text: '数据质量未知',
          color: 'red'
        };
    }
  };

  const qualityInfo = getDataQualityInfo();

  // 如果没有数据
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-400">暂无数据</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 overflow-auto">
      {/* 整体统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="总行数"
          value={rowCount !== undefined ? rowCount.toLocaleString() : data.length.toLocaleString()}
          icon={<Database className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="列数"
          value={columns.length}
          icon={<List className="w-5 h-5" />}
          color="purple"
        />
        <StatCard
          title="空值占比"
          value={`${overallStats.nullPercentage.toFixed(1)}%`}
          icon={<PieChartIcon className="w-5 h-5" />}
          color={overallStats.nullPercentage < 5 ? 'green' : overallStats.nullPercentage < 20 ? 'blue' : 'orange'}
          subtitle={`${overallStats.totalNulls} / ${overallStats.totalCells}`}
        />
        <StatCard
          title="执行时间"
          value={`${executionTime}ms`}
          icon={<Clock className="w-5 h-5" />}
          color="green"
        />
      </div>

      {/* 数据质量评估 */}
      <div className={`mb-6 p-4 rounded-lg border flex items-center gap-3 ${
        qualityInfo.color === 'green' ? 'bg-emerald-50 border-emerald-200' :
        qualityInfo.color === 'blue' ? 'bg-blue-50 border-blue-200' :
        qualityInfo.color === 'orange' ? 'bg-orange-50 border-orange-200' :
        'bg-red-50 border-red-200'
      }`}>
        <div className={`${
          qualityInfo.color === 'green' ? 'text-emerald-600' :
          qualityInfo.color === 'blue' ? 'text-blue-600' :
          qualityInfo.color === 'orange' ? 'text-orange-600' :
          'text-red-600'
        }`}>
          {qualityInfo.icon}
        </div>
        <div>
          <div className={`font-semibold ${
            qualityInfo.color === 'green' ? 'text-emerald-800' :
            qualityInfo.color === 'blue' ? 'text-blue-800' :
            qualityInfo.color === 'orange' ? 'text-orange-800' :
            'text-red-800'
          }`}>
            {qualityInfo.text}
          </div>
          <div className="text-sm text-slate-600">
            数值列: {overallStats.numericCount} |
            文本列: {overallStats.textCount} |
            日期列: {overallStats.dateCount}
          </div>
        </div>
      </div>

      {/* 列统计 */}
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <BarChart2 className="w-5 h-5" />
          列统计详情
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {columnStats.map((stat, index) => (
            <ColumnStatCard key={index} stats={stat} />
          ))}
        </div>
      </div>

      {/* 数据预览 */}
      {data.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Hash className="w-5 h-5" />
            数据预览（前5行）
          </h3>
          <div className="overflow-auto border border-slate-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-2 text-left font-semibold text-slate-700 border-b border-r border-slate-200">#</th>
                  {columns.map(col => (
                    <th key={col} className="p-2 text-left font-semibold text-slate-700 border-b border-r border-slate-200 whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 5).map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-2 text-slate-500 text-xs border-r border-slate-200">{rowIndex + 1}</td>
                    {columns.map(col => (
                      <td key={col} className="p-2 text-slate-700 border-r border-slate-200 whitespace-nowrap max-w-xs overflow-hidden text-ellipsis">
                        {row[col] === null || row[col] === undefined ? (
                          <span className="text-slate-300 italic">null</span>
                        ) : (
                          String(row[col])
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatsPanel;
