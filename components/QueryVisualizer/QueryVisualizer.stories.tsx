/**
 * QueryVisualizer Storybook 故事
 *
 * 提供各种使用场景的交互式示例
 *
 * @author ExcelMind AI Team
 * @version 1.0.0
 */

import type { Meta, StoryObj } from '@storybook/react';
import { QueryVisualizer } from './QueryVisualizer';

// ============================================================
// 样本数据
// ============================================================

const sampleData = [
  { id: 1, 姓名: '张三', 部门: '销售部', 销售额: 150000, 日期: '2024-01-15', 绩效: 'A' },
  { id: 2, 姓名: '李四', 部门: '技术部', 销售额: 98000, 日期: '2024-01-16', 绩效: 'B' },
  { id: 3, 姓名: '王五', 部门: '销售部', 销售额: 187000, 日期: '2024-01-17', 绩效: 'A' },
  { id: 4, 姓名: '赵六', 部门: '市场部', 销售额: 120000, 日期: '2024-01-18', 绩效: 'B' },
  { id: 5, 姓名: '钱七', 部门: '技术部', 销售额: 85000, 日期: '2024-01-19', 绩效: 'C' },
  { id: 6, 姓名: '孙八', 部门: '销售部', 销售额: 165000, 日期: '2024-01-20', 绩效: 'A' },
  { id: 7, 姓名: '周九', 部门: '市场部', 销售额: 134000, 日期: '2024-01-21', 绩效: 'B' },
  { id: 8, 姓名: '吴十', 部门: '技术部', 销售额: 112000, 日期: '2024-01-22', 绩效: 'B' },
];

const sampleQueryResult = {
  data: sampleData,
  sql: 'SELECT * FROM 员工 WHERE 销售额 > 50000',
  executionTime: 45,
  rowCount: 8,
  explanation: '查询销售额大于50000的所有员工信息',
  success: true
};

const timeSeriesData = [
  { 日期: '2024-01-01', 销售额: 120000, 访问量: 1500 },
  { 日期: '2024-01-02', 销售额: 135000, 访问量: 1800 },
  { 日期: '2024-01-03', 销售额: 142000, 访问量: 2100 },
  { 日期: '2024-01-04', 销售额: 138000, 访问量: 1900 },
  { 日期: '2024-01-05', 销售额: 155000, 访问量: 2300 },
  { 日期: '2024-01-06', 销售额: 168000, 访问量: 2500 },
  { 日期: '2024-01-07', 销售额: 172000, 访问量: 2700 },
];

const largeDataSet = Array.from({ length: 1000 }, (_, i) => ({
  id: i + 1,
  姓名: `员工${i + 1}`,
  部门: ['销售部', '技术部', '市场部', '人事部'][i % 4],
  销售额: Math.floor(Math.random() * 200000) + 50000,
  日期: new Date(2024, 0, (i % 30) + 1).toISOString().split('T')[0],
  绩效: ['A', 'B', 'C', 'D'][i % 4]
}));

// ============================================================
// Meta 配置
// ============================================================

const meta: Meta<typeof QueryVisualizer> = {
  title: 'Components/QueryVisualizer',
  component: QueryVisualizer,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: '查询结果可视化组件系统，提供表格视图、图表视图、统计信息和导出功能。'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    result: {
      description: '查询结果数据',
      control: 'object'
    },
    config: {
      description: '可视化配置',
      control: 'object'
    }
  }
};

export default meta;
type Story = StoryObj<typeof QueryVisualizer>;

// ============================================================
// 故事
// ============================================================

/**
 * 基础用法 - 默认配置的QueryVisualizer
 */
export const Default: Story = {
  args: {
    result: sampleQueryResult,
    queryInfo: {
      sql: sampleQueryResult.sql,
      executionTime: sampleQueryResult.executionTime,
      rowCount: sampleQueryResult.rowCount,
      naturalQuery: '显示销售额大于5万的员工'
    }
  }
};

/**
 * 表格视图 - 专注于表格数据展示
 */
export const TableView: Story = {
  args: {
    result: sampleQueryResult,
    config: {
      showTable: true,
      showChart: false,
      showStats: false,
      defaultView: 'table'
    }
  }
};

/**
 * 图表视图 - 数据可视化
 */
export const ChartView: Story = {
  args: {
    result: sampleQueryResult,
    config: {
      showTable: false,
      showChart: true,
      showStats: false,
      defaultView: 'chart'
    }
  }
};

/**
 * 统计面板 - 数据统计分析
 */
export const StatsPanel: Story = {
  args: {
    result: sampleQueryResult,
    config: {
      showTable: false,
      showChart: false,
      showStats: true,
      defaultView: 'stats'
    }
  }
};

/**
 * 时间序列数据 - 折线图展示
 */
export const TimeSeries: Story = {
  args: {
    result: {
      data: timeSeriesData,
      sql: 'SELECT * FROM 销售记录 WHERE 日期 >= "2024-01-01"',
      executionTime: 23,
      rowCount: 7,
      explanation: '2024年1月第一周的销售趋势',
      success: true
    },
    config: {
      defaultView: 'chart'
    }
  }
};

/**
 * 大数据集 - 性能测试
 */
export const LargeDataSet: Story = {
  args: {
    result: {
      data: largeDataSet,
      sql: 'SELECT * FROM 员工',
      executionTime: 156,
      rowCount: 1000,
      explanation: '全部员工数据（共1000条）',
      success: true
    },
    config: {
      defaultView: 'table',
      enableVirtualScroll: true,
      maxRows: 1000
    }
  }
};

/**
 * 错误状态 - 查询失败
 */
export const ErrorState: Story = {
  args: {
    result: {
      data: [],
      sql: 'SELECT * FROM 不存在的表',
      executionTime: 0,
      rowCount: 0,
      error: '表 "不存在的表" 不存在',
      success: false
    }
  }
};

/**
 * 空数据状态 - 查询成功但无结果
 */
export const EmptyState: Story = {
  args: {
    result: {
      data: [],
      sql: 'SELECT * FROM 员工 WHERE 销售额 > 1000000',
      executionTime: 12,
      rowCount: 0,
      explanation: '查询成功但没有符合条件的记录',
      success: true
    }
  }
};

/**
 * 自定义配置 - 完全控制视图
 */
export const CustomConfig: Story = {
  args: {
    result: sampleQueryResult,
    queryInfo: {
      sql: sampleQueryResult.sql,
      executionTime: sampleQueryResult.executionTime,
      rowCount: sampleQueryResult.rowCount
    },
    config: {
      showTable: true,
      showChart: true,
      showStats: true,
      defaultView: 'chart',
      enableVirtualScroll: false,
      maxRows: 100
    },
    onExport: (format) => {
      console.log(`导出为 ${format}`);
      alert(`导出为 ${format}`);
    },
    onRefresh: () => {
      console.log('刷新数据');
      alert('刷新数据');
    },
    onEditQuery: () => {
      console.log('编辑查询');
      alert('编辑查询');
    }
  }
};

/**
 * 销售数据分析 - 真实业务场景
 */
export const SalesAnalysis: Story = {
  args: {
    result: {
      data: [
        { 月份: '1月', 销售额: 1250000, 成本: 850000, 利润: 400000, 利润率: 32 },
        { 月份: '2月', 销售额: 1380000, 成本: 920000, 利润: 460000, 利润率: 33.3 },
        { 月份: '3月', 销售额: 1420000, 成本: 950000, 利润: 470000, 利润率: 33.1 },
        { 月份: '4月', 销售额: 1560000, 成本: 1050000, 利润: 510000, 利润率: 32.7 },
        { 月份: '5月', 销售额: 1680000, 成本: 1120000, 利润: 560000, 利润率: 33.3 },
        { 月份: '6月', 销售额: 1750000, 成本: 1180000, 利润: 570000, 利润率: 32.6 }
      ],
      sql: 'SELECT 月份, 销售额, 成本, 利润, 利润率 FROM 财务报表 ORDER BY 月份',
      executionTime: 34,
      rowCount: 6,
      explanation: '2024年上半年财务数据分析',
      success: true
    },
    config: {
      defaultView: 'chart'
    }
  }
};

/**
 * 员工绩效分布 - 饼图场景
 */
export const PerformanceDistribution: Story = {
  args: {
    result: {
      data: [
        { 绩效等级: 'A', 人数: 25, 占比: 25 },
        { 绩效等级: 'B', 人数: 45, 占比: 45 },
        { 绩效等级: 'C', 人数: 20, 占比: 20 },
        { 绩效等级: 'D', 人数: 10, 占比: 10 }
      ],
      sql: 'SELECT 绩效等级, COUNT(*) as 人数, COUNT(*) * 100.0 / (SELECT COUNT(*) FROM 员工) as 占比 FROM 员工 GROUP BY 绩效等级',
      executionTime: 18,
      rowCount: 4,
      explanation: '员工绩效等级分布统计',
      success: true
    },
    config: {
      defaultView: 'chart'
    }
  }
};

/**
 * 多维数据分析 - 散点图场景
 */
export const MultiDimensionalAnalysis: Story = {
  args: {
    result: {
      data: Array.from({ length: 50 }, (_, i) => ({
        员工ID: i + 1,
        工作时长: Math.floor(Math.random() * 40) + 160,
        销售额: Math.floor(Math.random() * 200000) + 50000,
        客户满意度: Math.floor(Math.random() * 30) + 70
      })),
      sql: 'SELECT 员工ID, 工作时长, 销售额, 客户满意度 FROM 员工绩效',
      executionTime: 28,
      rowCount: 50,
      explanation: '工作时长与销售额关系分析',
      success: true
    },
    config: {
      defaultView: 'chart'
    }
  }
};
